import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Viva Wallet Native Checkout v2
 * POST /api/billing/checkout
 * body: { invoiceId: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoiceId } = await req.json();
  if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId: session.user.tenantId, status: { in: ["PENDING", "OVERDUE"] } },
    include: { tenant: true },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Step 1: Get Viva Wallet OAuth token
  const vivaMerchantId = process.env.VIVA_MERCHANT_ID;
  const vivaApiKey = process.env.VIVA_API_KEY;
  const vivaClientId = process.env.VIVA_CLIENT_ID;
  const vivaClientSecret = process.env.VIVA_CLIENT_SECRET;
  const vivaSourceCode = process.env.VIVA_SOURCE_CODE;

  if (!vivaMerchantId || !vivaClientId || !vivaClientSecret) {
    return NextResponse.json({ error: "Viva Wallet not configured" }, { status: 503 });
  }

  try {
    // Get OAuth2 token from Viva
    const tokenRes = await fetch("https://accounts.vivapayments.com/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: vivaClientId,
        client_secret: vivaClientSecret,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Viva token error: ${tokenRes.status}`);
    }
    const { access_token } = await tokenRes.json();

    // Create payment order
    const amountInCents = Math.round(Number(invoice.total) * 100);
    const orderRes = await fetch("https://api.vivapayments.com/checkout/v2/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInCents,
        customerTrns: `DGSmart Hub Invoice ${invoice.id}`,
        customer: {
          email: invoice.tenant.billingEmail,
          fullName: invoice.tenant.name,
        },
        paymentTimeout: 1800,
        preauth: false,
        allowRecurring: false,
        maxInstallments: 0,
        paymentNotification: true,
        tipAmount: 0,
        disableExactAmount: false,
        disableCash: true,
        disableWallet: false,
        sourceCode: vivaSourceCode || "Default",
        merchantTrns: `INV-${invoice.id}`,
        tags: [`invoiceId:${invoice.id}`, `tenantId:${session.user.tenantId}`],
      }),
    });

    if (!orderRes.ok) {
      throw new Error(`Viva order error: ${orderRes.status}`);
    }

    const { orderCode } = await orderRes.json();

    // Update invoice with Viva order code
    await db.invoice.update({
      where: { id: invoiceId },
      data: { vivaOrderCode: String(orderCode) },
    });

    const checkoutUrl = `https://www.vivapayments.com/web/checkout?ref=${orderCode}`;

    return NextResponse.json({ checkoutUrl, orderCode });
  } catch (err) {
    console.error("[billing/checkout] error:", err);
    return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
  }
}
