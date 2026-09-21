"use client";
// app/dashboard/challenges/page.tsx
// GrowthOS Arena — Fixed: no blue borders, all filters work, field-adaptive content

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Play, BarChart2, Trophy, Users, Settings, LogOut,
  Bell, ChevronLeft, ChevronRight, RefreshCw, Filter, Zap, Search,
  X, Clock, Target, Flame, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";
import { getToken } from "@/lib/api";

const API  = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS   = API.replace(/^http/, "ws");

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArenaProfile {
  arena_elo: number; level: number; xp_percent: number;
  wins: number; losses: number; win_rate: number;
  current_streak: number; best_streak: number;
  global_rank: number; rank_percent: number;
  skills: Record<string, number>;
}

interface LiveBattle {
  id: string; title: string; mode: string; format: string;
  status: string; starts_at: string; ends_at: string; players: number;
}

interface UpcomingEvent {
  id: string; title: string; type: string; difficulty: string;
  starts_at: string; duration_m: number; xp: number; tags: string[];
}

interface AIOpponent {
  id: string; name: string; display_name: string; emoji: string;
  description: string; elo: number; difficulty: number; accuracy_max: number;
}

interface Season {
  id: string; name: string; tagline: string; starts_at: string; ends_at: string;
}

interface Boss {
  instance_id: string; boss_id: string; name: string; emoji: string;
  description: string; total_hp: number; current_hp: number; hp_percent: number;
  difficulty: number; phases: any[]; ends_at: string; fighters: number;
}

interface Challenge {
  id: string; title: string; description: string;
  type: string;        // daily | weekly | monthly | special (from backend)
  domain: string;      // field tag e.g. "ai_ml", "all"
  difficulty: string;
  xp: number;          // API sends "xp" not "xp_reward"
  timeMinutes: number; // API sends "timeMinutes" not "time_minutes"
  tags: string[];
  endsIn: string;      // human-readable string e.g. "2h 30m"
  joined?: boolean; completed?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function useServerCountdown(endsAt: string | null | undefined) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return { remaining, formatted: `${mm}:${ss}` };
}

function useDaysCountdown(endsAt: string | null | undefined) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [mins, setMins] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setDays(Math.floor(diff / 86400000));
      setHours(Math.floor((diff % 86400000) / 3600000));
      setMins(Math.floor((diff % 3600000) / 60000));
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [endsAt]);

  return { days, hours, mins };
}

function StarRating({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < n ? "#f59e0b" : "#1e293b", fontSize: "0.8rem" }}>★</span>
      ))}
    </span>
  );
}

// ─── Field-Adaptive Challenge Types ─────────────────────────────────────────

type ChallengeType = { icon: string; label: string; sub: string; color: string; filterKey: string };

