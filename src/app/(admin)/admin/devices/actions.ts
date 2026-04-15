"use server";

import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { searchDevices, type MilesightDevice } from "@/lib/milesight";

async function requireAdmin() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) throw new Error("Forbidden");
  return session;
}

export interface DeviceListResult {
  unassigned: MilesightDevice[];
  assigned: Array<{
    devEui: string;
    name: string;
    model: string | null;
    online: boolean;
    lastSeenAt: Date | null;
    tenant: { id: string; name: string };
    milesight?: MilesightDevice;
  }>;
}

export async function listAllDevicesAction(): Promise<DeviceListResult> {
  await requireAdmin();
  const [ms, local] = await Promise.all([
    searchDevices(1, 200).catch(() => ({ content: [], total: 0, pageNumber: 1, pageSize: 200 })),
    db.device.findMany({
      include: { tenant: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const localByEui = new Map(local.map((d) => [d.devEui.toUpperCase(), d]));
  const msByEui = new Map(ms.content.map((d) => [d.devEUI.toUpperCase(), d]));

  const unassigned = ms.content.filter((d) => !localByEui.has(d.devEUI.toUpperCase()));
  const assigned = local.map((d) => ({
    devEui: d.devEui,
    name: d.name,
    model: d.model,
    online: d.online,
    lastSeenAt: d.lastSeenAt,
    tenant: d.tenant,
    milesight: msByEui.get(d.devEui.toUpperCase()),
  }));

  return { unassigned, assigned };
}

export async function assignDeviceAction(input: {
  devEui: string;
  tenantId: string;
  name?: string;
  model?: string;
  applicationId?: string;
}): Promise<void> {
  const session = await requireAdmin();
  const devEui = input.devEui.toUpperCase();

  const existing = await db.device.findFirst({ where: { devEui } });
  if (existing) {
    await db.device.update({
      where: { id: existing.id },
      data: { tenantId: input.tenantId },
    });
  } else {
    await db.device.create({
      data: {
        devEui,
        tenantId: input.tenantId,
        name: input.name ?? devEui,
        model: input.model ?? null,
        applicationId: input.applicationId ?? null,
      },
    });
  }

  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: session.user.id,
      action: "ASSIGN_DEVICE",
      entity: "Device",
      entityId: devEui,
      meta: { devEui, tenantId: input.tenantId },
    },
  });

  revalidatePath("/admin/devices");
}

export async function unassignDeviceAction(devEui: string): Promise<void> {
  const session = await requireAdmin();
  const dev = await db.device.findFirst({ where: { devEui: devEui.toUpperCase() } });
  if (!dev) return;
  await db.device.delete({ where: { id: dev.id } });
  await db.auditLog.create({
    data: {
      tenantId: dev.tenantId,
      userId: session.user.id,
      action: "UNASSIGN_DEVICE",
      entity: "Device",
      entityId: dev.id,
    },
  });
  revalidatePath("/admin/devices");
}
