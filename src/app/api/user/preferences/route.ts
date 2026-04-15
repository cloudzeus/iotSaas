import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:   z.string().min(1).max(255).optional(),
  locale: z.enum(["el", "en"]).optional(),
  theme:  z.enum(["dark", "light"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });
  return NextResponse.json({ ok: true, locale: updated.locale, theme: updated.theme });
}
