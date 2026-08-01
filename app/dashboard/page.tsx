"use client";
// app/dashboard/page.tsx
// GrowthOS — Command Center with AI Agents Cycling Orchestration & Orbit AI Core.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles, CheckCircle2, Circle, ChevronRight, RefreshCw,
  Zap, Target, BookOpen, Trophy, Users, Rocket, GitBranch,
  Brain, TrendingUp, Clock, Star, Bot, LayoutDashboard,
  Settings, LogOut, Bell, Search, Flame, Shield, Activity,
  Play, X, BarChart2, Cpu, Mic, Send, Volume2, MessageSquare, FileText,
} from "lucide-react";
import LoadingScreen from "./LoadingScreen";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";
import {
  ResumeAgent,
  InterviewAgent,
  ProjectAgent,
  NetworkingAgent,
  LearningAgent,
  OpportunityAgent,
  RoadmapAgent,
} from "@/components/agents";
import { useAuth } from "@/context/AuthContext";
import {
  getDashboard,
  getGrowthPlan,
  getSkills,
  getOpportunities,
  getAIInsight,
  getPracticeStreak,
  getBatchActivity,
  type Skill,
  type Opportunity,
  type StreakStatus,
  type BatchActivityItem,
} from "@/lib/dashboard-api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Mission {
  id: string;
  title: string;
  completed: boolean;
  type: "practice" | "review" | "project" | "learning";
}

interface SmartTask {
  id: string;
  title: string;
  question: string;
  description: string;
  difficulty: "hard" | "easy";
  completed: boolean;
  priority: string;
  estimated_minutes: number;
  category: string;
  skill_tag: string;
  resource_url: string;
  xp_reward: number;
  ai_feedback?: string;
}

interface NovaMessage {
  id: string;
  role: "user" | "nova";
  text: string;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = "13px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.06)", animation: "pulse 1.6s ease-in-out infinite" }} />;
}

const activityConfig: Record<string, { color: string; icon: string }> = {
  practice_completed: { color: "#22c55e", icon: "✓" },
  rank_change:        { color: "#f59e0b", icon: "↑" },
  practice_started:   { color: "#3b82f6", icon: "▶" },
  mission_completed:  { color: "#6366f1", icon: "★" },
  streak_achieved:    { color: "#f97316", icon: "🔥" },
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : ""; }

// ── AI OPERATING SYSTEM CONTEXT-AWARE GREETING & QUOTE ENGINE ───────────────
interface DynamicLiveGreetingProps {
  userName: string;
  streak?: number;
  completedMissions?: number;
  totalMissions?: number;
  completedTasks?: number;
  totalTasks?: number;
  opportunityCount?: number;
}

type TimeRangeKey =
  | "early_riser"     // 4 AM - 6 AM
  | "morning"         // 6 AM - 11 AM
  | "midday"          // 11 AM - 1 PM
  | "afternoon"       // 1 PM - 5 PM
  | "evening"         // 5 PM - 8 PM
  | "evening_focus"   // 8 PM - 11 PM
  | "night_owl"       // 11 PM - 2 AM
  | "midnight_oil";   // 2 AM - 4 AM

function DynamicLiveGreeting({
  userName,
  streak = 0,
  completedMissions = 0,
  totalMissions = 0,
  completedTasks = 0,
  totalTasks = 0,
  opportunityCount = 0,
}: DynamicLiveGreetingProps) {
  const [currentTimeKey, setCurrentTimeKey] = useState<TimeRangeKey>("morning");
  const [refreshSeed, setRefreshSeed] = useState(0);

  // Re-calculate real-time hour from browser local clock continuously (every 5 seconds)
  useEffect(() => {
    const updateRealTimeKey = () => {
      const h = new Date().getHours();
      if (h >= 4 && h < 6) setCurrentTimeKey("early_riser");
      else if (h >= 6 && h < 11) setCurrentTimeKey("morning");
      else if (h >= 11 && h < 13) setCurrentTimeKey("midday");
      else if (h >= 13 && h < 17) setCurrentTimeKey("afternoon");
      else if (h >= 17 && h < 20) setCurrentTimeKey("evening");
      else if (h >= 20 && h < 23) setCurrentTimeKey("evening_focus");
      else if (h >= 23 || h < 2) setCurrentTimeKey("night_owl");
      else setCurrentTimeKey("midnight_oil");
    };
    updateRealTimeKey();
    const interval = setInterval(updateRealTimeKey, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasMilestone = (streak >= 3) || (totalMissions > 0 && completedMissions === totalMissions);
  const activeKey: TimeRangeKey | "milestone" = hasMilestone ? "milestone" : currentTimeKey;

  // Capitalize first letter of user's name
  const name = useMemo(() => {
    const clean = (userName || "Surinder").trim();
    if (!clean) return "Surinder";
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }, [userName]);

  const pendingMissions = Math.max(0, totalMissions - completedMissions);
  const pendingTasks = Math.max(0, totalTasks - completedTasks);

  // Session rotation seed to prevent repeating the exact same sentence on refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prev = parseInt(sessionStorage.getItem("growthos_greet_seed") || "0", 10);
      const next = (prev + 1) % 100;
      sessionStorage.setItem("growthos_greet_seed", next.toString());
      setRefreshSeed(next);
    }
  }, []);

  const isWeekend = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }, []);

  // AI OS Dynamic Greetings & Quotes Matrix
  const greetingConfig = useMemo(() => {
    const pick = (arr: string[], offset = 0) => arr[(refreshSeed + offset) % arr.length];

    const getContextualQuote = (defaultQuotes: string[], timeQuote: string) => {
      if (totalMissions > 0 && completedMissions === totalMissions) {
        return `Excellent work, ${name}. All ${totalMissions} daily objectives are complete. Orbit is in background optimization mode.`;
      }
      if (pendingMissions > 0) {
        return `You have ${pendingMissions} mission${pendingMissions > 1 ? "s" : ""} waiting, ${name}. Shall we begin?`;
      }
      if (opportunityCount > 0) {
        return `I found ${opportunityCount} new opportunities for ${name} while you were offline. Execution window is ready.`;
      }
      if (streak >= 7) {
        return `${streak}-day streak maintained. ${name}, consistency is becoming your competitive advantage.`;
      }
      if (isWeekend) {
        return `Great systems never take weekends off. Opportunity monitoring remained active for ${name}.`;
      }
      return pick(defaultQuotes, 1) || timeQuote;
    };

    return {
      early_riser: {
        badge: "🌄 Early Riser",
        line1: pick([
          `Early start today, ${name}.`,
          `Dawn execution protocol active, ${name}.`,
          `Early start today, ${name}. Your competitors are probably still sleeping.`,
          `Systems initialized early for ${name}.`,
        ], 0),
        line2: getContextualQuote([
          "Small wins compound into extraordinary results.",
          "Your competitors are probably still sleeping. Let's build leverage.",
          "Early morning clarity unlocked. Mission control is synchronized.",
        ], "Small wins compound into extraordinary results."),
        gradient: "linear-gradient(135deg, #f43f5e 0%, #fbbf24 100%)",
        color: "#fbbf24",
        bgGlow: "rgba(244, 63, 94, 0.12)",
        borderColor: "rgba(244, 63, 94, 0.28)",
      },

      morning: {
        badge: "🌅 Morning Briefing",
        line1: pick([
          `Good morning, ${name}.`,
          `Systems online. Good morning, ${name}.`,
          `Good morning, ${name}. Let's build something meaningful today.`,
          `Today's focus is already prepared for ${name}.`,
        ], 0),
        line2: getContextualQuote([
          "Today's focus is already prepared. Mission control is ready.",
          "Small wins compound into extraordinary results.",
          "Opportunity monitoring remained active while you were away.",
        ], "Today's focus is already prepared. Let's make it count."),
        gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
        color: "#fbbf24",
        bgGlow: "rgba(245, 158, 11, 0.12)",
        borderColor: "rgba(245, 158, 11, 0.28)",
      },

      midday: {
        badge: "⚡ Midday Momentum",
        line1: pick([
          `Hope your day is gaining momentum, ${name}.`,
          `Midday checkpoint active for ${name}.`,
          `Execution window is at peak capacity, ${name}.`,
          `Systems synchronized for peak performance, ${name}.`,
        ], 0),
        line2: getContextualQuote([
          "Execution beats planning every single time.",
          "Midday momentum active. Your AI handled the heavy lifting.",
          "Keep pushing forward — consistency compounds continuously.",
        ], "Hope your day is gaining momentum."),
        gradient: "linear-gradient(135deg, #00f2fe 0%, #38bdf8 100%)",
        color: "#00f2fe",
        bgGlow: "rgba(0, 242, 254, 0.12)",
        borderColor: "rgba(0, 242, 254, 0.28)",
      },

      afternoon: {
        badge: "☀️ Afternoon Execution",
        line1: pick([
          `Good afternoon, ${name}.`,
          `Your AI already prepared today's execution plan, ${name}.`,
          `Ready for another sprint, ${name}?`,
          `Execution window active for ${name}.`,
        ], 0),
        line2: getContextualQuote([
          "Your AI already prepared today's execution plan. You just need to execute.",
          "Execution beats planning every single time.",
          "Everything is synchronized and waiting for you.",
        ], "Your AI already prepared today's execution plan."),
        gradient: "linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%)",
        color: "#38bdf8",
        bgGlow: "rgba(56, 189, 248, 0.12)",
        borderColor: "rgba(56, 189, 248, 0.28)",
      },

      evening: {
        badge: "🌇 Evening Wrap-Up",
        line1: pick([
          `Good evening, ${name}.`,
          `Let's wrap up today's priorities, ${name}.`,
          `Evening sync protocol initialized for ${name}.`,
          `Today's mission targets in final stage, ${name}.`,
        ], 0),
        line2: getContextualQuote([
          "Finish one meaningful thing before today ends.",
          "You made progress today. Let's finish strong.",
          "Reflecting on today's milestones before nightly rest.",
        ], "Finish one meaningful thing before today ends."),
        gradient: "linear-gradient(135deg, #c084fc 0%, #818cf8 100%)",
        color: "#c084fc",
        bgGlow: "rgba(192, 132, 252, 0.12)",
        borderColor: "rgba(192, 132, 252, 0.28)",
      },

      evening_focus: {
        badge: "🌌 Evening Focus Mode",
        line1: pick([
          `Evening focus mode active for ${name}.`,
          `Distractions clear, ${name}. Deep work window open.`,
          `Good evening, ${name}. Ready for a quiet focus sprint?`,
          `Nightly execution window initialized for ${name}.`,
        ], 0),
        line2: getContextualQuote([
          "Deep work happens when the world gets quiet.",
          "Finish one meaningful thing before today ends.",
          "Orbit is standing by while distractions clear out.",
        ], "Deep work happens when the world gets quiet."),
        gradient: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
        color: "#a78bfa",
        bgGlow: "rgba(139, 92, 246, 0.12)",
        borderColor: "rgba(139, 92, 246, 0.28)",
      },

      night_owl: {
        badge: "🌙 Night Owl",
        line1: pick([
          `Still awake, night owl ${name}?`,
          `Perfect time for deep work while distractions are low, ${name}.`,
          `Late night focus phase active, ${name}.`,
          `Orbit is standing by for ${name}.`,
        ], 0),
        line2: getContextualQuote([
          "Perfect time for deep work while distractions are low.",
          "Deep work happens when the world gets quiet.",
          "Your AI never stopped working. Orbit is standing by.",
        ], "Perfect time for deep work while distractions are low."),
        gradient: "linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)",
        color: "#22d3ee",
        bgGlow: "rgba(6, 182, 212, 0.12)",
        borderColor: "rgba(6, 182, 212, 0.28)",
      },

      midnight_oil: {
        badge: "🌌 Midnight Oil",
        line1: pick([
          `Burning the midnight oil, ${name}?`,
          `I'll keep everything organized while you stay focused, ${name}.`,
          `Silent hours active for ${name}. Uninterrupted flow state.`,
          `Your AI never stops monitoring for ${name}.`,
        ], 0),
        line2: getContextualQuote([
          "I'll keep everything organized while you stay focused.",
          "Deep work happens when the world gets quiet.",
          "Opportunity monitoring remained active while the world sleeps.",
        ], "I'll keep everything organized while you stay focused."),
        gradient: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
        color: "#818cf8",
        bgGlow: "rgba(99, 102, 241, 0.12)",
        borderColor: "rgba(99, 102, 241, 0.28)",
      },

      milestone: {
        badge: "🏆 Milestone Achieved",
        line1: pick([
          `Congratulations, ${name}!`,
          `Milestone reached for ${name}. Systems synchronized.`,
          `Today's mission starts now, ${name}.`,
          `Goal threshold unlocked for ${name}.`,
        ], 0),
        line2: streak > 0 
          ? `${streak}-day streak maintained, ${name}. Consistency is becoming your competitive advantage.`
          : `You're one step closer to your goal, ${name}. Let me keep monitoring your next target.`,
        gradient: "linear-gradient(135deg, #10b981 0%, #f59e0b 100%)",
        color: "#10b981",
        bgGlow: "rgba(16, 185, 129, 0.15)",
        borderColor: "rgba(16, 185, 129, 0.35)",
      },
    };
  }, [name, pendingMissions, pendingTasks, opportunityCount, streak, isWeekend, refreshSeed, completedMissions, totalMissions]);

  const current = greetingConfig[activeKey];

  const [typedLine1, setTypedLine1] = useState("");
  const [typedLine2, setTypedLine2] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let t1Timer: any;
    let t2Timer: any;
    setTypedLine1("");
    setTypedLine2("");

    let i = 0;
    const full1 = current.line1;
    const full2 = current.line2;

    const typeLine1 = () => {
      if (i < full1.length) {
        setTypedLine1(full1.slice(0, i + 1));
        i++;
        t1Timer = setTimeout(typeLine1, 28);
      } else {
        let j = 0;
        const typeLine2 = () => {
          if (j < full2.length) {
            setTypedLine2(full2.slice(0, j + 1));
            j++;
            t2Timer = setTimeout(typeLine2, 16);
          }
        };
        typeLine2();
      }
    };

    t1Timer = setTimeout(typeLine1, 50);

    return () => {
      clearTimeout(t1Timer);
      clearTimeout(t2Timer);
    };
  }, [activeKey, current.line1, current.line2]);

  useEffect(() => {
    const blink = setInterval(() => setCursorVisible(v => !v), 500);
    return () => clearInterval(blink);
  }, []);

  // Helper to render user name in a distinct highlight color (pure white + text glow)
  const renderHighlightedText = (text: string, targetName: string, highlightColor: string = "#ffffff") => {
    if (!text || !targetName) return text;
    const idx = text.toLowerCase().indexOf(targetName.toLowerCase());
    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const matched = text.slice(idx, idx + targetName.length);
    const after = text.slice(idx + targetName.length);

    return (
      <>
        {before}
        <span
          style={{
            color: highlightColor,
            fontWeight: 900,
            textShadow: `0 0 16px ${highlightColor}, 0 0 8px rgba(255,255,255,0.95)`,
            padding: "0 2px",
          }}
        >
          {matched}
        </span>
        {after}
      </>
    );
  };

  return (
    <div
      style={{
        padding: "20px 22px",
        borderRadius: "18px",
        background: current.bgGlow,
        border: `1px solid ${current.borderColor}`,
        boxShadow: `0 12px 36px ${current.bgGlow}`,
        backdropFilter: "blur(12px)",
        transition: "all 0.4s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "0.74rem", fontWeight: 700, color: current.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {current.badge}
        </span>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: current.color, animation: "livePulse 1.5s infinite" }} />
      </div>

      <h1
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: "1.9rem",
          fontWeight: 800,
          color: current.color,
          textShadow: `0 0 24px ${current.color}88, 0 0 10px ${current.color}44`,
          margin: "0 0 6px 0",
          lineHeight: 1.25,
        }}
      >
        {renderHighlightedText(typedLine1, name, "#ffffff")}
        {typedLine1.length < current.line1.length && (
          <span style={{ opacity: cursorVisible ? 1 : 0, color: current.color, marginLeft: "2px" }}>|</span>
        )}
      </h1>

      <p style={{ fontSize: "0.92rem", color: "#e2e8f0", margin: 0, lineHeight: 1.55, fontWeight: 500, opacity: 0.95 }}>
        {renderHighlightedText(typedLine2, name, "#38bdf8")}
        {typedLine1.length >= current.line1.length && typedLine2.length < current.line2.length && (
          <span style={{ opacity: cursorVisible ? 1 : 0, color: current.color, marginLeft: "2px" }}>|</span>
        )}
      </p>
    </div>
  );
}

