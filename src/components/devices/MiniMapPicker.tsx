"use client";

// Loaded dynamically (SSR off) — Leaflet requires `window`.
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

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

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(
        parseFloat(e.latlng.lat.toFixed(6)),
        parseFloat(e.latlng.lng.toFixed(6))
      );
    },
  });
  return null;
}

function RecenterOnPin({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    const prev = prevRef.current;
    if (!prev || Math.abs(prev[0] - lat) > 0.001 || Math.abs(prev[1] - lng) > 0.001) {
      map.setView([lat, lng], map.getZoom());
    }
    prevRef.current = [lat, lng];
  }, [lat, lng, map]);
  return null;
}

export default function MiniMapPicker({ lat, lng, onChange }: MiniMapPickerProps) {
  const center: [number, number] = lat && lng ? [lat, lng] : [37.97, 23.72];

  return (
    <div style={{ height: 220, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%", background: "#1a1a2e" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <ClickHandler onChange={onChange} />
        {lat && lng && (
          <>
            <Marker position={[lat, lng]} />
            <RecenterOnPin lat={lat} lng={lng} />
          </>
        )}
      </MapContainer>
      <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", margin: "4px 0 0" }}>
        Click on the map to place the device pin
      </p>
    </div>
  );
}
