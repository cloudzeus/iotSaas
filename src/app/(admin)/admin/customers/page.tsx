import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import CustomersClient from "./CustomersClient";

export const metadata = { title: "Πελάτες (CRM)" };

const PAGE_SIZES = ["25", "50", "100", "200", "500", "all"] as const;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; size?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { q, page, size } = await searchParams;
  const sizeRaw = (size ?? "50").toLowerCase();
  const sizeKey = (PAGE_SIZES as readonly string[]).includes(sizeRaw) ? sizeRaw : "50";
  const pageNum = Math.max(1, Number(page ?? "1"));
  const search = (q ?? "").trim();

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { afm:  { contains: search } },
          { code: { contains: search } },
          { email:{ contains: search } },
          { city: { contains: search } },
          { sotitle: { contains: search } },
        ],
      }
    : {};

  const limit = sizeKey === "all" ? undefined : Number(sizeKey);

  const [customers, total, plans] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      ...(limit ? { take: limit, skip: (pageNum - 1) * limit } : {}),
      include: {
        kads: { orderBy: { kadType: "asc" } },
        _count: { select: { kads: true, contacts: true, branches: true } },
        tenant: { select: { id: true, name: true } },
      },
    }),
    db.customer.count({ where }),
    db.plan.findMany({
      where: { isActive: true },
      orderBy: { pricePerDevice: "asc" },
      select: { id: true, name: true, pricePerDevice: true },
    }),
  ]);

  return (
    <CustomersClient
      customers={JSON.parse(JSON.stringify(customers))}
      plans={JSON.parse(JSON.stringify(plans))}
      total={total}
      page={pageNum}
      pageSize={sizeKey}
      query={search}
      locale={session.user.locale}
    />
  );
}
