import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/utils";

const createSchema = z.object({
  name:         z.string().min(1).max(255),
  billingEmail: z.string().email(),
  planId:       z.string().min(1),
  vatNumber:    z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !isAdmin(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { plan: true, _count: { select: { devices: true, users: true } } },
  });
  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !isAdmin(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, billingEmail, planId, vatNumber } = parsed.data;
  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug:         slugify(name) + "-" + Date.now().toString(36),
      billingEmail,
      planId,
      vatNumber:    vatNumber ?? null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "CREATE_TENANT",
      entity:   "Tenant",
      entityId: tenant.id,
      meta:     { name, billingEmail, planId },
      ip:       req.headers.get("x-forwarded-for") ?? null,
    },
  });
  return NextResponse.json(tenant, { status: 201 });
}
