import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import DeviceLogsClient from "./DeviceLogsClient";

interface Props { params: Promise<{ id: string }> }

export const metadata = { title: "Device Logs" };

export default async function DeviceLogsPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.tenantId) redirect("/login");

  const device = await db.device.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!device) notFound();

  const logs = await db.deviceLog.findMany({
    where: { deviceId: id, tenantId: session.user.tenantId },
    orderBy: { receivedAt: "desc" },
    take: 200,
  });

  return (
    <DeviceLogsClient
      device={JSON.parse(JSON.stringify(device))}
      logs={JSON.parse(JSON.stringify(logs))}
      locale={session.user.locale}
    />
  );
}
