"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Cpu, Bell, CreditCard, Settings,
  HelpCircle, LogOut, ChevronLeft, ChevronRight,
  Users, BookOpen, BarChart3, Shield, LayoutGrid,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  role: string;
  locale: string;
}

function NavLink({
  href,
  icon: Icon,
  label,
  collapsed,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`sidebar-link${active ? " active" : ""}`}
      title={collapsed ? label : undefined}
    >
      <Icon className="icon" size={18} />
      <span className="sidebar-label">{label}</span>
    </Link>
  );
}

export default function Sidebar({ collapsed, onToggle, role, locale }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const t = locale === "el";

  const customerLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: t ? "Dashboard" : "Dashboard" },
    { href: "/devices", icon: Cpu, label: t ? "Συσκευές" : "Devices" },
    { href: "/alerts", icon: Bell, label: t ? "Ειδοποιήσεις" : "Alerts" },
    { href: "/billing", icon: CreditCard, label: t ? "Χρεώσεις" : "Billing" },
    { href: "/settings", icon: Settings, label: t ? "Ρυθμίσεις" : "Settings" },
    { href: "/support", icon: HelpCircle, label: t ? "Υποστήριξη" : "Support" },
  ];

  const adminLinks = [
    { href: "/admin/overview", icon: BarChart3, label: t ? "Επισκόπηση" : "Overview" },
    { href: "/admin/tenants", icon: Users, label: t ? "Πελάτες" : "Tenants" },
    { href: "/admin/devices", icon: Cpu, label: t ? "Συσκευές" : "Devices" },
    { href: "/admin/widgets", icon: LayoutGrid, label: t ? "Widgets" : "Widgets" },
    { href: "/admin/plans", icon: BookOpen, label: t ? "Πλάνα" : "Plans" },
    { href: "/admin/audit", icon: Shield, label: t ? "Ιστορικό" : "Audit Log" },
    { href: "/admin/settings", icon: Settings, label: t ? "Ρυθμίσεις" : "Settings" },
  ];

  const links = isAdmin ? adminLinks : customerLinks;

  return (
    <>
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
        {/* Logo */}
        <div
          style={{
            height: "var(--topbar-height)",
            display: "flex",
            alignItems: "center",
            padding: collapsed ? "0 14px" : "0 16px",
            borderBottom: "1px solid var(--border)",
            justifyContent: collapsed ? "center" : "space-between",
            flexShrink: 0,
          }}
        >
          {!collapsed && (
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>
              DGSmart<span style={{ color: "var(--orange)" }}>Hub</span>
            </span>
          )}
          {collapsed && (
            <span style={{ color: "var(--orange)", fontWeight: 800, fontSize: "1rem" }}>DG</span>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              collapsed={collapsed}
              active={pathname === link.href || pathname.startsWith(link.href + "/")}
            />
          ))}
        </nav>

        {/* Bottom: collapse toggle + logout */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sidebar-link btn-ghost"
            style={{ width: "100%", border: "none", cursor: "pointer", display: "flex" }}
            title={collapsed ? (t ? "Αποσύνδεση" : "Sign Out") : undefined}
          >
            <LogOut size={18} className="icon" />
            <span className="sidebar-label">{t ? "Αποσύνδεση" : "Sign Out"}</span>
          </button>

          <button
            onClick={onToggle}
            className="sidebar-link btn-ghost"
            style={{ width: "100%", border: "none", cursor: "pointer", display: "flex" }}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight size={18} className="icon" /> : <ChevronLeft size={18} className="icon" />}
            {!collapsed && (
              <span className="sidebar-label" style={{ fontSize: "0.75rem" }}>
                {t ? "Σύμπτυξη" : "Collapse"}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
