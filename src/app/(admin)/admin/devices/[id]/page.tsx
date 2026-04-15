import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { searchDevicesAllApps } from "@/lib/milesight-apps";
import DeviceDetailAdminClient from "./DeviceDetailAdminClient";

export const metadata = { title: "Device Detail" };

interface Params { params: Promise<{ id: string }> }

export default async function AdminDeviceDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [device, widgetTypes, channelsRaw, msContent] = await Promise.all([
    db.device.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true } } },
    }),
    db.widgetType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.telemetry.groupBy({
      by: ["channel", "unit"],
      where: { deviceId: id },
      _count: { _all: true },
      _max: { ts: true },
    }),
    searchDevicesAllApps().catch(() => []),
  ]);

  if (!device) notFound();

  const live = msContent.find(
    (d) => d.devEUI.toUpperCase() === device.devEui.toUpperCase()
  );

  const channels = channelsRaw.map((c) => ({
    channel: c.channel,
    unit: c.unit,
    count: c._count._all,
    lastTs: c._max.ts,
  }));

  const model = (device.model ?? "").toUpperCase();
  const compatible = widgetTypes.filter((w) => {
    if (w.appliesTo === "*" || !w.appliesTo.trim()) return true;
    const models = w.appliesTo.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean);
    return models.includes(model);
  });

  return (
    <DeviceDetailAdminClient
      device={JSON.parse(JSON.stringify(device))}
      live={live ?? null}
      channels={JSON.parse(JSON.stringify(channels))}
      compatible={JSON.parse(JSON.stringify(compatible))}
      locale={session.user.locale}
    />
  );
}
