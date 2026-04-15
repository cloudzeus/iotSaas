import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { searchDevicesAllApps } from "@/lib/milesight-apps";
import DevicesClient from "./DevicesClient";

export const metadata = { title: "Devices" };

export default async function DevicesPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;

  const [devices, channelRows, msContent] = await Promise.all([
    prisma.device.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.telemetry.findMany({
      where: { deviceId: { in: (await prisma.device.findMany({ where: { tenantId }, select: { id: true } })).map((d) => d.id) } },
      distinct: ["deviceId", "channel"],
      select: { deviceId: true, channel: true },
      orderBy: { ts: "desc" },
      take: 2000,
    }),
    searchDevicesAllApps().catch(() => []),
  ]);

  const liveByEui = new Map(msContent.map((d) => [d.devEUI.toUpperCase(), d]));

  const channelsByDevice = new Map<string, string[]>();
  for (const row of channelRows) {
    const arr = channelsByDevice.get(row.deviceId) ?? [];
    if (!arr.includes(row.channel)) arr.push(row.channel);
    channelsByDevice.set(row.deviceId, arr);
  }

  const devicesWithChannels = devices.map((d) => {
    const live = liveByEui.get(d.devEui.toUpperCase());
    return {
      ...d,
      online: live ? live.connectStatus === "ONLINE" : d.online,
      lastSeenAt: live?.lastUpdateTime ? new Date(live.lastUpdateTime) : d.lastSeenAt,
      channels: channelsByDevice.get(d.id) ?? [],
    };
  });

  return (
    <DevicesClient
      devices={JSON.parse(JSON.stringify(devicesWithChannels))}
      locale={session.user.locale ?? "en"}
      canManage={session.user.role !== "VIEWER"}
    />
  );
}
