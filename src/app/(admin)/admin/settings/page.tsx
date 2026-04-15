import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin/overview");

  return (
    <div style={{ maxWidth: "640px" }}>
      <div className="page-header">
        <h1 className="page-title">
          {session.user.locale === "el" ? "Ρυθμίσεις Συστήματος" : "System Settings"}
        </h1>
      </div>
      <div className="card" style={{ padding: "24px" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          {session.user.locale === "el"
            ? "Ρυθμίσεις διαχειριστή — διαθέσιμες στην επόμενη έκδοση."
            : "Admin system settings — available in the next release."}
        </p>
      </div>
    </div>
  );
}
