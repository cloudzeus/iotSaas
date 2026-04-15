"use client";

import {
  Fragment, useState, useEffect, useRef, useTransition,
} from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  FiUsers, FiSearch, FiChevronLeft, FiChevronRight, FiColumns, FiLink,
  FiHome, FiPhone, FiMail, FiMoreHorizontal, FiEye, FiEdit2,
  FiZap, FiX, FiSave, FiLoader, FiAlertCircle, FiCheckCircle,
} from "react-icons/fi";

const Users = FiUsers;
const Search = FiSearch;
const ChevronLeft = FiChevronLeft;
const ChevronRight = FiChevronRight;
const Columns = FiColumns;
const LinkIcon = FiLink;
const Building2 = FiHome;
const Phone = FiPhone;
const Mail = FiMail;
const Chevron = FiChevronRight;
const MoreHorizontal = FiMoreHorizontal;
const Eye = FiEye;
const Pencil = FiEdit2;
const Sparkles = FiZap;
const X = FiX;
const Save = FiSave;
const Loader2 = FiLoader;
const AlertCircle = FiAlertCircle;
const CheckCircle2 = FiCheckCircle;
import m from "@/components/customers/customers.module.css";
import s from "@/components/customers/DataTable.module.css";
import { promoteToTenantAction } from "./actions";

interface Kad { id: number; kadCode: string; kadDescription: string; kadType: string; }

interface Customer {
  id: number;
  trdr: number | null;
  code: string | null;
  name: string;
  afm: string | null;
  sotitle: string | null;
  city: string | null;
  address: string | null;
  zip: string | null;
  district: string | null;
  email: string | null;
  emailacc: string | null;
  phone01: string | null;
  phone02: string | null;
  webpage: string | null;
  irsdata: string | null;
  jobtypetrd: string | null;
  gemiCode: string | null;
  updatedAt: string;
  kads: Kad[];
  _count: { kads: number; contacts: number; branches: number };
  tenant: { id: string; name: string } | null;
}

interface Plan { id: string; name: string; pricePerDevice: number; }

interface ColDef {
  id: string;
  label: string;
  defaultWidth: number;
  defaultVisible: boolean;
  render: (c: Customer) => React.ReactNode;
}

const COLUMNS: ColDef[] = [
  {
    id: "name",
    label: "Επωνυμία",
    defaultWidth: 340,
    defaultVisible: true,
    render: (c) => (
      <Link
        href={`/admin/customers/${c.id}`}
        style={{ display: "flex", alignItems: "flex-start", gap: 10, textDecoration: "none", minWidth: 0 }}
      >
        <span className={m.avatar} style={{ flexShrink: 0 }}>{initials(c.name)}</span>
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 2 }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</span>
          {c.sotitle && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{c.sotitle}</span>}
        </span>
      </Link>
    ),
  },
  { id: "trdr", label: "TRDR", defaultWidth: 80, defaultVisible: false, render: (c) => <code style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{c.trdr ?? "—"}</code> },
  { id: "code", label: "Κωδικός", defaultWidth: 100, defaultVisible: false, render: (c) => c.code ?? "—" },
  { id: "afm", label: "ΑΦΜ", defaultWidth: 110, defaultVisible: true, render: (c) => <code style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{c.afm ?? "—"}</code> },
  { id: "irsdata", label: "ΔΟΥ", defaultWidth: 160, defaultVisible: false, render: (c) => c.irsdata ?? "—" },
  {
    id: "location",
    label: "Τοποθεσία",
    defaultWidth: 180,
    defaultVisible: true,
    render: (c) => c.city ? (<span><Building2 size={11} style={{ display: "inline", marginRight: 4, color: "var(--text-muted)" }} />{c.city}</span>) : "—",
  },
  { id: "address", label: "Διεύθυνση", defaultWidth: 220, defaultVisible: false, render: (c) => [c.address, c.zip].filter(Boolean).join(", ") || "—" },
  {
    id: "contact",
    label: "Επικοινωνία",
    defaultWidth: 220,
    defaultVisible: true,
    render: (c) => (
      <div style={{ fontSize: "0.78rem" }}>
        {c.email && <div><Mail size={11} style={{ display: "inline", marginRight: 4, color: "var(--text-muted)" }} />{c.email}</div>}
        {c.phone01 && <div><Phone size={11} style={{ display: "inline", marginRight: 4, color: "var(--text-muted)" }} />{c.phone01}</div>}
        {!c.email && !c.phone01 && "—"}
      </div>
    ),
  },
  { id: "webpage", label: "Ιστοσελίδα", defaultWidth: 180, defaultVisible: false, render: (c) => c.webpage ?? "—" },
  { id: "jobtypetrd", label: "Επάγγελμα", defaultWidth: 180, defaultVisible: false, render: (c) => c.jobtypetrd ?? "—" },
  { id: "gemiCode", label: "ΓΕΜΗ", defaultWidth: 120, defaultVisible: false, render: (c) => c.gemiCode ?? "—" },
  { id: "kads", label: "ΚΑΔ", defaultWidth: 70, defaultVisible: true, render: (c) => c._count.kads > 0 ? <span className="badge badge-orange">{c._count.kads}</span> : <span style={{ color: "var(--text-muted)" }}>—</span> },
  {
    id: "tenant", label: "SaaS", defaultWidth: 120, defaultVisible: true,
    render: (c) => c.tenant ? <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><LinkIcon size={10} /> Ενεργός</span> : <span className="badge badge-gray">CRM</span>,
  },
];

