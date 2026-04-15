"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const AddDeviceWizard = dynamic(
  () => import("@/components/devices/AddDeviceWizard"),
  { ssr: false }
);

interface DeviceRow {
  id: string;
  name: string;
  devEui: string;
  model: string | null;
  description: string | null;
  online: boolean;
  lastSeenAt: string | null;
  battery: number | null;
  signal: number | null;
  location: string | null;
  channels: string[];
}

interface Props {
  devices: DeviceRow[];
  locale: string;
  canManage: boolean;
}

function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: online ? "#22c55e20" : "rgba(255,255,255,0.06)",
        color: online ? "#22c55e" : "var(--text-muted)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: online ? "#22c55e" : "#6b7280",
          boxShadow: online ? "0 0 6px #22c55e" : "none",
        }}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

function timeAgo(isoStr: string | null): string {
  if (!isoStr) return "Never";
  const s = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function DevicesClient({ devices: initialDevices, locale, canManage }: Props) {
  const [devices, setDevices] = useState<DeviceRow[]>(initialDevices);
  const [search, setSearch] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [filterOnline, setFilterOnline] = useState<"all" | "online" | "offline">("all");

  const t = locale === "el";

  const filtered = devices.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.devEui.toLowerCase().includes(search.toLowerCase()) ||
      (d.model ?? "").toLowerCase().includes(search.toLowerCase());
    const matchOnline =
      filterOnline === "all" ||
      (filterOnline === "online" && d.online) ||
      (filterOnline === "offline" && !d.online);
    return matchSearch && matchOnline;
  });

  async function handleDeviceAdded(deviceId: string) {
    // Reload list
    const res = await fetch("/api/devices");
    if (res.ok) {
      const data = await res.json();
      setDevices(data);
    }
    setShowWizard(false);
  }

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1400 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            🖥️ {t ? "Συσκευές" : "Devices"}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            {devices.length} device{devices.length !== 1 ? "s" : ""} registered
            {" · "}
            <span style={{ color: "#22c55e" }}>{onlineCount} online</span>
            {" · "}
            <span style={{ color: "var(--text-muted)" }}>
              {devices.length - onlineCount} offline
            </span>
          </p>
        </div>
        {canManage && (
          <button
            className="btn-primary"
            onClick={() => setShowWizard(true)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            ＋ {t ? "Προσθήκη Συσκευής" : "Add device"}
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 360 }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              fontSize: 14,
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder={t ? "Αναζήτηση συσκευής…" : "Search by name, DevEUI, model…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "online", "offline"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterOnline(f)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: filterOnline === f ? "#ff6600" : "rgba(255,255,255,0.06)",
                color: filterOnline === f ? "#fff" : "var(--text-muted)",
                fontWeight: filterOnline === f ? 700 : 400,
              }}
            >
              {f === "all" ? "All" : f === "online" ? "🟢 Online" : "⚫ Offline"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Device table */}
      <div
        className="card"
        style={{ overflow: "hidden", padding: 0 }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔌</div>
            {devices.length === 0 ? (
              <>
                <p style={{ marginBottom: 14 }}>
                  {t ? "Δεν υπάρχουν συσκευές ακόμα." : "No devices yet."}
                </p>
                {canManage && (
                  <button className="btn-primary" onClick={() => setShowWizard(true)}>
                    Register your first device
                  </button>
                )}
              </>
            ) : (
              <p>No devices match your search.</p>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {["Name", "DevEUI", "Model", "Status", "Battery", "Signal", "Last seen", "Channels", ""].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((device) => (
                  <tr
                    key={device.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255,255,255,0.02)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Name */}
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{device.name}</div>
                      {device.description && (
                        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 1 }}>
                          {device.description}
                        </div>
                      )}
                      {device.location && (
                        <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 1 }}>
                          📍 {device.location}
                        </div>
                      )}
                    </td>

                    {/* DevEUI */}
                    <td style={{ padding: "12px 14px" }}>
                      <code
                        style={{
                          fontSize: 11,
                          background: "rgba(255,255,255,0.05)",
                          padding: "2px 7px",
                          borderRadius: 4,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {device.devEui}
                      </code>
                    </td>

                    {/* Model */}
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 12 }}>
                      {device.model ?? "—"}
                    </td>

                    {/* Online */}
                    <td style={{ padding: "12px 14px" }}>
                      <OnlineBadge online={device.online} />
                    </td>

                    {/* Battery */}
                    <td style={{ padding: "12px 14px", fontSize: 12 }}>
                      {device.battery !== null ? (
                        <span
                          style={{
                            color:
                              device.battery > 50
                                ? "#22c55e"
                                : device.battery > 20
                                ? "#f59e0b"
                                : "#ef4444",
                          }}
                        >
                          🔋 {device.battery}%
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>

                    {/* Signal */}
                    <td style={{ padding: "12px 14px", fontSize: 12 }}>
                      {device.signal !== null ? (
                        <span
                          style={{
                            color:
                              device.signal > -80
                                ? "#22c55e"
                                : device.signal > -100
                                ? "#f59e0b"
                                : "#ef4444",
                          }}
                        >
                          📶 {device.signal} dBm
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>

                    {/* Last seen */}
                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {timeAgo(device.lastSeenAt)}
                    </td>

                    {/* Channels */}
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 220 }}>
                        {device.channels.slice(0, 4).map((ch) => (
                          <span
                            key={ch}
                            style={{
                              fontSize: 10,
                              background: "rgba(255,102,0,0.1)",
                              color: "#ff6600",
                              borderRadius: 4,
                              padding: "1px 5px",
                            }}
                          >
                            {ch}
                          </span>
                        ))}
                        {device.channels.length > 4 && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                            +{device.channels.length - 4}
                          </span>
                        )}
                        {device.channels.length === 0 && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            No data yet
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link
                          href={`/devices/${device.id}`}
                          className="btn-ghost"
                          style={{ padding: "4px 10px", fontSize: 11 }}
                        >
                          📊 View
                        </Link>
                        {canManage && (
                          <Link
                            href={`/devices/${device.id}/edit`}
                            className="btn-ghost"
                            style={{ padding: "4px 10px", fontSize: 11 }}
                          >
                            ✏️ Edit
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Device Wizard */}
      {showWizard && (
        <AddDeviceWizard
          onSuccess={handleDeviceAdded}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
