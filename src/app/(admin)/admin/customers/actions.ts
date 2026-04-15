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

function slugify(s: string) {
  return s
    .toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `tenant-${Date.now()}`;
}

export interface CustomerUpdateInput {
  id: number;
  name?: string;
  code?: string | null;
  afm?: string | null;
  sotitle?: string | null;
  irsdata?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  district?: string | null;
  area?: string | null;
  country?: number | null;
  phone01?: string | null;
  phone02?: string | null;
  email?: string | null;
  emailacc?: string | null;
  webpage?: string | null;
  gemiCode?: string | null;
  numberOfEmployees?: number | null;
  consent?: boolean;
  remark?: string | null;
  isprosp?: number;
}

export async function updateCustomerAction(input: CustomerUpdateInput): Promise<void> {
  await requireAdmin();
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "id") continue;
    if (v === undefined) continue;
    data[k] = typeof v === "string" ? v.trim() || null : v;
  }
  if (data.name === null || data.name === "") throw new Error("Το όνομα είναι υποχρεωτικό");

  await db.customer.update({ where: { id: input.id }, data });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${input.id}`);
}

export async function promoteToTenantAction(input: {
  customerId: number;
  planId?: string;
  billingEmail?: string;
}): Promise<{ id: string }> {
  const session = await requireAdmin();
  const customer = await db.customer.findUnique({
    where: { id: input.customerId },
    include: { tenant: true },
  });
  if (!customer) throw new Error("Customer not found");
  if (customer.tenant) throw new Error("Customer already has a tenant");

  const baseSlug = slugify(customer.name);
  let slug = baseSlug, n = 1;
  while (await db.tenant.findUnique({ where: { slug } })) slug = `${baseSlug}-${++n}`;

  const tenant = await db.tenant.create({
    data: {
      customerId: customer.id,
      name: customer.name,
      slug,
      planId: input.planId ?? null,
      billingEmail: input.billingEmail?.trim() || customer.email || null,
      isActive: true,
    },
  });

  // Auto-create main Location from the customer's AADE address.
  // Geocode in the background — if it fails, we still save the location.
  if (customer.address || customer.city || customer.zip) {
    let latitude: number | null = customer.latitude ?? null;
    let longitude: number | null = customer.longitude ?? null;
    if (latitude == null || longitude == null) {
      const geo = await geocodeAddress({
        address: customer.address,
        city: customer.city,
        zip: customer.zip,
        country: "Greece",
      }).catch(() => null);
      if (geo) { latitude = geo.lat; longitude = geo.lng; }
    }
    const mainLoc = await db.location.create({
      data: {
        tenantId: tenant.id,
        name: "Έδρα",
        address: customer.address,
        city: customer.city,
        zip: customer.zip,
        country: "Greece",
        latitude, longitude,
        isMain: true,
      },
    });
    // Auto-provision a default Dashboard attached to the main Location
    await db.dashboard.create({
      data: {
        tenantId: tenant.id,
        locationId: mainLoc.id,
        name: mainLoc.name,
        isDefault: true,
        layout: {
          cols: 12,
          rowHeight: 60,
          sections: [{ id: crypto.randomUUID(), name: "Overview", order: 0, cols: 12 }],
        },
      },
    });
  }

  // Guard: session JWT may outlive the user row (e.g. after a DB reset)
  const userExists = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  await db.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: userExists ? session.user.id : null,
      action: "CREATE_TENANT",
      entity: "Tenant",
      entityId: tenant.id,
      meta: { customerId: customer.id, planId: input.planId ?? null },
    },
  });

  revalidatePath("/admin/customers");
  revalidatePath("/admin/tenants");
  return { id: tenant.id };
}
