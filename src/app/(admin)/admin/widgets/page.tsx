import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import WidgetsAdminClient from "./WidgetsAdminClient";

export const metadata = { title: "Widgets" };

export default async function AdminWidgetsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [widgetTypes, tenants, enabled] = await Promise.all([
    db.widgetType.findMany({ orderBy: { name: "asc" } }),
    db.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.tenantWidgetType.findMany(),
  ]);

  return (
    <WidgetsAdminClient
      widgetTypes={JSON.parse(JSON.stringify(widgetTypes))}
      tenants={tenants}
      enabled={enabled.map((e) => ({ tenantId: e.tenantId, widgetTypeId: e.widgetTypeId }))}
      locale={session.user.locale}
    />
  );
}
