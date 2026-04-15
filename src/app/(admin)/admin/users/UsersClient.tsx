"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  FiUsers, FiUserPlus, FiSearch, FiMoreHorizontal, FiEdit2,
  FiTrash2, FiKey, FiX, FiSave, FiLoader, FiAlertCircle,
  FiCheckCircle, FiCopy, FiCheck,
} from "react-icons/fi";
import m from "@/components/customers/customers.module.css";
import s from "@/components/customers/DataTable.module.css";
import {
  createUserAction, updateUserAction, resetUserPasswordAction, deleteUserAction,
  type UserRoleCode, type CreateUserResult,
} from "./actions";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: UserRoleCode;
  isActive: boolean;
  receiveAlerts: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  tenant: { id: string; name: string } | null;
}

interface TenantLite { id: string; name: string; }

interface Props {
  users: UserRow[];
  tenants: TenantLite[];
  countsByRole: Record<string, number>;
  query: string;
  filterRole: string;
  filterTenant: string;
  locale: string;
}

const ROLE_LABELS_EL: Record<UserRoleCode, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Διαχειριστής",
  CUSTOMER: "Πελάτης",
  OPERATOR: "Χειριστής",
  VIEWER: "Θεατής",
};
const ROLE_COLORS: Record<UserRoleCode, string> = {
  SUPER_ADMIN: "badge-red",
  ADMIN: "badge-orange",
  CUSTOMER: "badge-blue",
  OPERATOR: "badge-green",
  VIEWER: "badge-gray",
};

