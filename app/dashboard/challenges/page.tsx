"use client";
// app/dashboard/challenges/page.tsx
// GrowthOS Arena — Full real-time challenges page matching the approved design
// All timers derived from server ends_at — no hardcoded countdowns
// WebSocket connects to live battles for real-time score/HP updates

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

const MODE_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  "1v1":          { label: "1v1",          icon: "⚔️", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  "2v2":          { label: "2v2",          icon: "⚔️", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  "squad":        { label: "Squad",        icon: "👥", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  "battle_royale":{ label: "Battle Royale",icon: "🪂", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  "ai_duel":      { label: "AI Duel",      icon: "🤖", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  "boss_raid":    { label: "Boss Raid",    icon: "💀", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const FORMAT_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  "mcq":          { label: "MCQ",          color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  "reasoning":    { label: "Written",      color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  "coding":       { label: "Coding",       color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  "mixed":        { label: "Mixed",        color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  "boss":         { label: "Boss",         color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  "ai_agent":     { label: "AI Agent",     color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  "system_design":{ label: "System Design",color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
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

function ModeTile({ icon, label, sublabel, online, color, onClick }: {
  icon: string; label: string; sublabel: string; online: number;
  color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 130, padding: "14px 12px", borderRadius: 12,
      background: `linear-gradient(135deg,${color}22 0%,rgba(13,17,35,0.95) 100%)`,
      border: `1px solid ${color}33`, cursor: "pointer", textAlign: "left" as const,
      transition: "all 0.2s", position: "relative" as const, overflow: "hidden" as const,
    }}>
      <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "white" }}>{label}</div>
      <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{sublabel}</div>
      {online > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: "0.62rem", color: "#22c55e" }}>{fmt(online)} online</span>
        </div>
      )}
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
      borderRadius: 14, overflow: "hidden" as const, border: "1px solid rgba(255,255,255,0.07)",
      background: "linear-gradient(135deg,rgba(13,17,35,0.97) 0%,rgba(10,15,30,0.97) 100%)",
      minWidth: 280, flex: "0 0 280px", position: "relative" as const,
    }}>
      {/* Battle image placeholder */}
      <div style={{
        height: 120, background: `linear-gradient(135deg,${mode.color}22,rgba(0,0,0,0.8))`,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative" as const,
      }}>
        <div style={{ fontSize: "2.5rem", opacity: 0.4 }}>{mode.icon}</div>
        {/* Badges */}
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
          <span style={{ ...badgeSt, background: mode.bg, color: mode.color }}>{mode.label}</span>
          <span style={{ ...badgeSt, background: fmt_badge.bg, color: fmt_badge.color }}>{fmt_badge.label}</span>
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "white", marginBottom: 4 }}>
          {battle.title}
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: "0.68rem", color: "#475569", marginBottom: 10 }}>
          <span>👥 {fmt(battle.players)}</span>
          <span>⏱ {fmt_badge.label}</span>
        </div>
        {/* Server countdown */}
        <div style={{
          fontFamily: "monospace", fontSize: "1.8rem", fontWeight: 800, color: "#ef4444",
          letterSpacing: "0.05em", marginBottom: 10, fontVariantNumeric: "tabular-nums",
        }}>
          {formatted}
        </div>
        <button onClick={onJoin} style={{
          width: "100%", padding: "8px", background: "linear-gradient(135deg,#6366f1,#4f46e5)",
          border: "none", borderRadius: 8, color: "white", fontSize: "0.82rem", fontWeight: 700,
          cursor: "pointer",
        }}>
          Join Now
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
  const [playersOnline, setPlayersOnline] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
      const [prof, live, up, opp, seas, bs, ch] = await Promise.all([
        safe(`${API}/arena/profile`),
        safe(`${API}/arena/live`),
        safe(`${API}/arena/upcoming`),
        safe(`${API}/arena/opponents`),
        safe(`${API}/arena/season`),
        safe(`${API}/arena/boss`),
        safe(`${API}/challenges/`),
      ]);

      if (prof)  setProfile(prof);
      if (live)  { setLiveBattles(live.battles || []); setPlayersOnline(live.players_online || 0); setLiveCount(live.live_count || 0); }
      if (up)    setUpcoming(up.events || []);
      if (opp)   setOpponents(opp.opponents || []);
      if (seas)  setSeason(seas);
      if (bs)    setBoss(bs);
      if (ch)    setChallenges(ch.challenges || []);
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

  const filteredChallenges = challenges.filter(c => {
    const q = searchQ.toLowerCase();
    if (q && !c.title.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
    if (activeFilter === "All") return true;
    if (activeFilter === "MCQ") return c.type.toLowerCase().includes("mcq") || c.tags.some(t => t.toLowerCase() === "mcq");
    if (activeFilter === "Coding") return c.tags.some(t => ["python","javascript","java","code","coding"].includes(t.toLowerCase()));
    if (activeFilter === "AI Agent") return c.tags.some(t => ["ai","agent","llm","rag"].includes(t.toLowerCase()));
    return true;
  });

  const seasonCountdown = useDaysCountdown(season?.ends_at);

  // Mode tile online counts (from live battles)
  const modeOnline = liveBattles.reduce<Record<string,number>>((acc, b) => {
    acc[b.mode] = (acc[b.mode] || 0) + b.players;
    return acc;
  }, {});

  // Challenge types grid
  const CHALLENGE_TYPES = [
    { icon: "⚔️", label: "MCQ Battle",   sub: "Fast. Accurate. Win.", color: "#6366f1" },
    { icon: "✍️", label: "Written Answer", sub: "Explain. Reason. Rank.", color: "#f59e0b" },
    { icon: "💻", label: "Coding Battle",  sub: "Solve real problems.", color: "#22c55e" },
    { icon: "🏗️", label: "Build Challenge",sub: "Create & Ship.",        color: "#3b82f6" },
    { icon: "🤖", label: "AI Agent",       sub: "Build intelligent agents.", color: "#8b5cf6" },
    { icon: "🐛", label: "Debug & Fix",    sub: "Find. Fix. Learn.",     color: "#ef4444" },
    { icon: "🏛️", label: "Design",         sub: "Architecture & Planning.", color: "#06b6d4" },
    { icon: "🔀", label: "Mixed Mode",     sub: "A bit of everything.",   color: "#ec4899" },
  ];

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
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
              online={modeOnline[m.mode] || 0} color={m.color}
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

        {/* ── LIVE NOW ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s ease infinite" }}/>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "white" }}>LIVE NOW</span>
            {liveCount > 0 && <span style={{ fontSize: "0.72rem", color: "#475569" }}>{liveCount} challenges running · {fmt(playersOnline)} players online</span>}
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#6366f1", fontSize: "0.75rem", cursor: "pointer" }}>View All →</button>
        </div>

        <div style={{ display: "flex", gap: 14, marginBottom: 24, overflowX: "auto" as const, paddingBottom: 8 }}>
          {liveBattles.length === 0 && !loading ? (
            <div style={{ color: "#334155", padding: "40px 20px", textAlign: "center" as const, flex: 1 }}>No live battles right now — check back soon</div>
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

        {/* ── Main grid: Challenges + Sidebar ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start" }}>
          {/* Left: Challenge grid */}
          <div>
            {/* AI Opponents */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span>🤖 AI OPPONENTS</span>
                <span style={{ opacity: 0.5 }}>Practice and climb your ELO</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {opponents.length === 0 && !loading && <div style={{ color: "#334155", fontSize: "0.78rem" }}>Loading bots...</div>}
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

            {/* Challenge Types grid */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>
                🎮 CHALLENGE TYPES <span style={{ opacity: 0.5 }}>Different formats. Real skills.</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {CHALLENGE_TYPES.map((ct, i) => (
                  <button key={i} onClick={() => setActiveFilter(ct.label)} style={{
                    padding: "10px", background: "rgba(13,17,35,0.9)", border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 10, cursor: "pointer", textAlign: "left" as const, transition: "all 0.15s",
                  }}>
                    <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{ct.icon}</div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "white" }}>{ct.label}</div>
                    <div style={{ fontSize: "0.58rem", color: "#475569", marginTop: 2, lineHeight: 1.3 }}>{ct.sub}</div>
                    <div style={{ fontSize: "0.6rem", color: ct.color, marginTop: 4 }}>→</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Challenges grid */}
            {filteredChallenges.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                {filteredChallenges.map(ch => (
                  <div key={ch.id} className="ch-card" style={{ transition: "all 0.2s" }}>
                    <ChallengeCard ch={ch} onSelect={() => setSelectedChallenge(ch)}/>
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div style={{ textAlign: "center" as const, padding: "40px", color: "#334155" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>⚔️</div>
                <div>No challenges match this filter</div>
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