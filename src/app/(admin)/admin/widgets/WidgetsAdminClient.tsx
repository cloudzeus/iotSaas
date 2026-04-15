"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid, Plus, Pencil, Trash2, X, Save, Loader2, AlertCircle,
} from "lucide-react";
import {
  saveWidgetTypeAction, deleteWidgetTypeAction, toggleTenantWidgetAction,
  type WidgetTypeInput,
} from "./actions";
import m from "@/components/customers/customers.module.css";
import s from "@/components/plans/plans.module.css";

interface WidgetType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  appliesTo: string;
  isActive: boolean;
}

interface Tenant { id: string; name: string; }

interface Props {
  widgetTypes: WidgetType[];
  tenants: Tenant[];
  enabled: Array<{ tenantId: string; widgetTypeId: string }>;
  locale: string;
}

export default function WidgetsAdminClient({ widgetTypes, tenants, enabled, locale }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<WidgetType | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const t = locale === "el";

  const enabledSet = new Set(enabled.map((e) => `${e.tenantId}::${e.widgetTypeId}`));
  const isEnabled = (tid: string, wid: string) => enabledSet.has(`${tid}::${wid}`);

  function onToggle(tenantId: string, widgetTypeId: string, currentlyOn: boolean) {
    startTransition(async () => {
      await toggleTenantWidgetAction(tenantId, widgetTypeId, !currentlyOn);
      router.refresh();
    });
  }

  function onDelete(w: WidgetType) {
    if (!confirm(`${t ? "Διαγραφή τύπου widget" : "Delete widget type"} "${w.name}";`)) return;
    startTransition(async () => {
      await deleteWidgetTypeAction(w.id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <LayoutGrid size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Widgets" : "Widgets"}
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>
            ({widgetTypes.length})
          </span>
        </h1>
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <Plus size={16} /> {t ? "Νέος Τύπος" : "New Type"}
        </button>
      </div>

      <div className="card" style={{ overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>{t ? "Τύπος Widget" : "Widget Type"}</th>
              <th>{t ? "Κωδικός" : "Code"}</th>
              <th>{t ? "Εφαρμόζεται σε" : "Applies to"}</th>
              {tenants.map((tn) => (
                <th key={tn.id} style={{ textAlign: "center", whiteSpace: "nowrap" }}>{tn.name}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {widgetTypes.length === 0 ? (
              <tr><td colSpan={4 + tenants.length} className={m.emptyCell}>
                {t ? "Δεν υπάρχουν τύποι widget" : "No widget types"}
              </td></tr>
            ) : widgetTypes.map((w) => (
              <tr key={w.id} style={{ opacity: w.isActive ? 1 : 0.55 }}>
                <td>
                  <div style={{ fontWeight: 600 }}>{w.name}</div>
                  {w.description && (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{w.description}</div>
                  )}
                </td>
                <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {w.code}
                </td>
                <td>
                  <span className="badge badge-gray">{w.appliesTo}</span>
                </td>
                {tenants.map((tn) => {
                  const on = isEnabled(tn.id, w.id);
                  return (
                    <td key={tn.id} style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => onToggle(tn.id, w.id, on)}
                        disabled={pending || !w.isActive}
                        aria-label={on ? "Disable" : "Enable"}
                        className={`${s.toggle} ${on ? s.toggleOn : ""}`}
                        style={{ display: "inline-block" }}
                      >
                        <span className={s.toggleThumb} />
                      </button>
                    </td>
                  );
                })}
                <td>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => setEditing(w)}
                      className={m.menuTrigger}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(w)}
                      className={m.menuTrigger}
                      style={{ color: "var(--red)" }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className={m.backdrop} onClick={() => setEditing(null)}>
          <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className={m.modalHeader}>
              <div className={m.modalTitle}>
                {editing === "new" ? <Plus size={16} /> : <Pencil size={16} />}
                {editing === "new" ? (t ? "Νέος Τύπος Widget" : "New Widget Type") : (t ? "Επεξεργασία" : "Edit")}
              </div>
              <button onClick={() => setEditing(null)} className={m.modalClose}><X size={18} /></button>
            </div>
            <div className={m.modalBody}>
              <WidgetTypeForm
                initial={editing === "new" ? null : editing}
                onDone={() => { setEditing(null); router.refresh(); }}
                t={t}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WidgetTypeForm({
  initial, onDone, t,
}: {
  initial: WidgetType | null;
  onDone: () => void;
  t: boolean;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [appliesTo, setAppliesTo] = useState(initial?.appliesTo ?? "*");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: WidgetTypeInput = {
      id: initial?.id, code, name, description, icon, appliesTo, isActive,
    };
    startTransition(async () => {
      try {
        await saveWidgetTypeAction(input);
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <form onSubmit={submit} className={m.form}>
      {error && (
        <div className={`${m.alert} ${m.alertError}`}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      <div className={m.grid4}>
        <div className={`${m.field} ${m.span2}`}>
          <label className="label">{t ? "Όνομα" : "Name"}</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className={`${m.field} ${m.span2}`}>
          <label className="label">{t ? "Κωδικός" : "Code"} (slug)</label>
          <input
            className="input"
            required
            value={code}
            placeholder="e.g. battery-gauge"
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div className={`${m.field} ${m.span4}`}>
          <label className="label">{t ? "Περιγραφή" : "Description"}</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className={`${m.field} ${m.span2}`}>
          <label className="label">{t ? "Εικονίδιο (lucide)" : "Icon (lucide name)"}</label>
          <input className="input" value={icon} placeholder="Battery" onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div className={`${m.field} ${m.span2}`}>
          <label className="label">{t ? "Εφαρμόζεται σε μοντέλα" : "Applies to models"} (CSV ή *)</label>
          <input className="input" value={appliesTo} placeholder="WS101,EM300-TH ή *" onChange={(e) => setAppliesTo(e.target.value)} />
        </div>
        <label className={`${m.checkboxRow} ${m.span4}`}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {t ? "Ενεργό" : "Active"}
        </label>
      </div>
      <div className={m.saveBar}>
        <button type="submit" disabled={pending} className={`btn-primary ${m.saveBtn}`}>
          {pending ? <Loader2 size={16} className={m.spin} /> : <Save size={16} />}
          {t ? "Αποθήκευση" : "Save"}
        </button>
      </div>
    </form>
  );
}
