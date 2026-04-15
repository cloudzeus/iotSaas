import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FiShield, FiSettings, FiUser, FiEye, FiTool, FiUsers, FiCheck, FiX,
} from "react-icons/fi";

export const metadata = { title: "Roles" };

type RoleKey = "SUPER_ADMIN" | "ADMIN" | "CUSTOMER" | "OPERATOR" | "VIEWER";

interface RoleDef {
  code: RoleKey;
  label: { el: string; en: string };
  description: { el: string; en: string };
  Icon: React.ComponentType<{ size?: number }>;
  color: string;
  scope: "platform" | "tenant";
}

const ROLES: RoleDef[] = [
  {
    code: "SUPER_ADMIN",
    Icon: FiShield,
    color: "#ef4444",
    scope: "platform",
    label: { el: "Super Admin", en: "Super Admin" },
    description: {
      el: "Πλήρης έλεγχος της πλατφόρμας: tenants, χρήστες, πλάνα, ενσωματώσεις.",
      en: "Full platform control: tenants, users, plans, integrations.",
    },
  },
  {
    code: "ADMIN",
    Icon: FiSettings,
    color: "#ff6600",
    scope: "platform",
    label: { el: "Διαχειριστής", en: "Admin" },
    description: {
      el: "Διαχείριση tenants/συσκευών/widgets. Δεν διαχειρίζεται πλάνα ή super admins.",
      en: "Manages tenants/devices/widgets. Cannot manage plans or super admins.",
    },
  },
  {
    code: "CUSTOMER",
    Icon: FiUser,
    color: "#3b82f6",
    scope: "tenant",
    label: { el: "Πελάτης (Owner)", en: "Customer (Owner)" },
    description: {
      el: "Πλήρης πρόσβαση στον δικό του tenant: dashboards, χρήστες, συσκευές, τιμολόγηση.",
      en: "Full access to their own tenant: dashboards, users, devices, billing.",
    },
  },
  {
    code: "OPERATOR",
    Icon: FiTool,
    color: "#22c55e",
    scope: "tenant",
    label: { el: "Χειριστής", en: "Operator" },
    description: {
      el: "Διαβάζει/γράφει δεδομένα συσκευών και dashboards. Δεν αλλάζει πλάνο ή χρήστες.",
      en: "Reads/writes device data and dashboards. Cannot change plan or users.",
    },
  },
  {
    code: "VIEWER",
    Icon: FiEye,
    color: "#6b7280",
    scope: "tenant",
    label: { el: "Θεατής", en: "Viewer" },
    description: {
      el: "Πρόσβαση μόνο για ανάγνωση: dashboards, τηλεμετρία, ειδοποιήσεις.",
      en: "Read-only access: dashboards, telemetry, alerts.",
    },
  },
];

interface Perm {
  key: string;
  label: { el: string; en: string };
  roles: RoleKey[];
}