export default function UsersClient({
  users, tenants, countsByRole, query, filterRole, filterTenant, locale,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = locale === "el";
  const [q, setQ] = useState(query);
  const [, startTransition] = useTransition();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  function goFilter(extras: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filterRole) params.set("role", filterRole);
    if (filterTenant) params.set("tenant", filterTenant);
    for (const [k, v] of Object.entries(extras)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => router.replace(`${pathname}${params.toString() ? "?" + params.toString() : ""}`));
  }

  function onSearch(e: React.FormEvent) { e.preventDefault(); goFilter({ q }); }

  const roles: UserRoleCode[] = ["SUPER_ADMIN", "ADMIN", "CUSTOMER", "OPERATOR", "VIEWER"];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <FiUsers size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Χρήστες" : "Users"}
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>
            ({users.length})
          </span>
        </h1>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <FiUserPlus size={14} /> {t ? "Νέος Χρήστης" : "New User"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {roles.map((r) => (
          <div
            key={r}
            style={{
              padding: "8px 14px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "0.8rem",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span className={`badge ${ROLE_COLORS[r]}`}>{t ? ROLE_LABELS_EL[r] : r}</span>
            <strong style={{ color: "var(--text-primary)" }}>{countsByRole[r] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div className={s.wrap}>
        <div className={s.toolbar}>
          <form onSubmit={onSearch} style={{ position: "relative", flex: "1 1 280px", maxWidth: 380 }}>
            <FiSearch size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t ? "Αναζήτηση email ή ονόματος..." : "Search email or name..."}
            />
          </form>

          <select
            className={s.select}
            value={filterRole}
            onChange={(e) => goFilter({ role: e.target.value })}
          >
            <option value="">{t ? "Όλοι οι ρόλοι" : "All roles"}</option>
            {roles.map((r) => (
              <option key={r} value={r}>{t ? ROLE_LABELS_EL[r] : r}</option>
            ))}
          </select>

          <select
            className={s.select}
            value={filterTenant}
            onChange={(e) => goFilter({ tenant: e.target.value })}
          >
            <option value="">{t ? "Όλοι οι tenants" : "All tenants"}</option>
            <option value="none">{t ? "— Χωρίς tenant (Platform staff) —" : "— No tenant (Platform staff) —"}</option>
            {tenants.map((tn) => (
              <option key={tn.id} value={tn.id}>{tn.name}</option>
            ))}
          </select>
        </div>

        <div className={s.scroll}>
          <table className={s.table}>
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 60 }} />
            </colgroup>
            <thead>
              <tr>
                <th className={s.th}>{t ? "Χρήστης" : "User"}</th>
                <th className={s.th}>Email</th>
                <th className={s.th}>{t ? "Tenant" : "Tenant"}</th>
                <th className={s.th}>{t ? "Ρόλος" : "Role"}</th>
                <th className={s.th}>{t ? "Τελευταία σύνδεση" : "Last login"}</th>
                <th className={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className={m.emptyCell}>
                  {t ? "Δεν βρέθηκαν χρήστες" : "No users found"}
                </td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className={s.tr}>
                  <td className={s.td}>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    {!u.isActive && <span className="badge badge-gray" style={{ marginTop: 2 }}>{t ? "Ανενεργός" : "Inactive"}</span>}
                    {u.receiveAlerts && <span className="badge badge-yellow" style={{ marginTop: 2, marginLeft: 4 }}>🔔</span>}
                  </td>
                  <td className={s.td} style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{u.email}</td>
                  <td className={s.td}>
                    {u.tenant ? (
                      <span className="badge badge-orange">{u.tenant.name}</span>
                    ) : (
                      <span className="badge badge-gray">{t ? "Platform" : "Platform"}</span>
                    )}
                  </td>
                  <td className={s.td}>
                    <span className={`badge ${ROLE_COLORS[u.role]}`}>{t ? ROLE_LABELS_EL[u.role] : u.role}</span>
                  </td>
                  <td className={s.td} style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString(t ? "el-GR" : "en-GB") : "—"}
                  </td>
                  <td className={s.td}>
                    <button
                      type="button"
                      onClick={() => setEditing(u)}
                      aria-label="Edit"
                      className={m.menuTrigger}
                    >
                      <FiMoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {adding && (
        <UserModal
          mode="new"
          tenants={tenants}
          onClose={() => setAdding(false)}
          t={t}
        />
      )}
      {editing && (
        <UserModal
          mode="edit"
          initial={editing}
          tenants={tenants}
          onClose={() => setEditing(null)}
          t={t}
        />
      )}
    </div>
  );
}

function UserModal({
  mode, initial, tenants, onClose, t,
}: {
  mode: "new" | "edit";
  initial?: UserRow;
  tenants: TenantLite[];
  onClose: () => void;
  t: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<UserRoleCode>((initial?.role as UserRoleCode) ?? "CUSTOMER");
  const [tenantId, setTenantId] = useState<string>(initial?.tenant?.id ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [receiveAlerts, setReceiveAlerts] = useState(initial?.receiveAlerts ?? false);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<CreateUserResult | null>(null);
  const [resetPwd, setResetPwd] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const platformRole = role === "SUPER_ADMIN" || role === "ADMIN";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        if (mode === "new") {
          const res = await createUserAction({
            email, name, role,
            tenantId: platformRole ? null : (tenantId || null),
            receiveAlerts,
            password: password || undefined,
          });
          setResult(res);
          router.refresh();
        } else if (initial) {
          await updateUserAction({
            userId: initial.id,
            name, role,
            tenantId: platformRole ? null : (tenantId || null),
            isActive,
            receiveAlerts,
          });
          router.refresh();
          onClose();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function resetPassword() {
    if (!initial) return;
    if (!confirm(t ? "Επαναφορά κωδικού;" : "Reset password?")) return;
    start(async () => {
      try {
        const r = await resetUserPasswordAction(initial.id);
        setResetPwd(r.tempPassword);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function del() {
    if (!initial) return;
    if (!confirm(`${t ? "Διαγραφή" : "Delete"} "${initial.email}";`)) return;
    start(async () => {
      try {
        await deleteUserAction(initial.id);
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

  const roles: UserRoleCode[] = ["SUPER_ADMIN", "ADMIN", "CUSTOMER", "OPERATOR", "VIEWER"];

  return (
    <div className={m.backdrop} onClick={onClose}>
      <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className={m.modalHeader}>
          <div className={m.modalTitle}>
            {mode === "new" ? <FiUserPlus size={16} /> : <FiEdit2 size={16} />}
            {mode === "new"
              ? (t ? "Νέος Χρήστης" : "New User")
              : `${initial?.name}`}
          </div>
          <button onClick={onClose} className={m.modalClose}><FiX size={18} /></button>
        </div>
        <div className={m.modalBody}>
          {error && (
            <div className={`${m.alert} ${m.alertError}`} style={{ marginBottom: 12 }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}

          {(result || resetPwd) && (
            <div style={{ marginBottom: 16, padding: 12, background: "var(--bg-elevated)", border: "1px solid var(--orange)", borderRadius: 6 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--orange)", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                {t ? "Κωδικός — δώστε τον μια φορά" : "Password — shown once"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{
                  flex: 1, fontFamily: "monospace", fontSize: "1.05rem", fontWeight: 700,
                  color: "var(--text-primary)", background: "var(--bg-card)",
                  padding: "8px 12px", borderRadius: 6,
                }}>
                  {result?.tempPassword ?? resetPwd}
                </code>
                <button
                  type="button"
                  onClick={() => copy(result?.tempPassword ?? resetPwd ?? "")}
                  className="btn-secondary"
                  style={{ padding: "8px 12px" }}
                >
                  {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                </button>
              </div>
            </div>
          )}

          {result ? (
            <div className={m.saveBar}>
              <button type="button" className="btn-primary" onClick={onClose}>
                {t ? "Κλείσιμο" : "Close"}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className={m.form}>
              <div className={m.grid4}>
                <div className={`${m.field} ${m.span4}`}>
                  <label className="label">{t ? "Ονοματεπώνυμο" : "Full name"}</label>
                  <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className={`${m.field} ${m.span4}`}>
                  <label className="label">Email</label>
                  <input
                    className="input" type="email" required
                    value={email}
                    disabled={mode === "edit"}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className={`${m.field} ${m.span2}`}>
                  <label className="label">{t ? "Ρόλος" : "Role"}</label>
                  <select
                    className="input"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRoleCode)}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{t ? ROLE_LABELS_EL[r] : r}</option>
                    ))}
                  </select>
                </div>
                <div className={`${m.field} ${m.span2}`}>
                  <label className="label">{t ? "Tenant" : "Tenant"}</label>
                  <select
                    className="input"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    disabled={platformRole}
                  >
                    <option value="">{t ? "— Platform staff —" : "— Platform staff —"}</option>
                    {tenants.map((tn) => (
                      <option key={tn.id} value={tn.id}>{tn.name}</option>
                    ))}
                  </select>
                </div>
                {mode === "new" && (
                  <div className={`${m.field} ${m.span2}`}>
                    <label className="label">{t ? "Κωδικός (προαιρετικό)" : "Password (optional)"}</label>
                    <input
                      className="input" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t ? "αυτόματη παραγωγή" : "auto-generate"}
                    />
                  </div>
                )}
                {mode === "edit" && (
                  <label className={`${m.checkboxRow} ${m.span2}`}>
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    {t ? "Ενεργός" : "Active"}
                  </label>
                )}
                <label className={`${m.checkboxRow} ${m.span4}`}>
                  <input type="checkbox" checked={receiveAlerts} onChange={(e) => setReceiveAlerts(e.target.checked)} />
                  🔔 {t ? "Λήψη ειδοποιήσεων συσκευών" : "Receive device alerts"}
                </label>
              </div>

              {mode === "edit" ? (
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid var(--border)", marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={resetPassword}
                      disabled={pending}
                      className="btn-secondary"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}
                    >
                      <FiKey size={14} /> {t ? "Επαναφορά κωδικού" : "Reset password"}
                    </button>
                    <button
                      type="button"
                      onClick={del}
                      disabled={pending}
                      className="btn-secondary"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--red)" }}
                    >
                      <FiTrash2 size={14} /> {t ? "Διαγραφή" : "Delete"}
                    </button>
                  </div>
                  <button type="submit" disabled={pending} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {pending ? <FiLoader size={14} className="animate-spin" /> : <FiSave size={14} />}
                    {t ? "Αποθήκευση" : "Save"}
                  </button>
                </div>
              ) : (
                <div className={m.saveBar}>
                  <button type="submit" disabled={pending} className={`btn-primary ${m.saveBtn}`}>
                    {pending ? <FiLoader size={16} className="animate-spin" /> : <FiSave size={16} />}
                    {t ? "Δημιουργία" : "Create"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
