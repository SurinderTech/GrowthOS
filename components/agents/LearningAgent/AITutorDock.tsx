"use client";
// components/agents/learning/AITutorDock.tsx
//
// The AI Tutor is docked, not a separate page — it's always visible inside
// the Learning Workspace and carries context (goal, roadmap, current lesson,
// learning preferences) with every message. This component doesn't call an
// LLM directly; it posts to /api/learning-agent/tutor/message and expects
// the backend to assemble that context server-side (see askTutor in
// lib/learning-agent-api.ts) — the UI's job is to feel like a mentor, not a
// generic chat widget.

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, HelpCircle, FileText, Bug, Loader2 } from "lucide-react";
import { askTutor, type TutorMessage, type TutorContext } from "@/lib/learning-agent-api";

const QUICK_ACTIONS: { label: string; icon: any; prompt: string }[] = [
    { label: "Explain again", icon: Sparkles, prompt: "Can you explain this a different way?" },
    { label: "Quiz me", icon: HelpCircle, prompt: "Quiz me on this topic." },
    { label: "Make notes", icon: FileText, prompt: "Make concise notes for this topic." },
    { label: "Debug my code", icon: Bug, prompt: "I have a bug in my code, can you help me debug it?" },
];

export function AITutorDock({ context, compact = false }: { context: TutorContext; compact?: boolean }) {
    const [messages, setMessages] = useState<TutorMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, loading]);

    // Reset the conversation when the lesson context changes — the tutor
    // should feel anchored to what the user is looking at right now.
    useEffect(() => {
        setMessages([]);
    }, [context.topic_id]);

    const send = async (overrideText?: string) => {
        const text = (overrideText ?? input).trim();
        if (!text || loading) return;

        const userMsg: TutorMessage = { id: `u-${Date.now()}`, role: "user", text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const reply = await askTutor(text, context, messages);
            setMessages(prev => [...prev, { id: `t-${Date.now()}`, role: "tutor", text: reply }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ ...t.wrap, ...(compact ? t.wrapCompact : {}) }}>
            <div style={t.header}>
                <div style={t.headerLeft}>
                    <div style={t.avatar}><Bot size={16} style={{ color: "#22d3ee" }} /></div>
                    <div>
                        <div style={t.title}>AI Tutor</div>
                        <div style={t.sub}>
                            {context.topic_title ? `Locked in on “${context.topic_title}”` : "Your personal mentor"}
                        </div>
                    </div>
                </div>
            </div>

            <div ref={scrollRef} style={t.chat}>
                {messages.length === 0 && (
                    <div style={t.empty}>
                        I know your goal, your current roadmap, and where you are in{" "}
                        {context.topic_title || "this lesson"}. Ask me anything about it — or use a shortcut below.
                    </div>
                )}
                {messages.map(m => (
                    <div key={m.id} style={{ ...t.bubble, ...(m.role === "user" ? t.bubbleUser : t.bubbleTutor) }}>
                        {m.text}
                    </div>
                ))}
                {loading && (
                    <div style={{ ...t.bubble, ...t.bubbleTutor, display: "flex", alignItems: "center", gap: "6px" }}>
                        <Loader2 size={12} style={{ animation: "aiTutorSpin 0.9s linear infinite" }} /> Thinking…
                    </div>
                )}
            </div>

            <div style={t.quickRow}>
                {QUICK_ACTIONS.map(qa => {
                    const Icon = qa.icon;
                    return (
                        <button key={qa.label} style={t.quickBtn} onClick={() => send(qa.prompt)} disabled={loading}>
                            <Icon size={12} /> {qa.label}
                        </button>
                    );
                })}
            </div>

            <div style={t.inputRow}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    placeholder="Ask anything about this topic..."
                    style={t.input}
                />
                <button style={t.sendBtn} onClick={() => send()} disabled={loading}>
                    <Send size={14} />
                </button>
            </div>

            <style>{`@keyframes aiTutorSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default AITutorDock;

const t: Record<string, React.CSSProperties> = {
    wrap: { display: "flex", flexDirection: "column", height: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: "16px", overflow: "hidden" },
    wrapCompact: { maxHeight: "440px" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
    headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
    avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    title: { fontFamily: "'Rajdhani', sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "white" },
    sub: { fontSize: "0.68rem", color: "#64748b", marginTop: "1px" },
    chat: { flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", minHeight: "160px" },
    empty: { fontSize: "0.78rem", color: "#64748b", lineHeight: 1.6, padding: "4px 2px" },
    bubble: { fontSize: "0.82rem", padding: "10px 13px", borderRadius: "12px", lineHeight: 1.55, maxWidth: "94%" },
    bubbleUser: { background: "rgba(99,102,241,0.14)", color: "#e0e7ff", alignSelf: "flex-end" },
    bubbleTutor: { background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.12)", color: "#cbd5e1", alignSelf: "flex-start" },
    quickRow: { display: "flex", flexWrap: "wrap", gap: "6px", padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" },
    quickBtn: { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.7rem", color: "#94a3b8", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "5px 10px", cursor: "pointer" },
    inputRow: { display: "flex", gap: "8px", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" },
    input: { flex: 1, padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9px", color: "white", fontSize: "0.8rem", outline: "none", fontFamily: "inherit" },
    sendBtn: { width: "36px", height: "36px", borderRadius: "9px", background: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
};