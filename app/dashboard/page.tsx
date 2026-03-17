"use client";
// app/dashboard/page.tsx
// GrowthOS — All data live from backend. No hardcoded user data shown.

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles, CheckCircle2, Circle, ChevronRight, RefreshCw,
  Zap, Target, BookOpen, Trophy, Users, Rocket, GitBranch,
  Brain, TrendingUp, Clock, Star, ArrowRight, Bot, LayoutDashboard,
  Settings, LogOut, Bell, Search, Flame, Shield, Activity,
  Play, X, BarChart2, Cpu,
} from "lucide-react";
import LoadingScreen from "./LoadingScreen";
import CareerGraph from "./CareerGraph";
import {
  getDashboard,
  getGrowthPlan,
  getSkills,
  getOpportunities,
  getAIInsight,
  getCareerGraph,
  getPracticeStreak,
  type GrowthPlan,
  type Skill,
  type Opportunity,
  type StreakStatus,
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

interface BatchActivity {
  id: string;
  user: string;
  avatar: string;
  action: string;
  time: string;
  type: "mission_completed" | "practice_started" | "practice_completed" | "streak_achieved" | "rank_change";
}

// ── Execution Lab Tab IDs ─────────────────────────────────────────────────────
type LabTab = "path" | "modules" | "projects" | "mentor" | "earn";

const LAB_TABS: { id: LabTab; icon: string; label: string }[] = [
  { id: "path",     icon: "🧠", label: "Skills Path" },
  { id: "modules",  icon: "📚", label: "Modules"     },
  { id: "projects", icon: "⚡", label: "Build"       },
  { id: "mentor",   icon: "🤖", label: "AI Mentor"   },
  { id: "earn",     icon: "💼", label: "Earn"        },
];

// ── Batch Activity — kept as-is ───────────────────────────────────────────────
const MOCK_BATCH_ACTIVITY: BatchActivity[] = [
  { id: "a1", user: "Rahul",  avatar: "R", action: "solved today's coding challenge",     time: "2m ago",  type: "practice_completed" },
  { id: "a2", user: "Aisha",  avatar: "A", action: "moved to Rank #3 on the leaderboard", time: "8m ago",  type: "rank_change" },
  { id: "a3", user: "Dev",    avatar: "D", action: "started a practice session",           time: "15m ago", type: "practice_started" },
  { id: "a4", user: "Riya",   avatar: "R", action: "completed 3 missions today",           time: "22m ago", type: "mission_completed" },
  { id: "a5", user: "Arjun",  avatar: "A", action: "achieved a 7-day streak",              time: "31m ago", type: "streak_achieved" },
  { id: "a6", user: "Priya",  avatar: "P", action: "submitted the weekly challenge",       time: "45m ago", type: "mission_completed" },
];

// ── Fallback empty plan ───────────────────────────────────────────────────────
const EMPTY_PLAN: GrowthPlan = {
  id: "", title: "Your Growth Plan",
  summary: "Click Generate Roadmap to build your personalized plan.",
  generated_at: new Date().toISOString(),
  months: [
    { month: 1, label: "Month 1", theme: "Foundation", progress: 0, milestones: [] },
    { month: 2, label: "Month 2", theme: "Building",   progress: 0, milestones: [] },
    { month: 3, label: "Month 3", theme: "Launch",     progress: 0, milestones: [] },
  ],
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = "13px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.06)", animation: "pulse 1.6s ease-in-out infinite" }} />;
}

