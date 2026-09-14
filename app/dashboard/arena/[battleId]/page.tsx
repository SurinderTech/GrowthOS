"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = API.replace(/^http/, "ws");

type BattleStatus = "loading" | "lobby" | "countdown" | "live" | "evaluating" | "completed";
type TaskType = "mcq" | "reasoning" | "code";

interface BattleTask {
  id: string; type: TaskType; order: number; max_score: number; ends_at: string | null;
  config: { question?: string; options?: string[]; correct?: number; prompt?: string; hints?: string[]; };
}
interface LeaderboardEntry { rank: number; name: string; score: number; is_ai: boolean; user_id: string; }
interface BattleResults { battle_id: string; leaderboard: LeaderboardEntry[]; winner: LeaderboardEntry | null; }

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

// ── Countdown overlay ─────────────────────────────────────────────────────────
function CountdownDisplay({ n }: { n: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, flexDirection: "column" }}>
      <div style={{ fontSize: "8rem", fontWeight: 900, color: "white", animation: "countPulse 0.9s ease-out", textShadow: "0 0 60px rgba(99,102,241,0.8)" }}>{n}</div>
      <div style={{ fontSize: "1.2rem", color: "#818cf8", fontWeight: 600, marginTop: 16 }}>GET READY!</div>
      <style>{`@keyframes countPulse { 0%{transform:scale(2);opacity:0} 100%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}

// ── Timer bar ─────────────────────────────────────────────────────────────────
function TimerBar({ endsAt }: { endsAt: string | null }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const update = () => setTimeLeft(Math.max(0, end - Date.now()));
    update(); const iv = setInterval(update, 500); return () => clearInterval(iv);
  }, [endsAt]);
  const pct = Math.min(100, (timeLeft / (15 * 60 * 1000)) * 100);
  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const urgent = timeLeft < 60000;
  return (
    <div style={{ flex: 1, maxWidth: 280 }}>
      <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ height: "100%", borderRadius: 4, background: urgent ? "linear-gradient(90deg,#ef4444,#dc2626)" : "linear-gradient(90deg,#6366f1,#22c55e)", width: `${pct}%`, transition: "width 0.5s linear, background 0.3s" }} />
      </div>
      <div style={{ textAlign: "center", fontSize: "1.1rem", fontWeight: 800, color: urgent ? "#ef4444" : "white" }}>
        ⏱ {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
    </div>
  );
}

// ── MCQ card ──────────────────────────────────────────────────────────────────
function MCQCard({ task, onSubmit, submitted }: { task: BattleTask; onSubmit: (opt: number, taskId: string) => void; submitted: boolean; }) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = task.config.options || [];
  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <div style={{ fontSize: "0.58rem", color: "#818cf8", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>MCQ — Task {task.order}</div>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "white", lineHeight: 1.6, marginBottom: 24 }}>{task.config.question || "Loading question..."}</div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 24 }}>
        {options.map((opt, i) => (
          <button key={i} onClick={() => !submitted && setSelected(i)} disabled={submitted}
            style={{ padding: "14px 18px", borderRadius: 10, border: "1px solid", borderColor: selected === i ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)", background: selected === i ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.02)", color: selected === i ? "white" : "#94a3b8", fontSize: "0.9rem", textAlign: "left" as const, cursor: submitted ? "default" : "pointer", fontWeight: selected === i ? 600 : 400, transition: "all 0.15s" }}>
            <span style={{ color: "#475569", marginRight: 10, fontWeight: 700 }}>{String.fromCharCode(65 + i)}.</span>{opt}
          </button>
        ))}
      </div>
      {!submitted && (
        <button onClick={() => selected !== null && onSubmit(selected, task.id)} disabled={selected === null}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: selected !== null ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,0.04)", color: selected !== null ? "white" : "#334155", fontSize: "0.95rem", fontWeight: 700, cursor: selected !== null ? "pointer" : "not-allowed" }}>
          ⚡ Submit Answer
        </button>
      )}
      {submitted && <div style={{ padding: "14px", borderRadius: 12, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", textAlign: "center" as const, fontWeight: 700 }}>✓ Submitted — waiting for results</div>}
    </div>
  );
}

// ── Reasoning card ────────────────────────────────────────────────────────────
function ReasoningCard({ task, onSubmit, submitted }: { task: BattleTask; onSubmit: (content: string, taskId: string) => void; submitted: boolean; }) {
  const [text, setText] = useState("");
  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <div style={{ fontSize: "0.58rem", color: "#f59e0b", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>REASONING — Task {task.order}</div>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "white", lineHeight: 1.6, marginBottom: 16 }}>{task.config.prompt || task.config.question || "Explain your reasoning..."}</div>
      {task.config.hints && task.config.hints.length > 0 && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(245,158,11,0.08)", borderRadius: 8, border: "1px solid rgba(245,158,11,0.15)" }}>
          <div style={{ fontSize: "0.62rem", color: "#f59e0b", fontWeight: 700, marginBottom: 6 }}>HINTS</div>
          {task.config.hints.map((h, i) => <div key={i} style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 3 }}>• {h}</div>)}
        </div>
      )}
      <textarea value={text} onChange={e => !submitted && setText(e.target.value)} disabled={submitted} placeholder="Type your reasoning here. Be clear and concise..."
        style={{ width: "100%", minHeight: 160, padding: "14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "0.88rem", lineHeight: 1.6, resize: "vertical" as const, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontSize: "0.68rem", color: "#475569" }}>{text.length} / 2000 characters</span>
        {!submitted && <button onClick={() => text.trim().length > 10 && onSubmit(text.trim(), task.id)} disabled={text.trim().length <= 10} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: text.trim().length > 10 ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.04)", color: text.trim().length > 10 ? "white" : "#334155", fontSize: "0.88rem", fontWeight: 700, cursor: text.trim().length > 10 ? "pointer" : "not-allowed" }}>✍️ Submit</button>}
        {submitted && <span style={{ color: "#22c55e", fontWeight: 700 }}>✓ Submitted — pending review</span>}
      </div>
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────────
function ResultsScreen({ results, myUserId, isAIDuel }: { results: BattleResults; myUserId: string; isAIDuel: boolean; }) {
  const router = useRouter();
  const myEntry = results.leaderboard.find(e => e.user_id === myUserId);
  const iWon = results.winner?.user_id === myUserId;
  return (
    <div style={{ textAlign: "center" as const, animation: "slideUp 0.5s ease" }}>
      <div style={{ fontSize: "4rem", marginBottom: 16 }}>{iWon ? "🏆" : "😤"}</div>
      <div style={{ fontSize: "2rem", fontWeight: 900, marginBottom: 8, color: iWon ? "#ffd700" : "#94a3b8" }}>{iWon ? "VICTORY!" : "DEFEATED"}</div>
      <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 32 }}>{isAIDuel ? "AI Duel — Duel Rating updated" : "Ranked Match — ELO updated"}</div>
      {myEntry && (
        <div style={{ display: "inline-flex", gap: 24, marginBottom: 32, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 28px" }}>
          <div style={{ textAlign: "center" as const }}><div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#ffd700" }}>{myEntry.score}</div><div style={{ fontSize: "0.62rem", color: "#475569" }}>SCORE</div></div>
          <div style={{ textAlign: "center" as const }}><div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#22c55e" }}>#{myEntry.rank}</div><div style={{ fontSize: "0.62rem", color: "#475569" }}>RANK</div></div>
        </div>
      )}
      <div style={{ background: "rgba(13,17,35,0.97)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px", marginBottom: 24, textAlign: "left" as const }}>
        <div style={{ fontSize: "0.62rem", color: "#475569", fontWeight: 700, marginBottom: 12 }}>FINAL LEADERBOARD</div>
        {results.leaderboard.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < results.leaderboard.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? "linear-gradient(135deg,#ffd700,#f59e0b)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: i === 0 ? "#000" : "#64748b", flexShrink: 0 }}>{e.rank}</span>
            <span style={{ flex: 1, fontSize: "0.88rem", fontWeight: 600, color: e.user_id === myUserId ? "white" : "#94a3b8" }}>{e.name} {e.is_ai && "🤖"}{e.user_id === myUserId && <span style={{ fontSize: "0.6rem", color: "#6366f1", marginLeft: 6 }}>(you)</span>}</span>
            <span style={{ fontWeight: 800, color: "#ffd700", fontSize: "0.9rem" }}>{e.score}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" as const }}>
        <button onClick={() => router.push("/dashboard/challenges")} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" }}>← Challenges</button>
        <button onClick={() => router.push("/dashboard/challenges")} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer" }}>⚔️ Play Again</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BattleScreen() {
  const params = useParams();
  const battleId = params.battleId as string;
  const router = useRouter();
  const { user } = useAuth();

  const [status, setStatus] = useState<BattleStatus>("loading");
  const [tasks, setTasks] = useState<BattleTask[]>([]);
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [results, setResults] = useState<BattleResults | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [submittedTasks, setSubmittedTasks] = useState<Set<string>>(new Set());
  const [battleTitle, setBattleTitle] = useState("TECH DUEL");
  const [isAIDuel, setIsAIDuel] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = getToken();
  const myUserId = (user as any)?.id || (user as any)?.user_id || "";

  const fetchBattleState = useCallback(async () => {
    if (!token || !battleId) return;
    try {
      const r = await fetch(`${API}/arena/battles/${battleId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { router.push("/dashboard/challenges"); return; }
      const d = await r.json();
      if (d.title) setBattleTitle(d.title);
      if (d.mode === "ai_duel") setIsAIDuel(true);
      if (d.status === "completed" && d.results) { setResults(d.results); setStatus("completed"); }
      else if (d.status === "live") {
        if (d.tasks) setTasks(d.tasks);
        if (d.ends_at) setEndsAt(d.ends_at);
        if (d.leaderboard) setLeaderboard(d.leaderboard);
        setStatus("live");
      } else { setStatus("lobby"); }
    } catch { setStatus("lobby"); }
  }, [battleId, token, router]);

  const connectWS = useCallback(() => {
    if (!token || !battleId) return;
    const ws = new WebSocket(`${WS_BASE}/ws/battles/${battleId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      setStatus(p => p === "loading" ? "lobby" : p);
      ws.send(JSON.stringify({ type: "player:ready" }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const type = msg.type || msg.event;
        if (type === "battle:state") {
          if (msg.tasks) setTasks(msg.tasks);
          if (msg.ends_at) setEndsAt(msg.ends_at);
          if (msg.leaderboard) setLeaderboard(msg.leaderboard);
          if (msg.status === "live") setStatus("live");
        } else if (type === "battle:countdown") {
          setCountdown(msg.seconds_remaining); setStatus("countdown");
        } else if (type === "battle:started") {
          setCountdown(null);
          if (msg.tasks) setTasks(msg.tasks);
          if (msg.ends_at) setEndsAt(msg.ends_at);
          setStatus("live");
        } else if (type === "battle:score_updated") {
          setLeaderboard(prev => {
            const upd = prev.map(e => e.user_id === msg.user_id ? { ...e, score: msg.score } : e);
            if (!upd.find(e => e.user_id === msg.user_id)) {
              upd.push({ user_id: msg.user_id, name: msg.name || "Player", score: msg.score, rank: upd.length + 1, is_ai: msg.is_ai || false });
            }
            return upd.sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }));
          });
        } else if (type === "battle:completed") {
          if (msg.results) { setResults(msg.results); if (msg.results.leaderboard) setLeaderboard(msg.results.leaderboard); }
          setStatus("completed");
        }
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setWsConnected(false);
      reconnectRef.current = setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) connectWS();
      }, 3000);
    };
    ws.onerror = () => ws.close();
  }, [battleId, token]);

  useEffect(() => {
    fetchBattleState();
    connectWS();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [fetchBattleState, connectWS]);

  const submitAnswer = useCallback((taskId: string, submissionType: string, payload: { selectedOption?: number; content?: string }) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "answer:submit", task_id: taskId, submission_type: submissionType, ...payload }));
    setSubmittedTasks(prev => new Set([...prev, taskId]));
    setCurrentTaskIdx(prev => Math.min(prev + 1, tasks.length - 1));
  }, [tasks.length]);

  const currentTask = tasks[currentTaskIdx];
  const allSubmitted = tasks.length > 0 && tasks.every(t => submittedTasks.has(t.id));

  return (
    <div style={{ minHeight: "100vh", background: "#030712", fontFamily: "'Inter',sans-serif", color: "white", display: "flex", flexDirection: "column" as const }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.3)} 50%{box-shadow:0 0 40px rgba(99,102,241,0.6)} }
        * { box-sizing: border-box; }
        textarea { font-family: inherit; }
        button:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); }
        button { transition: all 0.15s; }
      `}</style>

      {/* Countdown overlay */}
      {status === "countdown" && countdown !== null && <CountdownDisplay n={countdown} />}

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(9,12,25,0.98)", position: "sticky" as const, top: 0, zIndex: 100 }}>
        <Link href="/dashboard/challenges" style={{ textDecoration: "none" }}>
          <button style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, color: "#64748b", cursor: "pointer", padding: "5px 10px", fontSize: "0.75rem" }}>
            <ChevronLeft size={14} /> Arena
          </button>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: status === "live" ? "#22c55e" : status === "lobby" ? "#f59e0b" : "#475569", animation: status === "live" ? "pulse 1s ease infinite" : "none" }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "white" }}>{battleTitle}</span>
          {isAIDuel && <span style={{ fontSize: "0.58rem", padding: "2px 7px", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 5, color: "#a78bfa", fontWeight: 700 }}>AI DUEL</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.65rem", color: wsConnected ? "#22c55e" : "#ef4444" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: wsConnected ? "#22c55e" : "#ef4444" }} />
          {wsConnected ? "LIVE" : "Reconnecting..."}
        </div>
        {status === "live" && endsAt && <TimerBar endsAt={endsAt} />}
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", flex: 1 }}>

        {/* Battle area */}
        <main style={{ flex: 1, padding: "32px", maxWidth: "calc(100% - 300px)" }}>

          {status === "loading" && (
            <div style={{ textAlign: "center" as const, padding: "80px 0" }}>
              <div style={{ fontSize: "2rem", marginBottom: 12, animation: "pulse 1s ease infinite" }}>⚔️</div>
              <div style={{ color: "#64748b" }}>Connecting to battle...</div>
            </div>
          )}

          {(status === "lobby" || status === "countdown") && (
            <div style={{ textAlign: "center" as const, padding: "40px 0", animation: "slideUp 0.4s ease" }}>
              <div style={{ fontSize: "3rem", marginBottom: 20, animation: "glow 2s ease infinite", display: "inline-block" }}>⚔️</div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: 8 }}>WAITING FOR BATTLE</h1>
              <div style={{ color: "#64748b", marginBottom: 32, fontSize: "0.88rem" }}>
                {isAIDuel ? "AI opponent is ready. Get set!" : "Waiting for all players to be ready..."}
              </div>
              <div style={{ display: "inline-flex", gap: 16, padding: "16px 28px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14 }}>
                {([{v:"1v1",l:"MODE",c:"#818cf8"},{v:"MCQ",l:"FORMAT",c:"#22c55e"},{v:"15m",l:"DURATION",c:"#f59e0b"}] as const).map((x, i) => (
                  <div key={i} style={{ textAlign: "center" as const }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: x.c }}>{x.v}</div>
                    <div style={{ fontSize: "0.6rem", color: "#475569" }}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === "live" && (
            <div>
              {tasks.length > 1 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  {tasks.map((t, i) => (
                    <button key={t.id} onClick={() => setCurrentTaskIdx(i)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: i === currentTaskIdx ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)", background: i === currentTaskIdx ? "rgba(99,102,241,0.12)" : "transparent", color: submittedTasks.has(t.id) ? "#22c55e" : i === currentTaskIdx ? "#818cf8" : "#475569", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                      {submittedTasks.has(t.id) ? "✓" : `Task ${t.order}`}
                    </button>
                  ))}
                </div>
              )}
              {currentTask?.type === "mcq" && <MCQCard key={currentTask.id} task={currentTask} submitted={submittedTasks.has(currentTask.id)} onSubmit={(opt, tid) => submitAnswer(tid, "mcq", { selectedOption: opt })} />}
              {currentTask?.type === "reasoning" && <ReasoningCard key={currentTask.id} task={currentTask} submitted={submittedTasks.has(currentTask.id)} onSubmit={(content, tid) => submitAnswer(tid, "reasoning", { content })} />}
              {currentTask?.type === "code" && (
                <div style={{ padding: "40px", textAlign: "center" as const, background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 12 }}>💻</div>
                  <div style={{ color: "#64748b" }}>Coding battle — Phase 1.5</div>
                </div>
              )}
              {!currentTask && tasks.length === 0 && (
                <div style={{ textAlign: "center" as const, padding: "60px", color: "#334155" }}>
                  <div style={{ fontSize: "2rem", animation: "pulse 1s ease infinite" }}>⏳</div>
                  <div>Loading tasks...</div>
                </div>
              )}
              {allSubmitted && (
                <div style={{ marginTop: 24, padding: "20px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", textAlign: "center" as const }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>✓</div>
                  <div style={{ color: "#22c55e", fontWeight: 700 }}>All answers submitted!</div>
                  <div style={{ color: "#475569", fontSize: "0.78rem", marginTop: 4 }}>Waiting for battle timer to end...</div>
                </div>
              )}
            </div>
          )}

          {status === "evaluating" && (
            <div style={{ textAlign: "center" as const, padding: "80px 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 16, animation: "pulse 0.8s ease infinite" }}>🔄</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>Calculating results...</div>
              <div style={{ color: "#64748b", marginTop: 8 }}>Evaluating submissions and updating ELO</div>
            </div>
          )}

          {status === "completed" && results && <ResultsScreen results={results} myUserId={myUserId} isAIDuel={isAIDuel} />}
          {status === "completed" && !results && <div style={{ textAlign: "center" as const, padding: "80px 0", color: "#64748b" }}>Loading results...</div>}
        </main>

        {/* Live leaderboard sidebar */}
        <aside style={{ width: 300, padding: "32px 20px", borderLeft: "1px solid rgba(255,255,255,0.05)", background: "rgba(9,12,25,0.6)" }}>
          <div style={{ fontSize: "0.62rem", color: "#475569", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 16 }}>LIVE LEADERBOARD</div>

          {leaderboard.length === 0 && (
            <div style={{ color: "#334155", fontSize: "0.78rem" }}>{status === "lobby" ? "Waiting for battle to start..." : "No data yet"}</div>
          )}

          {leaderboard.map((e, i) => {
            const isMe = e.user_id === myUserId;
            return (
              <div key={e.user_id + i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: isMe ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${isMe ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)"}`, transition: "all 0.3s" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: i === 0 ? "linear-gradient(135deg,#ffd700,#f59e0b)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: i === 0 ? "#000" : "#475569", flexShrink: 0 }}>{e.rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: isMe ? 700 : 500, color: isMe ? "white" : "#94a3b8", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.name} {e.is_ai && "🤖"} {isMe && <span style={{ color: "#6366f1", fontSize: "0.6rem" }}>(you)</span>}
                  </div>
                </div>
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#ffd700", flexShrink: 0 }}>{e.score}</span>
              </div>
            );
          })}

          {status === "live" && tasks.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: "0.62rem", color: "#475569", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>YOUR PROGRESS</div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#6366f1,#22c55e)", width: `${(submittedTasks.size / tasks.length) * 100}%`, transition: "width 0.4s ease" }} />
              </div>
              <div style={{ fontSize: "0.65rem", color: "#475569", marginTop: 6 }}>{submittedTasks.size} / {tasks.length} tasks submitted</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
