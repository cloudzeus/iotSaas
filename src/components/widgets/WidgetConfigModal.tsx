"use client";

import { useState, useEffect } from "react";
import { WIDGET_DEFAULTS } from "./types";
import type { WidgetType, WidgetConfig } from "./types";

interface Device {
  id: string;
  name: string;
  channels: string[];
}

interface WidgetConfigModalProps {
  /** When editing an existing widget, pass its current values */
  initialType?: WidgetType;
  initialTitle?: string;
  initialConfig?: WidgetConfig;
  /** Available devices with their known channels */
  devices: Device[];
  onSave: (type: WidgetType, title: string, config: WidgetConfig) => void | Promise<void>;
  onClose: () => void;
}

const WIDGET_TYPE_GROUPS: { label: string; types: WidgetType[] }[] = [
  {
    label: "Numeric",
    types: ["gauge", "stat-card"],
  },
  {
    label: "Time Series",
    types: ["line-chart", "area-chart", "bar-chart"],
  },
  {
    label: "Location & Grid",
    types: ["map", "device-grid"],
  },
  {
    label: "Data",
    types: ["telemetry-table", "alert-summary"],
  },
];

const TIME_RANGE_OPTIONS = [
  { value: "1h",  label: "Last 1 hour" },
  { value: "6h",  label: "Last 6 hours" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const COLOR_SCHEME_OPTIONS: { value: WidgetConfig["colorScheme"]; label: string; color: string }[] = [
  { value: "orange", label: "Orange", color: "#ff6600" },
  { value: "blue",   label: "Blue",   color: "#3b82f6" },
  { value: "green",  label: "Green",  color: "#22c55e" },
  { value: "purple", label: "Purple", color: "#a855f7" },
];

type Step = "type" | "source" | "display" | "thresholds";

function stepLabel(step: Step): string {
  return { type: "Type", source: "Data Source", display: "Display", thresholds: "Thresholds" }[step];
}

const STEPS_BY_TYPE: Record<WidgetType, Step[]> = {
  "gauge":           ["type", "source", "display", "thresholds"],
  "stat-card":       ["type", "source", "display", "thresholds"],
  "line-chart":      ["type", "source", "display"],
  "area-chart":      ["type", "source", "display"],
  "bar-chart":       ["type", "source", "display", "thresholds"],
  "map":             ["type", "source"],
  "device-grid":     ["type", "source"],
  "telemetry-table": ["type", "source"],
  "alert-summary":   ["type", "source"],
};

export default function WidgetConfigModal({
  initialType,
  initialTitle,
  initialConfig,
  devices,
  onSave,
  onClose,
}: WidgetConfigModalProps) {
  const [widgetType, setWidgetType] = useState<WidgetType>(initialType ?? "stat-card");
  const [title, setTitle] = useState(initialTitle ?? "");
  const [config, setConfig] = useState<WidgetConfig>(initialConfig ?? {});
  const [step, setStep] = useState<Step>(initialType ? "source" : "type");
  const [saving, setSaving] = useState(false);
  const [multiDevice, setMultiDevice] = useState(
    !!(initialConfig?.deviceIds && initialConfig.deviceIds.length > 1)
  );

  // Determine steps for current widget type
  const steps = STEPS_BY_TYPE[widgetType];
  const stepIndex = steps.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Auto-fill title from type if empty
  useEffect(() => {
    if (!title) setTitle(WIDGET_DEFAULTS[widgetType].label);
  }, [widgetType]); // eslint-disable-line react-hooks/exhaustive-deps

  function setConfigField<K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  // Channels for selected device
  const selectedDevice = devices.find((d) => d.id === config.deviceId);
  const availableChannels = selectedDevice?.channels ?? [];

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(widgetType, title || WIDGET_DEFAULTS[widgetType].label, config);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // ─────────────── Step renderers ──────────────────────────────────────────

  function renderTypeStep() {
    return (
      <div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Choose what kind of widget to add to your dashboard.
        </p>
        {WIDGET_TYPE_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 8,
              }}
            >
              {group.label}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: 8,
              }}
            >
              {group.types.map((type) => {
                const def = WIDGET_DEFAULTS[type];
                const isSelected = widgetType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setWidgetType(type)}
                    style={{
                      background: isSelected ? "#ff660018" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isSelected ? "#ff6600" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 8,
                      padding: "12px 10px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>
                      {WidgetIconEmoji[type]}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? "#ff6600" : "var(--text)" }}>
                      {def.label}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {WidgetDescriptions[type]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderSourceStep() {
    const needsChannel = ["gauge", "stat-card", "line-chart", "area-chart", "bar-chart"].includes(widgetType);
    const multipleDevices = ["map", "device-grid", "telemetry-table", "alert-summary"].includes(widgetType);
    const multiChannels = ["line-chart", "area-chart", "bar-chart"].includes(widgetType);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Title */}
        <div>
          <label className="label">Widget title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Temperature – Room 1"
          />
        </div>

        {/* Device selection */}
        {!multipleDevices && (
          <div>
            <label className="label">Device</label>
            <select
              className="input"
              value={config.deviceId ?? ""}
              onChange={(e) => setConfigField("deviceId", e.target.value || undefined)}
            >
              <option value="">— select device —</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Multi-device selection */}
        {multipleDevices && (
          <div>
            <label className="label">Devices</label>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                maxHeight: 180,
                overflow: "auto",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!config.deviceIds || config.deviceIds.length === 0}
                  onChange={() => setConfigField("deviceIds", [])}
                />
                All devices
              </label>
              {devices.map((d) => (
                <label
                  key={d.id}
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={config.deviceIds?.includes(d.id) ?? false}
                    onChange={(e) => {
                      const curr = config.deviceIds ?? [];
                      setConfigField(
                        "deviceIds",
                        e.target.checked ? [...curr, d.id] : curr.filter((id) => id !== d.id)
                      );
                    }}
                  />
                  {d.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Single channel */}
        {needsChannel && !multiChannels && config.deviceId && (
          <div>
            <label className="label">Channel</label>
            <select
              className="input"
              value={config.channel ?? ""}
              onChange={(e) => setConfigField("channel", e.target.value || undefined)}
            >
              <option value="">— select channel —</option>
              {availableChannels.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
        )}

        {/* Multi-channel */}
        {multiChannels && config.deviceId && availableChannels.length > 0 && (
          <div>
            <label className="label">Channels (select up to 6)</label>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                maxHeight: 140,
                overflow: "auto",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {availableChannels.map((ch) => (
                <label
                  key={ch}
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={config.channels?.includes(ch) ?? false}
                    onChange={(e) => {
                      const curr = config.channels ?? [];
                      const next = e.target.checked
                        ? [...curr, ch].slice(0, 6)
                        : curr.filter((c) => c !== ch);
                      setConfigField("channels", next);
                    }}
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Time range */}
        {needsChannel && (
          <div>
            <label className="label">Default time range</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setConfigField("timeRange", opt.value as WidgetConfig["timeRange"])}
                  style={{
                    padding: "4px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background:
                      (config.timeRange ?? "24h") === opt.value
                        ? "#ff6600"
                        : "rgba(255,255,255,0.06)",
                    color:
                      (config.timeRange ?? "24h") === opt.value
                        ? "#fff"
                        : "var(--text-muted)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderDisplayStep() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Color scheme */}
        <div>
          <label className="label">Color scheme</label>
          <div style={{ display: "flex", gap: 8 }}>
            {COLOR_SCHEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setConfigField("colorScheme", opt.value)}
                title={opt.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: opt.color,
                  border: `3px solid ${config.colorScheme === opt.value ? "#fff" : "transparent"}`,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                  boxShadow: `0 0 8px ${opt.color}60`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Show trend (stat-card) */}
        {widgetType === "stat-card" && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.showTrend ?? false}
              onChange={(e) => setConfigField("showTrend", e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>Show trend arrow</span>
          </label>
        )}

        {/* Min/max for gauge */}
        {widgetType === "gauge" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Min value</label>
              <input
                className="input"
                type="number"
                value={config.minValue ?? ""}
                onChange={(e) => setConfigField("minValue", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Max value</label>
              <input
                className="input"
                type="number"
                value={config.maxValue ?? ""}
                onChange={(e) => setConfigField("maxValue", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="100"
              />
            </div>
          </div>
        )}

        {/* Unit */}
        {["gauge", "stat-card"].includes(widgetType) && (
          <div>
            <label className="label">Unit label</label>
            <input
              className="input"
              value={config.unit ?? ""}
              onChange={(e) => setConfigField("unit", e.target.value || undefined)}
              placeholder="e.g. °C, %, kWh"
            />
          </div>
        )}
      </div>
    );
  }

  function renderThresholdsStep() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Set optional thresholds to colour-code values. Leave blank to use the default colour.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="label" style={{ color: "#f59e0b" }}>Warning threshold ≥</label>
            <input
              className="input"
              type="number"
              value={config.warningThreshold ?? ""}
              onChange={(e) =>
                setConfigField("warningThreshold", e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="e.g. 80"
              style={{ borderColor: config.warningThreshold !== undefined ? "#f59e0b40" : undefined }}
            />
          </div>
          <div>
            <label className="label" style={{ color: "#ef4444" }}>Critical threshold ≥</label>
            <input
              className="input"
              type="number"
              value={config.criticalThreshold ?? ""}
              onChange={(e) =>
                setConfigField("criticalThreshold", e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="e.g. 90"
              style={{ borderColor: config.criticalThreshold !== undefined ? "#ef444440" : undefined }}
            />
          </div>
        </div>
        {config.warningThreshold !== undefined && config.criticalThreshold !== undefined &&
          config.warningThreshold >= config.criticalThreshold && (
            <p style={{ fontSize: 11, color: "#f59e0b", margin: 0 }}>
              ⚠️ Warning threshold should be less than critical threshold.
            </p>
          )}
        <div>
          <label className="label">Unit</label>
          <input
            className="input"
            value={config.unit ?? ""}
            onChange={(e) => setConfigField("unit", e.target.value || undefined)}
            placeholder="e.g. °C, %, dBm"
          />
        </div>
      </div>
    );
  }

  function renderStep() {
    switch (step) {
      case "type": return renderTypeStep();
      case "source": return renderSourceStep();
      case "display": return renderDisplayStep();
      case "thresholds": return renderThresholdsStep();
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              {initialType ? "Edit widget" : "Add widget"}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
              {WIDGET_DEFAULTS[widgetType].label} — {stepLabel(step)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div
          style={{
            padding: "10px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            gap: 6,
          }}
        >
          {steps.map((s, i) => (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: i <= stepIndex ? "#ff6600" : "var(--text-muted)",
                fontWeight: i === stepIndex ? 700 : 400,
                cursor: i < stepIndex ? "pointer" : "default",
              }}
              onClick={() => { if (i < stepIndex) setStep(s); }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: i < stepIndex ? "#ff6600" : i === stepIndex ? "#ff660030" : "rgba(255,255,255,0.06)",
                  border: `2px solid ${i <= stepIndex ? "#ff6600" : "rgba(255,255,255,0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  color: i < stepIndex ? "#fff" : i === stepIndex ? "#ff6600" : "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                {i < stepIndex ? "✓" : i + 1}
              </span>
              {stepLabel(s)}
              {i < steps.length - 1 && (
                <span style={{ color: "rgba(255,255,255,0.15)", marginLeft: 2 }}>›</span>
              )}
            </div>
          ))}
        </div>

        {/* Step body */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 22px" }}>
          {renderStep()}
        </div>

        {/* Footer buttons */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button
            className="btn-ghost"
            onClick={() => {
              if (isFirst) onClose();
              else setStep(steps[stepIndex - 1]);
            }}
          >
            {isFirst ? "Cancel" : "← Back"}
          </button>
          {isLast ? (
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save widget"}
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setStep(steps[stepIndex + 1])}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Emoji icons for widget types ─────────────────────────────────────────────
const WidgetIconEmoji: Record<WidgetType, string> = {
  "gauge":           "🔵",
  "stat-card":       "🔢",
  "line-chart":      "📈",
  "area-chart":      "📊",
  "bar-chart":       "📉",
  "map":             "🗺️",
  "device-grid":     "🖥️",
  "telemetry-table": "📋",
  "alert-summary":   "🔔",
};

const WidgetDescriptions: Record<WidgetType, string> = {
  "gauge":           "Circular gauge with thresholds",
  "stat-card":       "Large value with trend arrow",
  "line-chart":      "Time series line chart",
  "area-chart":      "Filled area time series",
  "bar-chart":       "Bar chart for comparisons",
  "map":             "Device locations on a map",
  "device-grid":     "Device status cards",
  "telemetry-table": "Latest readings table",
  "alert-summary":   "Active unacknowledged alerts",
};
