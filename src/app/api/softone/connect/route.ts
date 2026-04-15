import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { authenticate, clearSession } from "@/lib/softone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    clearSession();
    const s = await authenticate();
    return NextResponse.json({
      ok: true,
      authenticatedAt: s.authenticatedAt,
      expiresAt: s.expiresAt,
      expiresInSec: Math.floor((s.expiresAt - Date.now()) / 1000),
      clientIdPreview: `${s.clientID.slice(0, 6)}…${s.clientID.slice(-4)}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Connection failed" },
      { status: 502 }
    );
  }
}
