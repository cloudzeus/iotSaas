"use client";

import { Users, Cpu, CreditCard, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Props {
  stats: { tenantCount: number; deviceCount: number; userCount: number; mrr: number };
  pendingInvoices: Array<{ id: string; total: number; status: string; tenant: { name: string }; createdAt: string }>;
  recentTenants: Array<{ id: string; name: string; createdAt: string; plan: { name: string }; _count: { devices: number } }>;
  locale: string;
}

export default function AdminOverviewClient({ stats, pendingInvoices, recentTenants, locale }: Props) {
  const t = locale === "el";

  const statCards = [
    { label: t ? "Ενεργοί Πελάτες" : "Active Tenants", value: stats.tenantCount, icon: Users, color: "var(--orange)" },
    { label: t ? "Σύνολο Συσκευών" : "Total Devices", value: stats.deviceCount, icon: Cpu, color: "#3b82f6" },
    { label: t ? "Σύνολο Χρηστών" : "Total Users", value: stats.userCount, icon: Users, color: "#8b5cf6" },
    { label: "MRR", value: formatCurrency(stats.mrr, "EUR", locale === "el" ? "el-GR" : "en-GB"), icon: TrendingUp, color: "#22c55e", isString: true },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          {t ? "Επισκόπηση Συστήματος" : "System Overview"}
        </h1>
        <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          {t ? "Super Admin" : "Super Admin"} · DGSmart Hub
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((c) => (
          <div key={c.label} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="stat-label">{c.label}</span>
              <c.icon size={18} style={{ color: c.color }} />
            </div>
            <div className="stat-value" style={{ fontSize: "1.75rem", color: c.color, marginTop: "8px" }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Recent tenants */}
        <div className="card" style={{ padding: "0" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>
              {t ? "Νέοι Πελάτες" : "Recent Tenants"}
            </h3>
            <Link href="/admin/tenants" style={{ color: "var(--orange)", fontSize: "0.75rem", textDecoration: "none" }}>
              {t ? "Όλοι →" : "All →"}
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t ? "Επωνυμία" : "Name"}</th>
                  <th>{t ? "Πλάνο" : "Plan"}</th>
                  <th>{t ? "Συσκευές" : "Devices"}</th>
                  <th>{t ? "Ημ/νία" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {recentTenants.map((ten) => (
                  <tr key={ten.id}>
                    <td style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                      <Link href={`/admin/tenants/${ten.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                        {ten.name}
                      </Link>
                    </td>
                    <td>{ten.plan ? <span className="badge badge-orange">{ten.plan.name}</span> : <span className="badge badge-gray">—</span>}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{ten._count.devices}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {formatDate(ten.createdAt, locale === "el" ? "el-GR" : "en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending invoices */}
        <div className="card" style={{ padding: "0" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>
              {t ? "Ανεξόφλητα Τιμολόγια" : "Pending Invoices"}
            </h3>
            <Link href="/admin/tenants" style={{ color: "var(--orange)", fontSize: "0.75rem", textDecoration: "none" }}>
              {t ? "Διαχείριση →" : "Manage →"}
            </Link>
          </div>
          {pendingInvoices.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {t ? "Δεν υπάρχουν εκκρεμείς" : "No pending invoices"}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t ? "Πελάτης" : "Tenant"}</th>
                    <th>{t ? "Ποσό" : "Amount"}</th>
                    <th>{t ? "Κατ/ση" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontSize: "0.85rem", fontWeight: 500 }}>{inv.tenant.name}</td>
                      <td style={{ color: "var(--orange)", fontWeight: 600 }}>
                        {formatCurrency(Number(inv.total), "EUR", locale === "el" ? "el-GR" : "en-GB")}
                      </td>
                      <td>
                        <span className={inv.status === "OVERDUE" ? "badge badge-red" : "badge badge-yellow"}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
