"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiRefreshCw, FiChevronRight, FiCheckCircle, FiXCircle, FiLoader, FiClock,
  FiDownloadCloud, FiArchive,
} from "react-icons/fi";

const RefreshCw = FiRefreshCw;
const ChevronRight = FiChevronRight;
const CheckCircle2 = FiCheckCircle;
const XCircle = FiXCircle;
const Loader2 = FiLoader;
const DownloadCloud = FiDownloadCloud;
const History = FiArchive;
void FiClock;
import m from "@/components/customers/customers.module.css";

interface Job {
  id: string;
  kind: string;
  trigger: string;
  status: "running" | "success" | "failed" | string;
  scanned: number;
  created: number;
  updated: number;
  skipped: number;
  errors: unknown;
  params: unknown;
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

interface Props { jobs: Job[]; locale: string; }

export default function SyncJobsClient({ jobs, locale }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState<"full" | "inc" | null>(null);
  const t = locale === "el";

  const toggle = (id: string) => {
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  async function trigger(kind: "full" | "inc") {
    setRunning(kind);
    try {
      if (kind === "full") {
        await fetch("/api/softone/sync-all", { method: "POST" });
      } else {
        // Pass the CRON_SECRET only exists server-side; use the admin-gated
        // endpoint instead by calling a small admin route for on-demand incremental.
        await fetch("/api/softone/sync-incremental", { method: "POST" });
      }
      router.refresh();
    } finally {
      setRunning(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <History size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Εργασίες Συγχρονισμού" : "Sync Jobs"}
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>
            ({jobs.length})
          </span>
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => trigger("inc")}
            disabled={running !== null}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {running === "inc" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {t ? "Incremental" : "Incremental"}
          </button>
          <button
            type="button"
            onClick={() => trigger("full")}
            disabled={running !== null}
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {running === "full" ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
            {t ? "Πλήρης" : "Full sync"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>{t ? "Τύπος" : "Kind"}</th>
                <th>{t ? "Κατάσταση" : "Status"}</th>
                <th>{t ? "Trigger" : "Trigger"}</th>
                <th>Scanned</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Skipped</th>
                <th>{t ? "Διάρκεια" : "Duration"}</th>
                <th>{t ? "Ξεκίνησε" : "Started"}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={10} className={m.emptyCell}>
                  {t ? "Καμία εργασία συγχρονισμού ακόμη" : "No sync jobs yet"}
                </td></tr>
              ) : jobs.map((j) => {
                const isOpen = expanded.has(j.id);
                return (
                  <Fragment key={j.id}>
                    <tr onClick={() => toggle(j.id)} style={{ cursor: "pointer" }}>
                      <td style={{ paddingLeft: 12 }}>
                        <ChevronRight
                          size={14}
                          style={{
                            transition: "transform 0.15s",
                            transform: isOpen ? "rotate(90deg)" : "rotate(0)",
                            color: "var(--text-muted)",
                          }}
                        />
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{j.kind}</td>
                      <td><StatusBadge status={j.status} t={t} /></td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        <span className={`badge ${j.trigger === "manual" ? "badge-blue" : "badge-gray"}`}>{j.trigger}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{j.scanned}</td>
                      <td style={{ color: j.created > 0 ? "var(--green)" : "var(--text-muted)" }}>
                        {j.created > 0 ? `+${j.created}` : "—"}
                      </td>
                      <td style={{ color: j.updated > 0 ? "var(--blue)" : "var(--text-muted)" }}>
                        {j.updated > 0 ? `~${j.updated}` : "—"}
                      </td>
                      <td style={{ color: j.skipped > 0 ? "var(--red)" : "var(--text-muted)" }}>
                        {j.skipped > 0 ? `!${j.skipped}` : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                        {j.durationMs != null ? formatDuration(j.durationMs) : "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        {new Date(j.startedAt).toLocaleString(t ? "el-GR" : "en-GB")}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={10} style={{ background: "var(--bg-elevated)", padding: 16 }}>
                          <JobDetail job={j} t={t} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: boolean }) {
  const label = (k: "success" | "failed" | "running") =>
    t ? ({ success: "επιτυχία", failed: "αποτυχία", running: "εκτελείται" }[k]) : k;
  if (status === "success") return <span className="badge badge-green"><CheckCircle2 size={11} style={{ display: "inline", marginRight: 4 }} />{label("success")}</span>;
  if (status === "failed")  return <span className="badge badge-red"><XCircle size={11} style={{ display: "inline", marginRight: 4 }} />{label("failed")}</span>;
  if (status === "running") return <span className="badge badge-yellow"><Loader2 size={11} className="animate-spin" style={{ display: "inline", marginRight: 4 }} />{label("running")}</span>;
  return <span className="badge badge-gray">{status}</span>;
}

function JobDetail({ job, t }: { job: Job; t: boolean }) {
  const errors = Array.isArray(job.errors) ? job.errors as Array<{ identifier: string; error: string }> : [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 12 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 8 }}>
          {t ? "Μεταδεδομένα" : "Metadata"}
        </div>
        <Row label="Job ID" value={<code style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{job.id}</code>} />
        <Row label={t ? "Ξεκίνησε" : "Started"} value={new Date(job.startedAt).toLocaleString()} />
        <Row label={t ? "Τελείωσε" : "Finished"} value={job.finishedAt ? new Date(job.finishedAt).toLocaleString() : "—"} />
        <Row label={t ? "Διάρκεια" : "Duration"} value={job.durationMs != null ? formatDuration(job.durationMs) : "—"} />
        <Row label={t ? "Παράμετροι" : "Params"} value={<code style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{JSON.stringify(job.params)}</code>} />
        {job.message && <Row label={t ? "Μήνυμα" : "Message"} value={<span style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>{job.message}</span>} />}
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 12 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 8 }}>
          {t ? "Σφάλματα" : "Errors"} ({errors.length})
        </div>
        {errors.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>—</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
            {errors.map((e, i) => (
              <div key={i} style={{ padding: "6px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 4, fontSize: "0.78rem" }}>
                <div style={{ color: "var(--red)", fontWeight: 600 }}>{e.identifier}</div>
                <div style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "0.72rem" }}>{e.error}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontSize: "0.8rem" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
