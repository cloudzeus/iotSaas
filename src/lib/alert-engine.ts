import { prisma } from './prisma';
import { createMailgunClient } from './mailgun';

export interface AlertEvaluationContext {
  deviceId: string;
  tenantId: string;
  /** keyed by channel name, e.g. { temperature: 23.5, humidity: 65 } */
  decodedFields: Record<string, unknown>;
}

/**
 * Evaluate all active AlertRules for a device after a telemetry push.
 * Returns the number of new AlertEvents fired.
 */
export async function evaluateAlerts(context: AlertEvaluationContext): Promise<number> {
  try {
    const { deviceId, tenantId, decodedFields } = context;

    // ── Guard: tenant plan alert limit ───────────────────────────────────────
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });

    if (!tenant || !tenant.plan) return 0;

    const features = (tenant.plan.features ?? {}) as Record<string, unknown>;
    const alertLimitPerDevice = (features.alertLimitPerDevicePerMonth as number) ?? 200;

    // Count this month's events for this device
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const alertCountThisMonth = await prisma.alertEvent.count({
      where: {
        tenantId,
        deviceId,
        firedAt: { gte: monthStart },
      },
    });

    if (alertCountThisMonth >= alertLimitPerDevice) {
      console.warn(
        `Alert limit reached for device ${deviceId} in tenant ${tenantId}: ${alertCountThisMonth}/${alertLimitPerDevice}`
      );
      return 0;
    }

    // ── Load active rules for this device (device-specific OR tenant-wide) ───
    const alertRules = await prisma.alertRule.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ deviceId }, { deviceId: null }],
      },
    });

    let firedCount = 0;
    const mailgun = createMailgunClient();

    for (const rule of alertRules) {
      const rawValue = decodedFields[rule.channel];
      if (rawValue === undefined || rawValue === null) continue;

      const numValue = parseFloat(String(rawValue));
      if (isNaN(numValue)) continue;

      const threshold = parseFloat(String(rule.threshold));
      let fired = false;

      switch (rule.operator) {
        case 'gt':  fired = numValue >  threshold; break;
        case 'lt':  fired = numValue <  threshold; break;
        case 'gte': fired = numValue >= threshold; break;
        case 'lte': fired = numValue <= threshold; break;
        case 'eq':  fired = numValue === threshold; break;
        case 'neq': fired = numValue !== threshold; break;
      }

      if (!fired) continue;

      // Deduplicate: skip if an unacknowledged event for the same rule already exists
      const existing = await prisma.alertEvent.findFirst({
        where: { alertRuleId: rule.id, deviceId, acknowledged: false },
      });
      if (existing) continue;

      // ── Create the alert event ────────────────────────────────────────────
      await prisma.alertEvent.create({
        data: {
          tenantId,
          deviceId,
          alertRuleId: rule.id,
          channel: rule.channel,
          value: String(numValue),
          // unit is not available here directly; could be enriched later
        },
      });

      firedCount++;

      // ── Email notification ────────────────────────────────────────────────
      if (rule.emailNotify) {
        try {
          const device = await prisma.device.findUnique({ where: { id: deviceId } });
          const message = rule.message
            || `${rule.name}: ${rule.channel} ${rule.operator} ${rule.threshold}. Current value: ${numValue}`;

          await mailgun.sendAlertTriggered(
            tenant.billingEmail,
            tenant.name,
            device?.name ?? deviceId,
            message,
            rule.severity,
          );
        } catch (err) {
          console.error('Alert email failed:', err);
        }
      }
    }

    return firedCount;
  } catch (error) {
    console.error('Error evaluating alerts:', error);
    return 0;
  }
}

/** Acknowledge (resolve) an alert event. */
export async function acknowledgeAlert(alertEventId: string): Promise<boolean> {
  try {
    await prisma.alertEvent.update({
      where: { id: alertEventId },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    });
    return true;
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return false;
  }
}

/** @deprecated Use acknowledgeAlert instead */
export const resolveAlert = acknowledgeAlert;

/** Return all unacknowledged alert events for a tenant. */
export async function getActiveAlerts(tenantId: string): Promise<unknown[]> {
  return prisma.alertEvent.findMany({
    where: { tenantId, acknowledged: false },
    include: { device: true, alertRule: true },
    orderBy: { firedAt: 'desc' },
  });
}

/** High-level alert statistics for admin/overview panels. */
export async function getAlertStats(tenantId: string): Promise<Record<string, unknown>> {
  const [totalAlerts, activeAlerts, bySeverityRaw] = await Promise.all([
    prisma.alertEvent.count({ where: { tenantId } }),
    prisma.alertEvent.count({ where: { tenantId, acknowledged: false } }),
    // Join through alertRule to get severity grouping
    prisma.alertEvent.findMany({
      where: { tenantId },
      select: { alertRule: { select: { severity: true } } },
    }),
  ]);

  const bySeverity: Record<string, number> = {};
  for (const ev of bySeverityRaw) {
    const s = ev.alertRule?.severity ?? 'unknown';
    bySeverity[s] = (bySeverity[s] ?? 0) + 1;
  }

  return { totalAlerts, activeAlerts, bySeverity };
}
