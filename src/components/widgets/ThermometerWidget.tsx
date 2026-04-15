"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { FiEdit2, FiCheck, FiX } from "react-icons/fi";
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

// Resolve which channels to render. Filters out "battery" — that's shown in the
// header indicator, not as a tube. Caps at 2 mercury tubes.
function resolveChannels(config: WidgetConfig): string[] {
  const all =
    config.channels && config.channels.length > 0
      ? config.channels
      : config.channel
        ? [config.channel]
        : [];
  return all.filter((c) => c.toLowerCase() !== "battery").slice(0, 2);
}

function colorFor(value: number, warning?: number, critical?: number, scheme = "orange"): string {
  if (critical !== undefined && value >= critical) return PALETTE.red;
  if (warning !== undefined && value >= warning) return "#f59e0b";
  return PALETTE[scheme] ?? PALETTE.orange;
}

// ── Battery indicator (mobile-style) ─────────────────────────────────────────
function BatteryIndicator({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const fillColor =
    clamped >= 50 ? "#22c55e" : clamped >= 20 ? "#f59e0b" : "#ef4444";

  return (
    <span
      title={`Battery ${Math.round(clamped)}%`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      <svg width={26} height={12} viewBox="0 0 26 12">
        {/* Outer shell */}
        <rect
          x={0.5}
          y={0.5}
          width={22}
          height={11}
          rx={2}
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1}
        />
        {/* Positive terminal nub */}
        <rect x={23} y={3.5} width={2} height={5} rx={0.5} fill="rgba(255,255,255,0.45)" />
        {/* Fill */}
        <rect
          x={2}
          y={2}
          width={(18 * clamped) / 100}
          height={8}
          rx={1}
          fill={fillColor}
          style={{ transition: "width 0.4s ease" }}
        />
      </svg>
      <span style={{ fontSize: 10, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
        {Math.round(clamped)}%
      </span>
    </span>
  );
}

// ── Mercury tube ─────────────────────────────────────────────────────────────
function Tube({
  value, min, max, unit, label, color,
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
  const fillHeight = Math.round(pct * 100);
  const tubeWidth = 22;
  const bulbR = 18;
  const tubeHeight = 130;
  const idSafe = label.replace(/[^a-zA-Z0-9_-]/g, "_");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
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

      <svg
        width={tubeWidth + 14}
        height={tubeHeight + bulbR * 2 + 8}
        viewBox={`0 0 ${tubeWidth + 14} ${tubeHeight + bulbR * 2 + 8}`}
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={`merc-${idSafe}`} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%"   stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={color} stopOpacity={0.65} />
          </linearGradient>
          <linearGradient id={`glass-${idSafe}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.06)" />
            <stop offset="50%"  stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
        </defs>

        <rect
          x={(tubeWidth + 14) / 2 - tubeWidth / 2}
          y={4}
          width={tubeWidth}
          height={tubeHeight}
          rx={tubeWidth / 2}
          fill={`url(#glass-${idSafe})`}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />

        <rect
          x={(tubeWidth + 14) / 2 - (tubeWidth - 6) / 2}
          y={4 + tubeHeight - (tubeHeight - 4) * (fillHeight / 100)}
          width={tubeWidth - 6}
          height={(tubeHeight - 4) * (fillHeight / 100)}
          rx={(tubeWidth - 6) / 2}
          fill={`url(#merc-${idSafe})`}
          style={{ transition: "all 0.5s ease" }}
        />

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

// ── Inline-editable device-name header ───────────────────────────────────────
function DeviceNameHeader({
  deviceId,
  initialName,
  battery,
}: {
  deviceId: string;
  initialName: string;
  battery: number | null;
}) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resync if upstream name changes
  useEffect(() => { setName(initialName); setDraft(initialName); }, [initialName]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) { setEditing(false); setDraft(name); return; }
    setSaving(true);
    try {
      const res = await globalThis.fetch(`/api/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const updated = await res.json();
      setName(updated.name ?? trimmed);
      setEditing(false);
    } catch {
      // Revert on failure
      setDraft(name);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        marginBottom: 6,
        minHeight: 22,
      }}
    >
      {editing ? (
        <>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setEditing(false); setDraft(name); }
            }}
            disabled={saving}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            title="Save"
            style={iconBtn("#22c55e")}
          >
            <FiCheck size={12} />
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setDraft(name); }}
            disabled={saving}
            title="Cancel"
            style={iconBtn("var(--text-muted)")}
          >
            <FiX size={12} />
          </button>
        </>
      ) : (
        <>
          <span
            onDoubleClick={() => setEditing(true)}
            title={`${name} — double-click to rename`}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "text",
            }}
          >
            {name}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Rename device"
            style={iconBtn("var(--text-muted)")}
          >
            <FiEdit2 size={11} />
          </button>
          {battery !== null && <BatteryIndicator pct={battery} />}
        </>
      )}
    </div>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    width: 18,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    color,
    cursor: "pointer",
    borderRadius: 4,
    padding: 0,
  };
}

// ── Main widget ──────────────────────────────────────────────────────────────
export default function ThermometerWidget({ widgetId, title, config }: ThermometerWidgetProps) {
  const channels = resolveChannels(config);
  const [readings, setReadings] = useState<Reading[]>(
    channels.map((c) => ({ channel: c, value: null, unit: config.unit ?? "" }))
  );
  const [battery, setBattery] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState<string>(title);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const min = config.minValue ?? 0;
  const max = config.maxValue ?? 100;
  const scheme = config.colorScheme ?? "orange";

  // Fetch device name once
  useEffect(() => {
    if (!config.deviceId) return;
    globalThis
      .fetch(`/api/devices/${config.deviceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.name) setDeviceName(d.name); })
      .catch(() => {});
  }, [config.deviceId]);

  // Fetch latest telemetry — always include battery alongside the picked channels
  const fetchData = useCallback(async () => {
    if (!config.deviceId || channels.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const wantedChannels = Array.from(new Set([...channels, "battery"]));
      const res = await globalThis.fetch(
        `/api/telemetry?deviceId=${config.deviceId}&channels=${wantedChannels.join(",")}&latest=true`
      );
      if (!res.ok) throw new Error("fetch failed");
      const data: { channel: string; value: number; unit?: string }[] = await res.json();
      const byChannel = new Map(data.map((d) => [d.channel.toLowerCase(), d]));

      setReadings(
        channels.map((ch) => {
          const e = byChannel.get(ch.toLowerCase());
          return {
            channel: ch,
            value: e ? Number(e.value) : null,
            unit: e?.unit ?? config.unit ?? "",
          };
        })
      );

      const b = byChannel.get("battery");
      setBattery(b ? Number(b.value) : null);
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
        height: "100%",
        padding: "8px 10px",
      }}
    >
      {/* Header — device name (inline editable) + battery */}
      {config.deviceId ? (
        <DeviceNameHeader
          deviceId={config.deviceId}
          initialName={deviceName}
          battery={battery}
        />
      ) : (
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          {title}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {channels.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
            Pick a channel
          </div>
        ) : loading ? (
          <div className="skeleton" style={{ width: 60, height: 160, borderRadius: 30 }} />
        ) : error ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
            {error}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
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
      </div>

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
