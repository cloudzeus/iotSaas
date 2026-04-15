import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AccountingClient from "./AccountingClient";

export const metadata = { title: "Accounting" };

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { tab, q } = await searchParams;
  const activeTab = (tab as "unpaid" | "paid" | "all" | "payments") ?? "unpaid";
  const search = (q ?? "").trim();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // KPIs (always computed across everything)
  const [paidAgg, outstandingAgg, overdueCount, mrrAgg, paymentsMonth] = await Promise.all([
    db.invoice.aggregate({
      _sum: { total: true },
      where: { status: "PAID", paidAt: { gte: new Date(now.getFullYear(), 0, 1) } },
    }),
    db.invoice.aggregate({
      _sum: { total: true },
      _count: { _all: true },
      where: { status: { in: ["PENDING", "OVERDUE"] } },
    }),
    db.invoice.count({
      where: { status: { in: ["PENDING", "OVERDUE"] }, graceUntil: { not: null, lt: now } },
    }),
    db.invoice.aggregate({
      _sum: { total: true },
      where: { periodStart: { gte: monthStart } },
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: { receivedAt: { gte: monthStart } },
    }),
  ]);

  // Tab data
  const invoiceWhere = search
    ? { tenant: { OR: [
        { name:    { contains: search } },
        { slug:    { contains: search } },
        { customer: { afm: { contains: search } } },
      ]}}
    : {};

  type WhereExtra = Record<string, unknown>;
  const extra: WhereExtra =
    activeTab === "unpaid" ? { status: { in: ["DRAFT", "PENDING", "OVERDUE"] } } :
    activeTab === "paid"   ? { status: "PAID" } : {};

  const invoices = activeTab === "payments" ? [] : await db.invoice.findMany({
    where: { ...invoiceWhere, ...extra },
    orderBy: [{ status: "asc" }, { periodStart: "desc" }],
    take: 200,
    include: {
      tenant: { select: { id: true, name: true, billingEmail: true } },
    },
  });

  const payments = activeTab === "payments" ? await db.payment.findMany({
    orderBy: { receivedAt: "desc" },
    take: 200,
    include: {
      invoice: {
        select: {
          id: true, periodStart: true, tenant: { select: { id: true, name: true } },
        },
      },
    },
  }) : [];

  return (
    <AccountingClient
      kpi={{
        paidYtd: Number(paidAgg._sum.total ?? 0),
        outstanding: Number(outstandingAgg._sum.total ?? 0),
        outstandingCount: outstandingAgg._count._all,
        overdueCount,
        mrr: Number(mrrAgg._sum.total ?? 0),
        paymentsThisMonth: Number(paymentsMonth._sum.amount ?? 0),
        paymentsCountThisMonth: paymentsMonth._count._all,
      }}
      invoices={JSON.parse(JSON.stringify(invoices))}
      payments={JSON.parse(JSON.stringify(payments))}
      activeTab={activeTab}
      query={search}
      locale={session.user.locale}
    />
  );
}
