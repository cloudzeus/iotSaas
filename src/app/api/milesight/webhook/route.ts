import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateMscSignature,
  type MilesightWebhookEvent,
} from "@/lib/milesight";
import { findAppByWebhookUuid, validateAppWebhookSignature } from "@/lib/milesight-apps";
import { sendAlertEmail } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());

  // Debug: log headers + body until we have signature format pinned down
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });
  console.log("[milesight webhook] HEADERS:", JSON.stringify(headers));

  // Milesight signs requests with X-MSC-* headers; canonical-string format
  // isn't documented, so we try several common formats and log which matches.
  const sig = {
    signature: req.headers.get("x-msc-request-signature") ?? "",
    timestamp: req.headers.get("x-msc-request-timestamp") ?? "",
    nonce: req.headers.get("x-msc-request-nonce") ?? "",
    uuid: req.headers.get("x-msc-webhook-uuid") ?? "",
  };
  // Look up which Milesight app this webhook belongs to (by UUID header).
  const app = await findAppByWebhookUuid(sig.uuid);
  if (app) {
    console.log(`[milesight webhook] matched app "${app.name}" (uuid=${sig.uuid})`);
    if (sig.signature) {
      const r = validateAppWebhookSignature(app, rawBody, sig.signature);
      if (!r.ok) console.warn(`[milesight webhook] per-app signature mismatch for "${app.name}" — fail-open`);
    }
  } else if (sig.signature) {
    // Fallback to legacy single-app signature validation (env-based)
    const result = validateMscSignature(rawBody, sig);
    if (result.ok) {
      console.log(`[milesight webhook] (legacy env) signature OK (format #${result.matchedFormat})`);
    } else {
      console.warn(`[milesight webhook] no matching app for uuid=${sig.uuid} and legacy signature did not match — fail-open`);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Body is an array of events; tolerate a single object too.
  const events: MilesightWebhookEvent[] = Array.isArray(parsed)
    ? (parsed as MilesightWebhookEvent[])
    : [parsed as MilesightWebhookEvent];

  const results = await Promise.allSettled(events.map(processEvent));
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - ok;
  return NextResponse.json({ received: events.length, ok, failed });
}

async function processEvent(ev: MilesightWebhookEvent) {
  const dp = ev?.data?.deviceProfile;
  const devEui = dp?.devEUI?.toUpperCase();
  if (!devEui) {
    console.log("[milesight webhook] event without devEUI, skipped:", ev.eventId);
    return;
  }

  const device = await prisma.device.findFirst({ where: { devEui } });
  if (!device) {
    console.log(`[milesight webhook] unknown devEUI ${devEui} (${dp.model} ${dp.name}), skipped`);
    return;
  }

  const ts = ev.data.ts ? new Date(ev.data.ts) : new Date();
  const payload = (ev.data.payload ?? {}) as Record<string, unknown>;

  // Raw log for every event
  await prisma.deviceLog.create({
    data: {
      deviceId: device.id,
      tenantId: device.tenantId,
      receivedAt: ts,
      devEui,
      decodedPayload: payload,
      eventType: `${ev.eventType}/${ev.data.type}`,
      isDuplicate: false,
    },
  });

  // Update device freshness
  await prisma.device.update({
    where: { id: device.id },
    data: { lastSeenAt: ts, online: true },
  });

  // Both PROPERTY and TELEMETRY events can carry numeric sensor readings on
  // Milesight LoRaWAN devices (battery, temperature, magnet_status, etc.).
  // Only EVENT type is metadata-only — skip those.
  if (ev.data.type === "EVENT") return;

  const points = flattenNumericPayload(payload);
  if (points.length === 0) return;

  await prisma.telemetry.createMany({
    data: points.map((p) => ({
      deviceId: device.id,
      tenantId: device.tenantId,
      ts,
      channel: p.channel,
      value: String(p.value),
      unit: p.unit ?? null,
    })),
  });

  const rules = await prisma.alertRule.findMany({
    where: {
      tenantId: device.tenantId,
      isActive: true,
      OR: [{ deviceId: device.id }, { deviceId: null }],
    },
  });

  for (const rule of rules) {
    const point = points.find((p) => p.channel === rule.channel);
    if (!point) continue;

    const threshold = Number(rule.threshold);
    const value = Number(point.value);
    let triggered = false;
    if      (rule.operator === "gt")  triggered = value >  threshold;
    else if (rule.operator === "lt")  triggered = value <  threshold;
    else if (rule.operator === "gte") triggered = value >= threshold;
    else if (rule.operator === "lte") triggered = value <= threshold;
    else if (rule.operator === "eq")  triggered = value === threshold;
    if (!triggered) continue;

    await prisma.alertEvent.create({
      data: {
        alertRuleId: rule.id,
        deviceId: device.id,
        tenantId: device.tenantId,
        channel: rule.channel,
        value: String(value),
        unit: point.unit ?? null,
        firedAt: ts,
      },
    });

    if (rule.emailNotify) {
      const tenant = await prisma.tenant.findUnique({ where: { id: device.tenantId } });
      if (tenant?.billingEmail) {
        await sendAlertEmail({
          to: tenant.billingEmail,
          deviceName: device.name,
          channel: rule.channel,
          value,
          threshold,
          severity: rule.severity,
        }).catch((err) => console.error("[webhook] alert email failed:", err));
      }
    }
  }
}

/**
 * Walk the payload tree. Each numeric leaf becomes a telemetry point with a
 * dotted channel name. `{ value, unit }` shape is also recognised.
 */
function flattenNumericPayload(
  obj: Record<string, unknown>,
  prefix = ""
): Array<{ channel: string; value: number; unit?: string }> {
  const out: Array<{ channel: string; value: number; unit?: string }> = [];
  for (const [key, val] of Object.entries(obj)) {
    const channel = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "number") {
      out.push({ channel, value: val });
    } else if (val && typeof val === "object") {
      const v = (val as { value?: unknown; unit?: unknown }).value;
      if (typeof v === "number") {
        out.push({
          channel,
          value: v,
          unit: typeof (val as { unit?: unknown }).unit === "string"
            ? (val as { unit: string }).unit
            : undefined,
        });
      } else {
        out.push(...flattenNumericPayload(val as Record<string, unknown>, channel));
      }
    }
  }
  return out;
}
