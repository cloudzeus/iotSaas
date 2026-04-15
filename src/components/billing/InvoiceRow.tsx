"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FiCalendar, FiSend, FiCheck, FiClock, FiCreditCard, FiCopy,
  FiLoader, FiAlertCircle, FiCheckCircle, FiExternalLink,
} from "react-icons/fi";
import {
  setInvoiceGraceAction, sendProformaAction, markInvoicePaidAction,
  createVivaLinkAction,
} from "@/app/(admin)/admin/billing/actions";

export interface InvoiceRowData {
  id: string;
  tenantId: string;
  tenantName: string;
  billingEmail: string | null;
  periodStart: string;
  deviceCount: number;
  total: number;
  status: string;
  graceUntil: string | null;
  vivaOrderCode: string | null;
  createdAt: string;
}

export default function InvoiceRow({
  invoice,
  locale,
}: {
  invoice: InvoiceRowData;
  locale: string;
}) {
  const router = useRouter();
  const t = locale === "el";
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [graceOpen, setGraceOpen] = useState(false);
  const [graceDate, setGraceDate] = useState(
    invoice.graceUntil ? invoice.graceUntil.slice(0, 10) : ""
  );

  const pStart = new Date(invoice.periodStart);
  const pLabel = pStart.toLocaleDateString(t ? "el-GR" : "en-GB", {
    month: "long", year: "numeric",
  });

  const isOverdueGrace = invoice.graceUntil
    ? new Date(invoice.graceUntil) < new Date()
    : false;

  function run(fn: () => Promise<{ ok: boolean; error?: string; paymentUrl?: string | null }>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg({ kind: "ok", text: r.paymentUrl ? `OK · ${r.paymentUrl}` : t ? "OK" : "OK" });
      } else {
        setMsg({ kind: "err", text: r.error ?? "Error" });
      }
      router.refresh();
    });
  }

  function saveGrace() {
    run(async () => {
      await setInvoiceGraceAction({
        invoiceId: invoice.id,
        graceUntil: graceDate || null,
      });
      setGraceOpen(false);
      return { ok: true };
    });
  }

  function copyUrl() {
    if (!invoice.vivaOrderCode) return;
    navigator.clipboard.writeText(`https://www.vivapayments.com/web/checkout?ref=${invoice.vivaOrderCode}`);
    setMsg({ kind: "ok", text: t ? "Αντιγράφηκε" : "Copied" });
    setTimeout(() => setMsg(null), 1500);
  }

  const statusBadge = (() => {
    if (invoice.status === "PAID") return <span className="badge badge-green"><FiCheck size={10} /> PAID</span>;
    if (invoice.status === "OVERDUE") return <span className="badge badge-red">OVERDUE</span>;
    if (invoice.status === "DRAFT") return <span className="badge badge-gray">DRAFT</span>;
    return <span className="badge badge-yellow">PENDING</span>;
  })();

  return (
    <div
      className="card"
      style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, borderLeft: `4px solid ${invoice.status === "PAID" ? "var(--green)" : isOverdueGrace ? "var(--red)" : "var(--orange)"}` }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <FiCalendar size={16} style={{ color: "var(--text-muted)" }} />
        <div style={{ fontWeight: 600 }}>{pLabel}</div>
        {statusBadge}
        <span style={{ flex: 1 }} />
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          {invoice.deviceCount} {t ? "συσκευές" : "devices"}
        </div>
        <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--orange)" }}>
          €{invoice.total.toFixed(2)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
        <span>{invoice.billingEmail ?? (t ? "— χωρίς email —" : "— no billing email —")}</span>
        {invoice.graceUntil && (
          <span
            className="badge"
            style={{
              background: isOverdueGrace ? "rgba(239,68,68,0.12)" : "rgba(255,102,0,0.12)",
              color: isOverdueGrace ? "var(--red)" : "var(--orange)",
            }}
          >
            <FiClock size={10} />
            {t ? "Χάρη έως" : "Grace until"} {new Date(invoice.graceUntil).toLocaleDateString(t ? "el-GR" : "en-GB")}
          </span>
        )}
        {invoice.vivaOrderCode && (
          <span className="badge badge-blue">
            <FiCreditCard size={10} /> Viva #{invoice.vivaOrderCode.slice(0, 8)}…
          </span>
        )}
      </div>

      {msg && (
        <div style={{
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: "0.75rem",
          background: msg.kind === "ok" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          color: msg.kind === "ok" ? "var(--green)" : "var(--red)",
          display: "flex", alignItems: "center", gap: 6,
          wordBreak: "break-all",
        }}>
          {msg.kind === "ok" ? <FiCheckCircle size={12} /> : <FiAlertCircle size={12} />}
          <span>{msg.text}</span>
        </div>
      )}

      {graceOpen ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="date"
            className="input"
            value={graceDate}
            onChange={(e) => setGraceDate(e.target.value)}
            style={{ padding: "4px 8px", fontSize: "0.8rem" }}
          />
          <button type="button" className="btn-primary" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={saveGrace} disabled={pending}>
            {pending ? <FiLoader size={12} className="animate-spin" /> : <FiCheck size={12} />}
            {t ? "Αποθήκευση" : "Save"}
          </button>
          <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => setGraceOpen(false)}>
            {t ? "Άκυρο" : "Cancel"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {invoice.status !== "PAID" && (
            <>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => setGraceOpen(true)}
                disabled={pending}
              >
                <FiClock size={12} />
                {t ? "Περίοδος χάριτος" : "Grace period"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => run(() => sendProformaAction({ invoiceId: invoice.id, withPaymentLink: false }))}
                disabled={pending || !invoice.billingEmail}
                title={!invoice.billingEmail ? (t ? "Λείπει το email χρέωσης" : "Missing billing email") : ""}
              >
                <FiSend size={12} />
                {t ? "Αποστολή Προφόρμας" : "Send proforma"}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => run(() => sendProformaAction({ invoiceId: invoice.id, withPaymentLink: true }))}
                disabled={pending || !invoice.billingEmail}
              >
                <FiCreditCard size={12} />
                {t ? "Προφόρμα + Viva" : "Proforma + Viva"}
              </button>
              {!invoice.vivaOrderCode ? (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={() => run(() => createVivaLinkAction(invoice.id))}
                  disabled={pending}
                >
                  <FiExternalLink size={12} />
                  {t ? "Link Viva" : "Viva link"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={copyUrl}
                >
                  <FiCopy size={12} />
                  {t ? "Αντιγραφή URL" : "Copy URL"}
                </button>
              )}
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6, color: "var(--green)" }}
                onClick={() => run(async () => { await markInvoicePaidAction(invoice.id); return { ok: true }; })}
                disabled={pending}
              >
                <FiCheck size={12} />
                {t ? "Σήμανση ως πληρωμένο" : "Mark paid"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
