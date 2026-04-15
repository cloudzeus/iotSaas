"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
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

interface BarChartWidgetProps {
  widgetId: string;
  title: string;
  config: WidgetConfig;
}

export default function BarChartWidget({ widgetId, title, config }: BarChartWidgetProps) {
  const [range, setRange] = useState<string>(config.timeRange ?? "24h");
  const effectiveConfig = { ...config, timeRange: range as WidgetConfig["timeRange"] };
  const { data, loading, error, channels } = useChartData(effectiveConfig);

  // For bar chart, if only one channel, colour bars by threshold
  const singleChannel = channels.length === 1 ? channels[0] : null;
  const warning = config.warningThreshold;
  const critical = config.criticalThreshold;

  function barColor(value: number, channelIndex: number): string {
    if (singleChannel && channelIndex === 0) {
      if (critical !== undefined && value >= critical) return "#ef4444";
      if (warning !== undefined && value >= warning) return "#f59e0b";
    }
    return CHANNEL_COLORS[channelIndex % CHANNEL_COLORS.length];
  }

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
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
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
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              {channels.length > 1 && (
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }}
                />
              )}
              {channels.map((ch, i) =>
                singleChannel ? (
                  // Single channel — colour each bar individually
                  <Bar key={ch} dataKey={ch} radius={[3, 3, 0, 0]} maxBarSize={24}>
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={barColor(Number(entry[ch]) || 0, i)}
                      />
                    ))}
                  </Bar>
                ) : (
                  <Bar
                    key={ch}
                    dataKey={ch}
                    fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                  />
                )
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
