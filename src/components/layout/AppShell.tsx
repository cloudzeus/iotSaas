"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: string;
  userLocale: string;
}

export default function AppShell({
  children,
  userName,
  userEmail,
  userRole,
  userLocale,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locale, setLocale] = useState(userLocale);

  useEffect(() => {
    const saved = localStorage.getItem("dgsmart-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("dgsmart-sidebar-collapsed", String(next));
  };

  const toggleMobile = () => setMobileOpen((v) => !v);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`mobile-overlay${mobileOpen ? " visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <div className={mobileOpen ? "mobile-open" : ""}>
        <Sidebar
          collapsed={collapsed}
          onToggle={toggleSidebar}
          role={userRole}
          locale={locale}
        />
      </div>

      {/* Main content */}
      <div className={`main-layout${collapsed ? " sidebar-collapsed" : ""}`}>
        <Topbar
          userName={userName}
          userEmail={userEmail}
          locale={locale}
          onLocaleChange={setLocale}
          onMobileMenuToggle={toggleMobile}
        />
        <main style={{ padding: "24px", maxWidth: "1600px" }}>
          {children}
        </main>
      </div>
    </>
  );
}