const PERMISSIONS: Perm[] = [
  { key: "manage_tenants", label: { el: "Διαχείριση tenants", en: "Manage tenants" }, roles: ["SUPER_ADMIN", "ADMIN"] },
  { key: "manage_plans",   label: { el: "Διαχείριση πλάνων", en: "Manage plans" }, roles: ["SUPER_ADMIN"] },
  { key: "manage_staff",   label: { el: "Platform staff (Admin/Super)", en: "Manage platform staff" }, roles: ["SUPER_ADMIN"] },
  { key: "sync_softone",   label: { el: "Συγχρονισμός SoftOne", en: "SoftOne sync" }, roles: ["SUPER_ADMIN", "ADMIN"] },
  { key: "manage_devices", label: { el: "Αντιστοίχιση/αφαίρεση συσκευών", en: "Assign/remove devices" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER"] },
  { key: "manage_users",   label: { el: "Χρήστες του tenant", en: "Tenant users" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER"] },
  { key: "manage_locations", label: { el: "Τοποθεσίες", en: "Locations" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER"] },
  { key: "edit_dashboard", label: { el: "Επεξεργασία dashboard", en: "Edit dashboard" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER", "OPERATOR"] },
  { key: "view_dashboard", label: { el: "Προβολή dashboard", en: "View dashboard" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER", "OPERATOR", "VIEWER"] },
  { key: "manage_alerts",  label: { el: "Κανόνες ειδοποιήσεων", en: "Alert rules" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER", "OPERATOR"] },
  { key: "ack_alerts",     label: { el: "Επιβεβαίωση ειδοποιήσεων", en: "Acknowledge alerts" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER", "OPERATOR"] },
  { key: "view_telemetry", label: { el: "Προβολή τηλεμετρίας", en: "View telemetry" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER", "OPERATOR", "VIEWER"] },
  { key: "view_billing",   label: { el: "Τιμολόγηση", en: "Billing" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER"] },
  { key: "export_data",    label: { el: "Εξαγωγή δεδομένων", en: "Data export" }, roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER", "OPERATOR"] },
];

export default async function AdminRolesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const counts = await db.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });
  const countsByRole = Object.fromEntries(counts.map((c) => [c.role, c._count._all]));

  const t = session.user.locale === "el";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <FiShield size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Ρόλοι & Δικαιώματα" : "Roles & Permissions"}
        </h1>
      </div>

      <div style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius)", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 16 }}>
        {t
          ? "Η αντιστοίχιση ρόλων γίνεται ανά χρήστη. Πηγαίνετε στους "
          : "Role assignment is per-user. Go to "}
        <Link href="/admin/users" style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 600 }}>
          {t ? "Χρήστες" : "Users"}
        </Link>
        {t ? " για να αλλάξετε ρόλο χρήστη." : " to change a user's role."}
      </div>

      {/* Role cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 24 }}>
        {ROLES.map((r) => {
          const Icon = r.Icon;
          return (
            <div
              key={r.code}
              className="card"
              style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden" }}
            >
              <div style={{
                position: "absolute", top: 0, right: 0,
                width: 80, height: 80,
                background: `radial-gradient(circle, ${r.color}22, transparent 70%)`,
                pointerEvents: "none",
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${r.color}18`, color: r.color,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {t ? r.label.el : r.label.en}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "monospace" }}>
                    {r.code}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {t ? r.description.el : r.description.en}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, borderTop: "1px solid var(--border)", marginTop: "auto" }}>
                <span className={`badge ${r.scope === "platform" ? "badge-red" : "badge-blue"}`}>
                  {r.scope === "platform"
                    ? (t ? "Platform" : "Platform")
                    : (t ? "Tenant" : "Tenant")}
                </span>
                <span style={{ flex: 1 }} />
                <Link
                  href={`/admin/users?role=${r.code}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    color: "var(--text-secondary)", fontSize: "0.78rem", textDecoration: "none",
                  }}
                >
                  <FiUsers size={11} />
                  <strong style={{ color: "var(--text-primary)" }}>{countsByRole[r.code] ?? 0}</strong>
                  {t ? "χρήστες" : "users"} →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission matrix */}
      <h2 style={{
        fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em",
        fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10,
      }}>
        {t ? "Πίνακας δικαιωμάτων" : "Permission matrix"}
      </h2>
      <div className="card" style={{ overflow: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ padding: 12, textAlign: "left", color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, borderBottom: "1px solid var(--border)" }}>
                {t ? "Δικαίωμα" : "Permission"}
              </th>
              {ROLES.map((r) => (
                <th
                  key={r.code}
                  style={{
                    padding: 12, textAlign: "center",
                    color: r.color,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t ? r.label.el : r.label.en}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.key} style={{ borderBottom: "1px solid var(--row-border)" }}>
                <td style={{ padding: 10, color: "var(--text-primary)" }}>
                  {t ? p.label.el : p.label.en}
                </td>
                {ROLES.map((r) => (
                  <td key={r.code} style={{ padding: 10, textAlign: "center" }}>
                    {p.roles.includes(r.code) ? (
                      <FiCheck size={16} style={{ color: r.color }} />
                    ) : (
                      <FiX size={14} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
