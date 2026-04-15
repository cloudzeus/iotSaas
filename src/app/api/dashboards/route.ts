import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  tenantId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = isAdmin(session.user.role);
  // Admins may pass ?tenantId= to scope, otherwise see all
  const url = new URL(req.url);
  const tenantParam = url.searchParams.get("tenantId");
  const tenantId = admin ? (tenantParam ?? undefined) : session.user.tenantId;
  if (!admin && !tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dashboards = await prisma.dashboard.findMany({
    where: tenantId ? { tenantId } : {},
    include: { widgets: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(dashboards);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = isAdmin(session.user.role);
  if (!admin && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tenantId = admin ? (parsed.data.tenantId ?? session.user.tenantId) : session.user.tenantId;
  if (!tenantId)
    return NextResponse.json({ error: "tenantId required for admin create" }, { status: 400 });

  const dashboard = await prisma.dashboard.create({
    data: {
      tenantId,
      name: parsed.data.name,
      isDefault: false,
      layout: {
        cols: 12,
        rowHeight: 60,
        sections: [{ id: crypto.randomUUID(), name: "Overview", order: 0 }],
      },
    },
    include: { widgets: true },
  });
  return NextResponse.json(dashboard, { status: 201 });
}
