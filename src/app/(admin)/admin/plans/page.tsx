import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import PlansClient from "./PlansClient";

export const metadata = { title: "Plans" };

export default async function PlansPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const plans = await db.plan.findMany({
    orderBy: { pricePerDevice: "desc" },
    include: { _count: { select: { tenants: true } } },
  });

  return <PlansClient plans={JSON.parse(JSON.stringify(plans))} locale={session.user.locale} />;
}
