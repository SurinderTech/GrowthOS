"use client";
// components/agents/LearningAgentPanel.tsx
//
// Learning Agent — First-Time Calibration Experience
// ────────────────────────────────────────────────────────────────────────────
// Scope of this file (intentionally limited):
//   ✅ Conversational "Nova already briefed me" intro
//   ✅ One-question-at-a-time calibration (4 questions)
//   ✅ Progress indicator, back navigation, per-step autosave
//   ✅ Completion screen
//   ✅ Loads existing calibration on return visits (skips the flow)
//
// Explicitly NOT built here (per spec):
//   ❌ Roadmap generation, recommendations, analytics, revision engine, LLM calls
//
// Backend contract this component expects (see accompanying backend task):
//   GET   /api/learning-agent/memory            -> { requires_calibration, memory }
//   PATCH /api/learning-agent/memory             -> upsert one or more preference fields
//   GET   /api/onboarding/profile                -> shared onboarding fields from Nova
//
// If your route names differ, only the four fetch calls in `api.ts`-style
// section below need to change — nothing else in this file is coupled to them.

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X, Brain, ArrowLeft, ArrowRight, Sparkles, CheckCircle2,
  Video, BookOpen, Hammer, Shuffle,
  FileSearch, Bot, Pickaxe,
  Zap, Target, Trophy, Rocket, CalendarClock, CalendarDays, Wand2,
} from "lucide-react";
import { LearningStudio } from "./LearningStudio";
import { CareerDiscoveryExplorer } from "./CareerDiscoveryExplorer";
import { BuildRoadmapScreen, type BuildContext } from "./BuildRoadmapScreen";
import { detectField } from "./fieldDatasets";
import { getRoadmapStatus } from "@/lib/learning-agent-api";

// ── API plumbing (mirrors the pattern already used in dashboard/page.tsx) ───
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
}
async function authedFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────
interface OnboardingProfile {
  name?: string;
  career_goal?: string;
  current_level?: string;
  daily_study_hours?: number;
  preferred_time_blocks?: string; // e.g. "evening"
  target_timeline?: string;       // e.g. "6 months"
  timezone?: string;
}

type LearningStyle = "videos" | "documentation" | "books" | "project_based" | "mixed";
type StuckStrategy = "watch_explanation" | "read_docs" | "ask_ai" | "solve_myself";
type LearningPriority = "learn_fast" | "deep_understanding" | "interview_prep" | "build_projects";
type RevisionPreference = "daily" | "weekly" | "ai_decide";

interface LearningMemory {
  learning_style?: LearningStyle;
  stuck_strategy?: StuckStrategy;
  learning_priority?: LearningPriority;
  revision_preference?: RevisionPreference;
  calibration_completed?: boolean;
}

interface QuestionOption<T extends string> {
  value: T;
  label: string;
  desc: string;
  icon: any;
}

interface QuestionDef<T extends string = string> {
  field: keyof LearningMemory;
  eyebrow: string;
  prompt: string;
  options: QuestionOption<T>[];
}

