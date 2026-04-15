"use server";

import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { testApp, ensureDefaultAppFromEnv } from "@/lib/milesight-apps";

async function requireAdmin() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) throw new Error("Forbidden");
  return session;
}

export interface MilesightAppInput {
  id?: string;
  name: string;
  baseUrl: string;
  clientId: string;
  clientSecret?: string;  // optional on edit — empty keeps existing
  uuid?: string | null;
  webhookSecret?: string | null;
  isActive: boolean;
}

export async function saveMilesightAppAction(input: MilesightAppInput): Promise<{ id: string }> {
  await requireAdmin();
  const name = input.name.trim();
  const clientId = input.clientId.trim();
  if (!name || !clientId) throw new Error("Name and Client ID are required");

  if (input.id) {
    const data: Record<string, unknown> = {
      name,
      baseUrl: input.baseUrl.trim() || "https://eu-openapi.milesight.com",
      clientId,
      uuid: input.uuid?.trim() || null,
      webhookSecret: input.webhookSecret?.trim() || null,
      isActive: input.isActive,
    };
    if (input.clientSecret?.trim()) data.clientSecret = input.clientSecret.trim();
    await db.milesightApp.update({ where: { id: input.id }, data });
    revalidatePath("/admin/milesight");
    return { id: input.id };
  }

  if (!input.clientSecret?.trim()) throw new Error("Client Secret is required");
  const app = await db.milesightApp.create({
    data: {
      name,
      baseUrl: input.baseUrl.trim() || "https://eu-openapi.milesight.com",
      clientId,
      clientSecret: input.clientSecret.trim(),
      uuid: input.uuid?.trim() || null,
      webhookSecret: input.webhookSecret?.trim() || null,
      isActive: input.isActive,
    },
  });
  revalidatePath("/admin/milesight");
  return { id: app.id };
}

export async function deleteMilesightAppAction(id: string): Promise<void> {
  await requireAdmin();
  await db.milesightApp.delete({ where: { id } });
  revalidatePath("/admin/milesight");
}

export async function testMilesightAppAction(id: string) {
  await requireAdmin();
  const app = await db.milesightApp.findUnique({ where: { id } });
  if (!app) return { ok: false, tokenOk: false, error: "App not found" };
  return testApp(app);
}

export async function seedFromEnvAction(): Promise<{ created: boolean }> {
  await requireAdmin();
  const app = await ensureDefaultAppFromEnv();
  revalidatePath("/admin/milesight");
  return { created: !!app };
}
