"use server";

import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) throw new Error("Forbidden");
  return session;
}

export const SYNC_KINDS = [
  { kind: "softone-customers", label: "SoftOne · Customers (incremental)", defaultInterval: 5 },
  { kind: "softone-countries", label: "SoftOne · Countries",               defaultInterval: 720 },
] as const;

export async function seedSchedulesAction(): Promise<void> {
  await requireAdmin();
  for (const k of SYNC_KINDS) {
    await db.syncSchedule.upsert({
      where: { kind: k.kind },
      update: {},
      create: { kind: k.kind, label: k.label, intervalMin: k.defaultInterval, enabled: true },
    });
  }
  revalidatePath("/admin/settings");
}

export async function updateScheduleAction(input: {
  kind: string;
  intervalMin?: number;
  enabled?: boolean;
}): Promise<void> {
  await requireAdmin();
  const data: Record<string, unknown> = {};
  if (input.intervalMin !== undefined) {
    data.intervalMin = Math.max(1, Math.min(1440, Math.round(input.intervalMin)));
  }
  if (input.enabled !== undefined) data.enabled = input.enabled;
  await db.syncSchedule.update({ where: { kind: input.kind }, data });
  revalidatePath("/admin/settings");
}
