import { NextRequest, NextResponse } from "next/server";
import { syncSoftoneCustomers } from "@/lib/softone-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // seconds

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Accept either Authorization: Bearer <secret> or ?secret=<secret>
  const header = req.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  const qs = req.nextUrl.searchParams.get("secret");
  if (qs === secret) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const windowMinutes = Number(req.nextUrl.searchParams.get("window") ?? "10");

  try {
    const result = await syncSoftoneCustomers(windowMinutes);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export const GET = POST; // Coolify cron often uses GET
