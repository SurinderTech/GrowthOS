"use client";
// app/dashboard/growth-plan/page.tsx
// GrowthOS — Growth Plan: Personal Execution Roadmap

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Target, Play, BarChart2, Trophy, BookOpen,
  Users, Settings, LogOut, Bell, Search, ChevronRight, Lock,
  CheckCircle2, Circle, Zap, Star, TrendingUp, Flame, Clock,
  AlertTriangle, ArrowRight, GitBranch, Sparkles, RefreshCw,
  Award, Shield, Brain, Activity, BarChart, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  xp: number;
  difficulty: "easy" | "medium" | "hard";
  completed: boolean;
  type: "challenge" | "revision" | "build" | "mcq" | "reading";
}

interface Phase {
  id: number;
  label: string;
  theme: string;
  status: "locked" | "active" | "completed";
  progress: number;
  skills: { name: string; level: "Beginner" | "Intermediate" | "Advanced"; progress: number }[];
  tasks: Task[];
  milestone: string;
  milestoneReward: string;
  xpTotal: number;
  xpEarned: number;
}

interface WeekDay { day: string; done: number; total: number; }

// ── Mock Data (replaced by API when backend ready) ────────────────────────────
const MOCK_PLAN = {
  goal: "Crack JEE 2026",
  goalIcon: "🎯",
  category: "Competitive Exam",
  timeline: "6 months",
  startDate: "Jan 2026",
  targetDate: "Jun 2026",
  overallProgress: 34,
  currentPhase: 2,
  streak: 7,
  totalXP: 2840,
  rank: 42,
  smartMessage: { type: "warning" as const, text: "You skipped yesterday's task. Get back on track to protect your 7-day streak." },
  weeklyGraph: [
    { day: "Mon", done: 3, total: 4 },
    { day: "Tue", done: 4, total: 4 },
    { day: "Wed", done: 2, total: 4 },
    { day: "Thu", done: 0, total: 4 },
    { day: "Fri", done: 1, total: 4 },
    { day: "Sat", done: 3, total: 4 },
    { day: "Sun", done: 0, total: 4 },
  ] as WeekDay[],
  phases: [
    {
      id: 1,
      label: "Phase 1",
      theme: "Foundation",
      status: "completed" as const,
      progress: 100,
      skills: [
        { name: "Mathematics Basics", level: "Intermediate" as const, progress: 100 },
        { name: "Physics Fundamentals", level: "Intermediate" as const, progress: 100 },
        { name: "Chemistry Basics", level: "Beginner" as const, progress: 90 },
      ],
      tasks: [
        { id: "t1", title: "Complete Class 11 Maths syllabus review", xp: 50, difficulty: "medium" as const, completed: true, type: "revision" as const },
        { id: "t2", title: "Solve 100 foundation-level MCQs", xp: 80, difficulty: "easy" as const, completed: true, type: "mcq" as const },
        { id: "t3", title: "Finish Physics chapters 1–5", xp: 60, difficulty: "medium" as const, completed: true, type: "reading" as const },
        { id: "t4", title: "Complete NCERT Chemistry Part 1", xp: 70, difficulty: "easy" as const, completed: true, type: "reading" as const },
      ],
      milestone: "Foundation Complete",
      milestoneReward: "🏅 Foundation Badge + 200 XP",
      xpTotal: 260,
      xpEarned: 260,
    },
    {
      id: 2,
      label: "Phase 2",
      theme: "Intermediate",
      status: "active" as const,
      progress: 45,
      skills: [
        { name: "Calculus & Integration", level: "Intermediate" as const, progress: 55 },
        { name: "Electrostatics", level: "Beginner" as const, progress: 40 },
        { name: "Organic Chemistry", level: "Beginner" as const, progress: 30 },
        { name: "Coordinate Geometry", level: "Intermediate" as const, progress: 60 },
      ],
      tasks: [
        { id: "t5", title: "Master integration techniques (20 problems)", xp: 100, difficulty: "hard" as const, completed: true, type: "challenge" as const },
        { id: "t6", title: "Solve 50 Electrostatics MCQs", xp: 80, difficulty: "medium" as const, completed: true, type: "mcq" as const },
        { id: "t7", title: "Organic reactions — reaction mechanisms", xp: 90, difficulty: "hard" as const, completed: false, type: "revision" as const },
        { id: "t8", title: "Complete coordinate geometry problem set", xp: 85, difficulty: "medium" as const, completed: false, type: "challenge" as const },
        { id: "t9", title: "Full-length mock test (Paper 1)", xp: 150, difficulty: "hard" as const, completed: false, type: "challenge" as const },
      ],
      milestone: "Intermediate Mastery",
      milestoneReward: "⚡ Speed Badge + 500 XP + AI Analytics Unlock",
      xpTotal: 505,
      xpEarned: 180,
    },
    {
      id: 3,
      label: "Phase 3",
      theme: "Advanced",
      status: "locked" as const,
      progress: 0,
      skills: [
        { name: "Differential Equations", level: "Advanced" as const, progress: 0 },
        { name: "Nuclear Physics", level: "Advanced" as const, progress: 0 },
        { name: "Inorganic Chemistry", level: "Intermediate" as const, progress: 0 },
        { name: "3D Geometry", level: "Advanced" as const, progress: 0 },
      ],
      tasks: [
        { id: "t10", title: "Differential equations — 30 problems", xp: 120, difficulty: "hard" as const, completed: false, type: "challenge" as const },
        { id: "t11", title: "JEE Advanced 2024 paper analysis", xp: 100, difficulty: "hard" as const, completed: false, type: "revision" as const },
        { id: "t12", title: "Full mock test series (5 papers)", xp: 300, difficulty: "hard" as const, completed: false, type: "challenge" as const },
        { id: "t13", title: "Weak topic elimination sprint", xp: 150, difficulty: "hard" as const, completed: false, type: "challenge" as const },
      ],
      milestone: "Advanced Cleared",
      milestoneReward: "🔥 Elite Badge + 1000 XP + Custom AI Roadmap",
      xpTotal: 670,
      xpEarned: 0,
    },
    {
      id: 4,
      label: "Phase 4",
      theme: "Mastery",
      status: "locked" as const,
      progress: 0,
      skills: [
        { name: "Full Syllabus Revision", level: "Advanced" as const, progress: 0 },
        { name: "Speed & Accuracy", level: "Advanced" as const, progress: 0 },
        { name: "Exam Strategy", level: "Advanced" as const, progress: 0 },
      ],
      tasks: [
        { id: "t14", title: "Complete 10 full-length JEE mock tests", xp: 400, difficulty: "hard" as const, completed: false, type: "challenge" as const },
        { id: "t15", title: "Error analysis & weak topic sprint", xp: 200, difficulty: "hard" as const, completed: false, type: "revision" as const },
        { id: "t16", title: "Speed drills — 100 MCQs in 60 min", xp: 250, difficulty: "hard" as const, completed: false, type: "mcq" as const },
      ],
      milestone: "JEE Ready",
      milestoneReward: "👑 Champion Badge + 2000 XP + Priority Mentorship",
      xpTotal: 850,
      xpEarned: 0,
    },
  ] as Phase[],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : ""; }
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function Skeleton({ w = "100%", h = "13px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.06)", animation: "pulse 1.6s ease-in-out infinite" }} />;
}

