import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
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
