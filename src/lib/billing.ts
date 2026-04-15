import "server-only";
import { db } from "@/lib/db";

const VAT_RATE = 0.24; // Greek VAT

function currentMonthRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Find-or-create the current-month PENDING invoice for a tenant and recompute
 * its totals from the live device count. Returns the (now-current) invoice or
 * null if the tenant has no plan (nothing to bill).
 *
 * Called after assign / unassign / plan change — keeps the tenant's outstanding
 * invoice in sync with reality so the billing page is always truthful.
 */
export async function recalcCurrentInvoice(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });
  if (!tenant || !tenant.plan) return null;

  const pricePerDevice = Number(tenant.plan.pricePerDevice);
  if (!(pricePerDevice >= 0)) return null;

  const { start, end } = currentMonthRange();

  const devices = await db.device.findMany({
    where: { tenantId },
    select: { id: true, devEui: true, name: true, model: true, billedFrom: true },
  });
  const deviceCount = devices.length;

  const subtotal = +(deviceCount * pricePerDevice).toFixed(2);
  const vat = +(subtotal * VAT_RATE).toFixed(2);
  const total = +(subtotal + vat).toFixed(2);

  const lineItems = devices.map((d) => ({
    deviceId: d.id,
    devEui: d.devEui,
    name: d.name,
    model: d.model,
    pricePerDevice,
  }));

  // Look up an open invoice (DRAFT or PENDING) for this month
  const existing = await db.invoice.findFirst({
    where: {
      tenantId,
      periodStart: { gte: start, lt: end },
      status: { in: ["DRAFT", "PENDING"] },
    },
  });

  if (existing) {
    return db.invoice.update({
      where: { id: existing.id },
      data: {
        deviceCount,
        pricePerDevice,
        subtotal,
        vat,
        total,
        lineItems,
        status: deviceCount === 0 ? "DRAFT" : "PENDING",
      },
    });
  }

  // Only create a new invoice if there's something to bill
  if (deviceCount === 0) return null;

  return db.invoice.create({
    data: {
      tenantId,
      periodStart: start,
      periodEnd: new Date(end.getTime() - 1),
      deviceCount,
      pricePerDevice,
      subtotal,
      vat,
      total,
      status: "PENDING",
      lineItems,
    },
  });
}

/** Stamp `billedFrom = now` on any devices that don't have it yet. */
export async function markBilledFromNow(tenantId: string) {
  const now = new Date();
  await db.device.updateMany({
    where: { tenantId, billedFrom: null },
    data: { billedFrom: now },
  });
}
