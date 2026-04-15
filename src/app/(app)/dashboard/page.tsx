import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;

  // Fetch everything the dashboard needs in parallel
  const [tenant, devices, dashboards, activeAlertCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    }),
    prisma.device.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        online: true,
        lastSeenAt: true,
        battery: true,
        signal: true,
        model: true,
        latitude: true,
        longitude: true,
      },
    }),
    prisma.dashboard.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: {
        widgets: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.alertEvent.count({
      where: {
        acknowledged: false,
        alertRule: { device: { tenantId } },
      },
    }),
  ]);

  // Create a default dashboard if none exist yet
  let activeDashboards = dashboards;
  if (dashboards.length === 0) {
    const created = await prisma.dashboard.create({
      data: {
        tenantId,
        name: "My Dashboard",
        layout: {
          cols: 12,
          rowHeight: 60,
          sections: [
            { id: crypto.randomUUID(), name: "Overview", order: 0 },
          ],
        },
      },
      include: { widgets: true },
    });
    activeDashboards = [created];
  }

  // Fetch device channels (from latest telemetry)
  const channelRows = await prisma.telemetry.findMany({
    where: { deviceId: { in: devices.map((d) => d.id) } },
    distinct: ["deviceId", "channel"],
    select: { deviceId: true, channel: true },
    orderBy: { ts: "desc" },
    take: devices.length * 50,
  });

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

  // Stats for header
  const onlineCount = devices.filter((d) => d.online).length;
  const estimatedBill =
    devices.length * Number(tenant?.plan?.pricePerDevice ?? 0);

  return (
    <DashboardClient
      dashboards={JSON.parse(JSON.stringify(activeDashboards))}
      devices={JSON.parse(JSON.stringify(devicesWithChannels))}
      stats={{
        totalDevices: devices.length,
        onlineDevices: onlineCount,
        activeAlerts: activeAlertCount,
        estimatedBill,
        planName: tenant?.plan?.name ?? "",
        pricePerDevice: Number(tenant?.plan?.pricePerDevice ?? 0),
      }}
      locale={session.user.locale ?? "en"}
    />
  );
}