const FIELD_CHALLENGE_TYPES: Record<string, ChallengeType[]> = {
  "exam:jee": [
    { icon: "⚗️", label: "Physics MCQ",    sub: "Kinematics, Optics, Electro",   color: "#ef4444", filterKey: "MCQ" },
    { icon: "🧪", label: "Chemistry",       sub: "Organic & Inorganic reactions",  color: "#22c55e", filterKey: "Written" },
    { icon: "📐", label: "Maths Sprint",    sub: "Calculus, Algebra, Geometry",   color: "#3b82f6", filterKey: "MCQ" },
    { icon: "📝", label: "Mock JEE",        sub: "Full paper simulations",         color: "#6366f1", filterKey: "MCQ" },
    { icon: "⚡", label: "Speed Round",     sub: "Rapid-fire problem sets",        color: "#f59e0b", filterKey: "MCQ" },
    { icon: "🏆", label: "JEE Champion",    sub: "Hard JEE Advanced problems",     color: "#8b5cf6", filterKey: "Written" },
    { icon: "📊", label: "Data Analysis",   sub: "Graph & table interpretation",   color: "#06b6d4", filterKey: "Data" },
    { icon: "🔀", label: "Mixed Mock",      sub: "All 3 subjects combined",        color: "#ec4899", filterKey: "MCQ" },
  ],
  "exam:neet": [
    { icon: "🔬", label: "Biology MCQ",    sub: "NCERT-based cell & genetics",    color: "#22c55e", filterKey: "MCQ" },
    { icon: "⚗️", label: "Chemistry",      sub: "Equilibrium, Biomolecules",       color: "#f59e0b", filterKey: "Written" },
    { icon: "⚡", label: "Physics Clinic", sub: "Electrostatics, Optics, Fluids",  color: "#3b82f6", filterKey: "MCQ" },
    { icon: "📝", label: "Mock NEET",      sub: "Full 720-mark simulations",       color: "#6366f1", filterKey: "MCQ" },
    { icon: "🧬", label: "Genetics Deep",  sub: "Mendelian & molecular genetics",  color: "#ef4444", filterKey: "Written" },
    { icon: "🏥", label: "Med Cases",      sub: "Clinical vignette practice",      color: "#8b5cf6", filterKey: "Written" },
    { icon: "📊", label: "Stats & Data",   sub: "Biostatistics & graphs",          color: "#06b6d4", filterKey: "Data" },
    { icon: "🔀", label: "Mixed Mock",     sub: "All subjects combined",           color: "#ec4899", filterKey: "MCQ" },
  ],
  "exam:upsc": [
    { icon: "🏛️", label: "Polity MCQ",    sub: "Constitution & Governance",      color: "#6366f1", filterKey: "MCQ" },
    { icon: "📚", label: "Current Affairs",sub: "Weekly news analysis",            color: "#f59e0b", filterKey: "Written" },
    { icon: "🌍", label: "Geography",      sub: "Maps, Climate & Resources",       color: "#22c55e", filterKey: "MCQ" },
    { icon: "📖", label: "History",        sub: "Ancient to Modern India",         color: "#ef4444", filterKey: "Written" },
    { icon: "💰", label: "Economics",      sub: "Macro & micro economics",         color: "#3b82f6", filterKey: "MCQ" },
    { icon: "📝", label: "Essay Writing",  sub: "GS IV ethics & essay",            color: "#8b5cf6", filterKey: "Written" },
    { icon: "📊", label: "Data Analysis",  sub: "Stats & graph interpretation",    color: "#06b6d4", filterKey: "Data" },
    { icon: "🔀", label: "Prelims Mock",   sub: "GS Paper 1 & CSAT simulation",    color: "#ec4899", filterKey: "MCQ" },
  ],
  "student:cs": [
    { icon: "⚔️", label: "MCQ Battle",    sub: "Fast. Accurate. Win.",            color: "#6366f1", filterKey: "MCQ" },
    { icon: "✍️", label: "Written Answer",sub: "Explain. Reason. Rank.",           color: "#f59e0b", filterKey: "Written" },
    { icon: "💻", label: "Coding Battle", sub: "Solve real DSA problems.",         color: "#22c55e", filterKey: "Coding" },
    { icon: "🏗️", label: "Build/Prototype",sub: "Create & Ship projects.",         color: "#3b82f6", filterKey: "Build/Prototype" },
    { icon: "🤖", label: "AI Agent",      sub: "Build intelligent agents.",        color: "#8b5cf6", filterKey: "AI Agent" },
    { icon: "🐛", label: "Debug & Fix",   sub: "Find. Fix. Learn.",               color: "#ef4444", filterKey: "Coding" },
    { icon: "🏛️", label: "System Design", sub: "Architecture & Planning.",        color: "#06b6d4", filterKey: "System Design" },
    { icon: "🔀", label: "Mixed Mode",    sub: "A bit of everything.",             color: "#ec4899", filterKey: "MCQ" },
  ],
  "student:datascience": [
    { icon: "📊", label: "Data Analysis", sub: "Pandas, NumPy challenges",        color: "#3b82f6", filterKey: "Data" },
    { icon: "🤖", label: "ML Models",     sub: "Build & evaluate models",          color: "#8b5cf6", filterKey: "AI Agent" },
    { icon: "📝", label: "Statistics MCQ",sub: "Probability & inference",          color: "#22c55e", filterKey: "MCQ" },
    { icon: "🏗️", label: "Data Pipeline", sub: "ETL & data engineering",          color: "#6366f1", filterKey: "Build/Prototype" },
    { icon: "💻", label: "SQL Coding",    sub: "Complex query battles",            color: "#ef4444", filterKey: "Coding" },
    { icon: "🔮", label: "Prediction",    sub: "Regression & forecasting",         color: "#f59e0b", filterKey: "Written" },
    { icon: "🏛️", label: "Architecture",  sub: "Data architecture planning",      color: "#06b6d4", filterKey: "System Design" },
    { icon: "🔀", label: "Kaggle-style",  sub: "End-to-end data challenges",       color: "#ec4899", filterKey: "MCQ" },
  ],
  "student:medical": [
    { icon: "🔬", label: "Anatomy MCQ",   sub: "Body systems & structures",       color: "#22c55e", filterKey: "MCQ" },
    { icon: "🧬", label: "Physiology",    sub: "Body function mechanisms",         color: "#3b82f6", filterKey: "Written" },
    { icon: "💊", label: "Pharmacology",  sub: "Drug mechanisms & side effects",   color: "#ef4444", filterKey: "MCQ" },
    { icon: "🏥", label: "Clinical Cases",sub: "Patient case simulations",         color: "#8b5cf6", filterKey: "Written" },
    { icon: "🔍", label: "Pathology",     sub: "Disease mechanisms & diagnosis",   color: "#f59e0b", filterKey: "Written" },
    { icon: "⚕️", label: "Medical Ethics",sub: "Ethical scenario analysis",       color: "#6366f1", filterKey: "Written" },
    { icon: "📊", label: "Biostatistics", sub: "Research data interpretation",    color: "#06b6d4", filterKey: "Data" },
    { icon: "🔀", label: "Mock Clinical", sub: "Full OSCE simulation",             color: "#ec4899", filterKey: "MCQ" },
  ],
  "freelancer": [
    { icon: "💼", label: "Client MCQ",    sub: "Business & communication",        color: "#3b82f6", filterKey: "MCQ" },
    { icon: "🏗️", label: "Project Build", sub: "Ship real client projects",       color: "#6366f1", filterKey: "Build/Prototype" },
    { icon: "💻", label: "Code Battle",   sub: "Full-stack coding challenges",    color: "#22c55e", filterKey: "Coding" },
    { icon: "📝", label: "Proposal Write",sub: "Write winning proposals",          color: "#f59e0b", filterKey: "Written" },
    { icon: "🤖", label: "AI Productivity",sub: "AI tools for freelancers",       color: "#8b5cf6", filterKey: "AI Agent" },
    { icon: "🏛️", label: "Architecture",  sub: "System design & planning",        color: "#06b6d4", filterKey: "System Design" },
    { icon: "📊", label: "Analytics",     sub: "Client reporting & data",         color: "#ef4444", filterKey: "Data" },
    { icon: "🔀", label: "Mixed",         sub: "Varied skill challenges",          color: "#ec4899", filterKey: "MCQ" },
  ],
  "entrepreneur": [
    { icon: "🚀", label: "Startup MCQ",   sub: "Business fundamentals",           color: "#f97316", filterKey: "MCQ" },
    { icon: "🏗️", label: "MVP Build",     sub: "Ship your prototype fast",        color: "#6366f1", filterKey: "Build/Prototype" },
    { icon: "📝", label: "Pitch Writing", sub: "Investor pitch decks",             color: "#22c55e", filterKey: "Written" },
    { icon: "💰", label: "Finance Battle",sub: "Unit economics & metrics",         color: "#f59e0b", filterKey: "MCQ" },
    { icon: "🤖", label: "AI Integration",sub: "AI-powered product features",     color: "#8b5cf6", filterKey: "AI Agent" },
    { icon: "🏛️", label: "System Design", sub: "Scalable architecture",           color: "#06b6d4", filterKey: "System Design" },
    { icon: "📊", label: "Market Data",   sub: "Market analysis & research",      color: "#3b82f6", filterKey: "Data" },
    { icon: "🔀", label: "Founder Mix",   sub: "All founder skills",               color: "#ec4899", filterKey: "MCQ" },
  ],
  "creator": [
    { icon: "🎬", label: "Content MCQ",   sub: "Platform algorithms & trends",   color: "#ec4899", filterKey: "MCQ" },
    { icon: "✍️", label: "Script Writing",sub: "Hooks, stories & CTAs",           color: "#f59e0b", filterKey: "Written" },
    { icon: "🏗️", label: "Content Build", sub: "Plan & create content",           color: "#6366f1", filterKey: "Build/Prototype" },
    { icon: "🤖", label: "AI Creation",   sub: "AI-assisted content tools",       color: "#8b5cf6", filterKey: "AI Agent" },
    { icon: "📊", label: "Analytics",     sub: "Audience data & insights",        color: "#3b82f6", filterKey: "Data" },
    { icon: "📝", label: "SEO Writing",   sub: "Search-optimized content",         color: "#22c55e", filterKey: "Written" },
    { icon: "🏛️", label: "Brand Design",  sub: "Identity & visual strategy",     color: "#06b6d4", filterKey: "System Design" },
    { icon: "🔀", label: "Creator Mix",   sub: "Cross-platform challenges",        color: "#ef4444", filterKey: "MCQ" },
  ],
  "self_growth": [
    { icon: "🧠", label: "Mindset MCQ",   sub: "Psychology & growth mindset",     color: "#8b5cf6", filterKey: "MCQ" },
    { icon: "📚", label: "Book Summary",  sub: "Key insights from top books",      color: "#6366f1", filterKey: "Written" },
    { icon: "🏗️", label: "Habit Build",   sub: "Build consistency challenges",    color: "#22c55e", filterKey: "Build/Prototype" },
    { icon: "💡", label: "Creativity",    sub: "Creative thinking exercises",      color: "#f59e0b", filterKey: "Written" },
    { icon: "🤖", label: "AI Tools",      sub: "Productivity with AI",             color: "#3b82f6", filterKey: "AI Agent" },
    { icon: "💰", label: "Finance",       sub: "Personal finance battles",         color: "#ef4444", filterKey: "MCQ" },
    { icon: "📊", label: "Life Data",     sub: "Track & analyze your progress",   color: "#06b6d4", filterKey: "Data" },
    { icon: "🔀", label: "Life Mix",      sub: "Multi-dimensional growth",         color: "#ec4899", filterKey: "MCQ" },
  ],
  "default": [
    { icon: "⚔️", label: "MCQ Battle",    sub: "Fast. Accurate. Win.",            color: "#6366f1", filterKey: "MCQ" },
    { icon: "✍️", label: "Written Answer",sub: "Explain. Reason. Rank.",           color: "#f59e0b", filterKey: "Written" },
    { icon: "💻", label: "Coding Battle", sub: "Solve real problems.",             color: "#22c55e", filterKey: "Coding" },
    { icon: "🏗️", label: "Build/Prototype",sub: "Create & Ship.",                 color: "#3b82f6", filterKey: "Build/Prototype" },
    { icon: "🤖", label: "AI Agent",      sub: "Build intelligent agents.",        color: "#8b5cf6", filterKey: "AI Agent" },
    { icon: "🐛", label: "Debug & Fix",   sub: "Find. Fix. Learn.",               color: "#ef4444", filterKey: "Coding" },
    { icon: "🏛️", label: "System Design", sub: "Architecture & Planning.",        color: "#06b6d4", filterKey: "System Design" },
    { icon: "🔀", label: "Mixed Mode",    sub: "A bit of everything.",             color: "#ec4899", filterKey: "MCQ" },
  ],
};

