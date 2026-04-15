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

  return <AuditClient logs={JSON.parse(JSON.stringify(logs))} locale={session.user.locale} />;
}
