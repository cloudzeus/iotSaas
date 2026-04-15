import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DevicesClient from "./DevicesClient";

export const metadata = { title: "Devices" };

export default async function DevicesPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;

  const [devices, channelRows] = await Promise.all([
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
  ]);

  const channelsByDevice = new Map<string, string[]>();
  for (const row of channelRows) {
    const arr = channelsByDevice.get(row.deviceId) ?? [];
    if (!arr.includes(row.channel)) arr.push(row.channel);
    channelsByDevice.set(row.deviceId, arr);
  }

  const devicesWithChannels = devices.map((d) => ({
    ...d,
    channels: channelsByDevice.get(d.id) ?? [],
  }));

  return (
    <DevicesClient
      devices={JSON.parse(JSON.stringify(devicesWithChannels))}
      locale={session.user.locale ?? "en"}
      canManage={session.user.role !== "VIEWER"}
    />
  );
}
