import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface Params { params: Promise<{ id: string }> }

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  config: z.record(z.unknown()).optional(),
  position: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional(),
});

async function getWidget(widgetId: string, tenantId: string) {
  return prisma.widget.findFirst({
    where: { id: widgetId, dashboard: { tenantId } },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const widget = await getWidget(id, session.user.tenantId);
  if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const currentConfig = widget.config as Record<string, unknown>;
  const updated = await prisma.widget.update({
    where: { id },
    data: {
      ...(parsed.data.title    ? { title: parsed.data.title }                           : {}),
      ...(parsed.data.config   ? { config: { ...currentConfig, ...parsed.data.config } } : {}),
      ...(parsed.data.position ? { position: parsed.data.position }                      : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const widget = await getWidget(id, session.user.tenantId);
  if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.widget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
