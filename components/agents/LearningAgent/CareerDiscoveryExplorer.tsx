"use client";
// components/CareerDiscoveryExplorer.tsx
//
// Career Discovery Engine + Knowledge Explorer — the "alive roadmap" moment.
// Runs exactly once, before Week 1 exists. No "Generate Roadmap" button:
// instead the user explores a live career graph, Nova narrates and reads
// their behavior (dwell time per node), asks one adaptive question, reshapes
// the graph into a committed path, then hands off to Week 1 / Mission
// Control (LearningAgentWorkspace) via onComplete.
//
// This component owns its own curated graph dataset for now (see
// BRANCH_NODES / PATH_TEMPLATES below). The AI Roadmap Generator described
// in the architecture doc can later replace that dataset with a live LLM
// call without changing this component's shape — the exploration signal it
// collects (dwell time + choice) is already sent to the backend via
// commitWeek1() in lib/learning-agent-api.ts.

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sparkles, Clock, Rocket, Star, Layers, Wrench, Loader2 } from "lucide-react";
import { getGoalBoard, commitWeek1, type ExplorationSignal, type GoalBoardData } from "@/lib/learning-agent-api";

// ── Dataset ─────────────────────────────────────────────────────────────

interface BranchNode {
  id: string;
  label: string;
  x: number; // 0-1000 viewBox coords
  creates: string[];
  needs: string[];
  learningWeeks: number;
  projects: string[];
  rating: number; // 1-5
}

const ROOT_Y = 70;
const BRANCH_Y = 300;

const BRANCH_NODES: BranchNode[] = [
  { id: "frontend", label: "Frontend", x: 90, creates: ["Websites", "Dashboards", "Landing Pages", "Admin Panels"], needs: ["HTML", "CSS", "JavaScript", "React", "Next.js"], learningWeeks: 8, projects: ["Netflix Clone", "Spotify UI", "GrowthOS UI"], rating: 5 },
  { id: "backend", label: "Backend", x: 233, creates: ["Servers", "APIs", "Authentication", "Database Logic"], needs: ["Python", "Node.js", "SQL", "REST APIs"], learningWeeks: 9, projects: ["Instagram Backend", "GrowthOS Backend", "Payment System"], rating: 5 },
  { id: "database", label: "Database", x: 376, creates: ["Data Models", "Query Layers", "Schemas"], needs: ["SQL", "PostgreSQL", "Indexing", "Normalization"], learningWeeks: 4, projects: ["Inventory System", "Analytics Warehouse"], rating: 4 },
  { id: "git", label: "Git & Version Control", x: 519, creates: ["Change History", "Branch Workflows", "Team Collaboration"], needs: ["Git CLI", "GitHub", "Pull Requests"], learningWeeks: 1, projects: ["Open Source Contribution"], rating: 5 },
  { id: "dsa", label: "DSA", x: 662, creates: ["Problem-Solving Skill", "Interview Readiness"], needs: ["Arrays", "Trees", "Graphs", "Big-O"], learningWeeks: 10, projects: ["LeetCode 150", "Mock Interviews"], rating: 5 },
  { id: "cloud", label: "Cloud & DevOps", x: 805, creates: ["Deployments", "CI/CD Pipelines", "Scalable Infra"], needs: ["AWS/GCP", "Docker", "CI/CD"], learningWeeks: 6, projects: ["Deploy GrowthOS", "Dockerized Microservice"], rating: 4 },
  { id: "ai_ml", label: "AI & Machine Learning", x: 910, creates: ["Predictive Models", "LLM Apps", "Automation"], needs: ["Python", "NumPy", "PyTorch", "LLM APIs"], learningWeeks: 12, projects: ["Recommendation Engine", "AI Chat App"], rating: 5 },
];

interface PathTemplate {
  id: string;
  title: string;
  novaLine: string;
  nodes: string[]; // rendered top-to-bottom
}

