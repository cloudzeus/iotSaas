"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Cpu, Radio, LayoutGrid, Battery, Activity, X, Eye,
} from "lucide-react";
import WidgetRenderer from "@/components/widgets/WidgetRenderer";
import type { WidgetType, WidgetConfig } from "@/components/widgets/types";
import m from "@/components/customers/customers.module.css";

interface Device {
  id: string;
  devEui: string;
  name: string;
  model: string | null;
  description: string | null;
  online: boolean;
  lastSeenAt: string | null;
  battery: number | null;
  signal: number | null;
  tenant: { id: string; name: string };
}

interface LiveDevice {
  connectStatus: string;
  electricity?: number;
  lastUpdateTime?: number;
  application?: { applicationName: string };
  firmwareVersion?: string;
  hardwareVersion?: string;
  sn?: string;
}

interface Channel { channel: string; unit: string | null; count: number; lastTs: string | null; }

interface WidgetTypeRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  appliesTo: string;
}

interface Props {
  device: Device;
  live: LiveDevice | null;
  channels: Channel[];
  compatible: WidgetTypeRow[];
  locale: string;
}

export default function DeviceDetailAdminClient({ device, live, channels, compatible, locale }: Props) {
  const [preview, setPreview] = useState<WidgetTypeRow | null>(null);
  const t = locale === "el";

  const online = live ? live.connectStatus === "ONLINE" : device.online;
  const battery = live?.electricity ?? device.battery;
  const lastSeen = live?.lastUpdateTime
    ? new Date(live.lastUpdateTime)
    : device.lastSeenAt ? new Date(device.lastSeenAt) : null;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link href="/admin/devices" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.85rem", textDecoration: "none" }}>
          <ArrowLeft size={14} /> {t ? "Πίσω στις συσκευές" : "Back to devices"}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">
          <Cpu size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {device.name}
          <StatusDot online={online} />
        </h1>
      </div>

      {/* INFO */}
      <div className="card" style={{ padding: 20, marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        <Info label={t ? "Πελάτης" : "Tenant"} value={<span className="badge badge-orange">{device.tenant.name}</span>} />
        <Info label="DevEUI" value={<code style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{device.devEui}</code>} />
        <Info label={t ? "Μοντέλο" : "Model"} value={device.model || "—"} />
        <Info label={t ? "Κατάσταση" : "Status"} value={<span style={{ color: online ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{online ? "Online" : "Offline"}</span>} />
        <Info label={t ? "Μπαταρία" : "Battery"} value={battery != null ? <><Battery size={12} style={{ display: "inline", marginRight: 4 }} />{battery}%</> : "—"} />
        <Info label={t ? "Τελευταία" : "Last seen"} value={lastSeen ? lastSeen.toLocaleString(t ? "el-GR" : "en-GB") : "—"} />
        {live?.application && <Info label="Application" value={live.application.applicationName} />}
        {live?.firmwareVersion && <Info label="Firmware" value={live.firmwareVersion} />}
        {live?.sn && <Info label="SN" value={live.sn} />}
      </div>

      {/* CHANNELS */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Radio size={14} /> {t ? "Κανάλια τηλεμετρίας" : "Telemetry channels"} ({channels.length})
        </h3>
        {channels.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {t ? "Καμία εγγραφή τηλεμετρίας ακόμη." : "No telemetry recorded yet."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {channels.map((c) => (
              <div key={c.channel} style={{ padding: "10px 12px", background: "var(--bg-elevated)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--orange)", fontWeight: 700, fontSize: "0.82rem", fontFamily: "monospace" }}>
                  {c.channel}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.72rem", marginTop: 4 }}>
                  {c.count.toLocaleString(t ? "el-GR" : "en-GB")} {t ? "δείγματα" : "samples"}
                  {c.unit ? ` · ${c.unit}` : ""}
                </div>
                {c.lastTs && (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: 2 }}>
                    {new Date(c.lastTs).toLocaleString(t ? "el-GR" : "en-GB")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COMPATIBLE WIDGETS */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <LayoutGrid size={14} /> {t ? "Συμβατά Widgets" : "Compatible widgets"} ({compatible.length})
        </h3>
        {compatible.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {t ? "Κανένα συμβατό widget για αυτό το μοντέλο." : "No widgets compatible with this model."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {compatible.map((w) => (
              <div
                key={w.id}
                style={{
                  padding: 16,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  display: "flex", flexDirection: "column", gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Activity size={14} style={{ color: "var(--orange)" }} />
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{w.name}</div>
                </div>
                <code style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{w.code}</code>
                {w.description && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{w.description}</div>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setPreview(w)}
                  style={{ marginTop: "auto", padding: "6px 12px", fontSize: "0.78rem", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Eye size={12} /> {t ? "Προεπισκόπηση" : "Preview"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <PreviewModal
          widget={preview}
          device={device}
          channels={channels}
          onClose={() => setPreview(null)}
          t={t}
        />
      )}
    </div>
  );
}

function PreviewModal({
  widget, device, channels, onClose, t,
}: {
  widget: WidgetTypeRow;
  device: Device;
  channels: Channel[];
  onClose: () => void;
  t: boolean;
}) {
  const [channel, setChannel] = useState<string>(channels[0]?.channel ?? "");
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d" | "30d">("24h");
  const [demo, setDemo] = useState(channels.length === 0);

  const config: WidgetConfig = {
    deviceId: device.id,
    deviceIds: [device.id],
    channel,
    channels: channel ? [channel] : [],
    timeRange,
    unit: channels.find((c) => c.channel === channel)?.unit ?? undefined,
  };

  const needsChannel = !["map", "device-grid", "alert-summary"].includes(widget.code);

  return (
    <div className={m.backdrop} onClick={onClose}>
      <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className={m.modalHeader}>
          <div className={m.modalTitle}>
            <Eye size={16} />
            {widget.name} · {device.name}
          </div>
          <button onClick={onClose} className={m.modalClose}><X size={18} /></button>
        </div>
        <div className={m.modalBody}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            {needsChannel && !demo && (
              <div>
                <label className="label">{t ? "Κανάλι" : "Channel"}</label>
                <select
                  className="input"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  disabled={channels.length === 0}
                >
                  {channels.length === 0 ? (
                    <option value="">{t ? "Χωρίς δεδομένα" : "No data"}</option>
                  ) : (
                    channels.map((c) => (
                      <option key={c.channel} value={c.channel}>
                        {c.channel}{c.unit ? ` (${c.unit})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
            {!demo && (
              <div>
                <label className="label">{t ? "Εύρος" : "Range"}</label>
                <select
                  className="input"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
                >
                  <option value="1h">1h</option>
                  <option value="6h">6h</option>
                  <option value="24h">24h</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                </select>
              </div>
            )}
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px",
              background: demo ? "var(--orange-dim)" : "var(--bg-elevated)",
              color: demo ? "var(--orange)" : "var(--text-secondary)",
              border: `1px solid ${demo ? "var(--orange)" : "var(--border)"}`,
              borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", fontWeight: 500,
            }}>
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => setDemo(e.target.checked)}
                style={{ accentColor: "var(--orange)" }}
              />
              {t ? "Demo δεδομένα" : "Demo data"}
            </label>
          </div>

          <div
            style={{
              height: 360,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {demo && (
              <span style={{
                position: "absolute", top: 10, right: 10, zIndex: 2,
                background: "var(--orange)", color: "white", padding: "3px 10px",
                borderRadius: 999, fontSize: "0.65rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                Demo
              </span>
            )}
            {demo ? (
              <DemoWidget code={widget.code} title={widget.name} />
            ) : needsChannel && !channel ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                {t ? "Αυτή η συσκευή δεν έχει στείλει τηλεμετρία ακόμη." : "No telemetry from this device yet."}
              </div>
            ) : (
              <WidgetRenderer
                id={`preview-${widget.id}`}
                type={widget.code as WidgetType}
                title={widget.name}
                config={config}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoWidget({ code, title }: { code: string; title: string }) {
  const points = Array.from({ length: 48 }, (_, i) => {
    const v = 50 + Math.sin(i / 3) * 25 + Math.cos(i / 7) * 10 + (Math.random() - 0.5) * 6;
    return Math.round(v * 10) / 10;
  });
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const latest = points[points.length - 1];
  const first = points[0];
  const delta = latest - first;

  switch (code) {
    case "stat-card":
      return (
        <div style={{ height: "100%", padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: "3rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
            {latest.toFixed(1)}<span style={{ fontSize: "1.2rem", color: "var(--text-muted)", marginLeft: 6 }}>°C</span>
          </div>
          <div style={{ marginTop: 10, color: delta >= 0 ? "var(--green)" : "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} ({((delta / first) * 100).toFixed(1)}%)
          </div>
        </div>
      );
    case "gauge": {
      const pct = Math.min(100, Math.max(0, ((latest - min) / range) * 100));
      const angle = -90 + (pct / 100) * 180;
      return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</div>
          <svg width={200} height={120} viewBox="0 0 200 120">
            <path d="M 20,100 A 80,80 0 0,1 180,100" stroke="var(--border)" strokeWidth={14} fill="none" strokeLinecap="round" />
            <path
              d="M 20,100 A 80,80 0 0,1 180,100"
              stroke="var(--orange)"
              strokeWidth={14}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 251} 251`}
            />
            <line x1={100} y1={100} x2={100 + 70 * Math.cos((angle * Math.PI) / 180)} y2={100 + 70 * Math.sin((angle * Math.PI) / 180)} stroke="var(--text-primary)" strokeWidth={3} strokeLinecap="round" />
            <circle cx={100} cy={100} r={6} fill="var(--text-primary)" />
          </svg>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", marginTop: -12 }}>{latest.toFixed(1)}</div>
        </div>
      );
    }
    case "line-chart":
    case "area-chart": {
      const W = 720, H = 260;
      const pad = 20;
      const pathD = points.map((p, i) => {
        const x = pad + (i / (points.length - 1)) * (W - pad * 2);
        const y = H - pad - ((p - min) / range) * (H - pad * 2);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      }).join(" ");
      const areaD = `${pathD} L${W - pad},${H - pad} L${pad},${H - pad} Z`;
      return (
        <div style={{ height: "100%", padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>{title}</div>
          <svg width="100%" height="calc(100% - 24px)" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {code === "area-chart" && <path d={areaD} fill="var(--orange-dim)" />}
            <path d={pathD} stroke="var(--orange)" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    }
    case "bar-chart": {
      const W = 720, H = 260;
      const pad = 20;
      const bw = (W - pad * 2) / points.length - 2;
      return (
        <div style={{ height: "100%", padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>{title}</div>
          <svg width="100%" height="calc(100% - 24px)" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {points.map((p, i) => {
              const h = ((p - min) / range) * (H - pad * 2);
              return (
                <rect
                  key={i}
                  x={pad + i * (bw + 2)}
                  y={H - pad - h}
                  width={bw}
                  height={h}
                  fill="var(--orange)"
                  opacity={0.85}
                />
              );
            })}
          </svg>
        </div>
      );
    }
    case "map":
      return (
        <div style={{ height: "100%", position: "relative", background: "linear-gradient(135deg, #1e293b, #0f172a)" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04) 1px, transparent 1px, transparent 40px)" }} />
          {[[30, 40], [60, 55], [45, 70], [75, 35]].map(([x, y], i) => (
            <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%` }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--orange)", boxShadow: "0 0 0 4px rgba(255,102,0,0.25)", transform: "translate(-50%, -50%)" }} />
            </div>
          ))}
        </div>
      );
    case "device-grid":
      return (
        <div style={{ height: "100%", padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {[
            { n: "WS101", on: true, v: "22.3°C" },
            { n: "UG56", on: true, v: "Gateway" },
            { n: "EM300", on: false, v: "—" },
            { n: "UC500", on: true, v: "89%" },
          ].map((d) => (
            <div key={d.n} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.on ? "var(--green)" : "var(--red)" }} />
                <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>{d.n}</span>
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>{d.v}</div>
            </div>
          ))}
        </div>
      );
    case "alert-summary":
      return (
        <div style={{ height: "100%", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { sev: "HIGH", msg: "Temperature above threshold", color: "var(--red)" },
            { sev: "MED", msg: "Battery low on EM300", color: "var(--yellow)" },
            { sev: "LOW", msg: "Weak signal WS101", color: "var(--blue)" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg-card)", borderRadius: 6, border: "1px solid var(--border)" }}>
              <span style={{ background: a.color, color: "white", padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700 }}>{a.sev}</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{a.msg}</span>
            </div>
          ))}
        </div>
      );
    case "telemetry-table":
      return (
        <div style={{ height: "100%", overflow: "auto" }}>
          <table style={{ width: "100%", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-card)", position: "sticky", top: 0 }}>
                <th style={{ padding: 10, textAlign: "left", color: "var(--text-muted)" }}>Time</th>
                <th style={{ padding: 10, textAlign: "left", color: "var(--text-muted)" }}>Channel</th>
                <th style={{ padding: 10, textAlign: "right", color: "var(--text-muted)" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {points.slice(-12).reverse().map((v, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: 10, color: "var(--text-secondary)" }}>{new Date(Date.now() - i * 60000).toLocaleTimeString()}</td>
                  <td style={{ padding: 10, color: "var(--orange)", fontFamily: "monospace" }}>temperature</td>
                  <td style={{ padding: 10, textAlign: "right", fontWeight: 600 }}>{v.toFixed(1)} °C</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Demo preview not available for: {code}
        </div>
      );
  }
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>{value}</div>
    </div>
  );
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      title={online ? "Online" : "Offline"}
      style={{
        display: "inline-block",
        width: 10, height: 10, borderRadius: "50%",
        background: online ? "var(--green)" : "var(--red)",
        boxShadow: online ? "0 0 0 3px rgba(34,197,94,0.18)" : "0 0 0 3px rgba(239,68,68,0.18)",
        marginLeft: 12, verticalAlign: "middle",
      }}
    />
  );
}
