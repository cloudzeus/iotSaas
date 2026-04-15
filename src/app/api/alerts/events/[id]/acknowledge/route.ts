import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await db.alertEvent.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.alertEvent.update({ where: { id }, data: { acknowledged: true } });
  return NextResponse.json({ ok: true });
}
