import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/alerts?deviceIds=id1,id2&acknowledged=false&limit=20
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = isAdmin(session.user.role);
  if (!admin && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const deviceIdsParam = searchParams.get("deviceIds");
  const acknowledgedParam = searchParams.get("acknowledged");
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));

  // Resolve devices: tenant users locked to their tenant; admins see any
  const deviceWhere: Record<string, unknown> = {};
  if (!admin) deviceWhere.tenantId = session.user.tenantId;
  if (deviceIdsParam) {
    const ids = deviceIdsParam.split(",").filter(Boolean);
    if (ids.length > 0) deviceWhere.id = { in: ids };
  }
  const devices = await prisma.device.findMany({
    where: deviceWhere,
    select: { id: true, name: true },
  });
  if (devices.length === 0) return NextResponse.json([]);

  const deviceMap = new Map(devices.map((d) => [d.id, d.name]));
  const deviceIds = devices.map((d) => d.id);

  const evWhere: Record<string, unknown> = {
    alertRule: { deviceId: { in: deviceIds } },
  };
  if (acknowledgedParam === "false") evWhere.acknowledged = false;
  else if (acknowledgedParam === "true") evWhere.acknowledged = true;

  const events = await prisma.alertEvent.findMany({
    where: evWhere,
    orderBy: { firedAt: "desc" },
    take: limit,
    include: {
      alertRule: {
        select: { deviceId: true, channel: true, severity: true, message: true },
      },
    },
  });

  const result = events.map((e) => ({
    id: e.id,
    severity: e.alertRule.severity as "warning" | "critical" | "info",
    message: e.alertRule.message,
    deviceName: deviceMap.get(e.alertRule.deviceId) ?? e.alertRule.deviceId,
    channel: e.alertRule.channel,
    value: isNaN(Number(e.value)) ? e.value : Number(e.value),
    unit: e.unit,
    firedAt: e.firedAt.toISOString(),
    acknowledged: e.acknowledged,
  }));

  return NextResponse.json(result);
}
