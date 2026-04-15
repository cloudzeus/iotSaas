import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { reconcileMilesightDevices } from "@/lib/softone-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await reconcileMilesightDevices("manual");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reconcile failed" },
      { status: 500 }
    );
  }
}
