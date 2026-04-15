import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import TenantsClient from "./TenantsClient";

export const metadata = { title: "SaaS Tenants" };

export default async function TenantsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [tenants, plans, msDevices] = await Promise.all([
    db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, afm: true, city: true, email: true } },
        plan:     { select: { name: true, pricePerDevice: true } },
        devices:  {
          select: { id: true, devEui: true, name: true, model: true, online: true, lastSeenAt: true, battery: true, locationId: true },
          orderBy: { name: "asc" },
        },
        users:    {
          select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true },
          orderBy: { createdAt: "asc" },
        },
        locations: {
          select: { id: true, name: true, isMain: true, latitude: true, longitude: true, city: true },
          orderBy: [{ isMain: "desc" }, { name: "asc" }],
        },
        _count: { select: { devices: true, users: true, dashboards: true, invoices: true, locations: true } },
      },
    }),
    db.plan.findMany({ where: { isActive: true }, orderBy: { pricePerDevice: "asc" }, select: { id: true, name: true } }),
    (await import("@/lib/milesight"))
      .searchDevices(1, 200)
      .then((r) => r.content)
      .catch(() => []),
  ]);

  // Collect devEUIs already assigned anywhere → build unassigned list
  const assignedEuis = new Set(
    (await db.device.findMany({ select: { devEui: true } })).map((d) => d.devEui.toUpperCase())
  );
  const unassignedMs = msDevices
    .filter((d) => !assignedEuis.has(d.devEUI.toUpperCase()))
    .map((d) => ({
      devEUI: d.devEUI,
      name: d.name,
      model: d.model,
      applicationId: d.application?.applicationId ?? null,
      connectStatus: d.connectStatus,
    }));

  // Merge live Milesight status into each tenant's devices (online/battery/lastSeen)
  const msByEui = new Map(msDevices.map((d) => [d.devEUI.toUpperCase(), d]));
  for (const tn of tenants) {
    for (const d of tn.devices) {
      const live = msByEui.get(d.devEui.toUpperCase());
      if (!live) continue;
      d.online = live.connectStatus === "ONLINE";
      if (typeof live.electricity === "number") d.battery = live.electricity;
      if (live.lastUpdateTime) d.lastSeenAt = new Date(live.lastUpdateTime);
    }
  }

  return (
    <TenantsClient
      tenants={JSON.parse(JSON.stringify(tenants))}
      plans={plans}
      unassignedDevices={unassignedMs}
      locale={session.user.locale}
    />
  );
}
