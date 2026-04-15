"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  FiDollarSign, FiCheckCircle, FiAlertTriangle, FiClock,
  FiTrendingUp, FiSearch, FiCreditCard,
} from "react-icons/fi";
import InvoiceRow from "@/components/billing/InvoiceRow";
import m from "@/components/customers/customers.module.css";
import s from "@/components/customers/DataTable.module.css";

interface Kpi {
  paidYtd: number;
  outstanding: number;
  outstandingCount: number;
  overdueCount: number;
  mrr: number;
  paymentsThisMonth: number;
  paymentsCountThisMonth: number;
}

interface InvoiceWithTenant {
  id: string;
  tenantId: string;
  periodStart: string;
  deviceCount: number;
  total: string | number;
  status: string;
  graceUntil: string | null;
  vivaOrderCode: string | null;
  createdAt: string;
  tenant: { id: string; name: string; billingEmail: string | null };
}

interface PaymentWithInvoice {
  id: string;
  amount: string | number;
  method: string;
  reference: string | null;
  notes: string | null;
  receivedAt: string;
  invoice: { id: string; periodStart: string; tenant: { id: string; name: string } };
}

interface Props {
  kpi: Kpi;
  invoices: InvoiceWithTenant[];
  payments: PaymentWithInvoice[];
  activeTab: "unpaid" | "paid" | "all" | "payments";
  query: string;
  locale: string;
}

