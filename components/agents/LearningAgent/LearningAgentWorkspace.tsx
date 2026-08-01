"use client";
// components/agents/learning/LearningAgentWorkspace.tsx
//
// "Mission Control" — sections 1, 2, 3, 7 (redirect only), 8.
// This is the home screen the user lands on after calibration. Everything
// revolves around today's mission; the weekly roadmap only ever shows the
// current week, with future weeks visibly locked until this one is done.

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Target, Calendar, Flame, Clock, Lock, CheckCircle2, Circle,
    ChevronRight, Rocket, ListChecks, TrendingUp, Sparkles, ArrowRight,
} from "lucide-react";
import {
    getGoalBoard, getCurrentWeekRoadmap, getTodayMission, toggleMissionItem, getProgressSummary,
    type GoalBoardData, type WeeklyRoadmap, type TodayMission, type DailyMissionItem, type ProgressSummary,
} from "@/lib/learning-agent-api";
import { TopicWorkspace } from "./TopicWorkspace";

export function LearningAgentWorkspace({ onClose }: { onClose: () => void }) {
    const [goalBoard, setGoalBoard] = useState<GoalBoardData | null>(null);
    const [roadmap, setRoadmap] = useState<WeeklyRoadmap | null>(null);
    const [mission, setMission] = useState<TodayMission | null>(null);
    const [progress, setProgress] = useState<ProgressSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [openTopicId, setOpenTopicId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([getGoalBoard(), getCurrentWeekRoadmap(), getTodayMission(), getProgressSummary()]).then(
            ([gb, rm, tm, pr]) => {
                if (cancelled) return;
                setGoalBoard(gb); setRoadmap(rm); setMission(tm); setProgress(pr);
                setLoading(false);
            }
        );
        return () => { cancelled = true; };
    }, []);

    const toggleItem = async (item: DailyMissionItem) => {
        if (!mission) return;
        const next = { ...mission, items: mission.items.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i) };
        setMission(next);
        await toggleMissionItem(item.id, !item.completed);
    };

    if (openTopicId) {
        return (
            <div style={mc.wrap}>
                <TopicWorkspace topicId={openTopicId} onBack={() => setOpenTopicId(null)} />
            </div>
        );
    }

    if (loading || !goalBoard || !roadmap || !mission || !progress) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", gap: "12px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", border: "2.5px solid rgba(34,211,238,0.2)", borderTopColor: "#22d3ee", animation: "mcSpin 0.9s linear infinite" }} />
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Loading Mission Control…</div>
                <style>{`@keyframes mcSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const completedItems = mission.items.filter(i => i.completed).length;

    return (
        <div style={mc.wrap}>
            {/* ── Goal Board ────────────────────────────────────────────────── */}
            <section style={mc.goalBoard}>
                <div style={mc.goalBoardTop}>
                    <div>
                        <div style={mc.eyebrow}><Sparkles size={11} /> Mission Control</div>
                        <h1 style={mc.welcome}>Welcome back, {goalBoard.name}</h1>
                    </div>
                    <div style={mc.completionRing}>
                        <svg viewBox="0 0 60 60" width="56" height="56">
                            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                            <circle
                                cx="30" cy="30" r="26" fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round"
                                strokeDasharray={`${(goalBoard.today_completion_pct / 100) * 163} 163`}
                                transform="rotate(-90 30 30)"
                            />
                        </svg>
                        <div style={mc.completionLabel}>{goalBoard.today_completion_pct}%</div>
                    </div>
                </div>

                <div style={mc.goalGrid}>
                    <GoalStat icon={Target} label="Career Goal" value={goalBoard.career_goal} />
                    <GoalStat icon={TrendingUp} label="Current Stage" value={goalBoard.current_level} />
                    <GoalStat icon={Calendar} label="Target Date" value={goalBoard.target_timeline} />
                    <GoalStat icon={Clock} label="Daily Study" value={`${goalBoard.daily_study_hours}h / day`} />
                    <GoalStat icon={Flame} label="Current Week" value={`Week ${goalBoard.current_week}`} />
                </div>
            </section>

            <div style={mc.twoCol}>
                {/* ── Today's Mission ─────────────────────────────────────────── */}
                <div style={mc.missionCard}>
                    <div style={mc.cardHeader}>
                        <div>
                            <h2 style={mc.cardTitle}>Today's Mission</h2>
                            <p style={mc.cardSub}>{completedItems} of {mission.items.length} complete · {mission.estimated_minutes_total} min total</p>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {mission.items.map(item => (
                            <div key={item.id} style={{ ...mc.missionRow, ...(item.completed ? mc.missionRowDone : {}) }}>
                                <button style={mc.checkBtn} onClick={() => toggleItem(item)}>
                                    {item.completed ? <CheckCircle2 size={18} style={{ color: "#22c55e" }} /> : <Circle size={18} style={{ color: "#334155" }} />}
                                </button>
                                <div
                                    style={{ flex: 1, cursor: item.topic_id ? "pointer" : "default" }}
                                    onClick={() => item.topic_id && setOpenTopicId(item.topic_id)}
                                >
                                    <div style={{ ...mc.missionRowTitle, ...(item.completed ? { textDecoration: "line-through", opacity: 0.45 } : {}) }}>
                                        {item.title}
                                    </div>
                                    <div style={mc.missionRowMeta}>
                                        <MissionTypeBadge type={item.type} /> · {item.estimated_minutes} min
                                    </div>
                                </div>
                                {item.topic_id && <ChevronRight size={16} style={{ color: "#334155", flexShrink: 0 }} />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Progress + Practice Arena ───────────────────────────────── */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={mc.card}>
                        <h2 style={mc.cardTitle}>Progress</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                            <ProgressBar label="Topics" value={progress.topics_completed} total={progress.topics_total} />
                            <ProgressBar label="Missions" value={progress.missions_completed} total={progress.missions_total} />
                            <ProgressBar label="Practice" value={progress.practice_completion_pct} total={100} isPct />
                            <ProgressBar label="Study time today" value={progress.study_minutes_today} total={progress.study_minutes_goal} suffix=" min" />
                        </div>
                    </div>

                    {/* Practice Arena — redirects to the existing dashboard Practice Arena, not rebuilt here */}
                    <Link href="/dashboard/practice" style={{ textDecoration: "none" }}>
                        <div style={mc.practiceCard}>
                            <div style={mc.practiceLeft}>
                                <div style={mc.practiceIcon}><ListChecks size={18} style={{ color: "#f97316" }} /></div>
                                <div>
                                    <div style={mc.practiceTitle}>Practice Arena</div>
                                    <div style={mc.practiceSub}>MCQs, coding, projects & challenges</div>
                                </div>
                            </div>
                            <ArrowRight size={16} style={{ color: "#f97316" }} />
                        </div>
                    </Link>
                </div>
            </div>

            {/* ── AI Weekly Roadmap (current week only) ───────────────────── */}
            <section style={{ ...mc.card, marginTop: "20px" }}>
                <div style={mc.cardHeader}>
                    <div>
                        <h2 style={mc.cardTitle}>Week {roadmap.week_number} · {roadmap.week_theme}</h2>
                        <p style={mc.cardSub}>{roadmap.objectives.join(" · ")}</p>
                    </div>
                    <div style={mc.lockedPill}><Lock size={11} /> Week {roadmap.week_number + 1} unlocks after this week</div>
                </div>

                <div style={mc.dayRow}>
                    {roadmap.days.map(day => (
                        <div key={day.day_label} style={{ ...mc.dayCard, ...(day.is_today ? mc.dayCardToday : {}), ...(day.is_locked ? mc.dayCardLocked : {}) }}>
                            <div style={mc.dayLabel}>{day.day_label}</div>
                            <div style={mc.dayTheme}>{day.theme}</div>
                            {day.topic_titles.length > 0 && (
                                <div style={mc.dayTopics}>
                                    {day.topic_titles.slice(0, 2).map(t => <div key={t} style={mc.dayTopicPill}>{t}</div>)}
                                </div>
                            )}
                            {day.is_today && <div style={mc.todayTag}>Today</div>}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

// ── Small sub-components ───────────────────────────────────────────────

function GoalStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div style={mc.statCard}>
            <div style={mc.statIcon}><Icon size={14} style={{ color: "#22d3ee" }} /></div>
            <div>
                <div style={mc.statLabel}>{label}</div>
                <div style={mc.statValue}>{value}</div>
            </div>
        </div>
    );
}

function MissionTypeBadge({ type }: { type: DailyMissionItem["type"] }) {
    const map = { topic: { label: "Topic", color: "#22d3ee" }, practice: { label: "Practice", color: "#f97316" }, project: { label: "Project", color: "#a855f7" } };
    const cfg = map[type];
    return <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>;
}

function ProgressBar({ label, value, total, isPct, suffix = "" }: { label: string; value: number; total: number; isPct?: boolean; suffix?: string }) {
    const pct = isPct ? value : total > 0 ? Math.min(100, (value / total) * 100) : 0;
    return (
        <div>
            <div style={mc.progressBarHeader}>
                <span>{label}</span>
                <span style={{ color: "#94a3b8" }}>{isPct ? `${value}%` : `${value}${suffix} / ${total}${suffix}`}</span>
            </div>
            <div style={mc.progressTrack}>
                <div style={{ ...mc.progressFill, width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default LearningAgentWorkspace;

// ── Styles ──────────────────────────────────────────────────────────────
const mc: Record<string, React.CSSProperties> = {
    wrap: { padding: "4px 2px" },
    goalBoard: { background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(99,102,241,0.05))", border: "1px solid rgba(34,211,238,0.2)", borderRadius: "18px", padding: "22px 24px", marginBottom: "20px" },
    goalBoardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "18px" },
    eyebrow: { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.68rem", color: "#22d3ee", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" },
    welcome: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.6rem", fontWeight: 800, color: "white", margin: 0 },
    completionRing: { position: "relative", width: "56px", height: "56px", flexShrink: 0 },
    completionLabel: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, color: "white" },
    goalGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" },
    statCard: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "10px 12px" },
    statIcon: { width: "28px", height: "28px", borderRadius: "8px", background: "rgba(34,211,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    statLabel: { fontSize: "0.63rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" },
    statValue: { fontSize: "0.82rem", color: "white", fontWeight: 700, marginTop: "2px" },

    twoCol: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px" },
    card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px" },
    missionCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px" },
    cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px", flexWrap: "wrap" },
    cardTitle: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "white", margin: 0 },
    cardSub: { fontSize: "0.76rem", color: "#64748b", margin: "3px 0 0" },

    missionRow: { display: "flex", alignItems: "center", gap: "12px", padding: "11px 12px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px" },
    missionRowDone: { background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.12)" },
    checkBtn: { background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0, padding: 0 },
    missionRowTitle: { fontSize: "0.86rem", fontWeight: 600, color: "white" },
    missionRowMeta: { fontSize: "0.7rem", color: "#64748b", marginTop: "2px" },

    progressBarHeader: { display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "#cbd5e1", marginBottom: "5px" },
    progressTrack: { width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" },
    progressFill: { height: "100%", background: "linear-gradient(90deg, #0284c7, #22d3ee)", borderRadius: "3px" },

    practiceCard: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "14px", cursor: "pointer" },
    practiceLeft: { display: "flex", alignItems: "center", gap: "12px" },
    practiceIcon: { width: "36px", height: "36px", borderRadius: "10px", background: "rgba(249,115,22,0.12)", display: "flex", alignItems: "center", justifyContent: "center" },
    practiceTitle: { fontSize: "0.88rem", fontWeight: 700, color: "white" },
    practiceSub: { fontSize: "0.72rem", color: "#64748b", marginTop: "2px" },

    lockedPill: { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.68rem", color: "#818cf8", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "16px", padding: "5px 11px", fontWeight: 600, whiteSpace: "nowrap" },

    dayRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" },
    dayCard: { position: "relative", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "10px 10px 12px", minHeight: "100px" },
    dayCardToday: { background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.35)" },
    dayCardLocked: { opacity: 0.45 },
    dayLabel: { fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" },
    dayTheme: { fontSize: "0.76rem", color: "white", fontWeight: 600, marginTop: "4px", lineHeight: 1.3 },
    dayTopics: { display: "flex", flexDirection: "column", gap: "3px", marginTop: "8px" },
    dayTopicPill: { fontSize: "0.62rem", color: "#94a3b8", background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "2px 6px", width: "fit-content" },
    todayTag: { position: "absolute", top: "8px", right: "8px", fontSize: "0.58rem", color: "#050b1e", background: "#22d3ee", fontWeight: 800, borderRadius: "6px", padding: "2px 6px" },
};