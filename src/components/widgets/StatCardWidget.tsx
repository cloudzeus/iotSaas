"use client";

import { useEffect, useState, useCallback } from "react";
import type { WidgetConfig } from "./types";

interface StatCardWidgetProps {
  widgetId: string;
  title: string;
  config: WidgetConfig;
  initialValue?: number | null;
  initialUnit?: string;
  initialPrev?: number | null;
}

const POLL_INTERVAL = 30_000;

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / Math.abs(previous)) * 100).toFixed(1) : null;
  if (diff === 0) return null;

  const up = diff > 0;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontSize: 11,
        fontWeight: 600,
        color: up ? "#22c55e" : "#ef4444",
      }}
    >
      {up ? "▲" : "▼"}
      {pct !== null ? `${Math.abs(Number(pct))}%` : Math.abs(diff).toFixed(1)}
    </span>
  );
}

function getValueColor(
  value: number,
  warning?: number,
  critical?: number,
  scheme: string = "orange"
): string {
  if (critical !== undefined && value >= critical) return "#ef4444";
  if (warning !== undefined && value >= warning) return "#f59e0b";
  const palette: Record<string, string> = {
    orange: "#ff6600",
    blue: "#3b82f6",
    green: "#22c55e",
    purple: "#a855f7",
  };
  return palette[scheme] ?? "#ff6600";
}

export default function StatCardWidget({
  widgetId,
  title,
  config,
  initialValue,
  initialUnit,
  initialPrev,
}: StatCardWidgetProps) {
  const [value, setValue] = useState<number | null>(initialValue ?? null);
  const [prevValue, setPrevValue] = useState<number | null>(initialPrev ?? null);
  const [unit, setUnit] = useState<string>(initialUnit ?? config.unit ?? "");
  const [loading, setLoading] = useState(initialValue === undefined);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const scheme = config.colorScheme ?? "orange";

  const fetchData = useCallback(async () => {
    if (!config.deviceId || !config.channel) return;
    try {
      const res = await globalThis.fetch(
        `/api/telemetry?deviceId=${config.deviceId}&channels=${config.channel}&latest=true`
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const entry = data[0];
      if (entry) {
        const newVal = Number(entry.value);
        setValue((prev) => {
          setPrevValue(prev);
          return newVal;
        });
        if (entry.unit) setUnit(entry.unit);
        setLastUpdated(new Date());
      }
    } catch {
      setError("No data");
    } finally {
      setLoading(false);
    }
  }, [config.deviceId, config.channel]);

  useEffect(() => {
    if (initialValue === undefined) fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData, initialValue]);

  const color =
    value !== null
      ? getValueColor(value, config.warningThreshold, config.criticalThreshold, scheme)
      : "#ff6600";

  const displayValue =
    value !== null ? (Number.isInteger(value) ? value.toString() : value.toFixed(2)) : "—";

  const timeAgo =
    lastUpdated
      ? (() => {
          const s = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
          if (s < 60) return `${s}s ago`;
          if (s < 3600) return `${Math.floor(s / 60)}m ago`;
          return `${Math.floor(s / 3600)}h ago`;
        })()
      : null;

  return (
    <div
      className="stat-card"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "12px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
        {config.showTrend && value !== null && prevValue !== null && (
          <TrendArrow current={value} previous={prevValue} />
        )}
      </div>

      {/* Main value */}
      {loading ? (
        <div className="skeleton" style={{ height: 40, width: "60%", borderRadius: 6, marginTop: 8 }} />
      ) : error ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>{error}</div>
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              lineHeight: 1,
              color,
              fontVariantNumeric: "tabular-nums",
              filter: `drop-shadow(0 0 10px ${color}40)`,
            }}
          >
            {displayValue}
          </span>
          {unit && (
            <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
              {unit}
            </span>
          )}
        </div>
      )}

      {/* Footer: min/max and timestamp */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        {config.minValue !== undefined && config.maxValue !== undefined ? (
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {config.minValue} – {config.maxValue} {unit}
          </span>
        ) : (
          <span />
        )}
        {timeAgo && (
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo}</span>
        )}
      </div>
    </div>
  );
}
