import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft, FiBriefcase, FiMapPin, FiGrid, FiCpu, FiUser,
  FiDollarSign, FiFileText, FiExternalLink,
} from "react-icons/fi";
import InvoiceRow from "@/components/billing/InvoiceRow";
import TenantGraceCard from "@/components/billing/TenantGraceCard";

export const metadata = { title: "Tenant" };

interface Params { params: Promise<{ id: string }> }

export default async function TenantOverviewPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, afm: true } },
      plan:     { select: { name: true, pricePerDevice: true } },
      locations: {
        orderBy: [{ isMain: "desc" }, { name: "asc" }],
        select: { id: true, name: true, isMain: true, city: true, _count: { select: { devices: true } } },
      },
      invoices: {
        where: { status: { in: ["DRAFT", "PENDING", "OVERDUE"] } },
        orderBy: { periodStart: "desc" },
        take: 6,
      },
      _count: { select: { devices: true, users: true, dashboards: true, invoices: true, locations: true, alertRules: true } },
    },
  });
  if (!tenant) notFound();

  const t = session.user.locale === "el";

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link
          href="/admin/tenants"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.82rem", textDecoration: "none" }}
        >
          <FiArrowLeft size={14} /> {t ? "Πίσω στους tenants" : "Back"}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">
          <FiBriefcase size={20} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {tenant.name}
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400, fontFamily: "monospace" }}>
            {tenant.slug}
          </span>
        </h1>
        <span className={`badge ${tenant.isActive ? "badge-green" : "badge-gray"}`}>
          {tenant.isActive ? (t ? "Ενεργός" : "Active") : (t ? "Ανενεργός" : "Inactive")}
        </span>
      </div>

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Stat Icon={FiCpu}   label={t ? "Συσκευές"   : "Devices"}   value={tenant._count.devices}   color="#ff6600" />
        <Stat Icon={FiUser}  label={t ? "Χρήστες"    : "Users"}     value={tenant._count.users}     color="#3b82f6" />
        <Stat Icon={FiMapPin} label={t ? "Τοποθεσίες" : "Locations"} value={tenant._count.locations} color="#14b8a6" />
        <Stat Icon={FiGrid}  label={t ? "Dashboards" : "Dashboards"} value={tenant._count.dashboards} color="#8b5cf6" />
        <Stat Icon={FiFileText} label={t ? "Τιμολόγια" : "Invoices"} value={tenant._count.invoices}   color="#f59e0b" />
        <Stat Icon={FiDollarSign} label={t ? "MRR"      : "MRR"}    value={`€${(tenant._count.devices * Number(tenant.plan?.pricePerDevice ?? 0)).toFixed(2)}`} color="#22c55e" />
      </div>

      {/* Shortcuts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Shortcut href={`/admin/tenants/${tenant.id}/dashboard`} Icon={FiGrid}
          label={t ? "Dashboard (Admin view)" : "Dashboard (Admin view)"}
          desc={t ? "Σχεδίαση widgets για τον πελάτη" : "Design widgets for this tenant"} />
        <Shortcut href={`/admin/tenants/${tenant.id}/locations`} Icon={FiMapPin}
          label={t ? "Τοποθεσίες" : "Locations"}
          desc={t ? "Διαχείριση sites" : "Manage sites"} />
        {tenant.customer && (
          <Shortcut href={`/admin/customers/${tenant.customer.id}`} Icon={FiBriefcase}
            label={t ? "CRM Πελάτης" : "CRM Customer"}
            desc={tenant.customer.name} />
        )}
      </div>

      {/* Default grace period */}
      <section style={{ marginBottom: 20 }}>
        <TenantGraceCard
          tenantId={tenant.id}
          initial={tenant.defaultGraceDays}
          locale={session.user.locale}
        />
      </section>

      {/* Unpaid invoices */}
      {tenant.invoices.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{
            fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em",
            fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10,
          }}>
            {t ? "Εκκρεμή Τιμολόγια" : "Unpaid Invoices"} ({tenant.invoices.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tenant.invoices.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={{
                  id: inv.id,
                  tenantId: tenant.id,
                  tenantName: tenant.name,
                  billingEmail: tenant.billingEmail,
                  periodStart: inv.periodStart.toISOString(),
                  deviceCount: inv.deviceCount,
                  total: Number(inv.total),
                  status: inv.status,
                  graceUntil: inv.graceUntil ? inv.graceUntil.toISOString() : null,
                  vivaOrderCode: inv.vivaOrderCode,
                  createdAt: inv.createdAt.toISOString(),
                }}
                locale={session.user.locale}
              />
            ))}
          </div>
        </section>
      )}

      {/* Overview panels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <Card title={t ? "Στοιχεία" : "Details"}>
          <Row label={t ? "CRM Πελάτης" : "CRM Customer"} value={tenant.customer?.name ?? "—"} />
          {tenant.customer?.afm && <Row label="ΑΦΜ" value={tenant.customer.afm} mono />}
          <Row label={t ? "Πλάνο" : "Plan"} value={tenant.plan?.name ?? "—"} />
          <Row label={t ? "Τιμή/συσκευή" : "€/device"} value={tenant.plan ? `€${Number(tenant.plan.pricePerDevice).toFixed(2)}` : "—"} />
          <Row label={t ? "Email χρέωσης" : "Billing email"} value={tenant.billingEmail ?? "—"} />
          <Row label={t ? "Δημιουργήθηκε" : "Created"} value={new Date(tenant.createdAt).toLocaleString(t ? "el-GR" : "en-GB")} />
        </Card>

        <Card title={t ? "Τοποθεσίες" : "Locations"}>
          {tenant.locations.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tenant.locations.map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "var(--bg-elevated)", borderRadius: 6, fontSize: "0.85rem" }}>
                  {l.isMain && <span style={{ color: "var(--orange)" }}>★</span>}
                  <span style={{ fontWeight: 600 }}>{l.name}</span>
                  {l.city && <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>· {l.city}</span>}
                  <span style={{ flex: 1 }} />
                  <span className="badge badge-blue" style={{ fontSize: "0.7rem" }}>{l._count.devices} devices</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({
  Icon, label, value, color,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}18`, color,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function Shortcut({
  href, Icon, label, desc,
}: {
  href: string;
  Icon: React.ComponentType<{ size?: number }>;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 14,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        textDecoration: "none",
        transition: "border-color 0.15s, transform 0.1s",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "var(--orange-dim)", color: "var(--orange)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.88rem" }}>{label}</div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{desc}</div>
      </div>
      <FiExternalLink size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
    </Link>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label, value, mono,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "4px 0",
      fontSize: "0.82rem",
    }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", textAlign: "right", fontFamily: mono ? "monospace" : undefined }}>
        {value == null || value === "" ? "—" : value}
      </span>
    </div>
  );
}
