import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AuditClient from "./AuditClient";

export const metadata = { title: "Audit Log" };

export default async function AuditPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
      tenant: { select: { name: true } },
    },
  });

  const serialized = JSON.parse(
    JSON.stringify(logs, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return <AuditClient logs={serialized} locale={session.user.locale} />;
}
