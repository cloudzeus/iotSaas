/**
 * Unified Mailgun HTTP-API email client.
 * Docs: https://documentation.mailgun.com/en/latest/api-sending.html
 */

import "server-only";

const API_BASE = process.env.MAILGUN_ENDPOINT || "https://api.eu.mailgun.net";
const DOMAIN = process.env.MAILGUN_DOMAIN!;
const API_KEY = process.env.MAILGUN_API_KEY!;
const DEFAULT_FROM =
  process.env.MAILGUN_FROM || `DGSmart Hub <noreply@${DOMAIN}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
}

export interface MailgunResult { id: string; message: string; }

async function mgSend(input: SendEmailInput): Promise<MailgunResult> {
  if (!API_KEY || !DOMAIN) {
    throw new Error("Mailgun is not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN missing)");
  }
  const form = new FormData();
  form.append("from", DEFAULT_FROM);
  (Array.isArray(input.to) ? input.to : [input.to]).forEach((t) => form.append("to", t));
  form.append("subject", input.subject);
  form.append("html", input.html);
  if (input.text) form.append("text", input.text);
  if (input.replyTo) form.append("h:Reply-To", input.replyTo);
  (input.tags ?? []).forEach((t) => form.append("o:tag", t));

  const res = await fetch(`${API_BASE}/v3/${DOMAIN}/messages`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`api:${API_KEY}`).toString("base64") },
    body: form,
    cache: "no-store",
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Mailgun ${res.status}: ${body.slice(0, 300)}`);
  }
  try { return JSON.parse(body) as MailgunResult; }
  catch { return { id: "", message: body }; }
}

// ─── Template layout ─────────────────────────────────────────────────────────

function layout(title: string, bodyHtml: string, ctaHref?: string, ctaLabel?: string): string {
  const cta = ctaHref && ctaLabel
    ? `<a href="${ctaHref}" style="display:inline-block;background:#ff6600;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;margin-top:18px;font-weight:600">${ctaLabel}</a>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111">
    <div style="max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#0b0b0e;color:#ff6600;padding:22px 28px;border-radius:10px 10px 0 0">
        <div style="font-weight:800;font-size:1.1rem;letter-spacing:.5px">DGSmart Hub</div>
      </div>
      <div style="background:#fff;padding:28px;border-radius:0 0 10px 10px;line-height:1.55">
        <h2 style="margin:0 0 12px 0;font-size:1.2rem;color:#0b0b0e">${title}</h2>
        ${bodyHtml}
        ${cta}
      </div>
      <div style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:18px;padding:12px">
        DGSmart Hub · IoT Platform by DGSOFT
      </div>
    </div>
  </body>
</html>`;
}

// ─── Typed email helpers ────────────────────────────────────────────────────

export async function sendPlainEmail(input: SendEmailInput) {
  return mgSend(input);
}