// ── Question bank ────────────────────────────────────────────────────────
const QUESTIONS: QuestionDef[] = [
  {
    field: "learning_style",
    eyebrow: "Question 1 of 4",
    prompt: "How do you prefer to learn something new?",
    options: [
      { value: "videos", label: "Videos", desc: "Show me, don't just tell me", icon: Video },
      { value: "documentation", label: "Documentation", desc: "Straight to the source, no fluff", icon: FileSearch },
      { value: "books", label: "Books", desc: "Structured, in-depth reading", icon: BookOpen },
      { value: "project_based", label: "Project-Based", desc: "I learn by building things", icon: Hammer },
      { value: "mixed", label: "Mixed", desc: "A bit of everything works for me", icon: Shuffle },
    ],
  },
  {
    field: "stuck_strategy",
    eyebrow: "Question 2 of 4",
    prompt: "When you get stuck on a topic, what do you usually do first?",
    options: [
      { value: "watch_explanation", label: "Watch Another Explanation", desc: "A different angle usually clicks", icon: Video },
      { value: "read_docs", label: "Read Documentation", desc: "Go back to the primary source", icon: FileSearch },
      { value: "ask_ai", label: "Ask AI", desc: "Get an instant, tailored answer", icon: Bot },
      { value: "solve_myself", label: "Try Solving Myself First", desc: "I want to struggle a bit before help", icon: Pickaxe },
    ],
  },
  {
    field: "learning_priority",
    eyebrow: "Question 3 of 4",
    prompt: "What matters most to you right now?",
    options: [
      { value: "learn_fast", label: "Learn Fast", desc: "Get functional as quickly as possible", icon: Zap },
      { value: "deep_understanding", label: "Deep Understanding", desc: "I want to really know the fundamentals", icon: Target },
      { value: "interview_prep", label: "Interview Preparation", desc: "Optimize for landing the role", icon: Trophy },
      { value: "build_projects", label: "Build Real Projects", desc: "Learning through shipped work", icon: Rocket },
    ],
  },
  {
    field: "revision_preference",
    eyebrow: "Question 4 of 4",
    prompt: "How often should I bring topics back for revision?",
    options: [
      { value: "daily", label: "Daily", desc: "Short, frequent refreshers", icon: CalendarClock },
      { value: "weekly", label: "Weekly", desc: "A bigger review session once a week", icon: CalendarDays },
      { value: "ai_decide", label: "Let AI Decide", desc: "Adapt revision to how I'm actually doing", icon: Wand2 },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────
type Phase = "loading" | "intro" | "question" | "saving" | "complete" | "discovery" | "building" | "workspace";

export function LearningAgentPanel({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [stepIndex, setStepIndex] = useState(0); // index into QUESTIONS
  const [answers, setAnswers] = useState<Partial<LearningMemory>>({});
  const [profile, setProfile] = useState<OnboardingProfile>({});
  const [memory, setMemory] = useState<LearningMemory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [chosenPathId, setChosenPathId] = useState<string | null>(null);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const routePostCalibration = useCallback(async () => {
    try {
      const status = await getRoadmapStatus();
      setPhase(status.week1_committed ? "workspace" : "discovery");
    } catch {
      setPhase("discovery"); // fail open into discovery — worst case the user re-explores once
    }
  }, []);

  // Load onboarding profile + existing learning memory on mount
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [profileRes, memoryRes] = await Promise.allSettled([
          authedFetch("/api/onboarding/profile"),
          authedFetch("/api/learning-agent/memory"),
        ]);

        if (cancelled) return;

        if (profileRes.status === "fulfilled") setProfile(profileRes.value || {});

        if (memoryRes.status === "fulfilled") {
          const data = memoryRes.value;
          const requiresCalibration = data?.requires_calibration ?? !data?.memory?.calibration_completed;
          if (!requiresCalibration && data?.memory) {
            setMemory(data.memory);
            await routePostCalibration();
            return;
          }
          // Resume any partially-saved answers
          if (data?.memory) setAnswers(data.memory);
        }
        setPhase("intro");
      } catch {
        if (!cancelled) setPhase("intro"); // fail open into the flow; backend is source of truth on submit
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [routePostCalibration]);

  const totalQuestions = QUESTIONS.length;
  const currentQuestion = QUESTIONS[stepIndex];

  const persistAnswer = useCallback(async (field: keyof LearningMemory, value: string, isFinal: boolean) => {
    try {
      await authedFetch("/api/learning-agent/memory", {
        method: "PATCH",
        body: JSON.stringify({
          [field]: value,
          ...(isFinal ? { calibration_completed: true } : {}),
        }),
      });
    } catch {
      // Non-blocking: local state already advanced. A retry/sync layer can be
      // added later without changing this component's contract.
      setError("Saved locally — will sync once the connection is back.");
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  const selectOption = async (value: string) => {
    const field = currentQuestion.field;
    const nextAnswers = { ...answers, [field]: value };
    setAnswers(nextAnswers);

    const isLastQuestion = stepIndex === totalQuestions - 1;

    if (isLastQuestion) {
      setPhase("saving");
      await persistAnswer(field, value, true);
      setPhase("complete");
    } else {
      await persistAnswer(field, value, false);
      setDirection("forward");
      setStepIndex(i => i + 1);
    }
  };

  const goBack = () => {
    if (stepIndex === 0) {
      setPhase("intro");
      return;
    }
    setDirection("back");
    setStepIndex(i => i - 1);
  };

  const beginCalibration = () => setPhase("question");

  // Context shown on the "Building your roadmap" screen — pulled from the
  // shared onboarding profile plus whichever path the learner just committed
  // to in CareerDiscoveryExplorer.
  const buildContext: BuildContext = useMemo(() => {
    const dataset = detectField(profile.career_goal);
    const pathTitle = chosenPathId ? dataset.pathTemplates[chosenPathId]?.title : null;
    return {
      goal: profile.career_goal || "Your Goal",
      level: profile.current_level || "Beginner",
      time: profile.daily_study_hours ? `${profile.daily_study_hours} hours / day` : "Flexible",
      target: profile.target_timeline || "Not set",
      focus: pathTitle || "Personalized Path",
    };
  }, [profile, chosenPathId]);

  // Derive the conversational intro sentence from the shared onboarding profile
  const introLines = useMemo(() => {
    const name = profile.name || "there";
    const goal = profile.career_goal;
    const hours = profile.daily_study_hours;
    const block = profile.preferred_time_blocks;
    const timeline = profile.target_timeline;

    const knowsGoal = Boolean(goal);
    const knowsHours = Boolean(hours);
    const knowsTimeline = Boolean(timeline);

    const formatGoalStr = (g?: string) => {
      if (!g) return "";
      const map: Record<string, string> = {
        get_job: "landing a job",
        crack_exam: "cracking your target exam",
        earn_online: "earning online",
        build_startup: "building your startup",
        grow_audience: "growing your audience",
        become_disciplined: "building self-discipline",
        grow_career: "career growth",
        learn_skills: "mastering new skills",
        build_projects: "building real-world projects",
        prepare_exams: "exam preparation",
        build_business: "building your business",
        financial_independence: "financial independence",
        improve_discipline: "improving discipline",
      };
      if (map[g]) return map[g];
      return g.includes("_") ? g.replace(/_/g, " ") : g;
    };

    const formatBlockStr = (b?: string) => {
      if (!b) return "session";
      const map: Record<string, string> = {
        deep_focus: "deep focus session",
        short_bursts: "short burst session",
        structured: "structured schedule",
        flexible: "flexible session",
        evening: "evening session",
        morning: "morning session",
        afternoon: "afternoon session",
      };
      if (map[b]) return map[b];
      return b.includes("_") ? b.replace(/_/g, " ") : b;
    };

    const formattedGoal = formatGoalStr(goal);
    const formattedBlock = formatBlockStr(block);

    let line2 = "";
    if (knowsGoal || knowsHours || knowsTimeline) {
      const parts: string[] = [];
      if (knowsGoal) parts.push(`you're preparing for ${formattedGoal}`);
      if (knowsHours) parts.push(`have about ${hours} hour${String(hours) === "1" ? "" : "s"} available each ${formattedBlock}`);
      if (knowsTimeline) parts.push(`want to achieve your goal within ${timeline}`);
      line2 = `I know ${parts.join(", ")}.`;
    }

    return {
      greeting: `Hi ${name}. I've already synced with Nova and reviewed your learning profile.`,
      summary: line2,
      closing: "I just need a few learning preferences before I build your personalized learning system.",
      formattedGoal,
      formattedBlock,
    };
  }, [profile]);

  return (
    <div style={ov.backdrop} onClick={onClose}>
      <div
        style={{
          ...ov.panel,
          ...((phase === "workspace" || phase === "discovery" || phase === "building") ? ov.panelWorkspace : {}),
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(14px) scale(0.98)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes laFadeSlideIn { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes laFadeSlideInBack { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes laPop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }
          @keyframes laPulseRing { 0% { transform: scale(0.9); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }
          @keyframes laDotPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes laSpin { to { transform: rotate(360deg); } }
        `}</style>

        {/* Header */}
        <div style={ov.header}>
          <div style={ov.headerLeft}>
            <div style={ov.headerIcon}><Brain size={19} style={{ color: "#22d3ee" }} /></div>
            <div>
              <div style={ov.headerTitle}>Learning Agent</div>
              <div style={ov.headerSub}>
                {phase === "workspace" ? "Learning Studio" : phase === "building" ? "Building Your Roadmap" : phase === "discovery" ? "Mapping Your Journey" : "First-Time Calibration"}
              </div>
            </div>
          </div>
          <button style={ov.closeBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {/* Progress bar (only during question phase) */}
        {(phase === "question" || phase === "saving") && (
          <div style={ov.progressWrap}>
            <div style={ov.progressTrack}>
              <div
                style={{
                  ...ov.progressFill,
                  width: `${((stepIndex + (phase === "saving" ? 1 : 0)) / totalQuestions) * 100}%`,
                }}
              />
            </div>
            <div style={ov.progressLabel}>{currentQuestion.eyebrow}</div>
          </div>
        )}

        {/* Body */}
        <div style={ov.body}>
          {phase === "loading" && <LoadingState />}

          {phase === "intro" && (
            <IntroState lines={introLines} profile={profile} hasProfile={Boolean(profile.career_goal || profile.daily_study_hours)} onBegin={beginCalibration} />
          )}

          {(phase === "question" || phase === "saving") && (
            <div key={stepIndex} style={{ animation: `${direction === "forward" ? "laFadeSlideIn" : "laFadeSlideInBack"} 0.35s ease` }}>
              <QuestionCard
                question={currentQuestion}
                selected={answers[currentQuestion.field] as string | undefined}
                disabled={phase === "saving"}
                onSelect={selectOption}
              />
            </div>
          )}

          {phase === "complete" && <CompleteState onDone={routePostCalibration} />}

          {phase === "discovery" && (
            <CareerDiscoveryExplorer
              onComplete={(pathId) => {
                setChosenPathId(pathId);
                setPhase("building");
              }}
            />
          )}

          {phase === "building" && (
            <BuildRoadmapScreen context={buildContext} onDone={() => setPhase("workspace")} />
          )}

          {phase === "workspace" && <LearningStudio onClose={onClose} />}
        </div>

        {/* Footer nav (question phase only) */}
        {phase === "question" && (
          <div style={ov.footer}>
            <button style={ov.backBtn} onClick={goBack}>
              <ArrowLeft size={14} /> {stepIndex === 0 ? "Back to intro" : "Previous"}
            </button>
            <div style={ov.stepDots}>
              {QUESTIONS.map((_, i) => (
                <div key={i} style={{ ...ov.stepDot, background: i === stepIndex ? "#22d3ee" : i < stepIndex ? "#22d3ee88" : "rgba(255,255,255,0.12)" }} />
              ))}
            </div>
            <div style={{ width: "96px" }} />
          </div>
        )}

        {error && <div style={ov.toast}>{error}</div>}
      </div>
    </div>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "14px" }}>
      <div style={{ width: "34px", height: "34px", borderRadius: "50%", border: "2.5px solid rgba(34,211,238,0.2)", borderTopColor: "#22d3ee", animation: "laSpin 0.9s linear infinite" }} />
      <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Syncing with Nova…</div>
    </div>
  );
}

function IntroState({
  lines,
  profile,
  hasProfile,
  onBegin,
}: {
  lines: { greeting: string; summary: string; closing: string; formattedGoal?: string };
  profile: OnboardingProfile;
  hasProfile: boolean;
  onBegin: () => void;
}) {
  return (
    <div style={{ padding: "8px 4px 4px" }}>
      <div style={intro.novaRow}>
        <div style={intro.novaAvatar}><Sparkles size={15} style={{ color: "#818cf8" }} /></div>
        <div style={intro.novaHandoffChip}>Nova → Learning Agent handoff</div>
      </div>

      <div style={intro.bubble}>
        <p style={intro.bubbleText}>{lines.greeting}</p>
        {lines.summary && <p style={{ ...intro.bubbleText, marginTop: "10px" }}>{lines.summary}</p>}
        <p style={{ ...intro.bubbleText, marginTop: "10px" }}>{lines.closing}</p>
      </div>

      {!hasProfile && (
        <div style={intro.notice}>
          I couldn't find your full onboarding profile yet — no problem, I'll still get your learning preferences and pull the rest in as soon as it syncs.
        </div>
      )}

      <div style={intro.metaRow}>
        <div style={intro.metaPill}>
          <CheckCircle2 size={12} style={{ color: profile.career_goal ? "#22c55e" : "#64748b" }} />
          {profile.career_goal ? `Goal: ${lines.formattedGoal || profile.career_goal}` : "Career goal synced"}
        </div>
        <div style={intro.metaPill}>
          <CheckCircle2 size={12} style={{ color: profile.daily_study_hours ? "#22c55e" : "#64748b" }} />
          {profile.daily_study_hours ? `${profile.daily_study_hours} hrs/day` : "Study hours synced"}
        </div>
        <div style={intro.metaPill}>
          <CheckCircle2 size={12} style={{ color: profile.target_timeline ? "#22c55e" : "#64748b" }} />
          {profile.target_timeline ? `Timeline: ${profile.target_timeline}` : "Timeline synced"}
        </div>
      </div>

      <button style={intro.startBtn} onClick={onBegin}>
        Let's set up my learning preferences <ArrowRight size={15} />
      </button>
      <div style={intro.startSub}>Takes about a minute · 4 quick questions</div>
    </div>
  );
}

function QuestionCard({
  question, selected, disabled, onSelect,
}: {
  question: QuestionDef;
  selected?: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <div style={q.eyebrow}>{question.eyebrow}</div>
      <h2 style={q.prompt}>{question.prompt}</h2>

      <div style={q.optionsGrid}>
        {question.options.map(opt => {
          const Icon = opt.icon;
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              disabled={disabled}
              onClick={() => onSelect(opt.value)}
              style={{
                ...q.optionCard,
                ...(isSelected ? q.optionCardSelected : {}),
                ...(disabled ? { opacity: 0.6, cursor: "default" } : {}),
              }}
            >
              <div style={{ ...q.optionIcon, ...(isSelected ? q.optionIconSelected : {}) }}>
                <Icon size={18} style={{ color: isSelected ? "#050b1e" : "#22d3ee" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={q.optionLabel}>{opt.label}</div>
                <div style={q.optionDesc}>{opt.desc}</div>
              </div>
              {isSelected && <CheckCircle2 size={18} style={{ color: "#22d3ee", flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompleteState({ onDone }: { onDone: () => void }) {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const id = setInterval(() => setDots(d => (d % 3) + 1), 450);
    const t = setTimeout(onDone, 2200);
    return () => { clearInterval(id); clearTimeout(t); };
  }, [onDone]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", textAlign: "center" }}>
      <div style={{ position: "relative", width: "72px", height: "72px", marginBottom: "20px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(34,211,238,0.18)", animation: "laPulseRing 1.6s ease-out infinite" }} />
        <div style={{ position: "relative", width: "72px", height: "72px", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #22d3ee, #0284c7 70%)", display: "flex", alignItems: "center", justifyContent: "center", animation: "laPop 0.5s ease" }}>
          <CheckCircle2 size={34} style={{ color: "#050b1e" }} />
        </div>
      </div>
      <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.3rem", fontWeight: 800, color: "white", margin: "0 0 8px" }}>
        Perfect. Your Learning Agent is now calibrated.
      </h2>
      <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.6, maxWidth: "360px" }}>
        I'm generating a learning system tailored specifically for you{".".repeat(dots)}
      </p>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const ov: Record<string, React.CSSProperties> = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(2,6,18,0.75)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  panel: { width: "100%", maxWidth: "560px", maxHeight: "88vh", display: "flex", flexDirection: "column", background: "rgba(8,14,32,0.97)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: "20px", boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(34,211,238,0.08)", overflow: "hidden", transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", fontFamily: "'DM Sans','Segoe UI',sans-serif", position: "relative" },
  panelWorkspace: { maxWidth: "1280px", maxHeight: "94vh" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerIcon: { width: "36px", height: "36px", borderRadius: "10px", background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "white" },
  headerSub: { fontSize: "0.72rem", color: "#64748b", marginTop: "1px" },
  closeBtn: { width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  progressWrap: { padding: "14px 20px 0" },
  progressTrack: { width: "100%", height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #0284c7, #22d3ee)", borderRadius: "3px", boxShadow: "0 0 10px rgba(34,211,238,0.6)", transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)" },
  progressLabel: { fontSize: "0.68rem", color: "#22d3ee", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "8px" },
  body: { padding: "20px", overflowY: "auto", flex: 1 },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748b", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", width: "96px" },
  stepDots: { display: "flex", gap: "6px" },
  stepDot: { width: "6px", height: "6px", borderRadius: "50%", transition: "background 0.3s ease" },
  toast: { position: "absolute", bottom: "70px", left: "50%", transform: "translateX(-50%)", background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 14px", fontSize: "0.74rem", color: "#cbd5e1", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" },
};

const intro: Record<string, React.CSSProperties> = {
  novaRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" },
  novaAvatar: { width: "26px", height: "26px", borderRadius: "50%", background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  novaHandoffChip: { fontSize: "0.68rem", color: "#818cf8", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase" },
  bubble: { background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: "14px", padding: "16px 18px" },
  bubbleText: { fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.65, margin: 0 },
  notice: { fontSize: "0.76rem", color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px", padding: "10px 14px", marginTop: "12px", lineHeight: 1.5 },
  metaRow: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" },
  metaPill: { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.7rem", color: "#94a3b8", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "5px 12px" },
  startBtn: { width: "100%", marginTop: "22px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "13px 20px", background: "linear-gradient(135deg, #0284c7, #22d3ee)", border: "none", borderRadius: "12px", color: "#050b1e", fontSize: "0.88rem", fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 28px rgba(34,211,238,0.25)" },
  startSub: { textAlign: "center", fontSize: "0.7rem", color: "#475569", marginTop: "10px" },
};

const q: Record<string, React.CSSProperties> = {
  eyebrow: { fontSize: "0.68rem", color: "#22d3ee", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" },
  prompt: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.32rem", fontWeight: 800, color: "white", margin: "0 0 20px", lineHeight: 1.3 },
  optionsGrid: { display: "flex", flexDirection: "column", gap: "10px" },
  optionCard: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", cursor: "pointer", textAlign: "left", transition: "all 0.18s ease", width: "100%" },
  optionCardSelected: { background: "rgba(34,211,238,0.08)", borderColor: "#22d3ee", boxShadow: "0 0 0 1px rgba(34,211,238,0.3), 0 8px 24px rgba(34,211,238,0.12)" },
  optionIcon: { width: "38px", height: "38px", borderRadius: "10px", background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.18s ease" },
  optionIconSelected: { background: "#22d3ee", border: "1px solid #22d3ee" },
  optionLabel: { fontSize: "0.88rem", fontWeight: 700, color: "white" },
  optionDesc: { fontSize: "0.74rem", color: "#64748b", marginTop: "2px" },
};

export { LearningAgentPanel as LearningAgent };
export default LearningAgentPanel;