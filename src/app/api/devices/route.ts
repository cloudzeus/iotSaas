import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ── Schema ────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(255),
  devEui: z
    .string()
    .regex(/^[0-9A-Fa-f]{16}$/, "DevEUI must be 16 hex characters"),
  appKey: z
    .string()
    .regex(/^[0-9A-Fa-f]{32}$/, "AppKey must be 32 hex characters")
    .optional(),
  model: z.string().max(64).optional(),
  description: z.string().max(1000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  location: z.string().max(500).optional(),
  applicationId: z.string().optional(),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length > 0) where.id = { in: ids };
  }

  const devices = await prisma.device.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(devices);
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const {
    name,
    devEui,
    appKey,
    model,
    description,
    latitude,
    longitude,
    location,
    applicationId,
  } = parsed.data;

  const tenantId = session.user.tenantId;

  // Check for duplicate DevEUI within tenant
  const duplicate = await prisma.device.findFirst({
    where: { tenantId, devEui: devEui.toUpperCase() },
  });
  if (duplicate)
    return NextResponse.json(
      { error: `A device with DevEUI ${devEui.toUpperCase()} already exists in your account` },
      { status: 409 }
    );

  // Check tenant device limit from plan
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });
  if (tenant?.plan?.maxDevices !== null && tenant?.plan?.maxDevices !== undefined) {
    const count = await prisma.device.count({ where: { tenantId } });
    if (count >= tenant.plan.maxDevices) {
      return NextResponse.json(
        { error: `Device limit (${tenant.plan.maxDevices}) reached for your plan. Please upgrade.` },
        { status: 402 }
      );
    }
  }

  // Register the device
  const device = await prisma.device.create({
    data: {
      tenantId,
      name,
      devEui: devEui.toUpperCase(),
      appKey: appKey?.toUpperCase() ?? null,
      model: model ?? null,
      description: description ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      location: location ?? null,
      applicationId: applicationId ?? null,
      online: false,
      billedFrom: new Date(),
    },
  });

  // Audit trail
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: session.user.id,
      action: "CREATE_DEVICE",
      entity: "Device",
      entityId: device.id,
      meta: { name, devEui: device.devEui, model },
      ip: req.headers.get("x-forwarded-for") ?? null,
    },
  });

  return NextResponse.json(device, { status: 201 });
}
