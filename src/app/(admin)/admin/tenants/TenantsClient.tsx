"use client";

import { Fragment, useState, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Plus, Search, Users, X, ChevronRight, MoreHorizontal,
  Eye, Pencil, Trash2, UserSearch,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import AfmLookup from "@/components/customers/AfmLookup";
import { deleteTenantAction } from "@/app/(admin)/admin/tenants/actions";
import s from "@/components/customers/customers.module.css";

interface Kad {
  id: number;
  kadCode: string;
  kadDescription: string;
  kadType: string;
}

interface CustomerDevice {
  id: string;
  devEui: string;
  name: string;
  model: string | null;
  online: boolean;
  lastSeenAt: string | null;
  battery: number | null;
}

interface Customer {
  id: string;
  afm: string | null;
  code: string | null;
  name: string | null;
  sotitle: string | null;
  isprosp: number;
  country: number | null;
  address: string | null;
  zip: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  phone01: string | null;
  phone02: string | null;
  jobtype: number | null;
  jobtypetrd: string | null;
  trdpgroup: number | null;
  webpage: string | null;
  email: string | null;
  emailacc: string | null;
  trdbusiness: number | null;
  irsdata: string | null;
  consent: boolean;
  prjcs: number | null;
  remark: string | null;
  registrationDate: string | null;
  numberOfEmployees: number | null;
  gemiCode: string | null;
  insdate?: string | null;
  upddate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  kads: Kad[];
  devices?: CustomerDevice[];
  _count: { kads: number; contacts: number; branches: number; devices?: number; users?: number };
}

interface Props {
  customers?: Customer[];
  locale: string;
}

export default function TenantsClient({ customers = [], locale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showNew = searchParams.get("new") === "1";
  const editId = searchParams.get("edit");
  const close = () => router.replace(pathname);
  const openNew = () => router.replace(`${pathname}?new=1`);
  const openEdit = (id: string) => router.replace(`${pathname}?edit=${id}`);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = locale === "el";

  const q = search.toLowerCase();
  const filtered = customers.filter((c) =>
    [c.name, c.sotitle, c.afm, c.email, c.city]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(q))
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onDelete(c: Customer) {
    if (!confirm(`${t ? "Διαγραφή πελάτη" : "Delete customer"} "${c.name || c.afm}";`)) return;
    startTransition(async () => {
      await deleteTenantAction(c.id);
      setMenuFor(null);
      router.refresh();
    });
  }

  const editing = editId ? customers.find((c) => c.id === editId) : null;
  const modalOpen = showNew || !!editing;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Users size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Πελάτες" : "Customers"}
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>
            ({customers.length})
          </span>
        </h1>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} />
          {t ? "Νέος Πελάτης" : "New Customer"}
        </button>
      </div>

      <div className={s.searchWrap}>
        <Search size={16} className={s.searchIcon} />
        <input
          className={`input ${s.searchInput}`}
          placeholder={t ? "Αναζήτηση επωνυμίας, ΑΦΜ, email..." : "Search name, VAT, email..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>{t ? "Επωνυμία" : "Name"}</th>
                <th>ΑΦΜ</th>
                <th>{t ? "ΔΟΥ" : "Tax Office"}</th>
                <th>{t ? "Πόλη" : "City"}</th>
                <th>{t ? "Επικοινωνία" : "Contact"}</th>
                <th>ΚΑΔ</th>
                <th>{t ? "Κατάσταση" : "Status"}</th>
                <th>{t ? "Ενημέρωση" : "Updated"}</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className={s.emptyCell}>
                    <UserSearch size={36} className={s.emptyIcon} />
                    <div className={s.emptyTitle}>
                      {t ? "Δεν βρέθηκαν πελάτες" : "No customers found"}
                    </div>
                    <div style={{ fontSize: "0.875rem" }}>
                      {search
                        ? (t ? "Δοκιμάστε διαφορετικούς όρους αναζήτησης" : "Try different search terms")
                        : (t ? "Πατήστε «Νέος Πελάτης» για να ξεκινήσετε" : "Click \"New Customer\" to start")}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isOpen = expanded.has(c.id);
                  return (
                    <Fragment key={c.id}>
                      <tr
                        className={`${s.row} ${isOpen ? s.rowExpanded : ""}`}
                        onClick={() => toggleExpand(c.id)}
                      >
                        <td onClick={(e) => e.stopPropagation()} style={{ paddingLeft: 12 }}>
                          <button
                            type="button"
                            onClick={() => toggleExpand(c.id)}
                            className={s.expandBtn}
                            aria-label={isOpen ? "Collapse" : "Expand"}
                          >
                            <ChevronRight
                              size={16}
                              className={`${s.chevron} ${isOpen ? s.chevronOpen : ""}`}
                            />
                          </button>
                        </td>
                        <td>
                          <div className={s.nameCell}>
                            <span className={s.avatar}>{initials(c.name || c.afm)}</span>
                            <div className={s.nameInner}>
                              <span className={s.nameMain}>{c.name || "—"}</span>
                              {c.sotitle && <span className={s.nameSub}>{c.sotitle}</span>}
                            </div>
                          </div>
                        </td>
                        <td className={s.afmCell}>{c.afm || "—"}</td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{c.irsdata || "—"}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{c.city || "—"}</td>
                        <td className={s.contactCell}>
                          {c.phone01 && <div>{c.phone01}</div>}
                          {c.email && <div>{c.email}</div>}
                          {!c.phone01 && !c.email && "—"}
                        </td>
                        <td>
                          <span className="badge badge-orange">{c._count.kads}</span>
                        </td>
                        <td>
                          <span className={`badge ${c.isprosp === 1 ? "badge-yellow" : "badge-green"}`}>
                            {c.isprosp === 1 ? (t ? "Prospect" : "Prospect") : (t ? "Πελάτης" : "Customer")}
                          </span>
                        </td>
                        <td className={s.metaCell}>
                          {c.updatedAt ? formatDate(c.updatedAt, locale === "el" ? "el-GR" : "en-GB") : "—"}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <RowMenu
                            isOpen={menuFor === c.id}
                            onToggle={() => setMenuFor(menuFor === c.id ? null : c.id)}
                            onView={() => { toggleExpand(c.id); setMenuFor(null); }}
                            onEdit={() => { openEdit(c.id); setMenuFor(null); }}
                            onDelete={() => onDelete(c)}
                            disabled={pending}
                            t={t}
                          />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={10} className={s.detailCell}>
                            <CustomerDetail c={c} t={t} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className={s.backdrop} onClick={close}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div className={s.modalTitle}>
                {editing ? <Pencil size={16} /> : <Plus size={16} />}
                {editing
                  ? `${t ? "Επεξεργασία" : "Edit"}: ${editing.name || editing.afm}`
                  : t ? "Νέος Πελάτης" : "New Customer"}
              </div>
              <button onClick={close} aria-label="Close" className={s.modalClose}>
                <X size={18} />
              </button>
            </div>
            <div className={s.modalBody}>
              <AfmLookup
                tenantId={editing?.id}
                initialForm={editing ? customerToForm(editing) : undefined}
                initialKads={editing?.kads.map((k) => ({
                  firm_act_code: k.kadCode,
                  firm_act_descr: k.kadDescription,
                  firm_act_kind: k.kadType,
                  firm_act_kind_descr: k.kadType === "1" ? "ΚΥΡΙΑ" : "ΔΕΥΤΕΡΕΥΟΥΣΑ",
                }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function customerToForm(c: Customer) {
  // c may have updatedAt instead of upddate (Tenant uses standard names)
  void c.upddate;
  const v = (x: string | number | null) => (x == null ? "" : String(x));
  return {
    afm: v(c.afm), code: v(c.code), name: v(c.name), sotitle: v(c.sotitle),
    isprosp: c.isprosp, country: v(c.country), address: v(c.address),
    zip: v(c.zip), district: v(c.district), city: v(c.city), area: v(c.area),
    latitude: v(c.latitude), longitude: v(c.longitude),
    phone01: v(c.phone01), phone02: v(c.phone02),
    jobtype: v(c.jobtype), jobtypetrd: v(c.jobtypetrd),
    trdpgroup: v(c.trdpgroup), webpage: v(c.webpage),
    email: v(c.email), emailacc: v(c.emailacc),
    trdbusiness: v(c.trdbusiness), irsdata: v(c.irsdata),
    consent: c.consent, prjcs: v(c.prjcs), remark: v(c.remark),
    registrationDate: typeof c.registrationDate === "string" ? c.registrationDate : "",
    numberOfEmployees: v(c.numberOfEmployees), gemiCode: v(c.gemiCode),
  };
}

function RowMenu({
  isOpen, onToggle, onView, onEdit, onDelete, disabled, t,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
  t: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onToggle();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className={s.menuWrap}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label="Actions"
        className={s.menuTrigger}
      >
        <MoreHorizontal size={16} />
      </button>
      {isOpen && (
        <div className={s.menu}>
          <button type="button" className={s.menuItem} onClick={onView}>
            <Eye size={14} /> {t ? "Προβολή" : "View"}
          </button>
          <button type="button" className={s.menuItem} onClick={onEdit}>
            <Pencil size={14} /> {t ? "Επεξεργασία" : "Edit"}
          </button>
          <div className={s.menuSeparator} />
          <button type="button" className={`${s.menuItem} ${s.menuItemDanger}`} onClick={onDelete}>
            <Trash2 size={14} /> {t ? "Διαγραφή" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

function CustomerDetail({ c, t }: { c: Customer; t: boolean }) {
  const [tab, setTab] = useState<"info" | "kads" | "devices">("info");
  const devCount = c.devices?.length ?? 0;
  const kadCount = c.kads.length;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", borderBottom: "1px solid var(--border)" }}>
        <DetailTab active={tab === "info"} onClick={() => setTab("info")}>
          {t ? "Στοιχεία" : "Info"}
        </DetailTab>
        <DetailTab active={tab === "kads"} onClick={() => setTab("kads")} count={kadCount}>
          ΚΑΔ
        </DetailTab>
        <DetailTab active={tab === "devices"} onClick={() => setTab("devices")} count={devCount}>
          {t ? "Συσκευές" : "Devices"}
        </DetailTab>
      </div>

      {tab === "info" && (
        <div className={s.detailWrap}>
          <DetailGroup title={t ? "Ταυτότητα" : "Identity"}>
            <DetailRow label={t ? "Κωδικός" : "Code"} value={c.code} />
            <DetailRow label={t ? "Διακριτικός" : "Title"} value={c.sotitle} />
            <DetailRow label="ΓΕΜΗ" value={c.gemiCode} />
            <DetailRow label={t ? "Έναρξη" : "Registered"} value={c.registrationDate ? formatDate(c.registrationDate, "el-GR") : null} />
            <DetailRow label={t ? "Εργαζόμενοι" : "Employees"} value={c.numberOfEmployees} />
            <DetailRow label="GDPR" value={c.consent ? "✓" : "✗"} />
          </DetailGroup>

          <DetailGroup title={t ? "Διεύθυνση" : "Address"}>
            <DetailRow label={t ? "Οδός" : "Street"} value={c.address} />
            <DetailRow label="ΤΚ" value={c.zip} />
            <DetailRow label={t ? "Πόλη" : "City"} value={c.city} />
            <DetailRow label={t ? "Νομός" : "District"} value={c.district} />
            <DetailRow label={t ? "Περιοχή" : "Area"} value={c.area} />
            <DetailRow label={t ? "Χώρα" : "Country"} value={c.country} />
          </DetailGroup>

          <DetailGroup title={t ? "Επικοινωνία" : "Contact"}>
            <DetailRow label={t ? "Τηλ. 1" : "Phone 1"} value={c.phone01} />
            <DetailRow label={t ? "Τηλ. 2" : "Phone 2"} value={c.phone02} />
            <DetailRow label="Email" value={c.email} />
            <DetailRow label={t ? "Email Λογ." : "Email Acc."} value={c.emailacc} />
            <DetailRow label="Web" value={c.webpage} />
          </DetailGroup>

          <DetailGroup title="Softone">
            <DetailRow label={t ? "Επάγγελμα" : "Job"} value={c.jobtypetrd || c.jobtype} />
            <DetailRow label="Trdpgroup" value={c.trdpgroup} />
            <DetailRow label="Trdbusiness" value={c.trdbusiness} />
            <DetailRow label={t ? "Έργα" : "Projects"} value={c.prjcs} />
          </DetailGroup>

          {c.remark && (
            <div className={s.detailFull}>
              <div className={s.detailGroupTitle}>{t ? "Σημειώσεις" : "Notes"}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                {c.remark}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "kads" && (
        <div style={{ padding: 24 }}>
          {kadCount === 0 ? (
            <div className={s.emptyCell}>{t ? "Δεν υπάρχουν ΚΑΔ" : "No KAD entries"}</div>
          ) : (
            <div className={s.kadList}>
              {c.kads.map((k) => (
                <div key={k.id} className={s.kadRow}>
                  <code className={s.kadCode}>{k.kadCode}</code>
                  <span className={s.kadDesc}>{k.kadDescription}</span>
                  <span className={`badge ${k.kadType === "1" ? "badge-orange" : "badge-gray"}`}>
                    {k.kadType === "1" ? (t ? "Κύρια" : "Primary") : (t ? "Δευτ." : "Secondary")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "devices" && (
        <div style={{ padding: 24 }}>
          {devCount === 0 ? (
            <div className={s.emptyCell}>
              {t
                ? "Δεν υπάρχουν συσκευές. Αντιστοιχίστε από το /admin/devices."
                : "No devices yet. Assign from /admin/devices."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {c.devices!.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius)", fontSize: "0.875rem",
                  }}
                >
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: d.online ? "var(--green)" : "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", minWidth: 120 }}>{d.name}</span>
                  <code style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                    {d.devEui}
                  </code>
                  {d.model && <span className="badge badge-gray">{d.model}</span>}
                  <span style={{ flex: 1 }} />
                  {typeof d.battery === "number" && (
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                      🔋 {d.battery}%
                    </span>
                  )}
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    {d.lastSeenAt
                      ? formatDate(d.lastSeenAt, t ? "el-GR" : "en-GB")
                      : (t ? "Ποτέ" : "Never")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailTab({
  active, onClick, count, children,
}: {
  active: boolean; onClick: () => void; count?: number; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--orange)" : "2px solid transparent",
        color: active ? "var(--orange)" : "var(--text-secondary)",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.8rem",
        marginBottom: -1,
        display: "flex", alignItems: "center", gap: 6,
      }}
    >
      {children}
      {count !== undefined && (
        <span className={`badge ${active ? "badge-orange" : "badge-gray"}`} style={{ fontSize: "0.65rem" }}>
          {count}
        </span>
      )}
    </button>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={s.detailGroup}>
      <div className={s.detailGroupTitle}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={s.detailRow}>
      <span className={s.detailLabel}>{label}</span>
      <span className={s.detailValue}>{value || "—"}</span>
    </div>
  );
}
