import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import SoftoneStatus from "@/components/softone/SoftoneStatus";
import MailgunStatus from "@/components/settings/MailgunStatus";
import SyncSchedules from "@/components/settings/SyncSchedules";

export const metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin/overview");

  const t = session.user.locale === "el";

  const schedules = await db.syncSchedule.findMany({ orderBy: { kind: "asc" } });

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1 className="page-title">
          {t ? "Ρυθμίσεις Συστήματος" : "System Settings"}
        </h1>
      </div>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em",
          fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10,
        }}>
          {t ? "Ενσωματώσεις" : "Integrations"}
        </h2>
        <SoftoneStatus locale={session.user.locale} />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em",
          fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10,
        }}>
          {t ? "Email" : "Email"}
        </h2>
        <MailgunStatus locale={session.user.locale} defaultTo={session.user.email ?? ""} />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em",
          fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10,
        }}>
          {t ? "Προγράμματα Συγχρονισμού" : "Sync Schedules"}
        </h2>
        <SyncSchedules
          schedules={JSON.parse(JSON.stringify(schedules))}
          locale={session.user.locale}
        />
      </section>
    </div>
  );
}
