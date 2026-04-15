"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiCpu, FiBatteryCharging, FiLink, FiX, FiLoader,
  FiSave, FiSlash, FiPlus, FiSearch, FiCheck,
} from "react-icons/fi";

const Cpu = FiCpu;
const Battery = FiBatteryCharging;
const LinkIcon = FiLink;
const X = FiX;
const Loader2 = FiLoader;
const Save = FiSave;
const Unlink = FiSlash;
const Plus = FiPlus;
const Search = FiSearch;
const Check = FiCheck;

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      title={online ? "Online" : "Offline"}
      style={{
        display: "inline-block",
        width: 10, height: 10, borderRadius: "50%",
        background: online ? "var(--green)" : "var(--red)",
        boxShadow: online
          ? "0 0 0 3px rgba(34,197,94,0.18)"
          : "0 0 0 3px rgba(239,68,68,0.18)",
      }}
    />
  );
}
import { assignDeviceAction, unassignDeviceAction, type DeviceListResult } from "./actions";
import m from "@/components/customers/customers.module.css";

interface Tenant { id: string; name: string; }
interface Props {
  data: DeviceListResult;
  tenants: Tenant[];
  locale: string;
}

export default function DevicesAdminClient({ data, tenants, locale }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"unassigned" | "assigned">(
    data.unassigned.length > 0 ? "unassigned" : "assigned"
  );
  const [assigning, setAssigning] = useState<{
    devEui: string; name: string; model?: string; applicationId?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const t = locale === "el";

  function onAssign(tenantId: string) {
    if (!assigning) return;
    startTransition(async () => {
      await assignDeviceAction({ ...assigning, tenantId });
      setAssigning(null);
      router.refresh();
    });
  }

  function onUnassign(devEui: string) {
    if (!confirm(t ? "Αφαίρεση αντιστοίχισης;" : "Remove device assignment?")) return;
    startTransition(async () => {
      await unassignDeviceAction(devEui);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Cpu size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Συσκευές" : "Devices"}
        </h1>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <TabBtn active={tab === "unassigned"} onClick={() => setTab("unassigned")} count={data.unassigned.length}>
          {t ? "Εκκρεμείς" : "Unassigned"}
        </TabBtn>
        <TabBtn active={tab === "assigned"} onClick={() => setTab("assigned")} count={data.assigned.length}>
          {t ? "Αντιστοιχισμένες" : "Assigned"}
        </TabBtn>
      </div>

      <div className="card">
        <div className="table-wrap">
          {tab === "unassigned" ? (
            <table>
              <thead>
                <tr>
                  <th>{t ? "Όνομα" : "Name"}</th>
                  <th>DevEUI</th>
                  <th>{t ? "Μοντέλο" : "Model"}</th>
                  <th>{t ? "Application" : "Application"}</th>
                  <th>{t ? "Κατάσταση" : "Status"}</th>
                  <th>{t ? "Μπαταρία" : "Battery"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.unassigned.length === 0 ? (
                  <tr><td colSpan={7} className={m.emptyCell}>
                    {t ? "Όλες οι συσκευές είναι αντιστοιχισμένες" : "All devices are assigned"}
                  </td></tr>
                ) : data.unassigned.map((d) => (
                  <tr key={d.devEUI}>
                    <td style={{ fontWeight: 500 }}>{d.name}</td>
                    <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.85rem" }}>{d.devEUI}</td>
                    <td><span className="badge badge-gray">{d.model}</span></td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{d.application?.applicationName ?? "—"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusDot online={d.connectStatus === "ONLINE"} />
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          {d.connectStatus === "ONLINE" ? "Online" : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {typeof d.electricity === "number"
                        ? <><Battery size={12} style={{ display: "inline", marginRight: 4 }} />{d.electricity}%</>
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                        onClick={() => setAssigning({
                          devEui: d.devEUI,
                          name: d.name,
                          model: d.model,
                          applicationId: d.application?.applicationId,
                        })}
                      >
                        <LinkIcon size={12} /> {t ? "Αντιστοίχιση" : "Assign"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t ? "Όνομα" : "Name"}</th>
                  <th>DevEUI</th>
                  <th>{t ? "Πελάτης" : "Tenant"}</th>
                  <th>{t ? "Μοντέλο" : "Model"}</th>
                  <th>{t ? "Κατάσταση" : "Status"}</th>
                  <th>{t ? "Τελευταία" : "Last Seen"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.assigned.length === 0 ? (
                  <tr><td colSpan={7} className={m.emptyCell}>
                    {t ? "Καμία συσκευή ακόμη" : "No devices assigned yet"}
                  </td></tr>
                ) : data.assigned.map((d) => (
                  <tr key={d.devEui}>
                    <td style={{ fontWeight: 500 }}>
                      <Link
                        href={`/admin/devices/${d.id}`}
                        style={{ color: "var(--text-primary)", textDecoration: "none" }}
                      >
                        {d.name}
                      </Link>
                    </td>
                    <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.85rem" }}>{d.devEui}</td>
                    <td><span className="badge badge-orange">{d.tenant.name}</span></td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{d.model || "—"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusDot online={d.online} />
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          {d.online ? "Online" : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString(locale === "el" ? "el-GR" : "en-GB") : "—"}
                    </td>
                    <td>
                      <button
                        className="btn-ghost"
                        style={{ padding: "4px 10px", fontSize: "0.78rem", color: "var(--red)" }}
                        onClick={() => onUnassign(d.devEui)}
                        disabled={pending}
                      >
                        <Unlink size={12} /> {t ? "Αφαίρεση" : "Unassign"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {assigning && (
        <div className={m.backdrop} onClick={() => setAssigning(null)}>
          <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className={m.modalHeader}>
              <div className={m.modalTitle}>
                <Plus size={16} /> {t ? "Αντιστοίχιση Συσκευής" : "Assign Device"}
              </div>
              <button onClick={() => setAssigning(null)} className={m.modalClose}><X size={18} /></button>
            </div>
            <div className={m.modalBody}>
              <div style={{ marginBottom: 16, padding: 12, background: "var(--bg-elevated)", borderRadius: 6 }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 4 }}>{t ? "Συσκευή" : "Device"}</div>
                <div style={{ fontWeight: 600 }}>{assigning.name}</div>
                <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{assigning.devEui}</div>
                {assigning.model && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{assigning.model}</div>}
              </div>

              <label className="label">{t ? "Επιλέξτε πελάτη" : "Select tenant"}</label>
              <TenantPicker tenants={tenants} disabled={pending} onPick={onAssign} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 16px",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--orange)" : "2px solid transparent",
        color: active ? "var(--orange)" : "var(--text-secondary)",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.875rem",
        marginBottom: -1,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
      <span className={`badge ${active ? "badge-orange" : "badge-gray"}`}>{count}</span>
    </button>
  );
}

function TenantPicker({
  tenants, disabled, onPick,
}: {
  tenants: Tenant[];
  disabled: boolean;
  onPick: (id: string) => void;
}) {
  const [tenantId, setTenantId] = useState("");
  const selected = tenants.find((t) => t.id === tenantId);

  if (tenants.length === 0) {
    return (
      <div style={{ padding: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, color: "var(--red)", fontSize: "0.85rem" }}>
        Δεν υπάρχουν διαθέσιμοι πελάτες. Δημιουργήστε έναν στο /admin/tenants πρώτα.
      </div>
    );
  }

  return (
    <>
      <Combobox
        items={tenants}
        value={tenantId}
        onChange={setTenantId}
        placeholder="Αναζήτηση πελάτη..."
        disabled={disabled}
        emptyText="Δεν βρέθηκαν πελάτες"
      />
      {selected && (
        <div style={{ marginTop: 8, padding: "6px 10px", background: "var(--orange-dim)", color: "var(--orange)", borderRadius: 6, fontSize: "0.8rem" }}>
          ✓ {selected.name}
        </div>
      )}
      <div className={m.saveBar}>
        <button
          type="button"
          className={`btn-primary ${m.saveBtn}`}
          disabled={disabled || !tenantId}
          onClick={() => onPick(tenantId)}
        >
          {disabled ? <Loader2 size={16} className={m.spin} /> : <Save size={16} />}
          Αντιστοίχιση
        </button>
      </div>
    </>
  );
}

function Combobox({
  items, value, onChange, placeholder, disabled, emptyText,
}: {
  items: Array<{ id: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : items;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => { setActiveIdx(0); }, [query]);

  function pick(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); setOpen(true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIdx]) pick(filtered[activeIdx].id); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          ref={inputRef}
          className="input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          disabled={disabled}
          style={{ paddingLeft: 32 }}
        />
      </div>
      {open && (
        <div style={{
          position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", boxShadow: "var(--shadow)",
          maxHeight: 240, overflowY: "auto", zIndex: 50,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 12, color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
              {emptyText}
            </div>
          ) : filtered.map((it, idx) => (
            <button
              key={it.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(it.id); }}
              onMouseEnter={() => setActiveIdx(idx)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "8px 12px", border: "none",
                background: idx === activeIdx ? "var(--bg-elevated)" : "transparent",
                cursor: "pointer", textAlign: "left",
                color: it.id === value ? "var(--orange)" : "var(--text-primary)",
                fontWeight: it.id === value ? 600 : 400,
                fontSize: "0.875rem",
              }}
            >
              {it.id === value && <Check size={14} />}
              <span style={{ marginLeft: it.id === value ? 0 : 22 }}>{it.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
