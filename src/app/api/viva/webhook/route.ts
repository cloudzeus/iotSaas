import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Viva sends GET for webhook verification
  return NextResponse.json({ Key: process.env.VIVA_WEBHOOK_KEY ?? "" });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const eventType = body.EventTypeId as number;
  const orderCode = body.OrderCode   as string;
  const statusId  = body.StatusId    as string;

  // Event 1796 = transaction completed
  if (eventType === 1796 && statusId === "F" && orderCode) {
    const invoice = await prisma.invoice.findFirst({
      where: { vivaOrderCode: String(orderCode) },
    });
    if (invoice) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data:  { status: "PAID", paidAt: new Date() },
      });
      await prisma.auditLog.create({
        data: {
          tenantId: invoice.tenantId,
          action:   "INVOICE_PAID",
          entity:   "Invoice",
          entityId: invoice.id,
          meta:     { orderCode, amount: invoice.total },
        },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
