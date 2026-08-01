"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { PanelShell, sharedStyles as shared } from "../PanelShell";
import { startInterview, answerInterviewQuestion, completeInterview, type InterviewSession } from "@/lib/agents-api";

export function InterviewAgent({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState("");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, { feedback: string; score: number }>>({});
  const [finishing, setFinishing] = useState(false);

  const handleStart = async () => {
    if (!role.trim()) return;
    setStarting(true);
    try {
      const s = await startInterview(role);
      setSession(s);
      setCurrent(0);
      setFeedback({});
    } catch {} finally { setStarting(false); }
  };

  const handleSubmitAnswer = async () => {
    if (!session || !answer.trim()) return;
    setSubmitting(true);
    try {
      const result = await answerInterviewQuestion(session.id, current, answer);
      setFeedback(prev => ({ ...prev, [current]: result }));
      setAnswer("");
    } catch {} finally { setSubmitting(false); }
  };

  const handleFinish = async () => {
    if (!session) return;
    setFinishing(true);
    try {
      const completed = await completeInterview(session.id);
      setSession(completed);
    } catch {} finally { setFinishing(false); }
  };

  return (
    <PanelShell
      icon={<Mic size={22} style={{ color: "#f472b6" }} />}
      title="Interview Agent Workspace"
      sub="AI-generated mock interviews with per-answer feedback"
      accent="#f472b6"
      onClose={onClose}
    >
      {!session ? (
        <div>
          <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "10px" }}>What role are you interviewing for?</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input style={{ ...shared.input, flex: 1 }} placeholder="e.g. Frontend Developer" value={role} onChange={e => setRole(e.target.value)} onKeyDown={e => e.key === "Enter" && handleStart()} />
            <button style={{ ...shared.primaryBtn("#f472b6"), opacity: starting || !role.trim() ? 0.5 : 1 }} disabled={starting || !role.trim()} onClick={handleStart}>
              {starting ? "Preparing..." : "Start Interview"}
            </button>
          </div>
        </div>
      ) : session.status === "completed" ? (
        <div>
          <div style={{ padding: "16px", background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.25)", borderRadius: "12px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Overall Score</span>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f472b6" }}>{session.overall_score}/100</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.6 }}>{session.overall_feedback}</p>
          </div>
          <button style={shared.primaryBtn("#f472b6")} onClick={() => setSession(null)}>Start a new interview</button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "8px" }}>Question {current + 1} of {session.questions.length} · {session.role}</div>
          <div style={{ padding: "14px", background: "rgba(244,114,182,0.06)", border: "1px solid rgba(244,114,182,0.18)", borderRadius: "10px", fontSize: "0.86rem", color: "white", marginBottom: "10px" }}>
            {session.questions[current]}
          </div>
          <textarea style={shared.textarea} rows={4} placeholder="Type your answer..." value={answer} onChange={e => setAnswer(e.target.value)} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button style={{ ...shared.primaryBtn("#f472b6"), opacity: submitting || !answer.trim() ? 0.5 : 1 }} disabled={submitting || !answer.trim()} onClick={handleSubmitAnswer}>
              {submitting ? "Evaluating..." : "Submit Answer"}
            </button>
            {current < session.questions.length - 1 && (
              <button style={{ ...shared.primaryBtn("#818cf8") }} onClick={() => { setCurrent(c => c + 1); setAnswer(""); }}>Next question →</button>
            )}
            <button style={{ ...shared.primaryBtn("#22c55e"), opacity: finishing || Object.keys(feedback).length === 0 ? 0.5 : 1 }} disabled={finishing || Object.keys(feedback).length === 0} onClick={handleFinish}>
              {finishing ? "Wrapping up..." : "Finish Interview"}
            </button>
          </div>
          {feedback[current] && (
            <div style={{ marginTop: "12px", padding: "12px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#22c55e", marginBottom: "4px" }}>SCORE: {feedback[current].score}/100</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.6 }}>{feedback[current].feedback}</div>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  );
}

export const InterviewAgentPanel = InterviewAgent;
export default InterviewAgent;
