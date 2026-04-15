import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface Params { params: Promise<{ id: string }> }

const widgetSchema = z.object({
  type: z.enum([
    "gauge", "stat-card", "line-chart", "area-chart", "bar-chart",
    "map", "device-grid", "telemetry-table", "alert-summary",
  ]),
  title: z.string().min(1).max(255),
  sectionId: z.string().optional(),
  config: z.record(z.unknown()).default({}),
  position: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    w: z.number().default(4),
    h: z.number().default(3),
  }),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dashboard = await prisma.dashboard.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!dashboard)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = widgetSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sectionId = parsed.data.sectionId ?? "default";
  const widget = await prisma.widget.create({
    data: {
      dashboardId: id,
      type:        parsed.data.type,
      title:       parsed.data.title,
      config:      { ...parsed.data.config, sectionId },
      position:    { ...parsed.data.position, sectionId },
    },
  });
  return NextResponse.json(widget, { status: 201 });
}
