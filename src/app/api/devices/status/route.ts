import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/devices/status?ids=id1,id2
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  const tenantId = session.user.tenantId;

  const where: Record<string, unknown> = { tenantId };
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length > 0) where.id = { in: ids };
  }

  const devices = await prisma.device.findMany({
    where,
    select: {
      id: true,
      name: true,
      online: true,
      lastSeenAt: true,
      battery: true,
      signal: true,
      model: true,
    },
    orderBy: [{ online: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(devices);
}