const COLUMNS_KEY = "customers.visibleCols.v2";
const WIDTHS_KEY = "customers.widths.v2";

interface Props {
  customers: Customer[];
  plans: Plan[];
  total: number;
  page: number;
  pageSize: string;
  query: string;
  locale: string;
}

export default function CustomersClient({ customers, plans, total, page, pageSize, query, locale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = locale === "el";
  const [q, setQ] = useState(query);
  const [, startTransition] = useTransition();

  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [colsMenuOpen, setColsMenuOpen] = useState(false);
  const colsMenuRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [rowMenu, setRowMenu] = useState<number | null>(null);
  const [promoting, setPromoting] = useState<Customer | null>(null);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(COLUMNS_KEY) ?? "null") as Record<string, boolean> | null;
      const w = JSON.parse(localStorage.getItem(WIDTHS_KEY) ?? "null") as Record<string, number> | null;
      setVisible(v ?? Object.fromEntries(COLUMNS.map((c) => [c.id, c.defaultVisible])));
      setWidths(w ?? Object.fromEntries(COLUMNS.map((c) => [c.id, c.defaultWidth])));
    } catch {
      setVisible(Object.fromEntries(COLUMNS.map((c) => [c.id, c.defaultVisible])));
      setWidths(Object.fromEntries(COLUMNS.map((c) => [c.id, c.defaultWidth])));
    }
  }, []);

  useEffect(() => { if (Object.keys(visible).length) localStorage.setItem(COLUMNS_KEY, JSON.stringify(visible)); }, [visible]);
  useEffect(() => { if (Object.keys(widths).length) localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths)); }, [widths]);

  useEffect(() => {
    if (!colsMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (colsMenuRef.current && !colsMenuRef.current.contains(e.target as Node)) setColsMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [colsMenuOpen]);

  const shownCols = COLUMNS.filter((c) => visible[c.id]);
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / Number(pageSize)));

  function goPage(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    if (pageSize && pageSize !== "50") params.set("size", pageSize);
    startTransition(() => router.replace(`${pathname}${params.toString() ? "?" + params.toString() : ""}`));
  }

  function onSearch(e: React.FormEvent) { e.preventDefault(); goPage(1); }

  function changeSize(newSize: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (newSize !== "50") params.set("size", newSize);
    startTransition(() => router.replace(`${pathname}${params.toString() ? "?" + params.toString() : ""}`));
  }

  function startResize(colId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = widths[colId] ?? 150;
    const onMove = (ev: MouseEvent) => setWidths((p) => ({ ...p, [colId]: Math.max(60, startW + (ev.clientX - startX)) }));
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Users size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Πελάτες (CRM)" : "Customers (CRM)"}
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>
            ({total.toLocaleString(t ? "el-GR" : "en-GB")})
          </span>
        </h1>
      </div>

      <div className={s.wrap}>
        <div className={s.toolbar}>
          <form onSubmit={onSearch} style={{ position: "relative", flex: "1 1 320px", maxWidth: 420 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input className="input" style={{ paddingLeft: 32 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t ? "Αναζήτηση..." : "Search..."} />
          </form>
          <span className={s.tbar}>
            {t ? "Εγγραφές" : "Rows"}:
            <select className={s.select} value={pageSize} onChange={(e) => changeSize(e.target.value)}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="all">{t ? "Όλες" : "All"}</option>
            </select>
          </span>
          <div ref={colsMenuRef} className={s.columnsMenuWrap} style={{ marginLeft: "auto" }}>
            <button type="button" className={s.ghostBtn} onClick={() => setColsMenuOpen((o) => !o)}>
              <Columns size={14} />
              {t ? "Στήλες" : "Columns"} ({shownCols.length}/{COLUMNS.length})
            </button>
            {colsMenuOpen && (
              <div className={s.columnsMenu}>
                {COLUMNS.map((c) => (
                  <label key={c.id} className={s.columnsMenuItem}>
                    <input type="checkbox" checked={visible[c.id] ?? false} onChange={(e) => setVisible((p) => ({ ...p, [c.id]: e.target.checked }))} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={s.scroll}>
          <table className={s.table}>
            <colgroup>
              <col style={{ width: 32 }} />
              {shownCols.map((c) => (
                <col key={c.id} style={{ width: widths[c.id] ?? c.defaultWidth }} />
              ))}
              <col style={{ width: 50 }} />
            </colgroup>
            <thead>
              <tr>
                <th className={s.th}></th>
                {shownCols.map((c) => (
                  <th key={c.id} className={s.th}>
                    {c.label}
                    <span className={s.resizer} onMouseDown={(e) => startResize(c.id, e)} />
                  </th>
                ))}
                <th className={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={shownCols.length + 2} className={m.emptyCell}>
                  {t ? "Δεν βρέθηκαν πελάτες" : "No customers found"}
                </td></tr>
              ) : customers.map((c) => {
                const isOpen = expanded.has(c.id);
                return (
                  <Fragment key={c.id}>
                    <tr className={s.tr}>
                      <td className={s.td} style={{ padding: "8px 8px 8px 12px" }}>
                        <button
                          type="button"
                          onClick={() => toggleExpand(c.id)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "inline-flex" }}
                          aria-label={isOpen ? "Collapse" : "Expand"}
                        >
                          <Chevron size={14} style={{ transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0)" }} />
                        </button>
                      </td>
                      {shownCols.map((col) => (
                        <td key={col.id} className={s.td}>{col.render(c)}</td>
                      ))}
                      <td className={s.td} style={{ position: "relative" }}>
                        <RowMenu
                          open={rowMenu === c.id}
                          onToggle={() => setRowMenu(rowMenu === c.id ? null : c.id)}
                          onView={() => { toggleExpand(c.id); setRowMenu(null); }}
                          onPromote={() => { setPromoting(c); setRowMenu(null); }}
                          canPromote={!c.tenant}
                          t={t}
                        />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={shownCols.length + 2} style={{ padding: 0, background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                          <CustomerDetail c={c} t={t} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={s.footer}>
          <span>
            {pageSize === "all"
              ? <>{customers.length.toLocaleString(t ? "el-GR" : "en-GB")} {t ? "εγγραφές" : "rows"}</>
              : <>{t ? "Σελίδα" : "Page"} {page} / {totalPages} · {total.toLocaleString(t ? "el-GR" : "en-GB")} {t ? "εγγραφές" : "rows"}</>}
          </span>
          {pageSize !== "all" && (
            <div className={s.pager}>
              <button type="button" className={s.pagerBtn} disabled={page <= 1} onClick={() => goPage(page - 1)}>
                <ChevronLeft size={14} /> {t ? "Πίσω" : "Prev"}
              </button>
              <button type="button" className={s.pagerBtn} disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
                {t ? "Επόμενη" : "Next"} <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {promoting && (
        <PromoteModal
          customer={promoting}
          plans={plans}
          onClose={() => setPromoting(null)}
          t={t}
        />
      )}
    </div>
  );
}

function RowMenu({ open, onToggle, onView, onPromote, canPromote, t }: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onPromote: () => void;
  canPromote: boolean;
  t: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onToggle(); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onToggle(); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open, onToggle]);

  return (
    <div ref={ref} className={m.menuWrap}>
      <button type="button" onClick={onToggle} className={m.menuTrigger} aria-label="Actions">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className={m.menu}>
          <button type="button" className={m.menuItem} onClick={onView}>
            <Eye size={14} /> {t ? "Προβολή" : "View"}
          </button>
          <Link href="#" className={m.menuItem} onClick={(e) => e.preventDefault()} style={{ pointerEvents: "none", opacity: 0.5 }}>
            <Pencil size={14} /> {t ? "Επεξεργασία" : "Edit"}
          </Link>
          <div className={m.menuSeparator} />
          <button
            type="button"
            className={m.menuItem}
            onClick={onPromote}
            disabled={!canPromote}
            style={{
              color: canPromote ? "var(--orange)" : "var(--text-muted)",
              cursor: canPromote ? "pointer" : "not-allowed",
              opacity: canPromote ? 1 : 0.5,
            }}
          >
            <Sparkles size={14} /> {t ? "Νέος Tenant" : "New Tenant"}
          </button>
        </div>
      )}
    </div>
  );
}

function PromoteModal({ customer, plans, onClose, t }: {
  customer: Customer;
  plans: Plan[];
  onClose: () => void;
  t: boolean;
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [billingEmail, setBillingEmail] = useState(customer.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const res = await promoteToTenantAction({
          customerId: customer.id,
          planId: planId || undefined,
          billingEmail: billingEmail || undefined,
        });
        setDone(res.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className={m.backdrop} onClick={onClose}>
      <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className={m.modalHeader}>
          <div className={m.modalTitle}>
            <Sparkles size={16} />
            {t ? "Δημιουργία Tenant" : "Create Tenant"}
          </div>
          <button onClick={onClose} className={m.modalClose}><X size={18} /></button>
        </div>
        <div className={m.modalBody}>
          <div style={{ padding: 12, background: "var(--bg-elevated)", borderRadius: 6, marginBottom: 16 }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 4 }}>{t ? "Από πελάτη CRM" : "From CRM customer"}</div>
            <div style={{ fontWeight: 600 }}>{customer.name}</div>
            {customer.afm && <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-secondary)" }}>ΑΦΜ {customer.afm}</div>}
          </div>

          {error && (
            <div className={`${m.alert} ${m.alertError}`} style={{ marginBottom: 12 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {done && (
            <div className={`${m.alert} ${m.alertSuccess}`} style={{ marginBottom: 12 }}>
              <CheckCircle2 size={16} /> {t ? "Δημιουργήθηκε" : "Created"}
            </div>
          )}

          <form onSubmit={submit} className={m.form}>
            <div className={m.grid4}>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">{t ? "Πλάνο τιμολόγησης" : "Billing plan"}</label>
                <select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                  <option value="">{t ? "Χωρίς πλάνο" : "No plan"}</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — €{Number(p.pricePerDevice).toFixed(2)}/device/mo
                    </option>
                  ))}
                </select>
              </div>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">{t ? "Email Χρέωσης" : "Billing email"}</label>
                <input
                  className="input"
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder={customer.email ?? "billing@example.com"}
                />
              </div>
            </div>
            <div className={m.saveBar}>
              <button type="submit" disabled={pending || !!done} className={`btn-primary ${m.saveBtn}`}>
                {pending ? <Loader2 size={16} className={m.spin} /> : <Save size={16} />}
                {t ? "Δημιουργία Tenant" : "Create Tenant"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({ c, t }: { c: Customer; t: boolean }) {
  return (
    <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
      <DetailGroup title={t ? "Ταυτότητα" : "Identity"}>
        <Row label="TRDR" v={c.trdr} />
        <Row label={t ? "Κωδικός" : "Code"} v={c.code} />
        <Row label={t ? "Διακριτικός" : "Title"} v={c.sotitle} />
        <Row label="ΓΕΜΗ" v={c.gemiCode} />
      </DetailGroup>
      <DetailGroup title={t ? "Διεύθυνση" : "Address"}>
        <Row label={t ? "Οδός" : "Street"} v={c.address} />
        <Row label="ΤΚ" v={c.zip} />
        <Row label={t ? "Πόλη" : "City"} v={c.city} />
        <Row label={t ? "Νομός" : "District"} v={c.district} />
        <Row label="ΔΟΥ" v={c.irsdata} />
      </DetailGroup>
      <DetailGroup title={t ? "Επικοινωνία" : "Contact"}>
        <Row label={t ? "Τηλ. 1" : "Phone 1"} v={c.phone01} />
        <Row label={t ? "Τηλ. 2" : "Phone 2"} v={c.phone02} />
        <Row label="Email" v={c.email} />
        <Row label={t ? "Email Λογ." : "Email Acc."} v={c.emailacc} />
        <Row label="Web" v={c.webpage} />
      </DetailGroup>
      <DetailGroup title="Softone">
        <Row label={t ? "Επάγγελμα" : "Job"} v={c.jobtypetrd} />
        <Row label={t ? "Υποκαταστήματα" : "Branches"} v={c._count.branches} />
        <Row label={t ? "Επαφές" : "Contacts"} v={c._count.contacts} />
      </DetailGroup>

      {c.kads.length > 0 && (
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 8 }}>
            ΚΑΔ ({c.kads.length})
          </div>
          <div className={m.kadList}>
            {c.kads.map((k) => (
              <div key={k.id} className={m.kadRow}>
                <code className={m.kadCode}>{k.kadCode}</code>
                <span className={m.kadDesc}>{k.kadDescription}</span>
                <span className={`badge ${k.kadType === "1" ? "badge-orange" : "badge-gray"}`}>
                  {k.kadType === "1" ? (t ? "Κύρια" : "Primary") : (t ? "Δευτ." : "Secondary")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14 }}>
      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string | number | null | undefined }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.8rem", padding: "3px 0" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", textAlign: "right" }}>{v || "—"}</span>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
