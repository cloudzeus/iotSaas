export type WidgetType =
  | "gauge"
  | "stat-card"
  | "line-chart"
  | "area-chart"
  | "bar-chart"
  | "map"
  | "device-grid"
  | "telemetry-table"
  | "alert-summary";

export interface WidgetConfig {
  // Data source
  deviceId?: string;
  deviceIds?: string[];
  channel?: string;
  channels?: string[];
  timeRange?: "1h" | "6h" | "24h" | "7d" | "30d";

  // Display
  unit?: string;
  minValue?: number;
  maxValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  showTrend?: boolean;
  colorScheme?: "orange" | "blue" | "green" | "purple";

  // Map
  defaultLat?: number;
  defaultLng?: number;
  defaultZoom?: number;

  // Section membership
  sectionId?: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetData {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position: WidgetPosition;
  dashboardId: string;
  createdAt: string;
}

export interface DashboardSection {
  id: string;
  name: string;
  order: number;
  cols?: number;          // widgets-per-row on desktop (1–6). Mobile auto-stacks.
  collapsed?: boolean;
}

export interface DashboardLayout {
  cols: number;
  rowHeight: number;
  sections: DashboardSection[];
}

export interface DashboardData {
  id: string;
  name: string;
  isDefault: boolean;
  layout: DashboardLayout;
  widgets: WidgetData[];
}

export interface TelemetryPoint {
  ts: string;
  channel: string;
  value: number;
  unit?: string | null;
}

export type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

export const TIME_RANGE_MS: Record<TimeRange, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export const WIDGET_DEFAULTS: Record<WidgetType, { w: number; h: number; label: string; icon: string }> = {
  "gauge":          { w: 3, h: 3, label: "Gauge",          icon: "gauge" },
  "stat-card":      { w: 3, h: 2, label: "Stat Card",      icon: "hash" },
  "line-chart":     { w: 6, h: 4, label: "Line Chart",     icon: "trending-up" },
  "area-chart":     { w: 6, h: 4, label: "Area Chart",     icon: "area-chart" },
  "bar-chart":      { w: 6, h: 4, label: "Bar Chart",      icon: "bar-chart-2" },
  "map":            { w: 6, h: 5, label: "Device Map",     icon: "map-pin" },
  "device-grid":    { w: 12, h: 4, label: "Device Grid",   icon: "grid-3x3" },
  "telemetry-table":{ w: 8, h: 4, label: "Data Table",     icon: "table" },
  "alert-summary":  { w: 4, h: 4, label: "Alert Summary",  icon: "bell" },
};
