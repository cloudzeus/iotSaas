"use server";

import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendProformaInvoiceEmail } from "@/lib/email";
import { createVivaWalletClient } from "@/lib/viva";

async function requireAdmin() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) throw new Error("Forbidden");
  return session;
}

function periodLabel(start: Date, locale: "el" | "en" = "el"): string {
  return start.toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", {
    month: "long", year: "numeric",
  });
}

export async function setInvoiceGraceAction(input: {
  invoiceId: string;
  graceUntil: string | null;  // ISO date string or null to clear
}): Promise<void> {
  await requireAdmin();
  await db.invoice.update({
    where: { id: input.invoiceId },
    data: {
      graceUntil: input.graceUntil ? new Date(input.graceUntil) : null,
    },
  });
  revalidatePath("/admin/tenants");
  revalidatePath("/admin/billing");
}

export async function markInvoicePaidAction(invoiceId: string): Promise<void> {
  await requireAdmin();
  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidatePath("/admin/tenants");
  revalidatePath("/admin/billing");
}

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  method: "cash" | "bank-transfer" | "check" | "viva" | "other";
  reference?: string;
  notes?: string;
  receivedAt?: string;    // ISO date
  markPaid?: boolean;     // default true when amount covers the remainder
}

export async function recordPaymentAction(input: RecordPaymentInput): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { payments: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found" };

  const alreadyPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(invoice.total);
  const remaining = +(total - alreadyPaid).toFixed(2);
  const amount = +input.amount.toFixed(2);
  if (!(amount > 0)) return { ok: false, error: "Amount must be positive" };

  await db.payment.create({
    data: {
      invoiceId: invoice.id,
      amount,
      method: input.method,
      reference: input.reference?.trim() || null,
      notes: input.notes?.trim() || null,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      createdBy: (await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } })) ? session.user.id : null,
    },
  });

  const coversRemaining = amount >= remaining - 0.009;
  const shouldMarkPaid = input.markPaid !== false && coversRemaining;
  if (shouldMarkPaid) {
    await db.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }
  revalidatePath("/admin/tenants");
  revalidatePath("/admin/billing");
  return { ok: true };
}

export async function setTenantDefaultGraceAction(input: {
  tenantId: string;
  defaultGraceDays: number;
}): Promise<void> {
  await requireAdmin();
  const days = Math.max(0, Math.min(365, Math.round(input.defaultGraceDays)));
  await db.tenant.update({
    where: { id: input.tenantId },
    data: { defaultGraceDays: days },
  });
  revalidatePath("/admin/tenants");
}

export interface SendProformaResult {
  ok: boolean;
  emailId?: string;
  paymentUrl?: string | null;
  error?: string;
}

/**
 * Emails the proforma invoice to the tenant's billing address. If Viva is
 * configured, also creates a payment link and includes it in the email.
 */
export async function sendProformaAction(input: {
  invoiceId: string;
  withPaymentLink: boolean;
}): Promise<SendProformaResult> {
  await requireAdmin();

  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { tenant: { include: { customer: { select: { email: true } } } } },
  });
  if (!invoice) return { ok: false, error: "Invoice not found" };

  const recipient = invoice.tenant.billingEmail || invoice.tenant.customer?.email;
  if (!recipient) return { ok: false, error: "No billing email set" };

  let paymentUrl: string | null = null;
  if (input.withPaymentLink && process.env.VIVA_API_KEY) {
    try {
      const viva = createVivaWalletClient();
      const orderCode = await viva.createOrder(
        invoice.tenantId,
        invoice.id,
        Number(invoice.total),
        `DGSmart Hub · ${invoice.tenant.name} · ${periodLabel(invoice.periodStart)}`,
      );
      if (orderCode) {
        paymentUrl = viva.getCheckoutUrl(orderCode);
        await db.invoice.update({
          where: { id: invoice.id },
          data: { vivaOrderCode: orderCode },
        });
      }
    } catch (err) {
      console.error("[billing] Viva order creation failed:", err);
    }
  }

  try {
    const result = await sendProformaInvoiceEmail({
      to: recipient,
      tenantName: invoice.tenant.name,
      invoiceId: invoice.id,
      periodLabel: periodLabel(invoice.periodStart, "el"),
      deviceCount: invoice.deviceCount,
      pricePerDevice: Number(invoice.pricePerDevice),
      subtotal: Number(invoice.subtotal),
      vat: Number(invoice.vat),
      total: Number(invoice.total),
      graceUntil: invoice.graceUntil,
      paymentUrl,
      locale: "el",
    });
    revalidatePath("/admin/tenants");
    revalidatePath("/admin/billing");
    return { ok: true, emailId: result.id, paymentUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}

export async function createVivaLinkAction(invoiceId: string): Promise<{ ok: boolean; paymentUrl?: string; error?: string }> {
  await requireAdmin();
  if (!process.env.VIVA_API_KEY) {
    return { ok: false, error: "Viva not configured (VIVA_API_KEY missing)" };
  }
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { tenant: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found" };

  try {
    const viva = createVivaWalletClient();
    const orderCode = await viva.createOrder(
      invoice.tenantId,
      invoice.id,
      Number(invoice.total),
      `DGSmart Hub · ${invoice.tenant.name} · ${periodLabel(invoice.periodStart)}`,
    );
    if (!orderCode) return { ok: false, error: "Viva returned no orderCode" };
    await db.invoice.update({
      where: { id: invoice.id },
      data: { vivaOrderCode: orderCode },
    });
    revalidatePath("/admin/tenants");
    revalidatePath("/admin/billing");
    return { ok: true, paymentUrl: viva.getCheckoutUrl(orderCode) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
