"use server";

import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { sendUserInviteEmail } from "@/lib/email";

async function requireAdmin() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) throw new Error("Forbidden");
  return session;
}

function generatePassword(len = 12): string {
  const bytes = crypto.randomBytes(len);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}

export async function assignDeviceToTenantAction(input: {
  tenantId: string;
  devEui: string;
  name?: string;
  model?: string;
  applicationId?: string;
  locationId?: string | null;
}): Promise<void> {
  const session = await requireAdmin();
  const devEui = input.devEui.toUpperCase();

  // Default locationId to the tenant's main Location if not specified.
  let locationId = input.locationId ?? null;
  if (locationId === null) {
    const main = await db.location.findFirst({
      where: { tenantId: input.tenantId, isMain: true },
      select: { id: true },
    });
    locationId = main?.id ?? null;
  }

  const existing = await db.device.findFirst({ where: { devEui } });
  if (existing) {
    if (existing.tenantId === input.tenantId) return;
    await db.device.update({
      where: { id: existing.id },
      data: { tenantId: input.tenantId, locationId },
    });
  } else {
    await db.device.create({
      data: {
        devEui,
        tenantId: input.tenantId,
        name: input.name ?? devEui,
        model: input.model ?? null,
        applicationId: input.applicationId ?? null,
        locationId,
      },
    });
  }

  const userExists = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: userExists ? session.user.id : null,
      action: "ASSIGN_DEVICE",
      entity: "Device",
      entityId: devEui,
      meta: { devEui },
    },
  });
  revalidatePath("/admin/tenants");
  revalidatePath("/admin/devices");
}

export interface CreateTenantUserInput {
  tenantId: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "OPERATOR" | "VIEWER";
  password?: string;
  receiveAlerts?: boolean;
}

export interface CreateTenantUserResult {
  id: string;
  email: string;
  tempPassword: string;
}

export async function createTenantUserAction(
  input: CreateTenantUserInput
): Promise<CreateTenantUserResult> {
  const session = await requireAdmin();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) throw new Error("Email and name are required");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("Ο χρήστης υπάρχει ήδη");

  const pwd = input.password?.trim() || generatePassword();
  const passwordHash = await bcrypt.hash(pwd, 12);

  const user = await db.user.create({
    data: {
      email, name, passwordHash,
      role: input.role,
      tenantId: input.tenantId,
      locale: "el",
      theme: "dark",
      isActive: true,
      receiveAlerts: !!input.receiveAlerts,
    },
  });

  const userExists = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: userExists ? session.user.id : null,
      action: "CREATE_USER",
      entity: "User",
      entityId: user.id,
      meta: { email, role: input.role },
    },
  });

  // Fire-and-forget invite email (don't block the UI if Mailgun hiccups)
  const tenant = await db.tenant.findUnique({ where: { id: input.tenantId }, select: { name: true } });
  sendUserInviteEmail({
    to: email,
    name,
    tenantName: tenant?.name ?? "",
    tempPassword: pwd,
    locale: "el",
  }).catch((err) => console.error("[invite-email] failed:", err));

  revalidatePath("/admin/tenants");
  return { id: user.id, email, tempPassword: pwd };
}

export async function setTenantActiveAction(id: string, isActive: boolean) {
  await requireAdmin();
  await db.tenant.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/tenants");
}

// ─── Tenant user management ──────────────────────────────────────────────────

export async function updateTenantUserAction(input: {
  userId: string;
  name?: string;
  role?: "CUSTOMER" | "OPERATOR" | "VIEWER";
  isActive?: boolean;
  receiveAlerts?: boolean;
}): Promise<void> {
  await requireAdmin();
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.role !== undefined) data.role = input.role;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.receiveAlerts !== undefined) data.receiveAlerts = input.receiveAlerts;
  await db.user.update({ where: { id: input.userId }, data });
  revalidatePath("/admin/tenants");
}

export async function resetTenantUserPasswordAction(
  userId: string
): Promise<{ tempPassword: string }> {
  await requireAdmin();
  const pwd = generatePassword();
  const passwordHash = await bcrypt.hash(pwd, 12);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/admin/tenants");
  return { tempPassword: pwd };
}

export async function setDeviceLocationAction(input: {
  deviceId: string;
  locationId: string | null;
}): Promise<void> {
  await requireAdmin();
  const dev = await db.device.findUnique({ where: { id: input.deviceId }, select: { id: true, tenantId: true } });
  if (!dev) throw new Error("Device not found");
  if (input.locationId) {
    const loc = await db.location.findUnique({ where: { id: input.locationId }, select: { tenantId: true } });
    if (!loc || loc.tenantId !== dev.tenantId) throw new Error("Location does not belong to this tenant");
  }
  await db.device.update({
    where: { id: dev.id },
    data: { locationId: input.locationId },
  });
  revalidatePath("/admin/tenants");
  revalidatePath("/admin/devices");
}

export async function deleteTenantUserAction(userId: string): Promise<void> {
  const session = await requireAdmin();
  if (userId === session.user.id) throw new Error("Δεν μπορείτε να διαγράψετε τον εαυτό σας");
  // AuditLog.userId is optional → delete is safe
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin/tenants");
}
