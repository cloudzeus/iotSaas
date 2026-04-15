import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import BillingClient from "./BillingClient";

export const metadata = { title: "Χρεώσεις / Billing" };

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;

  const [tenant, invoices, activeDeviceCount] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    }),
    db.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    db.device.count({ where: { tenantId, billedFrom: { not: null } } }),
  ]);

  return (
    <BillingClient
      tenant={JSON.parse(JSON.stringify(tenant))}
      invoices={JSON.parse(JSON.stringify(invoices))}
      activeDeviceCount={activeDeviceCount}
      locale={session.user.locale}
    />
  );
}
