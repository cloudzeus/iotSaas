import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import TenantsClient from "./TenantsClient";

export const metadata = { title: "Πελάτες" };

export default async function TenantsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenants = await db.tenant.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      kads: { orderBy: { kadType: "asc" } },
      devices: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, devEui: true, name: true, model: true,
          online: true, lastSeenAt: true, battery: true,
        },
      },
      _count: { select: { kads: true, contacts: true, branches: true, devices: true, users: true } },
    },
  });

  return (
    <TenantsClient
      customers={JSON.parse(JSON.stringify(tenants))}
      locale={session.user.locale}
    />
  );
}
