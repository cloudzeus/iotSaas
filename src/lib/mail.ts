/**
 * Transactional email via Mailgun SMTP
 */

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAILGUN_SMTP_HOST || "smtp.eu.mailgun.org",
  port: parseInt(process.env.MAILGUN_SMTP_PORT || "587"),
  auth: {
    user: process.env.MAILGUN_SMTP_USER,
    pass: process.env.MAILGUN_SMTP_PASS,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: MailOptions) {
  const from = process.env.MAILGUN_FROM || "DGSmart Hub <noreply@dgsmart.gr>";
  return transporter.sendMail({ from, ...options });
}

// ─── Alert notification email ───────────────────────────────────────────────

export async function sendAlertEmail({
  to,
  deviceName,
  channel,
  value,
  threshold,
  severity,
  locale = "el",
}: {
  to: string;
  deviceName: string;
  channel: string;
  value: number;
  threshold: number;
  severity: string;
  locale?: string;
}) {
  const isGr = locale === "el";
  const subject = isGr
    ? `⚠️ Ειδοποίηση: ${deviceName} — ${channel}`
    : `⚠️ Alert: ${deviceName} — ${channel}`;

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0b0b0e;padding:24px;border-radius:8px;">
        <img src="https://dgsoft.b-cdn.net/dgsmart-hub-logo.png" alt="DGSmart Hub" height="40" style="margin-bottom:16px;" />
        <h2 style="color:#ff6600;margin:0 0 16px;">${isGr ? "Ειδοποίηση Συσκευής" : "Device Alert"}</h2>
        <p style="color:#ccc;">
          ${isGr ? "Συσκευή" : "Device"}: <strong style="color:#fff;">${deviceName}</strong><br/>
          ${isGr ? "Κανάλι" : "Channel"}: <strong style="color:#fff;">${channel}</strong><br/>
          ${isGr ? "Τιμή" : "Value"}: <strong style="color:#ff6600;">${value}</strong><br/>
          ${isGr ? "Κατώφλι" : "Threshold"}: ${threshold}<br/>
          ${isGr ? "Σοβαρότητα" : "Severity"}: ${severity}
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts"
           style="display:inline-block;background:#ff6600;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px;">
          ${isGr ? "Προβολή Ειδοποιήσεων" : "View Alerts"}
        </a>
      </div>
    </div>`;

  return sendMail({ to, subject, html });
}

// ─── Invoice email ──────────────────────────────────────────────────────────

export async function sendInvoiceEmail({
  to,
  invoiceId,
  total,
  periodStart,
  periodEnd,
  locale = "el",
}: {
  to: string;
  invoiceId: string;
  total: number;
  periodStart: string;
  periodEnd: string;
  locale?: string;
}) {
  const isGr = locale === "el";
  const subject = isGr
    ? `Τιμολόγιο DGSmart Hub — ${periodStart}`
    : `DGSmart Hub Invoice — ${periodStart}`;

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0b0b0e;padding:24px;border-radius:8px;">
        <img src="https://dgsoft.b-cdn.net/dgsmart-hub-logo.png" alt="DGSmart Hub" height="40" style="margin-bottom:16px;" />
        <h2 style="color:#ff6600;margin:0 0 16px;">${isGr ? "Τιμολόγιο" : "Invoice"}</h2>
        <p style="color:#ccc;">
          ${isGr ? "Περίοδος" : "Period"}: ${periodStart} — ${periodEnd}<br/>
          ${isGr ? "Σύνολο" : "Total"}: <strong style="color:#ff6600;">€${total.toFixed(2)}</strong>
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing/${invoiceId}"
           style="display:inline-block;background:#ff6600;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px;">
          ${isGr ? "Προβολή & Πληρωμή" : "View & Pay"}
        </a>
      </div>
    </div>`;

  return sendMail({ to, subject, html });
}
