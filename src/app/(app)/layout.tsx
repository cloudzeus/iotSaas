import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  // Admins belong in the admin portal
  if (session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN") {
    redirect("/admin/overview");
  }

  return (
    <AppShell
      userName={session.user.name || ""}
      userEmail={session.user.email || ""}
      userRole={session.user.role}
      userLocale={session.user.locale || "el"}
    >
      {children}
    </AppShell>
  );
}