export async function sendUserInviteEmail(opts: {
  to: string;
  name: string;
  tenantName: string;
  tempPassword: string;
  locale?: "el" | "en";
}) {
  const isGr = opts.locale === "el";
  const subject = isGr
    ? `Καλωσήρθατε στο ${opts.tenantName} · DGSmart Hub`
    : `You've been added to ${opts.tenantName} · DGSmart Hub`;

  const body = isGr ? `
    <p>Γεια σας ${opts.name},</p>
    <p>Δημιουργήθηκε ο λογαριασμός σας στο <strong>${opts.tenantName}</strong> στο DGSmart Hub.</p>
    <div style="background:#fff7ed;border:1px solid #ff6600;border-radius:8px;padding:14px;margin:16px 0">
      <div style="font-size:0.75rem;color:#ff6600;font-weight:700;text-transform:uppercase;margin-bottom:4px">Προσωρινός κωδικός</div>
      <div style="font-family:monospace;font-size:1.1rem;font-weight:700">${opts.tempPassword}</div>
    </div>
    <p style="color:#6b7280;font-size:0.85rem">Αλλάξτε τον κωδικό στην πρώτη σύνδεση από τις <em>Ρυθμίσεις</em>.</p>
  ` : `
    <p>Hi ${opts.name},</p>
    <p>Your account for <strong>${opts.tenantName}</strong> on DGSmart Hub is ready.</p>
    <div style="background:#fff7ed;border:1px solid #ff6600;border-radius:8px;padding:14px;margin:16px 0">
      <div style="font-size:0.75rem;color:#ff6600;font-weight:700;text-transform:uppercase;margin-bottom:4px">Temporary password</div>
      <div style="font-family:monospace;font-size:1.1rem;font-weight:700">${opts.tempPassword}</div>
    </div>
    <p style="color:#6b7280;font-size:0.85rem">Change your password after first login from <em>Settings</em>.</p>
  `;

  return mgSend({
    to: opts.to,
    subject,
    html: layout(isGr ? "Ο λογαριασμός σας είναι έτοιμος" : "Your account is ready", body, `${APP_URL}/login`, isGr ? "Σύνδεση" : "Sign in"),
    tags: ["user-invite"],
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  token: string;
  locale?: "el" | "en";
}) {
  const isGr = opts.locale === "el";
  const url = `${APP_URL}/reset-password?token=${opts.token}`;
  const body = isGr ? `
    <p>Γεια σας ${opts.name},</p>
    <p>Λάβαμε αίτημα επαναφοράς κωδικού. Πατήστε το κουμπί για να ορίσετε νέο κωδικό. Ο σύνδεσμος λήγει σε 1 ώρα.</p>
  ` : `
    <p>Hi ${opts.name},</p>
    <p>We received a request to reset your password. Click below to set a new one. This link expires in 1 hour.</p>
  `;
  return mgSend({
    to: opts.to,
    subject: isGr ? "Επαναφορά κωδικού · DGSmart Hub" : "Reset your password · DGSmart Hub",
    html: layout(isGr ? "Επαναφορά κωδικού" : "Reset password", body, url, isGr ? "Επαναφορά" : "Reset"),
    tags: ["password-reset"],
  });
}

export async function sendAlertTriggeredEmail(opts: {
  to: string;
  deviceName: string;
  channel: string;
  value: number;
  threshold: number;
  severity: string;
  locale?: "el" | "en";
}) {
  const isGr = opts.locale === "el";
  const severityColor = { LOW: "#3b82f6", MEDIUM: "#eab308", HIGH: "#ef4444", CRITICAL: "#9333ea" }[opts.severity.toUpperCase()] ?? "#6b7280";
  const body = `
    <p>${isGr ? "Μια ειδοποίηση ενεργοποιήθηκε." : "An alert was triggered."}</p>
    <div style="background:${severityColor}15;border-left:4px solid ${severityColor};padding:14px;border-radius:6px;margin:16px 0">
      <div style="font-weight:700;color:${severityColor};text-transform:uppercase;font-size:0.75rem;margin-bottom:6px">${opts.severity}</div>
      <div style="color:#0b0b0e">
        <strong>${opts.deviceName}</strong> · ${opts.channel}<br/>
        ${isGr ? "Τιμή" : "Value"}: <strong>${opts.value}</strong> (${isGr ? "όριο" : "threshold"}: ${opts.threshold})
      </div>
    </div>
  `;
  return mgSend({
    to: opts.to,
    subject: `${isGr ? "Ειδοποίηση" : "Alert"} · ${opts.deviceName} · ${opts.channel}`,
    html: layout(isGr ? "Νέα ειδοποίηση" : "New alert", body, `${APP_URL}/alerts`, isGr ? "Προβολή" : "View"),
    tags: ["alert", opts.severity.toLowerCase()],
  });
}

export async function sendDeviceOfflineEmail(opts: {
  to: string;
  deviceName: string;
  lastSeen: Date;
  locale?: "el" | "en";
}) {
  const isGr = opts.locale === "el";
  const body = `
    <p>${isGr ? "Η συσκευή βγήκε εκτός σύνδεσης." : "A device has gone offline."}</p>
    <div style="background:#fff7ed;border:1px solid #fde68a;border-radius:6px;padding:14px;margin:16px 0">
      <strong>${opts.deviceName}</strong><br/>
      <span style="color:#6b7280">${isGr ? "Τελευταία σύνδεση" : "Last seen"}: ${opts.lastSeen.toLocaleString()}</span>
    </div>
  `;
  return mgSend({
    to: opts.to,
    subject: `${isGr ? "Συσκευή offline" : "Device offline"} · ${opts.deviceName}`,
    html: layout(isGr ? "Συσκευή offline" : "Device offline", body, `${APP_URL}/devices`, isGr ? "Προβολή" : "View"),
    tags: ["device-offline"],
  });
}

export async function sendInvoiceIssuedEmail(opts: {
  to: string;
  tenantName: string;
  invoiceId: string;
  amount: number;
  pdfUrl?: string;
  locale?: "el" | "en";
}) {
  const isGr = opts.locale === "el";
  const body = `
    <p>${isGr ? `Το μηνιαίο τιμολόγιο για τον λογαριασμό` : "The monthly invoice for"} <strong>${opts.tenantName}</strong>${isGr ? " εκδόθηκε." : " has been issued."}</p>
    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:14px;margin:16px 0">
      <div style="color:#6b7280">${isGr ? "Αρ. Τιμολογίου" : "Invoice"}: <strong style="color:#0b0b0e">${opts.invoiceId}</strong></div>
      <div style="color:#6b7280;margin-top:6px">${isGr ? "Ποσό" : "Amount due"}: <strong style="color:#0b0b0e;font-size:1.2rem">€${opts.amount.toFixed(2)}</strong></div>
    </div>
  `;
  return mgSend({
    to: opts.to,
    subject: `${isGr ? "Νέο Τιμολόγιο" : "Invoice issued"} · ${opts.tenantName}`,
    html: layout(isGr ? "Νέο Τιμολόγιο" : "Invoice issued", body, opts.pdfUrl ?? `${APP_URL}/billing`, isGr ? "Προβολή" : "View invoice"),
    tags: ["invoice-issued"],
  });
}

export async function sendPaymentConfirmedEmail(opts: {
  to: string;
  tenantName: string;
  invoiceId: string;
  amount: number;
  locale?: "el" | "en";
}) {
  const isGr = opts.locale === "el";
  const body = `
    <p>${isGr ? "Η πληρωμή σας λήφθηκε. Ευχαριστούμε!" : "Your payment was received. Thanks!"}</p>
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:6px;padding:14px;margin:16px 0">
      <div style="color:#6b7280">${isGr ? "Τιμολόγιο" : "Invoice"}: <strong style="color:#0b0b0e">${opts.invoiceId}</strong></div>
      <div style="color:#6b7280;margin-top:6px">${isGr ? "Ποσό" : "Amount"}: <strong style="color:#0b0b0e">€${opts.amount.toFixed(2)}</strong></div>
    </div>
  `;
  return mgSend({
    to: opts.to,
    subject: `${isGr ? "Επιβεβαίωση πληρωμής" : "Payment confirmed"} · ${opts.tenantName}`,
    html: layout(isGr ? "Πληρωμή επιβεβαιώθηκε" : "Payment confirmed", body, `${APP_URL}/billing`, isGr ? "Ιστορικό" : "View history"),
    tags: ["payment-confirmed"],
  });
}

export async function sendPaymentFailedEmail(opts: {
  to: string;
  tenantName: string;
  invoiceId: string;
  locale?: "el" | "en";
}) {
  const isGr = opts.locale === "el";
  const body = `
    <p>${isGr ? "Η πληρωμή για το τιμολόγιο" : "Payment for invoice"} <strong>${opts.invoiceId}</strong> ${isGr ? "απέτυχε." : "failed."}</p>
    <p>${isGr ? "Παρακαλούμε δοκιμάστε ξανά ή επικοινωνήστε μαζί μας." : "Please try again or contact support."}</p>
  `;
  return mgSend({
    to: opts.to,
    subject: `${isGr ? "Αποτυχία πληρωμής" : "Payment failed"} · ${opts.tenantName}`,
    html: layout(isGr ? "Αποτυχία πληρωμής" : "Payment failed", body, `${APP_URL}/billing`, isGr ? "Επανάληψη" : "Retry"),
    tags: ["payment-failed"],
  });
}
