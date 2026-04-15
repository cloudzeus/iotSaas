"use client";

import { useState, useEffect, useCallback } from "react";
import type { WidgetConfig } from "./types";

export interface ChartPoint {
  ts: number;       // Unix ms
  time: string;     // formatted label
  [channel: string]: number | string;
}

const TIME_RANGE_MS: Record<string, number> = {
  "1h":  1 * 60 * 60 * 1000,
  "6h":  6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d":  7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function formatTime(ts: number, range: string): string {
  const d = new Date(ts);
  if (range === "30d" || range === "7d") {
    return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function useChartData(config: WidgetConfig) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = config.timeRange ?? "24h";
  const deviceId = config.deviceId;
  const channels = config.channels ?? (config.channel ? [config.channel] : []);

  const load = useCallback(async () => {
    if (!deviceId || channels.length === 0) { setLoading(false); return; }
    const now = Date.now();
    const from = now - (TIME_RANGE_MS[range] ?? TIME_RANGE_MS["24h"]);

    try {
      const responses = await Promise.all(
        channels.map((ch) =>
          globalThis
            .fetch(`/api/telemetry?deviceId=${deviceId}&channel=${ch}&from=${from}&to=${now}&limit=500`)
            .then((r) => r.json())
        )
      );

      // Merge all channels into unified time-series keyed by rounded minute
      const byMinute = new Map<number, ChartPoint>();

      channels.forEach((ch, idx) => {
        const rows: { ts: number; value: string | number }[] = responses[idx] ?? [];
        rows.forEach((row) => {
          const minute = Math.floor(row.ts / 60_000) * 60_000;
          if (!byMinute.has(minute)) {
            byMinute.set(minute, { ts: minute, time: formatTime(minute, range) });
          }
          const pt = byMinute.get(minute)!;
          pt[ch] = typeof row.value === "string" ? parseFloat(row.value) : row.value;
        });
      });

      const sorted = Array.from(byMinute.values()).sort((a, b) => a.ts - b.ts);
      setData(sorted);
      setError(null);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [deviceId, channels.join(","), range]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(id);
  }, [load]);

  return { data, loading, error, refetch: load, channels };
}
