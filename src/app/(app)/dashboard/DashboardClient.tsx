"use client";

import { useState } from "react";
import { FiCpu, FiWifi, FiBell, FiDollarSign, FiMapPin } from "react-icons/fi";
import DashboardGrid from "@/components/widgets/DashboardGrid";
import type { DashboardSection, WidgetType, WidgetConfig } from "@/components/widgets/types";
import { createDashboard, renameDashboard, deleteDashboard } from "@/lib/dashboard-actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WidgetRow {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
    sectionId: string;
  };
}

interface DashboardData {
  id: string;
  name: string;
  layout: {
    cols: number;
    rowHeight: number;
    sections: DashboardSection[];
  };
  widgets: WidgetRow[];
}

interface DeviceWithChannels {
  id: string;
  name: string;
  online: boolean;
  channels: string[];
}

interface Stats {
  totalDevices: number;
  onlineDevices: number;
  activeAlerts: number;
  estimatedBill: number;
  planName: string;
  pricePerDevice: number;
}

interface LocationTab { id: string; name: string; isMain: boolean; }

interface DashboardClientProps {
  dashboards: DashboardData[];
  devices: DeviceWithChannels[];
  stats: Stats;
  locale: string;
  locations?: LocationTab[];
  activeLocationId?: string;
  /**
   * Base path the location tabs link to. The location id is appended as
   * `?loc=<id>` (or `&loc=<id>` if a query already exists).
   * e.g. `/admin/tenants/abc123/dashboard`
   */
  locationHrefBase?: string;
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  Icon,
  label,
  value,
  color = "#ff6600",
  sub,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "16px 18px",
        minWidth: 160,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flex: "1 1 160px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0, right: 0,
          width: 80, height: 80,
          background: `radial-gradient(circle, ${color}22, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: 42, height: 42, borderRadius: 10,
          background: `${color}18`,
          color,
          display: "inline-flex",
          alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardClient({
  dashboards: initialDashboards,
  devices,
  stats,
  locale,
  locations,
  activeLocationId,
  locationHrefBase,
}: DashboardClientProps) {
  const [dashboards, setDashboards] = useState<DashboardData[]>(initialDashboards);
  const [activeDashboardId, setActiveDashboardId] = useState<string>(
    initialDashboards[0]?.id ?? ""
  );
  const [editMode, setEditMode] = useState(false);
  const [creatingDash, setCreatingDash] = useState(false);
  const [newDashName, setNewDashName] = useState("");
  const [showNewDashInput, setShowNewDashInput] = useState(false);

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId) ?? dashboards[0];

  async function handleCreateDashboard() {
    const name = newDashName.trim() || "New Dashboard";
    setCreatingDash(true);
    try {
      const created = await createDashboard(name);
      setDashboards((prev) => [...prev, created as unknown as DashboardData]);
      setActiveDashboardId(created.id);
      setShowNewDashInput(false);
      setNewDashName("");
    } finally {
      setCreatingDash(false);
    }
  }

  async function handleDeleteDashboard(id: string) {
    if (dashboards.length === 1) {
      alert("You must have at least one dashboard.");
      return;
    }
    if (!confirm("Delete this dashboard and all its widgets?")) return;
    await deleteDashboard(id);
    const remaining = dashboards.filter((d) => d.id !== id);
    setDashboards(remaining);
    if (activeDashboardId === id) setActiveDashboardId(remaining[0]?.id ?? "");
  }

  function updateDashboardSections(dashId: string, sections: DashboardSection[]) {
    setDashboards((prev) =>
      prev.map((d) =>
        d.id === dashId ? { ...d, layout: { ...d.layout, sections } } : d
      )
    );
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1600 }}>
      {/* ── Location tabs (if this dashboard has location context) ─────────── */}
      {locations && locations.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            padding: "10px 14px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflowX: "auto",
          }}
        >
          <FiMapPin size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <span
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              fontWeight: 700,
              flexShrink: 0,
              marginRight: 4,
            }}
          >
            {locale === "el" ? "Τοποθεσία" : "Location"}
          </span>
          {locations.map((l) => {
            const active = l.id === activeLocationId;
            const href = locationHrefBase
              ? `${locationHrefBase}${locationHrefBase.includes("?") ? "&" : "?"}loc=${l.id}`
              : undefined;
            const baseStyle: React.CSSProperties = {
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: "0.8rem",
              fontWeight: 600,
              textDecoration: "none",
              background: active ? "var(--orange)" : "var(--bg-card)",
              color: active ? "white" : "var(--text-secondary)",
              border: "1px solid " + (active ? "var(--orange)" : "var(--border)"),
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
              flexShrink: 0,
            };
            const content = (
              <>
                {l.isMain && <span style={{ color: active ? "white" : "var(--orange)" }}>★</span>}
                {l.name}
              </>
            );
            return href ? (
              <a key={l.id} href={href} style={baseStyle}>
                {content}
              </a>
            ) : (
              <span key={l.id} style={baseStyle}>
                {content}
              </span>
            );
          })}
        </div>
      )}

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <KpiCard
          Icon={FiCpu}
          label="Total devices"
          value={stats.totalDevices}
          color="#ff6600"
        />
        <KpiCard
          Icon={FiWifi}
          label="Online now"
          value={stats.onlineDevices}
          color="#22c55e"
          sub={`${stats.totalDevices > 0 ? Math.round((stats.onlineDevices / stats.totalDevices) * 100) : 0}% uptime`}
        />
        <KpiCard
          Icon={FiBell}
          label="Active alerts"
          value={stats.activeAlerts}
          color={stats.activeAlerts > 0 ? "#ef4444" : "#22c55e"}
        />
        <KpiCard
          Icon={FiDollarSign}
          label="Est. this month"
          value={`€${stats.estimatedBill.toFixed(2)}`}
          color="#a855f7"
          sub={stats.planName}
        />
      </div>

      {/* ── Dashboard tabs ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginBottom: 16,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {dashboards.map((d) => (
          <div
            key={d.id}
            style={{ display: "flex", alignItems: "center", position: "relative" }}
          >
            <button
              onClick={() => setActiveDashboardId(d.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom:
                  activeDashboardId === d.id
                    ? "2px solid #ff6600"
                    : "2px solid transparent",
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: activeDashboardId === d.id ? 700 : 400,
                color: activeDashboardId === d.id ? "#ff6600" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {d.name}
            </button>
            {editMode && dashboards.length > 1 && (
              <button
                onClick={() => handleDeleteDashboard(d.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "0 4px 0 0",
                  lineHeight: 1,
                }}
                title="Delete dashboard"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {/* New dashboard */}
        {showNewDashInput ? (
          <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
            <input
              autoFocus
              className="input"
              style={{ padding: "4px 10px", fontSize: 12, width: 160 }}
              value={newDashName}
              onChange={(e) => setNewDashName(e.target.value)}
              placeholder="Dashboard name…"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateDashboard();
                if (e.key === "Escape") setShowNewDashInput(false);
              }}
            />
            <button
              className="btn-primary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={handleCreateDashboard}
              disabled={creatingDash}
            >
              {creatingDash ? "…" : "Create"}
            </button>
            <button
              className="btn-ghost"
              style={{ padding: "4px 8px", fontSize: 12 }}
              onClick={() => setShowNewDashInput(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewDashInput(true)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 20,
              padding: "4px 12px",
              lineHeight: 1,
            }}
            title="New dashboard"
          >
            +
          </button>
        )}

        {/* Edit mode toggle */}
        <div style={{ marginLeft: "auto", paddingBottom: 4 }}>
          <button
            className={editMode ? "btn-primary" : "btn-secondary"}
            style={{ fontSize: 12, padding: "5px 14px" }}
            onClick={() => setEditMode((e) => !e)}
          >
            {editMode ? "✓ Done editing" : "✏️ Edit layout"}
          </button>
        </div>
      </div>

      {/* ── Active dashboard grid ────────────────────────────────────────────── */}
      {activeDashboard ? (
        <DashboardGrid
          dashboardId={activeDashboard.id}
          sections={activeDashboard.layout?.sections ?? []}
          widgets={activeDashboard.widgets}
          devices={devices}
          editMode={editMode}
          onSectionsChange={(sections) =>
            updateDashboardSections(activeDashboard.id, sections)
          }
        />
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            color: "var(--text-muted)",
          }}
        >
          No dashboards found.
        </div>
      )}
    </div>
  );
}
