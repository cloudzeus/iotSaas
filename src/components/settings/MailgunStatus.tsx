"use client";

import { useState, useTransition } from "react";
import { FiMail, FiLoader, FiSend, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

const Mail = FiMail;
const Loader2 = FiLoader;
const Send = FiSend;
const CheckCircle2 = FiCheckCircle;
const AlertCircle = FiAlertCircle;

export default function MailgunStatus({ locale, defaultTo }: { locale: string; defaultTo: string }) {
  const [to, setTo] = useState(defaultTo);
  const [result, setResult] = useState<{ ok: true; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = locale === "el";

  function send() {
    setError(null);
    setResult(null);
    start(async () => {
      try {
        const res = await fetch("/api/admin/email-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setResult({ ok: true, id: data.id });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Send failed");
      }
    });
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mail size={18} style={{ color: "var(--orange)" }} />
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Mailgun</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {t ? "Δοκιμή αποστολής email" : "Send a test email"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label className="label">{t ? "Παραλήπτης" : "Recipient"}</label>
          <input
            className="input"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={send}
          disabled={pending || !to}
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {t ? "Αποστολή" : "Send"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 10, background: "rgba(239,68,68,0.1)", color: "var(--red)", borderRadius: 6, fontSize: "0.82rem", display: "flex", gap: 8, alignItems: "center" }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {result && (
        <div style={{ padding: 10, background: "rgba(34,197,94,0.1)", color: "var(--green)", borderRadius: 6, fontSize: "0.82rem", display: "flex", gap: 8, alignItems: "center" }}>
          <CheckCircle2 size={14} /> {t ? "Στάλθηκε" : "Sent"} · <code style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>{result.id}</code>
        </div>
      )}
    </div>
  );
}
