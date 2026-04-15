import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AlertsClient from "./AlertsClient";

export const metadata = { title: "Ειδοποιήσεις / Alerts" };

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;

  const [rules, events, devices] = await Promise.all([
    db.alertRule.findMany({
      where: { tenantId },
      include: { device: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.alertEvent.findMany({
      where: { tenantId },
      include: {
        device: { select: { name: true } },
        rule: { select: { name: true } },
      },
      orderBy: { firedAt: "desc" },
      take: 50,
    }),
    db.device.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AlertsClient
      rules={JSON.parse(JSON.stringify(rules))}
      events={JSON.parse(JSON.stringify(events))}
      devices={JSON.parse(JSON.stringify(devices))}
      locale={session.user.locale}
      canManage={session.user.role !== "VIEWER"}
    />
  );
}
