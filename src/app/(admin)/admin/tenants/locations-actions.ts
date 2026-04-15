"use server";

import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) throw new Error("Forbidden");
  return session;
}

export interface LocationInput {
  id?: string;
  tenantId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isMain?: boolean;
  notes?: string | null;
}

export async function saveLocationAction(input: LocationInput): Promise<{ id: string }> {
  await requireAdmin();
  if (!input.name.trim()) throw new Error("Το όνομα είναι υποχρεωτικό");

  // If lat/lng missing, geocode from address fields
  let { latitude, longitude } = input;
  if (latitude == null || longitude == null) {
    const geo = await geocodeAddress({
      address: input.address, city: input.city, zip: input.zip, country: input.country,
    });
    if (geo) { latitude = geo.lat; longitude = geo.lng; }
  }

  const data = {
    tenantId: input.tenantId,
    name: input.name.trim(),
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    zip: input.zip?.trim() || null,
    country: input.country?.trim() || "Greece",
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    isMain: !!input.isMain,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const existing = await db.location.findUnique({ where: { id: input.id } });
    if (!existing || existing.tenantId !== input.tenantId) throw new Error("Not found");
    await db.location.update({ where: { id: input.id }, data });
    if (data.isMain) await demoteOthers(input.tenantId, input.id);
    revalidatePath(`/admin/tenants/${input.tenantId}/locations`);
    return { id: input.id };
  }

  // On create: if this is the very first location, auto-mark main.
  const count = await db.location.count({ where: { tenantId: input.tenantId } });
  if (count === 0) data.isMain = true;

  const created = await db.location.create({ data });
  if (data.isMain) await demoteOthers(input.tenantId, created.id);

  // Auto-provision a Dashboard for this location
  await db.dashboard.create({
    data: {
      tenantId: input.tenantId,
      locationId: created.id,
      name: created.name,
      isDefault: data.isMain,
      layout: {
        cols: 12,
        rowHeight: 60,
        sections: [{ id: crypto.randomUUID(), name: "Overview", order: 0, cols: 12 }],
      },
    },
  });

  revalidatePath(`/admin/tenants/${input.tenantId}/locations`);
  revalidatePath(`/admin/tenants/${input.tenantId}/dashboard`);
  return { id: created.id };
}

async function demoteOthers(tenantId: string, keepId: string) {
  await db.location.updateMany({
    where: { tenantId, isMain: true, NOT: { id: keepId } },
    data: { isMain: false },
  });
}

export async function deleteLocationAction(id: string): Promise<void> {
  await requireAdmin();
  const loc = await db.location.findUnique({ where: { id } });
  if (!loc) return;
  await db.location.delete({ where: { id } });
  revalidatePath(`/admin/tenants/${loc.tenantId}/locations`);
}

export async function setMainLocationAction(id: string): Promise<void> {
  await requireAdmin();
  const loc = await db.location.findUnique({ where: { id } });
  if (!loc) throw new Error("Not found");
  await db.location.updateMany({
    where: { tenantId: loc.tenantId },
    data: { isMain: false },
  });
  await db.location.update({ where: { id }, data: { isMain: true } });
  revalidatePath(`/admin/tenants/${loc.tenantId}/locations`);
}
