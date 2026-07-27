"use client";
// app/dashboard/settings/page.tsx
// GrowthOS — Full Settings Page
// Sections: Profile, Account Security, Notifications, Appearance,
//           Privacy, Subscription, Danger Zone

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard, Target, Play, BarChart2, Trophy,
  BookOpen, Users, Settings, LogOut, ChevronLeft,
  Bell, User, Lock, Palette, Shield, CreditCard,
  Trash2, Camera, Check, Eye, EyeOff, ChevronRight,
  AlertTriangle, Loader2, Moon, Sun, Monitor,
  Volume2, VolumeX, Mail, Smartphone, Globe,
  Key, RefreshCw, Download, Upload,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  name: string;
  email: string;
  bio: string;
  country: string;
  phone: string;
  avatar_url: string;
}

interface NotificationSettings {
  email_missions: boolean;
  email_streak: boolean;
  email_weekly: boolean;
  push_missions: boolean;
  push_streak: boolean;
  push_achievements: boolean;
  sms_critical: boolean;
}

interface AppearanceSettings {
  theme: "dark" | "light" | "system";
  accent_color: string;
  compact_mode: boolean;
  animations: boolean;
}

interface PrivacySettings {
  profile_public: boolean;
  show_streak: boolean;
  show_leaderboard: boolean;
  data_analytics: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
}

const NAV_ITEMS = [
  { icon: <LayoutDashboard size={18} />, label: "Dashboard",     href: "/dashboard" },
  { icon: <Play size={18} />,           label: "Practice Arena",href: "/dashboard/practice" },
  { icon: <BarChart2 size={18} />,      label: "Leaderboard",   href: "/dashboard/leaderboard" },
  { icon: <Trophy size={18} />,         label: "Challenges",    href: "/dashboard/challenges" },
  { icon: <Users size={18} />,          label: "Community",     href: "/dashboard/community" },
  { icon: <Settings size={18} />,       label: "Settings",      href: "/dashboard/settings", active: true },
];

const SETTING_SECTIONS = [
  { id: "profile",       icon: <User size={16} />,        label: "Profile",           desc: "Name, bio, avatar" },
  { id: "security",      icon: <Lock size={16} />,        label: "Security",          desc: "Password, 2FA" },
  { id: "notifications", icon: <Bell size={16} />,        label: "Notifications",     desc: "Email, push, SMS" },
  { id: "appearance",    icon: <Palette size={16} />,     label: "Appearance",        desc: "Theme, colors" },
  { id: "privacy",       icon: <Shield size={16} />,      label: "Privacy",           desc: "Visibility, data" },
  { id: "subscription",  icon: <CreditCard size={16} />,  label: "Subscription",      desc: "Plan, billing" },
  { id: "danger",        icon: <Trash2 size={16} />,      label: "Danger Zone",       desc: "Delete account" },
];

const ACCENT_COLORS = [
  { name: "Indigo",  value: "#6366f1" },
  { name: "Blue",    value: "#3b82f6" },
  { name: "Cyan",    value: "#06b6d4" },
  { name: "Green",   value: "#22c55e" },
  { name: "Orange",  value: "#f97316" },
  { name: "Pink",    value: "#ec4899" },
  { name: "Purple",  value: "#a855f7" },
  { name: "Rose",    value: "#f43f5e" },
];

// ── Toast Component ───────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 200, display: "flex", alignItems: "center", gap: "10px", padding: "14px 18px", background: type === "success" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${type === "success" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`, borderRadius: "12px", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "toastIn 0.3s ease", maxWidth: "360px" }}>
      <span style={{ fontSize: "1rem" }}>{type === "success" ? "✅" : "❌"}</span>
      <span style={{ fontSize: "0.85rem", color: type === "success" ? "#86efac" : "#fca5a5", fontWeight: 500 }}>{msg}</span>
    </div>
  );
}

// ── Toggle Component ──────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: "44px", height: "24px", borderRadius: "12px", background: value ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.1)", border: `1px solid ${value ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.15)"}`, cursor: "pointer", position: "relative", transition: "all 0.25s ease", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: "2px", left: value ? "22px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.25s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

// ── Section Wrapper ───────────────────────────────────────────────────────────

function SectionCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={s.sectionCard}>
      <div style={s.sectionCardHeader}>
        <h2 style={s.sectionCardTitle}>{title}</h2>
        <p style={s.sectionCardDesc}>{desc}</p>
      </div>
      <div style={s.sectionCardBody}>{children}</div>
    </div>
  );
}

