// Super-admin view of a tenant's location-scoped Dashboard.
// Hierarchy: Tenant → Location → Dashboard → Sections (areas) → Widgets.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiAlertTriangle, FiMapPin } from "react-icons/fi";
import DashboardClient from "@/app/(app)/dashboard/DashboardClient";

export const metadata = { title: "Admin · Tenant Dashboard" };

interface Params { params: Promise<{ id: string }> }

export default async function AdminTenantDashboardPage({
  params,
  searchParams,
}: Params & { searchParams: Promise<{ loc?: string }> }) {
  const { id: tenantId } = await params;
  const { loc: locationIdParam } = await searchParams;

  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plan: true,
      customer: { select: { name: true } },
      locations: {
        orderBy: [{ isMain: "desc" }, { name: "asc" }],
        select: { id: true, name: true, isMain: true },
      },
    },
  });
  if (!tenant) notFound();

  // Determine which location's dashboard to show
  const activeLocationId = locationIdParam
    ?? tenant.locations.find((l) => l.isMain)?.id
    ?? tenant.locations[0]?.id
    ?? null;

  const t = session.user.locale === "el";

  if (!activeLocationId) {
    return (
      <div>
        <BackLink t={t} />
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <FiMapPin size={36} style={{ color: "var(--text-muted)", opacity: 0.4, margin: "0 auto 8px" }} />
          <div style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>
            {t ? "Δεν υπάρχουν τοποθεσίες" : "No locations yet"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
            {t
              ? "Δημιουργήστε πρώτα μία τοποθεσία — κάθε Dashboard ανήκει σε μία τοποθεσία."
              : "Create a location first — every dashboard belongs to a location."}
          </div>
          <Link href={`/admin/tenants/${tenantId}/locations`} className="btn-primary" style={{ padding: "8px 14px" }}>
            {t ? "Νέα Τοποθεσία" : "New Location"}
          </Link>
        </div>
      </div>
    );
  }

  const [devices, dashboards, activeAlertCount] = await Promise.all([
    prisma.device.findMany({
      where: { tenantId, locationId: activeLocationId },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, online: true, lastSeenAt: true,
        battery: true, signal: true, model: true, latitude: true, longitude: true,
      },
    }),
    prisma.dashboard.findMany({
      where: { tenantId, locationId: activeLocationId },
      orderBy: { createdAt: "asc" },
      include: { widgets: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.alertEvent.count({
      where: { acknowledged: false, alertRule: { device: { tenantId, locationId: activeLocationId } } },
    }),
  ]);

  // Ensure the location has at least one dashboard
  let activeDashboards = dashboards;
  if (dashboards.length === 0) {
    const created = await prisma.dashboard.create({
      data: {
        tenantId,
        locationId: activeLocationId,
        name: tenant.locations.find((l) => l.id === activeLocationId)?.name ?? "Dashboard",
        layout: {
          cols: 12,
          rowHeight: 60,
          sections: [{ id: crypto.randomUUID(), name: "Overview", order: 0, cols: 12 }],
        },
      },
      include: { widgets: true },
    });
    activeDashboards = [created];
  }

  const channelRows = await prisma.telemetry.findMany({
    where: { deviceId: { in: devices.map((d) => d.id) } },
    distinct: ["deviceId", "channel"],
    select: { deviceId: true, channel: true },
    orderBy: { ts: "desc" },
    take: Math.max(1, devices.length * 50),
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

  const onlineCount = devices.filter((d) => d.online).length;
  const estimatedBill = devices.length * Number(tenant.plan?.pricePerDevice ?? 0);

  return (
    <div>
      <BackLink t={t} />

      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 12, padding: "10px 14px",
        background: "rgba(255,102,0,0.08)", border: "1px solid var(--orange)",
        borderRadius: "var(--radius)",
      }}>
        <FiAlertTriangle size={16} style={{ color: "var(--orange)" }} />
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--orange)" }}>
            {t ? "Admin προβολή" : "Admin view"} — {tenant.customer.name}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {t ? "Οι αλλαγές αποθηκεύονται στο dashboard του πελάτη." : "Changes persist to the tenant's real dashboard."}
          </div>
        </div>
      </div>

      <DashboardClient
        dashboards={JSON.parse(JSON.stringify(activeDashboards))}
        devices={JSON.parse(JSON.stringify(devicesWithChannels))}
        stats={{
          totalDevices: devices.length,
          onlineDevices: onlineCount,
          activeAlerts: activeAlertCount,
          estimatedBill,
          planName: tenant.plan?.name ?? "",
          pricePerDevice: Number(tenant.plan?.pricePerDevice ?? 0),
        }}
        locale={session.user.locale ?? "en"}
        locations={tenant.locations}
        activeLocationId={activeLocationId}
        locationHrefBase={`/admin/tenants/${tenantId}/dashboard`}
      />
    </div>
  );
}

function BackLink({ t }: { t: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Link
        href="/admin/tenants"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.82rem", textDecoration: "none" }}
      >
        <FiArrowLeft size={14} /> {t ? "Πίσω" : "Back"}
      </Link>
    </div>
  );
}
