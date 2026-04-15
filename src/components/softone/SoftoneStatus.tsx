"use client";

import { useEffect, useState, useTransition } from "react";
import {
  FiLoader, FiRefreshCw, FiCheckCircle, FiXCircle, FiClock, FiDownloadCloud,
} from "react-icons/fi";

const Loader2 = FiLoader;
const RefreshCw = FiRefreshCw;
const CheckCircle2 = FiCheckCircle;
const XCircle = FiXCircle;
const Clock = FiClock;
const DownloadCloud = FiDownloadCloud;

interface Status {
  connected: boolean;
  authenticatedAt?: number;
  expiresAt?: number;
  expiresInSec?: number;
  clientIdPreview?: string;
  error?: string;
}

export default function SoftoneStatus({ locale }: { locale: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [syncing, startSync] = useTransition();
  const [syncResult, setSyncResult] = useState<{ scanned: number; created: number; updated: number; skipped: number } | null>(null);
  const t = locale === "el";

  async function fetchStatus() {
    try {
      const res = await fetch("/api/softone/status", { cache: "no-store" });
      const data: Status = await res.json();
      setStatus(data);
      setCountdown(data.expiresInSec ?? 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  // Live countdown tick
  useEffect(() => {
    if (!status?.connected || countdown <= 0) return;
    const iv = setInterval(() => setCountdown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(iv);
  }, [status?.connected, countdown]);

  function fullSync() {
    setError(null);
    setSyncResult(null);
    startSync(async () => {
      try {
        const res = await fetch("/api/softone/sync-all", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setSyncResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sync failed");
      }
    });
  }

  function connect() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/softone/connect", { method: "POST" });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        await fetchStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      }
    });
  }

  const connected = status?.connected && countdown > 0;
  const pctLeft = status?.expiresAt && status.authenticatedAt
    ? (countdown * 1000) / (status.expiresAt - status.authenticatedAt) * 100
    : 0;

  return (
    <div
      className="card"
      style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {connected ? (
            <CheckCircle2 size={18} style={{ color: "var(--green)" }} />
          ) : (
            <XCircle size={18} style={{ color: "var(--red)" }} />
          )}
          <div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>SoftOne ERP</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {connected
                ? (t ? "Συνδεδεμένο" : "Connected")
                : (t ? "Αποσυνδεδεμένο" : "Disconnected")}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={pending}
          className="btn-primary"
          style={{ padding: "6px 14px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {pending
            ? <Loader2 size={14} className="animate-spin" />
            : <RefreshCw size={14} />}
          {connected
            ? (t ? "Επανασύνδεση" : "Reconnect")
            : (t ? "Σύνδεση" : "Connect")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 10, background: "rgba(239,68,68,0.1)", color: "var(--red)", borderRadius: 6, fontSize: "0.82rem" }}>
          {error}
        </div>
      )}

      {connected && status?.expiresAt && (
        <>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: "0.82rem",
          }}>
            <span style={{ color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Clock size={13} />
              {t ? "Λήξη σε" : "Expires in"}
            </span>
            <span style={{ fontWeight: 700, color: countdown < 300 ? "var(--red)" : "var(--text-primary)", fontFamily: "monospace" }}>
              {formatHMS(countdown)}
            </span>
          </div>

          <div style={{
            height: 6, background: "var(--bg-elevated)", borderRadius: 999, overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${Math.max(0, Math.min(100, pctLeft))}%`,
              background: pctLeft < 20 ? "var(--red)" : pctLeft < 50 ? "var(--yellow)" : "var(--green)",
              transition: "width 1s linear, background 0.3s",
            }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <span>
              {t ? "Ταυτοποίηση" : "Authenticated"}: {new Date(status.authenticatedAt!).toLocaleTimeString(t ? "el-GR" : "en-GB")}
            </span>
            <span style={{ fontFamily: "monospace" }}>{status.clientIdPreview}</span>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>
              {t ? "Συγχρονισμός Πελατών" : "Customer Sync"}
            </div>
            <button
              type="button"
              onClick={fullSync}
              disabled={syncing}
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", padding: "8px 14px" }}
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
              {t ? "Πλήρης συγχρονισμός" : "Full sync"}
            </button>
            {syncResult && (
              <div style={{
                marginTop: 10, padding: 10, background: "var(--bg-elevated)",
                borderRadius: 6, fontSize: "0.78rem", color: "var(--text-secondary)",
                display: "flex", gap: 14, flexWrap: "wrap",
              }}>
                <span>{t ? "Σαρώθηκαν" : "Scanned"}: <strong style={{ color: "var(--text-primary)" }}>{syncResult.scanned}</strong></span>
                <span style={{ color: "var(--green)" }}>+{syncResult.created} {t ? "νέοι" : "created"}</span>
                <span style={{ color: "var(--blue)" }}>~{syncResult.updated} {t ? "ενημερωμένοι" : "updated"}</span>
                {syncResult.skipped > 0 && <span style={{ color: "var(--red)" }}>!{syncResult.skipped} {t ? "σφάλματα" : "skipped"}</span>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatHMS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
