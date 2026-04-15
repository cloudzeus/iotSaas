"use client";

import { useEffect, useState, useCallback } from "react";
import type { WidgetConfig } from "./types";

interface ThermometerWidgetProps {
  widgetId: string;
  title: string;
  config: WidgetConfig;
}

interface Reading {
  channel: string;
  value: number | null;
  unit: string;
}

const POLL_INTERVAL = 30_000;

const PALETTE: Record<string, string> = {
  orange: "#ff6600",
  blue:   "#3b82f6",
  green:  "#22c55e",
  purple: "#a855f7",
  red:    "#ef4444",
};

// Resolve which channels to render — accepts either config.channels (preferred)
// or single config.channel as a fallback. Caps at 2.
function resolveChannels(config: WidgetConfig): string[] {
  if (config.channels && config.channels.length > 0) return config.channels.slice(0, 2);
  if (config.channel) return [config.channel];
  return [];
}

function colorFor(value: number, warning?: number, critical?: number, scheme = "orange"): string {
  if (critical !== undefined && value >= critical) return PALETTE.red;
  if (warning !== undefined && value >= warning) return "#f59e0b";
  return PALETTE[scheme] ?? PALETTE.orange;
}

function Tube({
  value,
  min,
  max,
  unit,
  label,
  color,
}: {
  value: number | null;
  min: number;
  max: number;
  unit: string;
  label: string;
  color: string;
}) {
  const pct =
    value === null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const fillHeight = Math.round(pct * 100); // % of tube
  const tubeWidth = 22;
  const bulbR = 18;
  const tubeHeight = 130;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {/* Reading */}
      <div style={{ textAlign: "center", lineHeight: 1.1 }}>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color,
            fontVariantNumeric: "tabular-nums",
            filter: `drop-shadow(0 0 6px ${color}55)`,
          }}
        >
          {value === null ? "—" : Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        {unit && (
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 2 }}>
            {unit}
          </span>
        )}
      </div>

      {/* Glass tube SVG */}
      <svg
        width={tubeWidth + 14}
        height={tubeHeight + bulbR * 2 + 8}
        viewBox={`0 0 ${tubeWidth + 14} ${tubeHeight + bulbR * 2 + 8}`}
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={`merc-${label}`} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={color} stopOpacity={0.65} />
          </linearGradient>
          <linearGradient id={`glass-${label}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
        </defs>

        {/* Tube background */}
        <rect
          x={(tubeWidth + 14) / 2 - tubeWidth / 2}
          y={4}
          width={tubeWidth}
          height={tubeHeight}
          rx={tubeWidth / 2}
          fill={`url(#glass-${label})`}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />

        {/* Mercury fill (rises from bulb) */}
        <rect
          x={(tubeWidth + 14) / 2 - (tubeWidth - 6) / 2}
          y={4 + tubeHeight - (tubeHeight - 4) * (fillHeight / 100)}
          width={tubeWidth - 6}
          height={(tubeHeight - 4) * (fillHeight / 100)}
          rx={(tubeWidth - 6) / 2}
          fill={`url(#merc-${label})`}
          style={{ transition: "all 0.5s ease" }}
        />

        {/* Bulb */}
        <circle
          cx={(tubeWidth + 14) / 2}
          cy={4 + tubeHeight + bulbR - 4}
          r={bulbR}
          fill={color}
          opacity={0.95}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
        <circle
          cx={(tubeWidth + 14) / 2}
          cy={4 + tubeHeight + bulbR - 4}
          r={bulbR}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
        />
      </svg>

      {/* Channel label */}
      <span
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          maxWidth: 80,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={label}
      >
        {label}
      </span>
    </div>
  );
}

export default function ThermometerWidget({ widgetId, title, config }: ThermometerWidgetProps) {
  const channels = resolveChannels(config);
  const [readings, setReadings] = useState<Reading[]>(
    channels.map((c) => ({ channel: c, value: null, unit: config.unit ?? "" }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const min = config.minValue ?? 0;
  const max = config.maxValue ?? 100;
  const scheme = config.colorScheme ?? "orange";

  const fetchData = useCallback(async () => {
    if (!config.deviceId || channels.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const res = await globalThis.fetch(
        `/api/telemetry?deviceId=${config.deviceId}&channels=${channels.join(",")}&latest=true`
      );
      if (!res.ok) throw new Error("fetch failed");
      const data: { channel: string; value: number; unit?: string }[] = await res.json();
      const byChannel = new Map(data.map((d) => [d.channel, d]));
      setReadings(
        channels.map((ch) => {
          const e = byChannel.get(ch);
          return {
            channel: ch,
            value: e ? Number(e.value) : null,
            unit: e?.unit ?? config.unit ?? "",
          };
        })
      );
      setError(null);
    } catch {
      setError("No data");
    } finally {
      setLoading(false);
    }
  }, [config.deviceId, channels.join(","), config.unit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        padding: "8px 6px",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 8,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "100%",
        }}
      >
        {title}
      </span>

      {channels.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 24 }}>
          Pick a channel
        </div>
      ) : loading ? (
        <div className="skeleton" style={{ width: 60, height: 160, borderRadius: 30 }} />
      ) : error ? (
        <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 24 }}>
          {error}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 18, flex: 1, alignItems: "center" }}>
          {readings.map((r) => (
            <Tube
              key={r.channel}
              value={r.value}
              min={min}
              max={max}
              unit={r.unit}
              label={r.channel}
              color={
                r.value !== null
                  ? colorFor(r.value, config.warningThreshold, config.criticalThreshold, scheme)
                  : PALETTE[scheme] ?? PALETTE.orange
              }
            />
          ))}
        </div>
      )}

      {/* Scale hint */}
      {channels.length > 0 && !loading && !error && (
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: 4, paddingInline: 6 }}>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{min}</span>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{max}</span>
        </div>
      )}
    </div>
  );
}
