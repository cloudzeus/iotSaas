"use client";

import { useEffect, useState, useCallback } from "react";
import type { WidgetConfig } from "./types";

interface TelemetryRow {
  deviceId: string;
  deviceName: string;
  channel: string;
  value: string | number;
  unit: string | null;
  ts: number;
}

interface TelemetryTableWidgetProps {
  widgetId: string;
  title: string;
  config: WidgetConfig;
  initialRows?: TelemetryRow[];
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function TelemetryTableWidget({
  widgetId,
  title,
  config,
  initialRows,
}: TelemetryTableWidgetProps) {
  const [rows, setRows] = useState<TelemetryRow[]>(initialRows ?? []);
  const [loading, setLoading] = useState(!initialRows);
  const [sortKey, setSortKey] = useState<keyof TelemetryRow>("ts");
  const [sortDesc, setSortDesc] = useState(true);

  const fetchRows = useCallback(async () => {
    try {
      const ids = config.deviceIds ?? (config.deviceId ? [config.deviceId] : []);
      const qs = new URLSearchParams();
      if (ids.length > 0) qs.set("deviceIds", ids.join(","));
      if (config.channels?.length) qs.set("channels", config.channels.join(","));
      else if (config.channel) qs.set("channels", config.channel);
      qs.set("latest", "true");
      const res = await globalThis.fetch(`/api/telemetry/latest?${qs.toString()}`);
      if (!res.ok) throw new Error();
      setRows(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [config.deviceId, config.deviceIds?.join(","), config.channel, config.channels?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialRows) fetchRows();
    const id = setInterval(fetchRows, 30_000);
    return () => clearInterval(id);
  }, [fetchRows, initialRows]);

  function toggleSort(key: keyof TelemetryRow) {
    if (sortKey === key) setSortDesc((d) => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : 1;
    return sortDesc ? -cmp : cmp;
  });

  const colStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: 11,
    textAlign: "left",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const thStyle: React.CSSProperties = {
    ...colStyle,
    color: "var(--text-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: "0.05em",
    cursor: "pointer",
    userSelect: "none",
    background: "rgba(255,255,255,0.03)",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };

  const SortIndicator = ({ col }: { col: keyof TelemetryRow }) =>
    sortKey === col ? (
      <span style={{ marginLeft: 3 }}>{sortDesc ? "↓" : "↑"}</span>
    ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "10px 12px" }}>
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
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {rows.length} reading{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
        {loading ? (
          <div className="skeleton" style={{ height: "100%", borderRadius: 6 }} />
        ) : rows.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", paddingTop: 24 }}>
            No telemetry data
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle} onClick={() => toggleSort("deviceName")}>
                  Device <SortIndicator col="deviceName" />
                </th>
                <th style={thStyle} onClick={() => toggleSort("channel")}>
                  Channel <SortIndicator col="channel" />
                </th>
                <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleSort("value")}>
                  Value <SortIndicator col="value" />
                </th>
                <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleSort("ts")}>
                  Time <SortIndicator col="ts" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={`${row.deviceId}-${row.channel}-${row.ts}-${i}`}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={colStyle}>{row.deviceName}</td>
                  <td style={{ ...colStyle, color: "var(--text-muted)" }}>{row.channel}</td>
                  <td style={{ ...colStyle, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {typeof row.value === "number"
                      ? Number.isInteger(row.value)
                        ? row.value
                        : row.value.toFixed(2)
                      : row.value}
                    {row.unit && (
                      <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 2 }}>
                        {row.unit}
                      </span>
                    )}
                  </td>
                  <td style={{ ...colStyle, textAlign: "right", color: "var(--text-muted)" }}>
                    {formatTs(row.ts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
