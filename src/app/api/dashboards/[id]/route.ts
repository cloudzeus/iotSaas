import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface Params { params: Promise<{ id: string }> }

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  layout: z
    .object({
      cols:      z.number().optional(),
      rowHeight: z.number().optional(),
      sections:  z
        .array(
          z.object({
            id:        z.string(),
            name:      z.string(),
            order:     z.number(),
            collapsed: z.boolean().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  isDefault: z.boolean().optional(),
});

function dashboardWhere(id: string, session: { user: { role: string; tenantId: string | null } }) {
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

  const dashboard = await prisma.dashboard.findFirst({
    where: dashboardWhere(id, session),
    include: { widgets: { orderBy: { createdAt: "asc" } } },
  });
  if (!dashboard)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dashboard);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role) && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dashboard = await prisma.dashboard.findFirst({
    where: dashboardWhere(id, session),
  });
  if (!dashboard)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const currentLayout = dashboard.layout as Record<string, unknown>;
  const newLayout = parsed.data.layout
    ? { ...currentLayout, ...parsed.data.layout }
    : currentLayout;

  const updated = await prisma.dashboard.update({
    where: { id },
    data: {
      ...(parsed.data.name      ? { name: parsed.data.name }           : {}),
      ...(parsed.data.isDefault !== undefined ? { isDefault: parsed.data.isDefault } : {}),
      layout: newLayout,
    },
    include: { widgets: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role) && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dashboard = await prisma.dashboard.findFirst({
    where: dashboardWhere(id, session),
  });
  if (!dashboard)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dashboard.isDefault)
    return NextResponse.json({ error: "Cannot delete default dashboard" }, { status: 400 });

  await prisma.dashboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
