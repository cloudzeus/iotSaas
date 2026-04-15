import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { peekSession } from "@/lib/softone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const s = peekSession();
  if (!s) return NextResponse.json({ connected: false });

  const now = Date.now();
  return NextResponse.json({
    connected: true,
    authenticatedAt: s.authenticatedAt,
    expiresAt: s.expiresAt,
    expiresInSec: Math.max(0, Math.floor((s.expiresAt - now) / 1000)),
    clientIdPreview: `${s.clientID.slice(0, 6)}…${s.clientID.slice(-4)}`,
  });
}
