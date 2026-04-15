import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AdminOverviewClient from "./AdminOverviewClient";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [tenantCount, deviceCount, userCount, pendingInvoices, recentTenants] = await Promise.all([
    db.tenant.count({ where: { isActive: true } }),
    db.device.count(),
    db.user.count({ where: { isActive: true } }),
    db.invoice.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] } },
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        plan: { select: { name: true } },
        _count: { select: { devices: true } },
      },
    }),
  ]);

  // Calculate MRR from active devices × plan prices
  const tenantsWithDevices = await db.tenant.findMany({
    where: { isActive: true },
    include: {
      plan: { select: { pricePerDevice: true } },
      _count: { select: { devices: { where: { billedFrom: { not: null } } } } },
    },
  });

  const mrr = tenantsWithDevices.reduce(
    (sum, t) => sum + t._count.devices * Number(t.plan?.pricePerDevice ?? 0),
    0
  );

  return (
    <AdminOverviewClient
      stats={{ tenantCount, deviceCount, userCount, mrr }}
      pendingInvoices={JSON.parse(JSON.stringify(pendingInvoices))}
      recentTenants={JSON.parse(JSON.stringify(recentTenants))}
      locale={session.user.locale}
    />
  );
}
