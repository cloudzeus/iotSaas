"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiClock, FiSave, FiLoader, FiCheckCircle } from "react-icons/fi";
import { setTenantDefaultGraceAction } from "@/app/(admin)/admin/billing/actions";

export default function TenantGraceCard({
  tenantId, initial, locale,
}: {
  tenantId: string;
  initial: number;
  locale: string;
}) {
  const router = useRouter();
  const t = locale === "el";
  const [days, setDays] = useState(String(initial));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    start(async () => {
      await setTenantDefaultGraceAction({
        tenantId,
        defaultGraceDays: Number(days) || 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    });
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <FiClock size={12} />
        {t ? "Προκαθορισμένη περίοδος χάριτος" : "Default grace period"}
      </div>
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 10 }}>
        {t
          ? "Εφαρμόζεται αυτόματα σε κάθε νέο τιμολόγιο που δημιουργείται."
          : "Auto-applied to every new invoice created for this tenant."}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number"
          min={0}
          max={365}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="input"
          style={{ width: 90, padding: "6px 10px" }}
        />
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          {t ? "ημέρες μετά τη λήξη μηνός" : "days after month end"}
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn-primary"
          style={{ padding: "5px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={save}
          disabled={pending || String(initial) === days}
        >
          {pending ? <FiLoader size={12} className="animate-spin" /> : saved ? <FiCheckCircle size={12} /> : <FiSave size={12} />}
          {saved ? (t ? "Αποθηκεύτηκε" : "Saved") : (t ? "Αποθήκευση" : "Save")}
        </button>
      </div>
    </div>
  );
}
