"use client";

import { useEffect, useState, useCallback } from "react";
import type { WidgetConfig } from "./types";

interface AlertEvent {
  id: string;
  severity: "warning" | "critical" | "info";
  message: string;
  deviceName: string;
  channel: string;
  value: number | string;
  unit: string | null;
  firedAt: string;
  acknowledged: boolean;
}

interface AlertSummaryWidgetProps {
  widgetId: string;
  title: string;
  config: WidgetConfig;
  initialAlerts?: AlertEvent[];
}

const SEVERITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: "#ef444420", color: "#ef4444", label: "CRIT" },
  warning:  { bg: "#f59e0b20", color: "#f59e0b", label: "WARN" },
  info:     { bg: "#3b82f620", color: "#3b82f6", label: "INFO" },
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AlertSummaryWidget({
  widgetId,
  title,
  config,
  initialAlerts,
}: AlertSummaryWidgetProps) {
  const [alerts, setAlerts] = useState<AlertEvent[]>(initialAlerts ?? []);
  const [loading, setLoading] = useState(!initialAlerts);

  const fetchAlerts = useCallback(async () => {
    try {
      const ids = config.deviceIds ?? (config.deviceId ? [config.deviceId] : []);
      const qs = new URLSearchParams({ limit: "20", acknowledged: "false" });
      if (ids.length > 0) qs.set("deviceIds", ids.join(","));
      const res = await globalThis.fetch(`/api/alerts?${qs.toString()}`);
      if (!res.ok) throw new Error();
      setAlerts(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [config.deviceId, config.deviceIds?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialAlerts) fetchAlerts();
    const id = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(id);
  }, [fetchAlerts, initialAlerts]);

  async function acknowledge(alertId: string) {
    try {
      await globalThis.fetch(`/api/alerts/${alertId}/acknowledge`, { method: "POST" });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      // silent
    }
  }

  const critCount = alerts.filter((a) => a.severity === "critical").length;
  const warnCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "10px 12px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {critCount > 0 && (
            <span
              style={{
                background: "#ef444422",
                color: "#ef4444",
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {critCount} CRIT
            </span>
          )}
          {warnCount > 0 && (
            <span
              style={{
                background: "#f59e0b22",
                color: "#f59e0b",
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {warnCount} WARN
            </span>
          )}
          {alerts.length === 0 && !loading && (
            <span style={{ color: "#22c55e", fontSize: 10, fontWeight: 700 }}>✓ All clear</span>
          )}
        </div>
      </div>

      {/* Alert list */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />
          ))
        ) : alerts.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            <span style={{ fontSize: 28, marginBottom: 4 }}>✅</span>
            No active alerts
          </div>
        ) : (
          alerts.map((alert) => {
            const sev = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.info;
            return (
              <div
                key={alert.id}
                style={{
                  background: sev.bg,
                  border: `1px solid ${sev.color}30`,
                  borderLeft: `3px solid ${sev.color}`,
                  borderRadius: 6,
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: sev.color,
                        background: `${sev.color}20`,
                        padding: "1px 5px",
                        borderRadius: 3,
                      }}
                    >
                      {sev.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      {alert.deviceName}
                    </span>
                  </div>
                  <button
                    onClick={() => acknowledge(alert.id)}
                    title="Acknowledge"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                      padding: "0 2px",
                    }}
                  >
                    ×
                  </button>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {alert.channel}: <strong style={{ color: sev.color }}>
                    {alert.value}{alert.unit ? ` ${alert.unit}` : ""}
                  </strong>
                  {" — "}{alert.message}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {timeAgo(alert.firedAt)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
