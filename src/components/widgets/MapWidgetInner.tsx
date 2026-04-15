"use client";

// This inner component is loaded dynamically (no SSR) to avoid Leaflet window issues.
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { WidgetConfig } from "./types";

// Fix Leaflet's default marker icon paths (broken by bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const onlineIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
        <circle cx="12" cy="12" r="10" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-width="2"/>
        <circle cx="12" cy="12" r="5" fill="#22c55e"/>
      </svg>`
    ),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const offlineIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
        <circle cx="12" cy="12" r="10" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444" stroke-width="2"/>
        <circle cx="12" cy="12" r="5" fill="#ef4444"/>
      </svg>`
    ),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

export interface DeviceMapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  online: boolean;
  lastSeen?: string;
  battery?: number;
  signal?: number;
}

interface MapWidgetInnerProps {
  devices: DeviceMapPin[];
  config: WidgetConfig;
}

function FitBounds({ devices }: { devices: DeviceMapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (devices.length === 0) return;
    if (devices.length === 1) {
      map.setView([devices[0].lat, devices[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(devices.map((d) => [d.lat, d.lng]));
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, devices]);
  return null;
}

export default function MapWidgetInner({ devices, config }: MapWidgetInnerProps) {
  const centerLat = config.defaultLat ?? (devices[0]?.lat ?? 37.97);
  const centerLng = config.defaultLng ?? (devices[0]?.lng ?? 23.72);
  const zoom = config.defaultZoom ?? 10;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={zoom}
      style={{ height: "100%", width: "100%", borderRadius: 8, background: "#1a1a2e" }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      {devices.length > 0 && <FitBounds devices={devices} />}
      {devices.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lng]} icon={d.online ? onlineIcon : offlineIcon}>
          <Popup>
            <div
              style={{
                minWidth: 160,
                fontFamily: "inherit",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>{d.name}</strong>
              <span
                style={{
                  display: "inline-block",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  background: d.online ? "#22c55e22" : "#ef444422",
                  color: d.online ? "#22c55e" : "#ef4444",
                  marginBottom: 4,
                }}
              >
                {d.online ? "ONLINE" : "OFFLINE"}
              </span>
              {d.lastSeen && (
                <div style={{ color: "#6b7280", fontSize: 10 }}>Last seen: {d.lastSeen}</div>
              )}
              {d.battery !== undefined && (
                <div style={{ marginTop: 2 }}>🔋 {d.battery}%</div>
              )}
              {d.signal !== undefined && (
                <div>📶 {d.signal} dBm</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
