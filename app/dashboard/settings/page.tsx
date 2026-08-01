"use client";
// app/dashboard/settings/page.tsx
// GrowthOS — Full Settings Page (Unified Single-Source-of-Truth with ProfileSettingsModal)

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";
import {
  LayoutDashboard, Play, BarChart2, Trophy, Users, Settings, LogOut, ChevronLeft, Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: <LayoutDashboard size={18} />, label: "Dashboard",     href: "/dashboard" },
  { icon: <Play size={18} />,           label: "Practice Arena",href: "/dashboard/practice" },
  { icon: <BarChart2 size={18} />,      label: "Leaderboard",   href: "/dashboard/leaderboard" },
  { icon: <Trophy size={18} />,         label: "Challenges",    href: "/dashboard/challenges" },
  { icon: <Users size={18} />,          label: "Community",     href: "/dashboard/community" },
  { icon: <Settings size={18} />,       label: "Settings",      href: "/dashboard/settings", active: true },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const rawName = (user as any)?.full_name || (user as any)?.name || (typeof window !== "undefined" ? localStorage.getItem("user_name") : "") || "User";
  const currentUser = mounted ? (rawName.includes("@") ? rawName.split("@")[0] : rawName) : "User";
  const avatarInitials = mounted && currentUser && currentUser !== "User" ? currentUser.slice(0, 2).toUpperCase() : "US";
  const userAvatarUrl = (user as any)?.avatar_url || (user as any)?.image || null;

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={{ padding: "0 4px 24px" }}>
          <BrandLogo size="md" />
        </div>
        <nav style={s.nav}>
          {NAV_ITEMS.map(item => (
            <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
              <button style={{ ...s.navItem, ...(item.active ? s.navItemActive : {}) }}>
                <span style={{ opacity: item.active ? 1 : 0.5 }}>{item.icon}</span>
                <span style={{ opacity: item.active ? 1 : 0.6, fontSize: "0.85rem", fontWeight: item.active ? 600 : 400, color: item.active ? "white" : "#94a3b8" }}>
                  {item.label}
                </span>
                {item.active && <div style={s.navActiveDot} />}
              </button>
            </Link>
          ))}
        </nav>
        <div style={s.sidebarFooter}>
          <div
            style={{ ...s.sidebarUser, cursor: "pointer" }}
            onClick={() => setIsProfileModalOpen(true)}
            title="Open Profile Settings"
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={currentUser} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={s.avatarSmall}>{avatarInitials}</div>
            )}
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>{currentUser}</div>
              <div style={{ fontSize: "0.7rem", color: "#818cf8", fontWeight: 600 }}>{user?.plan || user?.plan_tier || "MEMBER PLAN"}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={() => logout ? logout() : (localStorage.clear(), window.location.href = "/login")} title="Log Out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={s.backBtn}><ChevronLeft size={16} /> Dashboard</button>
            </Link>
            <div style={s.pageTitle}>⚙️ Settings</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{ ...s.avatarMed, cursor: "pointer", overflow: "hidden" }}
              onClick={() => setIsProfileModalOpen(true)}
              title="Open Profile Settings"
            >
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={currentUser} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                avatarInitials
              )}
            </div>
          </div>
        </div>

        {/* Embedded Settings UI — Unified single-source-of-truth with ProfileSettingsModal */}
        <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", overflow: "hidden" }}>
          <ProfileSettingsModal
            isOpen={true}
            onClose={() => router.push("/dashboard")}
            isEmbedded={true}
          />
        </div>
      </main>

      {/* Modal overlay when clicking user card at bottom left */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex", height: "100vh", background: "#060f22", color: "#e2e8f0",
    fontFamily: "'DM Sans', sans-serif", overflow: "hidden", position: "relative",
  },
  bg: {
    position: "fixed", inset: 0,
    background: "radial-gradient(ellipse at 15% 0%, rgba(99,102,241,0.12) 0%, transparent 65%), radial-gradient(ellipse at 85% 100%, rgba(34,211,238,0.08) 0%, transparent 60%)",
    pointerEvents: "none", zIndex: 0,
  },
  bgGrid: {
    position: "fixed", inset: 0,
    backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
    backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0,
  },
  bgGlow: {
    position: "fixed", top: "-100px", right: "-100px", width: "400px", height: "400px",
    background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
    filter: "blur(60px)", pointerEvents: "none", zIndex: 0,
  },

  // Sidebar
  sidebar: {
    width: "230px", flexShrink: 0, background: "rgba(6,15,34,0.85)", backdropFilter: "blur(20px)",
    borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column",
    padding: "20px 14px", zIndex: 10, position: "relative",
  },
  sidebarLogo: { display: "flex", alignItems: "center", gap: "10px", padding: "0 8px 24px" },
  sidebarLogoText: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "white", letterSpacing: "0.03em" },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: "4px" },
  navItem: {
    width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px",
    borderRadius: "10px", border: "none", background: "transparent", color: "#64748b",
    fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", position: "relative", transition: "all 0.2s ease",
  },
  navItemActive: { background: "rgba(99,102,241,0.12)", color: "white" },
  navActiveDot: { position: "absolute", right: "10px", width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1" },
  sidebarFooter: {
    paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  sidebarUser: { display: "flex", alignItems: "center", gap: "10px" },
  avatarSmall: {
    width: "28px", height: "28px", borderRadius: "50%",
    background: "linear-gradient(135deg,#6366f1,#3b82f6)", color: "white",
    fontSize: "0.72rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoutBtn: {
    background: "none", border: "none", color: "#475569", cursor: "pointer",
    padding: "6px", borderRadius: "6px", transition: "all 0.2s ease",
  },

  // Main
  main: { flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", zIndex: 1, position: "relative" },
  topbar: {
    height: "64px", padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "rgba(6,15,34,0.6)", backdropFilter: "blur(12px)", flexShrink: 0,
  },
  backBtn: {
    display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px",
    borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  pageTitle: { fontSize: "1rem", fontWeight: 700, color: "white" },
  avatarMed: {
    width: "36px", height: "36px", borderRadius: "50%",
    background: "linear-gradient(135deg,#6366f1,#3b82f6)", color: "white",
    fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
  },
};