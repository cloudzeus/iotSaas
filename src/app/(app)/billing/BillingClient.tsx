"use client";

import { CreditCard, Download, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const invoiceStatusBadge = (status: string, t: boolean) => {
  const map: Record<string, { cls: string; label: [string, string] }> = {
    PAID: { cls: "badge badge-green", label: ["Πληρώθηκε", "Paid"] },
    PENDING: { cls: "badge badge-yellow", label: ["Εκκρεμεί", "Pending"] },
    OVERDUE: { cls: "badge badge-red", label: ["Ληξιπρ.", "Overdue"] },
    DRAFT: { cls: "badge badge-gray", label: ["Πρόχειρο", "Draft"] },
    VOID: { cls: "badge badge-gray", label: ["Ακυρωμ.", "Void"] },
  };
  const entry = map[status] || map.DRAFT;
  return { cls: entry.cls, label: t ? entry.label[0] : entry.label[1] };
};

interface Props {
  tenant: { name: string; plan: { name: string; pricePerDevice: number } } | null;
  invoices: Array<{
    id: string; periodStart: string; periodEnd: string; deviceCount: number;
    total: number; status: string; vivaOrderCode: string | null; createdAt: string;
  }>;
  activeDeviceCount: number;
  locale: string;
}

export default function BillingClient({ tenant, invoices, activeDeviceCount, locale }: Props) {
  const t = locale === "el";
  const pricePerDevice = Number(tenant?.plan?.pricePerDevice || 0);
  const vatRate = parseFloat(process.env.NEXT_PUBLIC_VAT_RATE || "0.24");
  const subtotal = activeDeviceCount * pricePerDevice;
  const vat = subtotal * vatRate;
  const total = subtotal + vat;

  const handlePay = async (invoiceId: string) => {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId }),
    });
    const data = await res.json();
    if (data.checkoutUrl) window.location.href = data.checkoutUrl;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <CreditCard size={22} style={{ display: "inline", marginRight: "8px", color: "var(--orange)" }} />
          {t ? "Χρεώσεις" : "Billing"}
        </h1>
      </div>

      {/* Plan summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-label">{t ? "Τρέχον Πλάνο" : "Current Plan"}</div>
          <div className="stat-value" style={{ fontSize: "1.5rem", color: "var(--orange)" }}>{tenant?.plan?.name || "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t ? "Τιμή/Συσκευή/Μήνα" : "Price/Device/Month"}</div>
          <div className="stat-value" style={{ fontSize: "1.5rem" }}>{formatCurrency(pricePerDevice, "EUR", locale === "el" ? "el-GR" : "en-GB")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t ? "Ενεργές Συσκευές" : "Active Devices"}</div>
          <div className="stat-value" style={{ fontSize: "1.5rem" }}>{activeDeviceCount}</div>
        </div>
        <div className="stat-card" style={{ borderColor: "var(--orange)", borderWidth: "1px" }}>
          <div className="stat-label">{t ? "Εκτιμ. Χρέωση (με ΦΠΑ 24%)" : "Est. Bill (incl. VAT 24%)"}</div>
          <div className="stat-value" style={{ fontSize: "1.5rem", color: "var(--orange)" }}>
            {formatCurrency(total, "EUR", locale === "el" ? "el-GR" : "en-GB")}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "4px" }}>
            {t ? `Χωρίς ΦΠΑ: ${formatCurrency(subtotal, "EUR")}` : `Excl. VAT: ${formatCurrency(subtotal, "EUR")}`}
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="card" style={{ padding: "0" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 600, margin: 0 }}>
            {t ? "Τιμολόγια" : "Invoices"}
          </h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t ? "Περίοδος" : "Period"}</th>
                <th>{t ? "Συσκευές" : "Devices"}</th>
                <th>{t ? "Σύνολο" : "Total"}</th>
                <th>{t ? "Κατάσταση" : "Status"}</th>
                <th>{t ? "Ημ/νία" : "Date"}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                    {t ? "Δεν υπάρχουν τιμολόγια" : "No invoices yet"}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const { cls, label } = invoiceStatusBadge(inv.status, t);
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontSize: "0.85rem" }}>
                        {formatDate(inv.periodStart, locale === "el" ? "el-GR" : "en-GB")}
                        {" – "}
                        {formatDate(inv.periodEnd, locale === "el" ? "el-GR" : "en-GB")}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{inv.deviceCount}</td>
                      <td style={{ fontWeight: 600, color: "var(--orange)" }}>
                        {formatCurrency(Number(inv.total), "EUR", locale === "el" ? "el-GR" : "en-GB")}
                      </td>
                      <td><span className={cls}>{label}</span></td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {formatDate(inv.createdAt, locale === "el" ? "el-GR" : "en-GB")}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {(inv.status === "PENDING" || inv.status === "OVERDUE") && (
                            <button
                              className="btn-primary"
                              style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                              onClick={() => handlePay(inv.id)}
                            >
                              <ExternalLink size={12} />
                              {t ? "Πληρωμή" : "Pay Now"}
                            </button>
                          )}
                          <button
                            className="btn-ghost"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={() => window.open(`/api/billing/invoice/${inv.id}/pdf`)}
                          >
                            <Download size={12} />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
