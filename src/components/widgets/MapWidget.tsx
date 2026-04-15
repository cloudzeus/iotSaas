"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import type { WidgetConfig } from "./types";
import type { DeviceMapPin } from "./MapWidgetInner";

// Load Leaflet ONLY on client (it references `window`)
const MapWidgetInner = dynamic(() => import("./MapWidgetInner"), {
  ssr: false,
  loading: () => (
    <div
      className="skeleton"
      style={{ height: "100%", borderRadius: 8, minHeight: 160 }}
    />
  ),
});

interface MapWidgetProps {
  widgetId: string;
  title: string;
  config: WidgetConfig;
  initialDevices?: DeviceMapPin[];
}

export default function MapWidget({
  widgetId,
  title,
  config,
  initialDevices,
}: MapWidgetProps) {
  const [devices, setDevices] = useState<DeviceMapPin[]>(initialDevices ?? []);
  const [loading, setLoading] = useState(!initialDevices);

  const fetchDevices = useCallback(async () => {
    try {
      const ids = config.deviceIds ?? (config.deviceId ? [config.deviceId] : []);
      const qs = ids.length > 0 ? `?ids=${ids.join(",")}` : "";
      const res = await globalThis.fetch(`/api/devices/map${qs}`);
      if (!res.ok) throw new Error();
      const data: DeviceMapPin[] = await res.json();
      // Filter only those that have coordinates
      setDevices(data.filter((d) => d.lat && d.lng));
    } catch {
      // silent — keep last known state
    } finally {
      setLoading(false);
    }
  }, [config.deviceId, config.deviceIds?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialDevices) fetchDevices();
    const id = setInterval(fetchDevices, 60_000);
    return () => clearInterval(id);
  }, [fetchDevices, initialDevices]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {devices.length} device{devices.length !== 1 ? "s" : ""}
          {devices.filter((d) => d.online).length > 0 && (
            <span style={{ color: "#22c55e", marginLeft: 4 }}>
              ● {devices.filter((d) => d.online).length} online
            </span>
          )}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, borderRadius: 8, overflow: "hidden" }}>
        {loading ? (
          <div className="skeleton" style={{ height: "100%", borderRadius: 8 }} />
        ) : (
          <MapWidgetInner devices={devices} config={config} />
        )}
      </div>
    </div>
  );
}
