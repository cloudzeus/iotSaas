import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const plan = await db.plan.update({ where: { id }, data: { isActive: body.isActive } });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: body.isActive ? "ACTIVATE_PLAN" : "DEACTIVATE_PLAN",
      entity: "Plan",
      entityId: id,
      ip: req.headers.get("x-forwarded-for") || null,
    },
  });
  return NextResponse.json(plan);
}
