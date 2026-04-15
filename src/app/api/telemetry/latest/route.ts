import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/telemetry/latest?deviceIds=id1,id2&channels=temp,humidity
// Returns the latest reading per device+channel combination.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const deviceIdsParam = searchParams.get("deviceIds");
  const channelsParam = searchParams.get("channels");
  const tenantId = session.user.tenantId;

  // Resolve device IDs scoped to tenant
  const deviceWhere: Record<string, unknown> = { tenantId };
  if (deviceIdsParam) {
    const ids = deviceIdsParam.split(",").filter(Boolean);
    if (ids.length > 0) deviceWhere.id = { in: ids };
  }

  const devices = await prisma.device.findMany({
    where: deviceWhere,
    select: { id: true, name: true },
  });

  if (devices.length === 0) return NextResponse.json([]);

  const deviceIds = devices.map((d) => d.id);
  const deviceMap = new Map(devices.map((d) => [d.id, d.name]));

  const channelFilter = channelsParam
    ? channelsParam.split(",").filter(Boolean)
    : null;

  // For each device+channel, get the latest telemetry row.
  // Using raw query for efficiency (window function) or fallback per-device.
  const telemetryWhere: Record<string, unknown> = {
    deviceId: { in: deviceIds },
  };
  if (channelFilter && channelFilter.length > 0) {
    telemetryWhere.channel = { in: channelFilter };
  }

  // Fetch last 1000 rows and dedupe to latest per device+channel in JS
  const rows = await prisma.telemetry.findMany({
    where: telemetryWhere,
    orderBy: { ts: "desc" },
    take: 1000,
    select: {
      deviceId: true,
      channel: true,
      value: true,
      unit: true,
      ts: true,
    },
  });

  // Dedupe: keep first (latest) per deviceId+channel
  const seen = new Set<string>();
  const result: {
    deviceId: string;
    deviceName: string;
    channel: string;
    value: string | number;
    unit: string | null;
    ts: number;
  }[] = [];

  for (const row of rows) {
    const key = `${row.deviceId}:${row.channel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      deviceId: row.deviceId,
      deviceName: deviceMap.get(row.deviceId) ?? row.deviceId,
      channel: row.channel,
      value: isNaN(Number(row.value)) ? row.value : Number(row.value),
      unit: row.unit,
      ts: new Date(row.ts).getTime(),
    });
  }

  return NextResponse.json(result);
}