export default function AccountingClient({
  kpi, invoices, payments, activeTab, query, locale,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = locale === "el";
  const [q, setQ] = useState(query);
  const [, startTransition] = useTransition();

  function setTab(tab: string, nextQ = q) {
    const params = new URLSearchParams();
    if (tab !== "unpaid") params.set("tab", tab);
    if (nextQ) params.set("q", nextQ);
    startTransition(() => router.replace(`${pathname}${params.toString() ? "?" + params.toString() : ""}`));
  }

  function onSearch(e: React.FormEvent) { e.preventDefault(); setTab(activeTab, q); }

  const money = (n: number) =>
    n.toLocaleString(t ? "el-GR" : "en-GB", { style: "currency", currency: "EUR" });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <FiDollarSign size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Λογιστήριο" : "Accounting"}
        </h1>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Kpi
          Icon={FiCheckCircle}
          label={t ? "Εισπράξεις YTD" : "Collected YTD"}
          value={money(kpi.paidYtd)}
          color="#22c55e"
        />
        <Kpi
          Icon={FiClock}
          label={t ? "Εκκρεμότητες" : "Outstanding"}
          value={money(kpi.outstanding)}
          color="#ff6600"
          sub={`${kpi.outstandingCount} ${t ? "τιμολόγια" : "invoices"}`}
        />
        <Kpi
          Icon={FiAlertTriangle}
          label={t ? "Σε καθυστέρηση" : "Overdue"}
          value={String(kpi.overdueCount)}
          color="#ef4444"
          sub={t ? "μετά τη λήξη χάριτος" : "past grace period"}
        />
        <Kpi
          Icon={FiTrendingUp}
          label={t ? "MRR Μήνα" : "This Month"}
          value={money(kpi.mrr)}
          color="#8b5cf6"
        />
        <Kpi
          Icon={FiCreditCard}
          label={t ? "Πληρωμές μήνα" : "Payments this month"}
          value={money(kpi.paymentsThisMonth)}
          color="#3b82f6"
          sub={`${kpi.paymentsCountThisMonth} ${t ? "καταχωρήσεις" : "entries"}`}
        />
      </div>

      {/* Tabs + search */}
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", marginBottom: 16, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        <TabBtn active={activeTab === "unpaid"} onClick={() => setTab("unpaid")}>
          {t ? "Εκκρεμή" : "Unpaid"}
        </TabBtn>
        <TabBtn active={activeTab === "paid"} onClick={() => setTab("paid")}>
          {t ? "Πληρωμένα" : "Paid"}
        </TabBtn>
        <TabBtn active={activeTab === "all"} onClick={() => setTab("all")}>
          {t ? "Όλα" : "All"}
        </TabBtn>
        <TabBtn active={activeTab === "payments"} onClick={() => setTab("payments")}>
          {t ? "Πληρωμές" : "Payments"}
        </TabBtn>
        <span style={{ flex: 1 }} />
        {activeTab !== "payments" && (
          <form onSubmit={onSearch} style={{ position: "relative", marginBottom: 8, minWidth: 260 }}>
            <FiSearch size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t ? "Αναζήτηση tenant/ΑΦΜ..." : "Search tenant/VAT..."}
            />
          </form>
        )}
      </div>

      {activeTab === "payments" ? (
        <PaymentsTable payments={payments} locale={locale} />
      ) : invoices.length === 0 ? (
        <div className={`card ${m.emptyCell}`} style={{ padding: 40 }}>
          {t ? "Δεν βρέθηκαν τιμολόγια" : "No invoices found"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {invoices.map((inv) => (
            <div key={inv.id}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 4, paddingLeft: 4 }}>
                <Link href={`/admin/tenants/${inv.tenant.id}`} style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 600 }}>
                  {inv.tenant.name}
                </Link>
              </div>
              <InvoiceRow
                invoice={{
                  id: inv.id,
                  tenantId: inv.tenantId,
                  tenantName: inv.tenant.name,
                  billingEmail: inv.tenant.billingEmail,
                  periodStart: inv.periodStart,
                  deviceCount: inv.deviceCount,
                  total: Number(inv.total),
                  status: inv.status,
                  graceUntil: inv.graceUntil,
                  vivaOrderCode: inv.vivaOrderCode,
                  createdAt: inv.createdAt,
                }}
                locale={locale}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({
  Icon, label, value, sub, color,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 0, right: 0, width: 70, height: 70,
        background: `radial-gradient(circle, ${color}22, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}18`, color,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 800, color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 16px",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--orange)" : "2px solid transparent",
        color: active ? "var(--orange)" : "var(--text-secondary)",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.875rem",
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}

function PaymentsTable({ payments, locale }: { payments: PaymentWithInvoice[]; locale: string }) {
  const t = locale === "el";
  if (payments.length === 0) {
    return (
      <div className={`card ${m.emptyCell}`} style={{ padding: 40 }}>
        {t ? "Δεν υπάρχουν πληρωμές" : "No payments yet"}
      </div>
    );
  }
  const methodLabel = (m: string): string => {
    if (!t) return m;
    return {
      "bank-transfer": "Τραπεζική μεταφορά",
      "cash": "Μετρητά",
      "check": "Επιταγή",
      "viva": "Viva Wallet",
      "other": "Άλλο",
    }[m] ?? m;
  };
  return (
    <div className={s.wrap}>
      <div className={s.scroll}>
        <table className={s.table}>
          <colgroup>
            <col style={{ width: 140 }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              <th className={s.th}>{t ? "Ημερομηνία" : "Date"}</th>
              <th className={s.th}>{t ? "Tenant" : "Tenant"}</th>
              <th className={s.th}>{t ? "Μέθοδος" : "Method"}</th>
              <th className={s.th} style={{ textAlign: "right" }}>{t ? "Ποσό" : "Amount"}</th>
              <th className={s.th}>{t ? "Αναφορά" : "Reference"}</th>
              <th className={s.th}>{t ? "Τιμολόγιο" : "Invoice"}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const d = new Date(p.receivedAt);
              const inv = new Date(p.invoice.periodStart);
              return (
                <tr key={p.id} className={s.tr}>
                  <td className={s.td} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {d.toLocaleDateString(t ? "el-GR" : "en-GB")}
                  </td>
                  <td className={s.td}>
                    <Link
                      href={`/admin/tenants/${p.invoice.tenant.id}`}
                      style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 600 }}
                    >
                      {p.invoice.tenant.name}
                    </Link>
                  </td>
                  <td className={s.td}>
                    <span className="badge badge-blue">{methodLabel(p.method)}</span>
                  </td>
                  <td className={s.td} style={{ textAlign: "right", fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>
                    €{Number(p.amount).toFixed(2)}
                  </td>
                  <td className={s.td} style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {p.reference ?? "—"}
                  </td>
                  <td className={s.td} style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {inv.toLocaleDateString(t ? "el-GR" : "en-GB", { month: "short", year: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
