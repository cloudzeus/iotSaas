import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { searchDevicesAllApps } from "@/lib/milesight-apps";
import DeviceDetailClient from "./DeviceDetailClient";

interface Props { params: Promise<{ id: string }> }

export const metadata = { title: "Device Detail" };

export default async function DevicePage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.tenantId) redirect("/login");

  const device = await db.device.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!device) notFound();

  const msContent = await searchDevicesAllApps().catch(() => []);
  const live = msContent.find((d) => d.devEUI.toUpperCase() === device.devEui.toUpperCase());
  const merged = {
    ...device,
    online: live ? live.connectStatus === "ONLINE" : device.online,
    lastSeenAt: live?.lastUpdateTime ? new Date(live.lastUpdateTime) : device.lastSeenAt,
  };

  return (
    <DeviceDetailClient
      device={JSON.parse(JSON.stringify(merged))}
      locale={session.user.locale}
      canManage={session.user.role !== "VIEWER"}
    />
  );
}
