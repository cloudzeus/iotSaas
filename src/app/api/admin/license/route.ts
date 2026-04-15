import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    serial:  process.env.SOFTWARE_SERIAL         ?? null,
    vendor:  process.env.SOFTWARE_COMPANY_VENTOR ?? null,
    buyer:   process.env.SOFTWARE_COMPANY_BUYER  ?? null,
    appName: "DGSmart Hub",
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
