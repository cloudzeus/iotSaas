"use client";

import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [locale, setLocale] = useState("el");
  const [theme, setTheme] = useState("dark");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  const t = locale === "el";

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setLocale(session.user.locale || "el");
      setTheme(session.user.theme || "dark");
    }
  }, [session]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, locale, theme }),
    });
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("dgsmart-theme", theme);
    await update({ name, locale, theme });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPw !== confirmPw) {
      setPwError(t ? "Οι κωδικοί δεν ταιριάζουν" : "Passwords do not match");
      return;
    }
    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    if (res.ok) {
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      alert(t ? "Ο κωδικός άλλαξε!" : "Password changed!");
    } else {
      const data = await res.json();
      setPwError(data.error || "Error");
    }
  };

  return (
    <div style={{ maxWidth: "640px" }}>
      <div className="page-header">
        <h1 className="page-title">
          <Settings size={22} style={{ display: "inline", marginRight: "8px", color: "var(--orange)" }} />
          {t ? "Ρυθμίσεις" : "Settings"}
        </h1>
      </div>

      {/* Profile */}
      <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 600, marginBottom: "20px" }}>
          {t ? "Προφίλ" : "Profile"}
        </h2>
        <form onSubmit={handleSaveProfile}>
          <div style={{ marginBottom: "16px" }}>
            <label className="label">{t ? "Ονοματεπώνυμο" : "Full Name"}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="label">{t ? "Email" : "Email"}</label>
            <input className="input" value={session?.user.email || ""} disabled style={{ opacity: 0.6 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div>
              <label className="label">{t ? "Γλώσσα" : "Language"}</label>
              <select
                className="input"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              >
                <option value="el">Ελληνικά</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="label">{t ? "Θέμα" : "Theme"}</label>
              <select
                className="input"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="dark">{t ? "Σκούρο" : "Dark"}</option>
                <option value="light">{t ? "Φωτεινό" : "Light"}</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={15} />
            {saving ? (t ? "Αποθήκευση..." : "Saving...") : saved ? "✓ Saved" : (t ? "Αποθήκευση" : "Save Changes")}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card" style={{ padding: "24px" }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 600, marginBottom: "20px" }}>
          {t ? "Αλλαγή Κωδικού" : "Change Password"}
        </h2>
        <form onSubmit={handleChangePassword}>
          {pwError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "10px", color: "#ef4444", fontSize: "0.875rem", marginBottom: "12px" }}>
              {pwError}
            </div>
          )}
          <div style={{ marginBottom: "12px" }}>
            <label className="label">{t ? "Τρέχων Κωδικός" : "Current Password"}</label>
            <input className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label className="label">{t ? "Νέος Κωδικός" : "New Password"}</label>
            <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label className="label">{t ? "Επιβεβαίωση Κωδικού" : "Confirm Password"}</label>
            <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
          </div>
          <button type="submit" className="btn-secondary">
            {t ? "Αλλαγή Κωδικού" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