function getChallengeTypes(fieldKey: string): ChallengeType[] {
  if (FIELD_CHALLENGE_TYPES[fieldKey]) return FIELD_CHALLENGE_TYPES[fieldKey];
  const prefix = fieldKey.split(":")[0];
  const match = Object.keys(FIELD_CHALLENGE_TYPES).find(k => k.startsWith(prefix + ":") || k === prefix);
  if (match) return FIELD_CHALLENGE_TYPES[match];
  return FIELD_CHALLENGE_TYPES["default"];
}

const MODE_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  "1v1":          { label: "1v1",          icon: "⚔️", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  "2v2":          { label: "2v2",          icon: "⚔️", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  "squad":        { label: "Squad",        icon: "👥", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  "battle_royale":{ label: "Battle Royale",icon: "🪂", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  "ai_duel":      { label: "AI Duel",      icon: "🤖", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  "boss_raid":    { label: "Boss Raid",    icon: "💀", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const FORMAT_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  "mcq":          { label: "MCQ Battle",   color: "#22c55e", bg: "rgba(34,197,94,0.14)" },
  "reasoning":    { label: "Written",      color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  "coding":       { label: "DSA Battle",   color: "#3b82f6", bg: "rgba(59,130,246,0.14)" },
  "dev":          { label: "Dev Battle",   color: "#6366f1", bg: "rgba(99,102,241,0.14)" },
  "mixed":        { label: "Mixed Mode",   color: "#ec4899", bg: "rgba(236,72,153,0.14)" },
  "boss":         { label: "Boss Raid",    color: "#ef4444", bg: "rgba(239,68,68,0.14)" },
  "ai_agent":     { label: "AI Agent",     color: "#8b5cf6", bg: "rgba(139,92,246,0.14)" },
  "system_design":{ label: "System Design",color: "#06b6d4", bg: "rgba(6,182,212,0.14)" },
};

const NAV = [
  { icon: <LayoutDashboard size={18}/>, label: "Dashboard",     href: "/dashboard" },
  { icon: <Play size={18}/>,            label: "Practice Arena", href: "/dashboard/practice" },
  { icon: <BarChart2 size={18}/>,       label: "Leaderboard",   href: "/dashboard/leaderboard" },
  { icon: <Trophy size={18}/>,          label: "Challenges",    href: "/dashboard/challenges", active: true },
  { icon: <Users size={18}/>,           label: "Community",     href: "/dashboard/community" },
  { icon: <Settings size={18}/>,        label: "Settings",      href: "/dashboard/settings" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeTile({ icon, label, sublabel, color, onClick }: {
  icon: string; label: string; sublabel: string;
  color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="mode-tile" style={{
      flex: 1, minWidth: 130, padding: "14px 12px", borderRadius: 12,
      background: `linear-gradient(135deg,${color}22 0%,rgba(13,17,35,0.95) 100%)`,
      border: `1px solid ${color}33`, cursor: "pointer", textAlign: "left" as const,
      transition: "all 0.2s", position: "relative" as const, overflow: "hidden" as const,
    }}>
      <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "white" }}>{label}</div>
      <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{sublabel}</div>
      <div style={{
        position: "absolute", bottom: 8, right: 8, color: `${color}88`, fontSize: "0.75rem",
      }}>→</div>
    </button>
  );
}

function LiveBattleCard({ battle, onJoin }: { battle: LiveBattle; onJoin: () => void }) {
  const { formatted } = useServerCountdown(battle.ends_at);
  const mode = MODE_CFG[battle.mode] || MODE_CFG["1v1"];
  const fmt_badge = FORMAT_BADGE[battle.format] || FORMAT_BADGE["mixed"];

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden" as const, border: "1px solid rgba(99,102,241,0.2)",
      background: "linear-gradient(135deg,rgba(13,17,35,0.97) 0%,rgba(10,15,30,0.97) 100%)",
      minWidth: 280, flex: "0 0 280px", position: "relative" as const,
    }}>
      {/* Battle image placeholder */}
      <div style={{
        height: 120, background: `linear-gradient(135deg,${mode.color}33,rgba(0,0,0,0.85))`,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative" as const,
      }}>
        <div style={{ fontSize: "2.5rem", opacity: 0.5 }}>{mode.icon}</div>
        {/* Badges */}
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, flexWrap: "wrap" as const }}>
          <span style={{ ...badgeSt, background: mode.bg, color: mode.color }}>{mode.label}</span>
          <span style={{ ...badgeSt, background: fmt_badge.bg, color: fmt_badge.color }}>{fmt_badge.label}</span>
        </div>
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 4, background: "rgba(239,68,68,0.2)", padding: "2px 6px", borderRadius: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s ease infinite" }} />
          <span style={{ fontSize: "0.58rem", color: "#ef4444", fontWeight: 700 }}>LIVE</span>
        </div>
      </div>
      <div style={{ padding: "14px" }}>
        <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "white", marginBottom: 4 }}>
          {battle.title}
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: "0.68rem", color: "#64748b", marginBottom: 10 }}>
          <span>👥 {fmt(battle.players)} players</span>
          <span>⚡ 15 Questions</span>
        </div>
        {/* Server countdown */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: 8 }}>
          <span style={{ fontSize: "0.65rem", color: "#64748b" }}>Time Remaining</span>
          <span style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 800, color: "#ef4444", fontVariantNumeric: "tabular-nums" }}>
            {formatted}
          </span>
        </div>
        <button onClick={onJoin} style={{
          width: "100%", padding: "10px", background: "linear-gradient(135deg,#6366f1,#4f46e5)",
          border: "none", borderRadius: 8, color: "white", fontSize: "0.82rem", fontWeight: 700,
          cursor: "pointer",
        }}>
          ⚡ Join Battle Now
        </button>
      </div>
    </div>
  );
}

