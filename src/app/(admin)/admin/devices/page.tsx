import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { listAllDevicesAction } from "./actions";
import DevicesAdminClient from "./DevicesAdminClient";

export const metadata = { title: "Συσκευές" };

export default async function AdminDevicesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [data, tenants] = await Promise.all([
    listAllDevicesAction(),
    db.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DevicesAdminClient
      data={JSON.parse(JSON.stringify(data))}
      tenants={tenants}
      locale={session.user.locale}
    />
  );
}
