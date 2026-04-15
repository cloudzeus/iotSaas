import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/alerts/[id]/acknowledge
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;

  // Verify the alert event belongs to this tenant
  const event = await prisma.alertEvent.findFirst({
    where: {
      id,
      alertRule: {
        device: { tenantId },
      },
    },
  });

  if (!event)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.alertEvent.update({
    where: { id },
    data: { acknowledged: true, acknowledgedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
