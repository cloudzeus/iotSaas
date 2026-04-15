"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

// Local types — avoids importing from @prisma/client before `prisma generate`
interface DeviceShape {
  id: string;
  devEui: string;
  name: string;
}

interface DeviceLogShape {
  id: bigint | number | string;
  receivedAt: Date | string;
  eventType: string;
  fPort?: number | null;
  fCnt?: number | null;
  rssi?: number | null;
  snr?: string | number | null;
  dataRate?: string | null;
  rawHex?: string | null;
  decodedPayload?: unknown;
}

interface Props {
  device: DeviceShape;
  logs: DeviceLogShape[];
  locale: string;
}

export default function DeviceLogsClient({ device, logs, locale }: Props) {
  type LogRow = DeviceLogShape;
  const [expanded, setExpanded] = useState<string | null>(null);
  const t = locale === "el";

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/devices" className="btn-ghost" style={{ padding: "6px" }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title">{t ? "Logs Συσκευής" : "Device Logs"}</h1>
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{device.name} — {device.devEui}</span>
          </div>
        </div>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          <RefreshCw size={14} />
          {t ? "Ανανέωση" : "Refresh"}
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: "24px" }}></th>
                <th>{t ? "Ώρα" : "Time"}</th>
                <th>{t ? "Τύπος" : "Type"}</th>
                <th>fPort</th>
                <th>fCnt</th>
                <th>RSSI</th>
                <th>SNR</th>
                <th>{t ? "Data Rate" : "Data Rate"}</th>
                <th>{t ? "Raw Hex" : "Raw Hex"}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                    {t ? "Δεν υπάρχουν logs" : "No logs available"}
                  </td>
                </tr>
              ) : (
                logs.map((log: LogRow) => (
                  <>
                    <tr
                      key={log.id.toString()}
                      style={{ cursor: log.decodedPayload ? "pointer" : "default" }}
                      onClick={() => log.decodedPayload && toggle(log.id.toString())}
                    >
                      <td>
                        {log.decodedPayload ? (
                          expanded === log.id.toString()
                            ? <ChevronDown size={14} style={{ color: "var(--orange)" }} />
                            : <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                        ) : null}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                        {formatDateTime(log.receivedAt, locale === "el" ? "el-GR" : "en-GB")}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: "var(--orange-dim)",
                            color: "var(--orange)",
                          }}
                        >
                          {log.eventType}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{log.fPort ?? "—"}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{log.fCnt ?? "—"}</td>
                      <td style={{ color: log.rssi !== null && log.rssi < -100 ? "#ef4444" : "var(--green)", fontSize: "0.8rem" }}>
                        {log.rssi !== null ? `${log.rssi} dBm` : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {log.snr !== null ? `${log.snr} dB` : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{log.dataRate || "—"}</td>
                      <td>
                        {log.rawHex ? (
                          <code
                            style={{
                              fontSize: "0.7rem",
                              background: "var(--bg-elevated)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              maxWidth: "200px",
                              display: "inline-block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {log.rawHex.slice(0, 32)}{log.rawHex.length > 32 ? "…" : ""}
                          </code>
                        ) : "—"}
                      </td>
                    </tr>
                    {expanded === log.id.toString() && log.decodedPayload && (
                      <tr key={`exp-${log.id}`}>
                        <td colSpan={9} style={{ background: "var(--bg-elevated)", padding: "12px 20px" }}>
                          <pre
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                              margin: 0,
                              overflow: "auto",
                              maxHeight: "200px",
                            }}
                          >
                            {JSON.stringify(log.decodedPayload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
