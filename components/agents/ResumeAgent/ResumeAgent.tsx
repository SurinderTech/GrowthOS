"use client";

import { useState, useEffect } from "react";
import { Sparkles, FileText } from "lucide-react";
import { PanelShell, sharedStyles as shared } from "../PanelShell";
import { getResumeSummary, analyzeResume, type ResumeAnalysis } from "@/lib/agents-api";

export function ResumeAgent({ onClose }: { onClose: () => void }) {
  const [resumeText, setResumeText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [current, setCurrent] = useState<ResumeAnalysis | null>(null);
  const [history, setHistory] = useState<ResumeAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getResumeSummary()
      .then(d => {
        setCurrent(d.latest);
        setHistory(d.history);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const result = await analyzeResume(resumeText);
      setCurrent(result);
      setHistory(prev => [result, ...prev]);
    } catch {
      setError("Couldn't reach the server. Try again in a moment.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <PanelShell
      icon={<FileText size={22} style={{ color: "#38bdf8" }} />}
      title="Resume Agent Workspace"
      sub="Paste your resume for an ATS-style score + concrete feedback"
      accent="#38bdf8"
      onClose={onClose}
    >
      <textarea
        style={shared.textarea}
        rows={8}
        placeholder="Paste your resume text here..."
        value={resumeText}
        onChange={e => setResumeText(e.target.value)}
      />
      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <button
          style={{ ...shared.primaryBtn("#38bdf8"), opacity: analyzing || !resumeText.trim() ? 0.5 : 1 }}
          disabled={analyzing || !resumeText.trim()}
          onClick={handleAnalyze}
        >
          <Sparkles size={14} /> {analyzing ? "Analyzing..." : "Analyze with AI"}
        </button>
      </div>
      {error && <div style={{ color: "#ef4444", fontSize: "0.78rem", marginTop: "8px" }}>{error}</div>}

      {loading ? (
        <div style={{ marginTop: "16px", color: "#64748b", fontSize: "0.8rem" }}>Loading past analyses…</div>
      ) : current ? (
        <div style={{ marginTop: "18px", padding: "16px", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>ATS Score</span>
            <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#38bdf8", fontFamily: "'Rajdhani',sans-serif" }}>{current.ats_score}</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "12px" }}>{current.summary}</p>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#22c55e", marginBottom: "6px" }}>STRENGTHS</div>
          {current.strengths.map((s, i) => <div key={i} style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "4px" }}>✓ {s}</div>)}
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f59e0b", marginTop: "10px", marginBottom: "6px" }}>IMPROVE</div>
          {current.improvements.map((s, i) => <div key={i} style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "4px" }}>→ {s}</div>)}
        </div>
      ) : (
        <div style={{ ...shared.emptyState, marginTop: "16px" }}>No analysis yet — paste a resume above to get started.</div>
      )}

      {history.length > 1 && (
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "8px" }}>Score history</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {history.slice(1).map(h => (
              <div key={h.id} style={{ fontSize: "0.72rem", padding: "4px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", color: "#64748b" }}>
                {h.ats_score} · {new Date(h.created_at).toLocaleDateString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

export const ResumeAgentPanel = ResumeAgent;
export default ResumeAgent;
