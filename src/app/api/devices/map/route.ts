import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/devices/map?ids=id1,id2
// Returns device pins with coordinates for the map widget.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = isAdmin(session.user.role);
  if (!admin && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");

  const where: Record<string, unknown> = {};
  if (!admin) where.tenantId = session.user.tenantId;
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length > 0) where.id = { in: ids };
  }

  const devices = await prisma.device.findMany({
    where,
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      online: true,
      lastSeenAt: true,
      battery: true,
      signal: true,
    },
  });

  const pins = devices
    .filter((d) => d.latitude !== null && d.longitude !== null)
    .map((d) => ({
      id: d.id,
      name: d.name,
      lat: d.latitude!,
      lng: d.longitude!,
      online: d.online,
      lastSeen: d.lastSeenAt
        ? new Date(d.lastSeenAt).toLocaleString("en-GB")
        : null,
      battery: d.battery ?? undefined,
      signal: d.signal ?? undefined,
    }));

  return NextResponse.json(pins);
}
