import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiMail } from "react-icons/fi";
import InvoicePrintable from "./InvoicePrintable";

export const metadata = { title: "Invoice" };

interface Params { params: Promise<{ id: string }> }

export default async function InvoiceDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      tenant: {
        include: {
          customer: {
            select: {
              name: true, afm: true, address: true, zip: true, city: true,
              country: true, irsdata: true, phone01: true, email: true, webpage: true,
            },
          },
          plan: { select: { name: true } },
        },
      },
      payments: { orderBy: { receivedAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const countries = invoice.tenant.customer.country
    ? await db.country.findMany({ select: { country: true, name: true } })
    : [];

  const t = session.user.locale === "el";

  return (
    <div>
      <div className="invoice-toolbar" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Link
          href="/admin/accounting"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.82rem", textDecoration: "none" }}
        >
          <FiArrowLeft size={14} /> {t ? "Πίσω στο Λογιστήριο" : "Back to Accounting"}
        </Link>
        <span style={{ flex: 1 }} />
        <Link
          href={`/admin/tenants/${invoice.tenant.id}`}
          className="btn-ghost"
          style={{ padding: "6px 10px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <FiMail size={12} /> {t ? "Ενέργειες tenant" : "Tenant actions"}
        </Link>
      </div>

      <InvoicePrintable
        invoice={JSON.parse(JSON.stringify(invoice))}
        countries={countries}
        vendor={{
          serial: process.env.SOFTWARE_SERIAL ?? null,
          vendor: process.env.SOFTWARE_COMPANY_VENTOR ?? "WORLD WIDE ASSOSIATES E.E",
          buyerFromEnv: process.env.SOFTWARE_COMPANY_BUYER ?? null,
          appName: "DGSmart Hub",
          appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
        }}
        locale={session.user.locale}
      />
    </div>
  );
}