function RadarChart({ skills }: { skills: Record<string, number> }) {
  const entries = Object.entries(skills).slice(0, 6);
  const size = 90;
  const cx = size / 2, cy = size / 2, r = 34;
  const n = entries.length;
  const points = entries.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const val = (entries[i][1] / 100) * r;
    return [cx + Math.cos(angle) * val, cy + Math.sin(angle) * val];
  });
  const gridPts = entries.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  });
  const toPath = (pts: number[][]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";

  const LABELS = ["Speed", "Coding", "Collab", "Accuracy", "Debug", "Creativity"];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid lines */}
      {[0.33, 0.66, 1].map(scale => (
        <path key={scale} d={toPath(gridPts.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale]))}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
      ))}
      {gridPts.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      ))}
      {/* Fill */}
      <path d={toPath(points)} fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth={1.5} />
      {/* Labels */}
      {gridPts.map(([x, y], i) => (
        <text key={i} x={cx + (x - cx) * 1.35} y={cy + (y - cy) * 1.35}
          fill="#64748b" fontSize={5.5} textAnchor="middle" dominantBaseline="middle">
          {LABELS[i] || entries[i]?.[0]?.slice(0, 5)}
        </text>
      ))}
    </svg>
  );
}

function UpcomingEventRow({ ev }: { ev: UpcomingEvent }) {
  const d = new Date(ev.starts_at);
  const mon = d.toLocaleString("en", { month: "short" }).toUpperCase();
  const day = d.getDate();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{
        width: 36, flexShrink: 0, textAlign: "center" as const,
        background: "rgba(99,102,241,0.12)", borderRadius: 6, padding: "3px 0",
      }}>
        <div style={{ fontSize: "0.55rem", color: "#6366f1", fontWeight: 700 }}>{mon}</div>
        <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "white", lineHeight: 1 }}>{day}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "white", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
        <div style={{ fontSize: "0.62rem", color: "#475569" }}>
          {d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} · {ev.duration_m} min · {ev.type}
        </div>
      </div>
      <button style={{
        padding: "3px 8px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
        borderRadius: 6, color: "#818cf8", fontSize: "0.6rem", fontWeight: 600, cursor: "pointer",
      }}>Notify</button>
    </div>
  );
}