const PATH_TEMPLATES: Record<string, PathTemplate> = {
  frontend: {
    id: "frontend", title: "Frontend-First Path",
    novaLine: "Frontend-first it is. This path gets you shipping visible, real UI fast.",
    nodes: ["Programming Basics", "Git", "HTML & CSS", "JavaScript", "React", "Portfolio Project", "Job Ready"],
  },
  backend: {
    id: "backend", title: "Backend-First Path",
    novaLine: "Backend-first it is. This path builds the systems everything else runs on.",
    nodes: ["Programming Basics", "Git", "Python", "Databases", "APIs & Auth", "Deployment", "Job Ready"],
  },
  full_stack: {
    id: "full_stack", title: "Full-Stack Path",
    novaLine: "Full stack — the broadest path. You'll own the whole product, end to end.",
    nodes: ["Programming", "Python", "Git", "Frontend", "Backend", "Database", "Projects", "Deployment", "Interview Prep", "Job Ready"],
  },
  ai_ml: {
    id: "ai_ml", title: "AI & ML Path",
    novaLine: "AI it is. This path takes you from fundamentals straight into building with LLMs.",
    nodes: ["Python", "Programming Basics", "DSA", "Machine Learning", "Deep Learning", "LLMs", "AI Projects", "Deployment"],
  },
};

function templateForNode(nodeId: string): string {
  if (nodeId === "frontend") return "frontend";
  if (nodeId === "backend" || nodeId === "database") return "backend";
  if (nodeId === "ai_ml") return "ai_ml";
  return "full_stack"; // git / dsa / cloud fold into the broad path
}

// ── Typewriter hook ─────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 22) {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setTyped("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return { typed, done };
}

// ── Component ─────────────────────────────────────────────────────────────

type Stage = "intro" | "drawing" | "exploring" | "path" | "committing";

