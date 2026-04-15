"use client";

import { useEffect, useState, useCallback } from "react";
import type { WidgetConfig } from "./types";

interface GaugeWidgetProps {
  widgetId: string;
  title: string;
  config: WidgetConfig;
  initialValue?: number | null;
  initialUnit?: string;
}

const POLL_INTERVAL = 30_000; // 30 s

function getColor(
  value: number,
  min: number,
  max: number,
  warning?: number,
  critical?: number,
  scheme: string = "orange"
): string {
  if (critical !== undefined && value >= critical) return "#ef4444"; // red
  if (warning !== undefined && value >= warning) return "#f59e0b"; // amber
  const palette: Record<string, string> = {
    orange: "#ff6600",
    blue: "#3b82f6",
    green: "#22c55e",
    purple: "#a855f7",
  };
  return palette[scheme] ?? "#ff6600";
}

function Arc({
  value,
  min,
  max,
  color,
  size = 160,
}: {
  value: number;
  min: number;
  max: number;
  color: string;
  size?: number;
}) {
  const R = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -220; // degrees
  const endAngle = 40;
  const totalArc = endAngle - startAngle; // 260 degrees

  const clampedPct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const fillAngle = startAngle + totalArc * clampedPct;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (a1: number, a2: number, r: number, cx: number, cy: number) => {
    const x1 = cx + r * Math.cos(toRad(a1));
    const y1 = cy + r * Math.sin(toRad(a1));
    const x2 = cx + r * Math.cos(toRad(a2));
    const y2 = cy + r * Math.sin(toRad(a2));
    const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="gauge-svg">
      {/* Track */}
      <path
        d={arcPath(startAngle, endAngle, R, cx, cy)}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={10}
        strokeLinecap="round"
      />
      {/* Value arc */}
      {clampedPct > 0 && (
        <path
          d={arcPath(startAngle, fillAngle, R, cx, cy)}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      )}
      {/* Min label */}
      <text
        x={cx + R * Math.cos(toRad(startAngle)) - 2}
        y={cy + R * Math.sin(toRad(startAngle)) + 14}
        fill="rgba(255,255,255,0.4)"
        fontSize="9"
        textAnchor="middle"
      >
        {min}
      </text>
      {/* Max label */}
      <text
        x={cx + R * Math.cos(toRad(endAngle)) + 2}
        y={cy + R * Math.sin(toRad(endAngle)) + 14}
        fill="rgba(255,255,255,0.4)"
        fontSize="9"
        textAnchor="middle"
      >
        {max}
      </text>
    </svg>
  );
}

export default function GaugeWidget({
  widgetId,
  title,
  config,
  initialValue,
  initialUnit,
}: GaugeWidgetProps) {
  const [value, setValue] = useState<number | null>(initialValue ?? null);
  const [unit, setUnit] = useState<string>(initialUnit ?? config.unit ?? "");
  const [loading, setLoading] = useState(initialValue === undefined);
  const [error, setError] = useState<string | null>(null);

  const min = config.minValue ?? 0;
  const max = config.maxValue ?? 100;
  const scheme = config.colorScheme ?? "orange";

  const fetch = useCallback(async () => {
    if (!config.deviceId || !config.channel) return;
    try {
      const res = await globalThis.fetch(
        `/api/telemetry?deviceId=${config.deviceId}&channels=${config.channel}&latest=true`
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const entry = data[0];
      if (entry) {
        setValue(Number(entry.value));
        if (entry.unit) setUnit(entry.unit);
      }
    } catch {
      setError("No data");
    } finally {
      setLoading(false);
    }
  }, [config.deviceId, config.channel]);

  useEffect(() => {
    if (initialValue === undefined) fetch();
    const id = setInterval(fetch, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetch, initialValue]);

  const color =
    value !== null
      ? getColor(value, min, max, config.warningThreshold, config.criticalThreshold, scheme)
      : "#ff6600";

  const displayValue =
    value !== null ? (Number.isInteger(value) ? value : value.toFixed(1)) : "—";

  const pct =
    value !== null ? Math.round(((value - min) / (max - min)) * 100) : 0;

  return (
    <div className="gauge-widget" style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", padding: "8px 4px" }}>
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "100%",
        }}
      >
        {title}
      </span>

      {loading ? (
        <div className="skeleton" style={{ width: 120, height: 120, borderRadius: "50%" }} />
      ) : error ? (
        <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 24 }}>
          {error}
        </div>
      ) : (
        <>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Arc value={value ?? min} min={min} max={max} color={color} size={150} />
            {/* Center value */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 12,
              }}
            >
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: color,
                  fontVariantNumeric: "tabular-nums",
                  filter: `drop-shadow(0 0 8px ${color}60)`,
                }}
              >
                {displayValue}
              </span>
              {unit && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {unit}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar below */}
          <div
            style={{
              width: "80%",
              height: 4,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 2,
              marginTop: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, pct))}%`,
                height: "100%",
                background: color,
                borderRadius: 2,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{pct}%</span>
        </>
      )}
    </div>
  );
}
