"use client";

import { useEffect, useState, useCallback } from "react";
import type { WidgetConfig } from "./types";

interface DeviceStatus {
  id: string;
  name: string;
  online: boolean;
  lastSeenAt: string | null;
  battery: number | null;
  signal: number | null;
  model: string | null;
}

interface DeviceGridWidgetProps {
  widgetId: string;
  title: string;
  config: WidgetConfig;
  initialDevices?: DeviceStatus[];
}

function timeAgo(isoStr: string | null): string {
  if (!isoStr) return "Never";
  const s = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function BatteryIcon({ pct }: { pct: number }) {
  const color = pct > 50 ? "#22c55e" : pct > 20 ? "#f59e0b" : "#ef4444";
  return (
    <span style={{ fontSize: 11, color }}>
      🔋 {pct}%
    </span>
  );
}

function SignalIcon({ dbm }: { dbm: number }) {
  const color = dbm > -80 ? "#22c55e" : dbm > -100 ? "#f59e0b" : "#ef4444";
  return (
    <span style={{ fontSize: 11, color }}>
      📶 {dbm} dBm
    </span>
  );
}

export default function DeviceGridWidget({
  widgetId,
  title,
  config,
  initialDevices,
}: DeviceGridWidgetProps) {
  const [devices, setDevices] = useState<DeviceStatus[]>(initialDevices ?? []);
  const [loading, setLoading] = useState(!initialDevices);

  const fetchDevices = useCallback(async () => {
    try {
      const ids = config.deviceIds ?? (config.deviceId ? [config.deviceId] : []);
      const qs = ids.length > 0 ? `?ids=${ids.join(",")}` : "";
      const res = await globalThis.fetch(`/api/devices/status${qs}`);
      if (!res.ok) throw new Error();
      setDevices(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [config.deviceId, config.deviceIds?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialDevices) fetchDevices();
    const id = setInterval(fetchDevices, 30_000);
    return () => clearInterval(id);
  }, [fetchDevices, initialDevices]);

  const onlineCount = devices.filter((d) => d.online).length;

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
        {devices.length > 0 && (
          <span style={{ fontSize: 10 }}>
            <span style={{ color: "#22c55e" }}>● {onlineCount}</span>
            <span style={{ color: "var(--text-muted)" }}> / {devices.length}</span>
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 8,
          alignContent: "start",
        }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 90, borderRadius: 8 }}
              />
            ))
          : devices.map((d) => (
              <div
                key={d.id}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${d.online ? "#22c55e30" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  transition: "border-color 0.2s",
                }}
              >
                {/* Status dot + name */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: d.online ? "#22c55e" : "#6b7280",
                      flexShrink: 0,
                      boxShadow: d.online ? "0 0 6px #22c55e80" : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.name}
                  </span>
                </div>

                {/* Model */}
                {d.model && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.model}</span>
                )}

                {/* Battery + signal */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {d.battery !== null && <BatteryIcon pct={d.battery} />}
                  {d.signal !== null && <SignalIcon dbm={d.signal} />}
                </div>

                {/* Last seen */}
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {timeAgo(d.lastSeenAt)}
                </span>
              </div>
            ))}
        {!loading && devices.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 12,
              paddingTop: 20,
            }}
          >
            No devices configured
          </div>
        )}
      </div>
    </div>
  );
}
