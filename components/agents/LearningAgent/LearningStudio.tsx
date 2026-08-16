"use client";
// components/agents/LearningAgent/LearningStudio.tsx
//
// The learner's permanent home once Week 1 exists — replaces the older
// LearningAgentWorkspace ("Mission Control") as the target of phase
// "workspace" in LearningAgentPanel.tsx. Three columns: Journey (left),
// Learning Studio chat with Nova (center), Live Tutor + Resources (right),
// plus a progress strip along the bottom. Pulls real data through the same
// lib/learning-agent-api.ts functions the rest of the agent already uses.

import { useEffect, useRef, useState } from "react";
import {
  Target, Lock, Check, ChevronRight, Send, Sparkles, Loader2,
  PlaySquare, BookOpen, GraduationCap, FileText, Flame, ArrowRight, ExternalLink,
} from "lucide-react";
import {
  getGoalBoard, getCurrentWeekRoadmap, getTodayMission, getProgressSummary,
  getTopicResources, askTutor,
  type GoalBoardData, type WeeklyRoadmap, type TodayMission, type ProgressSummary,
  type TopicResources, type TutorMessage, type TutorContext,
} from "@/lib/learning-agent-api";
import { LiveTutorPanel } from "./LiveTutorPanel";

const JOURNEY_PHASES = ["Foundation", "Core Skills", "Practice", "Projects", "Interview Ready"];

const QUICK_PROMPTS = [
  { label: "Explain differently", prompt: "Can you explain that a different way?" },
  { label: "Give me a hint", prompt: "Give me a hint instead of the full answer." },
  { label: "Show me visually", prompt: "Can you show me this visually, step by step?" },
  { label: "Quiz me", prompt: "Quiz me on this topic." },
];

