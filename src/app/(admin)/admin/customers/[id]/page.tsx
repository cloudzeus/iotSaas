import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft, FiMapPin, FiMail, FiPhone, FiGlobe, FiHash,
  FiHome, FiBriefcase, FiUsers, FiLink as FiLinkIcon, FiStar,
} from "react-icons/fi";

export const metadata = { title: "Customer" };

interface Params { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const customerId = Number(id);
  if (isNaN(customerId)) notFound();

  const [customer, countries] = await Promise.all([
    db.customer.findUnique({
      where: { id: customerId },
      include: {
        kads: { orderBy: { kadType: "asc" } },
        contacts: { orderBy: { createdAt: "asc" } },
        branches: { orderBy: { createdAt: "asc" } },
        tenant: {
          select: {
            id: true, name: true, slug: true, isActive: true,
            plan: { select: { name: true } },
            _count: { select: { devices: true, users: true } },
          },
        },
      },
    }),
    db.country.findMany({ select: { country: true, name: true } }),
  ]);
  if (!customer) notFound();

  const t = session.user.locale === "el";
  const countryName = customer.country
    ? countries.find((c) => c.country === customer.country)?.name ?? String(customer.country)
    : null;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link
          href="/admin/customers"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.82rem", textDecoration: "none" }}
        >
          <FiArrowLeft size={14} /> {t ? "Πίσω στους πελάτες" : "Back to customers"}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">
          <FiHome size={20} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {customer.name}
        </h1>
        {customer.tenant ? (
          <Link
            href={`/admin/tenants`}
            className="badge badge-green"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <FiLinkIcon size={11} /> {t ? "Συνδεδεμένος Tenant" : "Linked Tenant"}
          </Link>
        ) : (
          <span className="badge badge-gray">{t ? "CRM μόνο" : "CRM only"}</span>
        )}
      </div>

