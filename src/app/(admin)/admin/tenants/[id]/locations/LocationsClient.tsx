"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FiMapPin, FiPlus, FiEdit2, FiTrash2, FiStar, FiX, FiSave,
  FiLoader, FiAlertCircle, FiArrowLeft, FiNavigation, FiMap,
} from "react-icons/fi";

const MiniMapPicker = dynamic(() => import("@/components/devices/MiniMapPicker"), { ssr: false });
import {
  saveLocationAction, deleteLocationAction, setMainLocationAction,
  type LocationInput,
} from "@/app/(admin)/admin/tenants/locations-actions";
import m from "@/components/customers/customers.module.css";

interface Loc {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  isMain: boolean;
  notes: string | null;
  _count: { devices: number };
}

interface Props {
  tenantId: string;
  tenantName: string;
  customerAddress: string;
  locations: Loc[];
  locale: string;
}

export default function LocationsClient({ tenantId, tenantName, customerAddress, locations, locale }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<Loc | "new" | null>(null);
  const [pending, start] = useTransition();
  const t = locale === "el";

  function del(loc: Loc) {
    if (loc.isMain) {
      alert(t ? "Δεν μπορείτε να διαγράψετε την κύρια τοποθεσία." : "Cannot delete the main location.");
      return;
    }
    if (!confirm(`${t ? "Διαγραφή" : "Delete"} "${loc.name}";`)) return;
    start(async () => {
      await deleteLocationAction(loc.id);
      router.refresh();
    });
  }

  function promote(id: string) {
    start(async () => {
      await setMainLocationAction(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link
          href="/admin/tenants"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.82rem", textDecoration: "none" }}
        >
          <FiArrowLeft size={14} /> {t ? "Πίσω στους tenants" : "Back"}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">
          <FiMapPin size={20} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Τοποθεσίες" : "Locations"} — <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{tenantName}</span>
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>
            ({locations.length})
          </span>
        </h1>
        <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
          <FiPlus size={14} /> {t ? "Νέα Τοποθεσία" : "New Location"}
        </button>
      </div>

      {customerAddress && (
        <div style={{ padding: 10, background: "var(--bg-elevated)", borderRadius: 6, fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 16 }}>
          {t ? "Διεύθυνση πελάτη" : "CRM address"}: <strong style={{ color: "var(--text-secondary)" }}>{customerAddress}</strong>
        </div>
      )}

      {locations.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <FiMapPin size={32} style={{ color: "var(--text-muted)", opacity: 0.4, margin: "0 auto 8px" }} />
          <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
            {t ? "Δεν υπάρχουν τοποθεσίες" : "No locations yet"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {t ? "Πατήστε «Νέα Τοποθεσία» για να ξεκινήσετε." : 'Click "New Location" to start.'}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {locations.map((loc) => (
            <div key={loc.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: loc.isMain ? "rgba(255,102,0,0.15)" : "var(--bg-elevated)",
                    color: loc.isMain ? "var(--orange)" : "var(--text-secondary)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {loc.isMain ? <FiStar size={16} /> : <FiMapPin size={16} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{loc.name}</div>
                    {loc.isMain && (
                      <span className="badge badge-orange" style={{ fontSize: "0.65rem" }}>
                        {t ? "Κύρια" : "Main"}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  {!loc.isMain && (
                    <button
                      type="button"
                      onClick={() => promote(loc.id)}
                      disabled={pending}
                      title={t ? "Ορισμός ως κύρια" : "Set as main"}
                      className={m.menuTrigger}
                    >
                      <FiStar size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(loc)}
                    disabled={pending}
                    className={m.menuTrigger}
                    title="Edit"
                  >
                    <FiEdit2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => del(loc)}
                    disabled={pending}
                    className={m.menuTrigger}
                    style={{ color: "var(--red)" }}
                    title="Delete"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {loc.address && <div>{loc.address}</div>}
                {(loc.zip || loc.city) && <div>{[loc.zip, loc.city].filter(Boolean).join(" ")}</div>}
                {loc.country && <div>{loc.country}</div>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.72rem", color: "var(--text-muted)", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                {loc.latitude != null && loc.longitude != null ? (
                  <span title="Geocoded">
                    <FiNavigation size={10} style={{ display: "inline", marginRight: 3 }} />
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </span>
                ) : (
                  <span style={{ color: "var(--yellow)" }}>
                    <FiAlertCircle size={10} style={{ display: "inline", marginRight: 3 }} />
                    {t ? "Χωρίς συντεταγμένες" : "Not geocoded"}
                  </span>
                )}
                <span style={{ flex: 1 }} />
                <span>{loc._count.devices} {t ? "συσκευές" : "devices"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <LocationModal
          tenantId={tenantId}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
          t={t}
        />
      )}
    </div>
  );
}

function LocationModal({
  tenantId, initial, onClose, onSaved, t,
}: {
  tenantId: string;
  initial: Loc | null;
  onClose: () => void;
  onSaved: () => void;
  t: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [zip, setZip] = useState(initial?.zip ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "Greece");
  const [latitude, setLatitude] = useState(initial?.latitude != null ? String(initial.latitude) : "");
  const [longitude, setLongitude] = useState(initial?.longitude != null ? String(initial.longitude) : "");
  const [isMain, setIsMain] = useState(initial?.isMain ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: LocationInput = {
      id: initial?.id,
      tenantId,
      name,
      address: address || null,
      zip: zip || null,
      city: city || null,
      country: country || "Greece",
      latitude: latitude.trim() ? Number(latitude) : null,
      longitude: longitude.trim() ? Number(longitude) : null,
      isMain,
      notes: notes || null,
    };
    start(async () => {
      try {
        await saveLocationAction(input);
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className={m.backdrop} onClick={onClose}>
      <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className={m.modalHeader}>
          <div className={m.modalTitle}>
            <FiMapPin size={16} />
            {initial ? (t ? "Επεξεργασία Τοποθεσίας" : "Edit Location") : (t ? "Νέα Τοποθεσία" : "New Location")}
          </div>
          <button onClick={onClose} className={m.modalClose}><FiX size={18} /></button>
        </div>
        <div className={m.modalBody}>
          <form onSubmit={submit} className={m.form}>
            {error && (
              <div className={`${m.alert} ${m.alertError}`}>
                <FiAlertCircle size={16} /> {error}
              </div>
            )}

            <div className={m.grid4}>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">{t ? "Όνομα τοποθεσίας" : "Location name"}</label>
                <input
                  className="input" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t ? "π.χ. Αποθήκη Αθήνας" : "e.g. Athens Warehouse"}
                />
              </div>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">{t ? "Διεύθυνση" : "Address"}</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className={m.field}>
                <label className="label">ΤΚ</label>
                <input className="input" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
              <div className={m.field}>
                <label className="label">{t ? "Πόλη" : "City"}</label>
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className={`${m.field} ${m.span2}`}>
                <label className="label">{t ? "Χώρα" : "Country"}</label>
                <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className={m.field}>
                <label className="label">Lat</label>
                <input
                  className="input" type="number" step="any" value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder={t ? "αυτόματο" : "auto"}
                />
              </div>
              <div className={m.field}>
                <label className="label">Lng</label>
                <input
                  className="input" type="number" step="any" value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder={t ? "αυτόματο" : "auto"}
                />
              </div>
              <div className={`${m.field} ${m.span4}`} style={{ marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMapOpen(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.8rem" }}
                >
                  <FiMap size={14} /> {t ? "Επιλογή στον χάρτη" : "Pick on map"}
                </button>
              </div>
              <div className={`${m.field} ${m.span2}`}>
                <label className={m.checkboxRow} style={{ marginTop: 20 }}>
                  <input
                    type="checkbox" checked={isMain}
                    onChange={(e) => setIsMain(e.target.checked)}
                  />
                  <FiStar size={13} style={{ color: "var(--orange)" }} />
                  {t ? "Κύρια τοποθεσία" : "Main location"}
                </label>
              </div>
              <div className={`${m.field} ${m.span4}`}>
                <label className="label">{t ? "Σημειώσεις" : "Notes"}</label>
                <textarea
                  className="input" rows={2} value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            </div>

            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", padding: "6px 0" }}>
              {t
                ? "💡 Αν αφήσετε Lat/Lng κενά, θα γίνει αυτόματη γεωκωδικοποίηση."
                : "💡 Leave Lat/Lng empty and we'll geocode from the address."}
            </div>

            <div className={m.saveBar}>
              <button type="submit" disabled={pending || !name.trim()} className={`btn-primary ${m.saveBtn}`}>
                {pending ? <FiLoader size={16} className="animate-spin" /> : <FiSave size={16} />}
                {t ? "Αποθήκευση" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {mapOpen && (
        <div
          className={m.backdrop}
          style={{ zIndex: 200 }}
          onClick={() => setMapOpen(false)}
        >
          <div
            className={m.modal}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720 }}
          >
            <div className={m.modalHeader}>
              <div className={m.modalTitle}>
                <FiMap size={16} /> {t ? "Επιλογή σημείου στον χάρτη" : "Pick point on map"}
              </div>
              <button onClick={() => setMapOpen(false)} className={m.modalClose}>
                <FiX size={18} />
              </button>
            </div>
            <div className={m.modalBody}>
              <div style={{ padding: 0 }}>
                <div style={{ height: 440, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <MiniMapPicker
                    lat={latitude ? Number(latitude) : undefined}
                    lng={longitude ? Number(longitude) : undefined}
                    onChange={(la, lng) => {
                      setLatitude(String(la));
                      setLongitude(String(lng));
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12 }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {latitude && longitude ? (
                      <>
                        <FiNavigation size={12} style={{ display: "inline", marginRight: 4, color: "var(--orange)" }} />
                        <code style={{ fontFamily: "monospace" }}>{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</code>
                      </>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>
                        {t ? "Κάντε κλικ στον χάρτη για να τοποθετήσετε δείκτη." : "Click on the map to drop a pin."}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setMapOpen(false)}
                    disabled={!latitude || !longitude}
                  >
                    {t ? "Ολοκλήρωση" : "Done"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
