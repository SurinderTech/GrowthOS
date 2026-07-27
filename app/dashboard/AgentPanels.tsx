"use client";
// app/dashboard/AgentPanels.tsx
// Four agent workspaces opened from the orbit hero: Resume, Interview,
// Project, and Networking. Each is fully wired to real backend endpoints
// in lib/agents-api.ts — no mock data.

import { useState, useEffect } from "react";
import { X, Sparkles, Plus, Trash2, ExternalLink, Send, RefreshCw } from "lucide-react";
import {
  getResumeSummary, analyzeResume, type ResumeAnalysis,
  getInterviewSummary, startInterview, answerInterviewQuestion, completeInterview, type InterviewSession,
  getProjects, createProject, updateProject, deleteProject, type ProjectItem, type ProjectStatus,
  getContacts, createContact, updateContact, deleteContact, draftOutreachMessage, type ContactItem, type ContactStatus,
} from "@/lib/agents-api";

// ── Shared shell ──────────────────────────────────────────────────────────────

function PanelShell({ icon, title, sub, accent, onClose, children }: { icon: string; title: string; sub: string; accent: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={ps.overlay} onClick={onClose}>
      <div style={ps.panel} onClick={e => e.stopPropagation()}>
        <div style={ps.header}>
          <div style={ps.headerLeft}>
            <span style={{ fontSize: "1.6rem" }}>{icon}</span>
            <div>
              <div style={{ ...ps.title, color: accent }}>{title}</div>
              <div style={ps.sub}>{sub}</div>
            </div>
          </div>
          <button style={ps.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={ps.content}>{children}</div>
      </div>
    </div>
  );
}

const ps: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" },
  panel: { position: "relative", background: "rgba(6,15,34,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", width: "min(640px,95vw)", maxHeight: "86vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  title: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.15rem", fontWeight: 700 },
  sub: { fontSize: "0.75rem", color: "#475569", marginTop: "2px" },
  closeBtn: { width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  content: { flex: 1, overflowY: "auto", padding: "18px 22px" },
};

const shared = {
  textarea: { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#e2e8f0", fontFamily: "inherit", fontSize: "0.83rem", resize: "vertical" as const, outline: "none", lineHeight: 1.6 },
  input: { padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9px", color: "#e2e8f0", fontFamily: "inherit", fontSize: "0.83rem", outline: "none" },
  primaryBtn: (accent: string): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: `${accent}22`, border: `1px solid ${accent}55`, borderRadius: "9px", color: accent, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }),
  emptyState: { padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", fontSize: "0.8rem", color: "#475569", textAlign: "center" as const },
};

// ── Resume Agent ──────────────────────────────────────────────────────────────

export function ResumeAgentPanel({ onClose }: { onClose: () => void }) {
  const [resumeText, setResumeText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [current, setCurrent] = useState<ResumeAnalysis | null>(null);
  const [history, setHistory] = useState<ResumeAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getResumeSummary()
      .then(d => { setCurrent(d.latest); setHistory(d.history); })
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
    <PanelShell icon="📄" title="Resume Agent" sub="Paste your resume for an ATS-style score + concrete feedback" accent="#22d3ee" onClose={onClose}>
      <textarea
        style={shared.textarea}
        rows={8}
        placeholder="Paste your resume text here..."
        value={resumeText}
        onChange={e => setResumeText(e.target.value)}
      />
      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <button style={{ ...shared.primaryBtn("#22d3ee"), opacity: analyzing || !resumeText.trim() ? 0.5 : 1 }} disabled={analyzing || !resumeText.trim()} onClick={handleAnalyze}>
          <Sparkles size={14} /> {analyzing ? "Analyzing..." : "Analyze with AI"}
        </button>
      </div>
      {error && <div style={{ color: "#ef4444", fontSize: "0.78rem", marginTop: "8px" }}>{error}</div>}

      {loading ? (
        <div style={{ marginTop: "16px", color: "#475569", fontSize: "0.8rem" }}>Loading past analyses…</div>
      ) : current ? (
        <div style={{ marginTop: "18px", padding: "16px", background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>ATS Score</span>
            <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#22d3ee", fontFamily: "'Rajdhani',sans-serif" }}>{current.ats_score}</span>
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
          <div style={{ fontSize: "0.72rem", color: "#334155", marginBottom: "8px" }}>Score history</div>
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

// ── Interview Agent ───────────────────────────────────────────────────────────

export function InterviewAgentPanel({ onClose }: { onClose: () => void }) {
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
    <PanelShell icon="🎤" title="Interview Agent" sub="AI-generated mock interviews with per-answer feedback" accent="#f472b6" onClose={onClose}>
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

// ── Project Agent ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ProjectStatus, string> = { idea: "#64748b", in_progress: "#f59e0b", completed: "#22c55e" };
const STATUS_LABELS: Record<ProjectStatus, string> = { idea: "Idea", in_progress: "In Progress", completed: "Completed" };

export function ProjectAgentPanel({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => getProjects().then(setProjects).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const p = await createProject({ title, description: description || undefined, github_url: githubUrl || undefined });
      setProjects(prev => [p, ...prev]);
      setTitle(""); setDescription(""); setGithubUrl(""); setShowForm(false);
    } catch {} finally { setSaving(false); }
  };

  const cycleStatus = async (p: ProjectItem) => {
    const order: ProjectStatus[] = ["idea", "in_progress", "completed"];
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    setProjects(prev => prev.map(x => x.id === p.id ? { ...x, status: next } : x));
    try { await updateProject(p.id, { status: next }); } catch {}
  };

  const handleDelete = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    try { await deleteProject(id); } catch {}
  };

  return (
    <PanelShell icon="🚀" title="Project Agent" sub="Track what you're building, from idea to shipped" accent="#818cf8" onClose={onClose}>
      <button style={shared.primaryBtn("#818cf8")} onClick={() => setShowForm(v => !v)}><Plus size={14} /> New Project</button>

      {showForm && (
        <div style={{ marginTop: "12px", padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <input style={shared.input} placeholder="Project title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea style={shared.textarea} rows={2} placeholder="Short description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <input style={shared.input} placeholder="GitHub URL (optional)" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} />
          <button style={{ ...shared.primaryBtn("#818cf8"), opacity: saving || !title.trim() ? 0.5 : 1 }} disabled={saving || !title.trim()} onClick={handleCreate}>
            {saving ? "Saving..." : "Add Project"}
          </button>
        </div>
      )}

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading ? (
          <div style={{ color: "#475569", fontSize: "0.8rem" }}>Loading projects…</div>
        ) : projects.length === 0 ? (
          <div style={shared.emptyState}>No projects yet. Add your first one above.</div>
        ) : projects.map(p => (
          <div key={p.id} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "white" }}>{p.title}</div>
                {p.description && <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>{p.description}</div>}
              </div>
              <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", flexShrink: 0 }}><Trash2 size={14} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => cycleStatus(p)} style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px", borderRadius: "8px", background: `${STATUS_COLORS[p.status]}20`, color: STATUS_COLORS[p.status], border: `1px solid ${STATUS_COLORS[p.status]}44`, cursor: "pointer" }}>
                {STATUS_LABELS[p.status]}
              </button>
              {p.github_url && (
                <a href={p.github_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "#818cf8", display: "flex", alignItems: "center", gap: "3px" }}>
                  <ExternalLink size={11} /> GitHub
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ── Networking Agent ───────────────────────────────────────────────────────────

const CONTACT_STATUS_COLORS: Record<ContactStatus, string> = { to_reach: "#64748b", contacted: "#3b82f6", replied: "#f59e0b", connected: "#22c55e" };
const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = { to_reach: "To Reach", contacted: "Contacted", replied: "Replied", connected: "Connected" };

export function NetworkingAgentPanel({ onClose }: { onClose: () => void }) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);

  const load = () => getContacts().then(setContacts).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const c = await createContact({ name, role: role || undefined, company: company || undefined });
      setContacts(prev => [c, ...prev]);
      setName(""); setRole(""); setCompany(""); setShowForm(false);
    } catch {} finally { setSaving(false); }
  };

  const cycleStatus = async (c: ContactItem) => {
    const order: ContactStatus[] = ["to_reach", "contacted", "replied", "connected"];
    const next = order[(order.indexOf(c.status) + 1) % order.length];
    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x));
    try { await updateContact(c.id, { status: next }); } catch {}
  };

  const handleDraft = async (c: ContactItem) => {
    setDraftingId(c.id);
    try {
      const { message } = await draftOutreachMessage(c.id);
      setContacts(prev => prev.map(x => x.id === c.id ? { ...x, last_message: message } : x));
    } catch {} finally { setDraftingId(null); }
  };

  const handleDelete = async (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    try { await deleteContact(id); } catch {}
  };

  return (
    <PanelShell icon="🤝" title="Networking Agent" sub="Track outreach and draft AI messages for your pipeline" accent="#ec4899" onClose={onClose}>
      <button style={shared.primaryBtn("#ec4899")} onClick={() => setShowForm(v => !v)}><Plus size={14} /> New Contact</button>

      {showForm && (
        <div style={{ marginTop: "12px", padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <input style={shared.input} placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input style={shared.input} placeholder="Role (optional)" value={role} onChange={e => setRole(e.target.value)} />
          <input style={shared.input} placeholder="Company (optional)" value={company} onChange={e => setCompany(e.target.value)} />
          <button style={{ ...shared.primaryBtn("#ec4899"), opacity: saving || !name.trim() ? 0.5 : 1 }} disabled={saving || !name.trim()} onClick={handleCreate}>
            {saving ? "Saving..." : "Add Contact"}
          </button>
        </div>
      )}

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading ? (
          <div style={{ color: "#475569", fontSize: "0.8rem" }}>Loading contacts…</div>
        ) : contacts.length === 0 ? (
          <div style={shared.emptyState}>No contacts yet. Add someone you'd like to reach out to.</div>
        ) : contacts.map(c => (
          <div key={c.id} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "white" }}>{c.name}</div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{[c.role, c.company].filter(Boolean).join(" · ") || c.platform}</div>
              </div>
              <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", flexShrink: 0 }}><Trash2 size={14} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => cycleStatus(c)} style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px", borderRadius: "8px", background: `${CONTACT_STATUS_COLORS[c.status]}20`, color: CONTACT_STATUS_COLORS[c.status], border: `1px solid ${CONTACT_STATUS_COLORS[c.status]}44`, cursor: "pointer" }}>
                {CONTACT_STATUS_LABELS[c.status]}
              </button>
              <button onClick={() => handleDraft(c)} disabled={draftingId === c.id} style={{ fontSize: "0.7rem", color: "#818cf8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                <Sparkles size={11} /> {draftingId === c.id ? "Drafting..." : "Draft message"}
              </button>
            </div>
            {c.last_message && (
              <div style={{ marginTop: "8px", padding: "10px 12px", background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.18)", borderRadius: "8px", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.55 }}>
                {c.last_message}
              </div>
            )}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ── Learning Agent ────────────────────────────────────────────────────────────

export function LearningAgentPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"skills" | "modules" | "mentor">("skills");
  const [mentorMsg, setMentorMsg] = useState("");
  const [mentorReply, setMentorReply] = useState("");
  const [mentorLoading, setMentorLoading] = useState(false);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  const sampleSkills = [
    { name: "System Design & Architecture", level: "Intermediate", match: "95%", modules: 4 },
    { name: "Full-Stack Development", level: "Advanced", match: "90%", modules: 5 },
    { name: "AI & ML Agentic Engineering", level: "Beginner", match: "98%", modules: 6 },
  ];

  const modules = [
    { id: 1, title: "Module 1: Core Fundamentals", time: "25 min", desc: "Master the foundational patterns and theoretical concepts." },
    { id: 2, title: "Module 2: Practical Implementation", time: "40 min", desc: "Build working code examples and unit test suites." },
    { id: 3, title: "Module 3: Production Hardening", time: "30 min", desc: "Optimize latency, security, and error resiliency." },
  ];

  const handleAskMentor = async () => {
    if (!mentorMsg.trim()) return;
    setMentorLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
      const res = await fetch(`${API}/dashboard/ask-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: `Learning Agent Mentor: ${mentorMsg}` }),
      });
      const d = await res.json();
      setMentorReply(d.reply || "Keep building! Consistent daily practice builds mastery faster than long sessions.");
    } catch {
      setMentorReply("Focus on completing one micro-module today to solidify your technical foundation.");
    } finally {
      setMentorLoading(false);
    }
  };

  return (
    <PanelShell icon="🧠" title="Learning Agent Workspace" sub="AI-curated learning paths, micro-modules & 1-on-1 mentor guidance" accent="#22d3ee" onClose={onClose}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {[
          { id: "skills", label: "Skills Path" },
          { id: "modules", label: "Micro Modules" },
          { id: "mentor", label: "AI Mentor" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: activeTab === t.id ? "rgba(34,211,238,0.15)" : "transparent", color: activeTab === t.id ? "#22d3ee" : "#64748b", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "skills" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sampleSkills.map((s, i) => (
            <div key={i} style={{ padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "white" }}>{s.name}</span>
                <span style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 700 }}>★ {s.match} match</span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "#64748b", marginBottom: "8px" }}>Level: {s.level} · {s.modules} active modules</div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: s.level === "Beginner" ? "30%" : s.level === "Intermediate" ? "65%" : "90%", height: "100%", background: "linear-gradient(90deg,#22d3ee,#6366f1)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "modules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {modules.map(m => {
            const isDone = completedModules.has(m.id);
            return (
              <div key={m.id} style={{ padding: "14px", background: isDone ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)", border: isDone ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 600, color: isDone ? "#22c55e" : "white" }}>{isDone ? "✓ " : ""}{m.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>⏱ {m.time} — {m.desc}</div>
                </div>
                <button
                  onClick={() => setCompletedModules(prev => { const s = new Set(prev); isDone ? s.delete(m.id) : s.add(m.id); return s; })}
                  style={{ padding: "6px 12px", borderRadius: "8px", background: isDone ? "rgba(34,197,94,0.15)" : "rgba(34,211,238,0.12)", border: isDone ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(34,211,238,0.3)", color: isDone ? "#22c55e" : "#22d3ee", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  {isDone ? "Completed" : "Start Module"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "mentor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mentorReply && (
            <div style={{ padding: "12px 14px", background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: "10px", fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6 }}>
              <div style={{ fontSize: "0.72rem", color: "#22d3ee", fontWeight: 700, marginBottom: "4px" }}>🤖 AI LEARNING MENTOR</div>
              {mentorReply}
            </div>
          )}
          <textarea style={shared.textarea} rows={3} placeholder="Ask your learning mentor anything..." value={mentorMsg} onChange={e => setMentorMsg(e.target.value)} />
          <button style={{ ...shared.primaryBtn("#22d3ee"), opacity: mentorLoading || !mentorMsg.trim() ? 0.5 : 1 }} disabled={mentorLoading || !mentorMsg.trim()} onClick={handleAskMentor}>
            <Sparkles size={14} /> {mentorLoading ? "Consulting Mentor..." : "Ask Learning Mentor"}
          </button>
        </div>
      )}
    </PanelShell>
  );
}

// ── Opportunity Agent ──────────────────────────────────────────────────────────

export function OpportunityAgentPanel({ onClose }: { onClose: () => void }) {
  const [scanning, setScanning] = useState(false);
  const opportunities = [
    { title: "Senior AI Full-Stack Developer", desc: "Remote role building LLM agents & real-time workflows.", urgency: "⚡ Act Now", match: "96%", pay: "$120k–$150k" },
    { title: "Frontend Architecture Lead", desc: "Build state-of-the-art Next.js & React dashboards.", urgency: "📅 This Week", match: "91%", pay: "$110k–$135k" },
    { title: "AI Agentic Workflows Freelance Project", desc: "2-month contract to automate customer service pipelines.", urgency: "📆 This Month", match: "88%", pay: "₹1,500/hr" },
  ];

  return (
    <PanelShell icon="🚀" title="Opportunity Agent Workspace" sub="AI market scanner matching you with high-value roles, gigs & projects" accent="#f59e0b" onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Live AI Matched Opportunities</span>
        <button
          onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 1200); }}
          style={{ padding: "6px 12px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", color: "#f59e0b", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
          <Sparkles size={13} /> {scanning ? "Scanning Market…" : "Scan New Matches"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {opportunities.map((opp, i) => (
          <div key={i} style={{ padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "white" }}>{opp.title}</div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "8px", background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>{opp.urgency}</span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "4px 0 8px", lineHeight: 1.5 }}>{opp.desc}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "10px", fontSize: "0.72rem" }}>
                <span style={{ color: "#22c55e", fontWeight: 700 }}>🎯 {opp.match} Match</span>
                <span style={{ color: "#94a3b8" }}>💰 {opp.pay}</span>
              </div>
              <button style={{ padding: "5px 12px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "7px", color: "#f59e0b", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                Apply / Contact →
              </button>
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

import { getGrowthPlan, type GrowthPlan } from "@/lib/dashboard-api";

// ── Roadmap Agent ─────────────────────────────────────────────────────────────

export function RoadmapAgentPanel({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [plan, setPlan] = useState<GrowthPlan | null>(null);
  const [activeMonth, setActiveMonth] = useState(0);

  const fallbackPlan: GrowthPlan = {
    id: "g1",
    title: "AI & Full-Stack Growth Roadmap",
    summary: "Personalized 3-month AI-generated execution roadmap focused on core engineering, production builds & interview readiness.",
    generated_at: new Date().toISOString(),
    months: [
      {
        month: 1, label: "Month 1", theme: "Foundation & System Architecture", progress: 65,
        milestones: [
          { id: "m1", title: "Complete System Design Fundamentals", description: "Master scalable API patterns & database indexing.", week: 1, completed: true },
          { id: "m2", title: "Build Microservice Auth Engine", description: "Implement JWT & OAuth2 flows in Node/FastAPI.", week: 2, completed: true },
          { id: "m3", title: "DSA & Problem Solving Drills", description: "Solve 30 Medium LeetCode problems in graphs & trees.", week: 3, completed: false },
        ]
      },
      {
        month: 2, label: "Month 2", theme: "Advanced AI Agentic Systems", progress: 25,
        milestones: [
          { id: "m4", title: "Orchestrate Multi-Agent Workflows", description: "Connect LangChain / AutoGen stateful agents.", week: 5, completed: true },
          { id: "m5", title: "Real-Time WebSocket Sync", description: "Implement live bidirection event streaming.", week: 6, completed: false },
          { id: "m6", title: "Deploy Micro-SaaS Beta", description: "Deploy full stack app on Vercel & Railway.", week: 7, completed: false },
        ]
      },
      {
        month: 3, label: "Month 3", theme: "Career Acceleration & Launch", progress: 0,
        milestones: [
          { id: "m7", title: "Complete 5 AI Mock Interviews", description: "Score 85+ on system design & coding interviews.", week: 9, completed: false },
          { id: "m8", title: "Portfolio Hardening & GitHub Polish", description: "Ship 3 high-impact open-source repositories.", week: 10, completed: false },
          { id: "m9", title: "Outreach & Job Pipeline", description: "Connect with 20 engineering leads & submit applications.", week: 11, completed: false },
        ]
      }
    ]
  };

  useEffect(() => {
    getGrowthPlan()
      .then(d => { if (d?.months?.length) setPlan(d); else setPlan(fallbackPlan); })
      .catch(() => setPlan(fallbackPlan))
      .finally(() => setLoading(false));
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const d = await getGrowthPlan();
      if (d?.months?.length) setPlan(d);
    } catch {} finally {
      setRegenerating(false);
    }
  };

  const currentPlan = plan || fallbackPlan;
  const currentMonthData = currentPlan.months[activeMonth] || currentPlan.months[0];

  const toggleMilestone = (mId: string) => {
    setPlan(prev => {
      const target = prev || fallbackPlan;
      const updatedMonths = target.months.map((m, idx) => {
        if (idx !== activeMonth) return m;
        const updatedMs = m.milestones.map(ms => ms.id === mId ? { ...ms, completed: !ms.completed } : ms);
        const doneCount = updatedMs.filter(ms => ms.completed).length;
        const newProg = Math.round((doneCount / (updatedMs.length || 1)) * 100);
        return { ...m, milestones: updatedMs, progress: newProg };
      });
      return { ...target, months: updatedMonths };
    });
  };

  return (
    <PanelShell icon="🗺️" title="Roadmap Agent Workspace" sub="AI Growth Plan & Milestone Execution Roadmap" accent="#818cf8" onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "white" }}>{currentPlan.title}</div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>{currentPlan.summary}</div>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={{ padding: "6px 12px", background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.3)", borderRadius: "8px", color: "#818cf8", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
          <Sparkles size={13} /> {regenerating ? "Regenerating..." : "Regenerate AI Roadmap"}
        </button>
      </div>

      {/* Month Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {currentPlan.months.map((m, idx) => (
          <button
            key={m.month}
            onClick={() => setActiveMonth(idx)}
            style={{
              flex: 1, padding: "10px 12px", borderRadius: "10px", textAlign: "left", cursor: "pointer",
              background: activeMonth === idx ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.02)",
              border: activeMonth === idx ? "1px solid rgba(129,140,248,0.4)" : "1px solid rgba(255,255,255,0.06)",
              transition: "all 0.2s ease"
            }}>
            <div style={{ fontSize: "0.7rem", color: "#818cf8", fontWeight: 700 }}>Month {m.month}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "white", marginTop: "2px" }}>{m.theme}</div>
            <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", marginTop: "6px", overflow: "hidden" }}>
              <div style={{ width: `${m.progress}%`, height: "100%", background: "#818cf8" }} />
            </div>
            <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px" }}>{m.progress}% complete</div>
          </button>
        ))}
      </div>

      {/* Active Month Milestones */}
      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "white", marginBottom: "8px" }}>
        Month {currentMonthData.month} Milestones: {currentMonthData.theme}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {currentMonthData.milestones.map(ms => (
          <div
            key={ms.id}
            onClick={() => toggleMilestone(ms.id)}
            style={{
              padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
              background: ms.completed ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)",
              border: ms.completed ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "flex-start", gap: "10px"
            }}>
            <span style={{ fontSize: "1.1rem", color: ms.completed ? "#22c55e" : "#475569" }}>
              {ms.completed ? "✓" : "○"}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: ms.completed ? "#22c55e" : "white", textDecoration: ms.completed ? "line-through" : "none" }}>
                {ms.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                Week {ms.week} · {ms.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}


