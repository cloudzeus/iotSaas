"use server";

import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

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

export type UserRoleCode = "SUPER_ADMIN" | "ADMIN" | "CUSTOMER" | "OPERATOR" | "VIEWER";

export interface CreateUserInput {
  email: string;
  name: string;
  role: UserRoleCode;
  tenantId?: string | null;   // null for platform staff (SUPER_ADMIN/ADMIN)
  receiveAlerts?: boolean;
  password?: string;
}

export interface CreateUserResult {
  id: string;
  email: string;
  tempPassword: string;
}

export async function createUserAction(input: CreateUserInput): Promise<CreateUserResult> {
  const session = await requireAdmin();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) throw new Error("Email and name are required");

  if ((input.role === "SUPER_ADMIN" || input.role === "ADMIN") && session.user.role !== "SUPER_ADMIN") {
    throw new Error("Only SUPER_ADMIN may create platform staff");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("Ο χρήστης υπάρχει ήδη");

  const pwd = input.password?.trim() || generatePassword();
  const passwordHash = await bcrypt.hash(pwd, 12);

  const user = await db.user.create({
    data: {
      email, name, passwordHash,
      role: input.role,
      tenantId: input.tenantId ?? null,
      locale: "el",
      theme: "dark",
      isActive: true,
      receiveAlerts: !!input.receiveAlerts,
    },
  });

  revalidatePath("/admin/users");
  return { id: user.id, email, tempPassword: pwd };
}

export interface UpdateUserInput {
  userId: string;
  name?: string;
  role?: UserRoleCode;
  tenantId?: string | null;
  isActive?: boolean;
  receiveAlerts?: boolean;
}

export async function updateUserAction(input: UpdateUserInput): Promise<void> {
  const session = await requireAdmin();

  // Guard role escalations: only SUPER_ADMIN may set SUPER_ADMIN/ADMIN
  if (input.role && (input.role === "SUPER_ADMIN" || input.role === "ADMIN")
      && session.user.role !== "SUPER_ADMIN") {
    throw new Error("Only SUPER_ADMIN may assign platform roles");
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.role !== undefined) data.role = input.role;
  if (input.tenantId !== undefined) data.tenantId = input.tenantId;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.receiveAlerts !== undefined) data.receiveAlerts = input.receiveAlerts;

  await db.user.update({ where: { id: input.userId }, data });
  revalidatePath("/admin/users");
}

export async function resetUserPasswordAction(userId: string): Promise<{ tempPassword: string }> {
  await requireAdmin();
  const pwd = generatePassword();
  const passwordHash = await bcrypt.hash(pwd, 12);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/admin/users");
  return { tempPassword: pwd };
}

export async function deleteUserAction(userId: string): Promise<void> {
  const session = await requireAdmin();
  if (userId === session.user.id) throw new Error("Δεν μπορείτε να διαγράψετε τον εαυτό σας");
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}
