"use client";

import { useState } from "react";
import { WIDGET_DEFAULTS } from "./types";
import type { WidgetType, WidgetConfig } from "./types";
import WidgetConfigModal from "./WidgetConfigModal";

interface Device {
  id: string;
  name: string;
  channels: string[];
}

interface AddWidgetPanelProps {
  sectionId: string;
  devices: Device[];
  onAdd: (type: WidgetType, title: string, config: WidgetConfig) => Promise<void>;
  onClose: () => void;
}

const WIDGET_GROUPS: { emoji: string; label: string; types: WidgetType[] }[] = [
  { emoji: "🔢", label: "Numeric",     types: ["gauge", "stat-card"] },
  { emoji: "📈", label: "Charts",      types: ["line-chart", "area-chart", "bar-chart"] },
  { emoji: "🗺️", label: "Spatial",     types: ["map", "device-grid"] },
  { emoji: "📋", label: "Data tables", types: ["telemetry-table", "alert-summary"] },
];

export default function AddWidgetPanel({
  sectionId,
  devices,
  onAdd,
  onClose,
}: AddWidgetPanelProps) {
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);

  if (selectedType) {
    return (
      <WidgetConfigModal
        initialType={selectedType}
        initialConfig={{ sectionId }}
        devices={devices}
        onSave={async (type, title, config) => {
          await onAdd(type, title, { ...config, sectionId });
        }}
        onClose={() => setSelectedType(null)}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.6)",
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
          maxWidth: 620,
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "var(--card)",
            zIndex: 1,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add widget</h2>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
              Choose a widget type to add to this section
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
            }}
          >
            ×
          </button>
        </div>

        {/* Widget grid */}
        <div style={{ padding: 22 }}>
          {WIDGET_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {group.emoji} {group.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                {group.types.map((type) => {
                  const def = WIDGET_DEFAULTS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        padding: "14px 12px",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.border =
                          "1px solid #ff660050";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(255,102,0,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.border =
                          "1px solid rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(255,255,255,0.03)";
                      }}
                    >
                      {/* Preview grid size */}
                      <div
                        style={{
                          width: "100%",
                          height: 50,
                          background: "rgba(255,102,0,0.06)",
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {/* Faint grid dots */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage:
                              "radial-gradient(circle, rgba(255,102,0,0.2) 1px, transparent 1px)",
                            backgroundSize: "12px 12px",
                          }}
                        />
                        <span style={{ fontSize: 22, position: "relative" }}>
                          {WidgetPreviewIcon[type]}
                        </span>
                      </div>

                      <span style={{ fontSize: 13, fontWeight: 700 }}>{def.label}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {WidgetDescriptions[type]}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,102,0,0.7)" }}>
                        Default {def.w}×{def.h} cols
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const WidgetPreviewIcon: Record<WidgetType, string> = {
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
  "gauge":           "Circular gauge with colour thresholds",
  "stat-card":       "Large value with optional trend arrow",
  "line-chart":      "Time series with multiple channels",
  "area-chart":      "Filled area time series chart",
  "bar-chart":       "Bar chart with threshold colouring",
  "map":             "Device pins on an interactive map",
  "device-grid":     "Live status cards for each device",
  "telemetry-table": "Latest readings from all channels",
  "alert-summary":   "Unacknowledged alerts with severity",
};
