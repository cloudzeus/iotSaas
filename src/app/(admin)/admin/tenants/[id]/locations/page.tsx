import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import LocationsClient from "./LocationsClient";

export const metadata = { title: "Tenant · Locations" };

interface Params { params: Promise<{ id: string }> }

export default async function TenantLocationsPage({ params }: Params) {
  const { id: tenantId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      locations: { orderBy: [{ isMain: "desc" }, { name: "asc" }], include: { _count: { select: { devices: true } } } },
      customer: { select: { name: true, address: true, city: true, zip: true } },
    },
  });
  if (!tenant) notFound();

  return (
    <LocationsClient
      tenantId={tenant.id}
      tenantName={tenant.name}
      customerAddress={[tenant.customer.address, tenant.customer.zip, tenant.customer.city].filter(Boolean).join(", ")}
      locations={JSON.parse(JSON.stringify(tenant.locations))}
      locale={session.user.locale}
    />
  );
}
