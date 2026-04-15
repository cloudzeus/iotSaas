"use client";

// Direct Leaflet (no react-leaflet) — sidesteps React 19 strict-mount
// "Map container is already initialized" errors.

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { WidgetConfig } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeIcon(color: string) {
  return new L.Icon({
    iconUrl:
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
          <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
          <circle cx="12" cy="12" r="5" fill="${color}"/>
        </svg>`
      ),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const onlineIcon = makeIcon("#22c55e");
const offlineIcon = makeIcon("#ef4444");

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

function popupHtml(d: DeviceMapPin): string {
  const statusBg = d.online ? "#22c55e22" : "#ef444422";
  const statusFg = d.online ? "#22c55e" : "#ef4444";
  const statusText = d.online ? "ONLINE" : "OFFLINE";
  const parts = [
    `<strong style="display:block;margin-bottom:4px">${escapeHtml(d.name)}</strong>`,
    `<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${statusBg};color:${statusFg};margin-bottom:4px">${statusText}</span>`,
    d.lastSeen ? `<div style="color:#6b7280;font-size:10px">Last seen: ${escapeHtml(d.lastSeen)}</div>` : "",
    d.battery !== undefined ? `<div style="margin-top:2px">🔋 ${d.battery}%</div>` : "",
    d.signal !== undefined ? `<div>📶 ${d.signal} dBm</div>` : "",
  ];
  return `<div style="min-width:160px;font-family:inherit;font-size:12px;line-height:1.5">${parts.join("")}</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function MapWidgetInner({ devices, config }: MapWidgetInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const centerLat = config.defaultLat ?? (devices[0]?.lat ?? 37.97);
    const centerLng = config.defaultLng ?? (devices[0]?.lng ?? 23.72);
    const zoom = config.defaultZoom ?? 10;

    const map = L.map(el, {
      center: [centerLat, centerLng],
      zoom,
      attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const markers = devices.map((d) =>
      L.marker([d.lat, d.lng], { icon: d.online ? onlineIcon : offlineIcon })
        .bindPopup(popupHtml(d))
        .addTo(map)
    );

    if (devices.length === 1) {
      map.setView([devices[0].lat, devices[0].lng], 14);
    } else if (devices.length > 1) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [32, 32] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [devices, config.defaultLat, config.defaultLng, config.defaultZoom]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: 8,
        overflow: "hidden",
        background: "#f3f4f6",
      }}
    />
  );
}
