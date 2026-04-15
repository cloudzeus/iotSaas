import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import SyncJobsClient from "./SyncJobsClient";

export const metadata = { title: "Sync Jobs" };

export default async function AdminSyncPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const jobs = await db.syncJob.findMany({
    orderBy: { startedAt: "desc" },
    take: 200,
  });

  return (
    <SyncJobsClient
      jobs={JSON.parse(JSON.stringify(jobs))}
      locale={session.user.locale}
    />
  );
}