// ── MAIN DASHBOARD COMPONENT ──────────────────────────────────────────────────

function cleanDisplayName(raw?: string, email?: string): string {
  if (raw && raw.trim()) {
    const trimmed = raw.trim();
    const clean = trimmed.replace(/\d+$/, "").trim();
    return clean || trimmed;
  }
  if (email && email.trim()) {
    const handle = email.split("@")[0];
    const cleanHandle = handle.replace(/\d+$/, "").replace(/[._-]/g, " ").trim();
    return cleanHandle.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "User";
  }
  return "User";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [showLoader, setShowLoader] = useState(false);
  const [loaded, setLoaded]         = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const lastTimeStr = localStorage.getItem("last_growthos_loading_time");
      const now = Date.now();
      const nowDate = new Date(now).toDateString();
      let shouldShow = true;

      if (lastTimeStr) {
        const lastTime = parseInt(lastTimeStr, 10);
        if (!isNaN(lastTime)) {
          const lastDate = new Date(lastTime).toDateString();
          const ONE_HOUR = 60 * 60 * 1000;
          // Skip loader screen if visited on same day AND within 1 hour
          if (nowDate === lastDate && (now - lastTime) < ONE_HOUR) {
            shouldShow = false;
          }
        }
      }

      if (shouldShow) {
        setShowLoader(true);
      } else {
        setLoaded(true);
      }
    }
  }, []);

  const handleLoaderDone = useCallback(() => {
    setShowLoader(false);
    setLoaded(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("last_growthos_loading_time", Date.now().toString());
    }
  }, []);
  const [userName, setUserName]     = useState("");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [planTier, setPlanTier]     = useState<string>("Student");
  const [userLevel, setUserLevel]   = useState<number>(1);
  const [userXp, setUserXp]         = useState<number>(0);
  const [nextLevelXp, setNextLevelXp] = useState<number>(500);
  const [levelProgressPct, setLevelProgressPct] = useState<number>(0);

  const rawName = userName || (user as any)?.full_name || (user as any)?.name;
  const displayName = cleanDisplayName(rawName, user?.email);
  const avatar = displayName ? displayName.slice(0, 2).toUpperCase() : "GO";
  const effectiveAvatarUrl = userAvatarUrl || (user as any)?.image || (user as any)?.avatar_url || (displayName ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=0f172a` : null);

  const [smartTasks, setSmartTasks]         = useState<SmartTask[]>([]);
  const [expandedTask, setExpandedTask]     = useState<string | null>(null);
  const [taskAnswer, setTaskAnswer]         = useState<Record<string, string>>({});
  const [taskFeedback, setTaskFeedback]     = useState<Record<string, string>>({});
  const [submittingTask, setSubmittingTask] = useState<string | null>(null);

  const [skills, setSkills]               = useState<Skill[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [insight, setInsight]             = useState("");
  const [streakData, setStreakData]        = useState<StreakStatus | null>(null);
  const [missions, setMissions]           = useState<Mission[]>([]);
  const [batchActivity, setBatchActivity] = useState<BatchActivityItem[]>([]);
  const [activityError, setActivityError] = useState(false);

  // Loading flags
  const [dashLoading, setDashLoading]         = useState(true);
  const [skillsLoading, setSkillsLoading]     = useState(true);
  const [insightLoading, setInsightLoading]   = useState(true);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [streakLoading, setStreakLoading]     = useState(true);
  const [oppsLoading, setOppsLoading]         = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [smartTasksLoading, setSTLoading]   = useState(true);

  // Agent workspace panel state
  const [activeAgentPanel, setActiveAgentPanel] = useState<
    "learning" | "opportunity" | "roadmap" | "resume" | "interview" | "project" | "networking" | "productivity" | null
  >(null);

  // Profile & Settings wide modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Nova companion
  const [novaMessages, setNovaMessages] = useState<NovaMessage[]>([]);
  const [novaCard, setNovaCard]         = useState<{ text: string; primary: string; onPrimary: () => void } | null>(null);
  const [novaInput, setNovaInput]       = useState("");
  const [novaLoading, setNovaLoading]   = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [micSupported, setMicSupported]     = useState(false);
  const novaGreetedRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const novaScrollRef  = useRef<HTMLDivElement>(null);

  const missionsRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  const timeLeft = useDeadlineTimer();

  const currentStreak = streakData?.current_streak ?? 0;
  const completedMissions = missions.filter(m => m.completed).length;

  // Orbit Voice & live orbital movement state (position translation only)
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [isOrbitHovered, setIsOrbitHovered] = useState(false);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      if (!isOrbitHovered) {
        setOrbitAngle(prev => (prev + delta * 0.08) % (2 * Math.PI));
      }
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isOrbitHovered]);

  useEffect(() => {
    getDashboard()
      .then(d => {
        if (d) {
          if (d.user_name || (d as any).full_name) setUserName(d.user_name || (d as any).full_name);
          if ((d as any).avatar_url || (d as any).image) setUserAvatarUrl((d as any).avatar_url || (d as any).image);
          if ((d as any).plan_tier) setPlanTier((d as any).plan_tier);
          if ((d as any).level !== undefined) setUserLevel((d as any).level);
          if ((d as any).current_xp !== undefined) setUserXp((d as any).current_xp);
          if ((d as any).next_level_xp !== undefined) setNextLevelXp((d as any).next_level_xp);
          if ((d as any).level_progress_percent !== undefined) setLevelProgressPct((d as any).level_progress_percent);
        }
      })
      .catch(() => {})
      .finally(() => setDashLoading(false));

    fetch(`${API}/api/tasks/today`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSmartTasks(d); })
      .catch(() => {})
      .finally(() => setSTLoading(false));

    getSkills().then(d => { if (d?.length) setSkills(d); }).catch(() => {}).finally(() => setSkillsLoading(false));
    getOpportunities().then(d => { if (d?.length) setOpportunities(d); }).catch(() => {}).finally(() => setOppsLoading(false));
    getAIInsight().then(d => { if (d?.insight) setInsight(d.insight); }).catch(() => {}).finally(() => setInsightLoading(false));
    getPracticeStreak().then(d => setStreakData(d)).catch(() => {}).finally(() => setStreakLoading(false));
    fetchMissions();

    if (typeof window !== "undefined") {
      setVoiceSupported("speechSynthesis" in window);
      setMicSupported(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    }
  }, []);

  useEffect(() => {
    if (!user?.id) { setActivityLoading(false); return; }
    setActivityLoading(true);
    getBatchActivity(user.id, 8)
      .then(d => setBatchActivity(d || []))
      .catch(() => setActivityError(true))
      .finally(() => setActivityLoading(false));
  }, [user?.id]);

  async function fetchMissions() {
    setMissionsLoading(true);
    try {
      const res = await fetch(`${API}/missions/today`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.missions?.length) setMissions(data.missions);
      }
    } catch {}
    finally { setMissionsLoading(false); }
  }

  const toggleSmartTask = async (taskId: string) => {
    const task = smartTasks.find(t => t.id === taskId);
    if (!task) return;
    const isNowCompleted = !task.completed;
    setSmartTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: isNowCompleted } : t));
    const endpoint = task.completed ? "uncomplete" : "complete";
    await fetch(`${API}/api/tasks/${taskId}/${endpoint}`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } }).catch(() => {});
    if (isNowCompleted) {
      getPracticeStreak().then(d => setStreakData(d)).catch(() => {});
    }
  };

  const toggleMission = (id: string) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, completed: !m.completed } : m));
    fetch(`${API}/missions/${id}/toggle`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } }).catch(() => {});
  };

  const submitTaskAnswer = async (taskId: string) => {
    const answer = taskAnswer[taskId]?.trim();
    if (!answer) return;
    setSubmittingTask(taskId);
    try {
      const res = await fetch(`${API}/api/tasks/${taskId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ task_id: taskId, user_answer: answer }),
      });
      const data = await res.json();
      setTaskFeedback(prev => ({ ...prev, [taskId]: data.feedback }));
      if (data.status === "completed" || data.completed) {
        setSmartTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
        getPracticeStreak().then(d => setStreakData(d)).catch(() => {});
      }
    } catch {
      setTaskFeedback(prev => ({ ...prev, [taskId]: "Answer saved. Keep up the momentum!" }));
    } finally {
      setSubmittingTask(null);
    }
  };

  // Voice output
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechClass) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const r = new SpeechClass();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";
    r.onstart = () => setIsListening(true);
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setNovaInput(text);
      setIsListening(false);
      sendNovaMessage(text);
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
  };

  const handleOrbClick = () => {
    if (isSpeaking) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const sample = `Hello ${displayName || "there"}. I am Nova, your AI Core orchestrator. All 7 AI agents are actively synced. How can I accelerate your goals today?`;
    speak(sample);
  };

  const askAI = async (promptText: string) => {
    try {
      const res = await fetch(`${API}/api/learning-agent/tutor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: promptText }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.text || "Synced with Nova AI Core.";
      }
    } catch {}
    return `I am keeping track of your goals. How else can I assist you today?`;
  };

  const sendNovaMessage = async (overrideText?: string) => {
    const text = (overrideText || novaInput).trim();
    if (!text || novaLoading) return;
    const userMsg: NovaMessage = { id: `u-${Date.now()}`, role: "user", text };
    setNovaMessages(prev => [...prev, userMsg]);
    if (!overrideText) setNovaInput("");
    setNovaLoading(true);

    try {
      const reply = await askAI(text);
      setNovaMessages(prev => [...prev, { id: `n-${Date.now()}`, role: "nova", text: reply }]);
      speak(reply);
    } catch {
      setNovaMessages(prev => [...prev, { id: `n-${Date.now()}`, role: "nova", text: "I couldn't reach the server just now — try again in a moment." }]);
    } finally {
      setNovaLoading(false);
    }
  };

  useEffect(() => {
    novaScrollRef.current?.scrollTo({ top: novaScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [novaMessages]);

  useEffect(() => {
    if (novaGreetedRef.current) return;
    if (streakLoading || missionsLoading || smartTasksLoading) return;
    novaGreetedRef.current = true;

    if (streakData && currentStreak > 0 && !streakData.practiced_today) {
      setNovaCard({
        text: `I noticed your ${currentStreak}-day streak will end today. It only needs one problem. Shall I open today's challenge?`,
        primary: "Yes, let's go",
        onPrimary: () => { setNovaCard(null); router.push("/dashboard/practice"); },
      });
    } else {
      setNovaCard({
        text: `Everything's on track right now. I'll keep monitoring your goals quietly in the background.`,
        primary: "Got it",
        onPrimary: () => setNovaCard(null),
      });
    }
  }, [streakLoading, missionsLoading, smartTasksLoading]);

  if (showLoader) return <LoadingScreen onDone={handleLoaderDone} />;

  // ── AI AGENTS LIST (All 7 Agents wired to dedicated Workspace Modals) ───────
  const AGENTS: {
    id: "learning" | "opportunity" | "roadmap" | "resume" | "interview" | "project" | "productivity";
    label: string;
    icon: any;
    color: string;
    status: string;
    desc: string;
  }[] = [
    {
      id: "learning", label: "Learning Agent", icon: Brain, color: "#22d3ee",
      status: skillsLoading ? "Curating…" : skills[0] ? `${skills[0].name} · ${skills[0].level}` : "Skills Path Active",
      desc: "Curated learning paths, micro-modules & AI mentor guidance",
    },
    {
      id: "opportunity", label: "Opportunity Agent", icon: Rocket, color: "#f59e0b",
      status: oppsLoading ? "Scanning…" : `${opportunities.length} live match${opportunities.length === 1 ? "" : "es"}`,
      desc: "AI market scanner for top matched roles, gigs & projects",
    },
    {
      id: "roadmap", label: "Roadmap Agent", icon: GitBranch, color: "#818cf8",
      status: "AI Growth Roadmap",
      desc: "Personalized multi-phase growth roadmap & milestone execution tracker",
    },
    {
      id: "resume", label: "Resume Agent", icon: FileText, color: "#38bdf8",
      status: "ATS Score & Feedback",
      desc: "ATS-style resume analyzer, score tracking & actionable feedback",
    },
    {
      id: "interview", label: "Interview Agent", icon: Mic, color: "#f472b6",
      status: "AI Mock Interviews",
      desc: "Role-specific practice interview questions & instant AI scoring",
    },
    {
      id: "project", label: "Project Agent", icon: Zap, color: "#a855f7",
      status: "Build Tracker",
      desc: "Track ideas, in-progress builds, and shipped portfolio projects",
    },
    {
      id: "productivity", label: "Productivity Agent", icon: Target, color: "#f97316",
      status: "Daily Focus Tracker",
      desc: "Smart daily task queue, habit streaks & focus time management",
    },
  ];

  if (showLoader) {
    return <LoadingScreen onDone={handleLoaderDone} />;
  }

  return (
    <div style={s.root}>
      <div style={s.bg} /><div style={s.bgGrid} /><div style={s.bgGlow1} /><div style={s.bgGlow2} />
      <Particles />

      {/* Render AI Agent Workspace Modals */}
      {activeAgentPanel === "learning" && <LearningAgent onClose={() => setActiveAgentPanel(null)} />}
      {activeAgentPanel === "opportunity" && <OpportunityAgent onClose={() => setActiveAgentPanel(null)} />}
      {activeAgentPanel === "roadmap" && <RoadmapAgent onClose={() => setActiveAgentPanel(null)} />}
      {activeAgentPanel === "resume" && <ResumeAgent onClose={() => setActiveAgentPanel(null)} />}
      {activeAgentPanel === "interview" && <InterviewAgent onClose={() => setActiveAgentPanel(null)} />}
      {activeAgentPanel === "project" && <ProjectAgent onClose={() => setActiveAgentPanel(null)} />}
      {activeAgentPanel === "networking" && <NetworkingAgent onClose={() => setActiveAgentPanel(null)} />}
      {activeAgentPanel === "productivity" && <RoadmapAgent onClose={() => setActiveAgentPanel(null)} />}

      {/* Wide Settings & Profile Modal */}
      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={{ padding: "0 4px 24px" }}>
          <BrandLogo size="md" />
        </div>
        <nav style={s.nav}>
          {[
            { icon: <LayoutDashboard size={18}/>, label: "Home",           href: "/dashboard",            active: true },
            { icon: <Play size={18}/>,            label: "Practice Arena", href: "/dashboard/practice"    },
            { icon: <BarChart2 size={18}/>,       label: "Leaderboard",    href: "/dashboard/leaderboard" },
            { icon: <Trophy size={18}/>,          label: "Challenges",     href: "/dashboard/challenges"  },
            { icon: <Users size={18}/>,           label: "Community",      href: "/dashboard/community"   },
            { icon: <Settings size={18}/>,        label: "Settings",       href: "/dashboard/settings"    },
          ].map(item => (
            <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
              <button style={{ ...s.navItem, ...(item.active ? s.navItemActive : {}) }}>
                <span style={{ opacity: item.active ? 1 : 0.5 }}>{item.icon}</span>
                <span style={{ opacity: item.active ? 1 : 0.6, fontSize: "0.85rem", fontWeight: item.active ? 600 : 400, color: item.active ? "white" : "#94a3b8" }}>{item.label}</span>
                {item.active && <div style={s.navActiveDot} />}
              </button>
            </Link>
          ))}
        </nav>
        <div style={s.sidebarFooter}>
          <div
            onClick={() => setIsProfileModalOpen(true)}
            style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", cursor: "pointer" }}
            title="Click to open Profile & Wide Settings"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ ...s.avatarSmall, overflow: "hidden", borderRadius: "50%", background: "#0f172a", border: "1px solid rgba(34,211,238,0.3)" }}>
                {effectiveAvatarUrl ? (
                  <img src={effectiveAvatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  avatar
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {dashLoading ? <Skeleton w="70px" h="11px" /> : displayName}
                  </div>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "1px 6px", borderRadius: "6px", background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "white" }}>
                    {planTier}
                  </span>
                </div>
                <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Level {userLevel}</div>
              </div>
            </div>
            {/* XP Progress Bar */}
            <div>
              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${levelProgressPct}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #38bdf8)", borderRadius: "2px", boxShadow: "0 0 8px #38bdf8", transition: "width 0.5s ease" }} />
              </div>
              <div style={{ fontSize: "0.64rem", color: "#475569", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                <span>{userXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
                <span style={{ color: "#38bdf8" }}>{levelProgressPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ ...s.main, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)", transition: "all 0.6s ease" }}>

        {/* Topbar */}
        <div style={s.topbar}>
          <div style={s.searchWrap}>
            <Search size={15} style={{ color: "#475569" }} />
            <input placeholder="Search anything..." style={s.searchInput} />
          </div>
          <div style={s.topbarRight}>
            <div style={s.statusPill}><div style={s.statusDot}/><span>All agents synced</span></div>
            <div style={s.clock}>{timeLeft.clock}</div>
            <button style={s.iconBtn}><Bell size={17} /></button>
            <div
              onClick={() => setIsProfileModalOpen(true)}
              style={{ ...s.avatarMed, cursor: "pointer", overflow: "hidden", borderRadius: "50%", border: "1.5px solid rgba(34,211,238,0.4)" }}
              title="Click to open Profile & Wide Settings"
            >
              {effectiveAvatarUrl ? (
                <img src={effectiveAvatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                avatar
              )}
            </div>
          </div>
        </div>

        {/* ══ COMMAND CENTER HERO ══════════════════════════════════════════ */}
        <section style={s.heroWrap}>
          <div style={s.heroLeft}>
            <div style={s.heroGreetTag}>
              <Shield size={11} style={{ color: "#6366f1" }} />
              <span>Mission Control · AI Briefing</span>
            </div>

            {/* DYNAMIC LIVE GREETINGS WITH TYPEWRITER ANIMATION */}
            <DynamicLiveGreeting
              userName={displayName || "Surinder"}
              streak={currentStreak}
              completedMissions={missions.filter(m => m.completed).length}
              totalMissions={missions.length}
              completedTasks={smartTasks.filter(t => t.completed).length}
              totalTasks={smartTasks.length}
              opportunityCount={opportunities.length}
            />

            <div style={s.heroStatRow}>
              <div style={s.heroStat}>
                <Clock size={12} style={{ color: "#ef4444" }} />
                <span style={s.heroStatVal}>{timeLeft.countdown}</span>
                <span style={s.heroStatLabel}>left today</span>
              </div>
              <div style={s.heroStat}>
                <Flame size={12} style={{ color: "#f97316" }} />
                <span style={s.heroStatVal}>{streakLoading ? "…" : currentStreak}</span>
                <span style={s.heroStatLabel}>day streak</span>
              </div>
              <div style={s.heroStat}>
                <TrendingUp size={12} style={{ color: "#22c55e" }} />
                <span style={s.heroStatVal}>7/7</span>
                <span style={s.heroStatLabel}>agents active</span>
              </div>
            </div>
          </div>

          {/* Nova companion panel */}
          <div style={s.novaPanel}>
            <div style={s.novaHeader}>
              <div style={s.novaAvatar}>
                <svg viewBox="0 0 40 40" width="24" height="24">
                  <ellipse cx="14" cy="21" rx="2" ry="2.6" fill="#bfe4ff" />
                  <ellipse cx="26" cy="21" rx="2" ry="2.6" fill="#bfe4ff" />
                </svg>
              </div>
              <div>
                <div style={s.novaName}>Nova</div>
                <div style={s.novaSub}>{isListening ? "Listening…" : isSpeaking ? "Speaking…" : "Your AI Core Companion"}</div>
              </div>
              {micSupported && (
                <button
                  onClick={startListening}
                  style={{ ...s.novaMicBtn, ...(isListening ? { background: "rgba(239,68,68,0.18)", borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" } : {}) }}
                  title="Talk to Nova"
                >
                  <Mic size={14} />
                </button>
              )}
            </div>

            {novaCard && (
              <div style={s.novaCard}>
                <div style={s.novaCardText}>{novaCard.text}</div>
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button style={s.novaPrimaryBtn} onClick={() => { speak(novaCard.text); novaCard.onPrimary(); }}>{novaCard.primary}</button>
                  <button style={s.novaGhostBtn} onClick={() => setNovaCard(null)}>Maybe later</button>
                </div>
              </div>
            )}

            <div ref={novaScrollRef} style={s.novaChat}>
              {novaMessages.length === 0 && !novaCard && (
                <div style={s.novaEmpty}>Ask Nova anything about your goals, skills, or AI agent orchestration.</div>
              )}
              {novaMessages.map(m => (
                <div key={m.id} style={{ ...s.novaBubble, ...(m.role === "user" ? s.novaBubbleUser : s.novaBubbleNova) }}>
                  {m.text}
                </div>
              ))}
              {novaLoading && <div style={{ ...s.novaBubble, ...s.novaBubbleNova, opacity: 0.6 }}>Thinking…</div>}
            </div>

            <div style={s.novaInputRow}>
              <input
                value={novaInput}
                onChange={e => setNovaInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendNovaMessage()}
                placeholder="Ask Nova anything..."
                style={s.novaInput}
              />
              <button style={s.novaSendBtn} onClick={() => sendNovaMessage()} disabled={novaLoading}>
                <Send size={14} />
              </button>
            </div>

            <div style={s.novaActivityHeader}>
              <span>AI Activity</span><span style={s.novaActivityLive}>Live Feed</span>
            </div>
            <div style={s.novaActivityList}>
              {activityLoading ? (
                [1,2,3].map(i => <Skeleton key={i} h="30px" />)
              ) : activityError || batchActivity.length === 0 ? (
                <div style={s.novaEmpty}>No cohort activity yet — invite a friend to see live updates here.</div>
              ) : batchActivity.slice(0, 5).map(item => {
                const cfg = activityConfig[item.activity_type] ?? { color: "#475569", icon: "•" };
                return (
                  <div key={item.id} style={s.novaActivityItem}>
                    <div style={{ ...s.novaActivityIcon, background: `${cfg.color}22`, color: cfg.color }}>{item.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.novaActivityText}><strong style={{ color: "white" }}>{item.user_name}</strong> {item.activity_text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ ORBIT VOICE — CENTRAL AI VOICE CORE ══════════════════════════════ */}
        <section style={s.section}>
          <div style={{ ...s.card, padding: "32px 28px", position: "relative", overflow: "hidden", background: "rgba(6, 11, 26, 0.8)", borderColor: "rgba(0, 242, 254, 0.3)", boxShadow: "0 20px 50px rgba(0,0,0,0.6), inset 0 0 30px rgba(0, 242, 254, 0.08)" }}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={{ ...s.cardIcon, background: "rgba(0, 242, 254, 0.15)", border: "1px solid rgba(0, 242, 254, 0.4)", boxShadow: "0 0 16px rgba(0, 242, 254, 0.3)" }}>
                  <Mic size={20} style={{ color: "#00f2fe" }} />
                </div>
                <div>
                  <h2 style={{ ...s.cardTitle, background: "linear-gradient(135deg, #ffffff 0%, #00f2fe 50%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    🌐 Orbit Voice — Central AI Voice Core
                  </h2>
                  <p style={s.cardSub}>Holographic AI Assistant (Orbit). Click hologram pedestal or mic to speak in real-time.</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.72rem", color: "#00f2fe", background: "rgba(0, 242, 254, 0.12)", padding: "5px 14px", borderRadius: "16px", border: "1px solid rgba(0, 242, 254, 0.35)", fontWeight: 700, letterSpacing: "0.03em", boxShadow: "0 0 12px rgba(0, 242, 254, 0.2)" }}>
                  {isSpeaking ? "● Speaking" : isListening ? "● Listening" : "● Orbit Voice Active"}
                </span>
              </div>
            </div>

            {/* Holographic Projection Environment Box */}
            <div style={{ position: "relative", width: "100%", height: "320px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              {/* Background Ambient Radial Glow */}
              <div style={{ position: "absolute", width: "420px", height: "320px", background: "radial-gradient(circle at 50% 60%, rgba(0, 242, 254, 0.14) 0%, rgba(3, 19, 43, 0) 70%)", pointerEvents: "none" }} />

              {/* Interactive Hologram Container */}
              <div
                onClick={handleOrbClick}
                style={{
                  position: "relative",
                  width: "260px",
                  height: "260px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  cursor: "pointer",
                }}
                aria-label="Talk to Orbit Voice AI Assistant"
              >
                {/* 1. Floating Speech Bubble ("Hello!" matching reference image) */}
                <div
                  style={{
                    position: "absolute",
                    top: "15px",
                    left: "-50px",
                    zIndex: 10,
                    background: "rgba(5, 20, 46, 0.92)",
                    border: "1.5px solid #00f2fe",
                    borderRadius: "14px",
                    padding: "8px 16px",
                    boxShadow: "0 0 22px rgba(0, 242, 254, 0.5), inset 0 0 12px rgba(0, 242, 254, 0.2)",
                    backdropFilter: "blur(12px)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    animation: "orbitFloat 4.8s ease-in-out infinite alternate",
                  }}
                >
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff", letterSpacing: "0.02em", fontFamily: "'Rajdhani', sans-serif" }}>
                    {isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Hello!"}
                  </span>
                  {/* Pointer arrow pointing right toward head */}
                  <div
                    style={{
                      position: "absolute",
                      right: "-8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 0,
                      height: 0,
                      borderTop: "6px solid transparent",
                      borderBottom: "6px solid transparent",
                      borderLeft: "8px solid #00f2fe",
                    }}
                  />
                </div>

                {/* 2. Vertical Hologram Projection Light Rays & Particles Cone */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "40px",
                    width: "170px",
                    height: "155px",
                    background: "linear-gradient(to top, rgba(0, 242, 254, 0.38) 0%, rgba(0, 242, 254, 0.12) 65%, rgba(0, 242, 254, 0) 100%)",
                    clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />

                {/* Upward Hologram Projection Beams (SVG Streaks) */}
                <svg
                  style={{
                    position: "absolute",
                    bottom: "40px",
                    width: "180px",
                    height: "150px",
                    pointerEvents: "none",
                    zIndex: 3,
                  }}
                  viewBox="0 0 180 150"
                >
                  <line x1="38" y1="150" x2="60" y2="10" stroke="#00f2fe" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="6 4" />
                  <line x1="68" y1="150" x2="78" y2="5" stroke="#00f2fe" strokeWidth="2" strokeOpacity="0.85" />
                  <line x1="90" y1="150" x2="90" y2="0" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.95" filter="url(#eyeGlow)" />
                  <line x1="112" y1="150" x2="102" y2="5" stroke="#00f2fe" strokeWidth="2" strokeOpacity="0.85" />
                  <line x1="142" y1="150" x2="120" y2="10" stroke="#00f2fe" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="6 4" />

                  {/* Upward Floating Particles in Projection Beam */}
                  {[0, 1, 2, 3, 4, 5, 6].map(i => (
                    <circle key={i} r={1.8 + (i % 2) * 0.8} fill="#ffffff" filter="url(#eyeGlow)">
                      <animateMotion
                        path={`M ${32 + i * 20},145 L ${48 + i * 14},15`}
                        dur={`${2.2 + i * 0.35}s`}
                        begin={`${i * 0.28}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </svg>

                {/* 3. Floating Orbit Robot Head (Holographic Visor & Face) */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 5,
                    marginBottom: "46px",
                    animation: "humanBreathe 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Outer Visor Glowing Sphere Head */}
                  <div
                    style={{
                      position: "relative",
                      width: "110px",
                      height: "110px",
                      borderRadius: "50%",
                      background: "radial-gradient(circle at 35% 30%, #082847 0%, #031327 70%, #020917 100%)",
                      border: "2.5px solid #00f2fe",
                      boxShadow: "0 0 45px rgba(0, 242, 254, 0.8), inset 0 0 30px rgba(0, 242, 254, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* Outer Visor Ring Outline (matching image) */}
                    <div
                      style={{
                        position: "absolute",
                        inset: "-7px",
                        borderRadius: "50%",
                        border: "1.8px solid #00f2fe",
                        borderBottomColor: "transparent",
                        boxShadow: "0 0 18px rgba(0, 242, 254, 0.6)",
                        animation: "coreSwirl 16s linear infinite",
                      }}
                    />

                    {/* Orbit SVG Face (Eyebrows, Blinking Eyes, Smiling Mouth, 3 Chin Dots) */}
                    <svg viewBox="0 0 100 100" style={{ width: "86px", height: "86px", position: "relative", zIndex: 2, overflow: "visible" }}>
                      {/* Eyebrows / Expression Arches */}
                      <path d="M 23 30 Q 33 24 42 30" fill="none" stroke="#00f2fe" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
                      <path d="M 58 30 Q 67 24 77 30" fill="none" stroke="#00f2fe" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />

                      {/* Left Eye & Eyelid (Blinking) */}
                      <g style={{ transformOrigin: "33px 40px", animation: "novaBlink 4s ease-in-out infinite" }}>
                        <ellipse cx="33" cy="40" rx="9" ry="7" fill="#031327" stroke="#00f2fe" strokeWidth="2" filter="url(#eyeGlow)" />
                        <ellipse cx="33" cy="40" rx="5" ry="5" fill="#00f2fe" />
                        <circle cx="34.8" cy="38.2" r="1.8" fill="#ffffff" />
                      </g>

                      {/* Right Eye & Eyelid (Blinking) */}
                      <g style={{ transformOrigin: "67px 40px", animation: "novaBlink 4s ease-in-out infinite" }}>
                        <ellipse cx="67" cy="40" rx="9" ry="7" fill="#031327" stroke="#00f2fe" strokeWidth="2" filter="url(#eyeGlow)" />
                        <ellipse cx="67" cy="40" rx="5" ry="5" fill="#00f2fe" />
                        <circle cx="68.8" cy="38.2" r="1.8" fill="#ffffff" />
                      </g>

                      {/* Orbit Smiling Mouth / Talking Mouth */}
                      {!isSpeaking ? (
                        <path d="M 34 65 Q 50 76 66 65" fill="none" stroke="#00f2fe" strokeWidth="2.8" strokeLinecap="round" filter="url(#eyeGlow)" />
                      ) : (
                        <g style={{ transformOrigin: "50px 66px", animation: "mouthTalk 0.4s ease-in-out infinite alternate" }}>
                          <path d="M 34 64 Q 50 77 66 64 Q 50 57 34 64" fill="rgba(0, 242, 254, 0.35)" stroke="#00f2fe" strokeWidth="2.8" strokeLinecap="round" filter="url(#eyeGlow)" />
                        </g>
                      )}

                      {/* 3 Illuminated Status Dots at Base of Visor Head (Matching Image) */}
                      <circle cx="43" cy="85" r="1.8" fill="#00f2fe" filter="url(#eyeGlow)" />
                      <circle cx="50" cy="85" r="2.0" fill="#ffffff" filter="url(#eyeGlow)" />
                      <circle cx="57" cy="85" r="1.8" fill="#00f2fe" filter="url(#eyeGlow)" />
                    </svg>

                    {isSpeaking && (
                      <div style={{ position: "absolute", bottom: "12px", display: "flex", alignItems: "center", gap: "3px", zIndex: 3 }}>
                        {[0, 1, 2, 3, 4].map(i => <span key={i} style={{ width: "3px", height: "14px", borderRadius: "2px", background: "#00f2fe", boxShadow: "0 0 8px #00f2fe", animation: `waveBounce 0.6s ease-in-out ${i * 0.1}s infinite` }} />)}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Glowing 3D Hologram Base Pedestal Platform (Matching Image) */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "0px",
                    width: "190px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "radial-gradient(ellipse at center, #00f2fe 0%, #0284c7 40%, #031838 85%)",
                    border: "2px solid #00f2fe",
                    boxShadow: "0 0 40px rgba(0, 242, 254, 0.85), 0 10px 25px rgba(0, 0, 0, 0.7), inset 0 0 24px rgba(255, 255, 255, 0.55)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 4,
                  }}
                >
                  {/* Pedestal Top Illuminated Surface Ring */}
                  <div
                    style={{
                      position: "absolute",
                      inset: "4px",
                      borderRadius: "50%",
                      border: "1px solid rgba(255, 255, 255, 0.65)",
                      background: "radial-gradient(ellipse at center, rgba(0,242,254,0.45) 0%, rgba(2,132,199,0.18) 70%)",
                    }}
                  />

                  {/* Letter / Logo inscribed in Pedestal surface (Matching 'B' logo in image) */}
                  <span
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: "1.2rem",
                      fontWeight: 900,
                      color: "#ffffff",
                      letterSpacing: "0.06em",
                      textShadow: "0 0 14px #00f2fe",
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    GrowthOS
                  </span>

                  {/* Front Light Slit on Pedestal Cylinder Base (Matching image) */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "4px",
                      width: "50px",
                      height: "3.5px",
                      borderRadius: "2px",
                      background: "#00f2fe",
                      boxShadow: "0 0 12px #00f2fe",
                    }}
                  />
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: "12px" }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.2rem", fontWeight: 800, color: "white", letterSpacing: "0.06em", textShadow: "0 0 20px rgba(0,242,254,0.6)" }}>
                  Orbit Voice Core
                </div>
                <div style={{ fontSize: "0.76rem", color: "#00f2fe", fontWeight: 700, marginTop: "2px", textShadow: "0 0 12px rgba(0,242,254,0.5)" }}>
                  {isSpeaking ? "Speaking… Click hologram to interrupt" : "Click hologram pedestal or mic to speak in real-time"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ AI INSIGHT + TODAY'S ACTION PLAN ═════════════════════════════ */}
        <section style={s.twoCol}>
          <div style={{ ...s.card, flex: 1 }}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={{ ...s.cardIcon, background: "rgba(99,102,241,0.15)" }}><Bot size={18} style={{ color: "#6366f1" }} /></div>
                <div><h2 style={s.cardTitle}>AI Growth Insight</h2><p style={s.cardSub}>Personalized for your goals</p></div>
              </div>
            </div>
            <div style={s.insightBody}>
              <div style={s.insightAvatar}><Sparkles size={16} style={{ color: "#6366f1" }} /></div>
              <div style={s.insightBubble}>
                {insightLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Skeleton/><Skeleton w="85%"/><Skeleton w="70%"/>
                  </div>
                ) : (
                  <p style={s.insightText}>
                    {insight || "Your personalized AI insight is being generated. Start a practice session to help calibrate it."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={{ ...s.card, flex: 1 }} ref={missionsRef}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={{ ...s.cardIcon, background: "rgba(34,197,94,0.1)" }}>
                  <Zap size={18} style={{ color: "#22c55e" }} />
                </div>
                <div>
                  <h2 style={s.cardTitle}>Today's Action Plan</h2>
                  <p style={s.cardSub}>
                    {smartTasksLoading
                      ? "Generating your tasks..."
                      : `${smartTasks.filter(t => t.completed).length} of ${smartTasks.length} completed`}
                  </p>
                </div>
              </div>
              {!smartTasksLoading && smartTasks.length > 0 && (
                <button
                  style={{ ...s.regenBtn, fontSize: "0.72rem" }}
                  onClick={async () => {
                    setSTLoading(true);
                    try {
                      const res = await fetch(`${API}/api/tasks/regenerate`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } });
                      const data = await res.json();
                      if (Array.isArray(data)) { setSmartTasks(data); setTaskFeedback({}); setTaskAnswer({}); setExpandedTask(null); }
                    } catch {}
                    finally { setSTLoading(false); }
                  }}
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              )}
            </div>

            <div style={s.taskListWrap}>
              {smartTasksLoading ? (
                [1, 2].map(i => <Skeleton key={i} h="38px" />)
              ) : smartTasks.length === 0 ? (
                <div style={s.emptyState}>No tasks today — check back soon!</div>
              ) : smartTasks.slice(0, 3).map(task => (
                <div key={task.id} style={{ ...st.taskCard, ...(task.completed ? st.taskCardDone : {}) }} onClick={() => toggleSmartTask(task.id)}>
                  <div style={st.taskHeader}>
                    <div style={st.checkWrap}>
                      {task.completed ? <CheckCircle2 size={18} style={{ color: "#22c55e" }} /> : <Circle size={18} style={{ color: "#334155" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...st.taskTitle, ...(task.completed ? { textDecoration: "line-through", opacity: 0.4 } : {}) }}>{task.title}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/dashboard/practice" style={{ textDecoration: "none" }}>
              <div style={pa.banner}>
                <div style={pa.bannerLeft}>
                  <span style={{ fontSize: "1.3rem" }}>🔥</span>
                  <div>
                    <div style={pa.bannerTitle}>Practice Arena</div>
                    <div style={pa.bannerSub}>
                      Streak: <strong style={{ color: "#f97316" }}>{streakLoading ? "..." : `${currentStreak} days`}</strong>
                    </div>
                  </div>
                </div>
                <div style={pa.bannerRight}>
                  <span style={pa.aiBadge}>AI-generated</span>
                  <span style={{ fontSize: "0.82rem", color: "#f97316", fontWeight: 700 }}>Start →</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ══ AI AGENTS ORCHESTRATION — VISION OS / JARVIS CONSTELLATION ═════ */}
        <section style={s.section}>
          <style>{`
            @keyframes humanBreathe {
              0% {
                transform: scale(1) translateY(0px);
                box-shadow: 0 0 45px rgba(0, 242, 254, 0.65), 0 0 90px rgba(59, 130, 246, 0.4);
              }
              45% {
                transform: scale(1.045) translateY(-3px);
                box-shadow: 0 0 75px rgba(0, 242, 254, 0.85), 0 0 130px rgba(59, 130, 246, 0.6);
              }
              55% {
                transform: scale(1.045) translateY(-3px);
                box-shadow: 0 0 75px rgba(0, 242, 254, 0.85), 0 0 130px rgba(59, 130, 246, 0.6);
              }
              100% {
                transform: scale(1) translateY(0px);
                box-shadow: 0 0 45px rgba(0, 242, 254, 0.65), 0 0 90px rgba(59, 130, 246, 0.4);
              }
            }

            @keyframes novaBlink {
              0%, 92%, 97%, 100% {
                transform: scaleY(1);
              }
              94.5% {
                transform: scaleY(0.08);
              }
            }

            @keyframes coreSwirl {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }

            @keyframes coreSwirlRev {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(-360deg); }
            }

            @keyframes waveBounce {
              0%, 100% { transform: scaleY(0.4); }
              50% { transform: scaleY(1.3); }
            }

            @keyframes mouthTalk {
              0%, 100% { transform: scaleY(1); }
              50% { transform: scaleY(1.4); }
            }

            @keyframes orbitFloat {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-7px); }
              100% { transform: translateY(0px); }
            }
          `}</style>
          <div style={{ ...s.card, padding: "32px", position: "relative", overflow: "hidden", background: "rgba(6, 10, 24, 0.8)", borderColor: "rgba(0, 242, 254, 0.3)", boxShadow: "0 20px 50px rgba(0,0,0,0.6), inset 0 0 30px rgba(0, 242, 254, 0.08)" }}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={{ ...s.cardIcon, background: "rgba(0, 242, 254, 0.15)", border: "1px solid rgba(0, 242, 254, 0.4)", boxShadow: "0 0 16px rgba(0, 242, 254, 0.3)" }}>
                  <Activity size={20} style={{ color: "#00f2fe" }} />
                </div>
                <div>
                  <h2 style={{ ...s.cardTitle, background: "linear-gradient(135deg, #ffffff 0%, #00f2fe 50%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    ⚡ AI Agents Orchestration Matrix
                  </h2>
                  <p style={s.cardSub}>Orbit Voice orchestrating 7 specialized agents via electric laser rays. Hover any agent to inspect energy beams & relationships.</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.72rem", color: "#00f2fe", background: "rgba(0, 242, 254, 0.12)", padding: "4px 14px", borderRadius: "16px", border: "1px solid rgba(0, 242, 254, 0.35)", fontWeight: 700, letterSpacing: "0.03em", boxShadow: "0 0 12px rgba(0, 242, 254, 0.2)" }}>
                  ● Laser Network Synchronized
                </span>
              </div>
            </div>

            <div
              style={{ position: "relative", width: "100%", height: "650px", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              {/* SVG Laser Ray Beams, Glowing Orbital Curves & Pulse Animations */}
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
                viewBox="0 0 1100 650"
              >
                <defs>
                  <filter id="laserGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="eyeGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="novaLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f2fe" stopOpacity="1" />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="1" />
                  </linearGradient>
                </defs>

                {/* Soft Outer Orbital Ellipse Curves */}
                <ellipse cx="550" cy="325" rx="460" ry="260" fill="none" stroke="rgba(0, 242, 254, 0.15)" strokeWidth="1.5" />
                <ellipse cx="550" cy="325" rx="380" ry="210" fill="none" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1.2" />

                {/* High-Tech Dual Laser Rays connecting Orbit Voice (550, 325) to 7 Agent Nodes */}
                {[
                  { id: "learning", color: "#38bdf8", x: 550 + Math.round(410 * Math.cos(-Math.PI / 2)), y: 325 + Math.round(260 * Math.sin(-Math.PI / 2)) },
                  { id: "opportunity", color: "#fbbf24", x: 550 + Math.round(425 * Math.cos(-Math.PI / 2 + (2 * Math.PI / 7))), y: 325 + Math.round(260 * Math.sin(-Math.PI / 2 + (2 * Math.PI / 7))) },
                  { id: "interview", color: "#38bdf8", x: 550 + Math.round(440 * Math.cos(-Math.PI / 2 + (4 * Math.PI / 7))), y: 325 + Math.round(260 * Math.sin(-Math.PI / 2 + (4 * Math.PI / 7))) },
                  { id: "networking", color: "#a855f7", x: 550 + Math.round(420 * Math.cos(-Math.PI / 2 + (6 * Math.PI / 7))), y: 325 + Math.round(270 * Math.sin(-Math.PI / 2 + (6 * Math.PI / 7))) },
                  { id: "project", color: "#10b981", x: 550 + Math.round(420 * Math.cos(-Math.PI / 2 + (8 * Math.PI / 7))), y: 325 + Math.round(270 * Math.sin(-Math.PI / 2 + (8 * Math.PI / 7))) },
                  { id: "roadmap", color: "#f97316", x: 550 + Math.round(440 * Math.cos(-Math.PI / 2 + (10 * Math.PI / 7))), y: 325 + Math.round(260 * Math.sin(-Math.PI / 2 + (10 * Math.PI / 7))) },
                  { id: "resume", color: "#06b6d4", x: 550 + Math.round(425 * Math.cos(-Math.PI / 2 + (12 * Math.PI / 7))), y: 325 + Math.round(260 * Math.sin(-Math.PI / 2 + (12 * Math.PI / 7))) },
                ].map(node => {
                  const isHovered = hoveredAgent === node.id;
                  const isAnyHovered = hoveredAgent !== null;
                  const opacity = isHovered ? 1 : isAnyHovered ? 0.12 : 0.45;

                  return (
                    <g key={node.id}>
                      {/* Outer Blurred Laser Glow Ray */}
                      <line
                        x1="550"
                        y1="325"
                        x2={node.x}
                        y2={node.y}
                        stroke={node.color}
                        strokeOpacity={opacity}
                        strokeWidth={isHovered ? 6 : 3}
                        filter="url(#laserGlow)"
                        style={{ transition: "stroke-opacity 0.3s ease, stroke-width 0.3s ease" }}
                      />

                      {/* Inner Crisp White-Hot Core Laser Ray */}
                      <line
                        x1="550"
                        y1="325"
                        x2={node.x}
                        y2={node.y}
                        stroke="#ffffff"
                        strokeOpacity={isHovered ? 1 : isAnyHovered ? 0.2 : 0.7}
                        strokeWidth={isHovered ? 2 : 1}
                        strokeDasharray="8 4"
                        style={{ transition: "stroke-opacity 0.3s ease" }}
                      />

                      {/* Target Connection Ring at Node End */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="6"
                        fill="#050b1e"
                        stroke={node.color}
                        strokeWidth="2"
                        filter="url(#laserGlow)"
                      />

                      {/* Laser Energy Particle traveling back & forth along Ray */}
                      <circle r={isHovered ? "5.5" : "3.5"} fill={node.color} filter="url(#laserGlow)">
                        <animateMotion
                          path={`M ${node.x},${node.y} L 550,325 L ${node.x},${node.y}`}
                          dur={isHovered ? "2s" : "5s"}
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  );
                })}

                {/* Simulated Laser Pulse Workflow */}
                <circle r="5" fill="#00f2fe" filter="url(#laserGlow)">
                  <animateMotion
                    path="M 882,163 L 550,325 L 218,163 L 550,325 L 979,383 L 550,325 L 121,383"
                    dur="10s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>

              {/* 7 FIXED CONSTELLATION CLEAN GLASS AGENT NODES (Expanded Orbit Space) */}
              {[
                {
                  id: "learning", label: "Learning Agent", icon: Brain, color: "#38bdf8",
                  sub: "Roadmap • Week 3", progress: 62,
                  angleDeg: -90, radiusX: 410, radiusY: 260,
                },
                {
                  id: "opportunity", label: "Opportunity Agent", icon: Rocket, color: "#fbbf24",
                  bullets: ["• 8 new opportunities", "• 3 need your action"],
                  angleDeg: -38.5, radiusX: 425, radiusY: 260,
                },
                {
                  id: "interview", label: "Interview Agent", icon: Mic, color: "#38bdf8",
                  bullets: ["• 2 mock interviews", "• Next: Tomorrow"],
                  angleDeg: 12.8, radiusX: 440, radiusY: 260,
                },
                {
                  id: "roadmap", label: "Roadmap Agent", icon: GitBranch, color: "#818cf8",
                  bullets: ["• Phase 2 Active", "• 3 milestones set"],
                  angleDeg: 64.2, radiusX: 420, radiusY: 270,
                },
                {
                  id: "project", label: "Project Agent", icon: Zap, color: "#10b981",
                  bullets: ["• 3 active projects", "• 2 updates pending"],
                  angleDeg: 115.7, radiusX: 420, radiusY: 270,
                },
                {
                  id: "productivity", label: "Productivity Agent", icon: Target, color: "#f97316",
                  bullets: ["• Today's Focus", "• 3 tasks remaining"],
                  angleDeg: 167.1, radiusX: 440, radiusY: 260,
                },
                {
                  id: "resume", label: "Resume Agent", icon: FileText, color: "#06b6d4",
                  bullets: ["• ATS Score 91", "• Optimize Now"],
                  angleDeg: 218.5, radiusX: 425, radiusY: 260,
                },
              ].map((agent) => {
                const rad = (agent.angleDeg * Math.PI) / 180;
                const x = Math.round(agent.radiusX * Math.cos(rad));
                const y = Math.round(agent.radiusY * Math.sin(rad));
                const Icon = agent.icon;

                const isHovered = hoveredAgent === agent.id;
                const isAnyHovered = hoveredAgent !== null;
                const opacity = isHovered ? 1 : isAnyHovered ? 0.25 : 0.95;

                return (
                  <div
                    key={agent.id}
                    onMouseEnter={() => setHoveredAgent(agent.id)}
                    onMouseLeave={() => setHoveredAgent(null)}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      rotate: "0deg",
                      transformOrigin: "center center",
                      zIndex: isHovered ? 25 : 10,
                      opacity,
                      transition: "opacity 0.3s ease, filter 0.3s ease",
                      filter: isAnyHovered && !isHovered ? "grayscale(0.3)" : "none",
                      pointerEvents: "auto",
                    }}
                  >
                    {/* Unified Clean Premium Glass Node Card */}
                    <div
                      onClick={() => setActiveAgentPanel(agent.id as any)}
                      style={{
                        background: isHovered ? "rgba(10, 18, 42, 0.96)" : "rgba(8, 14, 32, 0.92)",
                        border: isHovered ? `1.5px solid ${agent.color}` : `1px solid ${agent.color}55`,
                        boxShadow: isHovered
                          ? `0 16px 40px rgba(0,0,0,0.8), 0 0 35px ${agent.color}66, inset 0 0 20px ${agent.color}25`
                          : `0 10px 28px rgba(0,0,0,0.55), inset 0 0 14px ${agent.color}18`,
                        backdropFilter: "blur(18px)",
                        borderRadius: "16px",
                        padding: "12px 16px",
                        cursor: "pointer",
                        writingMode: "horizontal-tb",
                        minWidth: "180px",
                        maxWidth: "220px",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {/* Clean Icon + Title Header */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            background: `radial-gradient(circle at 30% 30%, ${agent.color}33, ${agent.color}11)`,
                            border: `1px solid ${agent.color}66`,
                            boxShadow: `0 0 14px ${agent.color}44`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={19} style={{ color: agent.color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: "0.86rem", fontWeight: 700, color: agent.color, whiteSpace: "nowrap" }}>
                            {agent.label}
                          </div>
                          {agent.sub && (
                            <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "1px" }}>
                              {agent.sub}
                            </div>
                          )}
                        </div>
                      </div>

                      {agent.progress !== undefined && (
                        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", margin: "6px 0", overflow: "hidden" }}>
                          <div style={{ width: `${agent.progress}%`, height: "100%", background: agent.color, borderRadius: "2px" }} />
                        </div>
                      )}
                      {agent.bullets && agent.bullets.map((b, idx) => (
                        <div key={idx} style={{ fontSize: "0.7rem", color: "#cbd5e1", marginTop: "2px", lineHeight: 1.35 }}>
                          {b}
                        </div>
                      ))}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600 }}>Active Agent</span>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: agent.color }}>Workspace →</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Central Nova AI Core (Electric Cyan/Blue Sphere with Human-Like Breathing, Eyes, Nose & Mouth) */}
              {(() => {
                const hoveredNode = [
                  { id: "learning", angleDeg: -90 },
                  { id: "opportunity", angleDeg: -38.5 },
                  { id: "interview", angleDeg: 12.8 },
                  { id: "roadmap", angleDeg: 64.2 },
                  { id: "project", angleDeg: 115.7 },
                  { id: "productivity", angleDeg: 167.1 },
                  { id: "resume", angleDeg: 218.5 },
                ].find(n => n.id === hoveredAgent);

                const tiltAngle = hoveredNode ? hoveredNode.angleDeg / 6 : 0;

                return (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: `translate(-50%, -50%) rotate(${tiltAngle}deg)`,
                      transition: "transform 0.5s ease",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      zIndex: 15,
                    }}
                  >
                    {/* Electric Cyan & Blue Nova Core Sphere (124px x 124px) */}
                    <button
                      style={{
                        position: "relative",
                        width: "124px",
                        height: "124px",
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                        background: "radial-gradient(circle at 35% 30%, #00f2fe 0%, #0284c7 40%, #3b82f6 75%, #050b1e 100%)",
                        boxShadow: "0 0 50px rgba(0, 242, 254, 0.7), 0 0 100px rgba(59, 130, 246, 0.45), 0 0 140px rgba(99, 102, 241, 0.3)",
                        animation: "humanBreathe 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onClick={handleOrbClick}
                      aria-label="Nova AI Core - Electric Digital Consciousness"
                    >
                      {/* Multi-Layered Glowing Swirl Halos (Electric Cyan & Blue) */}
                      <div style={{ position: "absolute", inset: "-18px", borderRadius: "50%", border: "2px solid #00f2fe", borderTopColor: "#38bdf8", borderLeftColor: "transparent", boxShadow: "0 0 25px #00f2fe", animation: "coreSwirl 12s linear infinite" }} />
                      <div style={{ position: "absolute", inset: "-32px", borderRadius: "50%", border: "1.5px solid #3b82f6", borderBottomColor: "#00f2fe", borderRightColor: "transparent", boxShadow: "0 0 35px #3b82f6", animation: "coreSwirlRev 20s linear infinite" }} />
                      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "inset 0 0 45px rgba(255, 255, 255, 0.45)" }} />

                      {/* Human-Like AI Face (Blinking Eyes, Nose & Mouth) */}
                      <svg viewBox="0 0 100 100" style={{ width: "72px", height: "72px", position: "relative", zIndex: 2, overflow: "visible" }}>
                        {/* Eyebrows / Expression Ridges */}
                        <path d="M 23 31 Q 33 27 42 31" fill="none" stroke="#00f2fe" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
                        <path d="M 58 31 Q 67 27 77 31" fill="none" stroke="#00f2fe" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

                        {/* Left Eye & Eyelid (Blinking) */}
                        <g style={{ transformOrigin: "33px 41px", animation: "novaBlink 4s ease-in-out infinite" }}>
                          <ellipse cx="33" cy="41" rx="8" ry="6" fill="#031327" stroke="#00f2fe" strokeWidth="1.5" filter="url(#eyeGlow)" />
                          <ellipse cx="33" cy="41" rx="4.5" ry="4.5" fill="#00f2fe" />
                          <circle cx="34.5" cy="39.5" r="1.5" fill="#ffffff" />
                        </g>

                        {/* Right Eye & Eyelid (Blinking) */}
                        <g style={{ transformOrigin: "67px 41px", animation: "novaBlink 4s ease-in-out infinite" }}>
                          <ellipse cx="67" cy="41" rx="8" ry="6" fill="#031327" stroke="#00f2fe" strokeWidth="1.5" filter="url(#eyeGlow)" />
                          <ellipse cx="67" cy="41" rx="4.5" ry="4.5" fill="#00f2fe" />
                          <circle cx="68.5" cy="39.5" r="1.5" fill="#ffffff" />
                        </g>

                        {/* Futuristic Human Nose Bridge & Tip */}
                        <path d="M 50 43 L 50 52 Q 50 55 46 55" fill="none" stroke="#00f2fe" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
                        <circle cx="46" cy="55" r="1" fill="#00f2fe" opacity="0.9" />
                        <circle cx="54" cy="55" r="1" fill="#00f2fe" opacity="0.9" />

                        {/* Human Lips & Mouth */}
                        {!isSpeaking ? (
                          <g>
                            <path d="M 43 65 Q 50 63 57 65" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
                            <path d="M 37 67 Q 50 74 63 67" fill="none" stroke="#00f2fe" strokeWidth="2.2" strokeLinecap="round" filter="url(#eyeGlow)" />
                          </g>
                        ) : (
                          <g style={{ transformOrigin: "50px 67px", animation: "mouthTalk 0.4s ease-in-out infinite alternate" }}>
                            <path d="M 37 65 Q 50 76 63 65 Q 50 60 37 65" fill="rgba(0, 242, 254, 0.3)" stroke="#00f2fe" strokeWidth="2.2" strokeLinecap="round" filter="url(#eyeGlow)" />
                          </g>
                        )}
                      </svg>

                      {isSpeaking && (
                        <div style={{ position: "absolute", bottom: "14px", display: "flex", alignItems: "center", gap: "3px", zIndex: 3 }}>
                          {[0, 1, 2, 3, 4].map(i => <span key={i} style={{ width: "3px", height: "14px", borderRadius: "2px", background: "#00f2fe", boxShadow: "0 0 8px #00f2fe", animation: `waveBounce 0.6s ease-in-out ${i * 0.1}s infinite` }} />)}
                        </div>
                      )}
                    </button>

                    <div style={{ textAlign: "center", marginTop: "12px" }}>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.15rem", fontWeight: 800, color: "white", letterSpacing: "0.06em", textShadow: "0 0 20px rgba(0,242,254,0.6)" }}>
                        Nova AI Core
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#00f2fe", fontWeight: 700, marginTop: "2px", textShadow: "0 0 12px rgba(0,242,254,0.5)" }}>
                        Electric AI Brain • Orchestrating Agents
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* ══ BATCH ACTIVITY FEED ══════════════════════════════════════════ */}
        <section style={s.section} ref={activityRef}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={{ ...s.cardIcon, background: "rgba(99,102,241,0.1)" }}><Activity size={18} style={{ color: "#6366f1" }} /></div>
                <div><h2 style={s.cardTitle}>Batch Activity Feed</h2><p style={s.cardSub}>Live updates from your cohort</p></div>
              </div>
              <div style={s.livePill}><div style={s.liveDot}/><span>Live</span></div>
            </div>
            <div style={feed.grid}>
              {activityLoading ? (
                [1,2,3,4].map(i => <Skeleton key={i} h="52px" />)
              ) : activityError || batchActivity.length === 0 ? (
                <div style={s.emptyState}>No cohort activity yet. Once your batch starts practicing, you'll see it here in real time.</div>
              ) : batchActivity.map(item => {
                const cfg = activityConfig[item.activity_type] ?? { color: "#475569", icon: "•" };
                return (
                  <div key={item.id} style={feed.item}>
                    <div style={{ ...feed.avatar, background: `${cfg.color}22`, border: `1px solid ${cfg.color}44`, color: cfg.color }}>{item.avatar}</div>
                    <div style={feed.body}><span style={feed.userName}>{item.user_name}</span><span style={feed.action}> {item.activity_text}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <span style={{ ...feed.typeBadge, color: cfg.color, background: `${cfg.color}15` }}>{cfg.icon}</span>
                      <span style={feed.time}>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={feed.footer}>
              <Link href="/dashboard/leaderboard" style={{ textDecoration: "none" }}>
                <button style={feed.footerBtn}>View Full Leaderboard <ChevronRight size={13}/></button>
              </Link>
              <Link href="/dashboard/challenges" style={{ textDecoration: "none" }}>
                <button style={feed.footerBtn}>Weekly Challenge <Trophy size={13}/></button>
              </Link>
            </div>
          </div>
        </section>

        <div style={s.footerNote}>
          <div style={s.footerDot}/><span>All 7 AI Agents Synchronized</span><span style={{ opacity: 0.3 }}>·</span><span>GrowthOS AI Operating System</span>
        </div>

        <div style={{ height: "30px" }}/>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
        @keyframes orbPulse { 0%,100%{transform:scale(0.96);opacity:0.6} 50%{transform:scale(1.04);opacity:1} }
        @keyframes orbSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes orbRevSpin { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes breathe { 0%,100%{ transform:scale(1); filter:brightness(1); } 50%{ transform:scale(1.05); filter:brightness(1.15); } }
        @keyframes coreSwirl { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes coreSwirlRev { from{transform:rotate(360deg)} to{transform:rotate(0deg)} }
        @keyframes waveBounce { 0%,100%{ transform:scaleY(0.3); } 50%{ transform:scaleY(1); } }
        @keyframes floatParticle { 0%{ transform:translateY(0) translateX(0); opacity:0; } 10%{opacity:0.7;} 90%{opacity:0.4;} 100%{ transform:translateY(-120px) translateX(20px); opacity:0; } }

        @keyframes straightCycling {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .straight-cycling-container {
          overflow: hidden;
          position: relative;
          width: 100%;
          padding: 10px 0;
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }

        .straight-cycling-track {
          display: flex;
          gap: 16px;
          width: max-content;
          animation: straightCycling 40s linear infinite;
        }

        .straight-cycling-track:hover {
          animation-play-state: paused;
        }

        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:2px; }
        input::placeholder { color:#334155; }
        textarea { outline:none; }
        @media (prefers-reduced-motion: reduce) {
          .straight-cycling-track { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── Ambient particles (pure decorative motion behind hero) ───────────────────
function Particles() {
  const particles = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: Math.round(Math.random() * 100),
    top: 40 + Math.round(Math.random() * 50),
    delay: Math.round(Math.random() * 10),
    duration: 12 + Math.round(Math.random() * 10),
    size: 1 + Math.round(Math.random() * 2),
  })), []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.left}%`, top: `${p.top}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: "rgba(129,140,248,0.6)", boxShadow: "0 0 6px rgba(129,140,248,0.8)",
          animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Deadline Timer ────────────────────────────────────────────────────────────
function useDeadlineTimer() {
  const [state, setState] = useState({ countdown: "", clock: "" });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const istEnd = new Date(istDate);
      istEnd.setHours(23, 59, 59, 0);
      const diff = istEnd.getTime() - istDate.getTime();
      const h = Math.max(0, Math.floor(diff / 3600000));
      const m = Math.max(0, Math.floor((diff % 3600000) / 60000));
      const sec = Math.max(0, Math.floor((diff % 60000) / 1000));
      setState({
        countdown: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`,
        clock: istDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return state;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root:{ display:"flex", minHeight:"100vh", fontFamily:"'DM Sans','Segoe UI',sans-serif", position:"relative", overflow:"hidden" },
  bg:{ position:"fixed", inset:0, background:"linear-gradient(135deg,#020818 0%,#060f22 50%,#02091a 100%)", zIndex:0 },
  bgGrid:{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px)", backgroundSize:"48px 48px", zIndex:0 },
  bgGlow1:{ position:"fixed", top:"-20%", left:"-10%", width:"600px", height:"600px", borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)", zIndex:0, pointerEvents:"none" },
  bgGlow2:{ position:"fixed", bottom:"-20%", right:"-10%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)", zIndex:0, pointerEvents:"none" },
  sidebar:{ position:"fixed", left:0, top:0, bottom:0, width:"220px", background:"rgba(6,15,34,0.95)", backdropFilter:"blur(20px)", borderRight:"1px solid rgba(255,255,255,0.05)", display:"flex", flexDirection:"column", zIndex:10, padding:"0 0 20px" },
  sidebarLogo:{ display:"flex", alignItems:"center", gap:"10px", padding:"22px 20px 18px" },
  sidebarLogoMark:{ width:"34px", height:"34px", borderRadius:"10px", background:"linear-gradient(135deg,#818cf8,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"white", fontFamily:"'Rajdhani',sans-serif", fontSize:"1.1rem" },
  sidebarLogoText:{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1.05rem", fontWeight:700, color:"white", letterSpacing:"0.02em" },
  sidebarLogoSub:{ fontSize:"0.62rem", color:"#475569" },
  nav:{ flex:1, display:"flex", flexDirection:"column", gap:"2px", padding:"8px 12px", overflowY:"auto" },
  navItem:{ position:"relative", display:"flex", alignItems:"center", gap:"10px", padding:"9px 12px", borderRadius:"10px", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", transition:"all .2s", textAlign:"left", width:"100%" },
  navItemActive:{ background:"rgba(99,102,241,0.12)", color:"white" },
  navActiveDot:{ position:"absolute", right:"10px", width:"6px", height:"6px", borderRadius:"50%", background:"#6366f1" },
  sidebarFooter:{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.05)" },
  sidebarUser:{ flex:1, display:"flex", alignItems:"center", gap:"8px" },
  avatarSmall:{ width:"28px", height:"28px", borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#3b82f6)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:700 },
  main:{ marginLeft:"220px", flex:1, padding:"0 32px 0", position:"relative", zIndex:1, maxWidth:"calc(100vw - 220px)", overflowX:"hidden" },
  topbar:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 0 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", marginBottom:"10px" },
  searchWrap:{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"10px", padding:"8px 14px", width:"260px" },
  searchInput:{ background:"none", border:"none", outline:"none", color:"#94a3b8", fontSize:"0.85rem", width:"100%", fontFamily:"inherit" },
  topbarRight:{ display:"flex", alignItems:"center", gap:"12px" },
  statusPill:{ display:"flex", alignItems:"center", gap:"6px", padding:"5px 12px", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"20px", fontSize:"0.72rem", color:"#22c55e", fontWeight:600 },
  statusDot:{ width:"6px", height:"6px", borderRadius:"50%", background:"#22c55e", animation:"livePulse 1.5s ease-in-out infinite" },
  clock:{ fontFamily:"'Rajdhani',monospace", fontSize:"0.9rem", color:"#94a3b8", fontWeight:600 },
  iconBtn:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px", padding:"7px", color:"#64748b", cursor:"pointer", display:"flex" },
  avatarMed:{ width:"34px", height:"34px", borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#3b82f6)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", fontWeight:700, cursor:"pointer" },

  // Hero
  heroWrap:{ display:"grid", gridTemplateColumns:"1fr 340px", gap:"20px", alignItems:"center", minHeight:"400px", padding:"12px 0 20px" },
  heroLeft:{ display:"flex", flexDirection:"column", gap:"16px" },
  heroGreetTag:{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:"20px", padding:"4px 12px", fontSize:"0.7rem", color:"#818cf8", fontWeight:600, letterSpacing:"0.03em", width:"fit-content" },
  heroStatRow:{ display:"flex", gap:"12px", marginTop:"4px" },
  heroStat:{ flex:1, display:"flex", alignItems:"center", gap:"8px", padding:"10px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px", fontSize: "0.8rem" },
  heroStatVal:{ fontWeight:700, color:"white", fontFamily:"'Rajdhani',monospace" },
  heroStatLabel:{ color:"#475569" },

  orbitWrap:{ position:"relative", width:"100%", height:"460px", display:"flex", alignItems:"center", justifyContent:"center" },
  orbitRing:{ ["--orbit-r" as any]:"180px", position:"absolute", width:0, height:0, top:"50%", left:"50%" },
  agentNode:{ width:"52px", height:"52px", borderRadius:"50%", background:"rgba(6,15,34,0.9)", border:"1.5px solid", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"box-shadow .3s ease", backdropFilter:"blur(6px)" },
  agentLabelWrap:{ position:"absolute", top:"58px", left:"50%", transform:"translateX(-50%)", width:"140px", textAlign:"center" as const, pointerEvents:"none" },
  agentLabel:{ fontSize:"0.74rem", fontWeight:700, whiteSpace:"nowrap" as const },
  agentStatus:{ fontSize:"0.65rem", color:"#64748b", marginTop:"2px" },

  orbCore:{ position:"relative", width:"140px", height:"140px", borderRadius:"50%", border:"none", cursor:"pointer", background:"radial-gradient(circle at 35% 30%, rgba(129,140,248,0.5), rgba(34,211,238,0.25) 45%, rgba(6,15,34,0.9) 75%)", boxShadow:"0 0 60px rgba(99,102,241,0.45), 0 0 120px rgba(34,211,238,0.15)", animation:"breathe 4.5s ease-in-out infinite", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 },
  orbRingOuter:{ position:"absolute", inset:"-18px", borderRadius:"50%", border:"1px solid rgba(129,140,248,0.25)", borderTopColor:"rgba(34,211,238,0.5)", animation:"coreSwirl 12s linear infinite" },
  orbRingInner:{ position:"absolute", inset:"-34px", borderRadius:"50%", border:"1px solid rgba(99,102,241,0.12)", borderBottomColor:"rgba(129,140,248,0.35)", animation:"coreSwirlRev 18s linear infinite" },
  orbGlow:{ position:"absolute", inset:0, borderRadius:"50%", boxShadow:"inset 0 0 40px rgba(191,228,255,0.25)" },
  orbFace:{ width:"64px", height:"64px", position:"relative", zIndex:2 },
  orbWave:{ position:"absolute", bottom:"20px", display:"flex", alignItems:"center", gap:"3px", zIndex:3 },
  orbWaveBar:{ width:"3px", height:"14px", borderRadius:"2px", background:"#bfe4ff", animation:"waveBounce 0.6s ease-in-out infinite" },
  orbCaption:{ position:"absolute", bottom:"6px", left:"50%", transform:"translateX(-50%)", textAlign:"center" as const },
  orbCaptionTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1rem", fontWeight:700, color:"white" },
  orbCaptionSub:{ fontSize:"0.7rem", color:"#475569", marginTop:"2px" },

  // Nova Panel
  novaPanel:{ display:"flex", flexDirection:"column", gap:"10px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"18px", padding:"16px", backdropFilter:"blur(14px)", maxHeight:"420px" },
  novaHeader:{ display:"flex", alignItems:"center", gap:"10px" },
  novaAvatar:{ width:"36px", height:"36px", borderRadius:"50%", background:"radial-gradient(circle at 35% 30%, rgba(129,140,248,0.6), rgba(6,15,34,0.9) 70%)", border:"1px solid rgba(129,140,248,0.4)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  novaName:{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1rem", fontWeight:700, color:"white" },
  novaSub:{ fontSize:"0.68rem", color:"#475569" },
  novaMicBtn:{ marginLeft:"auto", width:"30px", height:"30px", borderRadius:"50%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 },
  novaCard:{ padding:"12px 14px", background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:"12px" },
  novaCardText:{ fontSize:"0.8rem", color:"#cbd5e1", lineHeight:1.55 },
  novaPrimaryBtn:{ flex:1, padding:"8px 12px", background:"linear-gradient(135deg,#6366f1,#818cf8)", border:"none", borderRadius:"8px", color:"white", fontSize:"0.76rem", fontWeight:700, cursor:"pointer" },
  novaGhostBtn:{ padding:"8px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"8px", color:"#64748b", fontSize:"0.76rem", cursor:"pointer" },
  novaChat:{ flex:1, minHeight:"70px", maxHeight:"120px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"6px" },
  novaEmpty:{ fontSize:"0.74rem", color:"#334155", padding:"8px 4px", lineHeight:1.5 },
  novaBubble:{ fontSize:"0.78rem", padding:"8px 11px", borderRadius:"10px", lineHeight:1.5, maxWidth:"92%" },
  novaBubbleUser:{ background:"rgba(99,102,241,0.15)", color:"#e0e7ff", alignSelf:"flex-end" },
  novaBubbleNova:{ background:"rgba(255,255,255,0.04)", color:"#94a3b8", alignSelf:"flex-start" },
  novaInputRow:{ display:"flex", gap:"6px" },
  novaInput:{ flex:1, padding:"8px 12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"9px", color:"white", fontSize:"0.78rem", outline:"none", fontFamily:"inherit" },
  novaSendBtn:{ width:"34px", height:"34px", borderRadius:"9px", background:"rgba(99,102,241,0.18)", border:"1px solid rgba(99,102,241,0.3)", color:"#a5b4fc", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 },
  novaActivityHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"0.72rem", color:"#475569", fontWeight:700, marginTop:"4px", paddingTop:"10px", borderTop:"1px solid rgba(255,255,255,0.05)" },
  novaActivityLive:{ color:"#22c55e", fontWeight:600, fontSize:"0.68rem" },
  novaActivityList:{ display:"flex", flexDirection:"column", gap:"6px", maxHeight:"100px", overflowY:"auto" },
  novaActivityItem:{ display:"flex", alignItems:"center", gap:"8px" },
  novaActivityIcon:{ width:"24px", height:"24px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", fontWeight:700, flexShrink:0 },
  novaActivityText:{ fontSize:"0.72rem", color:"#64748b", lineHeight:1.4 },

  section:{ marginBottom:"24px" },
  twoCol:{ display:"flex", gap:"20px", marginBottom:"24px" },
  card:{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"18px", padding:"24px", backdropFilter:"blur(10px)", transition:"border-color .2s" },
  cardHeader:{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"20px" },
  cardTitleWrap:{ display:"flex", alignItems:"center", gap:"12px" },
  cardIcon:{ width:"38px", height:"38px", borderRadius:"10px", background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  cardTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1.15rem", fontWeight:700, color:"white", margin:"0 0 2px" },
  cardSub:{ fontSize:"0.77rem", color:"#475569", margin:0 },
  regenBtn:{ display:"flex", alignItems:"center", gap:"6px", padding:"7px 14px", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:"8px", color:"#818cf8", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const },
  insightBody:{ display:"flex", gap:"12px" },
  insightAvatar:{ width:"36px", height:"36px", borderRadius:"50%", background:"linear-gradient(135deg,rgba(99,102,241,0.3),rgba(59,130,246,0.2))", border:"1px solid rgba(99,102,241,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, animation:"orbPulse 3s ease-in-out infinite" },
  insightBubble:{ flex:1, background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.12)", borderRadius:"14px", padding:"14px 16px" },
  insightText:{ fontSize:"0.87rem", color:"#94a3b8", lineHeight:1.7, margin:0 },
  taskListWrap:{ display:"flex", flexDirection:"column" as const, gap:"8px", marginBottom:"16px" },
  emptyState:{ padding:"16px", background:"rgba(99,102,241,0.04)", border:"1px solid rgba(99,102,241,0.1)", borderRadius:"10px", fontSize:"0.82rem", color:"#475569", textAlign:"center" as const },
  livePill:{ display:"flex", alignItems:"center", gap:"6px", padding:"4px 10px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"20px", fontSize:"0.72rem", color:"#22c55e", fontWeight:600 },
  liveDot:{ width:"6px", height:"6px", borderRadius:"50%", background:"#22c55e", animation:"livePulse 1.5s ease-in-out infinite" },
  footerNote:{ display:"flex", alignItems:"center", gap:"8px", justifyContent:"center", padding:"18px 0", fontSize:"0.75rem", color:"#334155" },
  footerDot:{ width:"6px", height:"6px", borderRadius:"50%", background:"#22c55e" },
};

const pa: Record<string, React.CSSProperties> = {
  banner:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:"12px", cursor:"pointer", transition:"all .2s", marginTop:"4px" },
  bannerLeft:{ display:"flex", alignItems:"center", gap:"10px" },
  bannerTitle:{ fontSize:"0.88rem", fontWeight:700, color:"white" },
  bannerSub:{ fontSize:"0.72rem", color:"#64748b", marginTop:"1px" },
  bannerRight:{ display:"flex", alignItems:"center", gap:"10px" },
  aiBadge:{ fontSize:"0.65rem", padding:"2px 8px", borderRadius:"10px", background:"rgba(99,102,241,0.12)", color:"#818cf8", fontWeight:600 },
};

const st: Record<string, React.CSSProperties> = {
  taskCard:{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px", padding:"10px 12px", cursor:"pointer", transition:"all .2s" },
  taskCardDone:{ background:"rgba(34,197,94,0.04)", borderColor:"rgba(34,197,94,0.12)" },
  taskHeader:{ display:"flex", alignItems:"center", gap:"10px" },
  checkWrap:{ flexShrink:0 },
  taskTitle:{ fontSize:"0.84rem", fontWeight:500, color:"white" },
};

const feed: Record<string, React.CSSProperties> = {
  grid:{ display:"flex", flexDirection:"column" as const, gap:"8px", marginBottom:"16px" },
  item:{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"12px", transition:"all .2s" },
  avatar:{ width:"32px", height:"32px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.78rem", fontWeight:700, flexShrink:0 },
  body:{ flex:1, fontSize:"0.83rem", color:"#94a3b8", lineHeight:1.4 },
  userName:{ fontWeight:700, color:"white" },
  action:{ color:"#64748b" },
  typeBadge:{ fontSize:"0.75rem", padding:"2px 7px", borderRadius:"8px", fontWeight:700, flexShrink:0 },
  time:{ fontSize:"0.7rem", color:"#334155", flexShrink:0 },
  footer:{ display:"flex", gap:"10px", paddingTop:"12px", borderTop:"1px solid rgba(255,255,255,0.05)" },
  footerBtn:{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 16px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px", color:"#64748b", fontSize:"0.78rem", fontWeight:600, cursor:"pointer" },
};
