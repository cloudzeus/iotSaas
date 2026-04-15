"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WidgetConfig } from "./types";
import { useChartData } from "./useChartData";

const CHANNEL_COLORS = [
  "#ff6600", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4",
];

const TIME_OPTIONS = [
  { value: "1h", label: "1H" },
  { value: "6h", label: "6H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
] as const;

interface AreaChartWidgetProps {
  widgetId: string;
  title: string;
  config: WidgetConfig;
}

export default function AreaChartWidget({ widgetId, title, config }: AreaChartWidgetProps) {
  const [range, setRange] = useState<string>(config.timeRange ?? "24h");
  const effectiveConfig = { ...config, timeRange: range as WidgetConfig["timeRange"] };
  const { data, loading, error, channels } = useChartData(effectiveConfig);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              style={{
                padding: "2px 7px",
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                background: range === opt.value ? "#ff6600" : "rgba(255,255,255,0.06)",
                color: range === opt.value ? "#fff" : "var(--text-muted)",
                transition: "background 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <div className="skeleton" style={{ height: "100%", borderRadius: 8 }} />
        ) : error ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", paddingTop: 40 }}>
            {error}
          </div>
        ) : data.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", paddingTop: 40 }}>
            No data for selected range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
              <defs>
                {channels.map((ch, i) => (
                  <linearGradient key={ch} id={`grad-${widgetId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: "var(--text-muted)" }}
              />
              {channels.length > 1 && (
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }}
                />
              )}
              {channels.map((ch, i) => (
                <Area
                  key={ch}
                  type="monotone"
                  dataKey={ch}
                  stroke={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                  strokeWidth={2}
                  fill={`url(#grad-${widgetId}-${i})`}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