      {customer.sotitle && (
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
          {customer.sotitle}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        <DetailCard icon={<FiHash size={14} />} title={t ? "Ταυτότητα" : "Identity"}>
          <Row label="TRDR" value={customer.trdr} />
          <Row label={t ? "Κωδικός" : "Code"} value={customer.code} />
          <Row label="ΑΦΜ" value={customer.afm} mono />
          <Row label="ΔΟΥ" value={customer.irsdata} />
          <Row label="ΓΕΜΗ" value={customer.gemiCode} />
          <Row label={t ? "Έναρξη" : "Registered"} value={customer.registrationDate ? new Date(customer.registrationDate).toLocaleDateString("el-GR") : null} />
          <Row label={t ? "Εργαζόμενοι" : "Employees"} value={customer.numberOfEmployees} />
          <Row label={t ? "Τύπος" : "Type"} value={customer.isprosp === 1 ? "Prospect" : t ? "Πελάτης" : "Customer"} />
          <Row label="GDPR" value={customer.consent ? "✓" : "✗"} />
        </DetailCard>

        <DetailCard icon={<FiMapPin size={14} />} title={t ? "Διεύθυνση" : "Address"}>
          <Row label={t ? "Οδός" : "Street"} value={customer.address} />
          <Row label="ΤΚ" value={customer.zip} />
          <Row label={t ? "Πόλη" : "City"} value={customer.city} />
          <Row label={t ? "Νομός" : "District"} value={customer.district} />
          <Row label={t ? "Περιοχή" : "Area"} value={customer.area} />
          <Row label={t ? "Χώρα" : "Country"} value={countryName} />
          <Row label="Lat" value={customer.latitude} />
          <Row label="Lng" value={customer.longitude} />
        </DetailCard>

        <DetailCard icon={<FiMail size={14} />} title={t ? "Επικοινωνία" : "Contact"}>
          <Row label={<><FiPhone size={11} /> {t ? "Τηλ. 1" : "Phone 1"}</>} value={customer.phone01} />
          <Row label={<><FiPhone size={11} /> {t ? "Τηλ. 2" : "Phone 2"}</>} value={customer.phone02} />
          <Row label={<><FiMail size={11} /> Email</>} value={customer.email} />
          <Row label={<><FiMail size={11} /> {t ? "Email Λογ." : "Email Acc."}</>} value={customer.emailacc} />
          <Row label={<><FiGlobe size={11} /> Web</>} value={customer.webpage} />
        </DetailCard>

        <DetailCard icon={<FiBriefcase size={14} />} title="Softone">
          <Row label={t ? "Επάγγελμα" : "Job type"} value={customer.jobtypetrd || customer.jobtype} />
          <Row label="Trdpgroup" value={customer.trdpgroup} />
          <Row label="Trdbusiness" value={customer.trdbusiness} />
          <Row label={t ? "Έργα (prjcs)" : "Projects"} value={customer.prjcs} />
          <Row label={t ? "Δημιουργήθηκε" : "Created"} value={new Date(customer.createdAt).toLocaleString("el-GR")} />
          <Row label={t ? "Ενημερώθηκε" : "Updated"} value={new Date(customer.updatedAt).toLocaleString("el-GR")} />
        </DetailCard>
      </div>

      {customer.tenant && (
        <section style={{ marginTop: 24 }}>
          <h2 style={sectionHeaderStyle}>{t ? "SaaS Tenant" : "SaaS Tenant"}</h2>
          <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <FiStar size={18} style={{ color: "var(--orange)" }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700 }}>{customer.tenant.name}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{customer.tenant.slug}</div>
            </div>
            {customer.tenant.plan && (
              <span className="badge badge-orange">{customer.tenant.plan.name}</span>
            )}
            <span className="badge badge-blue">{customer.tenant._count.devices} devices</span>
            <span className="badge badge-blue">{customer.tenant._count.users} users</span>
            <Link
              href={`/admin/tenants/${customer.tenant.id}/dashboard`}
              className="btn-primary"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              {t ? "Dashboard →" : "Dashboard →"}
            </Link>
          </div>
        </section>
      )}

      {customer.kads.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={sectionHeaderStyle}>ΚΑΔ ({customer.kads.length})</h2>
          <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {customer.kads.map((k) => (
              <div
                key={k.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 12px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                }}
              >
                <code style={{ color: "var(--orange)", fontWeight: 700, fontFamily: "monospace", minWidth: 90 }}>{k.kadCode}</code>
                <span style={{ flex: 1 }}>{k.kadDescription}</span>
                <span className={`badge ${k.kadType === "1" ? "badge-orange" : "badge-gray"}`}>
                  {k.kadType === "1" ? (t ? "Κύρια" : "Primary") : (t ? "Δευτ." : "Secondary")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {customer.contacts.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={sectionHeaderStyle}>
            <FiUsers size={13} style={{ display: "inline", marginRight: 6 }} />
            {t ? "Επαφές" : "Contacts"} ({customer.contacts.length})
          </h2>
          <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {customer.contacts.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-elevated)", borderRadius: 6, fontSize: "0.85rem" }}>
                <span style={{ fontWeight: 600, minWidth: 120 }}>{c.name ?? "—"}</span>
                {c.position && <span className="badge badge-gray">{c.position}</span>}
                {c.email && <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{c.email}</span>}
                {c.phone && <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{c.phone}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {customer.branches.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={sectionHeaderStyle}>{t ? "Υποκαταστήματα" : "Branches"} ({customer.branches.length})</h2>
          <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {customer.branches.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-elevated)", borderRadius: 6, fontSize: "0.85rem" }}>
                <span style={{ fontWeight: 600, minWidth: 120 }}>{b.name ?? "—"}</span>
                {b.code && <code style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--text-muted)" }}>{b.code}</code>}
                {b.address && <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{b.address}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {customer.remark && (
        <section style={{ marginTop: 24 }}>
          <h2 style={sectionHeaderStyle}>{t ? "Σημειώσεις" : "Notes"}</h2>
          <div className="card" style={{ padding: 14, whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            {customer.remark}
          </div>
        </section>
      )}
    </div>
  );
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
  color: "var(--text-secondary)",
  marginBottom: 10,
};

function DetailCard({
  icon, title, children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        {icon} {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({
  label, value, mono,
}: {
  label: React.ReactNode;
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
      alignItems: "center",
    }}>
      <span style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>{label}</span>
      <span
        style={{
          color: "var(--text-primary)",
          textAlign: "right",
          fontFamily: mono ? "monospace" : undefined,
        }}
      >
        {value == null || value === "" ? "—" : value}
      </span>
    </div>
  );
}
