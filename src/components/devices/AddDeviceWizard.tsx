"use client";

/**
 * AddDeviceWizard — customer-facing 4-step wizard to register a new device.
 *
 * Steps:
 *  1. Model search — pick from supported Milesight device models
 *  2. Identity   — name, DevEUI, AppKey (LoRaWAN OTAA credentials)
 *  3. Location   — optional lat/lng with a mini map preview
 *  4. Review     — confirm and submit
 */

import { useState } from "react";
import dynamic from "next/dynamic";

// Leaflet map — SSR off
const MiniMapPicker = dynamic(() => import("./MiniMapPicker"), {
  ssr: false,
  loading: () => (
    <div
      className="skeleton"
      style={{ height: 220, borderRadius: 10 }}
    />
  ),
});

// ── Supported device catalogue ──────────────────────────────────────────────

interface DeviceModel {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  channels: string[];
}

const DEVICE_MODELS: DeviceModel[] = [
  {
    id: "EM300-TH",
    name: "EM300-TH",
    category: "Environmental",
    icon: "🌡️",
    description: "Temperature & Humidity Sensor",
    channels: ["temperature", "humidity", "battery"],
  },
  {
    id: "EM300-MCS",
    name: "EM300-MCS",
    category: "Environmental",
    icon: "🚪",
    description: "Magnetic Contact Switch",
    channels: ["door_status", "battery"],
  },
  {
    id: "EM400-MUD",
    name: "EM400-MUD",
    category: "Environmental",
    icon: "💧",
    description: "Ultrasonic Distance & Temperature",
    channels: ["distance", "temperature", "battery"],
  },
  {
    id: "AM100",
    name: "AM100",
    category: "Air Quality",
    icon: "💨",
    description: "Indoor CO₂, Temperature & Humidity",
    channels: ["co2", "temperature", "humidity", "tvoc", "battery"],
  },
  {
    id: "AM307",
    name: "AM307",
    category: "Air Quality",
    icon: "🌬️",
    description: "7-in-1 Indoor Ambience Monitor",
    channels: ["co2", "temperature", "humidity", "pm2_5", "pm10", "light", "battery"],
  },
  {
    id: "EM310-TILT",
    name: "EM310-TILT",
    category: "Industrial",
    icon: "📐",
    description: "Tilt & Vibration Sensor",
    channels: ["tilt_x", "tilt_y", "temperature", "battery"],
  },
  {
    id: "UC300",
    name: "UC300",
    category: "Industrial",
    icon: "⚙️",
    description: "RS485/Modbus LoRaWAN Controller",
    channels: ["digital_in_1", "digital_in_2", "analog_in_1", "battery"],
  },
  {
    id: "VS121",
    name: "VS121",
    category: "People Counting",
    icon: "🧑‍🤝‍🧑",
    description: "AI-Powered People Counter",
    channels: ["people_in", "people_out", "current_count"],
  },
  {
    id: "WS52x",
    name: "WS52x",
    category: "Smart Plug",
    icon: "🔌",
    description: "Smart Plug with Power Metering",
    channels: ["voltage", "current", "power", "energy", "status"],
  },
  {
    id: "EM500-CO2",
    name: "EM500-CO2",
    category: "Industrial",
    icon: "🏭",
    description: "Outdoor CO₂ & Temperature Sensor",
    channels: ["co2", "temperature", "humidity", "battery"],
  },
  {
    id: "custom",
    name: "Other / Custom",
    category: "Custom",
    icon: "🔧",
    description: "Any LoRaWAN device already joined",
    channels: [],
  },
];

const CATEGORIES = Array.from(new Set(DEVICE_MODELS.map((m) => m.category)));

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "model" | "identity" | "location" | "review";

interface WizardState {
  model: DeviceModel | null;
  name: string;
  devEui: string;
  appKey: string;
  description: string;
  lat: string;
  lng: string;
  building: string;
  floor: string;
  room: string;
}

interface AddDeviceWizardProps {
  onSuccess?: (deviceId: string) => void;
  onClose: () => void;
}

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEP_ORDER: Step[] = ["model", "identity", "location", "review"];
const STEP_LABELS: Record<Step, string> = {
  model:    "1. Device model",
  identity: "2. Credentials",
  location: "3. Location",
  review:   "4. Review",
};

