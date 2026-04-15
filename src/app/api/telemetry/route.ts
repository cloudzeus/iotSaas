import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/telemetry?deviceId=&channel=&from=&to=&limit=500
 * Time-series data for charts.
 *
 * GET /api/telemetry?deviceId=&channels=temp,humidity&latest=true
 * Latest value per channel for gauges / stat cards.
 * Returns array of { ts, channel, value, unit }
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = isAdmin(session.user.role);
  if (!admin && !session.user.tenantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const deviceId = searchParams.get("deviceId");
  const channel  = searchParams.get("channel");
  const channels = searchParams.get("channels")?.split(",").filter(Boolean);
  const latest   = searchParams.get("latest") === "true";
  const from     = searchParams.get("from");
  const to       = searchParams.get("to");
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "500", 10), 5000);

  if (!deviceId)
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  // Scope check — tenant users restricted to their own tenant; admins see any
  const deviceWhere: Record<string, unknown> = { id: deviceId };
  if (!admin) deviceWhere.tenantId = session.user.tenantId;
  const device = await prisma.device.findFirst({
    where: deviceWhere,
    select: { id: true },
  });
  if (!device)
    return NextResponse.json({ error: "Device not found" }, { status: 404 });

  if (latest) {
    const targetChannels = channels ?? (channel ? [channel] : null);
    const where: Record<string, unknown> = { deviceId };
    if (targetChannels) where.channel = { in: targetChannels };

    // Fetch most-recent row per channel
    const latestTs = await prisma.telemetry.groupBy({
      by: ["channel"],
      where,
      _max: { ts: true },
    });

    const results = await Promise.all(
      latestTs.map((g) =>
        prisma.telemetry.findFirst({
          where: { deviceId, channel: g.channel, ts: g._max.ts! },
          select: { ts: true, channel: true, value: true, unit: true },
          orderBy: { ts: "desc" },
        })
      )
    );

    return NextResponse.json(
      results
        .filter(Boolean)
        .map((r) => ({
          ts:      new Date(r!.ts).getTime(),
          channel: r!.channel,
          value:   isNaN(Number(r!.value)) ? r!.value : Number(r!.value),
          unit:    r!.unit,
        }))
    );
  }

  // Time-series
  const tsFrom = from ? new Date(Number(from)) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tsTo   = to   ? new Date(Number(to))   : new Date();

  const data = await prisma.telemetry.findMany({
    where: {
      deviceId,
      ...(channel   ? { channel }                  : {}),
      ...(channels  ? { channel: { in: channels } } : {}),
      ts: { gte: tsFrom, lte: tsTo },
    },
    orderBy: { ts: "asc" },
    take: limit,
    select: { ts: true, channel: true, value: true, unit: true },
  });

  return NextResponse.json(
    data.map((r) => ({
      ts:      new Date(r.ts).getTime(),
      channel: r.channel,
      value:   isNaN(Number(r.value)) ? r.value : Number(r.value),
      unit:    r.unit,
    }))
  );
}
