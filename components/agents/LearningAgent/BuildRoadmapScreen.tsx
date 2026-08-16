"use client";
// components/agents/LearningAgent/BuildRoadmapScreen.tsx
//
// The moment between "path committed" and "workspace ready." Runs a scripted
// ~10s build sequence (no backend call needed here — the actual roadmap was
// already committed via commitWeek1() in CareerDiscoveryExplorer) so Nova
// visibly "assembles" the system instead of a bare spinner or an instant cut.

import { useEffect, useState } from "react";
import { Target, BarChart3, Clock3, Calendar, PenLine, Map, ShieldCheck, Check, Sparkles } from "lucide-react";

interface BuildStep {
  id: string;
  label: string;
  sublabel: string;
}

const STEPS: BuildStep[] = [
  { id: "goal", label: "Understanding your goal", sublabel: "Analyzing your career target" },
  { id: "level", label: "Analyzing your level", sublabel: "Evaluating your current skills" },
  { id: "skills", label: "Mapping required skills", sublabel: "Identifying important skills" },
  { id: "resources", label: "Finding best resources", sublabel: "Searching across platforms" },
  { id: "roadmap", label: "Designing roadmap", sublabel: "Structuring your journey" },
  { id: "optimize", label: "Optimizing for you", sublabel: "Personalizing the plan" },
];

// Six icons orbiting the core — purely visual, mirrors STEPS 1:1.
const ORBIT_ICONS = [Target, BarChart3, Clock3, Map, PenLine, ShieldCheck];

export interface BuildContext {
  goal: string;
  level: string;
  time: string;
  target: string;
  focus: string;
}

