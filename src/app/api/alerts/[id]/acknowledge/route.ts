import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/alerts/[id]/acknowledge
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = isAdmin(session.user.role);
  if (!admin && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Tenant users restricted to events within their tenant; admins can ack any
  const where: Record<string, unknown> = { id };
  if (!admin) where.alertRule = { device: { tenantId: session.user.tenantId } };
  const event = await prisma.alertEvent.findFirst({ where });

  if (!event)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.alertEvent.update({
    where: { id },
    data: { acknowledged: true, acknowledgedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