// ── Row Component ─────────────────────────────────────────────────────────────

function SettingRow({ label, desc, children, danger }: { label: string; desc?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{ ...s.settingRow, ...(danger ? { borderColor: "rgba(239,68,68,0.15)" } : {}) }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: danger ? "#ef4444" : "white" }}>{label}</div>
        {desc && <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px", lineHeight: 1.5 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [loaded, setLoaded]           = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    name: "", email: "", bio: "", country: "", phone: "", avatar_url: "",
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Security state
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd]   = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [sessions, setSessions]       = useState<{ id: string; device: string; location: string; last_active: string; current: boolean }[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_missions: true, email_streak: true, email_weekly: false,
    push_missions: true, push_streak: true, push_achievements: true,
    sms_critical: false,
  });

  // Appearance state
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: "dark", accent_color: "#6366f1", compact_mode: false, animations: true,
  });

  // Privacy state
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profile_public: true, show_streak: true, show_leaderboard: true, data_analytics: true,
  });

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    fetchProfile();
    fetchSessions();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          name:       data.name || data.full_name || "",
          email:      data.email || "",
          bio:        data.bio || "",
          country:    data.country || "",
          phone:      data.phone || "",
          avatar_url: data.image || data.avatar_url || "",
        });
        if (data.image) setAvatarPreview(data.image);
      }
    } catch {}
  }

  async function fetchSessions() {
    // Fallback mock sessions — replace with real API when available
    setSessions([
      { id: "s1", device: "Chrome on Windows", location: "Pathānkot, IN", last_active: "Now", current: true },
      { id: "s2", device: "Safari on iPhone",  location: "Pathānkot, IN", last_active: "2 hours ago", current: false },
    ]);
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
  }

  // ── Save Profile ───────────────────────────────────────────────────────────
  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/settings/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name:    profile.name,
          bio:     profile.bio,
          country: profile.country,
          phone:   profile.phone,
        }),
      });
      if (res.ok) {
        // Update localStorage user_name
        localStorage.setItem("user_name", profile.name);
        showToast("Profile updated successfully");
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to update profile", "error");
      }
    } catch {
      showToast("Connection error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Change Password ────────────────────────────────────────────────────────
  async function changePassword() {
    if (!currentPwd || !newPwd) { showToast("Please fill in all password fields", "error"); return; }
    if (newPwd !== confirmPwd)  { showToast("New passwords do not match", "error"); return; }
    if (newPwd.length < 8)      { showToast("Password must be at least 8 characters", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      if (res.ok) {
        showToast("Password changed successfully");
        setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to change password", "error");
      }
    } catch {
      showToast("Connection error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Save Notifications ─────────────────────────────────────────────────────
  async function saveNotifications() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/settings/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(notifications),
      });
      if (res.ok) {
        showToast("Notification preferences saved");
      } else {
        showToast("Failed to save notifications", "error");
      }
    } catch {
      // Save to localStorage as fallback
      localStorage.setItem("growthos_notifications", JSON.stringify(notifications));
      showToast("Saved locally (offline mode)");
    } finally {
      setSaving(false);
    }
  }

  // ── Save Appearance ────────────────────────────────────────────────────────
  async function saveAppearance() {
    setSaving(true);
    // Always save to localStorage immediately for instant feedback
    localStorage.setItem("growthos_appearance", JSON.stringify(appearance));
    try {
      await fetch(`${API}/settings/appearance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(appearance),
      });
      showToast("Appearance settings saved");
    } catch {
      showToast("Saved locally");
    } finally {
      setSaving(false);
    }
  }

  // ── Save Privacy ───────────────────────────────────────────────────────────
  async function savePrivacy() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/settings/privacy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(privacy),
      });
      if (res.ok) {
        showToast("Privacy settings updated");
      } else {
        showToast("Failed to save privacy settings", "error");
      }
    } catch {
      localStorage.setItem("growthos_privacy", JSON.stringify(privacy));
      showToast("Saved locally (offline mode)");
    } finally {
      setSaving(false);
    }
  }

  // ── Revoke Session ─────────────────────────────────────────────────────────
  async function revokeSession(sessionId: string) {
    try {
      await fetch(`${API}/auth/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast("Session revoked");
    } catch {
      showToast("Failed to revoke session", "error");
    }
  }

  // ── Export Data ────────────────────────────────────────────────────────────
  async function exportData() {
    try {
      const res = await fetch(`${API}/settings/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "growthos_data.json"; a.click();
        URL.revokeObjectURL(url);
        showToast("Data exported successfully");
      }
    } catch {
      showToast("Export failed. Try again.", "error");
    }
  }

  // ── Delete Account ─────────────────────────────────────────────────────────
  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      showToast("Please type DELETE to confirm", "error");
      return;
    }
    try {
      const res = await fetch(`${API}/auth/delete-account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        localStorage.clear();
        window.location.href = "/";
      } else {
        showToast("Failed to delete account", "error");
      }
    } catch {
      showToast("Connection error", "error");
    }
  }

  const avatar = profile.name ? profile.name[0].toUpperCase() : "U";

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={s.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</div>
            <h3 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#ef4444", margin: "0 0 8px" }}>Delete Account</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6, marginBottom: "20px" }}>
              This will permanently delete your account, all your data, streak history, and progress. This cannot be undone.
            </p>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "0.78rem", color: "#475569", marginBottom: "6px" }}>Type <strong style={{ color: "#ef4444" }}>DELETE</strong> to confirm:</div>
              <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE" style={{ ...s.input, borderColor: "rgba(239,68,68,0.3)", width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowDeleteModal(false)} style={s.btnSecondary}>Cancel</button>
              <button onClick={deleteAccount}
                style={{ ...s.btnDanger, opacity: deleteConfirm !== "DELETE" ? 0.5 : 1 }}
                disabled={deleteConfirm !== "DELETE"}>
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarLogo}>
          <Image src="/images/GrowthOs.png" alt="GrowthOS" width={32} height={32} style={{ borderRadius: "50%" }} />
          <span style={s.sidebarLogoText}>GrowthOS</span>
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
          <div style={s.sidebarUser}>
            <div style={s.avatarSmall}>{avatar}</div>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>{profile.name || "User"}</div>
              <div style={{ fontSize: "0.7rem", color: "#475569" }}>Pro Plan</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ ...s.main, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(12px)", transition: "all 0.5s ease" }}>

        {/* Topbar */}
        <div style={s.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={s.backBtn}><ChevronLeft size={16} /> Dashboard</button>
            </Link>
            <div style={s.pageTitle}>⚙️ Settings</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={s.avatarMed}>{avatar}</div>
          </div>
        </div>

        {/* Body */}
        <div style={s.body}>

          {/* Left nav */}
          <aside style={s.settingsNav}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#334155", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 12px", marginBottom: "8px" }}>
              Settings
            </div>
            {SETTING_SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                style={{ ...s.settingsNavItem, ...(activeSection === sec.id ? s.settingsNavItemActive : {}) }}>
                <div style={{ ...s.settingsNavIcon, ...(activeSection === sec.id ? { color: "#818cf8", background: "rgba(99,102,241,0.15)" } : {}) }}>
                  {sec.icon}
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: activeSection === sec.id ? "white" : "#94a3b8" }}>{sec.label}</div>
                  <div style={{ fontSize: "0.7rem", color: "#334155", marginTop: "1px" }}>{sec.desc}</div>
                </div>
                {activeSection === sec.id && <ChevronRight size={14} style={{ color: "#475569" }} />}
              </button>
            ))}
          </aside>

          {/* Right content */}
          <div style={s.settingsContent}>

            {/* ── PROFILE ─────────────────────────────────────────────── */}
            {activeSection === "profile" && (
              <SectionCard title="Profile" desc="Manage your public profile information">

                {/* Avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", marginBottom: "16px" }}>
                  <div style={{ position: "relative" }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar" style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(99,102,241,0.4)" }} />
                    ) : (
                      <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: 700, color: "white", border: "2px solid rgba(99,102,241,0.4)" }}>
                        {avatar}
                      </div>
                    )}
                    <button onClick={() => fileRef.current?.click()}
                      style={{ position: "absolute", bottom: 0, right: 0, width: "24px", height: "24px", borderRadius: "50%", background: "#6366f1", border: "2px solid #060f22", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Camera size={12} style={{ color: "white" }} />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => setAvatarPreview(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "white" }}>{profile.name || "Your Name"}</div>
                    <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>{profile.email}</div>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ marginTop: "8px", padding: "5px 12px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "7px", color: "#818cf8", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                      Change Photo
                    </button>
                  </div>
                </div>

                {/* Form fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                  <div>
                    <label style={s.label}>Full Name</label>
                    <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                      placeholder="Your full name" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Email Address</label>
                    <input value={profile.email} disabled
                      placeholder="your@email.com"
                      style={{ ...s.input, opacity: 0.5, cursor: "not-allowed" }} />
                    <div style={{ fontSize: "0.68rem", color: "#334155", marginTop: "4px" }}>Email cannot be changed</div>
                  </div>
                  <div>
                    <label style={s.label}>Country / Region</label>
                    <input value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                      placeholder="e.g. India" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Phone Number</label>
                    <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 98765 43210" style={s.input} />
                  </div>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={s.label}>Bio</label>
                  <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell others about yourself..."
                    rows={3}
                    style={{ ...s.input, resize: "vertical", minHeight: "80px", lineHeight: 1.6 }} />
                </div>

                <button onClick={saveProfile} disabled={saving} style={s.btnPrimary}>
                  {saving ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Saving...</> : "Save Profile"}
                </button>
              </SectionCard>
            )}

            {/* ── SECURITY ────────────────────────────────────────────── */}
            {activeSection === "security" && (
              <>
                <SectionCard title="Change Password" desc="Use a strong password with letters, numbers and symbols">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                    <div>
                      <label style={s.label}>Current Password</label>
                      <div style={{ position: "relative" }}>
                        <input type={showCurrentPwd ? "text" : "password"} value={currentPwd}
                          onChange={e => setCurrentPwd(e.target.value)}
                          placeholder="••••••••••" style={{ ...s.input, paddingRight: "42px" }} />
                        <button onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                          style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#475569" }}>
                          {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={s.label}>New Password</label>
                      <div style={{ position: "relative" }}>
                        <input type={showNewPwd ? "text" : "password"} value={newPwd}
                          onChange={e => setNewPwd(e.target.value)}
                          placeholder="Min 8 characters" style={{ ...s.input, paddingRight: "42px" }} />
                        <button onClick={() => setShowNewPwd(!showNewPwd)}
                          style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#475569" }}>
                          {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {newPwd && (
                        <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                          {[
                            { label: "8+ chars", ok: newPwd.length >= 8 },
                            { label: "Uppercase", ok: /[A-Z]/.test(newPwd) },
                            { label: "Number", ok: /\d/.test(newPwd) },
                            { label: "Symbol", ok: /[^A-Za-z0-9]/.test(newPwd) },
                          ].map(check => (
                            <div key={check.label} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 8px", borderRadius: "6px", background: check.ok ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${check.ok ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: check.ok ? "#22c55e" : "#334155" }} />
                              <span style={{ fontSize: "0.65rem", color: check.ok ? "#22c55e" : "#475569" }}>{check.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={s.label}>Confirm New Password</label>
                      <input type="password" value={confirmPwd}
                        onChange={e => setConfirmPwd(e.target.value)}
                        placeholder="••••••••••" style={{ ...s.input, borderColor: confirmPwd && confirmPwd !== newPwd ? "rgba(239,68,68,0.5)" : undefined }} />
                      {confirmPwd && confirmPwd !== newPwd && (
                        <div style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: "4px" }}>Passwords do not match</div>
                      )}
                    </div>
                  </div>
                  <button onClick={changePassword} disabled={saving} style={s.btnPrimary}>
                    {saving ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Updating...</> : "Update Password"}
                  </button>
                </SectionCard>

                <SectionCard title="Two-Factor Authentication" desc="Add an extra layer of security to your account">
                  <SettingRow label="Enable 2FA" desc="Require a verification code when signing in">
                    <Toggle value={twoFAEnabled} onChange={v => {
                      setTwoFAEnabled(v);
                      showToast(v ? "2FA enabled (feature coming soon)" : "2FA disabled");
                    }} />
                  </SettingRow>
                </SectionCard>

                <SectionCard title="Active Sessions" desc="Devices currently signed in to your account">
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {sessions.map(session => (
                      <div key={session.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${session.current ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: "12px" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: session.current ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Monitor size={18} style={{ color: session.current ? "#818cf8" : "#475569" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "white" }}>{session.device}</span>
                            {session.current && <span style={{ fontSize: "0.62rem", padding: "1px 7px", borderRadius: "10px", background: "rgba(34,197,94,0.12)", color: "#22c55e", fontWeight: 700 }}>Current</span>}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "2px" }}>
                            {session.location} · {session.last_active}
                          </div>
                        </div>
                        {!session.current && (
                          <button onClick={() => revokeSession(session.id)}
                            style={{ padding: "5px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "7px", color: "#ef4444", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </>
            )}

            {/* ── NOTIFICATIONS ────────────────────────────────────────── */}
            {activeSection === "notifications" && (
              <>
                <SectionCard title="Email Notifications" desc="Choose what emails you receive from GrowthOS">
                  <SettingRow label="Mission Reminders" desc="Daily email when you haven't started your missions">
                    <Toggle value={notifications.email_missions} onChange={v => setNotifications(p => ({ ...p, email_missions: v }))} />
                  </SettingRow>
                  <SettingRow label="Streak Alerts" desc="Email when your streak is at risk">
                    <Toggle value={notifications.email_streak} onChange={v => setNotifications(p => ({ ...p, email_streak: v }))} />
                  </SettingRow>
                  <SettingRow label="Weekly Progress Report" desc="Summary of your week every Sunday">
                    <Toggle value={notifications.email_weekly} onChange={v => setNotifications(p => ({ ...p, email_weekly: v }))} />
                  </SettingRow>
                </SectionCard>

                <SectionCard title="Push Notifications" desc="Browser and mobile push alerts">
                  <SettingRow label="Mission Reminders" desc="Push notification for daily missions">
                    <Toggle value={notifications.push_missions} onChange={v => setNotifications(p => ({ ...p, push_missions: v }))} />
                  </SettingRow>
                  <SettingRow label="Streak Warnings" desc="Alert before your streak breaks">
                    <Toggle value={notifications.push_streak} onChange={v => setNotifications(p => ({ ...p, push_streak: v }))} />
                  </SettingRow>
                  <SettingRow label="Achievements" desc="Notify when you earn badges or level up">
                    <Toggle value={notifications.push_achievements} onChange={v => setNotifications(p => ({ ...p, push_achievements: v }))} />
                  </SettingRow>
                </SectionCard>

                <SectionCard title="SMS Notifications" desc="Text message alerts for critical events">
                  <SettingRow label="Critical Alerts Only" desc="Only for streak breaks and account security">
                    <Toggle value={notifications.sms_critical} onChange={v => setNotifications(p => ({ ...p, sms_critical: v }))} />
                  </SettingRow>
                </SectionCard>

                <button onClick={saveNotifications} disabled={saving} style={s.btnPrimary}>
                  {saving ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Saving...</> : "Save Notification Preferences"}
                </button>
              </>
            )}

            {/* ── APPEARANCE ───────────────────────────────────────────── */}
            {activeSection === "appearance" && (
              <>
                <SectionCard title="Theme" desc="Choose your preferred color scheme">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "8px" }}>
                    {[
                      { value: "dark",   icon: <Moon size={18} />,    label: "Dark" },
                      { value: "light",  icon: <Sun size={18} />,     label: "Light" },
                      { value: "system", icon: <Monitor size={18} />, label: "System" },
                    ].map(t => (
                      <button key={t.value} onClick={() => setAppearance(p => ({ ...p, theme: t.value as any }))}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "16px", background: appearance.theme === t.value ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.02)", border: `1px solid ${appearance.theme === t.value ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: "12px", cursor: "pointer", transition: "all 0.2s" }}>
                        <span style={{ color: appearance.theme === t.value ? "#818cf8" : "#475569" }}>{t.icon}</span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: appearance.theme === t.value ? "white" : "#64748b" }}>{t.label}</span>
                        {appearance.theme === t.value && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1" }} />}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#334155", marginTop: "4px" }}>
                    Light mode coming soon — currently dark mode only
                  </div>
                </SectionCard>

                <SectionCard title="Accent Color" desc="Personalize the highlight color across the app">
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {ACCENT_COLORS.map(color => (
                      <button key={color.value} onClick={() => setAppearance(p => ({ ...p, accent_color: color.value }))}
                        title={color.name}
                        style={{ width: "36px", height: "36px", borderRadius: "50%", background: color.value, border: `3px solid ${appearance.accent_color === color.value ? "white" : "transparent"}`, cursor: "pointer", transition: "all 0.2s", transform: appearance.accent_color === color.value ? "scale(1.15)" : "scale(1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {appearance.accent_color === color.value && <Check size={14} style={{ color: "white" }} />}
                      </button>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Interface" desc="Adjust the density and motion of the interface">
                  <SettingRow label="Compact Mode" desc="Reduce spacing for more content on screen">
                    <Toggle value={appearance.compact_mode} onChange={v => setAppearance(p => ({ ...p, compact_mode: v }))} />
                  </SettingRow>
                  <SettingRow label="Animations" desc="Enable smooth transitions and micro-interactions">
                    <Toggle value={appearance.animations} onChange={v => setAppearance(p => ({ ...p, animations: v }))} />
                  </SettingRow>
                </SectionCard>

                <button onClick={saveAppearance} disabled={saving} style={s.btnPrimary}>
                  {saving ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Saving...</> : "Save Appearance"}
                </button>
              </>
            )}

            {/* ── PRIVACY ──────────────────────────────────────────────── */}
            {activeSection === "privacy" && (
              <>
                <SectionCard title="Profile Visibility" desc="Control who can see your profile and activity">
                  <SettingRow label="Public Profile" desc="Allow other users to view your profile">
                    <Toggle value={privacy.profile_public} onChange={v => setPrivacy(p => ({ ...p, profile_public: v }))} />
                  </SettingRow>
                  <SettingRow label="Show Streak" desc="Display your streak on your public profile">
                    <Toggle value={privacy.show_streak} onChange={v => setPrivacy(p => ({ ...p, show_streak: v }))} />
                  </SettingRow>
                  <SettingRow label="Show on Leaderboard" desc="Appear in the public leaderboard rankings">
                    <Toggle value={privacy.show_leaderboard} onChange={v => setPrivacy(p => ({ ...p, show_leaderboard: v }))} />
                  </SettingRow>
                </SectionCard>

                <SectionCard title="Data & Analytics" desc="How GrowthOS uses your data to personalize your experience">
                  <SettingRow label="Usage Analytics" desc="Help us improve GrowthOS with anonymous usage data">
                    <Toggle value={privacy.data_analytics} onChange={v => setPrivacy(p => ({ ...p, data_analytics: v }))} />
                  </SettingRow>
                </SectionCard>

                <SectionCard title="Your Data" desc="Download or manage your personal data">
                  <SettingRow label="Export All Data" desc="Download a copy of all your GrowthOS data as JSON">
                    <button onClick={exportData} style={s.btnSecondary}>
                      <Download size={14} /> Export
                    </button>
                  </SettingRow>
                </SectionCard>

                <button onClick={savePrivacy} disabled={saving} style={s.btnPrimary}>
                  {saving ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Saving...</> : "Save Privacy Settings"}
                </button>
              </>
            )}

            {/* ── SUBSCRIPTION ─────────────────────────────────────────── */}
            {activeSection === "subscription" && (
              <SectionCard title="Your Subscription" desc="Manage your GrowthOS plan and billing">
                {/* Current plan */}
                <div style={{ padding: "20px", background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(59,130,246,0.06))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "16px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "white" }}>Pro Plan</div>
                      <div style={{ fontSize: "0.78rem", color: "#818cf8", marginTop: "2px" }}>Active · Renews monthly</div>
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#818cf8", fontFamily: "'Rajdhani',sans-serif" }}>₹499<span style={{ fontSize: "0.75rem", color: "#475569" }}>/mo</span></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {[
                      "Unlimited AI Questions",
                      "Execution Lab Access",
                      "Full Practice Arena",
                      "AI Growth Insights",
                      "Career Graph",
                      "Priority Support",
                    ].map(feat => (
                      <div key={feat} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#94a3b8" }}>
                        <Check size={12} style={{ color: "#22c55e", flexShrink: 0 }} />
                        {feat}
                      </div>
                    ))}
                  </div>
                </div>

                <SettingRow label="Billing Cycle" desc="You are billed monthly. Cancel anytime.">
                  <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Monthly</span>
                </SettingRow>
                <SettingRow label="Next Billing Date" desc="Your next payment will be processed on">
                  <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>April 18, 2026</span>
                </SettingRow>
                <SettingRow label="Cancel Subscription" desc="You'll retain access until the end of billing period" danger>
                  <button style={s.btnDangerSoft}>Cancel Plan</button>
                </SettingRow>
              </SectionCard>
            )}

            {/* ── DANGER ZONE ──────────────────────────────────────────── */}
            {activeSection === "danger" && (
              <SectionCard title="Danger Zone" desc="Irreversible actions — proceed with caution">
                <div style={{ padding: "16px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "12px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ef4444" }}>These actions cannot be undone</div>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.6 }}>
                    Deleting your account will permanently remove all your data including streak history, practice records, growth plans, and profile. You will not be able to recover this data.
                  </div>
                </div>

                <SettingRow label="Reset Progress" desc="Clear all streak data and practice history (keeps account)" danger>
                  <button onClick={() => showToast("Progress reset feature coming soon", "error")} style={s.btnDangerSoft}>
                    Reset
                  </button>
                </SettingRow>

                <SettingRow label="Delete Account" desc="Permanently delete your account and all associated data" danger>
                  <button onClick={() => setShowDeleteModal(true)} style={s.btnDanger}>
                    <Trash2 size={14} /> Delete Account
                  </button>
                </SettingRow>
              </SectionCard>
            )}

          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        input, textarea { outline: none; }
        input::placeholder, textarea::placeholder { color: #334155; }
        button { font-family: inherit; }
      `}</style>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif", position: "relative", overflow: "hidden" },
  bg: { position: "fixed", inset: 0, background: "linear-gradient(135deg,#020818 0%,#060f22 50%,#02091a 100%)", zIndex: 0 },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px)", backgroundSize: "48px 48px", zIndex: 0 },
  bgGlow: { position: "fixed", top: "-20%", left: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)", zIndex: 0, pointerEvents: "none" },

  sidebar: { position: "fixed", left: 0, top: 0, bottom: 0, width: "220px", background: "rgba(6,15,34,0.95)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", zIndex: 10, padding: "0 0 20px" },
  sidebarLogo: { display: "flex", alignItems: "center", gap: "10px", padding: "22px 20px 18px" },
  sidebarLogoText: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "white", letterSpacing: "0.05em" },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: "2px", padding: "8px 12px", overflowY: "auto" },
  navItem: { position: "relative", display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "10px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", transition: "all .2s", textAlign: "left", width: "100%" },
  navItemActive: { background: "rgba(99,102,241,0.12)", color: "white" },
  navActiveDot: { position: "absolute", right: "10px", width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1" },
  sidebarFooter: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" },
  sidebarUser: { flex: 1, display: "flex", alignItems: "center", gap: "8px" },
  avatarSmall: { width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#3b82f6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 },
  logoutBtn: { background: "none", border: "none", cursor: "pointer", color: "#475569", padding: "4px", display: "flex" },

  main: { marginLeft: "220px", flex: 1, padding: "0 32px 40px", position: "relative", zIndex: 1, maxWidth: "calc(100vw - 220px)", overflowX: "hidden" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: "28px" },
  backBtn: { display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", color: "#64748b", fontSize: "0.8rem", cursor: "pointer" },
  pageTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.4rem", fontWeight: 700, color: "white", letterSpacing: "0.02em" },
  avatarMed: { width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#3b82f6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700 },

  body: { display: "flex", gap: "24px", alignItems: "flex-start" },

  settingsNav: { width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "2px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "14px 10px", position: "sticky", top: "20px" },
  settingsNavItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 10px", borderRadius: "10px", background: "none", border: "none", cursor: "pointer", transition: "all .2s", width: "100%" },
  settingsNavItemActive: { background: "rgba(99,102,241,0.1)" },
  settingsNavIcon: { width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", flexShrink: 0, transition: "all .2s" },

  settingsContent: { flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },

  sectionCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" },
  sectionCardHeader: { padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  sectionCardTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "white", margin: "0 0 4px" },
  sectionCardDesc: { fontSize: "0.78rem", color: "#475569", margin: 0 },
  sectionCardBody: { padding: "20px 24px" },

  settingRow: { display: "flex", alignItems: "center", gap: "16px", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },

  label: { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" } as React.CSSProperties,
  input: { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", fontSize: "0.88rem", fontFamily: "inherit", transition: "border-color 0.2s" },

  btnPrimary: { display: "inline-flex", alignItems: "center", gap: "7px", padding: "11px 24px", background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(59,130,246,0.15))", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "10px", color: "#a5b4fc", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" },
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#64748b", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" },
  btnDanger: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" },
  btnDangerSoft: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", color: "#ef4444", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" },
  modal: { background: "rgba(6,15,34,0.98)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "18px", padding: "28px", width: "min(420px, 92vw)", boxShadow: "0 24px 80px rgba(0,0,0,0.7)", textAlign: "center" as const },
};