export function BuildRoadmapScreen({ context, onDone }: { context: BuildContext; onDone: () => void }) {
  const [doneCount, setDoneCount] = useState(0);
  const [pct, setPct] = useState(4);

  useEffect(() => {
    if (doneCount >= STEPS.length) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDoneCount((c) => c + 1), 900);
    return () => clearTimeout(t);
  }, [doneCount, onDone]);

  useEffect(() => {
    const target = Math.min(97, Math.round((doneCount / STEPS.length) * 100) + 4);
    const id = setInterval(() => {
      setPct((p) => (p < target ? p + 1 : p));
    }, 18);
    return () => clearInterval(id);
  }, [doneCount]);

  return (
    <div style={b.wrap}>
      <style>{`
        @keyframes brSpinSlow { to { transform: rotate(360deg); } }
        @keyframes brSpinSlowReverse { to { transform: rotate(-360deg); } }
        @keyframes brPulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.05); opacity: 1; } }
        @keyframes brFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={b.grid}>
        {/* Left: context chips */}
        <div style={b.contextCol}>
          <ContextChip icon={Target} label="Goal" value={context.goal} accent="#818cf8" />
          <ContextChip icon={BarChart3} label="Current Level" value={context.level} accent="#22d3ee" />
          <ContextChip icon={Clock3} label="Available Time" value={context.time} accent="#34d399" />
          <ContextChip icon={Calendar} label="Target" value={context.target} accent="#f59e0b" />
          <ContextChip icon={PenLine} label="Learning Focus" value={context.focus} accent="#f472b6" />
        </div>

        {/* Center: orb */}
        <div style={b.centerCol}>
          <div style={b.headerLabel}>Let's build your learning system</div>
          <h1 style={b.headerTitle}>
            Building your personalized <span style={b.headerAccent}>roadmap…</span>
          </h1>
          <p style={b.headerSub}>Nova is understanding you, analyzing the path, and creating a perfect journey for your goal.</p>

          <div style={b.orbStage}>
            <div style={{ ...b.orbGlow, animation: "brPulse 3s ease-in-out infinite" }} />
            <div style={b.orbCore}>
              <Sparkles size={30} style={{ color: "#c4b5fd" }} />
            </div>
            <div style={{ ...b.orbitRing, animation: "brSpinSlow 22s linear infinite" }}>
              {ORBIT_ICONS.map((Icon, i) => {
                const angle = (i / ORBIT_ICONS.length) * 2 * Math.PI;
                const r = 128;
                const x = 150 + r * Math.cos(angle) - 22;
                const y = 150 + r * Math.sin(angle) - 22;
                const active = i < doneCount;
                return (
                  <div key={STEPS[i]?.id ?? i} style={{ ...b.orbitNode, left: x, top: y, ...(active ? b.orbitNodeActive : {}) }}>
                    <div style={{ animation: "brSpinSlowReverse 22s linear infinite" }}>
                      <Icon size={16} style={{ color: active ? "#0b1120" : "rgba(255,255,255,0.4)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={b.progressCard}>
            <Sparkles size={15} style={{ color: "#818cf8", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={b.progressText}>Nova is crafting your unique learning journey…</div>
              <div style={b.progressTrack}><div style={{ ...b.progressFill, width: `${pct}%` }} /></div>
            </div>
            <div style={b.progressPct}>{pct}%</div>
          </div>
        </div>

        {/* Right: live checklist */}
        <div style={b.checklistCol}>
          <div style={b.checklistHeader}>
            <span>AI is working on…</span>
            <span style={b.liveBadge}><span style={b.liveDot} /> LIVE</span>
          </div>
          <div style={b.checklist}>
            {STEPS.map((s, i) => {
              const state = i < doneCount ? "done" : i === doneCount ? "active" : "pending";
              return (
                <div key={s.id} style={{ display: "flex", gap: "12px", animation: `brFadeUp 0.4s ease ${i * 0.05}s both` }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ ...b.stepDot, ...(state === "done" ? b.stepDotDone : state === "active" ? b.stepDotActive : {}) }}>
                      {state === "done" && <Check size={11} style={{ color: "#0b1120" }} />}
                    </div>
                    {i < STEPS.length - 1 && <div style={{ ...b.stepLine, ...(state === "done" ? b.stepLineDone : {}) }} />}
                  </div>
                  <div style={{ paddingBottom: "18px" }}>
                    <div style={{ ...b.stepLabel, ...(state === "pending" ? b.stepLabelPending : {}) }}>{s.label}</div>
                    <div style={b.stepSub}>{s.sublabel}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={b.tipCard}>
            <div style={b.tipTitle}><Sparkles size={13} style={{ color: "#c4b5fd" }} /> Did you know?</div>
            <div style={b.tipBody}>Learners who follow an AI-generated roadmap stay <strong style={{ color: "#c4b5fd" }}>3.2x more consistent</strong> and reach their goals faster.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextChip({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div style={b.chip}>
      <div style={{ ...b.chipIcon, background: `${accent}1f`, border: `1px solid ${accent}55` }}>
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={b.chipLabel}>{label}</div>
        <div style={b.chipValue} title={value}>{value}</div>
      </div>
    </div>
  );
}

export default BuildRoadmapScreen;

const b: Record<string, React.CSSProperties> = {
  wrap: { padding: "8px 2px 4px" },
  grid: { display: "grid", gridTemplateColumns: "220px 1fr 260px", gap: "22px", alignItems: "start" },

  contextCol: { display: "flex", flexDirection: "column", gap: "10px" },
  chip: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "10px 12px" },
  chipIcon: { width: "30px", height: "30px", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipLabel: { fontSize: "0.62rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  chipValue: { fontSize: "0.78rem", color: "white", fontWeight: 600, marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  centerCol: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" },
  headerLabel: { fontSize: "0.72rem", color: "#818cf8", fontWeight: 700, letterSpacing: "0.04em" },
  headerTitle: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.55rem", fontWeight: 800, color: "white", margin: "6px 0 4px" },
  headerAccent: { background: "linear-gradient(90deg,#818cf8,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  headerSub: { fontSize: "0.8rem", color: "#64748b", maxWidth: "360px", lineHeight: 1.5, margin: "0 0 18px" },

  orbStage: { position: "relative", width: "300px", height: "300px", margin: "0 auto" },
  orbGlow: { position: "absolute", inset: "40px", borderRadius: "50%", background: "radial-gradient(circle,rgba(129,140,248,0.35),rgba(34,211,238,0.15) 60%,transparent 75%)" },
  orbCore: { position: "absolute", inset: "108px", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#a78bfa,#4338ca 75%)", boxShadow: "0 0 50px rgba(129,140,248,0.55)", display: "flex", alignItems: "center", justifyContent: "center" },
  orbitRing: { position: "absolute", inset: 0 },
  orbitNode: { position: "absolute", width: "44px", height: "44px", borderRadius: "50%", background: "rgba(8,14,32,0.9)", border: "1px solid rgba(129,140,248,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease" },
  orbitNodeActive: { background: "linear-gradient(135deg,#818cf8,#22d3ee)", border: "1px solid transparent", boxShadow: "0 0 18px rgba(129,140,248,0.5)" },

  progressCard: { marginTop: "22px", width: "100%", maxWidth: "420px", display: "flex", alignItems: "center", gap: "10px", background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: "12px", padding: "12px 14px" },
  progressText: { fontSize: "0.76rem", color: "#cbd5e1", textAlign: "left" },
  progressTrack: { height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", marginTop: "6px", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#818cf8,#22d3ee)", borderRadius: "3px", transition: "width 0.15s linear" },
  progressPct: { fontSize: "0.78rem", color: "#c4b5fd", fontWeight: 700, flexShrink: 0 },

  checklistCol: { display: "flex", flexDirection: "column", gap: "16px" },
  checklistHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 },
  liveBadge: { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.64rem", color: "#22c55e", fontWeight: 700 },
  liveDot: { width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", animation: "brPulse 1.6s ease-in-out infinite" },
  checklist: { display: "flex", flexDirection: "column" },
  stepDot: { width: "18px", height: "18px", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepDotDone: { background: "#22c55e", border: "1.5px solid #22c55e" },
  stepDotActive: { border: "1.5px solid #818cf8", boxShadow: "0 0 0 3px rgba(129,140,248,0.18)" },
  stepLine: { width: "1.5px", flex: 1, minHeight: "14px", background: "rgba(255,255,255,0.1)", marginTop: "2px" },
  stepLineDone: { background: "rgba(34,197,94,0.4)" },
  stepLabel: { fontSize: "0.8rem", color: "white", fontWeight: 600 },
  stepLabelPending: { color: "#475569" },
  stepSub: { fontSize: "0.68rem", color: "#64748b", marginTop: "1px" },

  tipCard: { background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: "12px", padding: "14px" },
  tipTitle: { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.76rem", color: "white", fontWeight: 700, marginBottom: "6px" },
  tipBody: { fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.55 },
};
