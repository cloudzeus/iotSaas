"use client";

import { Fragment, useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import { useRouter } from "next/navigation";

const LocationsMiniMap = dynamicImport(
  () => import("@/components/locations/LocationsMiniMap"),
  { ssr: false }
);
import {
  FiBriefcase, FiChevronRight, FiMoreHorizontal, FiEye, FiPlus, FiUserPlus,
  FiGrid, FiX, FiSave, FiLoader, FiAlertCircle, FiCheckCircle,
  FiCopy, FiSearch, FiCheck, FiCpu, FiUser, FiMapPin, FiEdit2, FiTrash2, FiKey,
} from "react-icons/fi";

const Building2 = FiBriefcase;
const ChevronRight = FiChevronRight;
const MoreHorizontal = FiMoreHorizontal;
const Eye = FiEye;
const Plus = FiPlus;
const UserPlus = FiUserPlus;
const LayoutDashboard = FiGrid;
const X = FiX;
const Save = FiSave;
const Loader2 = FiLoader;
const AlertCircle = FiAlertCircle;
const CheckCircle2 = FiCheckCircle;
const Copy = FiCopy;
const Search = FiSearch;
const Check = FiCheck;
const Cpu = FiCpu;
const UserRound = FiUser;
const MapPin = FiMapPin;
const Pencil = FiEdit2;
const Trash2 = FiTrash2;
const KeyRound = FiKey;
import m from "@/components/customers/customers.module.css";
import s from "@/components/customers/DataTable.module.css";
import {
  assignDeviceToTenantAction, createTenantUserAction, type CreateTenantUserResult,
  updateTenantUserAction, resetTenantUserPasswordAction, deleteTenantUserAction,
  setDeviceLocationAction,
} from "./actions";

interface DeviceLite {
  id: string; devEui: string; name: string; model: string | null;
  online: boolean; lastSeenAt: string | null; battery: number | null;
  locationId?: string | null;
}
interface UserLite {
  id: string; email: string; name: string; role: string;
  isActive: boolean; lastLoginAt: string | null;
}
interface LocationLite {
  id: string;
  name: string;
  isMain: boolean;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
}
interface Tenant {
  id: string; name: string; slug: string; isActive: boolean;
  createdAt: string; billingEmail: string | null;
  customer: { id: number; name: string; afm: string | null; city: string | null; email: string | null };
  plan: { name: string; pricePerDevice: number } | null;
  devices: DeviceLite[];
  users: UserLite[];
  locations: LocationLite[];
  _count: { devices: number; users: number; dashboards: number; invoices: number; locations: number };
}
interface UnassignedDevice {
  devEUI: string; name: string; model: string;
  applicationId: string | null; connectStatus: string;
}
interface PlanLite { id: string; name: string; }

interface Props {
  tenants: Tenant[];
  plans: PlanLite[];
  unassignedDevices: UnassignedDevice[];
  locale: string;
}

export default function TenantsClient({ tenants, plans: _plans, unassignedDevices, locale }: Props) {
  const router = useRouter();
  const t = locale === "el";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [addingDeviceTo, setAddingDeviceTo] = useState<Tenant | null>(null);
  const [addingUserTo, setAddingUserTo] = useState<Tenant | null>(null);
  const [editingUser, setEditingUser] = useState<{ tenantName: string; user: UserLite } | null>(null);

  function toggle(id: string) {
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Building2 size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "SaaS Tenants" : "SaaS Tenants"}
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>
            ({tenants.length})
          </span>
        </h1>
      </div>

      <div className={s.wrap}>
        <div className={s.scroll}>
          <table className={s.table}>
            <colgroup>
              <col style={{ width: 32 }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 40 }} />
            </colgroup>
            <thead>
              <tr>
                <th className={s.th}></th>
                <th className={s.th}>{t ? "Tenant" : "Tenant"}</th>
                <th className={s.th}>{t ? "CRM Πελάτης" : "CRM Customer"}</th>
                <th className={s.th}>{t ? "Πλάνο" : "Plan"}</th>
                <th className={s.th}>Email</th>
                <th className={s.th}>{t ? "Συσκ." : "Dev."}</th>
                <th className={s.th}>{t ? "Χρήστες" : "Users"}</th>
                <th className={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr><td colSpan={8} className={m.emptyCell}>
                  <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                    {t ? "Δεν υπάρχουν ενεργά tenants" : "No active tenants"}
                  </div>
                  <div style={{ fontSize: "0.85rem", marginTop: 6 }}>
                    {t
                      ? "Προωθήστε έναν πελάτη από το CRM σε tenant."
                      : "Promote a customer from the CRM page."}
                  </div>
                </td></tr>
              ) : tenants.map((tn) => {
                const isOpen = expanded.has(tn.id);
                return (
                  <Fragment key={tn.id}>
                    <tr className={s.tr}>
                      <td className={s.td} style={{ padding: "8px 8px 8px 12px" }}>
                        <button
                          type="button"
                          onClick={() => toggle(tn.id)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "inline-flex" }}
                        >
                          <ChevronRight size={14} style={{ transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0)" }} />
                        </button>
                      </td>
                      <td className={s.td}>
                        <div style={{ fontWeight: 600 }}>{tn.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{tn.slug}</div>
                      </td>
                      <td className={s.td}>
                        <Link
                          href={`/admin/customers/${tn.customer.id}`}
                          style={{ color: "var(--orange)", textDecoration: "none", fontSize: "0.85rem" }}
                        >
                          {tn.customer.name}
                        </Link>
                        {tn.customer.afm && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            ΑΦΜ {tn.customer.afm}
                          </div>
                        )}
                      </td>
                      <td className={s.td}>
                        {tn.plan ? <span className="badge badge-orange">{tn.plan.name}</span> : <span className="badge badge-gray">—</span>}
                      </td>
                      <td className={s.td} style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        {tn.billingEmail || "—"}
                      </td>
                      <td className={s.td}>{tn._count.devices}</td>
                      <td className={s.td}>{tn._count.users}</td>
                      <td className={s.td} style={{ position: "relative" }}>
                        <RowMenu
                          open={menuFor === tn.id}
                          onToggle={() => setMenuFor(menuFor === tn.id ? null : tn.id)}
                          onView={() => { toggle(tn.id); setMenuFor(null); }}
                          onAddDevice={() => { setAddingDeviceTo(tn); setMenuFor(null); }}
                          onAddUser={() => { setAddingUserTo(tn); setMenuFor(null); }}
                          onDashboard={() => router.push(`/admin/tenants/${tn.id}/dashboard`)}
                          onLocations={() => router.push(`/admin/tenants/${tn.id}/locations`)}
                          t={t}
                        />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} style={{ background: "var(--bg-elevated)", padding: 0 }}>
                          <TenantDetail
                            tn={tn}
                            t={t}
                            onEditUser={(u) => setEditingUser({ tenantName: tn.name, user: u })}
                          />
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

      {addingDeviceTo && (
        <AddDeviceModal
          tenant={addingDeviceTo}
          devices={unassignedDevices}
          onClose={() => setAddingDeviceTo(null)}
          t={t}
        />
      )}
      {addingUserTo && (
        <AddUserModal
          tenant={addingUserTo}
          onClose={() => setAddingUserTo(null)}
          t={t}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser.user}
          tenantName={editingUser.tenantName}
          onClose={() => setEditingUser(null)}
          t={t}
        />
      )}
    </div>
  );
}

