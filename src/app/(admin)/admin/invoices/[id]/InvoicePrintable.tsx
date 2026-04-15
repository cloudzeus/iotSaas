"use client";

import { FiPrinter } from "react-icons/fi";

interface LineItem {
  deviceId?: string;
  devEui?: string;
  name?: string;
  model?: string | null;
  pricePerDevice?: number;
  description?: string;
  quantity?: number;
  unitPrice?: number;
}

interface Customer {
  name: string;
  afm: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  country: number | null;
  irsdata: string | null;
  phone01: string | null;
  email: string | null;
  webpage: string | null;
}

interface Invoice {
  id: string;
  periodStart: string;
  periodEnd: string;
  deviceCount: number;
  pricePerDevice: number | string;
  subtotal: number | string;
  vat: number | string;
  total: number | string;
  status: string;
  vivaOrderCode: string | null;
  paidAt: string | null;
  graceUntil: string | null;
  lineItems: unknown;
  createdAt: string;
  tenant: {
    id: string; name: string; slug: string;
    billingEmail: string | null;
    customer: Customer;
    plan: { name: string } | null;
  };
  payments: Array<{
    id: string;
    amount: number | string;
    method: string;
    reference: string | null;
    receivedAt: string;
  }>;
}

interface Props {
  invoice: Invoice;
  countries: Array<{ country: number; name: string }>;
  vendor: {
    serial: string | null;
    vendor: string;
    buyerFromEnv: string | null;
    appName: string;
    appUrl: string;
  };
  locale: string;
}

