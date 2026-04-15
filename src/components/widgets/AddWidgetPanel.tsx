"use client";

import { useState } from "react";
import { WIDGET_DEFAULTS } from "./types";
import type { WidgetType, WidgetConfig } from "./types";
import WidgetConfigModal from "./WidgetConfigModal";
import {
  FiX, FiHash, FiTrendingUp, FiMap, FiGrid, FiBell, FiList,
  FiBarChart2, FiActivity, FiPieChart, FiThermometer,
} from "react-icons/fi";
import { LuGauge } from "react-icons/lu";

interface Device { id: string; name: string; channels: string[]; }

interface AddWidgetPanelProps {
  sectionId: string;
  devices: Device[];
  onAdd: (type: WidgetType, title: string, config: WidgetConfig) => Promise<void>;
  onClose: () => void;
  locale?: string;
}

interface WidgetMeta {
  icon: React.ComponentType<{ size?: number }>;
  color: string;           // ring color + faint bg
  description: string;
}

const META: Record<WidgetType, WidgetMeta & { descEl: string }> = {
  "gauge":           { icon: LuGauge,       color: "#ff6600", description: "Radial gauge with color thresholds", descEl: "Ραντάρ μέτρησης με έγχρωμα όρια" },
  "thermometer":     { icon: FiThermometer, color: "#ef4444", description: "Mercury column for 1–2 channels",    descEl: "Στήλη υδραργύρου για 1–2 κανάλια" },
  "stat-card":       { icon: FiHash,        color: "#3b82f6", description: "Large numeric value with trend",     descEl: "Μεγάλη τιμή με δείκτη τάσης" },
  "line-chart":      { icon: FiActivity,    color: "#22c55e", description: "Time-series line chart",              descEl: "Γραμμικό διάγραμμα χρονοσειράς" },
  "area-chart":      { icon: FiTrendingUp,  color: "#8b5cf6", description: "Filled area time-series",             descEl: "Γέμισμα χρονοσειράς (area)" },
  "bar-chart":       { icon: FiBarChart2,   color: "#f59e0b", description: "Categorical bar chart",               descEl: "Ραβδόγραμμα" },
  "map":             { icon: FiMap,         color: "#0ea5e9", description: "Device pins on a map",                descEl: "Συσκευές σε χάρτη" },
  "device-grid":     { icon: FiGrid,        color: "#14b8a6", description: "Status cards per device",             descEl: "Κάρτες κατάστασης ανά συσκευή" },
  "telemetry-table": { icon: FiList,        color: "#64748b", description: "Tabular telemetry rows",              descEl: "Πίνακας μετρήσεων" },
  "alert-summary":   { icon: FiBell,        color: "#ef4444", description: "Recent alerts summary",               descEl: "Πρόσφατες ειδοποιήσεις" },
};

const GROUPS: { label: string; labelEl: string; icon: React.ComponentType<{ size?: number }>; types: WidgetType[] }[] = [
  { label: "Numeric",     labelEl: "Αριθμητικά",   icon: FiHash,     types: ["gauge", "thermometer", "stat-card"] },
  { label: "Charts",      labelEl: "Γραφήματα",    icon: FiPieChart, types: ["line-chart", "area-chart", "bar-chart"] },
  { label: "Spatial",     labelEl: "Χωρικά",       icon: FiMap,      types: ["map", "device-grid"] },
  { label: "Data tables", labelEl: "Πίνακες",      icon: FiList,     types: ["telemetry-table", "alert-summary"] },
];

export default function AddWidgetPanel({ sectionId, devices, onAdd, onClose, locale = "el" }: AddWidgetPanelProps) {
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);
  const t = locale === "el";

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
        position: "fixed", inset: 0, zIndex: 900,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "40px 16px", overflowY: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 720,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        <div style={{
          padding: "16px 22px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--bg-card)",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              {t ? "Προσθήκη Widget" : "Add widget"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {t ? "Επιλέξτε τύπο widget για αυτή την ενότητα" : "Choose a widget type for this section"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 8, borderRadius: 6,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <FiX size={18} />
          </button>
        </div>

        <div style={{ padding: 22, maxHeight: "70vh", overflowY: "auto" }}>
          {GROUPS.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.label} style={{ marginBottom: 22 }}>
                <div
                  style={{
                    fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <GroupIcon size={12} /> {t ? group.labelEl : group.label}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 10,
                  }}
                >
                  {group.types.map((type) => {
                    const def = WIDGET_DEFAULTS[type];
                    const meta = META[type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(type)}
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: 14,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          transition: "border-color 0.15s, transform 0.1s, box-shadow 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = meta.color;
                          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 16px ${meta.color}25`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                        }}
                      >
                        <div
                          style={{
                            width: 44, height: 44, borderRadius: 10,
                            background: `${meta.color}15`,
                            color: meta.color,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Icon size={22} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                            {def.label}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>
                            {t ? meta.descEl : meta.description}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 600, color: meta.color,
                          background: `${meta.color}12`,
                          padding: "3px 8px", borderRadius: 12, alignSelf: "flex-start",
                        }}>
                          {def.w}×{def.h}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
