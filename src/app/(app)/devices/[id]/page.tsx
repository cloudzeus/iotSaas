import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import DeviceDetailClient from "./DeviceDetailClient";

interface Props { params: Promise<{ id: string }> }

export const metadata = { title: "Device Detail" };

export default async function DevicePage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.tenantId) redirect("/login");

  const device = await db.device.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!device) notFound();

  return (
    <DeviceDetailClient
      device={JSON.parse(JSON.stringify(device))}
      locale={session.user.locale}
      canManage={session.user.role !== "VIEWER"}
    />
  );
}
