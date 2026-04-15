import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { sendPlainEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({})) as { to?: string };
  const to = (body.to ?? session.user.email ?? "").trim();
  if (!to) return NextResponse.json({ error: "Missing recipient" }, { status: 400 });

  try {
    const result = await sendPlainEmail({
      to,
      subject: "DGSmart Hub · Mailgun test",
      html: `<p>This is a test email from DGSmart Hub at ${new Date().toISOString()}.</p><p>If you're reading this, Mailgun is configured correctly.</p>`,
      tags: ["test"],
    });
    return NextResponse.json({ ok: true, id: result.id, message: result.message });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Send failed" },
      { status: 502 }
    );
  }
}