function StepBar({ current }: { current: Step }) {
  const currentIndex = STEP_ORDER.indexOf(current);
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {STEP_ORDER.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div
            key={s}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: done || active ? "#ff6600" : "var(--text-muted)",
              fontWeight: active ? 700 : 400,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: done ? "#ff6600" : active ? "#ff660020" : "rgba(255,255,255,0.05)",
                border: `2px solid ${done || active ? "#ff6600" : "rgba(255,255,255,0.1)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 800,
                color: done ? "#fff" : active ? "#ff6600" : "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              {done ? "✓" : i + 1}
            </div>
            <span style={{ whiteSpace: "nowrap" }}>{STEP_LABELS[s].slice(3)}</span>
            {i < STEP_ORDER.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? "#ff6600" : "rgba(255,255,255,0.08)", margin: "0 4px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validateDevEui(s: string): boolean {
  return /^[0-9a-fA-F]{16}$/.test(s.replace(/[\s:-]/g, ""));
}

function validateAppKey(s: string): boolean {
  return /^[0-9a-fA-F]{32}$/.test(s.replace(/[\s:-]/g, ""));
}

function normaliseHex(s: string): string {
  return s.replace(/[\s:-]/g, "").toUpperCase();
}

// ── Main wizard ────────────────────────────────────────────────────────────────

export default function AddDeviceWizard({ onSuccess, onClose }: AddDeviceWizardProps) {
  const [step, setStep] = useState<Step>("model");
  const [state, setState] = useState<WizardState>({
    model: null,
    name: "",
    devEui: "",
    appKey: "",
    description: "",
    lat: "",
    lng: "",
    building: "",
    floor: "",
    room: "",
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof WizardState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function goBack() {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) setStep(STEP_ORDER[i - 1]);
  }

  function validateIdentity(): boolean {
    const errs: Partial<Record<keyof WizardState, string>> = {};
    if (!state.name.trim()) errs.name = "Device name is required";
    if (!state.devEui.trim()) errs.devEui = "DevEUI is required";
    else if (!validateDevEui(state.devEui)) errs.devEui = "Must be exactly 16 hex characters";
    if (!state.appKey.trim()) errs.appKey = "AppKey is required";
    else if (!validateAppKey(state.appKey)) errs.appKey = "Must be exactly 32 hex characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (step === "model") {
      if (!state.model) return;
      // Auto-fill name from model if empty
      if (!state.name) set("name", state.model.name);
      setStep("identity");
    } else if (step === "identity") {
      if (validateIdentity()) setStep("location");
    } else if (step === "location") {
      setStep("review");
    }
  }

  async function handleSubmit() {
    if (!validateIdentity()) { setStep("identity"); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name.trim(),
          model: state.model?.id,
          devEui: normaliseHex(state.devEui),
          appKey: normaliseHex(state.appKey),
          description: state.description.trim() || undefined,
          latitude: state.lat ? parseFloat(state.lat) : undefined,
          longitude: state.lng ? parseFloat(state.lng) : undefined,
          location: [state.building, state.floor, state.room]
            .filter(Boolean)
            .join(" / ") || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Server error ${res.status}`);
      }

      const device = await res.json();
      onSuccess?.(device.id);
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step renderers ─────────────────────────────────────────────────────────

  function renderModelStep() {
    const filtered = DEVICE_MODELS.filter((m) => {
      const matchCat = categoryFilter === "All" || m.category === categoryFilter;
      const matchSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Select the Milesight device model you want to register. This helps us pre-configure
          the correct data channels.
        </p>

        {/* Search + filter */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Search models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            style={{ width: 160 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Model grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 10,
            maxHeight: 360,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {filtered.map((model) => {
            const isSelected = state.model?.id === model.id;
            return (
              <button
                key={model.id}
                onClick={() => set("model", model)}
                style={{
                  background: isSelected ? "#ff660018" : "rgba(255,255,255,0.03)",
                  border: `2px solid ${isSelected ? "#ff6600" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10,
                  padding: "12px 10px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22 }}>{model.icon}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--text-muted)",
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    {model.category}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isSelected ? "#ff6600" : "var(--text)",
                  }}
                >
                  {model.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {model.description}
                </span>
                {model.channels.length > 0 && (
                  <span style={{ fontSize: 10, color: "rgba(255,102,0,0.6)" }}>
                    {model.channels.slice(0, 3).join(", ")}
                    {model.channels.length > 3 ? ` +${model.channels.length - 3} more` : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderIdentityStep() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            background: "rgba(255,102,0,0.06)",
            border: "1px solid rgba(255,102,0,0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          📡 Registering <strong style={{ color: "var(--text)" }}>
            {state.model?.name}
          </strong> — {state.model?.description}
        </div>

        {/* Device name */}
        <div>
          <label className="label">Device name *</label>
          <input
            className="input"
            value={state.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Office Temperature Sensor"
            style={errors.name ? { borderColor: "#ef4444" } : {}}
          />
          {errors.name && (
            <p style={{ fontSize: 11, color: "#ef4444", margin: "3px 0 0" }}>{errors.name}</p>
          )}
        </div>

        {/* DevEUI */}
        <div>
          <label className="label">DevEUI * <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(16 hex chars)</span></label>
          <input
            className="input"
            value={state.devEui}
            onChange={(e) => set("devEui", e.target.value)}
            placeholder="24E124XXXXXXXX"
            maxLength={23}
            style={{
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              ...(errors.devEui ? { borderColor: "#ef4444" } : {}),
            }}
          />
          {errors.devEui && (
            <p style={{ fontSize: 11, color: "#ef4444", margin: "3px 0 0" }}>{errors.devEui}</p>
          )}
          <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "3px 0 0" }}>
            Found on the device label, QR code, or in the Milesight toolbox app.
          </p>
        </div>

        {/* AppKey */}
        <div>
          <label className="label">AppKey * <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(32 hex chars)</span></label>
          <input
            className="input"
            value={state.appKey}
            onChange={(e) => set("appKey", e.target.value)}
            placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            maxLength={47}
            style={{
              fontFamily: "monospace",
              letterSpacing: "0.03em",
              ...(errors.appKey ? { borderColor: "#ef4444" } : {}),
            }}
          />
          {errors.appKey && (
            <p style={{ fontSize: 11, color: "#ef4444", margin: "3px 0 0" }}>{errors.appKey}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="label">Description <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
          <textarea
            className="input"
            value={state.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Any notes about this device…"
            rows={2}
            style={{ resize: "vertical" }}
          />
        </div>
      </div>
    );
  }

  function renderLocationStep() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Optionally specify where this device is installed. This is used for the map widget
          and device search.
        </p>

        {/* Address fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="label">Building</label>
            <input
              className="input"
              value={state.building}
              onChange={(e) => set("building", e.target.value)}
              placeholder="e.g. Main Office"
            />
          </div>
          <div>
            <label className="label">Floor</label>
            <input
              className="input"
              value={state.floor}
              onChange={(e) => set("floor", e.target.value)}
              placeholder="e.g. 2nd floor"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="label">Room / Zone</label>
            <input
              className="input"
              value={state.room}
              onChange={(e) => set("room", e.target.value)}
              placeholder="e.g. Server room"
            />
          </div>
        </div>

        {/* GPS */}
        <div>
          <label className="label">GPS coordinates <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(click on map or type)</span></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Latitude</label>
              <input
                className="input"
                type="number"
                step="any"
                value={state.lat}
                onChange={(e) => set("lat", e.target.value)}
                placeholder="37.9838"
              />
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Longitude</label>
              <input
                className="input"
                type="number"
                step="any"
                value={state.lng}
                onChange={(e) => set("lng", e.target.value)}
                placeholder="23.7275"
              />
            </div>
          </div>

          <MiniMapPicker
            lat={state.lat ? parseFloat(state.lat) : undefined}
            lng={state.lng ? parseFloat(state.lng) : undefined}
            onChange={(lat, lng) => {
              set("lat", String(lat));
              set("lng", String(lng));
            }}
          />
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    const locationStr = [state.building, state.floor, state.room].filter(Boolean).join(" / ");
    const hasGps = state.lat && state.lng;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {submitError && (
          <div
            style={{
              background: "#ef444420",
              border: "1px solid #ef444440",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#ef4444",
            }}
          >
            ❌ {submitError}
          </div>
        )}

        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Review the details below and click <strong>Register device</strong> to add it to your
          account. The device will start sending data once it joins the LoRaWAN network.
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {[
            { label: "Model",    value: `${state.model?.icon} ${state.model?.name} — ${state.model?.description}` },
            { label: "Name",     value: state.name },
            { label: "DevEUI",   value: normaliseHex(state.devEui), mono: true },
            { label: "AppKey",   value: normaliseHex(state.appKey).replace(/(.{8})/g, "$1 ").trim(), mono: true },
            { label: "Location", value: locationStr || "—" },
            { label: "GPS",      value: hasGps ? `${parseFloat(state.lat).toFixed(5)}, ${parseFloat(state.lng).toFixed(5)}` : "—" },
          ].map((row, i) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                padding: "10px 16px",
                borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none",
                gap: 16,
              }}
            >
              <span
                style={{
                  width: 80,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: row.mono ? "monospace" : undefined,
                  letterSpacing: row.mono ? "0.04em" : undefined,
                  wordBreak: "break-all",
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#3b82f615",
            border: "1px solid #3b82f630",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            color: "#93c5fd",
          }}
        >
          ℹ️ After registration, go to your Milesight developer console and add this device
          with the same DevEUI and AppKey to allow it to join.
        </div>
      </div>
    );
  }

  function renderCurrentStep() {
    switch (step) {
      case "model":    return renderModelStep();
      case "identity": return renderIdentityStep();
      case "location": return renderLocationStep();
      case "review":   return renderReviewStep();
    }
  }

  const isNextDisabled = step === "model" && !state.model;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18,
          width: "100%",
          maxWidth: 620,
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Add new device</h2>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                Register a LoRaWAN device to start receiving data
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 24,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <StepBar current={step} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            className="btn-ghost"
            onClick={step === "model" ? onClose : goBack}
          >
            {step === "model" ? "Cancel" : "← Back"}
          </button>

          {step === "review" ? (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ minWidth: 150 }}
            >
              {submitting ? "Registering…" : "✅ Register device"}
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={isNextDisabled}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
