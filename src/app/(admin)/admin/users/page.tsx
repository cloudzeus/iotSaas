import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; tenant?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { q, role, tenant } = await searchParams;
  const search = (q ?? "").trim();

  type UserWhere = {
    role?: "SUPER_ADMIN" | "ADMIN" | "CUSTOMER" | "OPERATOR" | "VIEWER";
    tenantId?: string | null;
    OR?: Array<{ email?: { contains: string }; name?: { contains: string } }>;
  };
  const where: UserWhere = {};
  if (role) where.role = role as NonNullable<UserWhere["role"]>;
  if (tenant === "none") where.tenantId = null;
  else if (tenant) where.tenantId = tenant;
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { name:  { contains: search } },
    ];
  }

  const [users, tenants, totals] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { id: true, name: true } } },
    }),
    db.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const countsByRole = Object.fromEntries(totals.map((t) => [t.role, t._count._all]));

  return (
    <UsersClient
      users={JSON.parse(JSON.stringify(users))}
      tenants={tenants}
      countsByRole={countsByRole}
      query={search}
      filterRole={role ?? ""}
      filterTenant={tenant ?? ""}
      locale={session.user.locale}
    />
  );
}
