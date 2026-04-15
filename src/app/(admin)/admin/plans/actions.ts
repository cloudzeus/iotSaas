"use server";

import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface PlanInput {
  id?: string;
  name: string;
  slug: string;
  pricePerDevice: number;
  maxDevices: number | null;
  maxAlertsPerDevice: number | null;
  features: string[];
  isActive: boolean;
}

async function requireAdmin() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) throw new Error("Forbidden");
  return session;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function savePlanAction(input: PlanInput): Promise<{ id: string }> {
  const session = await requireAdmin();
  const name = input.name.trim();
  if (!name) throw new Error("Το όνομα είναι υποχρεωτικό");
  const slug = (input.slug || slugify(name)).slice(0, 50);
  if (!(input.pricePerDevice >= 0)) throw new Error("Μη έγκυρη τιμή");

  const data = {
    name,
    slug,
    pricePerDevice: input.pricePerDevice,
    maxDevices: input.maxDevices,
    maxAlertsPerDevice: input.maxAlertsPerDevice,
    features: input.features.filter((f) => f.trim().length > 0),
    isActive: input.isActive,
  };

  const plan = input.id
    ? await db.plan.update({ where: { id: input.id }, data })
    : await db.plan.create({ data });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: input.id ? "UPDATE_PLAN" : "CREATE_PLAN",
      entity: "Plan",
      entityId: plan.id,
    },
  });

  revalidatePath("/admin/plans");
  return { id: plan.id };
}

export async function togglePlanAction(id: string, isActive: boolean): Promise<void> {
  const session = await requireAdmin();
  await db.plan.update({ where: { id }, data: { isActive } });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: isActive ? "ACTIVATE_PLAN" : "DEACTIVATE_PLAN",
      entity: "Plan",
      entityId: id,
    },
  });
  revalidatePath("/admin/plans");
}

export async function deletePlanAction(id: string): Promise<void> {
  const session = await requireAdmin();
  const inUse = await db.tenant.count({ where: { planId: id } });
  if (inUse > 0) throw new Error(`Το πλάνο χρησιμοποιείται από ${inUse} πελάτη/ες`);
  await db.plan.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE_PLAN",
      entity: "Plan",
      entityId: id,
    },
  });
  revalidatePath("/admin/plans");
}
