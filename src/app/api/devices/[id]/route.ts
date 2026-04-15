import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  location: z.string().max(500).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

interface Params { params: Promise<{ id: string }> }

function deviceWhere(id: string, session: { user: { role: string; tenantId: string | null } }) {
  const where: Record<string, unknown> = { id };
  if (!isAdmin(session.user.role)) where.tenantId = session.user.tenantId;
  return where;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role) && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const device = await db.device.findFirst({ where: deviceWhere(id, session) });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(device);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role) && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const device = await db.device.findFirst({ where: deviceWhere(id, session) });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await db.device.update({ where: { id }, data: parsed.data });

  // Audit log: tenantId is required by the schema, so only log when we have one.
  if (device.tenantId) {
    await db.auditLog.create({
      data: {
        tenantId: device.tenantId,
        userId: session.user.id ?? null,
        action: "UPDATE_DEVICE",
        entity: "Device",
        entityId: id,
        meta: parsed.data,
        ip: req.headers.get("x-forwarded-for") || null,
      },
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role) && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "CUSTOMER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const device = await db.device.findFirst({ where: deviceWhere(id, session) });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.device.delete({ where: { id } });

  if (device.tenantId) {
    await db.auditLog.create({
      data: {
        tenantId: device.tenantId,
        userId: session.user.id ?? null,
        action: "DELETE_DEVICE",
        entity: "Device",
        entityId: id,
        ip: req.headers.get("x-forwarded-for") || null,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
