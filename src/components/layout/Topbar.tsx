"use client";

import { useEffect, useState } from "react";
import { Menu, Sun, Moon } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface TopbarProps {
  userName: string;
  userEmail: string;
  locale: string;
  onLocaleChange: (locale: string) => void;
  onMobileMenuToggle: () => void;
}

export default function Topbar({
  userName,
  userEmail,
  locale,
  onLocaleChange,
  onMobileMenuToggle,
}: TopbarProps) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("dgsmart-theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("dgsmart-theme", next);
    // Persist to server
    fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  };

  const handleLocaleChange = (newLocale: string) => {
    onLocaleChange(newLocale);
    fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    }).catch(() => {});
  };

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Mobile menu */}
        <button
          className="btn-ghost"
          onClick={onMobileMenuToggle}
          style={{ display: "none" }}
          id="mob-menu-btn"
        >
          <Menu size={20} />
        </button>

        <style>{`
          @media (max-width: 768px) {
            #mob-menu-btn { display: flex !important; }
          }
        `}</style>

        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
          {new Date().toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Language switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          {["el", "en"].map((l) => (
            <button
              key={l}
              onClick={() => handleLocaleChange(l)}
              style={{
                padding: "6px 12px",
                background: locale === l ? "var(--orange)" : "transparent",
                color: locale === l ? "#fff" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              {l === "el" ? "ΕΛ" : "EN"}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          className="btn-ghost"
          onClick={toggleTheme}
          title={locale === "el"
            ? (theme === "dark" ? "Φωτεινό θέμα" : "Σκοτεινό θέμα")
            : (theme === "dark" ? "Light mode" : "Dark mode")}
          style={{ padding: "8px" }}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User avatar */}
        <div
          title={userEmail}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--orange)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 700,
            cursor: "default",
            flexShrink: 0,
          }}
        >
          {getInitials(userName || userEmail)}
        </div>
      </div>
    </header>
  );
}
