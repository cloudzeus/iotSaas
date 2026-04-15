import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up", ts: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "down", error: err instanceof Error ? err.message : "unknown" },
      { status: 503 }
    );
  }
}
