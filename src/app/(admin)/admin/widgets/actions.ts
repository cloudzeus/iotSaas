"use server";

import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) throw new Error("Forbidden");
  return session;
}

export interface WidgetTypeInput {
  id?: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  appliesTo: string;
  isActive: boolean;
}

export async function saveWidgetTypeAction(input: WidgetTypeInput): Promise<{ id: string }> {
  await requireAdmin();
  const code = input.code.trim().toLowerCase().replace(/\s+/g, "-");
  if (!code || !input.name.trim()) throw new Error("Code and name required");
  const data = {
    code,
    name: input.name.trim(),
    description: input.description.trim() || null,
    icon: input.icon.trim() || null,
    appliesTo: input.appliesTo.trim() || "*",
    isActive: input.isActive,
  };
  const row = input.id
    ? await db.widgetType.update({ where: { id: input.id }, data })
    : await db.widgetType.create({ data });
  revalidatePath("/admin/widgets");
  return { id: row.id };
}

export async function deleteWidgetTypeAction(id: string): Promise<void> {
  await requireAdmin();
  await db.widgetType.delete({ where: { id } });
  revalidatePath("/admin/widgets");
}

export async function toggleTenantWidgetAction(
  tenantId: string,
  widgetTypeId: string,
  enabled: boolean
): Promise<void> {
  await requireAdmin();
  if (enabled) {
    await db.tenantWidgetType.upsert({
      where: { tenantId_widgetTypeId: { tenantId, widgetTypeId } },
      update: {},
      create: { tenantId, widgetTypeId },
    });
  } else {
    await db.tenantWidgetType.deleteMany({ where: { tenantId, widgetTypeId } });
  }
  revalidatePath("/admin/widgets");
}
