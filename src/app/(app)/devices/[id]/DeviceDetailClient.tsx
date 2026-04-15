"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, ScrollText, Trash2 } from "lucide-react";

// Local type — avoids importing from @prisma/client before `prisma generate`
interface DeviceShape {
  id: string;
  devEui: string;
  name: string;
  description?: string | null;
  model?: string | null;
  online: boolean;
  lastSeenAt?: Date | string | null;
  battery?: number | null;
  signal?: number | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: Date | string;
}

interface Props {
  device: DeviceShape;
  locale: string;
  canManage: boolean;
}

export default function DeviceDetailClient({ device, locale, canManage }: Props) {
  const [name, setName] = useState(device.name);
  const [description, setDescription] = useState(device.description || "");
  const [model, setModel] = useState(device.model || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const t = locale === "el";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/devices/${device.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, model }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm(t ? "Διαγραφή συσκευής;" : "Delete this device?")) return;
    await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
    router.push("/devices");
  };

  return (
    <div style={{ maxWidth: "640px" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/devices" className="btn-ghost" style={{ padding: "6px" }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 className="page-title">{t ? "Επεξεργασία Συσκευής" : "Edit Device"}</h1>
        </div>
        <Link href={`/devices/${device.id}/logs`} className="btn-secondary">
          <ScrollText size={14} />
          {t ? "Logs" : "Logs"}
        </Link>
      </div>

      <div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
        <div style={{ marginBottom: "16px", padding: "12px", background: "var(--bg-elevated)", borderRadius: "6px" }}>
          <label className="label">DevEUI</label>
          <code style={{ color: "var(--orange)", fontSize: "0.9rem" }}>{device.devEui}</code>
        </div>

        {canManage ? (
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: "14px" }}>
              <label className="label">{t ? "Όνομα Συσκευής" : "Device Name"}</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label className="label">{t ? "Μοντέλο" : "Model"}</label>
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label className="label">{t ? "Περιγραφή" : "Description"}</label>
              <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                <Save size={14} />
                {saving ? "..." : saved ? "✓" : (t ? "Αποθήκευση" : "Save")}
              </button>
              <button type="button" className="btn-ghost" style={{ color: "#ef4444", marginLeft: "auto" }} onClick={handleDelete}>
                <Trash2 size={14} />
                {t ? "Διαγραφή" : "Delete"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ color: "var(--text-secondary)" }}>
            <p><strong>{t ? "Όνομα:" : "Name:"}</strong> {device.name}</p>
            <p><strong>{t ? "Μοντέλο:" : "Model:"}</strong> {device.model || "—"}</p>
            <p><strong>{t ? "Περιγραφή:" : "Description:"}</strong> {device.description || "—"}</p>
            <p><strong>{t ? "Κατάσταση:" : "Status:"}</strong> {device.online ? (t ? "Συνδεδεμένη" : "Online") : (t ? "Αποσυνδεδεμένη" : "Offline")}</p>
            {device.location && <p><strong>{t ? "Τοποθεσία:" : "Location:"}</strong> {device.location}</p>}
          </div>
        )}
      </div>

      {/* Live stats strip */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {device.battery != null && (
          <div className="card" style={{ padding: "12px 16px", flex: "1 1 120px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>{t ? "Μπαταρία" : "Battery"}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: device.battery > 20 ? "var(--green)" : "#ef4444" }}>{device.battery}%</div>
          </div>
        )}
        {device.signal != null && (
          <div className="card" style={{ padding: "12px 16px", flex: "1 1 120px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>{t ? "Σήμα" : "Signal"}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{device.signal} dBm</div>
          </div>
        )}
        {device.lastSeenAt && (
          <div className="card" style={{ padding: "12px 16px", flex: "1 1 160px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>{t ? "Τελευταία ενημέρωση" : "Last Seen"}</div>
            <div style={{ fontSize: "0.85rem" }}>{new Date(device.lastSeenAt).toLocaleString(t ? "el-GR" : "en-GB")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
