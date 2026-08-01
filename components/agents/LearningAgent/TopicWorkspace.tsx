"use client";
// components/agents/learning/TopicWorkspace.tsx
//
// Section 4 (Learning Workspace) + Section 6 (Resource Engine).
// Everything needed to learn one topic lives here — no tab switching to a
// separate resources page or a separate practice page. The AI Tutor is
// docked on the side for the whole session (Section 5).

import { useState, useEffect, useCallback } from "react";
import {
    ArrowLeft, BookOpen, Code2, ListChecks, StickyNote, CheckCircle2, Circle,
    Video, FileText, Link2, Rocket, Clock, Loader2,
} from "lucide-react";
import {
    getTopic, getTopicResources, saveTopicNotes, markTopicComplete,
    type TopicDetail, type TopicResources,
} from "@/lib/learning-agent-api";
import { AITutorDock } from "./AITutorDock";

type Tab = "explanation" | "examples" | "code" | "practice" | "notes";

const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "explanation", label: "Explanation", icon: BookOpen },
    { id: "examples", label: "Examples", icon: ListChecks },
    { id: "code", label: "Code", icon: Code2 },
    { id: "practice", label: "Practice", icon: ListChecks },
    { id: "notes", label: "Notes", icon: StickyNote },
];

export function TopicWorkspace({ topicId, onBack }: { topicId: string; onBack: () => void }) {
    const [topic, setTopic] = useState<TopicDetail | null>(null);
    const [resources, setResources] = useState<TopicResources | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("explanation");
    const [loading, setLoading] = useState(true);
    const [notesDraft, setNotesDraft] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);
    const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([getTopic(topicId), getTopicResources(topicId)]).then(([t, r]) => {
            if (cancelled) return;
            setTopic(t);
            setNotesDraft(t.notes || "");
            setResources(r);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [topicId]);

    const persistNotes = useCallback((value: string) => {
        setNotesDraft(value);
        setSavingNotes(true);
        saveTopicNotes(topicId, value).finally(() => setSavingNotes(false));
    }, [topicId]);

    const toggleComplete = async () => {
        if (!topic) return;
        const next = !topic.completed;
        setCompleting(true);
        setTopic({ ...topic, completed: next });
        await markTopicComplete(topicId, next);
        setCompleting(false);
    };

    if (loading || !topic) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "12px" }}>
                <Loader2 size={26} style={{ color: "#22d3ee", animation: "topicSpin 0.9s linear infinite" }} />
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Opening lesson…</div>
                <style>{`@keyframes topicSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={tw.grid}>
            {/* Main lesson column */}
            <div style={tw.main}>
                <button style={tw.backBtn} onClick={onBack}><ArrowLeft size={14} /> Today's Mission</button>

                <div style={tw.titleRow}>
                    <div>
                        <div style={tw.weekTag}>Week {topic.week_number}</div>
                        <h1 style={tw.title}>{topic.title}</h1>
                    </div>
                    <div style={tw.titleRight}>
                        <div style={tw.duration}><Clock size={13} /> {topic.estimated_minutes} min</div>
                        <button style={{ ...tw.completeBtn, ...(topic.completed ? tw.completeBtnDone : {}) }} onClick={toggleComplete} disabled={completing}>
                            {topic.completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                            {topic.completed ? "Completed" : "Mark as Completed"}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={tw.tabRow}>
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...tw.tabBtn, ...(active ? tw.tabBtnActive : {}) }}>
                                <Icon size={14} /> {tab.label}
                                {tab.id === "practice" && (
                                    <span style={tw.tabBadge}>{answeredQuestions.size}/{topic.practice_questions.length}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div style={tw.tabBody}>
                    {activeTab === "explanation" && (
                        <div style={tw.proseCard}>
                            <p style={tw.prose}>{topic.explanation_md}</p>
                        </div>
                    )}

                    {activeTab === "examples" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {topic.examples.map((ex, i) => (
                                <div key={i} style={tw.proseCard}>
                                    <div style={tw.exampleTitle}>{ex.title}</div>
                                    <pre style={tw.codeBlock}>{ex.body}</pre>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "code" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {(topic.code_snippets || []).map((snip, i) => {
                                const codeStr = typeof snip.code === "string" 
                                    ? snip.code 
                                    : typeof snip.code === "object" && (snip.code as any)?.code 
                                    ? (snip.code as any).code 
                                    : JSON.stringify(snip.code || "");
                                return (
                                    <div key={i} style={tw.proseCard}>
                                        {snip.caption && <div style={tw.exampleTitle}>{snip.caption}</div>}
                                        <div style={tw.codeLang}>{snip.language || "code"}</div>
                                        <pre style={tw.codeBlock}>{codeStr}</pre>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === "practice" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {topic.practice_questions.map(pq => {
                                const answered = answeredQuestions.has(pq.id);
                                return (
                                    <div key={pq.id} style={tw.proseCard}>
                                        <div style={tw.questionKind}>{pq.kind.replace("_", " ")}</div>
                                        <div style={{ ...tw.prose, marginBottom: pq.options ? "10px" : 0 }}>{pq.prompt}</div>
                                        {pq.options && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                {pq.options.map(opt => (
                                                    <button
                                                        key={opt}
                                                        style={tw.optionRow}
                                                        onClick={() => setAnsweredQuestions(prev => new Set(prev).add(pq.id))}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {!pq.options && (
                                            <button
                                                style={tw.smallGhostBtn}
                                                onClick={() => setAnsweredQuestions(prev => new Set(prev).add(pq.id))}
                                            >
                                                {answered ? "Marked as attempted ✓" : "Mark as attempted"}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === "notes" && (
                        <div style={tw.proseCard}>
                            <textarea
                                value={notesDraft}
                                onChange={e => persistNotes(e.target.value)}
                                placeholder="Jot down anything worth remembering about this topic..."
                                style={tw.notesArea}
                            />
                            <div style={tw.notesStatus}>{savingNotes ? "Saving…" : "Saved"}</div>
                        </div>
                    )}
                </div>

                {/* Resource Engine */}
                {resources && <ResourceEngine resources={resources} />}
            </div>

            {/* Docked AI Tutor */}
            <div style={tw.tutorCol}>
                <AITutorDock context={{ topic_id: topic.id, topic_title: topic.title }} />
            </div>
        </div>
    );
}

function ResourceEngine({ resources }: { resources: TopicResources }) {
    const items: { label: string; icon: any; item?: { title: string; url: string; source: string; duration?: string } }[] = [
        { label: "Best Video", icon: Video, item: resources.best_video },
        { label: "Best Article", icon: FileText, item: resources.best_article },
        { label: "Official Docs", icon: Link2, item: resources.official_docs },
        { label: "Project", icon: Rocket, item: resources.project },
    ].filter(x => x.item);

    if (items.length === 0) return null;

    return (
        <div style={{ marginTop: "22px" }}>
            <div style={tw.resourceHeader}>Resources for you — matched to your learning style</div>
            <div style={tw.resourceGrid}>
                {items.map(({ label, icon: Icon, item }) => (
                    <a key={label} href={item!.url} target="_blank" rel="noreferrer" style={tw.resourceCard}>
                        <div style={tw.resourceIcon}><Icon size={15} style={{ color: "#22d3ee" }} /></div>
                        <div style={{ minWidth: 0 }}>
                            <div style={tw.resourceLabel}>{label}</div>
                            <div style={tw.resourceTitle}>{item!.title}</div>
                            <div style={tw.resourceSource}>{item!.source}{item!.duration ? ` · ${item!.duration}` : ""}</div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}

export default TopicWorkspace;

const tw: Record<string, React.CSSProperties> = {
    grid: { display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" },
    main: { minWidth: 0 },
    backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748b", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "14px" },
    titleRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "18px", flexWrap: "wrap" },
    weekTag: { fontSize: "0.68rem", color: "#22d3ee", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" },
    title: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.6rem", fontWeight: 800, color: "white", margin: 0 },
    titleRight: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
    duration: { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.76rem", color: "#64748b" },
    completeBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" },
    completeBtnDone: { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" },
    tabRow: { display: "flex", gap: "6px", flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px", marginBottom: "18px" },
    tabBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 13px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "9px", color: "#64748b", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" },
    tabBtnActive: { background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee" },
    tabBadge: { fontSize: "0.65rem", background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: "8px", marginLeft: "2px" },
    tabBody: { minHeight: "180px" },
    proseCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "18px 20px" },
    prose: { fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.75, margin: 0 },
    exampleTitle: { fontSize: "0.8rem", fontWeight: 700, color: "white", marginBottom: "8px" },
    codeBlock: { background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "12px 14px", fontSize: "0.78rem", color: "#a5f3fc", fontFamily: "'Fira Code', monospace", overflowX: "auto", whiteSpace: "pre" },
    codeLang: { fontSize: "0.65rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" },
    questionKind: { fontSize: "0.65rem", color: "#818cf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" },
    optionRow: { textAlign: "left", padding: "9px 13px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9px", color: "#cbd5e1", fontSize: "0.82rem", cursor: "pointer" },
    smallGhostBtn: { padding: "7px 13px", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: "8px", color: "#22d3ee", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" },
    notesArea: { width: "100%", minHeight: "160px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px 14px", color: "#e2e8f0", fontSize: "0.84rem", lineHeight: 1.6, outline: "none", fontFamily: "inherit", resize: "vertical" },
    notesStatus: { fontSize: "0.68rem", color: "#475569", marginTop: "8px", textAlign: "right" },
    resourceHeader: { fontSize: "0.72rem", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px" },
    resourceGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
    resourceCard: { display: "flex", gap: "10px", padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", textDecoration: "none" },
    resourceIcon: { width: "30px", height: "30px", borderRadius: "8px", background: "rgba(34,211,238,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    resourceLabel: { fontSize: "0.64rem", color: "#22d3ee", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" },
    resourceTitle: { fontSize: "0.8rem", color: "white", fontWeight: 600, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    resourceSource: { fontSize: "0.68rem", color: "#64748b", marginTop: "2px" },
    tutorCol: { position: "sticky", top: 0, height: "calc(100vh - 220px)", minHeight: "480px" },
};