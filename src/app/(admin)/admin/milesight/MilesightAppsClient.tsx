"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FiRadio, FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiLoader,
  FiAlertCircle, FiCheckCircle, FiPlay, FiDownloadCloud,
  FiKey, FiGlobe, FiHash, FiToggleLeft, FiToggleRight,
} from "react-icons/fi";
import {
  saveMilesightAppAction, deleteMilesightAppAction,
  testMilesightAppAction, seedFromEnvAction,
  type MilesightAppInput,
} from "./actions";
import m from "@/components/customers/customers.module.css";

interface App {
  id: string;
  name: string;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  uuid: string | null;
  webhookSecret: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  apps: App[];
  envSuggests: { clientId: string | null; uuid: string | null };
  locale: string;
}

export default function MilesightAppsClient({ apps, envSuggests, locale }: Props) {
  const router = useRouter();
  const t = locale === "el";
  const [editing, setEditing] = useState<App | "new" | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; count?: number; error?: string }>>({});
  const [pending, start] = useTransition();

  function onTest(app: App) {
    start(async () => {
      const r = await testMilesightAppAction(app.id);
      setTestResults((prev) => ({
        ...prev,
        [app.id]: { ok: r.ok, count: r.devicesCount, error: r.error },
      }));
    });
  }

  function onDelete(app: App) {
    if (!confirm(`${t ? "Διαγραφή εφαρμογής" : "Delete app"} "${app.name}";`)) return;
    start(async () => {
      await deleteMilesightAppAction(app.id);
      router.refresh();
    });
  }

  function onSeed() {
    start(async () => {
      await seedFromEnvAction();
      router.refresh();
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <FiRadio size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Milesight Εφαρμογές" : "Milesight Apps"}
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>
            ({apps.length})
          </span>
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          {apps.length === 0 && envSuggests.clientId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onSeed}
              disabled={pending}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {pending ? <FiLoader size={13} className="animate-spin" /> : <FiDownloadCloud size={13} />}
              {t ? "Εισαγωγή από .env" : "Import from .env"}
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => setEditing("new")}
          >
            <FiPlus size={14} /> {t ? "Νέα Εφαρμογή" : "New App"}
          </button>
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius)", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
        {t
          ? "Κάθε εφαρμογή Milesight έχει τα δικά της διαπιστευτήρια OpenAPI. Οι συσκευές ανακαλύπτονται από όλες τις ενεργές εφαρμογές· το webhook ταυτοποιεί την εφαρμογή μέσω του X-MSC-Webhook-UUID."
          : "Each Milesight Application has its own OpenAPI credentials. Devices are discovered from all active apps; the webhook matches an app via the X-MSC-Webhook-UUID header."}
      </div>

      {apps.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <FiRadio size={32} style={{ color: "var(--text-muted)", opacity: 0.4, margin: "0 auto 8px" }} />
          <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
            {t ? "Καμία εφαρμογή ακόμη" : "No apps yet"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {envSuggests.clientId
              ? (t ? "Εισαγάγετε την τρέχουσα εφαρμογή από τα env vars ή προσθέστε μία νέα." : "Import the current app from env vars, or add a new one.")
              : (t ? "Δημιουργήστε μία εφαρμογή για να ξεκινήσετε." : "Create an app to get started.")}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          {apps.map((app) => {
            const result = testResults[app.id];
            return (
              <div
                key={app.id}
                className="card"
                style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, opacity: app.isActive ? 1 : 0.55 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: app.isActive ? "var(--orange-dim)" : "var(--bg-elevated)",
                    color: app.isActive ? "var(--orange)" : "var(--text-muted)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <FiRadio size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{app.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {app.clientId.slice(0, 8)}…{app.clientId.slice(-4)}
                    </div>
                  </div>
                  <span className={`badge ${app.isActive ? "badge-green" : "badge-gray"}`}>
                    {app.isActive ? (t ? "Ενεργή" : "Active") : (t ? "Ανενεργή" : "Inactive")}
                  </span>
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <div><FiGlobe size={10} style={{ display: "inline", marginRight: 4 }} />{app.baseUrl}</div>
                  {app.uuid && (
                    <div><FiHash size={10} style={{ display: "inline", marginRight: 4 }} />UUID <code style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>{app.uuid.slice(0, 8)}…</code></div>
                  )}
                  <div>
                    <FiKey size={10} style={{ display: "inline", marginRight: 4 }} />
                    {t ? "Webhook secret" : "Webhook secret"}: {app.webhookSecret ? "✓" : (t ? "— λείπει —" : "— missing —")}
                  </div>
                </div>

                {result && (
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      background: result.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      color: result.ok ? "var(--green)" : "var(--red)",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {result.ok ? <FiCheckCircle size={12} /> : <FiAlertCircle size={12} />}
                    {result.ok
                      ? `${t ? "OK" : "OK"} · ${result.count} ${t ? "συσκευές" : "devices"}`
                      : (result.error ?? "Error")}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={() => onTest(app)}
                    disabled={pending}
                  >
                    {pending ? <FiLoader size={12} className="animate-spin" /> : <FiPlay size={12} />}
                    {t ? "Δοκιμή" : "Test"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={() => setEditing(app)}
                    disabled={pending}
                  >
                    <FiEdit2 size={12} /> {t ? "Επεξεργασία" : "Edit"}
                  </button>
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "5px 10px", fontSize: "0.78rem", color: "var(--red)" }}
                    onClick={() => onDelete(app)}
                    disabled={pending}
                    title={t ? "Διαγραφή" : "Delete"}
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <AppEditor
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
          t={t}
        />
      )}
    </div>
  );
}

function AppEditor({
  initial, onClose, onSaved, t,
}: {
  initial: App | null;
  onClose: () => void;
  onSaved: () => void;
  t: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "https://eu-openapi.milesight.com");
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [uuid, setUuid] = useState(initial?.uuid ?? "");
  const [webhookSecret, setWebhookSecret] = useState(initial?.webhookSecret ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: MilesightAppInput = {
      id: initial?.id,
      name, baseUrl, clientId,
      clientSecret: clientSecret || undefined,
      uuid, webhookSecret, isActive,
    };
    start(async () => {
      try {
        await saveMilesightAppAction(input);
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className={m.backdrop} onClick={onClose}>
      <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className={m.modalHeader}>
          <div className={m.modalTitle}>
            <FiRadio size={16} />
            {initial
              ? (t ? `Επεξεργασία · ${initial.name}` : `Edit · ${initial.name}`)
              : (t ? "Νέα Εφαρμογή Milesight" : "New Milesight App")}
          </div>
          <button onClick={onClose} className={m.modalClose}><FiX size={18} /></button>
        </div>
        <div className={m.modalBody}>
          {error && (
            <div className={`${m.alert} ${m.alertError}`} style={{ marginBottom: 12 }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}
          <form onSubmit={submit} className={m.form}>
            <div className={m.grid4}>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">{t ? "Όνομα εφαρμογής" : "App name"}</label>
                <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="DGSOFT · SMART-BUTTON" />
              </div>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">Base URL</label>
                <input className="input" required value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
              </div>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">Client ID</label>
                <input className="input" required value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="bbdbfdfa-86c7-4b26-b919-…" />
              </div>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">
                  Client Secret {initial && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({t ? "κενό = διατήρηση" : "blank to keep"})</span>}
                </label>
                <input
                  className="input"
                  type="password"
                  required={!initial}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={initial ? "••••••••" : ""}
                />
              </div>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">Webhook UUID</label>
                <input
                  className="input"
                  value={uuid}
                  onChange={(e) => setUuid(e.target.value)}
                  placeholder="8d27ede6-acd4-4a6a-87c7-…"
                />
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 3 }}>
                  {t ? "Το UUID του webhook subscription στο Milesight, χρησιμοποιείται για ταυτοποίηση της εφαρμογής." : "The webhook subscription UUID on Milesight — used to route incoming events to this app."}
                </div>
              </div>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">Webhook Secret</label>
                <input
                  className="input"
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
              </div>
              <label className={`${m.checkboxRow} ${m.span4}`}>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                {isActive ? <FiToggleRight size={13} style={{ color: "var(--orange)" }} /> : <FiToggleLeft size={13} />}
                {t ? "Ενεργή" : "Active"}
              </label>
            </div>
            <div className={m.saveBar}>
              <button type="submit" disabled={pending} className={`btn-primary ${m.saveBtn}`}>
                {pending ? <FiLoader size={16} className="animate-spin" /> : <FiSave size={16} />}
                {t ? "Αποθήκευση" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