export function LearningStudio({ onClose }: { onClose: () => void }) {
  const [goalBoard, setGoalBoard] = useState<GoalBoardData | null>(null);
  const [roadmap, setRoadmap] = useState<WeeklyRoadmap | null>(null);
  const [mission, setMission] = useState<TodayMission | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [resources, setResources] = useState<TopicResources | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getGoalBoard(), getCurrentWeekRoadmap(), getTodayMission(), getProgressSummary()]).then(
      async ([gb, rm, tm, pr]) => {
        if (cancelled) return;
        setGoalBoard(gb); setRoadmap(rm); setMission(tm); setProgress(pr);
        const activeTopicId = tm.items.find((i) => i.type === "topic" && !i.completed)?.topic_id;
        if (activeTopicId) setResources(await getTopicResources(activeTopicId));
        setLoading(false);
      }
    );
    return () => { cancelled = true; };
  }, []);

  if (loading || !goalBoard || !roadmap || !mission || !progress) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "110px 20px", gap: "12px" }}>
        <Loader2 size={26} style={{ color: "#22d3ee", animation: "lsSpin 0.9s linear infinite" }} />
        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Loading your Learning Studio…</div>
        <style>{`@keyframes lsSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const activeItem = mission.items.find((i) => i.type === "topic" && !i.completed) || mission.items[0];
  const context: TutorContext = { topic_id: activeItem?.topic_id, topic_title: activeItem?.title };
  const todayIndex = roadmap.days.findIndex((d) => d.is_today);

  return (
    <div style={w.wrap}>
      <div style={w.grid}>
        <JourneyColumn goalBoard={goalBoard} roadmap={roadmap} todayIndex={todayIndex} />
        <StudioChat context={context} focusLabel={activeItem?.title || roadmap.week_theme} />
        <div style={w.rightCol}>
          <LiveTutorPanel context={context} />
          <ResourcesCard resources={resources} />
          <PracticeCTA />
        </div>
      </div>
      <ProgressStrip progress={progress} goalBoard={goalBoard} />
    </div>
  );
}

export default LearningStudio;

/* ── Left: Journey ─────────────────────────────────────────────────── */

function JourneyColumn({ goalBoard, roadmap, todayIndex }: { goalBoard: GoalBoardData; roadmap: WeeklyRoadmap; todayIndex: number }) {
  return (
    <div style={w.journeyCol}>
      <div style={w.journeyHeader}>Your Journey</div>
      <div style={w.journeyGoalRow}>
        <div style={w.journeyGoalIcon}><Target size={13} style={{ color: "#818cf8" }} /></div>
        <div>
          <div style={w.journeyGoalLabel}>Goal</div>
          <div style={w.journeyGoalValue}>{goalBoard.career_goal}</div>
        </div>
      </div>

      <div style={w.phaseList}>
        {JOURNEY_PHASES.map((phase, i) => (
          <div key={phase} style={{ ...w.phaseRow, ...(i === 0 ? w.phaseRowActive : {}) }}>
            <div style={{ ...w.phaseNum, ...(i === 0 ? w.phaseNumActive : {}) }}>{String(i + 1).padStart(2, "0")}</div>
            <div>
              <div style={{ ...w.phaseLabel, ...(i === 0 ? {} : w.phaseLabelLocked) }}>{phase}</div>
              <div style={{ ...w.phaseStatus, ...(i === 0 ? w.phaseStatusActive : {}) }}>{i === 0 ? "In Progress" : "Locked"}</div>
            </div>
            {i !== 0 && <Lock size={12} style={{ color: "#334155", marginLeft: "auto" }} />}
          </div>
        ))}
      </div>

      <div style={w.weekHeader}>
        <span>Week {roadmap.week_number} · {roadmap.week_theme}</span>
      </div>
      <div style={w.weekProgressTrack}><div style={{ ...w.weekProgressFill, width: "35%" }} /></div>

      <div style={w.topicList}>
        {roadmap.days.map((d, i) => {
          const state = i < todayIndex ? "done" : i === todayIndex ? "active" : "locked";
          return (
            <div key={d.day_label + i} style={w.topicRow}>
              <div style={{ ...w.topicDot, ...(state === "done" ? w.topicDotDone : state === "active" ? w.topicDotActive : {}) }}>
                {state === "done" && <Check size={10} style={{ color: "#0b1120" }} />}
              </div>
              <span style={{ ...w.topicLabel, ...(state === "locked" ? w.topicLabelLocked : {}) }}>{d.theme}</span>
            </div>
          );
        })}
      </div>

      <button style={w.viewRoadmapBtn}>View Full Roadmap <ChevronRight size={13} /></button>
    </div>
  );
}

/* ── Center: Learning Studio chat ─────────────────────────────────── */

function StudioChat({ context, focusLabel }: { context: TutorContext; focusLabel: string }) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const reply = await askTutor(text, context, messages);
      setMessages((prev) => [...prev, { id: `t-${Date.now()}`, role: "tutor", text: reply }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={w.studio}>
      <div style={w.studioHeader}>
        <div style={w.studioTitle}>Learning Studio</div>
        <div style={w.studioSub}>Learn with Nova · Get help, understand deeply, and master any topic.</div>
        <div style={w.focusChip}>Current Focus: <strong style={{ color: "white" }}>{focusLabel}</strong></div>
      </div>

      <div ref={scrollRef} style={w.chatBody}>
        {messages.length === 0 && (
          <div style={w.chatEmpty}>
            <Sparkles size={16} style={{ color: "#818cf8", marginBottom: "8px" }} />
            <div>I know your goal, your roadmap, and where you are in <strong style={{ color: "#cbd5e1" }}>{focusLabel}</strong>. Ask me anything, or use a shortcut below.</div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{ ...w.msgBubble, ...(m.role === "user" ? w.msgUser : w.msgTutor) }}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ ...w.msgBubble, ...w.msgTutor, display: "flex", alignItems: "center", gap: "8px" }}>
            <Loader2 size={13} style={{ color: "#22d3ee", animation: "lsSpin 0.9s linear infinite" }} /> Thinking…
          </div>
        )}
      </div>

      <div style={w.quickRow}>
        {QUICK_PROMPTS.map((qp) => (
          <button key={qp.label} style={w.quickBtn} onClick={() => send(qp.prompt)} disabled={loading}>
            {qp.label}
          </button>
        ))}
      </div>

      <div style={w.inputWrap}>
        <input
          style={w.input}
          placeholder={`Ask Nova about ${focusLabel}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button style={w.sendBtn} onClick={() => send()} disabled={loading || !input.trim()}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Right: Resources Card ────────────────────────────────────────── */

function ResourcesCard({ resources }: { resources: TopicResources | null }) {
  if (!resources) return null;
  const items: { title: string; url: string; platform?: string; type: string }[] = [];
  if (resources.best_video) {
    items.push({ title: resources.best_video.title, url: resources.best_video.url, platform: resources.best_video.source, type: "video" });
  }
  if (resources.best_article) {
    items.push({ title: resources.best_article.title, url: resources.best_article.url, platform: resources.best_article.source, type: "article" });
  }
  if (resources.official_docs) {
    items.push({ title: resources.official_docs.title, url: resources.official_docs.url, platform: resources.official_docs.source, type: "documentation" });
  }
  if (resources.more) {
    resources.more.forEach((item) => {
      items.push({ title: item.title, url: item.url, platform: item.source, type: "article" });
    });
  }

  return (
    <div style={w.resCard}>
      <div style={w.resHeader}>
        <BookOpen size={14} style={{ color: "#22d3ee" }} />
        <span style={w.resTitle}>Curated Resources</span>
      </div>
      <div style={w.resList}>
        {items.slice(0, 3).map((res, i) => (
          <a key={res.url + i} href={res.url} target="_blank" rel="noopener noreferrer" style={w.resItem}>
            <div style={w.resIcon}>
              {res.type === "video" ? <PlaySquare size={13} style={{ color: "#f43f5e" }} /> : <FileText size={13} style={{ color: "#38bdf8" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={w.resLabel}>{res.title}</div>
              <div style={w.resPlatform}>{res.platform || res.type}</div>
            </div>
            <ExternalLink size={12} style={{ color: "#64748b" }} />
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Right: Practice CTA ─────────────────────────────────────────── */

function PracticeCTA() {
  return (
    <div style={w.practiceCard}>
      <div style={w.practiceHeader}>
        <GraduationCap size={16} style={{ color: "#a78bfa" }} />
        <div style={w.practiceTitle}>Practice Arena</div>
      </div>
      <div style={w.practiceSub}>Test your knowledge with hands-on exercises tailored to your level.</div>
      <button style={w.practiceBtn}>
        Start Practice Session <ArrowRight size={13} />
      </button>
    </div>
  );
}

/* ── Bottom: Progress Strip ────────────────────────────────────────── */

function ProgressStrip({ progress, goalBoard }: { progress: ProgressSummary; goalBoard: GoalBoardData }) {
  const hoursToday = Math.round((progress.study_minutes_today / 60) * 10) / 10;
  return (
    <div style={w.stripWrap}>
      <div style={w.stripItem}>
        <div style={w.stripIcon}><Target size={14} style={{ color: "#22d3ee" }} /></div>
        <div>
          <div style={w.stripLabel}>Overall Progress</div>
          <div style={w.stripValue}>{progress.topics_completed} / {progress.topics_total} topics</div>
        </div>
      </div>

      <div style={w.stripItem}>
        <div style={w.stripIcon}><Flame size={14} style={{ color: "#f97316" }} /></div>
        <div>
          <div style={w.stripLabel}>Missions Completed</div>
          <div style={w.stripValue}>{progress.missions_completed} / {progress.missions_total}</div>
        </div>
      </div>

      <div style={w.stripItem}>
        <div style={w.stripIcon}><BookOpen size={14} style={{ color: "#a78bfa" }} /></div>
        <div>
          <div style={w.stripLabel}>Study Today</div>
          <div style={w.stripValue}>{hoursToday}h ({progress.study_minutes_today}/{progress.study_minutes_goal}m)</div>
        </div>
      </div>

      <div style={w.stripItem}>
        <div style={w.stripIcon}><Sparkles size={14} style={{ color: "#34d399" }} /></div>
        <div>
          <div style={w.stripLabel}>Target Timeline</div>
          <div style={w.stripValue}>{goalBoard.target_timeline}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────────────── */

const w: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: "16px", padding: "4px" },
  grid: { display: "grid", gridTemplateColumns: "240px 1fr 310px", gap: "18px", alignItems: "start" },

  journeyCol: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" },
  journeyHeader: { fontSize: "0.78rem", color: "white", fontWeight: 700, letterSpacing: "0.04em" },
  journeyGoalRow: { display: "flex", alignItems: "center", gap: "8px", background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: "10px", padding: "8px 10px" },
  journeyGoalIcon: { width: "24px", height: "24px", borderRadius: "6px", background: "rgba(129,140,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center" },
  journeyGoalLabel: { fontSize: "0.6rem", color: "#818cf8", fontWeight: 700, textTransform: "uppercase" },
  journeyGoalValue: { fontSize: "0.74rem", color: "white", fontWeight: 600 },

  phaseList: { display: "flex", flexDirection: "column", gap: "6px" },
  phaseRow: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "8px", background: "rgba(255,255,255,0.01)" },
  phaseRowActive: { background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)" },
  phaseNum: { fontSize: "0.64rem", fontWeight: 700, color: "#64748b" },
  phaseNumActive: { color: "#22d3ee" },
  phaseLabel: { fontSize: "0.74rem", color: "white", fontWeight: 600 },
  phaseLabelLocked: { color: "#475569" },
  phaseStatus: { fontSize: "0.6rem", color: "#64748b" },
  phaseStatusActive: { color: "#22d3ee", fontWeight: 600 },

  weekHeader: { fontSize: "0.72rem", color: "#cbd5e1", fontWeight: 600, marginTop: "6px" },
  weekProgressTrack: { height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" },
  weekProgressFill: { height: "100%", background: "linear-gradient(90deg,#0284c7,#22d3ee)" },

  topicList: { display: "flex", flexDirection: "column", gap: "6px" },
  topicRow: { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.72rem" },
  topicDot: { width: "14px", height: "14px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" },
  topicDotDone: { background: "#22c55e", border: "1px solid #22c55e" },
  topicDotActive: { border: "1.5px solid #22d3ee", boxShadow: "0 0 8px rgba(34,211,238,0.4)" },
  topicLabel: { color: "#e2e8f0" },
  topicLabelLocked: { color: "#475569" },
  viewRoadmapBtn: { background: "none", border: "none", color: "#22d3ee", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: 0, marginTop: "4px" },

  studio: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", height: "540px" },
  studioHeader: { borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px", marginBottom: "12px" },
  studioTitle: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.15rem", fontWeight: 800, color: "white" },
  studioSub: { fontSize: "0.72rem", color: "#64748b", marginTop: "2px" },
  focusChip: { marginTop: "8px", display: "inline-block", fontSize: "0.68rem", color: "#22d3ee", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: "6px", padding: "3px 8px" },

  chatBody: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" },
  chatEmpty: { fontSize: "0.78rem", color: "#64748b", textAlign: "center", padding: "30px 10px", background: "rgba(255,255,255,0.01)", borderRadius: "10px", border: "1px border rgba(255,255,255,0.04)" },
  msgBubble: { padding: "10px 14px", borderRadius: "12px", fontSize: "0.8rem", lineHeight: 1.5, maxWidth: "85%" },
  msgUser: { background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.25)", color: "white", alignSelf: "flex-end" },
  msgTutor: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", alignSelf: "flex-start" },

  quickRow: { display: "flex", gap: "6px", flexWrap: "wrap", margin: "10px 0" },
  quickBtn: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "5px 9px", fontSize: "0.68rem", color: "#94a3b8", cursor: "pointer", transition: "all 0.15s ease" },

  inputWrap: { display: "flex", gap: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "6px 10px" },
  input: { flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: "0.8rem" },
  sendBtn: { background: "linear-gradient(135deg, #0284c7, #22d3ee)", border: "none", borderRadius: "8px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", color: "#050b1e", cursor: "pointer" },

  rightCol: { display: "flex", flexDirection: "column", gap: "14px" },

  resCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "14px" },
  resHeader: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" },
  resTitle: { fontSize: "0.78rem", color: "white", fontWeight: 700 },
  resList: { display: "flex", flexDirection: "column", gap: "8px" },
  resItem: { display: "flex", alignItems: "center", gap: "8px", padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" },
  resIcon: { width: "26px", height: "26px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  resLabel: { fontSize: "0.74rem", color: "white", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  resPlatform: { fontSize: "0.64rem", color: "#64748b", textTransform: "capitalize" },

  practiceCard: { background: "linear-gradient(135deg, rgba(167,139,250,0.1), rgba(129,140,248,0.05))", border: "1px solid rgba(167,139,250,0.25)", borderRadius: "14px", padding: "14px" },
  practiceHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" },
  practiceTitle: { fontSize: "0.82rem", color: "white", fontWeight: 700 },
  practiceSub: { fontSize: "0.7rem", color: "#cbd5e1", lineHeight: 1.4, marginBottom: "10px" },
  practiceBtn: { width: "100%", background: "linear-gradient(135deg, #818cf8, #a78bfa)", border: "none", borderRadius: "8px", padding: "8px", color: "white", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" },

  stripWrap: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "12px 16px" },
  stripItem: { display: "flex", alignItems: "center", gap: "10px" },
  stripIcon: { width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" },
  stripLabel: { fontSize: "0.64rem", color: "#64748b", fontWeight: 600 },
  stripValue: { fontSize: "0.78rem", color: "white", fontWeight: 700, marginTop: "1px" },
};
