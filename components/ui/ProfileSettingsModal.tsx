"use client";

import { useState, useEffect, useRef } from "react";
import {
  User, Lock, Bell, Palette, Shield, CreditCard, Trash2,
  X, Check, Camera, Moon, Sun, Monitor, Download, Key,
  Smartphone, Mail, Globe, ShieldAlert, Loader2, Sparkles, LogOut, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme, ThemeMode } from "@/context/ThemeContext";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  isEmbedded?: boolean;
}

interface UserProfile {
  id?: string;
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

interface PrivacySettings {
  profile_public: boolean;
  show_streak: boolean;
  show_leaderboard: boolean;
  data_analytics: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("access_token") || localStorage.getItem("token") || "";
}

const ACCENT_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue",   value: "#3b82f6" },
  { name: "Cyan",   value: "#06b6d4" },
  { name: "Green",  value: "#22c55e" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink",   value: "#ec4899" },
  { name: "Purple", value: "#a855f7" },
  { name: "Rose",   value: "#f43f5e" },
];

export default function ProfileSettingsModal({ isOpen, onClose, initialTab = "profile", isEmbedded = false }: ProfileSettingsModalProps) {
  const router = useRouter();
  const { user, setUser, logout } = useAuth();
  const { theme, resolvedTheme, accentColor, compactMode, animations, setTheme, setAccentColor, setCompactMode, setAnimations } = useTheme();

  const handleClose = () => {
    onClose();
    if (isEmbedded) {
      router.push("/dashboard");
    }
  };

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Profile Form State
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || "",
    email: user?.email || "",
    bio: "",
    country: "",
    phone: "",
    avatar_url: user?.image || "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_missions: true,
    email_streak: true,
    email_weekly: false,
    push_missions: true,
    push_streak: true,
    push_achievements: true,
    sms_critical: false,
  });

  // Privacy State
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profile_public: true,
    show_streak: true,
    show_leaderboard: true,
    data_analytics: true,
  });

  const isLight = resolvedTheme === "light";

  // Fetch full settings on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchFullSettings();
    }
  }, [isOpen, initialTab]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFullSettings = async () => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/settings/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile({
            id: data.profile.id,
            name: data.profile.name || user?.name || "",
            email: data.profile.email || user?.email || "",
            bio: data.profile.bio || "",
            country: data.profile.country || "",
            phone: data.profile.phone || "",
            avatar_url: data.profile.avatar_url || user?.image || "",
          });
        }
        if (data.notifications) setNotifications(data.notifications);
        if (data.privacy) setPrivacy(data.privacy);
      }
    } catch {
      // Fallback to auth user
      setProfile((prev) => ({
        ...prev,
        name: user?.name || prev.name,
        email: user?.email || prev.email,
        avatar_url: user?.image || prev.avatar_url,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/settings/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          bio: profile.bio,
          country: profile.country,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser({
            id: data.user.id || user?.id || "",
            email: data.user.email || user?.email || "",
            name: data.user.name || profile.name,
            image: data.user.avatar_url || profile.avatar_url,
          });
        }
        localStorage.setItem("user_name", profile.name);
        showToast("Profile updated successfully");
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to update profile", "error");
      }
    } catch {
      showToast("Network error updating profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfile((prev) => ({ ...prev, avatar_url: base64 }));
        showToast("Profile image selected. Click 'Save Changes' to update.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast("Please fill all password fields", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }

    setSaving(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/settings/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (res.ok) {
        showToast("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to change password", "error");
      }
    } catch {
      showToast("Network error changing password", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async (updated: NotificationSettings) => {
    setNotifications(updated);
    const token = getToken();
    try {
      await fetch(`${API}/settings/notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      showToast("Notification settings saved");
    } catch {
      showToast("Saved locally", "success");
    }
  };

  const handleSavePrivacy = async (updated: PrivacySettings) => {
    setPrivacy(updated);
    const token = getToken();
    try {
      await fetch(`${API}/settings/privacy`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      showToast("Privacy settings saved");
    } catch {
      showToast("Saved locally", "success");
    }
  };

  const handleExportData = async () => {
    const token = getToken();
    try {
      const res = await fetch(`${API}/settings/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `growthos_user_export_${user?.id || "data"}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("User data export downloaded");
      }
    } catch {
      showToast("Failed to export data", "error");
    }
  };

  if (!isOpen) return null;

  const bgModal     = isLight ? "#ffffff" : "#0c101d";
  const bgSidebar   = isLight ? "#f8fafc" : "#080c16";
  const textColor   = isLight ? "#0f172a" : "#ffffff";
  const subColor    = isLight ? "#64748b" : "#94a3b8";
  const borderColor = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const inputBg     = isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)";
  const inputBorder = isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";

  const navTabs = [
    { id: "profile",       label: "Profile",       icon: User },
    { id: "appearance",    label: "Appearance",    icon: Palette },
    { id: "security",      label: "Security",      icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy",       label: "Privacy",       icon: Shield },
    { id: "subscription",  label: "Subscription",  icon: CreditCard },
  ];

  const userInitial = (profile.name || profile.email || "G").charAt(0).toUpperCase();

  const innerContent = (
    <div
      style={{
        width: "100%",
        maxWidth: isEmbedded ? "100%" : "1050px",
        height: isEmbedded ? "100%" : "88vh",
        maxHeight: isEmbedded ? "100%" : "720px",
        background: bgModal,
        borderRadius: isEmbedded ? "16px" : "24px",
        border: `1px solid ${borderColor}`,
        boxShadow: isEmbedded
          ? "none"
          : isLight
          ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          : "0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.15)",
        display: "flex",
        overflow: "hidden",
        position: "relative",
        color: textColor,
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
        {/* Toast Notification */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              right: "24px",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 20px",
              background: toast.type === "success" ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
              border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              borderRadius: "14px",
              backdropFilter: "blur(16px)",
              color: toast.type === "success" ? "#4ade80" : "#f87171",
              fontWeight: 600,
              fontSize: "0.88rem",
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            }}
          >
            <span>{toast.type === "success" ? "✓" : "✕"}</span>
            <span>{toast.msg}</span>
          </div>
        )}

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <div
          style={{
            width: "280px",
            background: bgSidebar,
            borderRight: `1px solid ${borderColor}`,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {/* Header User Badge */}
          <div
            style={{
              padding: "24px 20px 20px",
              borderBottom: `1px solid ${borderColor}`,
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ position: "relative" }}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: `2px solid ${accentColor}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)`,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    boxShadow: `0 4px 14px ${accentColor}44`,
                  }}
                >
                  {userInitial}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile.name || "User Profile"}
              </h3>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: subColor,
                  margin: "2px 0 0",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile.email}
              </p>
            </div>
          </div>

          {/* Nav Items */}
          <div style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 12px 10px" }}>
              Account Settings
            </div>

            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "11px 14px",
                    borderRadius: "12px",
                    border: "none",
                    background: active
                      ? isLight
                        ? "rgba(99,102,241,0.12)"
                        : "rgba(99,102,241,0.2)"
                      : "transparent",
                    color: active ? accentColor : textColor,
                    fontWeight: active ? 700 : 500,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: "4px",
                    textAlign: "left",
                  }}
                >
                  <Icon size={18} style={{ color: active ? accentColor : subColor }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Theme Toggle Footer */}
          <div
            style={{
              padding: "14px 20px",
              borderTop: `1px solid ${borderColor}`,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: subColor }}>
                {isLight ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isLight ? "Light Mode" : "Dark Mode"}</span>
              </div>
              <button
                onClick={() => setTheme(isLight ? "dark" : "light")}
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "12px",
                  background: isLight ? "#cbd5e1" : "rgba(99,102,241,0.8)",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: isLight ? "2px" : "22px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    transition: "left 0.25s ease",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </button>
            </div>

            {/* Prominent Log Out Button */}
            <button
              onClick={() => {
                if (logout) logout();
                else {
                  localStorage.clear();
                  window.location.href = "/login";
                }
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                background: "rgba(239, 68, 68, 0.1)",
                color: "#f87171",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <LogOut size={16} />
              <span>Log Out Account</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT MAIN PANEL ─────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: bgModal }}>
          {/* Top Modal Header */}
          <div
            style={{
              padding: "20px 28px",
              borderBottom: `1px solid ${borderColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, textTransform: "capitalize" }}>
                {activeTab} Settings
              </h2>
              <p style={{ fontSize: "0.82rem", color: subColor, margin: "2px 0 0" }}>
                Manage your account preferences and application settings
              </p>
            </div>
            <button
              onClick={handleClose}
              title="Close and return to Dashboard"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)",
                border: "none",
                color: textColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Tab Content */}
          <div style={{ flex: 1, padding: "28px", overflowY: "auto" }}>
            {loading ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: subColor }}>
                <Loader2 size={24} style={{ animation: "spinSlow 1s linear infinite" }} />
                <span>Loading profile settings...</span>
              </div>
            ) : (
              <>
                {/* 1. PROFILE TAB */}
                {activeTab === "profile" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Avatar Upload */}
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <div style={{ position: "relative" }}>
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt="Avatar"
                            style={{
                              width: "80px",
                              height: "80px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: `3px solid ${accentColor}`,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "80px",
                              height: "80px",
                              borderRadius: "50%",
                              background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)`,
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "2.2rem",
                              fontWeight: 800,
                            }}
                          >
                            {userInitial}
                          </div>
                        )}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            position: "absolute",
                            bottom: "0",
                            right: "0",
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: accentColor,
                            color: "#fff",
                            border: `2px solid ${bgModal}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <Camera size={14} />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          style={{ display: "none" }}
                        />
                      </div>
                      <div>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Profile Photo</h4>
                        <p style={{ fontSize: "0.8rem", color: subColor, margin: "4px 0 10px" }}>
                          JPG, PNG or GIF up to 5MB. Visible on public leaderboards.
                        </p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            border: `1px solid ${inputBorder}`,
                            background: inputBg,
                            color: textColor,
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Upload New Photo
                        </button>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, color: subColor, display: "block", marginBottom: "6px" }}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "10px",
                            border: `1px solid ${inputBorder}`,
                            background: inputBg,
                            color: textColor,
                            outline: "none",
                            fontSize: "0.9rem",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, color: subColor, display: "block", marginBottom: "6px" }}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profile.email}
                          disabled
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "10px",
                            border: `1px solid ${inputBorder}`,
                            background: inputBg,
                            color: subColor,
                            outline: "none",
                            fontSize: "0.9rem",
                            cursor: "not-allowed",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, color: subColor, display: "block", marginBottom: "6px" }}>
                          Country / Region
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. India, United States"
                          value={profile.country}
                          onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "10px",
                            border: `1px solid ${inputBorder}`,
                            background: inputBg,
                            color: textColor,
                            outline: "none",
                            fontSize: "0.9rem",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, color: subColor, display: "block", marginBottom: "6px" }}>
                          Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="+1 234 567 890"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "10px",
                            border: `1px solid ${inputBorder}`,
                            background: inputBg,
                            color: textColor,
                            outline: "none",
                            fontSize: "0.9rem",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: subColor, display: "block", marginBottom: "6px" }}>
                        Bio / Short Headline
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Tell the community a bit about your goals and career..."
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: `1px solid ${inputBorder}`,
                          background: inputBg,
                          color: textColor,
                          outline: "none",
                          fontSize: "0.9rem",
                          resize: "vertical",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        style={{
                          padding: "10px 24px",
                          borderRadius: "12px",
                          border: "none",
                          background: accentColor,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          cursor: saving ? "not-allowed" : "pointer",
                          boxShadow: `0 4px 16px ${accentColor}44`,
                        }}
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. APPEARANCE TAB */}
                {activeTab === "appearance" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "12px" }}>Theme Mode</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                        {[
                          { id: "dark", label: "Dark Mode", icon: Moon, desc: "Sleek high contrast" },
                          { id: "light", label: "Light Mode", icon: Sun, desc: "Clean bright aesthetic" },
                          { id: "system", label: "System Sync", icon: Monitor, desc: "Matches device" },
                        ].map((item) => {
                          const Icon = item.icon;
                          const selected = theme === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setTheme(item.id as ThemeMode)}
                              style={{
                                padding: "16px",
                                borderRadius: "14px",
                                border: `2px solid ${selected ? accentColor : borderColor}`,
                                background: selected ? (isLight ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.15)") : inputBg,
                                color: textColor,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                gap: "8px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                            >
                              <Icon size={24} style={{ color: selected ? accentColor : subColor }} />
                              <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{item.label}</div>
                              <div style={{ fontSize: "0.75rem", color: subColor }}>{item.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "12px" }}>Accent Color</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                        {ACCENT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setAccentColor(c.value)}
                            title={c.name}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: c.value,
                              border: accentColor === c.value ? "3px solid #ffffff" : "none",
                              boxShadow: accentColor === c.value ? `0 0 12px ${c.value}` : "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {accentColor === c.value && <Check size={16} color="#fff" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Display & Animations</h4>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "12px", background: inputBg, border: `1px solid ${borderColor}` }}>
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>Compact Mode</div>
                          <div style={{ fontSize: "0.78rem", color: subColor }}>Reduce padding for higher data density</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={compactMode}
                          onChange={(e) => setCompactMode(e.target.checked)}
                          style={{ width: "18px", height: "18px", accentColor, cursor: "pointer" }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "12px", background: inputBg, border: `1px solid ${borderColor}` }}>
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>Enable UI Animations</div>
                          <div style={{ fontSize: "0.78rem", color: subColor }}>Smooth transitions and micro-animations</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={animations}
                          onChange={(e) => setAnimations(e.target.checked)}
                          style={{ width: "18px", height: "18px", accentColor, cursor: "pointer" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SECURITY TAB */}
                {activeTab === "security" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Change Password</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "440px" }}>
                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, color: subColor, display: "block", marginBottom: "6px" }}>
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${inputBorder}`, background: inputBg, color: textColor, outline: "none" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, color: subColor, display: "block", marginBottom: "6px" }}>
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${inputBorder}`, background: inputBg, color: textColor, outline: "none" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, color: subColor, display: "block", marginBottom: "6px" }}>
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${inputBorder}`, background: inputBg, color: textColor, outline: "none" }}
                        />
                      </div>
                      <button
                        onClick={handleChangePassword}
                        disabled={saving}
                        style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: accentColor, color: "#fff", fontWeight: 700, marginTop: "8px", cursor: "pointer" }}
                      >
                        Update Password
                      </button>
                    </div>

                    <hr style={{ border: "none", borderTop: `1px solid ${borderColor}`, margin: "10px 0" }} />

                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px" }}>Account Export & Backup</h4>
                      <p style={{ fontSize: "0.82rem", color: subColor, marginBottom: "14px" }}>
                        Download a full JSON backup of your profile, practice statistics, and AI growth plans.
                      </p>
                      <button
                        onClick={handleExportData}
                        style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "10px", border: `1px solid ${inputBorder}`, background: inputBg, color: textColor, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}
                      >
                        <Download size={16} />
                        <span>Export All Account Data (JSON)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. NOTIFICATIONS TAB */}
                {activeTab === "notifications" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Notification Preferences</h4>
                    {[
                      { key: "email_missions", label: "Daily Missions Summary", desc: "Receive daily practice missions in your inbox" },
                      { key: "email_streak", label: "Streak Reminders", desc: "Get notified when your practice streak is at risk" },
                      { key: "push_missions", label: "Push Notification Alerts", desc: "In-app real-time agent notifications" },
                      { key: "push_achievements", label: "Achievements & Ranks", desc: "Alerts when you gain XP or level up on leaderboard" },
                    ].map((item) => {
                      const checked = notifications[item.key as keyof NotificationSettings];
                      return (
                        <div
                          key={item.key}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: "12px", background: inputBg, border: `1px solid ${borderColor}` }}
                        >
                          <div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.label}</div>
                            <div style={{ fontSize: "0.78rem", color: subColor }}>{item.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => handleSaveNotifications({ ...notifications, [item.key]: e.target.checked })}
                            style={{ width: "18px", height: "18px", accentColor, cursor: "pointer" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 5. PRIVACY TAB */}
                {activeTab === "privacy" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Privacy & Community Visibility</h4>
                    {[
                      { key: "profile_public", label: "Public Profile", desc: "Allow other GrowthOS users to see your public profile" },
                      { key: "show_streak", label: "Show Practice Streak", desc: "Display your current streak on public leaderboards" },
                      { key: "show_leaderboard", label: "Leaderboard Ranking", desc: "Include your profile in global student/freelancer rankings" },
                      { key: "data_analytics", label: "Improvement Analytics", desc: "Allow anonymous data usage for AI personalization" },
                    ].map((item) => {
                      const checked = privacy[item.key as keyof PrivacySettings];
                      return (
                        <div
                          key={item.key}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: "12px", background: inputBg, border: `1px solid ${borderColor}` }}
                        >
                          <div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.label}</div>
                            <div style={{ fontSize: "0.78rem", color: subColor }}>{item.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => handleSavePrivacy({ ...privacy, [item.key]: e.target.checked })}
                            style={{ width: "18px", height: "18px", accentColor, cursor: "pointer" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 6. SUBSCRIPTION TAB */}
                {activeTab === "subscription" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ padding: "20px", borderRadius: "16px", background: `linear-gradient(135deg, ${accentColor}22, rgba(139,92,246,0.15))`, border: `1px solid ${accentColor}44` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Current Active Plan
                          </span>
                          <h3 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "4px 0 0" }}>GrowthOS Pro Tier</h3>
                        </div>
                        <span style={{ padding: "6px 14px", borderRadius: "20px", background: accentColor, color: "#fff", fontSize: "0.82rem", fontWeight: 700 }}>
                          Active Access
                        </span>
                      </div>
                      <p style={{ fontSize: "0.84rem", color: subColor, marginTop: "10px" }}>
                        Includes unlimited AI agent orchestration (Learning, Opportunity, Resume, Interview & Roadmap Agents), priority voice synthesis, and real-time execution tracking.
                      </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div style={{ padding: "18px", borderRadius: "14px", background: inputBg, border: `1px solid ${borderColor}` }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px" }}>Starter Free</h4>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: subColor }}>$0 / mo</div>
                        <ul style={{ fontSize: "0.82rem", color: subColor, marginTop: "12px", paddingLeft: "18px", lineHeight: 1.8 }}>
                          <li>Daily task generation</li>
                          <li>Basic AI Insights</li>
                          <li>Community access</li>
                        </ul>
                      </div>

                      <div style={{ padding: "18px", borderRadius: "14px", background: inputBg, border: `1px solid ${accentColor}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: accentColor, fontWeight: 700, fontSize: "0.8rem" }}>
                          <Sparkles size={14} />
                          <span>RECOMMENDED</span>
                        </div>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "4px 0 0" }}>GrowthOS Ultimate</h4>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: accentColor }}>$19 / mo</div>
                        <ul style={{ fontSize: "0.82rem", color: textColor, marginTop: "12px", paddingLeft: "18px", lineHeight: 1.8 }}>
                          <li>All 7 Autonomous AI Agents</li>
                          <li>Orbit Holographic Voice Core</li>
                          <li>1-on-1 AI Interview Simulator</li>
                          <li>Direct Recruiter Radar Sync</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
  );

  if (isEmbedded) {
    return innerContent;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        animation: "fadeIn 0.25s ease",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {innerContent}
    </div>
  );
}