export default function InvoicePrintable({ invoice, countries, vendor, locale }: Props) {
  const t = locale === "el";
  const fmtMoney = (n: number | string) =>
    `€${Number(n).toLocaleString(t ? "el-GR" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString(t ? "el-GR" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  const periodLabel = new Date(invoice.periodStart).toLocaleDateString(
    t ? "el-GR" : "en-GB",
    { month: "long", year: "numeric" },
  );

  const c = invoice.tenant.customer;
  const countryName = c.country
    ? countries.find((cc) => cc.country === c.country)?.name ?? null
    : null;

  const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balanceDue = +(Number(invoice.total) - totalPaid).toFixed(2);

  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems as LineItem[] : [];

  const statusBadge = (() => {
    if (invoice.status === "PAID") return { label: t ? "ΠΛΗΡΩΜΕΝΟ" : "PAID", color: "#22c55e" };
    if (invoice.status === "OVERDUE") return { label: t ? "ΛΗΞΙΠΡΟΘΕΣΜΟ" : "OVERDUE", color: "#ef4444" };
    if (invoice.status === "DRAFT") return { label: t ? "ΠΡΟΣΧΕΔΙΟ" : "DRAFT", color: "#6b7280" };
    return { label: t ? "ΣΕ ΕΚΚΡΕΜΟΤΗΤΑ" : "PENDING", color: "#ff6600" };
  })();

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print, .sidebar, .topbar, .invoice-toolbar { display: none !important; }
          body, .main-layout { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .invoice-print {
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            padding: 16mm 18mm !important;
          }
          .invoice-print * { color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div
        className="invoice-print"
        style={{
          background: "#fff",
          color: "#111",
          maxWidth: 860,
          margin: "0 auto",
          padding: 40,
          borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif",
        }}
      >
        {/* HEADER ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, borderBottom: "3px solid #ff6600", paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <div style={{ color: "#ff6600", fontWeight: 800, fontSize: 22, letterSpacing: 0.5 }}>
              {vendor.appName}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {vendor.vendor}
            </div>
            {vendor.appUrl && (
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{vendor.appUrl.replace(/^https?:\/\//, "")}</div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              display: "inline-block",
              background: statusBadge.color,
              color: "#fff",
              padding: "4px 14px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              marginBottom: 6,
            }}>
              {statusBadge.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1 }}>
              {t ? "ΠΡΟΦΟΡΜΑ" : "PROFORMA"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              {t ? "Τιμολόγιο" : "Invoice"} · <code style={{ fontFamily: "monospace" }}>{invoice.id.slice(-10).toUpperCase()}</code>
            </div>
          </div>
        </div>

        {/* PARTIES & META ─────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.08, color: "#9ca3af", fontWeight: 700, marginBottom: 6 }}>
              {t ? "Από" : "From"}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{vendor.vendor}</div>
            <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
              {t ? "Πάροχος λογισμικού" : "Software vendor"}
            </div>
            {vendor.serial && (
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                SN <code style={{ fontFamily: "monospace" }}>{vendor.serial}</code>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.08, color: "#9ca3af", fontWeight: 700, marginBottom: 6 }}>
              {t ? "Προς" : "Bill to"}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
            {c.afm && <div style={{ fontSize: 12, color: "#4b5563" }}>ΑΦΜ: <strong>{c.afm}</strong></div>}
            {c.irsdata && <div style={{ fontSize: 12, color: "#4b5563" }}>{t ? "ΔΟΥ" : "Tax Office"}: {c.irsdata}</div>}
            {c.address && <div style={{ fontSize: 12, color: "#4b5563" }}>{c.address}</div>}
            {(c.zip || c.city) && <div style={{ fontSize: 12, color: "#4b5563" }}>{[c.zip, c.city].filter(Boolean).join(" ")}</div>}
            {countryName && <div style={{ fontSize: 12, color: "#4b5563" }}>{countryName}</div>}
            {invoice.tenant.billingEmail && (
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{invoice.tenant.billingEmail}</div>
            )}
          </div>
        </div>

        {/* INVOICE META ─────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          padding: 12,
          background: "#f9fafb",
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12,
        }}>
          <Meta label={t ? "Έκδοση" : "Issued"} value={fmtDate(invoice.createdAt)} />
          <Meta label={t ? "Περίοδος" : "Period"} value={periodLabel} />
          <Meta label={t ? "Λήξη μηνός" : "Period end"} value={fmtDate(invoice.periodEnd)} />
          <Meta label={t ? "Λήξη χάριτος" : "Grace until"}
            value={invoice.graceUntil ? fmtDate(invoice.graceUntil) : "—"}
            color={invoice.graceUntil && new Date(invoice.graceUntil) < new Date() ? "#ef4444" : undefined}
          />
        </div>

        {/* LINE ITEMS ─────────────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#0b0b0e", color: "#fff" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>{t ? "Περιγραφή" : "Description"}</th>
              <th style={{ ...thStyle, textAlign: "center", width: 60 }}>{t ? "Τεμ." : "Qty"}</th>
              <th style={{ ...thStyle, textAlign: "right", width: 100 }}>{t ? "Μον. Τιμή" : "Unit"}</th>
              <th style={{ ...thStyle, textAlign: "right", width: 110 }}>{t ? "Αξία" : "Amount"}</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>
                  {t ? "Καμία γραμμή" : "No line items"}
                </td>
              </tr>
            ) : lineItems.map((li, i) => {
              const qty = li.quantity ?? 1;
              const price = li.unitPrice ?? li.pricePerDevice ?? 0;
              const desc = li.description
                ?? (li.name ? `${li.name}${li.model ? ` · ${li.model}` : ""}${li.devEui ? ` (${li.devEui})` : ""}` : "Device");
              return (
                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{desc}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>
                      {t ? "Μηνιαία χρέωση συσκευής" : "Monthly device fee"}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{qty}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmtMoney(price)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtMoney(qty * price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* TOTALS ─────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.08, color: "#9ca3af", fontWeight: 700, marginBottom: 6 }}>
              {t ? "Όροι" : "Terms"}
            </div>
            <div>
              {t
                ? "Αυτό είναι προφόρμα τιμολόγιο. Μόλις ολοκληρωθεί η πληρωμή θα εκδοθεί επίσημο τιμολόγιο."
                : "This is a proforma invoice. An official invoice will be issued upon payment."}
            </div>
            {invoice.tenant.plan && (
              <div style={{ marginTop: 6 }}>
                {t ? "Πλάνο" : "Plan"}: <strong>{invoice.tenant.plan.name}</strong>
              </div>
            )}
          </div>
          <div style={{ fontSize: 13 }}>
            <TotalRow label={t ? "Υποσύνολο" : "Subtotal"} value={fmtMoney(invoice.subtotal)} />
            <TotalRow label={`${t ? "ΦΠΑ" : "VAT"} 24%`} value={fmtMoney(invoice.vat)} />
            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "12px 10px", background: "#ff6600", color: "#fff",
              borderRadius: 4, marginTop: 8, fontWeight: 800, fontSize: 16,
            }}>
              <span>{t ? "ΣΥΝΟΛΟ" : "TOTAL"}</span>
              <span>{fmtMoney(invoice.total)}</span>
            </div>
            {totalPaid > 0 && (
              <>
                <TotalRow label={t ? "Καταβληθέν" : "Paid"} value={`− ${fmtMoney(totalPaid)}`} color="#22c55e" />
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 10px", borderTop: "2px solid #111",
                  marginTop: 8, fontWeight: 700, fontSize: 14,
                }}>
                  <span>{t ? "Υπόλοιπο" : "Balance due"}</span>
                  <span style={{ color: balanceDue <= 0 ? "#22c55e" : "#ef4444" }}>{fmtMoney(Math.max(0, balanceDue))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* PAYMENTS LOG ─────────────────────────────────────── */}
        {invoice.payments.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.08, color: "#9ca3af", fontWeight: 700, marginBottom: 8 }}>
              {t ? "Ιστορικό Πληρωμών" : "Payment history"}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#f9fafb", color: "#6b7280" }}>
                  <th style={thStyleLight}>{t ? "Ημ/νία" : "Date"}</th>
                  <th style={thStyleLight}>{t ? "Μέθοδος" : "Method"}</th>
                  <th style={thStyleLight}>{t ? "Αναφορά" : "Reference"}</th>
                  <th style={{ ...thStyleLight, textAlign: "right" }}>{t ? "Ποσό" : "Amount"}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={tdStyleLight}>{fmtDate(p.receivedAt)}</td>
                    <td style={tdStyleLight}>{p.method}</td>
                    <td style={{ ...tdStyleLight, fontFamily: "monospace" }}>{p.reference ?? "—"}</td>
                    <td style={{ ...tdStyleLight, textAlign: "right", fontWeight: 600, color: "#22c55e" }}>{fmtMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIVA ─────────────────────────────────────── */}
        {invoice.vivaOrderCode && invoice.status !== "PAID" && (
          <div style={{
            padding: 14,
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            borderRadius: 6,
            marginBottom: 20,
            fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t ? "Online Πληρωμή" : "Online Payment"}</div>
            <div style={{ color: "#4b5563" }}>
              {t ? "Πληρώστε online στο" : "Pay online at"}:{" "}
              <a
                href={`https://www.vivapayments.com/web/checkout?ref=${invoice.vivaOrderCode}`}
                style={{ color: "#4338ca", wordBreak: "break-all" }}
              >
                vivapayments.com/web/checkout?ref={invoice.vivaOrderCode}
              </a>
            </div>
          </div>
        )}

        {/* FOOTER ─────────────────────────────────────── */}
        <div style={{
          borderTop: "1px solid #e5e7eb",
          paddingTop: 14,
          marginTop: 20,
          fontSize: 10,
          color: "#9ca3af",
          textAlign: "center",
        }}>
          {t ? "Ευχαριστούμε για τη συνεργασία σας" : "Thank you for your business"} ·{" "}
          {t ? "Σελίδα" : "Page"} 1/1 ·{" "}
          {vendor.serial && <>SN: {vendor.serial} · </>}
          © {new Date().getFullYear()} {vendor.vendor}
        </div>

        {/* Print button (only visible on screen) */}
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print"
          style={{
            position: "fixed",
            bottom: 24, right: 24,
            background: "#ff6600",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 20px rgba(255,102,0,0.4)",
            zIndex: 100,
          }}
        >
          <FiPrinter size={14} /> {t ? "Εκτύπωση" : "Print"}
        </button>
      </div>
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.06,
};
const thStyleLight: React.CSSProperties = { ...thStyle, padding: "6px 10px" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "top" };
const tdStyleLight: React.CSSProperties = { padding: "6px 10px", color: "#4b5563" };

function Meta({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.08, color: "#9ca3af", fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 600, color: color ?? "#111" }}>{value}</div>
    </div>
  );
}

function TotalRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", color: color ?? "#111" }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
