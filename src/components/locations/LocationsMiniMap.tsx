"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Pin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isMain?: boolean;
}

export default function LocationsMiniMap({ pins, height = 180 }: { pins: Pin[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;
    const el = containerRef.current;

    const map = L.map(el, {
      attributionControl: false,
      zoomControl: false,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const markers = pins.map((p) => {
      const icon = L.divIcon({
        className: "",
        html: p.isMain
          ? `<div style="width:14px;height:14px;border-radius:50%;background:#ff6600;border:2px solid #fff;box-shadow:0 0 0 3px rgba(255,102,0,0.35)"></div>`
          : `<div style="width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 0 0 2px rgba(59,130,246,0.25)"></div>`,
        iconSize: p.isMain ? [18, 18] : [16, 16],
        iconAnchor: p.isMain ? [9, 9] : [8, 8],
      });
      return L.marker([p.lat, p.lng], { icon })
        .bindTooltip(`${p.isMain ? "★ " : ""}${p.name}`, { direction: "top", offset: [0, -6] })
        .addTo(map);
    });

    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 13);
    } else {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [pins]);

  if (pins.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{
        height,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "#f3f4f6",
      }}
    />
  );
}