function ChallengeCard({ ch, onSelect }: { ch: Challenge; onSelect: () => void }) {
  const DIFF: Record<string, string> = { Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444", Expert: "#8b5cf6" };
  const color = DIFF[ch.difficulty] || "#6366f1";
  // Map backend type (daily/weekly/monthly) to a readable badge
  const typeBadge: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", special: "Special" };
  const typeLabel = typeBadge[ch.type] || ch.type;
  return (
    <div onClick={onSelect} style={{
      background: "rgba(13,18,35,0.88)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14,
      padding: "14px", cursor: "pointer", transition: "all 0.18s",
    }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" as const }}>
        <span style={{ ...badgeSt, background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>{typeLabel}</span>
        <span style={{ ...badgeSt, background: `${color}18`, color }}>{ch.difficulty}</span>
        {ch.completed && <span style={{ ...badgeSt, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>✓ Done</span>}
      </div>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "white", marginBottom: 4, lineHeight: 1.3 }}>{ch.title}</div>
      <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 8, lineHeight: 1.5,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
        {ch.description}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginBottom: 8 }}>
        {(ch.tags || []).slice(0, 3).map((t, i) => (
          <span key={i} style={{ padding: "1px 6px", background: "rgba(99,102,241,0.08)", borderRadius: 5, fontSize: "0.6rem", color: "#818cf8" }}>#{t}</span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#ffd700" }}>+{ch.xp ?? 0} XP</span>
        <span style={{ fontSize: "0.68rem", color: "#475569" }}>⏱ {ch.timeMinutes ?? "??"}m</span>
        <span style={{ fontSize: "0.68rem", color: "#6366f1", fontWeight: 600 }}>Enter →</span>
      </div>
    </div>
  );
}

// Badge shared style
const badgeSt: React.CSSProperties = {
  padding: "2px 7px", borderRadius: 5, fontSize: "0.6rem", fontWeight: 700,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChallengesPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQ, setSearchQ] = useState("");

  // Remote data
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [liveBattles, setLiveBattles] = useState<LiveBattle[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [opponents, setOpponents] = useState<AIOpponent[]>([]);
  const [season, setSeason] = useState<Season | null>(null);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myMatches, setMyMatches] = useState<Challenge[]>([]);
  const [playersOnline, setPlayersOnline] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userField, setUserField] = useState("default");

  // Matchmaking
  const [mmModal, setMmModal] = useState(false);
  const [mmMode, setMmMode] = useState("1v1");
  const [mmStatus, setMmStatus] = useState<"idle"|"searching"|"matched">("idle");
  const [mmBattleId, setMmBattleId] = useState<string|null>(null);
  const mmPollRef = useRef<NodeJS.Timeout|null>(null);

  // Modals
  const [bossModal, setBossModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge|null>(null);

  const rawName = (user as any)?.full_name || (user as any)?.name || "";
  const currentUser = mounted ? (rawName.includes("@") ? rawName.split("@")[0] : rawName) || "User" : "User";
  const initials = mounted && currentUser !== "User" ? currentUser.slice(0, 2).toUpperCase() : "US";
  const avatarUrl = (user as any)?.avatar_url || (user as any)?.image || null;

  useEffect(() => { setMounted(true); setTimeout(() => setLoaded(true), 100); }, []);

  const fetchAll = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const h = { Authorization: `Bearer ${token}` };

    // Timeout-aware fetch — 10s per request, returns null on timeout/error
    const safe = async (url: string, ms = 10000) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      try {
        const r = await fetch(url, { headers: h, signal: ctrl.signal });
        return r.ok ? r.json() : null;
      } catch {
        return null;
      } finally {
        clearTimeout(t);
      }
    };

    try {
      const [prof, live, up, opp, seas, bs, ch, myCh] = await Promise.all([
        safe(`${API}/arena/profile`),
        safe(`${API}/arena/live`),
        safe(`${API}/arena/upcoming`),
        safe(`${API}/arena/opponents`),
        safe(`${API}/arena/season`),
        safe(`${API}/arena/boss`),
        safe(`${API}/challenges/`),
        safe(`${API}/challenges/my`),
      ]);

      if (prof)  setProfile(prof);
      if (live)  { setLiveBattles(live.battles || []); setPlayersOnline(live.players_online || 0); setLiveCount(live.live_count || 0); }
      if (up)    setUpcoming(up.events || []);
      if (opp)   setOpponents(opp.opponents || []);
      if (seas)  setSeason(seas);
      if (bs)    setBoss(bs);
      if (ch)    { setChallenges(ch.challenges || []); setUserField(ch.field || "default"); }
      if (myCh)  setMyMatches(myCh.challenges || []);
    } finally {
      // Always clear loading — even if every request returned null
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (mounted) fetchAll(); }, [fetchAll, mounted]);

  // Start AI Duel with a specific bot (NOT human matchmaking)
  const startAIDuel = useCallback(async (opponentId: string) => {
    const token = getToken();
    if (!token) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(`${API}/arena/duels/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ opponent_id: opponentId }),
        signal: ctrl.signal,
      });
      const d = await r.json();
      if (d?.battle_id) router.push(`/dashboard/arena/${d.battle_id}`);
    } catch {
      // Silently ignore — toast can be added later
    } finally {
      clearTimeout(t);
    }
  }, [router]);

  // Poll matchmaking status (human vs human)
  const startMM = useCallback(async (mode: string) => {
    const token = getToken();
    if (!token) return;
    setMmMode(mode);
    setMmStatus("searching");
    setMmModal(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    try {
      const d = await fetch(`${API}/arena/matchmaking/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
        signal: ctrl.signal,
      }).then(r => r.json());
      if (d?.status === "matched" && d.battle_id) {
        setMmStatus("matched"); setMmBattleId(d.battle_id); return;
      }
    } catch {
      // timeout — keep searching state, poll will pick it up
    } finally {
      clearTimeout(t);
    }

    mmPollRef.current = setInterval(async () => {
      const r = await fetch(`${API}/arena/matchmaking/status`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => null);
      if (r?.status === "matched" && r.battle_id) {
        setMmStatus("matched");
        setMmBattleId(r.battle_id);
        if (mmPollRef.current) clearInterval(mmPollRef.current);
      }
    }, 2000);
  }, []);

  const cancelMM = useCallback(async () => {
    const token = getToken();
    if (mmPollRef.current) clearInterval(mmPollRef.current);
    setMmModal(false); setMmStatus("idle");
    if (token) {
      await fetch(`${API}/arena/matchmaking/leave`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, []);

  const FILTERS = ["All", "Live Now", "Upcoming", "My Matches", "MCQ", "Written", "Coding", "Build/Prototype", "AI Agent", "System Design", "Data"];

  // Section visibility flags
  const showLiveSection     = activeFilter === "All" || activeFilter === "Live Now";
  const showUpcomingSection = activeFilter === "All" || activeFilter === "Upcoming";
  const showAIOpponents     = activeFilter === "All";

  // Challenge grid filter
  const filteredChallenges: Challenge[] = (() => {
    if (activeFilter === "My Matches") return myMatches;
    if (activeFilter === "Upcoming") return [];
    let list = challenges;
    const q = searchQ.toLowerCase();
    if (q) list = list.filter(c => c.title.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q));
    if (activeFilter === "All" || activeFilter === "Live Now") return list;
    const tagMatch = (tags: string[], kws: string[]) => tags.some(t => kws.includes(t.toLowerCase()));
    if (activeFilter === "MCQ")             return list.filter(c => tagMatch(c.tags||[], ["mcq","quiz","multiple-choice"]) || c.type === "mcq");
    if (activeFilter === "Written")         return list.filter(c => tagMatch(c.tags||[], ["written","essay","explanation","reasoning"]) || c.type === "reasoning");
    if (activeFilter === "Coding")          return list.filter(c => tagMatch(c.tags||[], ["coding","code","dsa","python","javascript","java","algorithm","sql","programming"]) || c.type === "coding");
    if (activeFilter === "Build/Prototype") return list.filter(c => tagMatch(c.tags||[], ["build","prototype","project","ship","fullstack","frontend","backend","dev"]) || c.type === "dev");
    if (activeFilter === "AI Agent")        return list.filter(c => tagMatch(c.tags||[], ["ai","agent","llm","rag","ml","machine-learning","nlp","artificial-intelligence"]));
    if (activeFilter === "System Design")   return list.filter(c => tagMatch(c.tags||[], ["system-design","architecture","design","scalability","distributed","database"]));
    if (activeFilter === "Data")            return list.filter(c => tagMatch(c.tags||[], ["data","analytics","statistics","pandas","numpy","sql","tableau","data-science"]));
    return list;
  })();

  const seasonCountdown = useDaysCountdown(season?.ends_at);

  // (modeOnline removed — no fake counts shown)

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        * { box-sizing: border-box; }
        button { outline: none !important; }
        button:focus, button:focus-visible { outline: none !important; box-shadow: none !important; }
        input:focus { outline: none !important; box-shadow: none !important; }
        .mode-tile:hover { transform:translateY(-3px)!important; box-shadow:0 8px 24px rgba(0,0,0,0.3)!important; }
        .live-card:hover { transform:translateY(-2px)!important; }
        .ch-card:hover { transform:translateY(-2px)!important; border-color:rgba(99,102,241,0.3)!important; }
        .nav-btn:hover { background:rgba(255,255,255,0.05)!important; }
        .filter-btn:hover { background:rgba(99,102,241,0.08)!important; color:#a5b4fc!important; }
        .join-btn:hover { opacity:0.9!important; transform:scale(1.02)!important; }
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:2px}
      `}</style>

      {/* Background */}
      <div style={s.bg}/><div style={s.bgGrid}/>
      <div style={s.glow1}/><div style={s.glow2}/>

      {/* ── Matchmaking Modal ── */}
      {mmModal && (
        <div style={s.overlay} onClick={cancelMM}>
          <div style={{ ...s.modal, maxWidth: 440, textAlign: "center" as const }} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={cancelMM}><X size={14}/></button>
            {mmStatus === "searching" && (
              <>
                <div style={{ fontSize: "2rem", marginBottom: 16, animation: "spin 2s linear infinite" }}>⚙️</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: 8 }}>SEARCHING FOR OPPONENT...</div>
                <div style={{ fontSize: "0.78rem", color: "#475569", marginBottom: 20 }}>Mode: {mmMode.toUpperCase()}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  <div style={s.statMini}><div style={{ color: "#818cf8", fontWeight: 700, fontSize: "1rem" }}>{profile?.arena_elo || 800}</div><div style={{ fontSize: "0.62rem", color: "#475569" }}>Your ELO</div></div>
                  <div style={s.statMini}><div style={{ color: "#f59e0b", fontWeight: 700, fontSize: "1rem" }}>±150</div><div style={{ fontSize: "0.62rem", color: "#475569" }}>ELO Range</div></div>
                </div>
                <button style={{ ...s.redBtn, width: "100%" }} onClick={cancelMM}>Cancel Search</button>
              </>
            )}
            {mmStatus === "matched" && mmBattleId && (
              <>
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>🎯</div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#22c55e", marginBottom: 16 }}>MATCH FOUND!</div>
                <div style={{ fontSize: "0.78rem", color: "#475569", marginBottom: 20 }}>Battle is starting. Get ready!</div>
                <Link href={`/dashboard/arena/${mmBattleId}`} style={{ textDecoration: "none" }}>
                  <button style={{ ...s.indBtn, width: "100%" }}>⚡ ENTER BATTLE</button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Boss Modal ── */}
      {bossModal && boss && (
        <div style={s.overlay} onClick={() => setBossModal(false)}>
          <div style={{ ...s.modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setBossModal(false)}><X size={14}/></button>
            <div style={{ textAlign: "center" as const, marginBottom: 20 }}>
              <div style={{ fontSize: "3rem", filter: "drop-shadow(0 0 20px rgba(239,68,68,0.6))" }}>{boss.emoji}</div>
              <div style={{ fontSize: "0.6rem", color: "#ef4444", fontWeight: 700, letterSpacing: "0.15em", marginTop: 8 }}>BOSS RAID</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "white", marginTop: 4 }}>{boss.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>{boss.description}</div>
            </div>
            {/* Boss HP */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.65rem", color: "#ef4444", fontWeight: 700 }}>BOSS HP</span>
                <span style={{ fontSize: "0.65rem", color: "#ef4444" }}>{boss.current_hp.toLocaleString()} / {boss.total_hp.toLocaleString()}</span>
              </div>
              <div style={{ height: 10, background: "rgba(239,68,68,0.1)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#ef4444,#dc2626)", width: `${boss.hp_percent}%`, borderRadius: 5, transition: "width 1s ease" }} />
              </div>
            </div>
            {/* Phases */}
            {boss.phases?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.65rem", color: "#475569", fontWeight: 600, marginBottom: 8 }}>BOSS PHASES</div>
                {boss.phases.slice(0, 3).map((p: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: "0.6rem", color: "#ef4444", fontWeight: 700, width: 16, flexShrink: 0 }}>{p.phase}</span>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "white", fontWeight: 600 }}>{p.title}</div>
                      <div style={{ fontSize: "0.62rem", color: "#475569" }}>{p.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: 8, textAlign: "center" as const }}>
                <div style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 700 }}>{fmt(boss.fighters)}</div>
                <div style={{ fontSize: "0.58rem", color: "#475569" }}>Fighting Now</div>
              </div>
              <div style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: 8, textAlign: "center" as const }}>
                <div style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 700 }}>{boss.difficulty}/10</div>
                <div style={{ fontSize: "0.58rem", color: "#475569" }}>Difficulty</div>
              </div>
            </div>
            <Link href={`/dashboard/arena/boss/${boss.instance_id}`} style={{ textDecoration: "none" }}>
              <button style={{ ...s.redBtn, width: "100%", marginTop: 14 }}>⚔️ FIGHT BOSS</button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Challenge Detail Modal ── */}
      {selectedChallenge && (
        <div style={s.overlay} onClick={() => setSelectedChallenge(null)}>
          <div style={{ ...s.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setSelectedChallenge(null)}><X size={14}/></button>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                <span style={{ ...badgeSt, background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>{selectedChallenge.type}</span>
                <span style={{ ...badgeSt, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{selectedChallenge.difficulty}</span>
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "white", marginBottom: 6 }}>{selectedChallenge.title}</h2>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6 }}>{selectedChallenge.description}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
              {[
                { icon: "⚡", val: `+${selectedChallenge.xp ?? 0} XP`, sub: "Reward" },
                { icon: "⏱", val: `${selectedChallenge.timeMinutes ?? "??"}m`, sub: "Time limit" },
                { icon: "🏷️", val: selectedChallenge.type, sub: "Type" },
              ].map((st, i) => (
                <div key={i} style={s.statMini}>
                  <div>{st.icon}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "white" }}>{st.val}</div>
                  <div style={{ fontSize: "0.6rem", color: "#475569" }}>{st.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginBottom: 16 }}>
              {selectedChallenge.tags.map((t, i) => (
                <span key={i} style={{ padding: "2px 7px", background: "rgba(99,102,241,0.08)", borderRadius: 5, fontSize: "0.62rem", color: "#818cf8" }}>#{t}</span>
              ))}
            </div>
            <button style={{ ...s.indBtn, width: "100%" }}>⚡ Start Challenge</button>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={{ padding: "0 4px 24px" }}><BrandLogo size="md"/></div>
        <nav style={{ display: "flex", flexDirection: "column" as const, gap: 2, flex: 1 }}>
          {NAV.map(item => (
            <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
              <button className="nav-btn" style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                borderRadius: 10, border: "none", cursor: "pointer", transition: "all 0.15s",
                background: item.active ? "rgba(99,102,241,0.12)" : "transparent",
                color: item.active ? "white" : "#64748b",
              }}>
                <span style={{ opacity: item.active ? 1 : 0.55 }}>{item.icon}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
                {item.active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1", marginLeft: "auto" }} />}
              </button>
            </Link>
          ))}
        </nav>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setIsProfileModalOpen(true)}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: "white", flexShrink: 0 }}>{initials}</div>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser}</div>
              <div style={{ fontSize: "0.65rem", color: "#818cf8" }}>Lv. {profile?.level || 1}</div>
            </div>
          </div>
          <button style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 4 }} onClick={() => logout?.()}><LogOut size={15}/></button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ ...s.main, opacity: loaded ? 1 : 0, transition: "opacity 0.4s" }}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={s.ghostBtn}><ChevronLeft size={15}/> Dashboard</button>
            </Link>
            <nav style={{ display: "flex", gap: 20, fontSize: "0.85rem" }}>
              {["Home", "Roadmap", "Learn", "Challenges", "Community", "Career"].map(n => (
                <span key={n} style={{ color: n === "Challenges" ? "#6366f1" : "#64748b", fontWeight: n === "Challenges" ? 600 : 400, cursor: "pointer", borderBottom: n === "Challenges" ? "2px solid #6366f1" : "none", paddingBottom: 2 }}>{n}</span>
              ))}
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 12px" }}>
              <Search size={13} style={{ color: "#475569" }}/>
              <input placeholder="Search challenges, skills, players..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                style={{ background: "none", border: "none", outline: "none", color: "white", fontSize: "0.78rem", width: 220 }}/>
            </div>
            {/* Streak */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}>
              <Flame size={14} style={{ color: "#ef4444" }}/>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "white" }}>{profile?.current_streak || 0}</span>
              <span style={{ fontSize: "0.62rem", color: "#ef4444" }}>Day Streak</span>
            </div>
            <button style={s.iconBtn}><Bell size={17}/></button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setIsProfileModalOpen(true)}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, color: "white" }}>{initials}</div>}
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "white" }}>{currentUser}</div>
                <div style={{ fontSize: "0.6rem", color: "#818cf8" }}>Lv. {profile?.level || 1}</div>
              </div>
              <ChevronRight size={13} style={{ color: "#475569" }}/>
            </div>
          </div>
        </div>

        <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)}/>

        {/* ── HERO BANNER ── */}
        <div style={s.hero}>
          <Image src="/arena-banner.jpg" alt="GrowthOS Challenges Arena" fill style={{ objectFit: "cover", objectPosition: "center top", opacity: 0.65 }} priority/>
          <div style={s.heroOverlay}/>
          {/* Left text */}
          <div style={s.heroLeft}>
            <h1 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 900, color: "white", letterSpacing: "0.04em", textShadow: "0 2px 20px rgba(0,0,0,0.8)", marginBottom: 8 }}>CHALLENGES</h1>
            <div style={{ fontSize: "0.88rem", color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>LEARN. COMPETE. BUILD. LEVEL UP!</div>
            <div style={{ fontSize: "0.78rem", color: "#475569" }}>Real skills. Real people. Real impact.</div>
            <div style={{ marginTop: 20, padding: "8px 14px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 8, display: "inline-block", fontSize: "0.72rem", color: "#818cf8", fontStyle: "italic" }}>
              "Good developers build.<br/>Great ones compete."
            </div>
          </div>

          {/* Right: Arena Profile Card */}
          <div style={s.profileCard}>
            <div style={{ fontSize: "0.58rem", color: "#475569", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>YOUR ARENA PROFILE</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              {/* Level badge */}
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "white" }}>Lv.{profile?.level || 1}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* XP bar */}
                <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 3 }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg,#f59e0b,#fbbf24)", width: `${profile?.xp_percent || 0}%`, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: "0.6rem", color: "#475569" }}>{profile?.xp_percent || 0}% to Level {(profile?.level || 1) + 1}</div>
              </div>
            </div>
            {/* ELO + Rank */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: "0.6rem", color: "#475569" }}>Arena ELO</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "white" }}>{(profile?.arena_elo || 800).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6rem", color: "#475569" }}>Top</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#22c55e" }}>{profile?.rank_percent || 100}%</div>
              </div>
              <div style={{ flex: 1 }}>
                {profile && <RadarChart skills={profile.skills}/>}
              </div>
            </div>
            <button style={{ width: "100%", padding: "7px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 8, color: "#818cf8", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
              View Detailed Stats →
            </button>
          </div>
        </div>

        {/* ── 6 MODE TILES ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto" as const, paddingBottom: 4 }}>
          {[
            { icon: "⚔️", label: "1v1",          sub: "Test your skills in direct battles",              color: "#ef4444", mode: "1v1" },
            { icon: "⚔️", label: "2v2 Duo",       sub: "Strategy. Collaboration. Win together.",          color: "#8b5cf6", mode: "2v2" },
            { icon: "👥", label: "Squad (4v4)",    sub: "Strategy. Collaboration. Win together.",          color: "#22c55e", mode: "squad" },
            { icon: "🪂", label: "Battle Royale",  sub: "Mass multiplayer challenge zone",                 color: "#06b6d4", mode: "battle_royale" },
            { icon: "🤖", label: "AI Bot Battle",  sub: "Face AI opponents (Basic · Medium · Hard)",       color: "#6366f1", mode: "ai_duel" },
            { icon: "💀", label: "Boss Raids",     sub: "Defeat powerful AI bosses with real-world scenarios", color: "#ef4444", mode: "boss_raid" },
          ].map(m => (
            <ModeTile key={m.mode} icon={m.icon} label={m.label} sublabel={m.sub}
              color={m.color}
              onClick={() => m.mode === "boss_raid" ? setBossModal(true) : startMM(m.mode)}/>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" as const, paddingBottom: 4, alignItems: "center" }}>
          {FILTERS.map(f => (
            <button key={f} className="filter-btn" onClick={() => setActiveFilter(f)} style={{
              padding: "6px 14px", borderRadius: 20, border: "1px solid",
              borderColor: activeFilter === f ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)",
              background: activeFilter === f ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.02)",
              color: activeFilter === f ? "#818cf8" : "#475569",
              fontSize: "0.75rem", fontWeight: activeFilter === f ? 600 : 400, cursor: "pointer",
              whiteSpace: "nowrap" as const, transition: "all 0.15s",
            }}>{f}</button>
          ))}
          <button style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, color: "#475569", fontSize: "0.75rem", cursor: "pointer" }}>
            <Filter size={13}/> Filters
          </button>
        </div>

        {/* ── LIVE NOW — only shown for All or Live Now filter ── */}
        {showLiveSection && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s ease infinite" }}/>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "white" }}>LIVE NOW</span>
                {liveCount > 0 && <span style={{ fontSize: "0.72rem", color: "#475569" }}>{liveCount} battles running · {fmt(playersOnline)} players online</span>}
              </div>
              <button style={{ background: "none", border: "none", color: "#6366f1", fontSize: "0.75rem", cursor: "pointer" }}>View All →</button>
            </div>
            <div style={{ display: "flex", gap: 14, overflowX: "auto" as const, paddingBottom: 8 }}>
              {liveBattles.length === 0 && !loading ? (
                <div style={{ color: "#334155", padding: "40px 20px", textAlign: "center" as const, flex: 1,
                  background: "rgba(13,17,35,0.6)", borderRadius: 14, border: "1px dashed rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚔️</div>
                  <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: 4 }}>No live battles active right now</div>
                  <div style={{ fontSize: "0.72rem", color: "#334155" }}>Battles auto-generate — check back shortly!</div>
                </div>
              ) : (
                liveBattles.map(b => (
                  <div key={b.id} className="live-card" style={{ transition: "transform 0.2s" }}>
                    <LiveBattleCard battle={b} onJoin={() => startMM(b.mode)}/>
                  </div>
                ))
              )}
              {loading && [...Array(3)].map((_, i) => (
                <div key={i} style={{ ...s.skeleton, minWidth: 280, height: 240, flex: "0 0 280px" }}/>
              ))}
            </div>
          </div>
        )}

        {/* ── UPCOMING BATTLES horizontal scroll — shown for All or Upcoming filter ── */}
        {showUpcomingSection && upcoming.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Clock size={14} style={{ color: "#6366f1" }}/>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "white" }}>UPCOMING BATTLES</span>
              <span style={{ fontSize: "0.72rem", color: "#475569" }}>{upcoming.length} scheduled</span>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto" as const, paddingBottom: 8 }}>
              {upcoming.map(ev => (
                <div key={ev.id} style={{ minWidth: 210, background: "rgba(13,17,35,0.9)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "14px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "white", marginBottom: 4, lineHeight: 1.3 }}>{ev.title}</div>
                  <div style={{ fontSize: "0.65rem", color: "#475569", marginBottom: 8 }}>
                    {new Date(ev.starts_at).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    <span style={{ ...badgeSt, background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>{ev.type}</span>
                    <span style={{ ...badgeSt, background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>+{ev.xp} XP</span>
                  </div>
                  <button style={{ width: "100%", padding: "6px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 7, color: "#818cf8", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>🔔 Notify Me</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main grid: Challenges + Sidebar ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start" }}>
          {/* Left: Challenge grid */}
          <div>
            {/* AI Opponents — only on All tab and only if data is available */}
            {showAIOpponents && opponents.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🤖 AI OPPONENTS</span>
                  <span style={{ opacity: 0.5 }}>Practice and climb your ELO</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                {opponents.map(bot => (
                  <div key={bot.id} style={{ flex: 1, padding: "14px", background: "rgba(13,17,35,0.9)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, textAlign: "center" as const }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{bot.emoji}</div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "white", marginBottom: 2 }}>{bot.display_name}</div>
                    <div style={{ fontSize: "0.62rem", color: "#475569", marginBottom: 6 }}>ELO ~ {bot.elo}</div>
                    <StarRating n={Math.ceil(bot.difficulty / 2)} max={5}/>
                    <button onClick={() => startAIDuel(bot.id)} style={{
                      display: "block", width: "100%", marginTop: 10, padding: "6px",
                      background: bot.difficulty <= 3 ? "rgba(34,197,94,0.15)" : bot.difficulty <= 6 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                      border: `1px solid ${bot.difficulty <= 3 ? "rgba(34,197,94,0.3)" : bot.difficulty <= 6 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
                      borderRadius: 7, color: bot.difficulty <= 3 ? "#22c55e" : bot.difficulty <= 6 ? "#f59e0b" : "#ef4444",
                      fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                    }}>⚡ Play</button>
                  </div>
                ))}
                {loading && [...Array(3)].map((_, i) => <div key={i} style={{ ...s.skeleton, flex: 1, height: 140 }}/>)}
                </div>
              </div>
            )}


            {/* My Matches header */}
            {activeFilter === "My Matches" && (
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>🏅 MY MATCHES</span>
                <span style={{ fontSize: "0.72rem", color: "#334155" }}>Challenges you have joined</span>
              </div>
            )}

            {/* Challenges grid */}
            {filteredChallenges.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                {filteredChallenges.map(ch => (
                  <div key={ch.id} className="ch-card" style={{ transition: "all 0.2s" }}>
                    <ChallengeCard ch={ch} onSelect={() => setSelectedChallenge(ch)}/>
                  </div>
                ))}
              </div>
            ) : !loading && activeFilter !== "Upcoming" ? (
              <div style={{ textAlign: "center" as const, padding: "40px", color: "#334155",
                background: "rgba(13,17,35,0.5)", borderRadius: 14, border: "1px dashed rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>⚔️</div>
                <div style={{ color: "#475569", marginBottom: 4 }}>
                  {activeFilter === "My Matches" ? "You haven't joined any challenges yet" : `No ${activeFilter} challenges found`}
                </div>
                {activeFilter !== "All" && (
                  <button onClick={() => setActiveFilter("All")} style={{
                    marginTop: 12, padding: "6px 16px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: 8, color: "#818cf8", fontSize: "0.75rem", cursor: "pointer",
                  }}>View All Challenges</button>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                {[...Array(6)].map((_, i) => <div key={i} style={{ ...s.skeleton, height: 190 }}/>)}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
            {/* Upcoming Events */}
            <div style={{ background: "rgba(13,17,35,0.97)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 700, letterSpacing: "0.1em" }}>UPCOMING EVENTS</div>
                <button style={{ background: "none", border: "none", color: "#6366f1", fontSize: "0.65rem", cursor: "pointer" }}>View All →</button>
              </div>
              {upcoming.slice(0, 6).map(ev => <UpcomingEventRow key={ev.id} ev={ev}/>)}
              {upcoming.length === 0 && !loading && <div style={{ color: "#334155", fontSize: "0.75rem", textAlign: "center" as const, padding: "20px 0" }}>No upcoming events scheduled</div>}
              {loading && [...Array(4)].map((_, i) => <div key={i} style={{ ...s.skeleton, height: 44, marginBottom: 6 }}/>)}
            </div>

            {/* Season Countdown */}
            {season && (
              <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(13,17,35,0.97))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: "16px" }}>
                <div style={{ fontSize: "0.6rem", color: "#6366f1", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 6 }}>SEASON 01</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "white", marginBottom: 10 }}>THE BUILDERS LEAGUE</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 4 }}>
                  {[
                    { val: seasonCountdown.days, label: "DAYS" },
                    { val: seasonCountdown.hours, label: "HOURS" },
                    { val: seasonCountdown.mins, label: "MIN" },
                  ].map((t, i) => (
                    <div key={i} style={{ textAlign: "center" as const, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 0" }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "white", fontVariantNumeric: "tabular-nums" }}>
                        {String(t.val).padStart(2, "0")}
                      </div>
                      <div style={{ fontSize: "0.5rem", color: "#475569", fontWeight: 600 }}>{t.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "0.62rem", color: "#475569", textAlign: "center" as const }}>{season.tagline}</div>
              </div>
            )}

            {/* Boss Raid quick panel */}
            {boss && (
              <div style={{ background: "linear-gradient(135deg,rgba(20,8,8,0.97),rgba(13,17,35,0.97))", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "16px" }}>
                <div style={{ fontSize: "0.6rem", color: "#ef4444", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>ACTIVE BOSS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: "1.5rem" }}>{boss.emoji}</span>
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ef4444" }}>{boss.name}</div>
                    <div style={{ fontSize: "0.6rem", color: "#475569" }}>{fmt(boss.fighters)} fighters</div>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: "0.6rem", color: "#ef4444" }}>HP</span>
                    <span style={{ fontSize: "0.6rem", color: "#ef4444" }}>{boss.hp_percent}%</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(239,68,68,0.1)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#ef4444", width: `${boss.hp_percent}%`, borderRadius: 3 }} />
                  </div>
                </div>
                <button onClick={() => setBossModal(true)} style={{ ...s.redBtn, width: "100%", padding: "7px", fontSize: "0.75rem" }}>⚔️ Fight Boss</button>
              </div>
            )}

            {/* Platform stats */}
            <div style={{ background: "rgba(13,17,35,0.97)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              {[
                { icon: "👥", val: fmt(playersOnline), label: "Players Online" },
                { icon: "🔴", val: liveCount, label: "Live Challenges" },
              ].map((st, i) => (
                <div key={i} style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "white" }}>{st.icon} {st.val}</div>
                  <div style={{ fontSize: "0.58rem", color: "#475569" }}>{st.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height: 60 }}/>
      </main>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: { display: "flex", minHeight: "100vh", background: "#030712", fontFamily: "'Inter',sans-serif", position: "relative", overflow: "hidden" },
  bg:   { position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 60% at 20% 0%,rgba(99,102,241,0.08) 0%,transparent 60%)", pointerEvents: "none" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.01) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.01) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" },
  glow1: { position: "fixed", top: "-150px", left: "30%", width: 500, height: 500, borderRadius: "50%", background: "rgba(99,102,241,0.07)", filter: "blur(80px)", pointerEvents: "none" },
  glow2: { position: "fixed", bottom: "-150px", right: "20%", width: 400, height: 400, borderRadius: "50%", background: "rgba(236,72,153,0.04)", filter: "blur(80px)", pointerEvents: "none" },

  sidebar: { width: 200, minHeight: "100vh", background: "rgba(9,12,25,0.98)", borderRight: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", padding: "20px 10px", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100 },
  main: { marginLeft: 200, flex: 1, padding: "0 24px 24px", minHeight: "100vh" },

  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 16 },
  ghostBtn: { display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, color: "#64748b", cursor: "pointer", padding: "5px 10px", fontSize: "0.75rem" },
  iconBtn: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, color: "#64748b", cursor: "pointer", padding: 7, display: "flex", alignItems: "center" },

  // Hero
  hero: { position: "relative", height: 200, borderRadius: 18, overflow: "hidden", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" },
  heroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.4) 50%,rgba(0,0,0,0.7) 100%)" },
  heroLeft: { position: "relative", zIndex: 1, padding: "0 32px" },
  profileCard: { position: "relative", zIndex: 1, width: 260, flexShrink: 0, margin: "12px 16px", background: "rgba(10,12,28,0.92)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px", backdropFilter: "blur(10px)" },

  // Modals
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "linear-gradient(135deg,#0d1224 0%,#0f172a 100%)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: 28, width: "100%", maxHeight: "88vh", overflowY: "auto", position: "relative" },
  closeBtn: { position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#64748b", cursor: "pointer", padding: 5, display: "flex", alignItems: "center" },
  redBtn: { background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", borderRadius: 10, color: "white", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", padding: "10px 16px", textAlign: "center" as const },
  indBtn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", borderRadius: 10, color: "white", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", padding: "12px" },
  statMini: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, textAlign: "center" as const, fontSize: "0.75rem" },
  skeleton: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite" },
};