// ── Deadline Timer ────────────────────────────────────────────────────────────
function useDeadlineTimer() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // Get current time in India Standard Time
      const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const istEnd = new Date(istDate);
      istEnd.setHours(23, 59, 59, 0);

      const diff = istEnd.getTime() - istDate.getTime();
      if (diff <= 0) { setTimeLeft("00:00:00"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
}

function getGreeting() {
  const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const activityConfig = {
  practice_completed: { color: "#22c55e", icon: "✓" },
  rank_change:        { color: "#f59e0b", icon: "↑" },
  practice_started:   { color: "#3b82f6", icon: "▶" },
  mission_completed:  { color: "#6366f1", icon: "★" },
  streak_achieved:    { color: "#f97316", icon: "🔥" },
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : ""; }

// ── Execution Lab Panel ───────────────────────────────────────────────────────
function ExecutionLabPanel({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<LabTab>("path");
  const [mentorMsg, setMentorMsg] = useState("");
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorReply, setMentorReply] = useState("");
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  const learnPath = (skill as any).learn_path || ["Start with fundamentals", "Practice daily problems", "Build a real project"];
  const platform  = (skill as any).platform || "Online Resources";
  const resourceUrl = (skill as any).resource_url || "#";

  const modules = learnPath.map((step: string, i: number) => ({
    id: i, title: `Module ${i+1}`, desc: step,
    tasks: ["Watch intro video", "Complete 3 exercises", "Mini quiz"],
    duration: `${20 + i*10}min`,
  }));

  const projects = [
    { title: `${skill.name} Starter Project`, desc: "Build a basic working implementation to solidify fundamentals.", difficulty: "Beginner", time: "2-3 hrs" },
    { title: `${skill.name} Real-World App`,   desc: "Build something you'd put in your portfolio. Connects to real APIs or data.", difficulty: "Intermediate", time: "1-2 days" },
    { title: `${skill.name} Challenge`,        desc: "A complex build that stretches your current ability. Ship it on GitHub.", difficulty: "Advanced", time: "3-5 days" },
  ];

  const earnIdeas = [
    { type: "Freelance", icon: "💼", title: `${skill.name} Freelance Gigs`,    desc: `Offer ${skill.name} services on Upwork/Fiverr. Entry rate ₹500–₹2000/hr`, url: "https://www.upwork.com" },
    { type: "Product",   icon: "📦", title: "Build & Sell a Template",          desc: "Create a starter template or boilerplate and sell on Gumroad.",              url: "https://gumroad.com" },
    { type: "Startup",   icon: "🚀", title: "Startup Idea with This Skill",     desc: `What micro-SaaS or tool can you build using ${skill.name} in 2 weeks?`,     url: "#" },
  ];

  const askMentor = async () => {
    if (!mentorMsg.trim()) return;
    setMentorLoading(true);
    try {
      const res = await fetch(`${API}/dashboard/ask-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: `About skill "${skill.name}": ${mentorMsg}` }),
      });
      const data = await res.json();
      setMentorReply(data.reply || "Keep pushing — every question you ask is progress.");
    } catch {
      setMentorReply("Mentor temporarily offline. Try: focus on one small task today related to this skill.");
    } finally {
      setMentorLoading(false);
    }
  };

  return (
    <div style={lab.overlay} onClick={onClose}>
      <div style={lab.panel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={lab.header}>
          <div style={lab.headerLeft}>
            <span style={{ fontSize: "1.8rem" }}>{skill.emoji}</span>
            <div>
              <div style={lab.labTitle}>⚡ Execution Lab — {skill.name}</div>
              <div style={lab.labSub}>{skill.why_relevant}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {resourceUrl !== "#" && (
              <a href={resourceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <button style={lab.startBtn}>Start on {platform} →</button>
              </a>
            )}
            <button style={lab.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={lab.tabRow}>
          {LAB_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ ...lab.tab, ...(activeTab === t.id ? lab.tabActive : {}) }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={lab.content}>

          {/* ── SKILLS PATH ── */}
          {activeTab === "path" && (
            <div style={lab.section}>
              <div style={lab.sectionTitle}>🧠 Your Skills Path for {skill.name}</div>
              <div style={lab.sectionSub}>Follow this sequence to go from {skill.level} → Advanced</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                {learnPath.map((step: string, i: number) => (
                  <div key={i} style={lab.pathItem}>
                    <div style={{ ...lab.pathNum, background: i === 0 ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 0 ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`, color: i === 0 ? "#818cf8" : "#475569" }}>
                      {i+1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "white" }}>{step}</div>
                      {i === 0 && <div style={{ fontSize: "0.7rem", color: "#6366f1", marginTop: "2px" }}>← Start here</div>}
                    </div>
                    {i === 0 && resourceUrl !== "#" && (
                      <a href={resourceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                        <button style={lab.goBtn}>Go →</button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div style={lab.progressCard}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Current Level</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6366f1" }}>{skill.level}</span>
                </div>
                <div style={lab.progressBar}>
                  <div style={{ ...lab.progressFill, width: skill.level === "Beginner" ? "25%" : skill.level === "Intermediate" ? "55%" : skill.level === "Advanced" ? "80%" : "5%" }} />
                </div>
                <div style={{ fontSize: "0.7rem", color: "#334155", marginTop: "6px" }}>
                  Relevance score: <strong style={{ color: "#f59e0b" }}>{skill.relevance_score}%</strong> for your goal
                </div>
              </div>
            </div>
          )}

          {/* ── MODULES ── */}
          {activeTab === "modules" && (
            <div style={lab.section}>
              <div style={lab.sectionTitle}>📚 Micro Modules</div>
              <div style={lab.sectionSub}>Small focused sessions. Complete one module = one step forward.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                {modules.map((mod: any) => (
                  <div key={mod.id} style={{ ...lab.moduleCard, ...(completedModules.has(mod.id) ? lab.moduleCardDone : {}) }}>
                    <div style={lab.moduleHeader}>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: completedModules.has(mod.id) ? "#22c55e" : "white" }}>
                          {completedModules.has(mod.id) ? "✓ " : ""}{mod.title}: {mod.desc}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: "2px" }}>⏱ {mod.duration}</div>
                      </div>
                      <button
                        style={{ ...lab.moduleBtn, ...(completedModules.has(mod.id) ? lab.moduleBtnDone : {}) }}
                        onClick={() => setCompletedModules(prev => { const s = new Set(prev); s.has(mod.id) ? s.delete(mod.id) : s.add(mod.id); return s; })}>
                        {completedModules.has(mod.id) ? "Done ✓" : "Start"}
                      </button>
                    </div>
                    <div style={lab.taskList}>
                      {mod.tasks.map((task: any, ti: number) => (
                        <div key={ti} style={lab.taskChip}>→ {task}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BUILD PROJECTS ── */}
          {activeTab === "projects" && (
            <div style={lab.section}>
              <div style={lab.sectionTitle}>⚡ Real-World Builds</div>
              <div style={lab.sectionSub}>The fastest way to learn is to build something real. Ship it on GitHub.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
                {projects.map((proj, i) => (
                  <div key={i} style={lab.projectCard}>
                    <div style={lab.projectHeader}>
                      <div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "white" }}>{proj.title}</div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px", lineHeight: 1.5 }}>{proj.desc}</div>
                      </div>
                    </div>
                    <div style={lab.projectMeta}>
                      <span style={{ ...lab.diffBadge, background: i === 0 ? "rgba(34,197,94,0.12)" : i === 1 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)", color: i === 0 ? "#22c55e" : i === 1 ? "#f59e0b" : "#ef4444" }}>
                        {proj.difficulty}
                      </span>
                      <span style={lab.timeBadge}>⏱ {proj.time}</span>
                      <button style={lab.buildBtn} onClick={() => window.open("https://github.com", "_blank")}>
                        Build on GitHub →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI MENTOR ── */}
          {activeTab === "mentor" && (
            <div style={lab.section}>
              <div style={lab.sectionTitle}>🤖 AI Mentor</div>
              <div style={lab.sectionSub}>Ask anything about {skill.name}. Get context-specific guidance.</div>
              <div style={{ marginTop: "16px" }}>
                {mentorReply && (
                  <div style={lab.mentorReply}>
                    <div style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 700, marginBottom: "6px" }}>AI Mentor</div>
                    <div style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.65 }}>{mentorReply}</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={mentorMsg}
                    onChange={e => setMentorMsg(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && askMentor()}
                    placeholder={`Ask about ${skill.name}...`}
                    style={lab.mentorInput}
                  />
                  <button style={{ ...lab.mentorSendBtn, opacity: mentorLoading ? 0.6 : 1 }}
                    onClick={askMentor} disabled={mentorLoading}>
                    {mentorLoading ? "..." : "Ask"}
                  </button>
                </div>
                <div style={{ marginTop: "14px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#334155", marginBottom: "8px" }}>Quick questions:</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                    {[
                      `How do I get started with ${skill.name}?`,
                      `What projects should I build first?`,
                      `How long to become job-ready in ${skill.name}?`,
                      `What are the most common mistakes beginners make?`,
                    ].map((q, i) => (
                      <button key={i} style={lab.quickQ} onClick={() => setMentorMsg(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── EARN ── */}
          {activeTab === "earn" && (
            <div style={lab.section}>
              <div style={lab.sectionTitle}>💼 Earn With {skill.name}</div>
              <div style={lab.sectionSub}>Freelance gigs, startup ideas, and income paths using this skill.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                {earnIdeas.map((idea, i) => (
                  <div key={i} style={lab.earnCard}>
                    <div style={lab.earnIcon}>{idea.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "white" }}>{idea.title}</span>
                        <span style={lab.earnType}>{idea.type}</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>{idea.desc}</div>
                    </div>
                    {idea.url !== "#" && (
                      <a href={idea.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                        <button style={lab.earnBtn}>Go →</button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div style={lab.earnNote}>
                💡 Most {skill.name} freelancers start earning within 30–60 days of building their first 2 projects.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [loaded, setLoaded]         = useState(false);

  // Real user data
  const [userName, setUserName]     = useState("");
  const [plan, setPlan]             = useState<GrowthPlan | null>(null);
  const [smartTasks, setSmartTasks]         = useState<SmartTask[]>([]);
  const [smartTasksLoading, setSTLoading]   = useState(true);
  const [expandedTask, setExpandedTask]     = useState<string | null>(null);
  const [taskAnswer, setTaskAnswer]         = useState<Record<string,string>>({});
  const [submittingTask, setSubmittingTask] = useState<string | null>(null);
  const [taskFeedback, setTaskFeedback]     = useState<Record<string,string>>({});
  const [skills, setSkills]         = useState<Skill[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [insight, setInsight]       = useState("");
  const [streakData, setStreakData]  = useState<StreakStatus | null>(null);
  const [missions, setMissions]     = useState<Mission[]>([]);

  // Loading flags
  const [dashLoading, setDashLoading]     = useState(true);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(true);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [streakLoading, setStreakLoading] = useState(true);
  const [oppsLoading, setOppsLoading]     = useState(true);

  // Execution Lab
  const [activeLabSkill, setActiveLabSkill] = useState<Skill | null>(null);

  // Roadmap / UI
  const [regenerating, setRegenerating] = useState(false);
  const [graphNodes, setGraphNodes]     = useState<any[]>([]);
  const [graphEdges, setGraphEdges]     = useState<any[]>([]);
  const [activeMonth, setActiveMonth]   = useState(0);
  const [roadmapState, setRoadmapState] = useState<"empty"|"loading"|"ready">("empty");
  const [loadingStep, setLoadingStep]   = useState(0);

  // Toast
  const [showToast, setShowToast]     = useState(false);
  const [toastMsg, setToastMsg]       = useState("");
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const batchActivity = MOCK_BATCH_ACTIVITY;
  const timeLeft = useDeadlineTimer();

  // ── Fetch all dashboard data ────────────────────────────────────────────────
  useEffect(() => {
    // Dashboard meta
    getDashboard()
      .then(d => { if (d?.user_name) setUserName(d.user_name); })
      .catch(() => {})
      .finally(() => setDashLoading(false));

    // Smart Tasks
    fetch(`${API}/api/tasks/today`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSmartTasks(d); })
      .catch(() => {})
      .finally(() => setSTLoading(false));

    // Skills
    getSkills()
      .then(d => { if (d?.length) setSkills(d); })
      .catch(() => {})
      .finally(() => setSkillsLoading(false));

    // Opportunities
    getOpportunities()
      .then(d => { if (d?.length) setOpportunities(d); })
      .catch(() => {})
      .finally(() => setOppsLoading(false));

    // AI Insight
    getAIInsight()
      .then(d => { if (d?.insight) setInsight(d.insight); })
      .catch(() => {})
      .finally(() => setInsightLoading(false));

    // Growth plan
    getGrowthPlan()
      .then(d => { if (d?.months) setPlan(d); })
      .catch(() => {});

    // Streak
    getPracticeStreak()
      .then(d => setStreakData(d))
      .catch(() => {})
      .finally(() => setStreakLoading(false));

    // Missions
    fetchMissions();
  }, []);

  async function fetchMissions() {
    setMissionsLoading(true);
    try {
      const res = await fetch(`${API}/missions/today`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.missions?.length) setMissions(data.missions);
      }
    } catch {}
    finally { setMissionsLoading(false); }
  }

  // ── Accountability toast ───────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || missionsLoading) return;
    const done = missions.filter(m => m.completed).length;
    if (done === 0 && missions.length > 0) {
      toastTimer.current = setTimeout(() => {
        setToastMsg("You haven't started today's missions yet. Your batch is progressing. Finish before midnight to keep your streak.");
        setShowToast(true);
      }, 5000);
    }
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [loaded, missions, missionsLoading]);

  const handleLoaderDone = useCallback(() => {
    setShowLoader(false);
    setTimeout(() => setLoaded(true), 100);
  }, []);

  const toggleSmartTask = async (taskId: string) => {
    const task = smartTasks.find(t => t.id === taskId);
    if (!task) return;
    setSmartTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    const endpoint = task.completed ? "uncomplete" : "complete";
    await fetch(`${API}/api/tasks/${taskId}/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    }).catch(() => {});
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
      setTaskFeedback(prev => ({ ...prev, [taskId]: data.ai_feedback }));
      setSmartTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
    } catch {}
    finally { setSubmittingTask(null); }
  };

  const toggleMission = async (id: string) => {
    const m = missions.find(x => x.id === id);
    if (!m) return;
    setMissions(prev => prev.map(x => x.id === id ? { ...x, completed: !x.completed } : x));
    try {
      await fetch(`${API}/missions/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ mission_id: id }),
      });
    } catch {
      setMissions(prev => prev.map(x => x.id === id ? { ...x, completed: m.completed } : x));
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const { regeneratePlan } = await import("@/lib/dashboard-api");
      const newPlan = await regeneratePlan();
      if (newPlan?.months) setPlan(newPlan);
    } catch {} finally { setRegenerating(false); }
  };

  // Computed
  const currentPlan       = plan || EMPTY_PLAN;
  const completedMissions = missions.filter(m => m.completed).length;
  const totalMilestones   = currentPlan.months.flatMap(m => m.milestones).length;
  const doneMilestones    = currentPlan.months.flatMap(m => m.milestones).filter(m => m.completed).length;
  const overallProgress   = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;
  const currentStreak     = streakData?.current_streak ?? 0;
  const avatar            = userName ? userName[0].toUpperCase() : "?";

  if (showLoader) return <LoadingScreen onDone={handleLoaderDone} />;

  return (
    <div style={s.root}>
      <div style={s.bg} /><div style={s.bgGrid} /><div style={s.bgGlow1} /><div style={s.bgGlow2} />

      {/* Execution Lab Modal */}
      {activeLabSkill && (
        <ExecutionLabPanel skill={activeLabSkill} onClose={() => setActiveLabSkill(null)} />
      )}

      {/* Toast */}
      {showToast && (
        <div style={s.toast}>
          <div style={s.toastLeft}>
            <div style={s.toastIcon}><Brain size={16} style={{ color: "#6366f1" }} /></div>
            <div>
              <div style={s.toastTitle}>AI Mentor Alert</div>
              <div style={s.toastMsg}>{toastMsg}</div>
            </div>
          </div>
          <button style={s.toastClose} onClick={() => setShowToast(false)}><X size={14} /></button>
        </div>
      )}

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarLogo}>
          <Image src="/images/GrowthOs.png" alt="GrowthOS" width={32} height={32} style={{ borderRadius: "50%" }} />
          <span style={s.sidebarLogoText}>GrowthOS</span>
        </div>
        <nav style={s.nav}>
          {[
            { icon: <LayoutDashboard size={18}/>, label: "Dashboard",      href: "/dashboard",            active: true },
            { icon: <Target size={18}/>,          label: "Growth Plan",    href: "/dashboard/growth-plan" },
            { icon: <Play size={18}/>,            label: "Practice Arena", href: "/dashboard/practice"    },
            { icon: <BarChart2 size={18}/>,       label: "Leaderboard",    href: "/dashboard/leaderboard" },
            { icon: <Trophy size={18}/>,          label: "Challenges",     href: "/dashboard/challenges"  },
            { icon: <BookOpen size={18}/>,        label: "Skills",         href: "/dashboard/skills"      },
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
          <div style={s.sidebarUser}>
            <div style={s.avatarSmall}>{avatar}</div>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>
                {dashLoading ? <Skeleton w="70px" h="11px" /> : userName || "User"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#475569" }}>Pro Plan</div>
            </div>
          </div>
          <button style={s.logoutBtn}><LogOut size={15} /></button>
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
            <button style={s.iconBtn}><Bell size={18} /></button>
            <div style={s.avatarMed}>{avatar}</div>
          </div>
        </div>

        {/* ══ MISSION CONTROL ══════════════════════════════════════════════ */}
        <section style={s.missionControlWrap}>
          <div style={s.missionLeft}>
            <div style={s.mcTag}><Shield size={11} style={{ color: "#6366f1" }} /><span>Mission Control · AI Briefing</span></div>
            <h1 style={s.mcTitle}>
              {getGreeting()},{" "}
              <span style={s.mcName}>{dashLoading ? "..." : (userName || "there")}.</span>
            </h1>
            <h1 style={{ ...s.mcTitle, fontSize: "1.1rem", marginTop: "12px", color: "#94a3b8", fontWeight: 500 }}>
              GrowthOS turns real-life growth into a multiplayer game.
            </h1>
            <h1 style={{ ...s.mcTitle, fontSize: "1.1rem", marginTop: "4px", marginBottom: "16px", color: "#94a3b8", fontWeight: 500 }}>
              GrowthOS ranks execution, not just performance.
            </h1>
            <p style={s.mcSubtitle}>Your mission for today is ready. Execute before midnight.</p>

            <div style={s.missionList}>
              {missionsLoading ? (
                [1,2,3].map(i => (
                  <div key={i} style={{ ...s.missionItem, cursor: "default" }}>
                    <div style={s.missionNum}>{i}</div>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"5px" }}>
                      <Skeleton w="80%"/><Skeleton w="50%" h="10px"/>
                    </div>
                  </div>
                ))
              ) : missions.length === 0 ? (
                <div style={s.emptyState}>
                  No missions yet.{" "}
                  <span style={{ color:"#818cf8", cursor:"pointer" }} onClick={fetchMissions}>Refresh</span>
                </div>
              ) : missions.map((m, i) => (
                <div key={m.id} onClick={() => toggleMission(m.id)}
                  style={{ ...s.missionItem, ...(m.completed ? s.missionItemDone : {}) }}>
                  <div style={s.missionNum}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ ...s.missionTitle, ...(m.completed ? { textDecoration:"line-through", opacity:0.45 } : {}) }}>{m.title}</div>
                  </div>
                  <div style={s.missionCheck}>
                    {m.completed ? <CheckCircle2 size={18} style={{ color:"#22c55e" }} /> : <Circle size={18} style={{ color:"#334155" }} />}
                  </div>
                </div>
              ))}
            </div>

            {missions.length > 0 && (
              <div style={s.mcProgressWrap}>
                <div style={s.mcProgressBar}>
                  <div style={{ ...s.mcProgressFill, width:`${(completedMissions/missions.length)*100}%` }} />
                </div>
                <span style={s.mcProgressLabel}>{completedMissions}/{missions.length} missions complete</span>
              </div>
            )}
          </div>

          <div style={s.missionRight}>
            <div style={s.mcStatCard}>
              <div style={s.mcStatLabel}><Clock size={12} style={{ color:"#ef4444" }} /><span>Deadline</span></div>
              <div style={s.mcTimer}>{timeLeft}</div>
              <div style={s.mcTimerSub}>Resets at 11:59 PM</div>
            </div>
            <div style={s.mcStatCard}>
              <div style={s.mcStatLabel}><Flame size={12} style={{ color:"#f97316" }} /><span>Current Streak</span></div>
              <div style={{ ...s.mcTimer, color:"#f97316" }}>{streakLoading ? "..." : currentStreak}</div>
              <div style={s.mcTimerSub}>
                {streakData?.practiced_today ? "✓ practiced today" : "days in a row"}
              </div>
            </div>
            <div style={s.mcStatCard}>
              <div style={s.mcStatLabel}><TrendingUp size={12} style={{ color:"#22c55e" }} /><span>Overall Progress</span></div>
              <div style={{ ...s.mcTimer, color:"#22c55e" }}>{overallProgress}%</div>
              <div style={s.mcTimerSub}>roadmap complete</div>
            </div>
            <Link href="/dashboard/leaderboard" style={{ textDecoration:"none" }}>
              <div style={s.mcQuickLink}>
                <BarChart2 size={13} style={{ color:"#6366f1" }} /><span>View Leaderboard</span>
                <ChevronRight size={13} style={{ marginLeft:"auto", color:"#334155" }} />
              </div>
            </Link>
            <Link href="/dashboard/challenges" style={{ textDecoration:"none" }}>
              <div style={s.mcQuickLink}>
                <Trophy size={13} style={{ color:"#f59e0b" }} /><span>Weekly Challenge</span>
                <ChevronRight size={13} style={{ marginLeft:"auto", color:"#334155" }} />
              </div>
            </Link>
          </div>
        </section>

        {/* ══ GROWTH PATH TIMELINE ═════════════════════════════════════════ */}
        <section style={s.section}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={s.cardIcon}><GitBranch size={18} style={{ color:"#6366f1" }} /></div>
                <div>
                  <h2 style={s.cardTitle}>Growth Path Timeline</h2>
                  <p style={s.cardSub}>AI-generated 3-month roadmap — {currentPlan.summary}</p>
                </div>
              </div>
              {roadmapState === "ready" && (
                <button onClick={handleRegenerate} style={s.regenBtn} disabled={regenerating}>
                  <RefreshCw size={14} style={{ animation: regenerating ? "spin .8s linear infinite" : "none" }} />
                  {regenerating ? "Regenerating..." : "Regenerate with AI"}
                </button>
              )}
            </div>

            {roadmapState === "empty" && (
              <div style={rs.emptyWrap}>
                <div style={rs.emptyOrb}>
                  <div style={rs.emptyOrbRing1}/><div style={rs.emptyOrbRing2}/>
                  <div style={rs.emptyOrbCenter}><GitBranch size={26} style={{ color:"#6366f1" }} /></div>
                </div>
                <h3 style={rs.emptyTitle}>Your Growth Roadmap</h3>
                <p style={rs.emptyDesc}>Generate a personalized roadmap<br/>based on your goals and skills.</p>
                <button style={rs.generateBtn} onClick={async () => {
                  setRoadmapState("loading");
                  try {
                    setLoadingStep(1);
                    const [graph, planData] = await Promise.all([
                      getCareerGraph(true).catch(() => ({ nodes:[{ id:"careers", label:"Careers", type:"root" }], edges:[] })),
                      getGrowthPlan().catch(() => null),
                    ]);
                    setLoadingStep(2);
                    if (graph) { setGraphNodes(graph.nodes||[]); setGraphEdges(graph.edges||[]); }
                    if (planData) setPlan(planData);
                    setLoadingStep(3);
                    setTimeout(() => setRoadmapState("ready"), 800);
                  } catch (err:any) { alert(err.message || "Something went wrong."); setRoadmapState("empty"); }
                }}>
                  <Sparkles size={15} /> Generate Roadmap
                </button>
              </div>
            )}

            {roadmapState === "loading" && (
              <div style={rs.loadingWrap}>
                <div style={rs.loadingEngineTag}><Zap size={13} style={{ color:"#f59e0b" }} /><span>GrowthOS AI Engine</span></div>
                <div style={rs.loadingOrb}>
                  <div style={rs.loadingRing1}/><div style={rs.loadingRing2}/><div style={rs.loadingRing3}/>
                  <div style={rs.loadingOrbCore}><Brain size={28} style={{ color:"#6366f1" }} /></div>
                </div>
                <div style={rs.loadingSteps}>
                  {[
                    { icon:<Target size={14}/>, label:"Analyzing your goals...", color:"#6366f1" },
                    { icon:<TrendingUp size={14}/>, label:"Studying market demand...", color:"#3b82f6" },
                    { icon:<GitBranch size={14}/>, label:"Designing your roadmap...", color:"#22c55e" },
                  ].map((step, i) => {
                    const isActive = loadingStep === i+1, isDone = loadingStep > i+1;
                    return (
                      <div key={i} style={{ ...rs.loadingStep, opacity:isActive||isDone?1:0.25, transform:isActive?"translateX(6px)":"none", transition:"all 0.5s ease" }}>
                        <div style={{ ...rs.loadingStepIcon, background:isDone?"rgba(34,197,94,0.15)":isActive?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.04)", border:isDone?"1px solid rgba(34,197,94,0.4)":isActive?"1px solid rgba(99,102,241,0.4)":"1px solid rgba(255,255,255,0.06)", color:isDone?"#22c55e":isActive?step.color:"#475569" }}>
                          {isDone ? <CheckCircle2 size={14}/> : step.icon}
                        </div>
                        <span style={{ ...rs.loadingStepLabel, color:isDone?"#22c55e":isActive?"white":"#334155" }}>{step.label}</span>
                        {isActive && <div style={rs.loadingDots}><span style={{ ...rs.dot, animationDelay:"0s" }}/><span style={{ ...rs.dot, animationDelay:"0.2s" }}/><span style={{ ...rs.dot, animationDelay:"0.4s" }}/></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {roadmapState === "ready" && (
              <>
                <div style={s.monthTabs}>
                  {currentPlan.months.map((m, i) => (
                    <button key={m.month} onClick={() => setActiveMonth(i)} style={{ ...s.monthTab, ...(activeMonth===i?s.monthTabActive:{}) }}>
                      <span style={s.monthTabNum}>Month {m.month}</span>
                      <span style={s.monthTabTheme}>{m.theme}</span>
                      <div style={s.monthTabProg}><div style={{ ...s.monthTabProgFill, width:`${m.progress}%`, background:activeMonth===i?"#6366f1":"#334155" }}/></div>
                      <span style={{ fontSize:"0.7rem", color:activeMonth===i?"#6366f1":"#475569" }}>{m.progress}%</span>
                    </button>
                  ))}
                </div>
                <div style={{ height:"600px", marginTop:20 }}>
                  <CareerGraph nodes={graphNodes} edges={graphEdges} />
                </div>
              </>
            )}
          </div>
        </section>

        {/* ══ AI INSIGHT + TODAY'S ACTION PLAN ═════════════════════════════ */}
        <section style={s.twoCol}>

          {/* AI Insight */}
          <div style={{ ...s.card, flex:1 }}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={{ ...s.cardIcon, background:"rgba(99,102,241,0.15)" }}><Bot size={18} style={{ color:"#6366f1" }} /></div>
                <div><h2 style={s.cardTitle}>AI Growth Insight</h2><p style={s.cardSub}>Personalized by Gemini AI</p></div>
              </div>
            </div>
            <div style={s.insightBody}>
              <div style={s.insightAvatar}><Sparkles size={16} style={{ color:"#6366f1" }} /></div>
              <div style={s.insightBubble}>
                {insightLoading ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    <Skeleton/><Skeleton w="85%"/><Skeleton w="70%"/>
                  </div>
                ) : (
                  <p style={s.insightText}>
                    {insight || "Your personalized AI insight is being generated. Start a practice session to help calibrate it."}
                  </p>
                )}
              </div>
            </div>
            <div style={s.insightMetrics}>
              {[
                { label:"Learning Velocity", value:"High",   color:"#22c55e" },
                { label:"Focus Score",       value:"8.2/10", color:"#3b82f6" },
                { label:"Goal Alignment",    value:"94%",    color:"#f59e0b" },
              ].map(m => (
                <div key={m.label} style={s.metricPill}>
                  <span style={{ fontSize:"0.68rem", color:"#64748b" }}>{m.label}</span>
                  <span style={{ fontSize:"0.82rem", fontWeight:700, color:m.color }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Action Plan — SmartTask system fully intact */}
          <div style={{ ...s.card, flex:1 }}>
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
                      : `${smartTasks.filter(t => t.completed).length} of ${smartTasks.length} completed · 2 hard + 1 easy`}
                  </p>
                </div>
              </div>
              {!smartTasksLoading && smartTasks.length > 0 && (
                <button
                  style={{ ...s.regenBtn, fontSize: "0.72rem" }}
                  onClick={async () => {
                    setSTLoading(true);
                    try {
                      const res = await fetch(`${API}/api/tasks/regenerate`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${getToken()}` },
                      });
                      const data = await res.json();
                      if (Array.isArray(data)) {
                        setSmartTasks(data);
                        setTaskFeedback({});
                        setTaskAnswer({});
                        setExpandedTask(null);
                      }
                    } catch {}
                    finally { setSTLoading(false); }
                  }}
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              )}
            </div>

            {/* Progress ring */}
            <div style={s.taskProgress}>
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="26" cy="26" r="22" fill="none" stroke="#22c55e" strokeWidth="4"
                  strokeDasharray={`${smartTasks.length ? (smartTasks.filter(t => t.completed).length / smartTasks.length) * 138 : 0} 138`}
                  strokeLinecap="round" transform="rotate(-90 26 26)" />
              </svg>
              <div style={s.taskProgressText}>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "#22c55e" }}>
                  {smartTasks.filter(t => t.completed).length}
                </span>
                <span style={{ fontSize: "0.65rem", color: "#475569" }}>done</span>
              </div>
            </div>

            {/* Smart Task List */}
            <div style={s.taskList}>
              {smartTasksLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} style={{ ...st.taskCard, cursor: "default" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ width: "75%", height: "13px", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }} />
                        <div style={{ width: "45%", height: "10px", borderRadius: "4px", background: "rgba(255,255,255,0.04)" }} />
                      </div>
                    </div>
                  </div>
                ))
              ) : smartTasks.length === 0 ? (
                <div style={s.emptyState}>
                  No tasks yet -{" "}
                  <span style={{ color: "#818cf8", cursor: "pointer" }}
                    onClick={async () => {
                      setSTLoading(true);
                      const res = await fetch(`${API}/api/tasks/today`, { headers: { Authorization: `Bearer ${getToken()}` } });
                      const d = await res.json();
                      if (Array.isArray(d)) setSmartTasks(d);
                      setSTLoading(false);
                    }}>
                    Generate now
                  </span>
                </div>
              ) : smartTasks.map(task => {
                const isExpanded = expandedTask === task.id;
                const feedback = taskFeedback[task.id];
                return (
                  <div key={task.id} style={{ ...st.taskCard, ...(task.completed ? st.taskCardDone : {}), ...(isExpanded ? st.taskCardExpanded : {}) }}>

                    {/* Task header row */}
                    <div style={st.taskHeader} onClick={() => {
                      if (!task.completed) setExpandedTask(isExpanded ? null : task.id);
                      else toggleSmartTask(task.id);
                    }}>
                      <div style={st.checkWrap} onClick={e => { e.stopPropagation(); toggleSmartTask(task.id); }}>
                        {task.completed
                          ? <CheckCircle2 size={20} style={{ color: "#22c55e" }} />
                          : <Circle size={20} style={{ color: "#334155" }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={st.taskMeta}>
                          <span style={{ ...st.diffBadge, ...(task.difficulty === "hard" ? st.diffHard : st.diffEasy) }}>
                            {task.difficulty === "hard" ? "⚡ Hard" : "✓ Easy"}
                          </span>
                          <span style={st.skillTag}>{task.skill_tag}</span>
                          <span style={st.xpBadge}>+{task.xp_reward} XP</span>
                          <span style={st.timeBadge}>
                            <Clock size={9} style={{ color: "#475569" }} />
                            {task.estimated_minutes}m
                          </span>
                        </div>
                        <div style={{ ...st.taskTitle, ...(task.completed ? { textDecoration: "line-through", opacity: 0.4 } : {}) }}>
                          {task.title}
                        </div>
                      </div>
                      {!task.completed && (
                        <div style={{ color: "#334155", fontSize: "0.7rem" }}>
                          {isExpanded ? "▲" : "▼"}
                        </div>
                      )}
                    </div>

                    {/* Expanded question + answer panel */}
                    {isExpanded && !task.completed && (
                      <div style={st.expandedBody}>
                        <div style={st.questionBox}>
                          <div style={st.questionLabel}>📋 YOUR CHALLENGE</div>
                          <div style={st.questionText}>{task.question}</div>
                          {task.resource_url && (
                            <a href={task.resource_url} target="_blank" rel="noreferrer" style={st.resourceLink}>
                              🔗 Open Resource →
                            </a>
                          )}
                        </div>
                        <div style={st.answerWrap}>
                          <div style={st.answerLabel}>
                            {task.category === "Coding" ? "✍ Write your solution" : "✍ Write your answer"}
                          </div>
                          <textarea
                            style={st.answerTextarea}
                            placeholder={
                              task.category === "Coding"
                                ? "Paste or type your code here..."
                                : task.category === "Exam Prep"
                                ? "Write your answer with working / steps..."
                                : "Write your response here..."
                            }
                            value={taskAnswer[task.id] || ""}
                            onChange={e => setTaskAnswer(prev => ({ ...prev, [task.id]: e.target.value }))}
                            rows={5}
                          />
                          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            <button
                              style={{ ...st.submitBtn, opacity: submittingTask === task.id ? 0.6 : 1 }}
                              disabled={!taskAnswer[task.id]?.trim() || submittingTask === task.id}
                              onClick={() => submitTaskAnswer(task.id)}
                            >
                              {submittingTask === task.id ? "⏳ Reviewing..." : "✅ Submit for AI Review"}
                            </button>
                            <button style={st.skipBtn} onClick={() => toggleSmartTask(task.id)}>
                              Mark Done
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Feedback after submission */}
                    {feedback && (
                      <div style={st.feedbackBox}>
                        <div style={st.feedbackLabel}>🤖 AI Feedback</div>
                        <div style={st.feedbackText}>{feedback}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Practice Arena banner */}
            <Link href="/dashboard/practice" style={{ textDecoration:"none" }}>
              <div style={pa.banner}>
                <div style={pa.bannerLeft}>
                  <span style={{ fontSize:"1.3rem" }}>🔥</span>
                  <div>
                    <div style={pa.bannerTitle}>Practice Arena</div>
                    <div style={pa.bannerSub}>
                      Streak:{" "}
                      <strong style={{ color:"#f97316" }}>
                        {streakLoading ? "..." : `${currentStreak} days`}
                      </strong>
                      {streakData?.practiced_today && <span style={{ color:"#22c55e", marginLeft:"6px" }}>✓ Done today</span>}
                    </div>
                  </div>
                </div>
                <div style={pa.bannerRight}>
                  <span style={pa.aiBadge}>AI-generated</span>
                  <span style={{ fontSize:"0.82rem", color:"#f97316", fontWeight:700 }}>Start →</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ══ EXECUTION LAB + OPPORTUNITIES ════════════════════════════════ */}
        <section style={s.twoCol}>

          {/* Execution Lab — replaces Explore Skills */}
          <div style={{ ...s.card, flex:1 }}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={{ ...s.cardIcon, background:"rgba(99,102,241,0.12)" }}><Cpu size={18} style={{ color:"#6366f1" }} /></div>
                <div>
                  <h2 style={s.cardTitle}>⚡ Execution Lab</h2>
                  <p style={s.cardSub}>Click any skill to enter your personal execution space</p>
                </div>
              </div>
            </div>
            <div style={s.skillGrid}>
              {skillsLoading ? (
                [1,2,3,4].map(i => (
                  <div key={i} style={{ ...s.skillCard, cursor:"default" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                      <div style={{ width:"32px", height:"32px", borderRadius:"6px", background:"rgba(255,255,255,0.05)" }}/>
                      <Skeleton w="40px" h="10px"/>
                    </div>
                    <Skeleton w="65%" h="13px"/><br/>
                    <Skeleton w="45%" h="10px"/>
                  </div>
                ))
              ) : skills.length === 0 ? (
                <div style={{ gridColumn:"span 2", display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", padding:"24px", background:"rgba(99,102,241,0.04)", border:"1px solid rgba(99,102,241,0.1)", borderRadius:"12px" }}>
                  <div style={{ fontSize:"0.85rem", color:"#475569", textAlign:"center" }}>
                    Your skills are being personalized based on your profile.
                  </div>
                  <button
                    style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 18px", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:"8px", color:"#818cf8", fontSize:"0.8rem", fontWeight:700, cursor:"pointer" }}
                    onClick={async () => {
                      setSkillsLoading(true);
                      try {
                        const d = await getSkills();
                        if (d?.length) setSkills(d);
                      } catch {}
                      finally { setSkillsLoading(false); }
                    }}>
                    <RefreshCw size={13}/> Retry
                  </button>
                </div>
              ) : skills.map(skill => (
                <button key={skill.id} style={s.skillCard} onClick={() => setActiveLabSkill(skill)}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "rgba(99,102,241,0.4)"; el.style.background = "rgba(99,102,241,0.06)"; }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "rgba(255,255,255,0.06)"; el.style.background = "rgba(255,255,255,0.02)"; }}>
                  <div style={s.skillCardTop}>
                    <span style={s.skillEmoji}>{skill.emoji}</span>
                    <div style={s.skillRelevance}><Star size={10} style={{ color:"#f59e0b" }}/><span>{skill.relevance_score}%</span></div>
                  </div>
                  <div style={s.skillName}>{skill.name}</div>
                  <div style={s.skillLevel}>{skill.level}</div>
                  <div style={s.skillBar}>
                    <div style={{ ...s.skillBarFill, width:skill.level==="Beginner"?"25%":skill.level==="Intermediate"?"55%":skill.level==="Advanced"?"80%":"5%" }}/>
                  </div>
                  <div style={s.skillWhy}>{skill.why_relevant}</div>
                  {/* Execution Lab entry point */}
                  <div style={labCard.footer}>
                    <div style={labCard.tabs}>
                      {["🧠","📚","⚡","🤖","💼"].map((icon, i) => (
                        <span key={i} style={labCard.tabIcon}>{icon}</span>
                      ))}
                    </div>
                    <div style={labCard.enterBtn}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.25)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,0.5)"; (e.currentTarget as HTMLDivElement).style.color = "#a5b4fc"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.1)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,0.2)"; (e.currentTarget as HTMLDivElement).style.color = "#6366f1"; }}>
                      ⚡ Enter Lab →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Opportunities — unchanged */}
          <div style={{ ...s.card, flex:1 }}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={{ ...s.cardIcon, background:"rgba(245,158,11,0.1)" }}><Rocket size={18} style={{ color:"#f59e0b" }} /></div>
                <div><h2 style={s.cardTitle}>Opportunities</h2><p style={s.cardSub}>Handpicked by AI for your profile</p></div>
              </div>
            </div>
            <div style={s.oppList}>
              {oppsLoading ? (
                [1,2,3].map(i => (
                  <div key={i} style={{ ...s.oppCard, cursor:"default" }}>
                    <div style={{ width:"36px", height:"36px", borderRadius:"8px", background:"rgba(255,255,255,0.05)", flexShrink:0 }}/>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"6px" }}><Skeleton w="60%"/><Skeleton w="85%" h="10px"/></div>
                  </div>
                ))
              ) : opportunities.length === 0 ? (
                <div style={s.emptyState}>Opportunities are being generated for you.</div>
              ) : opportunities.map(opp => (
                <div key={opp.id} style={s.oppCard}>
                  <div style={s.oppEmoji}>{opp.emoji}</div>
                  <div style={s.oppBody}>
                    <div style={s.oppTitle}>{opp.title}</div>
                    <div style={s.oppDesc}>{opp.description}</div>
                    <div style={s.oppMeta}>
                      <span style={{ ...s.urgencyBadge, ...(opp.urgency==="now"?s.urgencyNow:opp.urgency==="this_week"?s.urgencyWeek:s.urgencyMonth) }}>
                        {opp.urgency==="now"?"⚡ Act Now":opp.urgency==="this_week"?"📅 This Week":"📆 This Month"}
                      </span>
                    </div>
                  </div>
                  <button style={s.oppBtn}>{opp.action_label} <ChevronRight size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ BATCH ACTIVITY FEED — untouched ══════════════════════════════ */}
        <section style={s.section}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardTitleWrap}>
                <div style={{ ...s.cardIcon, background:"rgba(99,102,241,0.1)" }}><Activity size={18} style={{ color:"#6366f1" }} /></div>
                <div><h2 style={s.cardTitle}>Batch Activity Feed</h2><p style={s.cardSub}>Live updates from your cohort</p></div>
              </div>
              <div style={s.livePill}><div style={s.liveDot}/><span>Live</span></div>
            </div>
            <div style={feed.grid}>
              {batchActivity.map(item => {
                const cfg = activityConfig[item.type] ?? { color:"#475569", icon:"•" };
                return (
                  <div key={item.id} style={feed.item}>
                    <div style={{ ...feed.avatar, background:`${cfg.color}22`, border:`1px solid ${cfg.color}44`, color:cfg.color }}>{item.avatar}</div>
                    <div style={feed.body}><span style={feed.userName}>{item.user}</span><span style={feed.action}> {item.action}</span></div>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
                      <span style={{ ...feed.typeBadge, color:cfg.color, background:`${cfg.color}15` }}>{cfg.icon}</span>
                      <span style={feed.time}>{item.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={feed.footer}>
              <Link href="/dashboard/leaderboard" style={{ textDecoration:"none" }}>
                <button style={feed.footerBtn}>View Full Leaderboard <ChevronRight size={13}/></button>
              </Link>
              <Link href="/dashboard/challenges" style={{ textDecoration:"none" }}>
                <button style={feed.footerBtn}>Weekly Challenge <Trophy size={13}/></button>
              </Link>
            </div>
          </div>
        </section>

        <div style={{ height:"40px" }}/>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
        @keyframes orbPulse { 0%,100%{transform:scale(0.96);opacity:0.6} 50%{transform:scale(1.04);opacity:1} }
        @keyframes orbSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes orbRevSpin { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes toastIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes labSlideIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:2px; }
        input::placeholder { color:#334155; }
        textarea { outline:none; }
      `}</style>
    </div>
  );
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
  sidebarLogoText:{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1.2rem", fontWeight:700, color:"white", letterSpacing:"0.05em" },
  nav:{ flex:1, display:"flex", flexDirection:"column", gap:"2px", padding:"8px 12px", overflowY:"auto" },
  navItem:{ position:"relative", display:"flex", alignItems:"center", gap:"10px", padding:"9px 12px", borderRadius:"10px", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", transition:"all .2s", textAlign:"left", width:"100%" },
  navItemActive:{ background:"rgba(99,102,241,0.12)", color:"white" },
  navActiveDot:{ position:"absolute", right:"10px", width:"6px", height:"6px", borderRadius:"50%", background:"#6366f1" },
  sidebarFooter:{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.05)" },
  sidebarUser:{ flex:1, display:"flex", alignItems:"center", gap:"8px" },
  avatarSmall:{ width:"28px", height:"28px", borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#3b82f6)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:700 },
  logoutBtn:{ background:"none", border:"none", cursor:"pointer", color:"#475569", padding:"4px", display:"flex" },
  main:{ marginLeft:"220px", flex:1, padding:"0 32px 0", position:"relative", zIndex:1, maxWidth:"calc(100vw - 220px)", overflowX:"hidden" },
  topbar:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 0 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", marginBottom:"24px" },
  searchWrap:{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"10px", padding:"8px 14px", width:"260px" },
  searchInput:{ background:"none", border:"none", outline:"none", color:"#94a3b8", fontSize:"0.85rem", width:"100%", fontFamily:"inherit" },
  topbarRight:{ display:"flex", alignItems:"center", gap:"12px" },
  iconBtn:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px", padding:"7px", color:"#64748b", cursor:"pointer", display:"flex" },
  avatarMed:{ width:"34px", height:"34px", borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#3b82f6)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", fontWeight:700, cursor:"pointer" },
  missionControlWrap:{ display:"flex", gap:"20px", marginBottom:"24px", padding:"28px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"20px", backdropFilter:"blur(10px)" },
  missionLeft:{ flex:1 },
  mcTag:{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:"20px", padding:"4px 12px", fontSize:"0.72rem", color:"#818cf8", fontWeight:600, marginBottom:"14px", letterSpacing:"0.03em" },
  mcTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1.9rem", fontWeight:700, color:"white", margin:"0 0 4px", lineHeight:1.2 },
  mcName:{ color:"#6366f1" },
  mcSubtitle:{ fontSize:"0.88rem", color:"#475569", margin:"0 0 18px", lineHeight:1.5 },
  missionList:{ display:"flex", flexDirection:"column" as const, gap:"8px", marginBottom:"16px" },
  missionItem:{ display:"flex", alignItems:"center", gap:"12px", padding:"11px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"10px", cursor:"pointer", transition:"all .2s" },
  missionItemDone:{ background:"rgba(34,197,94,0.04)", borderColor:"rgba(34,197,94,0.15)" },
  missionNum:{ width:"22px", height:"22px", borderRadius:"6px", background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.72rem", fontWeight:700, color:"#818cf8", flexShrink:0 },
  missionTitle:{ fontSize:"0.88rem", fontWeight:500, color:"white" },
  missionCheck:{ flexShrink:0 },
  mcProgressWrap:{ display:"flex", alignItems:"center", gap:"10px" },
  mcProgressBar:{ flex:1, height:"4px", background:"rgba(255,255,255,0.06)", borderRadius:"2px", overflow:"hidden" },
  mcProgressFill:{ height:"100%", background:"linear-gradient(90deg,#6366f1,#3b82f6)", borderRadius:"2px", transition:"width 0.4s ease" },
  mcProgressLabel:{ fontSize:"0.72rem", color:"#475569", whiteSpace:"nowrap" as const },
  missionRight:{ display:"flex", flexDirection:"column" as const, gap:"10px", width:"200px", flexShrink:0 },
  mcStatCard:{ padding:"14px 16px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px", textAlign:"center" as const },
  mcStatLabel:{ display:"flex", alignItems:"center", justifyContent:"center", gap:"5px", fontSize:"0.68rem", color:"#475569", marginBottom:"6px", letterSpacing:"0.04em", textTransform:"uppercase" as const },
  mcTimer:{ fontFamily:"'Rajdhani',monospace", fontSize:"1.4rem", fontWeight:700, color:"#ef4444", letterSpacing:"0.04em" },
  mcTimerSub:{ fontSize:"0.65rem", color:"#334155", marginTop:"2px" },
  mcQuickLink:{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 12px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"10px", cursor:"pointer", fontSize:"0.8rem", color:"#94a3b8", transition:"all .2s" },
  emptyState:{ padding:"16px", background:"rgba(99,102,241,0.04)", border:"1px solid rgba(99,102,241,0.1)", borderRadius:"10px", fontSize:"0.82rem", color:"#475569", textAlign:"center" as const },
  toast:{ position:"fixed", bottom:"24px", right:"24px", zIndex:100, display:"flex", alignItems:"flex-start", gap:"12px", padding:"16px 18px", background:"rgba(6,15,34,0.98)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:"14px", backdropFilter:"blur(20px)", boxShadow:"0 8px 40px rgba(0,0,0,0.6)", maxWidth:"380px", animation:"toastIn 0.4s ease" },
  toastLeft:{ display:"flex", alignItems:"flex-start", gap:"10px", flex:1 },
  toastIcon:{ width:"32px", height:"32px", borderRadius:"8px", background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  toastTitle:{ fontSize:"0.8rem", fontWeight:700, color:"#818cf8", marginBottom:"4px" },
  toastMsg:{ fontSize:"0.78rem", color:"#64748b", lineHeight:1.6 },
  toastClose:{ background:"none", border:"none", cursor:"pointer", color:"#475569", padding:"2px", flexShrink:0 },
  livePill:{ display:"flex", alignItems:"center", gap:"6px", padding:"4px 10px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"20px", fontSize:"0.72rem", color:"#22c55e", fontWeight:600 },
  liveDot:{ width:"6px", height:"6px", borderRadius:"50%", background:"#22c55e", animation:"livePulse 1.5s ease-in-out infinite" },
  section:{ marginBottom:"20px" },
  twoCol:{ display:"flex", gap:"20px", marginBottom:"20px" },
  card:{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"18px", padding:"24px", backdropFilter:"blur(10px)", transition:"border-color .2s" },
  cardHeader:{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"20px" },
  cardTitleWrap:{ display:"flex", alignItems:"center", gap:"12px" },
  cardIcon:{ width:"38px", height:"38px", borderRadius:"10px", background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  cardTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1.1rem", fontWeight:700, color:"white", margin:"0 0 2px" },
  cardSub:{ fontSize:"0.77rem", color:"#475569", margin:0 },
  regenBtn:{ display:"flex", alignItems:"center", gap:"6px", padding:"7px 14px", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:"8px", color:"#818cf8", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const },
  monthTabs:{ display:"flex", gap:"10px", marginBottom:"24px" },
  monthTab:{ flex:1, display:"flex", flexDirection:"column" as const, gap:"4px", padding:"12px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px", cursor:"pointer", textAlign:"left" as const, transition:"all .2s" },
  monthTabActive:{ background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.3)" },
  monthTabNum:{ fontSize:"0.75rem", color:"#6366f1", fontWeight:700, letterSpacing:"0.05em" },
  monthTabTheme:{ fontSize:"0.9rem", fontWeight:600, color:"white" },
  monthTabProg:{ height:"3px", background:"rgba(255,255,255,0.06)", borderRadius:"2px", overflow:"hidden", margin:"4px 0 2px" },
  monthTabProgFill:{ height:"100%", borderRadius:"2px", transition:"width .4s ease" },
  insightBody:{ display:"flex", gap:"12px", marginBottom:"16px" },
  insightAvatar:{ width:"36px", height:"36px", borderRadius:"50%", background:"linear-gradient(135deg,rgba(99,102,241,0.3),rgba(59,130,246,0.2))", border:"1px solid rgba(99,102,241,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, animation:"orbPulse 3s ease-in-out infinite" },
  insightBubble:{ flex:1, background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.12)", borderRadius:"14px", padding:"14px 16px" },
  insightText:{ fontSize:"0.87rem", color:"#94a3b8", lineHeight:1.7, margin:0 },
  insightMetrics:{ display:"flex", gap:"8px" },
  metricPill:{ flex:1, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:"2px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px", padding:"8px 6px" },
  taskProgress:{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:"14px" },
  taskProgressText:{ position:"absolute", display:"flex", flexDirection:"column" as const, alignItems:"center" },
  taskList:{ display:"flex", flexDirection:"column" as const, gap:"8px", marginBottom:"16px" },
  taskItem:{ display:"flex", gap:"12px", padding:"12px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"12px", cursor:"pointer", transition:"all .2s", alignItems:"flex-start" },
  taskItemDone:{ background:"rgba(34,197,94,0.04)", borderColor:"rgba(34,197,94,0.12)" },
  taskCheck:{ flexShrink:0, marginTop:"1px" },
  taskBody:{ flex:1 },
  taskTitle:{ fontSize:"0.87rem", fontWeight:500, color:"white", marginBottom:"4px" },
  taskMeta:{ display:"flex", alignItems:"center", gap:"6px" },
  priorityDot:{ width:"6px", height:"6px", borderRadius:"50%", flexShrink:0 },
  taskTime:{ fontSize:"0.7rem", color:"#475569" },
  taskCat:{ fontSize:"0.7rem", color:"#334155", background:"rgba(255,255,255,0.04)", borderRadius:"6px", padding:"1px 6px" },
  skillGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" },
  skillCard:{ position:"relative", display:"flex", flexDirection:"column" as const, gap:"4px", padding:"14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"14px", cursor:"pointer", transition:"all .2s", textAlign:"left" as const },
  skillCardTop:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" },
  skillEmoji:{ fontSize:"1.6rem" },
  skillRelevance:{ display:"flex", alignItems:"center", gap:"3px", fontSize:"0.7rem", color:"#f59e0b", fontWeight:600 },
  skillName:{ fontSize:"0.9rem", fontWeight:600, color:"white" },
  skillLevel:{ fontSize:"0.72rem", color:"#475569" },
  skillBar:{ height:"3px", background:"rgba(255,255,255,0.06)", borderRadius:"2px", overflow:"hidden", margin:"4px 0" },
  skillBarFill:{ height:"100%", background:"linear-gradient(90deg,#6366f1,#3b82f6)", borderRadius:"2px" },
  skillWhy:{ fontSize:"0.72rem", color:"#334155", lineHeight:1.4 },
  skillArrow:{ position:"absolute", bottom:"12px", right:"12px", color:"#334155", transition:"transform .2s" },
  oppList:{ display:"flex", flexDirection:"column" as const, gap:"10px" },
  oppCard:{ display:"flex", alignItems:"center", gap:"14px", padding:"14px 16px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"14px", transition:"all .2s" },
  oppEmoji:{ fontSize:"1.8rem", flexShrink:0 },
  oppBody:{ flex:1 },
  oppTitle:{ fontSize:"0.9rem", fontWeight:600, color:"white", marginBottom:"3px" },
  oppDesc:{ fontSize:"0.77rem", color:"#475569", lineHeight:1.4 },
  oppMeta:{ marginTop:"6px" },
  urgencyBadge:{ fontSize:"0.68rem", fontWeight:700, borderRadius:"10px", padding:"2px 8px" },
  urgencyNow:{ background:"rgba(239,68,68,0.12)", color:"#ef4444" },
  urgencyWeek:{ background:"rgba(59,130,246,0.12)", color:"#3b82f6" },
  urgencyMonth:{ background:"rgba(100,116,139,0.12)", color:"#64748b" },
  oppBtn:{ display:"flex", alignItems:"center", gap:"4px", padding:"7px 12px", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:"8px", color:"#818cf8", fontSize:"0.75rem", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const, flexShrink:0 },
};

const pa: Record<string, React.CSSProperties> = {
  banner:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:"12px", cursor:"pointer", transition:"all .2s", marginTop:"4px" },
  bannerLeft:{ display:"flex", alignItems:"center", gap:"10px" },
  bannerTitle:{ fontSize:"0.88rem", fontWeight:700, color:"white" },
  bannerSub:{ fontSize:"0.72rem", color:"#64748b", marginTop:"1px" },
  bannerRight:{ display:"flex", alignItems:"center", gap:"10px" },
  aiBadge:{ fontSize:"0.65rem", padding:"2px 8px", borderRadius:"10px", background:"rgba(99,102,241,0.12)", color:"#818cf8", fontWeight:600 },
};

// ── SmartTask styles (fully intact from 1300-line file) ───────────────────────
const st: Record<string, React.CSSProperties> = {
  taskCard:{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px", padding:"12px 14px", cursor:"pointer", transition:"all .2s", display:"flex", flexDirection:"column" as const, gap:"0" },
  taskCardDone:{ background:"rgba(34,197,94,0.04)", borderColor:"rgba(34,197,94,0.12)" },
  taskCardExpanded:{ borderColor:"rgba(99,102,241,0.3)", background:"rgba(99,102,241,0.04)" },
  taskHeader:{ display:"flex", alignItems:"flex-start", gap:"10px" },
  checkWrap:{ flexShrink:0, marginTop:"2px" },
  taskMeta:{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px", flexWrap:"wrap" as const },
  diffBadge:{ fontSize:"0.62rem", fontWeight:700, padding:"2px 7px", borderRadius:"10px" },
  diffHard:{ background:"rgba(239,68,68,0.12)", color:"#ef4444" },
  diffEasy:{ background:"rgba(34,197,94,0.12)", color:"#22c55e" },
  skillTag:{ fontSize:"0.62rem", padding:"2px 7px", borderRadius:"10px", background:"rgba(99,102,241,0.1)", color:"#818cf8", fontWeight:600 },
  xpBadge:{ fontSize:"0.62rem", padding:"2px 7px", borderRadius:"10px", background:"rgba(245,158,11,0.1)", color:"#f59e0b", fontWeight:700 },
  timeBadge:{ display:"flex", alignItems:"center", gap:"3px", fontSize:"0.62rem", color:"#475569" },
  taskTitle:{ fontSize:"0.86rem", fontWeight:500, color:"white", lineHeight:1.4 },
  expandedBody:{ marginTop:"12px", display:"flex", flexDirection:"column" as const, gap:"10px" },
  questionBox:{ padding:"12px 14px", background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.15)", borderRadius:"10px" },
  questionLabel:{ fontSize:"0.62rem", fontWeight:700, color:"#6366f1", letterSpacing:"0.06em", marginBottom:"6px" },
  questionText:{ fontSize:"0.84rem", color:"#94a3b8", lineHeight:1.65, whiteSpace:"pre-line" as const },
  resourceLink:{ display:"inline-block", marginTop:"8px", fontSize:"0.75rem", color:"#818cf8", textDecoration:"none", fontWeight:600 },
  answerWrap:{ display:"flex", flexDirection:"column" as const, gap:"6px" },
  answerLabel:{ fontSize:"0.7rem", color:"#475569", fontWeight:600 },
  answerTextarea:{ width:"100%", padding:"10px 12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"10px", color:"#e2e8f0", fontFamily:"inherit", fontSize:"0.82rem", resize:"vertical" as const, outline:"none", lineHeight:1.6 },
  submitBtn:{ flex:1, padding:"9px 14px", background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.35)", borderRadius:"9px", color:"#a5b4fc", fontSize:"0.8rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  skipBtn:{ padding:"9px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"9px", color:"#475569", fontSize:"0.78rem", cursor:"pointer", fontFamily:"inherit" },
  feedbackBox:{ marginTop:"10px", padding:"10px 13px", background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"10px" },
  feedbackLabel:{ fontSize:"0.62rem", fontWeight:700, color:"#22c55e", letterSpacing:"0.06em", marginBottom:"4px" },
  feedbackText:{ fontSize:"0.8rem", color:"#86efac", lineHeight:1.65 },
};

// ── Execution Lab card footer styles ─────────────────────────────────────────
const labCard: Record<string, React.CSSProperties> = {
  footer:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"10px", paddingTop:"8px", borderTop:"1px solid rgba(255,255,255,0.05)" },
  tabs:{ display:"flex", gap:"4px" },
  tabIcon:{ fontSize:"0.78rem" },
  enterBtn:{ fontSize:"0.72rem", fontWeight:700, color:"#6366f1", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em" },
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

// ── Execution Lab Modal Styles ────────────────────────────────────────────────
const lab: Record<string, React.CSSProperties> = {
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(6px)" },
  panel:{ position:"relative", background:"rgba(6,15,34,0.98)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:"20px", width:"min(780px,95vw)", maxHeight:"88vh", display:"flex", flexDirection:"column", overflow:"hidden", animation:"labSlideIn 0.3s ease", boxShadow:"0 24px 80px rgba(0,0,0,0.7)" },
  header:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" },
  headerLeft:{ display:"flex", alignItems:"center", gap:"14px" },
  labTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1.2rem", fontWeight:700, color:"white" },
  labSub:{ fontSize:"0.75rem", color:"#475569", marginTop:"2px" },
  startBtn:{ padding:"7px 14px", background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:"8px", color:"#a5b4fc", fontSize:"0.78rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  closeBtn:{ width:"30px", height:"30px", borderRadius:"8px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b", fontSize:"0.85rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  tabRow:{ display:"flex", gap:"4px", padding:"12px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(0,0,0,0.2)" },
  tab:{ display:"flex", alignItems:"center", gap:"6px", padding:"7px 14px", borderRadius:"8px", border:"none", background:"none", color:"#475569", fontSize:"0.8rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .2s" },
  tabActive:{ background:"rgba(99,102,241,0.15)", color:"white" },
  content:{ flex:1, overflowY:"auto", padding:"20px 24px" },
  section:{ display:"flex", flexDirection:"column", gap:"8px" },
  sectionTitle:{ fontSize:"1rem", fontWeight:700, color:"white" },
  sectionSub:{ fontSize:"0.78rem", color:"#475569" },
  pathItem:{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px" },
  pathNum:{ width:"28px", height:"28px", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.78rem", fontWeight:700, flexShrink:0 },
  goBtn:{ padding:"5px 12px", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:"7px", color:"#818cf8", fontSize:"0.75rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 },
  progressCard:{ padding:"14px", background:"rgba(99,102,241,0.04)", border:"1px solid rgba(99,102,241,0.1)", borderRadius:"12px", marginTop:"8px" },
  progressBar:{ height:"6px", background:"rgba(255,255,255,0.06)", borderRadius:"3px", overflow:"hidden" },
  progressFill:{ height:"100%", background:"linear-gradient(90deg,#6366f1,#3b82f6)", borderRadius:"3px" },
  moduleCard:{ padding:"14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px" },
  moduleCardDone:{ background:"rgba(34,197,94,0.04)", borderColor:"rgba(34,197,94,0.2)" },
  moduleHeader:{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px", marginBottom:"8px" },
  moduleBtn:{ padding:"5px 12px", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:"7px", color:"#818cf8", fontSize:"0.75rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 },
  moduleBtnDone:{ background:"rgba(34,197,94,0.1)", borderColor:"rgba(34,197,94,0.3)", color:"#22c55e" },
  taskList:{ display:"flex", gap:"6px", flexWrap:"wrap" as const },
  taskChip:{ fontSize:"0.7rem", color:"#475569", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"6px", padding:"2px 8px" },
  projectCard:{ padding:"16px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px" },
  projectHeader:{ marginBottom:"10px" },
  projectMeta:{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" as const },
  diffBadge:{ fontSize:"0.68rem", fontWeight:700, padding:"2px 8px", borderRadius:"8px" },
  timeBadge:{ fontSize:"0.68rem", color:"#475569", background:"rgba(255,255,255,0.04)", padding:"2px 8px", borderRadius:"8px" },
  buildBtn:{ marginLeft:"auto", padding:"5px 12px", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:"7px", color:"#818cf8", fontSize:"0.75rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  mentorReply:{ padding:"14px 16px", background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.15)", borderRadius:"12px", marginBottom:"12px" },
  mentorInput:{ flex:1, padding:"10px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", color:"white", fontSize:"0.85rem", fontFamily:"inherit", outline:"none" },
  mentorSendBtn:{ padding:"10px 18px", background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:"10px", color:"#a5b4fc", fontSize:"0.82rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 },
  quickQ:{ padding:"5px 10px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px", color:"#64748b", fontSize:"0.72rem", cursor:"pointer", fontFamily:"inherit", textAlign:"left" as const },
  earnCard:{ display:"flex", alignItems:"flex-start", gap:"12px", padding:"14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px" },
  earnIcon:{ fontSize:"1.6rem", flexShrink:0 },
  earnType:{ fontSize:"0.62rem", padding:"1px 6px", borderRadius:"6px", background:"rgba(34,197,94,0.1)", color:"#22c55e", fontWeight:700 },
  earnBtn:{ padding:"5px 12px", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"7px", color:"#f59e0b", fontSize:"0.75rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 },
  earnNote:{ padding:"12px 14px", background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:"10px", fontSize:"0.78rem", color:"#64748b", marginTop:"8px" },
};

const rs: Record<string, React.CSSProperties> = {
  emptyWrap:{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 20px", gap:"16px" },
  emptyOrb:{ position:"relative", width:"90px", height:"90px", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"8px" },
  emptyOrbRing1:{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"rgba(99,102,241,0.5)", borderRightColor:"rgba(99,102,241,0.2)", animation:"orbSpin 3s linear infinite" },
  emptyOrbRing2:{ position:"absolute", inset:"12px", borderRadius:"50%", border:"2px solid transparent", borderBottomColor:"rgba(59,130,246,0.4)", animation:"orbRevSpin 2s linear infinite" },
  emptyOrbCenter:{ position:"relative", zIndex:2, width:"46px", height:"46px", borderRadius:"50%", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", display:"flex", alignItems:"center", justifyContent:"center" },
  emptyTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1.3rem", fontWeight:700, color:"white", margin:0, textAlign:"center" as const },
  emptyDesc:{ fontSize:"0.87rem", color:"#475569", textAlign:"center" as const, lineHeight:1.7, margin:0 },
  generateBtn:{ display:"flex", alignItems:"center", gap:"8px", padding:"11px 28px", background:"linear-gradient(135deg,rgba(99,102,241,0.25),rgba(59,130,246,0.15))", border:"1px solid rgba(99,102,241,0.4)", borderRadius:"12px", color:"#a5b4fc", fontSize:"0.9rem", fontWeight:700, cursor:"pointer", marginTop:"4px", letterSpacing:"0.02em", transition:"all .2s" },
  loadingWrap:{ display:"flex", flexDirection:"column" as const, alignItems:"center", padding:"40px 20px", gap:"24px" },
  loadingEngineTag:{ display:"flex", alignItems:"center", gap:"6px", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"20px", padding:"5px 14px", fontSize:"0.75rem", color:"#f59e0b", fontWeight:700, letterSpacing:"0.05em" },
  loadingOrb:{ position:"relative", width:"110px", height:"110px", display:"flex", alignItems:"center", justifyContent:"center" },
  loadingRing1:{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"#6366f1", borderRightColor:"rgba(99,102,241,0.3)", animation:"orbSpin 1.8s linear infinite" },
  loadingRing2:{ position:"absolute", inset:"14px", borderRadius:"50%", border:"2px solid transparent", borderBottomColor:"#3b82f6", borderLeftColor:"rgba(59,130,246,0.3)", animation:"orbRevSpin 1.4s linear infinite" },
  loadingRing3:{ position:"absolute", inset:"28px", borderRadius:"50%", border:"2px solid transparent", borderTopColor:"#06b6d4", animation:"orbSpin 2.2s linear infinite" },
  loadingOrbCore:{ position:"relative", zIndex:2, width:"48px", height:"48px", borderRadius:"50%", background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.35)", display:"flex", alignItems:"center", justifyContent:"center", animation:"orbPulse 2s ease-in-out infinite" },
  loadingSteps:{ display:"flex", flexDirection:"column" as const, gap:"10px", width:"100%", maxWidth:"320px" },
  loadingStep:{ display:"flex", alignItems:"center", gap:"12px" },
  loadingStepIcon:{ width:"32px", height:"32px", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.4s ease" },
  loadingStepLabel:{ fontSize:"0.88rem", fontWeight:500, transition:"color 0.4s ease" },
  loadingDots:{ display:"flex", gap:"3px", marginLeft:"auto" },
  dot:{ width:"5px", height:"5px", borderRadius:"50%", background:"#6366f1", display:"inline-block", animation:"dotBounce 0.8s ease-in-out infinite" },
};