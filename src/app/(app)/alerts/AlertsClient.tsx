"use client";

import { useState } from "react";
import { Bell, Plus, CheckCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const severityBadge = (severity: string) => {
  if (severity === "CRITICAL") return "badge badge-red";
  if (severity === "WARNING") return "badge badge-yellow";
  return "badge badge-blue";
};

interface Props {
  rules: Array<{
    id: string; name: string; channel: string; operator: string; threshold: number;
    severity: string; isActive: boolean; emailNotify: boolean;
    device: { name: string } | null;
  }>;
  events: Array<{
    id: string; firedAt: string; severity: string; channel: string; value: number;
    message: string; acknowledged: boolean;
    device: { name: string } | null;
    rule: { name: string } | null;
  }>;
  devices: Array<{ id: string; name: string }>;
  locale: string;
  canManage: boolean;
}

export default function AlertsClient({ rules, events, devices, locale, canManage }: Props) {
  const [tab, setTab] = useState<"rules" | "events">("events");
  const t = locale === "el";

  const acknowledgeEvent = async (id: string) => {
    await fetch(`/api/alerts/events/${id}/acknowledge`, { method: "POST" });
    window.location.reload();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Bell size={22} style={{ display: "inline", marginRight: "8px", color: "var(--orange)" }} />
          {t ? "Ειδοποιήσεις" : "Alerts"}
        </h1>
        {canManage && tab === "rules" && (
          <button className="btn-primary" onClick={() => alert("TODO: open modal")}>
            <Plus size={16} />
            {t ? "Νέος Κανόνας" : "New Rule"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "20px" }}>
        {(["events", "rules"] as const).map((tab_) => (
          <button
            key={tab_}
            onClick={() => setTab(tab_)}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: tab === tab_ ? "var(--orange)" : "var(--text-secondary)",
              borderBottom: tab === tab_ ? "2px solid var(--orange)" : "2px solid transparent",
              fontWeight: tab === tab_ ? 600 : 400,
              fontSize: "0.875rem",
              transition: "all 0.15s",
            }}
          >
            {tab_ === "events" ? (t ? "Συμβάντα" : "Events") : (t ? "Κανόνες" : "Rules")}
            {tab_ === "events" && events.filter((e) => !e.acknowledged).length > 0 && (
              <span
                style={{
                  marginLeft: "6px",
                  background: "var(--red)",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "0 6px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                {events.filter((e) => !e.acknowledged).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "events" ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t ? "Συσκευή" : "Device"}</th>
                  <th>{t ? "Κανόνας" : "Rule"}</th>
                  <th>{t ? "Κανάλι" : "Channel"}</th>
                  <th>{t ? "Τιμή" : "Value"}</th>
                  <th>{t ? "Σοβαρότητα" : "Severity"}</th>
                  <th>{t ? "Ώρα" : "Time"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                      {t ? "Δεν υπάρχουν συμβάντα" : "No events"}
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id} style={{ opacity: ev.acknowledged ? 0.5 : 1 }}>
                      <td style={{ fontWeight: 500 }}>{ev.device?.name || "—"}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{ev.rule?.name || "—"}</td>
                      <td>
                        <code style={{ fontSize: "0.75rem", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "4px" }}>
                          {ev.channel}
                        </code>
                      </td>
                      <td style={{ color: "var(--orange)", fontWeight: 600 }}>{ev.value}</td>
                      <td><span className={severityBadge(ev.severity)}>{ev.severity}</span></td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {formatDateTime(ev.firedAt, locale === "el" ? "el-GR" : "en-GB")}
                      </td>
                      <td>
                        {!ev.acknowledged && canManage && (
                          <button
                            className="btn-ghost"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={() => acknowledgeEvent(ev.id)}
                          >
                            <CheckCircle size={13} />
                            {t ? "Επιβεβ." : "Ack"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t ? "Όνομα" : "Name"}</th>
                  <th>{t ? "Συσκευή" : "Device"}</th>
                  <th>{t ? "Κανάλι" : "Channel"}</th>
                  <th>{t ? "Συνθήκη" : "Condition"}</th>
                  <th>{t ? "Σοβαρότητα" : "Severity"}</th>
                  <th>{t ? "Email" : "Email"}</th>
                  <th>{t ? "Κατ/ση" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                      {t ? "Δεν υπάρχουν κανόνες" : "No rules configured"}
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id}>
                      <td style={{ fontWeight: 500 }}>{rule.name}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{rule.device?.name || (t ? "Όλες" : "All")}</td>
                      <td>
                        <code style={{ fontSize: "0.75rem", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "4px" }}>
                          {rule.channel}
                        </code>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {rule.operator} {rule.threshold}
                      </td>
                      <td><span className={severityBadge(rule.severity)}>{rule.severity}</span></td>
                      <td>{rule.emailNotify ? "✓" : "—"}</td>
                      <td>
                        <span className={rule.isActive ? "badge badge-green" : "badge badge-gray"}>
                          {rule.isActive ? (t ? "Ενεργός" : "Active") : (t ? "Ανενεργός" : "Inactive")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
