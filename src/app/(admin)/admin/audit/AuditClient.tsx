"use client";

import { Shield } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Props {
  logs: Array<{
    id: string; action: string; entity: string; entityId: string | null;
    ip: string | null; createdAt: string;
    user: { name: string; email: string } | null;
    tenant: { name: string } | null;
    meta: unknown;
  }>;
  locale: string;
}

const actionColor = (action: string) => {
  if (action.includes("DELETE") || action.includes("REMOVE")) return "#ef4444";
  if (action.includes("CREATE") || action.includes("ADD")) return "#22c55e";
  if (action.includes("UPDATE") || action.includes("EDIT")) return "#3b82f6";
  return "var(--text-secondary)";
};

export default function AuditClient({ logs, locale }: Props) {
  const t = locale === "el";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Shield size={22} style={{ display: "inline", marginRight: "8px", color: "var(--orange)" }} />
          {t ? "Ιστορικό Ενεργειών" : "Audit Log"}
        </h1>
        <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          {t ? `${logs.length} εγγραφές` : `${logs.length} entries`}
        </span>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t ? "Ενέργεια" : "Action"}</th>
                <th>{t ? "Οντότητα" : "Entity"}</th>
                <th>{t ? "Χρήστης" : "User"}</th>
                <th>{t ? "Πελάτης" : "Tenant"}</th>
                <th>IP</th>
                <th>{t ? "Ώρα" : "Time"}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                    {t ? "Δεν υπάρχουν εγγραφές" : "No audit log entries"}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <code style={{ fontSize: "0.75rem", color: actionColor(log.action), background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "4px" }}>
                        {log.action}
                      </code>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {log.entity}
                      {log.entityId && <span style={{ color: "var(--text-muted)" }}> #{log.entityId.slice(0, 8)}</span>}
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>
                      <div style={{ color: "var(--text-primary)" }}>{log.user?.name || "—"}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{log.user?.email}</div>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{log.tenant?.name || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{log.ip || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {formatDateTime(log.createdAt, locale === "el" ? "el-GR" : "en-GB")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
