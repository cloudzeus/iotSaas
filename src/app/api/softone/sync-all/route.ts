import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { fullSyncSoftoneCustomers } from "@/lib/softone-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  console.log("[sync-all] handler hit");
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) {
    console.log("[sync-all] forbidden, role:", session?.user?.role);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  console.log("[sync-all] starting fullSyncSoftoneCustomers");
  try {
    const result = await fullSyncSoftoneCustomers();
    console.log("[sync-all] done:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[sync-all] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
