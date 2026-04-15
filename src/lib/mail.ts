/**
 * Legacy shim — forwards to the unified Mailgun HTTP-API client in `email.ts`.
 * Kept so existing imports (`sendAlertEmail`, `sendInvoiceEmail`, `sendMail`)
 * keep working.
 */

import "server-only";
import {
  sendAlertTriggeredEmail,
  sendInvoiceIssuedEmail,
  sendPlainEmail,
} from "@/lib/email";

export const sendMail = sendPlainEmail;

export async function sendAlertEmail({
  to, deviceName, channel, value, threshold, severity, locale = "el",
}: {
  to: string;
  deviceName: string;
  channel: string;
  value: number;
  threshold: number;
  severity: string;
  locale?: string;
}) {
  return sendAlertTriggeredEmail({
    to, deviceName, channel, value, threshold, severity,
    locale: locale === "el" ? "el" : "en",
  });
}

export async function sendInvoiceEmail({
  to, invoiceId, total, locale = "el",
}: {
  to: string;
  invoiceId: string;
  total: number;
  periodStart?: string;
  periodEnd?: string;
  locale?: string;
}) {
  return sendInvoiceIssuedEmail({
    to, invoiceId, amount: total, tenantName: "",
    locale: locale === "el" ? "el" : "en",
  });
}