const diffColor = { easy: "#22c55e", medium: "#f59e0b", hard: "#ef4444" };
const taskTypeIcon = { challenge: "⚡", revision: "📖", build: "🔨", mcq: "📝", reading: "📚" };

// ─────────────────────────────────────────────────────────────────────────────
export default function GrowthPlanPage() {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [plan, setPlan]           = useState(MOCK_PLAN);
  const [loading, setLoading]     = useState(true);
  const [expandedPhase, setExpandedPhase] = useState<number>(2); // active phase open by default
  const [tasks, setTasks]         = useState<Record<number, Task[]>>({});
  const [userName, setUserName]   = useState("");
  const [avatar, setAvatar]       = useState("U");

  useEffect(() => {
    // Try to load real data from backend
    fetch(`${API}/growth-plan/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d?.goal) setPlan(d); })
      .catch(() => {}) // falls back to mock
      .finally(() => setLoading(false));

    fetch(`${API}/dashboard/`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d?.user_name) { setUserName(d.user_name); setAvatar(d.user_name[0].toUpperCase()); } })
      .catch(() => {});

    // Init tasks from plan
    const t: Record<number, Task[]> = {};
    MOCK_PLAN.phases.forEach(p => { t[p.id] = p.tasks; });
    setTasks(t);
    setLoading(false);
  }, []);

  const toggleTask = async (phaseId: number, taskId: string) => {
    setTasks(prev => ({
      ...prev,
      [phaseId]: prev[phaseId].map(t => t.id === taskId ? { ...t, completed: !t.completed } : t),
    }));
    await fetch(`${API}/growth-plan/task/${taskId}/toggle`, {
      method: "POST", headers: { Authorization: `Bearer ${getToken()}` },
    }).catch(() => {});
  };

  const completedCount = (phaseId: number) =>
    (tasks[phaseId] || MOCK_PLAN.phases.find(p => p.id === phaseId)?.tasks || []).filter(t => t.completed).length;

  const totalCount = (phaseId: number) =>
    (tasks[phaseId] || MOCK_PLAN.phases.find(p => p.id === phaseId)?.tasks || []).length;

  const activePhase = plan.phases.find(p => p.status === "active");

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const rawName = (user as any)?.full_name || (user as any)?.name || userName || (typeof window !== "undefined" ? localStorage.getItem("user_name") : "") || "User";
  const currentUser = mounted ? (rawName.includes("@") ? rawName.split("@")[0] : rawName) : "User";
  const avatarInitials = mounted && currentUser && currentUser !== "User" ? currentUser.slice(0, 2).toUpperCase() : "US";
  const userAvatarUrl = (user as any)?.avatar_url || (user as any)?.image || null;

  return (
    <div style={s.root}>
      {/* Background layers */}
      <div style={s.bg} />
      <div style={s.bgGrid} />
      <div style={s.bgGlow1} />
      <div style={s.bgGlow2} />
      <div style={s.bgGlow3} />

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={{ padding: "0 4px 24px" }}>
          <BrandLogo size="md" />
        </div>
        <nav style={s.nav}>
          {[
            { icon: <LayoutDashboard size={18}/>, label: "Dashboard",     href: "/dashboard", active: false },
            { icon: <Play size={18}/>,            label: "Practice Arena",href: "/dashboard/practice", active: false },
            { icon: <BarChart2 size={18}/>,       label: "Leaderboard",   href: "/dashboard/leaderboard", active: false },
            { icon: <Trophy size={18}/>,          label: "Challenges",    href: "/dashboard/challenges", active: false },
            { icon: <Users size={18}/>,           label: "Community",     href: "/dashboard/community", active: false },
            { icon: <Settings size={18}/>,        label: "Settings",      href: "/dashboard/settings", active: false },
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
          <button style={s.logoutBtn} onClick={() => logout && logout()} title="Log Out"><LogOut size={15} /></button>
        </div>
      </aside>

      {/* Main content */}
      <main style={s.main}>

        {/* Topbar */}
        <div style={s.topbar}>
          <div style={s.searchWrap}>
            <Search size={15} style={{ color: "#475569" }} />
            <input placeholder="Search plan, skills, tasks..." style={s.searchInput} />
          </div>
          <div style={s.topbarRight}>
            <button style={s.iconBtn}><Bell size={18} /></button>
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

        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />

        {/* ── HERO: GOAL HEADER ── */}
        <div style={s.heroWrap}>
          <div style={s.heroLeft}>
            <div style={s.goalTag}>
              <Target size={12} style={{ color: "#6366f1" }} />
              <span>Your Growth Plan</span>
            </div>
            <div style={s.goalRow}>
              <span style={s.goalIcon}>{plan.goalIcon}</span>
              <h1 style={s.goalTitle}>{plan.goal}</h1>
            </div>
            <div style={s.goalMeta}>
              <span style={s.metaBadge}><Clock size={11}/> {plan.timeline}</span>
              <span style={s.metaBadge}><GitBranch size={11}/> {plan.startDate} → {plan.targetDate}</span>
              <span style={s.metaBadge}><Star size={11}/> {plan.category}</span>
            </div>
            <div style={s.heroProgress}>
              <div style={s.heroProgressTop}>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Overall Progress</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#6366f1" }}>{plan.overallProgress}%</span>
              </div>
              <div style={s.heroProgressBar}>
                <div style={{ ...s.heroProgressFill, width: `${plan.overallProgress}%` }} />
                <div style={{ ...s.heroProgressGlow, left: `${plan.overallProgress}%` }} />
              </div>
            </div>
          </div>

          {/* Stats cluster */}
          <div style={s.heroStats}>
            <div style={s.statCard}>
              <div style={s.statIcon}><Flame size={16} style={{ color: "#f97316" }} /></div>
              <div style={s.statNum}>{plan.streak}</div>
              <div style={s.statLabel}>Day Streak</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statIcon}><Zap size={16} style={{ color: "#f59e0b" }} /></div>
              <div style={s.statNum}>{plan?.totalXP?.toLocaleString?.() || "0"}</div>
              <div style={s.statLabel}>Total XP</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statIcon}><Trophy size={16} style={{ color: "#6366f1" }} /></div>
              <div style={s.statNum}>#{plan.rank}</div>
              <div style={s.statLabel}>Rank</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statIcon}><Target size={16} style={{ color: "#22c55e" }} /></div>
              <div style={s.statNum}>Phase {plan.currentPhase}</div>
              <div style={s.statLabel}>Current</div>
            </div>
          </div>
        </div>

        {/* ── SMART ALERT + WEEKLY GRAPH ── */}
        <div style={s.twoCol}>

          {/* Smart message */}
          <div style={{ ...s.smartCard, borderColor: plan.smartMessage.type === "warning" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ ...s.smartIcon, background: plan.smartMessage.type === "warning" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)" }}>
                {plan.smartMessage.type === "warning"
                  ? <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
                  : <CheckCircle2 size={16} style={{ color: "#22c55e" }} />}
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: plan.smartMessage.type === "warning" ? "#f59e0b" : "#22c55e", marginBottom: "4px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  AI Coach
                </div>
                <div style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.6 }}>{plan.smartMessage.text}</div>
              </div>
            </div>
            <Link href="/dashboard/challenges" style={{ textDecoration: "none" }}>
              <button style={s.goTodayBtn}>
                <Zap size={13} /> Go to Today's Challenge
              </button>
            </Link>
          </div>

          {/* Weekly graph */}
          <div style={s.weekCard}>
            <div style={s.weekHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart size={16} style={{ color: "#6366f1" }} />
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "white" }}>Weekly Progress</span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#475569" }}>Tasks completed / day</span>
            </div>
            <div style={s.weekGraph}>
              {plan.weeklyGraph.map((d, i) => {
                const pct = d.total > 0 ? (d.done / d.total) * 100 : 0;
                const isToday = i === new Date().getDay() - 1;
                return (
                  <div key={d.day} style={s.weekBar}>
                    <div style={s.weekBarTrack}>
                      <div style={{
                        ...s.weekBarFill,
                        height: `${pct}%`,
                        background: d.done === 0 ? "rgba(239,68,68,0.3)" : isToday ? "#6366f1" : "rgba(99,102,241,0.5)",
                        boxShadow: isToday ? "0 0 8px rgba(99,102,241,0.6)" : "none",
                      }} />
                    </div>
                    <div style={{ fontSize: "0.65rem", color: isToday ? "#818cf8" : "#334155", fontWeight: isToday ? 700 : 400 }}>{d.day}</div>
                    <div style={{ fontSize: "0.6rem", color: d.done === 0 ? "#ef4444" : "#475569" }}>{d.done}/{d.total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── WHAT TO DO NOW BANNER ── */}
        {activePhase && (
          <div style={s.nowBanner}>
            <div style={s.nowBannerLeft}>
              <div style={s.nowTag}>👉 DO THIS NOW</div>
              <div style={s.nowTitle}>
                {(tasks[activePhase.id] || activePhase.tasks).find(t => !t.completed)?.title || "All current tasks done! 🎉"}
              </div>
              <div style={s.nowMeta}>
                <span style={s.nowPhase}>{activePhase.label}: {activePhase.theme}</span>
                <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                  {completedCount(activePhase.id)}/{totalCount(activePhase.id)} tasks done
                </span>
              </div>
            </div>
            <div style={s.nowRight}>
              <Link href="/dashboard/challenges" style={{ textDecoration: "none" }}>
                <button style={s.nowBtn}><Trophy size={14} /> Go to Challenge <ArrowRight size={13} /></button>
              </Link>
              <Link href="/dashboard/practice" style={{ textDecoration: "none" }}>
                <button style={s.nowBtnSecondary}><Play size={13} /> Practice Arena</button>
              </Link>
            </div>
          </div>
        )}

        {/* ── PHASE ROADMAP ── */}
        <div style={s.sectionHeader}>
          <GitBranch size={18} style={{ color: "#6366f1" }} />
          <h2 style={s.sectionTitle}>Execution Roadmap</h2>
          <span style={s.sectionSub}>4-phase growth path to {plan.goal}</span>
        </div>

        <div style={s.phasesWrap}>
          {/* Vertical connector line */}
          <div style={s.phaseLine} />

          {plan.phases.map((phase, idx) => {
            const phaseTasks = tasks[phase.id] || phase.tasks;
            const done = phaseTasks.filter(t => t.completed).length;
            const total = phaseTasks.length;
            const isExpanded = expandedPhase === phase.id;
            const isLocked = phase.status === "locked";
            const isActive = phase.status === "active";
            const isCompleted = phase.status === "completed";

            return (
              <div key={phase.id} style={{ ...s.phaseCard, ...(isActive ? s.phaseCardActive : isCompleted ? s.phaseCardDone : s.phaseCardLocked) }}>

                {/* Phase dot on timeline */}
                <div style={{ ...s.phaseDot, background: isCompleted ? "#22c55e" : isActive ? "#6366f1" : "#1e293b", border: isActive ? "2px solid #6366f1" : isCompleted ? "2px solid #22c55e" : "2px solid #1e293b", boxShadow: isActive ? "0 0 12px rgba(99,102,241,0.6)" : "none" }}>
                  {isCompleted ? <CheckCircle2 size={14} style={{ color: "#22c55e" }} /> : isActive ? <Zap size={14} style={{ color: "white" }} /> : <Lock size={12} style={{ color: "#334155" }} />}
                </div>

                {/* Phase header */}
                <div style={s.phaseHeader} onClick={() => !isLocked && setExpandedPhase(isExpanded ? -1 : phase.id)}>
                  <div style={s.phaseHeaderLeft}>
                    <div style={s.phaseNumBadge}>
                      <span style={{ ...s.phaseStatus, color: isCompleted ? "#22c55e" : isActive ? "#6366f1" : "#334155" }}>
                        {isCompleted ? "✅ Completed" : isActive ? "⚡ Active" : "🔒 Locked"}
                      </span>
                    </div>
                    <div>
                      <div style={s.phaseTitle}>
                        <span style={{ color: "#64748b", marginRight: "8px" }}>{phase.label}</span>
                        <span style={{ color: "white" }}>{phase.theme}</span>
                        {isActive && <span style={s.activePill}>CURRENT</span>}
                      </div>
                      <div style={s.phaseMeta}>
                        <span>{done}/{total} tasks</span>
                        <span>·</span>
                        <span style={{ color: "#f59e0b" }}>{phase.xpEarned}/{phase.xpTotal} XP</span>
                        <span>·</span>
                        <span>{phase.progress}% done</span>
                      </div>
                    </div>
                  </div>
                  <div style={s.phaseHeaderRight}>
                    <div style={s.phaseProgressWrap}>
                      <div style={s.phaseProgressBar}>
                        <div style={{ ...s.phaseProgressFill, width: `${phase.progress}%`, background: isCompleted ? "#22c55e" : isActive ? "linear-gradient(90deg,#6366f1,#3b82f6)" : "#1e293b" }} />
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "#475569", minWidth: "32px", textAlign: "right" }}>{phase.progress}%</span>
                    </div>
                    {!isLocked && (
                      <div style={{ color: "#334155" }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    )}
                  </div>
                </div>

                {/* LOCKED state */}
                {isLocked && (
                  <div style={s.lockedOverlay}>
                    <Lock size={18} style={{ color: "#334155" }} />
                    <span style={{ fontSize: "0.82rem", color: "#334155" }}>Complete Phase {phase.id - 1} to unlock</span>
                    <div style={s.lockedPreview}>
                      {phase.skills.slice(0, 2).map((sk, i) => (
                        <span key={i} style={s.lockedSkillPill}>{sk.name}</span>
                      ))}
                      <span style={s.lockedSkillPill}>+{phase.skills.length - 2} more</span>
                    </div>
                    {phase.id === 3 && (
                      <div style={s.upgradeNote}>
                        <Lock size={11} style={{ color: "#6366f1" }} />
                        <span>🔒 Upgrade to unlock Smart Planning & Deep Analytics</span>
                      </div>
                    )}
                  </div>
                )}

                {/* EXPANDED content */}
                {isExpanded && !isLocked && (
                  <div style={s.phaseBody}>

                    {/* Skills */}
                    <div style={s.skillsSection}>
                      <div style={s.subHeader}>
                        <Brain size={14} style={{ color: "#6366f1" }} />
                        <span>Skills in this phase</span>
                      </div>
                      <div style={s.skillsList}>
                        {phase.skills.map((sk, i) => (
                          <div key={i} style={s.skillRow}>
                            <div style={s.skillRowLeft}>
                              <span style={s.skillRowName}>{sk.name}</span>
                              <span style={{ ...s.levelBadge, background: sk.level === "Advanced" ? "rgba(239,68,68,0.12)" : sk.level === "Intermediate" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: sk.level === "Advanced" ? "#ef4444" : sk.level === "Intermediate" ? "#f59e0b" : "#22c55e" }}>{sk.level}</span>
                            </div>
                            <div style={s.skillRowBar}>
                              <div style={{ ...s.skillRowFill, width: `${sk.progress}%`, background: sk.progress === 100 ? "#22c55e" : "linear-gradient(90deg,#6366f1,#3b82f6)" }} />
                            </div>
                            <span style={{ fontSize: "0.68rem", color: "#475569", minWidth: "28px", textAlign: "right" }}>{sk.progress}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tasks */}
                    <div style={s.tasksSection}>
                      <div style={s.subHeader}>
                        <Activity size={14} style={{ color: "#22c55e" }} />
                        <span>Tasks ({done}/{total} completed)</span>
                        <div style={s.tasksDoneBar}>
                          <div style={{ ...s.tasksDoneFill, width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div style={s.tasksList}>
                        {phaseTasks.map(task => (
                          <div key={task.id}
                            style={{ ...s.taskRow, ...(task.completed ? s.taskRowDone : {}), ...(isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}) }}
                            onClick={() => isActive && toggleTask(phase.id, task.id)}>
                            <div style={s.taskCheck}>
                              {task.completed
                                ? <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
                                : <Circle size={18} style={{ color: "#334155" }} />}
                            </div>
                            <div style={s.taskRowIcon}>{taskTypeIcon[task.type]}</div>
                            <div style={s.taskRowBody}>
                              <div style={{ ...s.taskRowTitle, ...(task.completed ? { textDecoration: "line-through", opacity: 0.45 } : {}) }}>
                                {task.title}
                              </div>
                              <div style={s.taskRowMeta}>
                                <span style={{ ...s.diffBadge, background: task.difficulty === "hard" ? "rgba(239,68,68,0.12)" : task.difficulty === "medium" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: diffColor[task.difficulty] }}>
                                  {task.difficulty}
                                </span>
                                <span style={s.xpBadge}>+{task.xp} XP</span>
                              </div>
                            </div>
                            {isActive && !task.completed && (
                              <Link href="/dashboard/challenges" style={{ textDecoration: "none" }}>
                                <button style={s.taskBtn} onClick={e => e.stopPropagation()}>
                                  Do it →
                                </button>
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Milestone */}
                    <div style={s.milestoneCard}>
                      <div style={s.milestoneLeft}>
                        <Award size={18} style={{ color: "#f59e0b" }} />
                        <div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "white" }}>Milestone: {phase.milestone}</div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>Reward: {phase.milestoneReward}</div>
                        </div>
                      </div>
                      <div style={{ ...s.milestonePct, color: isCompleted ? "#22c55e" : "#f59e0b" }}>
                        {isCompleted ? "Earned ✓" : `${Math.round((done / total) * 100)}%`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── STREAK IMPACT + COMPLETION STATS ── */}
        <div style={s.twoCol}>
          <div style={s.bottomCard}>
            <div style={s.bottomCardHeader}>
              <Flame size={16} style={{ color: "#f97316" }} />
              <span style={s.bottomCardTitle}>Streak Impact</span>
            </div>
            <div style={s.streakGrid}>
              {[
                { label: "Current Streak", value: `${plan.streak} days`, color: "#f97316" },
                { label: "Best Streak", value: "14 days", color: "#f59e0b" },
                { label: "Tasks This Week", value: `${plan.weeklyGraph.reduce((a, d) => a + d.done, 0)}/${plan.weeklyGraph.reduce((a, d) => a + d.total, 0)}`, color: "#22c55e" },
                { label: "XP This Week", value: "+340", color: "#6366f1" },
              ].map((item, i) => (
                <div key={i} style={s.streakStat}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: "0.68rem", color: "#475569" }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={s.bottomCard}>
            <div style={s.bottomCardHeader}>
              <Shield size={16} style={{ color: "#6366f1" }} />
              <span style={s.bottomCardTitle}>Milestones & Badges</span>
            </div>
            <div style={s.badgeGrid}>
              {[
                { icon: "🏅", label: "Foundation", earned: true },
                { icon: "⚡", label: "Speed", earned: false },
                { icon: "🔥", label: "Elite", earned: false },
                { icon: "👑", label: "Champion", earned: false },
                { icon: "🎯", label: "30-Day Streak", earned: false },
                { icon: "🧠", label: "AI Mentor", earned: false },
              ].map((badge, i) => (
                <div key={i} style={{ ...s.badge, opacity: badge.earned ? 1 : 0.3, filter: badge.earned ? "none" : "grayscale(1)" }}>
                  <div style={s.badgeIcon}>{badge.icon}</div>
                  <div style={s.badgeLabel}>{badge.label}</div>
                  {badge.earned && <div style={s.badgeEarned}>Earned</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── LOCKED FEATURES UPGRADE CARD ── */}
        <div style={s.upgradeCard}>
          <div style={s.upgradeLeft}>
            <div style={s.upgradeLock}><Lock size={20} style={{ color: "#6366f1" }} /></div>
            <div>
              <div style={s.upgradeTitle}>🔒 Unlock Smart Planning</div>
              <div style={s.upgradeSub}>Advanced roadmap customization · AI-generated plans · Deep analytics · Priority mentorship</div>
            </div>
          </div>
          <button style={s.upgradeBtn}>Upgrade to Pro →</button>
        </div>

        <div style={{ height: "40px" }} />
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
        @keyframes glow { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        input::placeholder { color: #334155; }
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root: { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif", position: "relative", overflow: "hidden" },
  bg: { position: "fixed", inset: 0, background: "linear-gradient(135deg,#020818 0%,#060f22 50%,#02091a 100%)", zIndex: 0 },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px)", backgroundSize: "48px 48px", zIndex: 0 },
  bgGlow1: { position: "fixed", top: "-20%", left: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)", zIndex: 0, pointerEvents: "none" },
  bgGlow2: { position: "fixed", bottom: "-20%", right: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)", zIndex: 0, pointerEvents: "none" },
  bgGlow3: { position: "fixed", top: "40%", right: "20%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,0.03) 0%,transparent 70%)", zIndex: 0, pointerEvents: "none" },

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

  main: { marginLeft: "220px", flex: 1, padding: "0 32px 0", position: "relative", zIndex: 1, maxWidth: "calc(100vw - 220px)", overflowX: "hidden" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: "24px" },
  searchWrap: { display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "8px 14px", width: "260px" },
  searchInput: { background: "none", border: "none", outline: "none", color: "#94a3b8", fontSize: "0.85rem", width: "100%", fontFamily: "inherit" },
  topbarRight: { display: "flex", alignItems: "center", gap: "12px" },
  iconBtn: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "7px", color: "#64748b", cursor: "pointer", display: "flex" },
  avatarMed: { width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#3b82f6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" },

  // Hero
  heroWrap: { display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "20px", padding: "28px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", backdropFilter: "blur(10px)" },
  heroLeft: { flex: 1 },
  goalTag: { display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.72rem", color: "#818cf8", fontWeight: 600, marginBottom: "12px", letterSpacing: "0.03em" },
  goalRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" },
  goalIcon: { fontSize: "2rem" },
  goalTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "2rem", fontWeight: 800, color: "white", margin: 0, lineHeight: 1.1 },
  goalMeta: { display: "flex", gap: "8px", flexWrap: "wrap" as const, marginBottom: "18px" },
  metaBadge: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#64748b", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "3px 8px" },
  heroProgress: { maxWidth: "480px" },
  heroProgressTop: { display: "flex", justifyContent: "space-between", marginBottom: "8px" },
  heroProgressBar: { position: "relative", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "visible" },
  heroProgressFill: { position: "absolute", left: 0, top: 0, height: "100%", background: "linear-gradient(90deg,#6366f1,#3b82f6,#06b6d4)", borderRadius: "4px", transition: "width 1s ease", boxShadow: "0 0 10px rgba(99,102,241,0.5)" },
  heroProgressGlow: { position: "absolute", top: "50%", transform: "translate(-50%,-50%)", width: "12px", height: "12px", borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 10px #6366f1", animation: "glow 2s ease-in-out infinite" },
  heroStats: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "220px", flexShrink: 0 },
  statCard: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "4px", padding: "14px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" },
  statIcon: { marginBottom: "2px" },
  statNum: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.2rem", fontWeight: 800, color: "white" },
  statLabel: { fontSize: "0.65rem", color: "#475569", textAlign: "center" as const },

  // Two col
  twoCol: { display: "flex", gap: "16px", marginBottom: "16px" },

  // Smart card
  smartCard: { flex: 1, display: "flex", flexDirection: "column" as const, gap: "14px", padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid", borderRadius: "16px", backdropFilter: "blur(10px)" },
  smartIcon: { width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  goTodayBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(59,130,246,0.15))", border: "1px solid rgba(99,102,241,0.35)", borderRadius: "10px", color: "#a5b4fc", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" as const },

  // Weekly graph
  weekCard: { flex: 1, padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", backdropFilter: "blur(10px)" },
  weekHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  weekGraph: { display: "flex", gap: "6px", alignItems: "flex-end", height: "80px" },
  weekBar: { flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "4px" },
  weekBarTrack: { flex: 1, width: "100%", background: "rgba(255,255,255,0.04)", borderRadius: "4px 4px 0 0", display: "flex", flexDirection: "column-reverse" as const, overflow: "hidden", minHeight: "60px" },
  weekBarFill: { width: "100%", borderRadius: "4px 4px 0 0", transition: "height 0.6s ease", minHeight: "3px" },

  // Now banner
  nowBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(59,130,246,0.08))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "16px", marginBottom: "20px", backdropFilter: "blur(10px)" },
  nowBannerLeft: { flex: 1 },
  nowTag: { display: "inline-block", fontSize: "0.68rem", fontWeight: 800, color: "#6366f1", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", padding: "2px 8px", marginBottom: "6px", letterSpacing: "0.05em" },
  nowTitle: { fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "6px", lineHeight: 1.4 },
  nowMeta: { display: "flex", gap: "12px", alignItems: "center" },
  nowPhase: { fontSize: "0.75rem", color: "#6366f1", fontWeight: 600 },
  nowRight: { display: "flex", gap: "10px", flexShrink: 0 },
  nowBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", background: "linear-gradient(135deg,#6366f1,#3b82f6)", border: "none", borderRadius: "10px", color: "white", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" },
  nowBtnSecondary: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#64748b", fontSize: "0.82rem", cursor: "pointer" },

  // Section header
  sectionHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" },
  sectionTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "white", margin: 0 },
  sectionSub: { fontSize: "0.78rem", color: "#475569", marginLeft: "4px" },

  // Phase roadmap
  phasesWrap: { position: "relative", display: "flex", flexDirection: "column" as const, gap: "12px", marginBottom: "20px", paddingLeft: "32px" },
  phaseLine: { position: "absolute", left: "10px", top: "20px", bottom: "20px", width: "2px", background: "linear-gradient(180deg,#6366f1,rgba(99,102,241,0.1))", zIndex: 0 },
  phaseDot: { position: "absolute", left: "-26px", top: "20px", width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, flexShrink: 0 },

  phaseCard: { position: "relative", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden", transition: "all 0.2s" },
  phaseCardActive: { border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.04)" },
  phaseCardDone: { border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.02)" },
  phaseCardLocked: { border: "1px solid rgba(255,255,255,0.04)", opacity: 0.7 },

  phaseHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", cursor: "pointer" },
  phaseHeaderLeft: { display: "flex", alignItems: "center", gap: "14px" },
  phaseNumBadge: { display: "flex", flexDirection: "column" as const, gap: "2px" },
  phaseStatus: { fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em" },
  phaseTitle: { display: "flex", alignItems: "center", gap: "6px", fontSize: "1rem", fontWeight: 700, marginBottom: "3px" },
  activePill: { fontSize: "0.6rem", fontWeight: 800, color: "#6366f1", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "4px", padding: "1px 6px", letterSpacing: "0.05em" },
  phaseMeta: { display: "flex", gap: "8px", fontSize: "0.72rem", color: "#475569" },
  phaseHeaderRight: { display: "flex", alignItems: "center", gap: "16px" },
  phaseProgressWrap: { display: "flex", alignItems: "center", gap: "8px" },
  phaseProgressBar: { width: "120px", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" },
  phaseProgressFill: { height: "100%", borderRadius: "2px", transition: "width 0.6s ease" },

  // Locked
  lockedOverlay: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "10px", padding: "20px", borderTop: "1px solid rgba(255,255,255,0.04)" },
  lockedPreview: { display: "flex", gap: "6px", flexWrap: "wrap" as const, justifyContent: "center" },
  lockedSkillPill: { fontSize: "0.68rem", color: "#334155", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "2px 8px" },
  upgradeNote: { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "#6366f1", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "8px", padding: "6px 12px" },

  // Phase body
  phaseBody: { padding: "0 20px 20px", display: "flex", flexDirection: "column" as const, gap: "16px", borderTop: "1px solid rgba(255,255,255,0.04)" },
  subHeader: { display: "flex", alignItems: "center", gap: "7px", fontSize: "0.78rem", fontWeight: 700, color: "#64748b", paddingTop: "16px", marginBottom: "10px", letterSpacing: "0.04em" },

  // Skills
  skillsSection: {},
  skillsList: { display: "flex", flexDirection: "column" as const, gap: "8px" },
  skillRow: { display: "flex", alignItems: "center", gap: "10px" },
  skillRowLeft: { display: "flex", alignItems: "center", gap: "8px", minWidth: "220px" },
  skillRowName: { fontSize: "0.83rem", color: "#94a3b8", fontWeight: 500 },
  levelBadge: { fontSize: "0.6rem", fontWeight: 700, padding: "1px 7px", borderRadius: "8px" },
  skillRowBar: { flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" },
  skillRowFill: { height: "100%", borderRadius: "2px", transition: "width 0.6s ease" },

  // Tasks
  tasksSection: {},
  tasksDoneBar: { flex: 1, height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginLeft: "8px" },
  tasksDoneFill: { height: "100%", background: "#22c55e", borderRadius: "2px" },
  tasksList: { display: "flex", flexDirection: "column" as const, gap: "6px" },
  taskRow: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s" },
  taskRowDone: { background: "rgba(34,197,94,0.03)", borderColor: "rgba(34,197,94,0.12)" },
  taskCheck: { flexShrink: 0 },
  taskRowIcon: { fontSize: "0.9rem", flexShrink: 0 },
  taskRowBody: { flex: 1 },
  taskRowTitle: { fontSize: "0.85rem", fontWeight: 500, color: "white", marginBottom: "3px" },
  taskRowMeta: { display: "flex", gap: "6px", alignItems: "center" },
  diffBadge: { fontSize: "0.62rem", fontWeight: 700, padding: "1px 7px", borderRadius: "8px" },
  xpBadge: { fontSize: "0.62rem", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "1px 7px", borderRadius: "8px" },
  taskBtn: { padding: "5px 12px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "7px", color: "#818cf8", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0 },

  // Milestone
  milestoneCard: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "12px" },
  milestoneLeft: { display: "flex", alignItems: "center", gap: "12px" },
  milestonePct: { fontSize: "0.9rem", fontWeight: 800 },

  // Bottom cards
  bottomCard: { flex: 1, padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px" },
  bottomCardHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" },
  bottomCardTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1rem", fontWeight: 700, color: "white" },
  streakGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  streakStat: { padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", textAlign: "center" as const },
  badgeGrid: { display: "flex", gap: "10px", flexWrap: "wrap" as const },
  badge: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "4px", padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", minWidth: "64px", transition: "all 0.2s" },
  badgeIcon: { fontSize: "1.4rem" },
  badgeLabel: { fontSize: "0.6rem", color: "#475569", textAlign: "center" as const, fontWeight: 600 },
  badgeEarned: { fontSize: "0.55rem", color: "#22c55e", fontWeight: 700 },

  // Upgrade
  upgradeCard: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(59,130,246,0.05))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "16px", marginBottom: "16px" },
  upgradeLeft: { display: "flex", alignItems: "center", gap: "16px" },
  upgradeLock: { width: "40px", height: "40px", borderRadius: "10px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  upgradeTitle: { fontSize: "0.95rem", fontWeight: 700, color: "white", marginBottom: "3px" },
  upgradeSub: { fontSize: "0.75rem", color: "#475569" },
  upgradeBtn: { padding: "10px 20px", background: "linear-gradient(135deg,#6366f1,#3b82f6)", border: "none", borderRadius: "10px", color: "white", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const },
};