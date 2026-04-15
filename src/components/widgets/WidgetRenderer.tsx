"use client";

/**
 * WidgetRenderer — dispatches to the correct widget component by type.
 * All widgets are lazy-loaded to keep the initial bundle small.
 */

import dynamic from "next/dynamic";
import type { WidgetType, WidgetConfig } from "./types";

// ── Lazy-loaded widget components ─────────────────────────────────────────────

const GaugeWidget        = dynamic(() => import("./GaugeWidget"),        { ssr: false });
const ThermometerWidget  = dynamic(() => import("./ThermometerWidget"),  { ssr: false });
const StatCardWidget     = dynamic(() => import("./StatCardWidget"),      { ssr: false });
const LineChartWidget    = dynamic(() => import("./LineChartWidget"),     { ssr: false });
const AreaChartWidget    = dynamic(() => import("./AreaChartWidget"),     { ssr: false });
const BarChartWidget     = dynamic(() => import("./BarChartWidget"),      { ssr: false });
const MapWidget          = dynamic(() => import("./MapWidget"),           { ssr: false });
const DeviceGridWidget   = dynamic(() => import("./DeviceGridWidget"),    { ssr: false });
const TelemetryTable     = dynamic(() => import("./TelemetryTableWidget"),{ ssr: false });
const AlertSummary       = dynamic(() => import("./AlertSummaryWidget"),  { ssr: false });

// ── Props ─────────────────────────────────────────────────────────────────────

interface WidgetRendererProps {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
}

// ── Fallback / skeleton ───────────────────────────────────────────────────────

function WidgetSkeleton() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
      }}
    >
      <div className="skeleton" style={{ height: 12, width: "40%", borderRadius: 4 }} />
      <div className="skeleton" style={{ flex: 1, borderRadius: 8 }} />
    </div>
  );
}

function UnknownWidget({ type }: { type: string }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: 12,
      }}
    >
      Unknown widget type: {type}
    </div>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export default function WidgetRenderer({ id, type, title, config }: WidgetRendererProps) {
  const common = { widgetId: id, title, config };

  switch (type) {
    case "gauge":
      return <GaugeWidget {...common} />;
    case "thermometer":
      return <ThermometerWidget {...common} />;
    case "stat-card":
      return <StatCardWidget {...common} />;
    case "line-chart":
      return <LineChartWidget {...common} />;
    case "area-chart":
      return <AreaChartWidget {...common} />;
    case "bar-chart":
      return <BarChartWidget {...common} />;
    case "map":
      return <MapWidget {...common} />;
    case "device-grid":
      return <DeviceGridWidget {...common} />;
    case "telemetry-table":
      return <TelemetryTable {...common} />;
    case "alert-summary":
      return <AlertSummary {...common} />;
    default:
      return <UnknownWidget type={type} />;
  }
}