export function CareerDiscoveryExplorer({ onComplete }: { onComplete: (pathId: string) => void }) {
  const [goalBoard, setGoalBoard] = useState<GoalBoardData | null>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [novaLine, setNovaLine] = useState(
    "I'm creating your learning journey. First I need to understand what skills will take you from where you are today to your goal. Let's build it together."
  );
  const { typed: novaTyped, done: novaDone } = useTypewriter(novaLine);

  const [graphReady, setGraphReady] = useState(false);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [exploredNodes, setExploredNodes] = useState<Set<string>>(new Set());
  const [showQuestion, setShowQuestion] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [chosenAnswer, setChosenAnswer] = useState<"yes" | "no" | "full_stack" | null>(null);
  const [chosenPathId, setChosenPathId] = useState<string | null>(null);
  const [pathReady, setPathReady] = useState(false);
  const [committing, setCommitting] = useState(false);

  const dwellRef = useRef<Record<string, number>>({});
  const openedAtRef = useRef<number | null>(null);

  useEffect(() => { getGoalBoard().then(setGoalBoard); }, []);

  // intro → drawing
  useEffect(() => {
    if (stage === "intro" && novaDone) {
      const t = setTimeout(() => setStage("drawing"), 900);
      return () => clearTimeout(t);
    }
  }, [stage, novaDone]);

  // drawing: stagger the graph in, then move to exploring
  useEffect(() => {
    if (stage !== "drawing") return;
    const totalDrawTime = 500 + BRANCH_NODES.length * 160 + 500;
    const t = setTimeout(() => {
      setGraphReady(true);
      setNovaLine("Let's understand every path. Click any skill to explore it.");
      setStage("exploring");
    }, totalDrawTime);
    return () => clearTimeout(t);
  }, [stage]);

  const openNode = useCallback((id: string) => {
    // close previous, bank its dwell time
    if (expandedNode && openedAtRef.current) {
      const elapsed = (Date.now() - openedAtRef.current) / 1000;
      dwellRef.current[expandedNode] = (dwellRef.current[expandedNode] || 0) + elapsed;
    }
    if (expandedNode === id) {
      setExpandedNode(null);
      openedAtRef.current = null;
      return;
    }
    setExpandedNode(id);
    openedAtRef.current = Date.now();
    setExploredNodes(prev => {
      const next = new Set(prev).add(id);
      if (next.size >= 2 && !showQuestion && stage === "exploring") {
        // bank a moment later so the just-opened node accrues some dwell time first
        setTimeout(() => setShowQuestion(true), 2200);
      }
      return next;
    });
  }, [expandedNode, showQuestion, stage]);

  const topTwoByDwell = useMemo(() => {
    // include the currently-open node's live elapsed time in the ranking
    const live = { ...dwellRef.current };
    if (expandedNode && openedAtRef.current) {
      live[expandedNode] = (live[expandedNode] || 0) + (Date.now() - openedAtRef.current) / 1000;
    }
    const ranked = Object.entries(live).sort((a, b) => b[1] - a[1]);
    return ranked.slice(0, 2).map(([id]) => id);
  }, [expandedNode, showQuestion]);

  const topNodeLabel = topTwoByDwell[0] ? BRANCH_NODES.find(n => n.id === topTwoByDwell[0])?.label : null;
  const secondNodeLabel = topTwoByDwell[1] ? BRANCH_NODES.find(n => n.id === topTwoByDwell[1])?.label : null;

  const buildExplorationSignals = useCallback((): ExplorationSignal[] => {
    const live = { ...dwellRef.current };
    if (expandedNode && openedAtRef.current) {
      live[expandedNode] = (live[expandedNode] || 0) + (Date.now() - openedAtRef.current) / 1000;
    }
    return BRANCH_NODES.map(n => ({
      node_id: n.id,
      seconds_spent: Math.round((live[n.id] || 0) * 10) / 10,
      expanded: exploredNodes.has(n.id),
    }));
  }, [exploredNodes, expandedNode]);

  const answerQuestion = (answer: "yes" | "no" | "full_stack") => {
    setChosenAnswer(answer);
    if (answer === "yes" && topTwoByDwell[0]) {
      commitToPath(templateForNode(topTwoByDwell[0]));
    } else if (answer === "full_stack") {
      commitToPath("full_stack");
    } else {
      setShowPicker(true);
    }
    setShowQuestion(false);
  };

  const commitToPath = (nodeOrTemplateId: string) => {
    const templateId = PATH_TEMPLATES[nodeOrTemplateId] ? nodeOrTemplateId : templateForNode(nodeOrTemplateId);
    setChosenPathId(templateId);
    setShowPicker(false);
    setExpandedNode(null);
    setPathReady(false);
    setNovaLine(PATH_TEMPLATES[templateId].novaLine);
    setStage("path");
    const drawTime = 500 + PATH_TEMPLATES[templateId].nodes.length * 150 + 400;
    setTimeout(() => setPathReady(true), drawTime);
  };

  const beginJourney = async () => {
    if (!chosenPathId) return;
    setCommitting(true);
    setStage("committing");
    setNovaLine("Perfect. I've built your first week. Welcome to Week 1.");
    const signals = buildExplorationSignals();
    commitWeek1({ chosen_path_id: chosenPathId, exploration_signals: signals, ai_question_answer: chosenAnswer });
    setTimeout(() => onComplete(chosenPathId), 2400);
  };

  const destination = goalBoard?.career_goal || "Software Engineer";
  const weeks = goalBoard?.estimated_journey_weeks ?? 28;
  const expandedDetail = expandedNode ? BRANCH_NODES.find(n => n.id === expandedNode) : null;

  return (
    <div style={cd.wrap}>
      <style>{`
        @keyframes cdFadeUp { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes cdDrawLine { from { stroke-dashoffset: 340; } to { stroke-dashoffset: 0; } }
        @keyframes cdPulseGlow { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes cdFlash { 0% { opacity: 0; } 35% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes cdSpin { to { transform: rotate(360deg); } }
        @keyframes cdBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>

      {/* Journey header */}
      <div style={cd.header}>
        <div style={cd.headerDivider} />
        <div style={cd.headerLabel}>Your Journey</div>
        <div style={cd.headerDest}>{destination}</div>
        <div style={cd.headerMetaRow}>
          <span>Estimated Journey</span>
          <strong style={{ color: "#22d3ee" }}>{weeks} Weeks</strong>
        </div>
        <div style={cd.headerDivider} />
      </div>

      {/* Nova narration */}
      <div style={cd.novaRow}>
        <div style={cd.novaAvatar}><Sparkles size={14} style={{ color: "#818cf8" }} /></div>
        <div style={cd.novaBubble}>
          <div style={cd.novaName}>Nova</div>
          <div style={cd.novaText}>
            {novaTyped}
            {!novaDone && <span style={{ animation: "cdBlink 0.9s infinite" }}>▍</span>}
          </div>
        </div>
      </div>

      {/* Graph canvas */}
      <div style={cd.canvas}>
        {stage !== "path" && stage !== "committing" && (
          <OverviewGraph
            destination={destination}
            graphReady={graphReady}
            expandedNode={expandedNode}
            exploredNodes={exploredNodes}
            onNodeClick={openNode}
            interactive={stage === "exploring"}
          />
        )}

        {(stage === "path" || stage === "committing") && chosenPathId && (
          <PathGraph template={PATH_TEMPLATES[chosenPathId]} />
        )}

        {stage === "committing" && (
          <div style={cd.commitFlash} />
        )}
      </div>

      {/* Detail drawer */}
      {expandedDetail && stage === "exploring" && (
        <NodeDetailCard node={expandedDetail} onClose={() => openNode(expandedDetail.id)} />
      )}

      {/* Adaptive AI question */}
      {showQuestion && topNodeLabel && (
        <div style={cd.questionCard}>
          <div style={cd.questionText}>
            I noticed you explored <strong style={{ color: "white" }}>{topNodeLabel}</strong>
            {secondNodeLabel ? <> more than <strong style={{ color: "white" }}>{secondNodeLabel}</strong></> : null}.
            {" "}Would you like to begin there?
          </div>
          <div style={cd.questionOptions}>
            <button style={cd.questionBtnPrimary} onClick={() => answerQuestion("yes")}>Yes, start with {topNodeLabel}</button>
            <button style={cd.questionBtnGhost} onClick={() => answerQuestion("no")}>No</button>
            <button style={cd.questionBtnGhost} onClick={() => answerQuestion("full_stack")}>Full Stack</button>
          </div>
        </div>
      )}

      {/* Manual picker (only if "No" was chosen) */}
      {showPicker && (
        <div style={cd.questionCard}>
          <div style={cd.questionText}>No problem — where would you like to start instead?</div>
          <div style={cd.pickerGrid}>
            {BRANCH_NODES.map(n => (
              <button key={n.id} style={cd.pickerChip} onClick={() => commitToPath(n.id)}>{n.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Ready CTA */}
      {stage === "path" && pathReady && (
        <button style={cd.readyBtn} onClick={beginJourney} disabled={committing}>
          {committing
            ? <><Loader2 size={16} style={{ animation: "cdSpin 0.9s linear infinite" }} /> Building Week 1…</>
            : <><Rocket size={16} /> I'm Ready — Build My Journey</>}
        </button>
      )}

      {/* Subtle skip, in case a returning/impatient user wants a fast default */}
      {stage === "exploring" && !showQuestion && !showPicker && (
        <button style={cd.skipLink} onClick={() => commitToPath("full_stack")}>
          Skip exploring — build a balanced full-stack path
        </button>
      )}
    </div>
  );
}

// ── Overview graph (root + 7 branches) ─────────────────────────────────

function OverviewGraph({
  destination, graphReady, expandedNode, exploredNodes, onNodeClick, interactive,
}: {
  destination: string;
  graphReady: boolean;
  expandedNode: string | null;
  exploredNodes: Set<string>;
  onNodeClick: (id: string) => void;
  interactive: boolean;
}) {
  return (
    <div style={{ position: "relative", width: "100%", height: "420px" }}>
      <svg viewBox="0 0 1000 420" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <filter id="cdGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
        </defs>
        {BRANCH_NODES.map((n, i) => (
          <path
            key={n.id}
            d={`M 500,${ROOT_Y + 26} C 500,${ROOT_Y + 100} ${n.x},${BRANCH_Y - 100} ${n.x},${BRANCH_Y - 34}`}
            fill="none"
            stroke={exploredNodes.has(n.id) ? "#22d3ee" : "rgba(34,211,238,0.35)"}
            strokeWidth={exploredNodes.has(n.id) ? 2 : 1.4}
            strokeDasharray="340"
            style={{
              strokeDashoffset: graphReady ? 0 : 340,
              transition: `stroke-dashoffset 0.7s ease ${0.5 + i * 0.16}s, stroke 0.3s ease`,
            }}
          />
        ))}
      </svg>

      {/* Root node */}
      <div
        style={{
          position: "absolute", left: "50%", top: `${(ROOT_Y / 420) * 100}%`, transform: "translate(-50%,-50%)",
          opacity: 1, animation: "cdFadeUp 0.5s ease",
        }}
      >
        <div style={cd.rootNode}>{destination}</div>
      </div>

      {/* Branch nodes */}
      {BRANCH_NODES.map((n, i) => {
        const isOpen = expandedNode === n.id;
        const isExplored = exploredNodes.has(n.id);
        return (
          <button
            key={n.id}
            onClick={() => interactive && onNodeClick(n.id)}
            style={{
              position: "absolute",
              left: `${(n.x / 1000) * 100}%`,
              top: `${(BRANCH_Y / 420) * 100}%`,
              transform: "translate(-50%,-50%)",
              opacity: graphReady ? 1 : 0,
              animation: graphReady ? `cdFadeUp 0.5s ease ${0.6 + i * 0.16}s both` : "none",
              cursor: interactive ? "pointer" : "default",
              ...cd.branchNode,
              ...(isOpen ? cd.branchNodeOpen : {}),
              ...(isExplored && !isOpen ? cd.branchNodeExplored : {}),
            }}
          >
            {n.label}
          </button>
        );
      })}
    </div>
  );
}

function NodeDetailCard({ node, onClose }: { node: BranchNode; onClose: () => void }) {
  return (
    <div style={cd.detailCard}>
      <div style={cd.detailHeader}>
        <div style={cd.detailTitle}>{node.label}</div>
        <button style={cd.detailClose} onClick={onClose}>×</button>
      </div>
      <div style={cd.detailGrid}>
        <DetailBlock icon={Layers} label="Creates" items={node.creates} />
        <DetailBlock icon={Wrench} label="Needs" items={node.needs} />
        <div style={cd.detailMetaBlock}>
          <div style={cd.detailMetaLabel}><Clock size={12} /> Average Learning Time</div>
          <div style={cd.detailMetaValue}>{node.learningWeeks} Weeks</div>
          <div style={{ ...cd.detailMetaLabel, marginTop: "12px" }}>Demand</div>
          <div style={{ display: "flex", gap: "2px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={13} fill={i < node.rating ? "#f59e0b" : "none"} style={{ color: "#f59e0b" }} />
            ))}
          </div>
        </div>
        <DetailBlock icon={Rocket} label="Projects" items={node.projects} />
      </div>
    </div>
  );
}

function DetailBlock({ icon: Icon, label, items }: { icon: any; label: string; items: string[] }) {
  return (
    <div>
      <div style={cd.detailMetaLabel}><Icon size={12} /> {label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
        {items.map(item => <span key={item} style={cd.detailPill}>{item}</span>)}
      </div>
    </div>
  );
}

// ── Committed path graph (linear, top-to-bottom) ────────────────────────

function PathGraph({ template }: { template: PathTemplate }) {
  return (
    <div style={cd.pathWrap}>
      {template.nodes.map((label, i) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              ...cd.pathNode,
              animation: `cdFadeUp 0.45s ease ${0.3 + i * 0.15}s both`,
            }}
          >
            {label}
          </div>
          {i < template.nodes.length - 1 && (
            <div
              style={{
                width: "2px", height: "22px", background: "linear-gradient(#22d3ee, rgba(34,211,238,0.2))",
                animation: `cdFadeUp 0.3s ease ${0.3 + i * 0.15 + 0.1}s both`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default CareerDiscoveryExplorer;

// ── Styles ──────────────────────────────────────────────────────────────
const cd: Record<string, React.CSSProperties> = {
  wrap: { padding: "6px 2px 20px", position: "relative" },
  header: { textAlign: "center", marginBottom: "22px" },
  headerDivider: { height: "1px", background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.4), transparent)", margin: "10px auto", width: "80%" },
  headerLabel: { fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" },
  headerDest: { fontFamily: "'Rajdhani', sans-serif", fontSize: "2rem", fontWeight: 800, color: "white", margin: "4px 0", textShadow: "0 0 24px rgba(34,211,238,0.35)" },
  headerMetaRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "0.8rem", color: "#94a3b8" },

  novaRow: { display: "flex", gap: "12px", alignItems: "flex-start", maxWidth: "620px", margin: "0 auto 24px" },
  novaAvatar: { width: "30px", height: "30px", borderRadius: "50%", background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" },
  novaBubble: { background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.18)", borderRadius: "14px", padding: "12px 16px", flex: 1 },
  novaName: { fontSize: "0.68rem", color: "#818cf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" },
  novaText: { fontSize: "0.86rem", color: "#e2e8f0", lineHeight: 1.65 },

  canvas: { position: "relative", minHeight: "420px" },

  rootNode: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.1rem", fontWeight: 800, color: "#050b1e", background: "linear-gradient(135deg,#22d3ee,#0284c7)", padding: "12px 26px", borderRadius: "14px", boxShadow: "0 0 30px rgba(34,211,238,0.5)", whiteSpace: "nowrap" },

  branchNode: { fontSize: "0.8rem", fontWeight: 700, color: "#cbd5e1", background: "rgba(8,14,32,0.9)", border: "1px solid rgba(34,211,238,0.3)", borderRadius: "12px", padding: "12px 16px", whiteSpace: "nowrap", boxShadow: "0 8px 20px rgba(0,0,0,0.4)" },
  branchNodeOpen: { color: "#050b1e", background: "#22d3ee", borderColor: "#22d3ee", boxShadow: "0 0 30px rgba(34,211,238,0.6)" },
  branchNodeExplored: { borderColor: "rgba(34,211,238,0.6)", color: "white" },

  detailCard: { maxWidth: "620px", margin: "18px auto 0", background: "rgba(8,14,32,0.95)", border: "1px solid rgba(34,211,238,0.3)", borderRadius: "16px", padding: "18px 20px", animation: "cdFadeUp 0.3s ease" },
  detailHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" },
  detailTitle: { fontFamily: "'Rajdhani', sans-serif", fontSize: "1.15rem", fontWeight: 800, color: "#22d3ee" },
  detailClose: { background: "none", border: "none", color: "#64748b", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1 },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  detailMetaBlock: { gridColumn: "1 / -1", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", marginTop: "2px" },
  detailMetaLabel: { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  detailMetaValue: { fontSize: "0.92rem", color: "white", fontWeight: 700, marginTop: "3px" },
  detailPill: { fontSize: "0.72rem", color: "#94a3b8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "3px 10px" },

  questionCard: { maxWidth: "560px", margin: "20px auto 0", background: "rgba(129,140,248,0.07)", border: "1px solid rgba(129,140,248,0.3)", borderRadius: "16px", padding: "18px 20px", textAlign: "center", animation: "cdFadeUp 0.4s ease" },
  questionText: { fontSize: "0.86rem", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "14px" },
  questionOptions: { display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" },
  questionBtnPrimary: { padding: "9px 16px", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", borderRadius: "10px", color: "white", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" },
  questionBtnGhost: { padding: "9px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" },
  pickerGrid: { display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" },
  pickerChip: { padding: "8px 14px", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: "20px", color: "#22d3ee", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" },

  pathWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 30px" },
  pathNode: { fontSize: "0.88rem", fontWeight: 700, color: "white", background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.4)", borderRadius: "12px", padding: "12px 24px", boxShadow: "0 0 20px rgba(34,211,238,0.15)" },

  readyBtn: { display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", margin: "8px auto 0", padding: "14px 30px", background: "linear-gradient(135deg,#0284c7,#22d3ee)", border: "none", borderRadius: "14px", color: "#050b1e", fontSize: "0.92rem", fontWeight: 800, cursor: "pointer", boxShadow: "0 12px 32px rgba(34,211,238,0.35)", animation: "cdPulseGlow 2.4s ease-in-out infinite" },
  skipLink: { display: "block", margin: "18px auto 0", background: "none", border: "none", color: "#475569", fontSize: "0.74rem", cursor: "pointer", textAlign: "center" },

  commitFlash: { position: "absolute", inset: "-40px", background: "radial-gradient(circle, rgba(34,211,238,0.35) 0%, transparent 70%)", animation: "cdFlash 2.2s ease", pointerEvents: "none" },
};