function RowMenu({
  open, onToggle, onView, onAddDevice, onAddUser, onDashboard, onLocations, t,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onAddDevice: () => void;
  onAddUser: () => void;
  onDashboard: () => void;
  onLocations: () => void;
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
      <button type="button" onClick={onToggle} className={m.menuTrigger}>
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className={m.menu}>
          <button type="button" className={m.menuItem} onClick={onView}>
            <Eye size={14} /> {t ? "Προβολή" : "View"}
          </button>
          <button type="button" className={m.menuItem} onClick={onDashboard}>
            <LayoutDashboard size={14} /> {t ? "Dashboard" : "Dashboard"}
          </button>
          <button type="button" className={m.menuItem} onClick={onLocations}>
            <MapPin size={14} /> {t ? "Τοποθεσίες" : "Locations"}
          </button>
          <div className={m.menuSeparator} />
          <button type="button" className={m.menuItem} onClick={onAddDevice}>
            <Plus size={14} /> {t ? "Προσθήκη Συσκευής" : "Add Device"}
          </button>
          <button type="button" className={m.menuItem} onClick={onAddUser}>
            <UserPlus size={14} /> {t ? "Νέος Χρήστης" : "Add User"}
          </button>
        </div>
      )}
    </div>
  );
}

function TenantDetail({
  tn, t, onEditUser,
}: {
  tn: Tenant;
  t: boolean;
  onEditUser: (u: UserLite) => void;
}) {
  const pins = tn.locations
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: l.id,
      name: l.name,
      lat: l.latitude as number,
      lng: l.longitude as number,
      isMain: l.isMain,
    }));
  return (
    <div
      style={{
        padding: 20,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 16,
      }}
      className="tenant-detail-grid"
    >
      <style jsx>{`
        @media (max-width: 900px) {
          .tenant-detail-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>

      {/* LEFT: Devices — full column */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, minWidth: 0 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Cpu size={12} /> {t ? "Συσκευές" : "Devices"} ({tn.devices.length})
        </div>
        {tn.devices.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>—</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tn.devices.map((d) => (
              <DeviceRow key={d.id} d={d} locations={tn.locations} />
            ))}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Users (top) + Locations map (bottom) stacked */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, minWidth: 0 }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <UserRound size={12} /> {t ? "Χρήστες" : "Users"} ({tn.users.length})
          </div>
          {tn.users.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>—</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tn.users.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    background: "var(--bg-elevated)",
                    borderRadius: 6,
                    fontSize: "0.82rem",
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: "0 1 auto", minWidth: 0, maxWidth: 140 }}>
                    {u.name}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: 1 }}>
                    {u.email}
                  </span>
                  <span className="badge badge-blue" style={{ flexShrink: 0 }}>{u.role}</span>
                  {!u.isActive && <span className="badge badge-gray" style={{ flexShrink: 0 }}>inactive</span>}
                  <button
                    type="button"
                    onClick={() => onEditUser(u)}
                    aria-label="Edit user"
                    title={t ? "Διαχείριση" : "Manage"}
                    style={{
                      flexShrink: 0,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: 4,
                      borderRadius: 4,
                      display: "inline-flex",
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, minWidth: 0 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <MapPin size={12} /> {t ? "Τοποθεσίες" : "Locations"} ({tn.locations.length})
          </span>
          <Link href={`/admin/tenants/${tn.id}/locations`} style={{ color: "var(--orange)", textDecoration: "none", fontSize: "0.7rem", fontWeight: 600 }}>
            {t ? "Διαχείριση →" : "Manage →"}
          </Link>
        </div>
        {pins.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", padding: 20, textAlign: "center" }}>
            {t ? "Χωρίς συντεταγμένες" : "No coordinates yet"}
          </div>
        ) : (
          <>
            <LocationsMiniMap pins={pins} height={180} />
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
              {tn.locations.map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  <span style={{
                    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                    background: l.isMain ? "var(--orange)" : "var(--blue)", flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: l.isMain ? 600 : 400 }}>{l.name}</span>
                  {l.city && <span style={{ color: "var(--text-muted)" }}>· {l.city}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      </div>{/* /right column */}

      <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <Stat label={t ? "Συσκευές" : "Devices"} value={tn._count.devices} />
        <Stat label={t ? "Χρήστες" : "Users"} value={tn._count.users} />
        <Stat label={t ? "Dashboards" : "Dashboards"} value={tn._count.dashboards} />
        <Stat label={t ? "Τιμολόγια" : "Invoices"} value={tn._count.invoices} />
      </div>
    </div>
  );
}

function DeviceRow({ d, locations }: { d: DeviceLite; locations: LocationLite[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [locationId, setLocationId] = useState<string>(d.locationId ?? "");

  function change(newId: string) {
    setLocationId(newId);
    start(async () => {
      await setDeviceLocationAction({ deviceId: d.id, locationId: newId || null });
      router.refresh();
    });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: "var(--bg-elevated)",
        borderRadius: 6,
        fontSize: "0.82rem",
        minWidth: 0,
        opacity: pending ? 0.6 : 1,
      }}
    >
      <span
        title={d.online ? "Online" : "Offline"}
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: d.online ? "var(--green)" : "var(--red)",
          boxShadow: d.online ? "0 0 0 2px rgba(34,197,94,0.2)" : "0 0 0 2px rgba(239,68,68,0.2)",
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: "0 1 auto", minWidth: 0, maxWidth: 120 }}>
        {d.name}
      </span>
      <code style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: 1 }}>
        {d.devEui}
      </code>
      {d.model && (
        <span className="badge badge-gray" style={{ flexShrink: 0 }}>
          {d.model}
        </span>
      )}
      {typeof d.battery === "number" && (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.72rem", flexShrink: 0, whiteSpace: "nowrap" }}>
          🔋 {d.battery}%
        </span>
      )}
      <select
        value={locationId}
        onChange={(e) => change(e.target.value)}
        disabled={pending || locations.length === 0}
        title="Location"
        style={{
          flexShrink: 0,
          fontSize: "0.7rem",
          padding: "3px 6px",
          borderRadius: 4,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          color: "var(--text-secondary)",
          maxWidth: 110,
        }}
      >
        <option value="">— location —</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.isMain ? "★ " : ""}{l.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function AddDeviceModal({
  tenant, devices, onClose, t,
}: {
  tenant: Tenant;
  devices: UnassignedDevice[];
  onClose: () => void;
  t: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pickedEui, setPickedEui] = useState("");
  const mainLoc = tenant.locations.find((l) => l.isMain);
  const [locationId, setLocationId] = useState<string>(mainLoc?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const q = query.toLowerCase();
  const filtered = devices.filter((d) =>
    d.devEUI.toLowerCase().includes(q) ||
    d.name.toLowerCase().includes(q) ||
    d.model.toLowerCase().includes(q)
  );
  const picked = devices.find((d) => d.devEUI === pickedEui);

  function submit() {
    if (!picked) return;
    setError(null);
    start(async () => {
      try {
        await assignDeviceToTenantAction({
          tenantId: tenant.id,
          devEui: picked.devEUI,
          name: picked.name,
          model: picked.model,
          applicationId: picked.applicationId ?? undefined,
          locationId: locationId || null,
        });
        router.refresh();
        onClose();
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
            <Plus size={16} /> {t ? "Προσθήκη Συσκευής" : "Add Device"} · {tenant.name}
          </div>
          <button onClick={onClose} className={m.modalClose}><X size={18} /></button>
        </div>
        <div className={m.modalBody}>
          {error && <div className={`${m.alert} ${m.alertError}`} style={{ marginBottom: 12 }}><AlertCircle size={16} /> {error}</div>}
          {devices.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: 12 }}>
              {t ? "Δεν υπάρχουν μη αντιστοιχισμένες συσκευές στο Milesight." : "No unassigned Milesight devices available."}
            </div>
          ) : (
            <>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  className="input"
                  style={{ paddingLeft: 32 }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t ? "Αναζήτηση DevEUI/όνομα/μοντέλο..." : "Search DevEUI/name/model..."}
                />
              </div>
              {tenant.locations.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <label className="label">{t ? "Τοποθεσία" : "Location"}</label>
                  <select
                    className="input"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                  >
                    <option value="">{t ? "— καμία —" : "— none —"}</option>
                    {tenant.locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.isMain ? "★ " : ""}{l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                {filtered.map((d) => (
                  <button
                    key={d.devEUI}
                    type="button"
                    onClick={() => setPickedEui(d.devEUI)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "10px 12px", border: "none", cursor: "pointer",
                      background: pickedEui === d.devEUI ? "var(--orange-dim)" : "transparent",
                      color: pickedEui === d.devEUI ? "var(--orange)" : "var(--text-primary)",
                      textAlign: "left", fontSize: "0.85rem",
                      borderBottom: "1px solid var(--row-border)",
                    }}
                  >
                    {pickedEui === d.devEUI && <Check size={14} />}
                    <span style={{ fontWeight: 600, minWidth: 120 }}>{d.name}</span>
                    <code style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--text-muted)" }}>{d.devEUI}</code>
                    <span style={{ flex: 1 }} />
                    <span className="badge badge-gray">{d.model}</span>
                    <span className={`badge ${d.connectStatus === "ONLINE" ? "badge-green" : "badge-gray"}`}>{d.connectStatus}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className={m.saveBar}>
            <button type="button" disabled={!picked || pending} onClick={submit} className={`btn-primary ${m.saveBtn}`}>
              {pending ? <Loader2 size={16} className={m.spin} /> : <Save size={16} />}
              {t ? "Αντιστοίχιση" : "Assign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({
  user, tenantName, onClose, t,
}: {
  user: UserLite;
  tenantName: string;
  onClose: () => void;
  t: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<"CUSTOMER" | "OPERATOR" | "VIEWER">(user.role as "CUSTOMER" | "OPERATOR" | "VIEWER");
  const [isActive, setIsActive] = useState(user.isActive);
  const [error, setError] = useState<string | null>(null);
  const [resetPwd, setResetPwd] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await updateTenantUserAction({ userId: user.id, name, role, isActive });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function resetPassword() {
    if (!confirm(t ? "Επαναφορά κωδικού χρήστη;" : "Reset password?")) return;
    setError(null);
    start(async () => {
      try {
        const res = await resetTenantUserPasswordAction(user.id);
        setResetPwd(res.tempPassword);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function del() {
    if (!confirm(`${t ? "Διαγραφή χρήστη" : "Delete user"} "${user.email}";`)) return;
    setError(null);
    start(async () => {
      try {
        await deleteTenantUserAction(user.id);
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function copy(s: string) {
    navigator.clipboard.writeText(s);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={m.backdrop} onClick={onClose}>
      <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className={m.modalHeader}>
          <div className={m.modalTitle}>
            <UserRound size={16} /> {user.name} · {tenantName}
          </div>
          <button onClick={onClose} className={m.modalClose}><X size={18} /></button>
        </div>
        <div className={m.modalBody}>
          {error && (
            <div className={`${m.alert} ${m.alertError}`} style={{ marginBottom: 12 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {resetPwd && (
            <div style={{ marginBottom: 16, padding: 12, background: "var(--bg-elevated)", border: "1px solid var(--orange)", borderRadius: 6 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--orange)", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                {t ? "Νέος κωδικός — δώστε τον μια φορά" : "New password — shown once"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ flex: 1, fontFamily: "monospace", fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", background: "var(--bg-card)", padding: "8px 12px", borderRadius: 6 }}>
                  {resetPwd}
                </code>
                <button type="button" onClick={() => copy(resetPwd)} className="btn-secondary" style={{ padding: "8px 12px" }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={save} className={m.form}>
            <div className={m.grid4}>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">{t ? "Ονοματεπώνυμο" : "Full name"}</label>
                <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">Email</label>
                <input className="input" value={user.email} disabled />
              </div>
              <div className={`${m.field} ${m.span2}`}>
                <label className="label">{t ? "Ρόλος" : "Role"}</label>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                  <option value="CUSTOMER">Customer</option>
                  <option value="OPERATOR">Operator</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <div className={`${m.field} ${m.span2}`}>
                <label className={m.checkboxRow} style={{ marginTop: 20 }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  {t ? "Ενεργός" : "Active"}
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", padding: "14px 0", borderTop: "1px solid var(--border)", marginTop: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={resetPassword}
                  disabled={pending}
                  className="btn-secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}
                >
                  <KeyRound size={14} /> {t ? "Επαναφορά κωδικού" : "Reset password"}
                </button>
                <button
                  type="button"
                  onClick={del}
                  disabled={pending}
                  className="btn-secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--red)" }}
                >
                  <Trash2 size={14} /> {t ? "Διαγραφή" : "Delete"}
                </button>
              </div>
              <button type="submit" disabled={pending} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {t ? "Αποθήκευση" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddUserModal({ tenant, onClose, t }: { tenant: Tenant; onClose: () => void; t: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "OPERATOR" | "VIEWER">("CUSTOMER");
  const [password, setPassword] = useState("");
  const [receiveAlerts, setReceiveAlerts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateTenantUserResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const res = await createTenantUserAction({
          tenantId: tenant.id, email, name, role,
          password: password || undefined,
          receiveAlerts,
        });
        setResult(res);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={m.backdrop} onClick={onClose}>
      <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className={m.modalHeader}>
          <div className={m.modalTitle}>
            <UserPlus size={16} /> {t ? "Νέος Χρήστης" : "New User"} · {tenant.name}
          </div>
          <button onClick={onClose} className={m.modalClose}><X size={18} /></button>
        </div>
        <div className={m.modalBody}>
          {result ? (
            <>
              <div className={`${m.alert} ${m.alertSuccess}`}>
                <CheckCircle2 size={16} /> {t ? "Δημιουργήθηκε" : "Created"}
              </div>
              <div style={{ marginTop: 14, padding: 12, background: "var(--bg-elevated)", borderRadius: 6 }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 4 }}>{t ? "Email" : "Email"}</div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{result.email}</div>
              </div>
              <div style={{ marginTop: 10, padding: 12, background: "var(--bg-elevated)", borderRadius: 6, border: "1px solid var(--orange)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--orange)", marginBottom: 4, fontWeight: 700 }}>
                  {t ? "Προσωρινός κωδικός — δώστε τον μια φορά" : "Temporary password — shown once"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{
                    flex: 1, fontFamily: "monospace", fontSize: "1.05rem", fontWeight: 700,
                    color: "var(--text-primary)", background: "var(--bg-card)",
                    padding: "8px 12px", borderRadius: 6,
                  }}>
                    {result.tempPassword}
                  </code>
                  <button type="button" onClick={copy} className="btn-secondary" style={{ padding: "8px 12px" }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div className={m.saveBar}>
                <button type="button" className="btn-primary" onClick={onClose}>
                  {t ? "Κλείσιμο" : "Close"}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submit} className={m.form}>
              {error && <div className={`${m.alert} ${m.alertError}`}><AlertCircle size={16} /> {error}</div>}
              <div className={m.grid4}>
                <div className={`${m.field} ${m.span4}`}>
                  <label className="label">{t ? "Ονοματεπώνυμο" : "Full name"}</label>
                  <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className={`${m.field} ${m.span4}`}>
                  <label className="label">Email</label>
                  <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className={`${m.field} ${m.span2}`}>
                  <label className="label">{t ? "Ρόλος" : "Role"}</label>
                  <select className="input" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                    <option value="CUSTOMER">Customer (admin του tenant)</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
                <div className={`${m.field} ${m.span2}`}>
                  <label className="label">{t ? "Κωδικός (προαιρετικό)" : "Password (optional)"}</label>
                  <input
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t ? "αυτόματη παραγωγή" : "auto-generate"}
                  />
                </div>
                <label className={`${m.checkboxRow} ${m.span4}`}>
                  <input
                    type="checkbox"
                    checked={receiveAlerts}
                    onChange={(e) => setReceiveAlerts(e.target.checked)}
                  />
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    🔔 {t ? "Λήψη ειδοποιήσεων συσκευών" : "Receive device alerts"}
                  </span>
                </label>
              </div>
              <div className={m.saveBar}>
                <button type="submit" disabled={pending} className={`btn-primary ${m.saveBtn}`}>
                  {pending ? <Loader2 size={16} className={m.spin} /> : <Save size={16} />}
                  {t ? "Δημιουργία" : "Create"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
