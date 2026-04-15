"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FiClock, FiZap, FiToggleLeft, FiToggleRight, FiLoader, FiCheckCircle,
  FiAlertCircle, FiDownloadCloud,
} from "react-icons/fi";
import { updateScheduleAction, seedSchedulesAction } from "@/app/(admin)/admin/settings/schedule-actions";
import { SYNC_KINDS } from "@/app/(admin)/admin/settings/schedule-kinds";

interface Schedule {
  id: string;
  kind: string;
  label: string;
  intervalMin: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export default function SyncSchedules({
  schedules,
  locale,
}: {
  schedules: Schedule[];
  locale: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [runningKind, setRunningKind] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ kind: string; scanned: number; created: number; updated: number; skipped: number; error?: string } | null>(null);
  const t = locale === "el";

  const existingKinds = new Set(schedules.map((s) => s.kind));
  const missingKinds = SYNC_KINDS.filter((k) => !existingKinds.has(k.kind));

  if (schedules.length === 0) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 10 }}>
          {t ? "Δεν υπάρχουν προγράμματα συγχρονισμού." : "No sync schedules seeded yet."}
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => start(async () => { await seedSchedulesAction(); router.refresh(); })}
          disabled={pending}
        >
          {pending ? <FiLoader size={14} className="animate-spin" /> : <FiClock size={14} />}
          {t ? "Αρχικοποίηση" : "Seed schedules"}
        </button>
      </div>
    );
  }

  function onRunNow(kind: string) {
    setRunningKind(kind);
    setLastResult(null);
    start(async () => {
      try {
        const endpoint = kind === "softone-customers"
          ? "/api/softone/sync-all"
          : kind === "softone-countries"
            ? "/api/softone/sync-countries"
            : kind === "softone-trdpgroups"
              ? "/api/softone/sync-trdpgroups"
              : kind === "softone-trdbusinesses"
                ? "/api/softone/sync-trdbusinesses"
                : null;
        if (!endpoint) return;
        const res = await fetch(endpoint, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setLastResult({
          kind,
          scanned: data.scanned ?? 0,
          created: data.created ?? 0,
          updated: data.updated ?? 0,
          skipped: data.skipped ?? 0,
        });
        router.refresh();
      } catch (err) {
        setLastResult({
          kind, scanned: 0, created: 0, updated: 0, skipped: 0,
          error: err instanceof Error ? err.message : "Error",
        });
      } finally {
        setRunningKind(null);
      }
    });
  }

  function onToggle(kind: string, enabled: boolean) {
    start(async () => {
      await updateScheduleAction({ kind, enabled });
      router.refresh();
    });
  }

  function onIntervalBlur(kind: string, value: string) {
    const n = Number(value);
    if (isNaN(n)) return;
    start(async () => {
      await updateScheduleAction({ kind, intervalMin: n });
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {missingKinds.length > 0 && (
        <div
          className="card"
          style={{
            padding: 10, display: "flex", alignItems: "center", gap: 10,
            background: "var(--orange-dim)", border: "1px solid var(--orange)",
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "var(--orange)", flex: 1 }}>
            {t
              ? `Νέα είδη συγχρονισμού: ${missingKinds.map((k) => k.label).join(", ")}`
              : `New sync kinds available: ${missingKinds.map((k) => k.label).join(", ")}`}
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            onClick={() => start(async () => { await seedSchedulesAction(); router.refresh(); })}
            disabled={pending}
          >
            {pending ? <FiLoader size={12} className="animate-spin" /> : <FiClock size={12} />}
            {t ? "Προσθήκη" : "Add"}
          </button>
        </div>
      )}

      {schedules.map((s) => (
        <div
          key={s.id}
          className="card"
          style={{ padding: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: s.enabled ? "rgba(255,102,0,0.15)" : "var(--bg-elevated)",
            color: s.enabled ? "var(--orange)" : "var(--text-muted)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <FiClock size={16} />
          </div>

          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.label}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              {s.kind}
            </div>
            {s.lastRunAt && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 3 }}>
                {t ? "Τελευταία" : "Last"}: {new Date(s.lastRunAt).toLocaleString(t ? "el-GR" : "en-GB")}
              </div>
            )}
          </div>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {t ? "Κάθε" : "Every"}
            <input
              type="number"
              min={1}
              max={1440}
              defaultValue={s.intervalMin}
              onBlur={(e) => onIntervalBlur(s.kind, e.target.value)}
              disabled={pending}
              style={{
                width: 70,
                padding: "4px 8px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                color: "var(--text-primary)",
                fontSize: "0.82rem",
              }}
            />
            {t ? "λεπτά" : "min"}
          </label>

          <button
            type="button"
            onClick={() => onToggle(s.kind, !s.enabled)}
            disabled={pending}
            aria-label={s.enabled ? "Disable" : "Enable"}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: s.enabled ? "var(--orange)" : "var(--text-muted)",
              display: "inline-flex",
              padding: 6,
            }}
            title={s.enabled ? (t ? "Ενεργό" : "Enabled") : (t ? "Ανενεργό" : "Disabled")}
          >
            {s.enabled ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />}
          </button>

          <button
            type="button"
            onClick={() => onRunNow(s.kind)}
            disabled={pending}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}
          >
            {runningKind === s.kind
              ? <FiLoader size={13} className="animate-spin" />
              : <FiDownloadCloud size={13} />}
            {t ? "Εκτέλεση" : "Run now"}
          </button>
        </div>
      ))}

      {lastResult && (
        <div
          style={{
            padding: 12,
            background: lastResult.error ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
            color: lastResult.error ? "var(--red)" : "var(--green)",
            borderRadius: 6,
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {lastResult.error ? <FiAlertCircle size={14} /> : <FiCheckCircle size={14} />}
          <code style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>{lastResult.kind}</code>
          {lastResult.error ?? `${lastResult.scanned} scanned · +${lastResult.created} · ~${lastResult.updated} · !${lastResult.skipped}`}
        </div>
      )}

      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", paddingTop: 4 }}>
        <FiZap size={10} style={{ display: "inline", marginRight: 4 }} />
        {t
          ? "Η πραγματική εκτέλεση πρέπει να γίνει από το Coolify scheduled task: POST /api/cron/softone?secret=$CRON_SECRET κάθε 1 λεπτό — εμείς δρομολογούμε βάσει intervalMin."
          : "Configure a Coolify scheduled task POST /api/cron/softone?secret=$CRON_SECRET every 1 minute — the server dispatches based on intervalMin."}
      </div>
    </div>
  );
}
