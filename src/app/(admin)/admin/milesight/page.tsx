import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ensureDefaultAppFromEnv } from "@/lib/milesight-apps";
import MilesightAppsClient from "./MilesightAppsClient";

export const metadata = { title: "Milesight Apps" };

export default async function MilesightAppsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Auto-seed first app from .env if table is empty
  await ensureDefaultAppFromEnv();

  const apps = await db.milesightApp.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  const envSuggests = {
    clientId: process.env.MILESIGHT_CLIENT_ID ?? null,
    uuid: process.env.MILESIGHT_UUID ?? null,
  };

  return (
    <MilesightAppsClient
      apps={JSON.parse(JSON.stringify(apps))}
      envSuggests={envSuggests}
      locale={session.user.locale}
    />
  );
}
