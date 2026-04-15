"use client";

// Direct Leaflet — sidesteps React 19 strict-mount "Map container is already
// initialized" errors that react-leaflet triggers under Fast Refresh.

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

interface MiniMapPickerProps {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MiniMapPicker({ lat, lng, onChange }: MiniMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create map once
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const start: [number, number] = lat != null && lng != null ? [lat, lng] : [37.97, 23.72];
    const map = L.map(el, { center: start, zoom: 13 });
    mapRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const la = Number(e.latlng.lat.toFixed(6));
      const ln = Number(e.latlng.lng.toFixed(6));
      onChangeRef.current(la, ln);
    });

    if (lat != null && lng != null) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker + recenter when lat/lng props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lat == null || lng == null) {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          height: 220,
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "#f3f4f6",
        }}
      />
      <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", margin: "4px 0 0" }}>
        Click on the map to place the pin
      </p>
    </>
  );
}
