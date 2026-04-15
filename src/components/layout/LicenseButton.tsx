"use client";

import { useState, useEffect } from "react";
import {
  FiAward, FiX, FiCopy, FiCheck, FiLoader, FiKey, FiPackage,
} from "react-icons/fi";
import m from "@/components/customers/customers.module.css";

interface LicenseData {
  serial: string | null;
  vendor: string | null;
  buyer: string | null;
  appName: string;
  version: string;
  error?: string;
}

export default function LicenseButton({
  collapsed, locale,
}: {
  collapsed: boolean;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const t = locale === "el";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sidebar-link btn-ghost"
        style={{ width: "100%", border: "none", cursor: "pointer", display: "flex" }}
        title={collapsed ? (t ? "Άδεια χρήσης" : "License") : undefined}
      >
        <FiAward size={18} className="icon" />
        <span className="sidebar-label">{t ? "Άδεια χρήσης" : "License"}</span>
      </button>
      {open && <LicenseModal onClose={() => setOpen(false)} t={t} />}
    </>
  );
}

function LicenseModal({ onClose, t }: { onClose: () => void; t: boolean }) {
  const [data, setData] = useState<LicenseData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/license", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((err) => setData({
        serial: null, vendor: null, buyer: null,
        appName: "DGSmart Hub", version: "",
        error: err instanceof Error ? err.message : "Failed to load",
      }));
  }, []);

  function copy(val: string) {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={m.backdrop} onClick={onClose}>
      <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className={m.modalHeader}>
          <div className={m.modalTitle}>
            <FiAward size={16} />
            {t ? "Άδεια χρήσης λογισμικού" : "Software License"}
          </div>
          <button onClick={onClose} className={m.modalClose}><FiX size={18} /></button>
        </div>
        <div className={m.modalBody}>
          {!data ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
              <FiLoader className="animate-spin" size={20} style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: "0.82rem" }}>{t ? "Φόρτωση..." : "Loading..."}</div>
            </div>
          ) : data.error ? (
            <div style={{ padding: 12, background: "rgba(239,68,68,0.1)", color: "var(--red)", borderRadius: 6, fontSize: "0.85rem" }}>
              {data.error}
            </div>
          ) : (
            <>
              {/* App identity */}
              <div style={{
                padding: 16,
                background: "linear-gradient(135deg, rgba(255,102,0,0.08), transparent)",
                border: "1px solid var(--orange)",
                borderRadius: "var(--radius)",
                display: "flex", alignItems: "center", gap: 12,
                marginBottom: 16,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: "var(--orange-dim)", color: "var(--orange)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  <FiPackage size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                    {data.appName}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                    v{data.version}
                  </div>
                </div>
              </div>

              {/* Serial */}
              <div style={{
                padding: 14,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                marginBottom: 14,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
                  <FiKey size={11} /> {t ? "Σειριακός Αριθμός" : "Serial Number"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{
                    flex: 1,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--orange)",
                    letterSpacing: "0.04em",
                  }}>
                    {data.serial ?? "—"}
                  </code>
                  {data.serial && (
                    <button
                      type="button"
                      onClick={() => copy(data.serial!)}
                      className="btn-secondary"
                      style={{ padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                      title={t ? "Αντιγραφή" : "Copy"}
                    >
                      {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Parties */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                <PartyRow
                  label={t ? "Πάροχος / Vendor" : "Vendor"}
                  value={data.vendor}
                />
                <PartyRow
                  label={t ? "Πελάτης / Buyer" : "Buyer"}
                  value={data.buyer}
                />
              </div>

              <div style={{
                marginTop: 18,
                padding: "10px 12px",
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                textAlign: "center",
                borderTop: "1px solid var(--border)",
                paddingTop: 14,
              }}>
                © {new Date().getFullYear()} {data.vendor ?? "DGSOFT"} · {t ? "Όλα τα δικαιώματα διατηρούνται." : "All rights reserved."}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PartyRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{
      padding: 12,
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
    }}>
      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}
