import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  syncSoftoneCustomers, syncSoftoneCountries, syncSoftoneTrdpGroups,
  syncSoftoneTrdBusinesses,
} from "@/lib/softone-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const forcedKind = req.nextUrl.searchParams.get("kind");

  const schedules = await db.syncSchedule.findMany({ where: { enabled: true } });
  const now = Date.now();
  const toRun = forcedKind
    ? schedules.filter((s) => s.kind === forcedKind)
    : schedules.filter((s) => {
        if (!s.lastRunAt) return true;
        const nextDue = s.lastRunAt.getTime() + s.intervalMin * 60_000;
        return now >= nextDue;
      });

  const results: Array<Record<string, unknown>> = [];

  for (const s of toRun) {
    try {
      let result;
      if (s.kind === "softone-customers") {
        result = await syncSoftoneCustomers(Math.max(s.intervalMin * 2, 10), "cron");
      } else if (s.kind === "softone-countries") {
        result = await syncSoftoneCountries("cron");
      } else if (s.kind === "softone-trdpgroups") {
        result = await syncSoftoneTrdpGroups("cron");
      } else if (s.kind === "softone-trdbusinesses") {
        result = await syncSoftoneTrdBusinesses("cron");
      } else {
        continue;
      }
      await db.syncSchedule.update({
        where: { id: s.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: new Date(Date.now() + s.intervalMin * 60_000),
        },
      });
      results.push({ kind: s.kind, ok: true, ...result });
    } catch (err) {
      results.push({
        kind: s.kind,
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({ ran: results.length, total: schedules.length, results });
}

export const GET = POST;
