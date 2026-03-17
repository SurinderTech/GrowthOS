"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Background,
  Controls,
  MarkerType,
  Node,
  Edge,
  NodeProps,
  BackgroundVariant,
  useReactFlow,
  ConnectionLineType,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { 
  getCareerJobs, 
  getCareerSkills, 
  getCareerSubskills 
} from "@/lib/dashboard-api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CareerNode {
  id: string;
  label: string;
  type: "root" | "job" | "skill" | "subskill" | "project";
}

interface CareerEdge {
  source: string;
  target: string;
}

interface CareerGraphProps {
  nodes?: CareerNode[];
  edges?: CareerEdge[];
}

// ─── Node Styles by Type ──────────────────────────────────────────────────────

const NODE_CONFIG = {
  root: {
    bg: "linear-gradient(135deg, #3b0764 0%, #1e1b4b 50%, #0f172a 100%)",
    border: "2px solid rgba(167,139,250,0.9)",
    shadow:
      "0 0 40px rgba(139,92,246,0.6), 0 0 80px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
    text: "#e9d5ff",
    width: 140,
    height: 60,
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 16,
  },
  job: {
    bg: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
    border: "1.5px solid rgba(99,102,241,0.7)",
    shadow:
      "0 0 20px rgba(99,102,241,0.3), 0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
    text: "#c7d2fe",
    width: 150,
    height: 52,
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 12,
  },
  skill: {
    bg: "linear-gradient(135deg, #0f2044 0%, #0c1a38 100%)",
    border: "1.5px solid rgba(56,189,248,0.5)",
    shadow:
      "0 0 14px rgba(56,189,248,0.2), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
    text: "#7dd3fc",
    width: 130,
    height: 44,
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 10,
  },
  subskill: {
    bg: "linear-gradient(135deg, #0a1628 0%, #06101e 100%)",
    border: "1px solid rgba(148,163,184,0.3)",
    shadow:
      "0 0 8px rgba(148,163,184,0.1), 0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
    text: "#94a3b8",
    width: 120,
    height: 38,
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 8,
  },
  project: {
    bg: "linear-gradient(135deg, #052e16 0%, #021a0d 100%)",
    border: "1px solid rgba(52,211,153,0.4)",
    shadow:
      "0 0 12px rgba(52,211,153,0.15), 0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
    text: "#6ee7b7",
    width: 130,
    height: 40,
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 8,
  },
};

const EDGE_COLORS = {
  root_job: "#7c3aed",
  job_skill: "#3b82f6",
  skill_subskill: "#0ea5e9",
  subskill_project: "#10b981",
  default: "#4b5563",
};

// ─── Custom Node Components ───────────────────────────────────────────────────

const typeIcons: Record<string, string> = {
  root: "✦",
  job: "◈",
  skill: "◆",
  subskill: "◇",
  project: "⬡",
};

function CareerNodeComponent({ data, selected }: NodeProps) {

  console.log("NODE DATA RECEIVED:", data);

  const cfg =
    NODE_CONFIG[data.type as keyof typeof NODE_CONFIG] ?? NODE_CONFIG.subskill;

  const icon = typeIcons[data.type] ?? "•";

  const isExpanded = data.expanded === true;
  const isExpandable = data.expandable === true;

  return (
    <div
      style={{
        background: cfg.bg,
        border: selected
          ? `2px solid rgba(250,204,21,0.8)`
          : cfg.border,
        boxShadow: selected
          ? `0 0 24px rgba(250,204,21,0.4), ${cfg.shadow}`
          : cfg.shadow,
        borderRadius: cfg.borderRadius,
        width: cfg.width,
        height: cfg.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: isExpandable ? "pointer" : "default",
        position: "relative",
        transition: "all 0.2s ease",
        animation: "nodeAppear 0.4s ease forwards",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <span style={{ fontSize: cfg.fontSize - 2, opacity: 0.7, color: cfg.text }}>
        {icon}
      </span>
      <span
        style={{
          fontSize: cfg.fontSize,
          fontWeight: cfg.fontWeight,
          color: cfg.text,
          fontFamily: "'Space Mono', 'Courier New', monospace",
          letterSpacing: "-0.01em",
          maxWidth: cfg.width - 40,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {data.label}
      </span>
      {isExpandable && (
        <div
          style={{
            position: "absolute",
            bottom: -8,
            right: -8,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: isExpanded ? "#7c3aed" : "rgba(99,102,241,0.3)",
            border: "1px solid rgba(167,139,250,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "#e9d5ff",
            transition: "all 0.2s ease",
          }}
        >
          {isExpanded ? "−" : "+"}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
    </div>
  );
}

// ─── Layout Engine ────────────────────────────────────────────────────────────

function computeLayout(
  rawNodes: CareerNode[],
  rawEdges: CareerEdge[],
  expandedNodes: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  // Build adjacency
  const childrenOf: Record<string, string[]> = {};
  const parentOf: Record<string, string> = {};
  for (const e of rawEdges) {
    if (!childrenOf[e.source]) childrenOf[e.source] = [];
    childrenOf[e.source].push(e.target);
    parentOf[e.target] = e.source;
  }

  const nodeMap = new Map<string, CareerNode>(rawNodes.map((n) => [n.id, n]));

  // Determine visible nodes
  const visible = new Set<string>();
  const rootNode = rawNodes.find(n => n.type === "root");
const rootId = rootNode?.id || "careers";

const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    const n = nodeMap.get(id);
    if (!n) continue;
    visible.add(id);
    if (expandedNodes.has(id)) {
      for (const child of childrenOf[id] ?? []) queue.push(child);
    }
  }

  // Assign tree positions using BFS with level info
  const levelOf: Record<string, number> = { [rootId]: 0 };
const bfsQueue = [rootId];
  while (bfsQueue.length) {
    const id = bfsQueue.shift()!;
    if (!expandedNodes.has(id)) continue;
    for (const child of childrenOf[id] ?? []) {
      if (visible.has(child)) {
        levelOf[child] = (levelOf[id] ?? 0) + 1;
        bfsQueue.push(child);
      }
    }
  }

  // Group nodes by level
  const byLevel: Record<number, string[]> = {};
  for (const [id, lvl] of Object.entries(levelOf)) {
    if (!visible.has(id)) continue;
    byLevel[lvl] = byLevel[lvl] ?? [];
    byLevel[lvl].push(id);
  }

  const LEVEL_GAP_Y = 160;
  const NODE_GAP_X = 190;

  const positions: Record<string, { x: number; y: number }> = {};

  // Root
  positions[rootId] = { x: 0, y: 0 };

  // For each level, center horizontally
  for (const [lvlStr, ids] of Object.entries(byLevel)) {
    const lvl = Number(lvlStr);
    if (lvl === 0) continue;
    const total = ids.length;
    const startX = -((total - 1) * NODE_GAP_X) / 2;
    ids.forEach((id, i) => {
      positions[id] = { x: startX + i * NODE_GAP_X, y: lvl * LEVEL_GAP_Y };
    });
  }

  const rfNodes: Node[] = [];
  for (const id of visible) {
    const cn = nodeMap.get(id);
    if (!cn) continue;
    const pos = positions[id] ?? { x: 0, y: 0 };
    const cfg = NODE_CONFIG[cn.type as keyof typeof NODE_CONFIG] ?? NODE_CONFIG.subskill;
    const isExpandable =
  cn.type === "root" || cn.type === "job" || cn.type === "skill";
    
    rfNodes.push({
  id: id,
  type: "careerNode",
  position: pos,
  data: {
    label: cn.label,
    type: cn.type,
    expanded: expandedNodes.has(id),
    expandable: Boolean(isExpandable),
  },
  style: { width: cfg.width, height: cfg.height },
});
  }
  const getEdgeColor = (src: string, tgt: string) => {
    const st = nodeMap.get(src)?.type;
    const tt = nodeMap.get(tgt)?.type;
    if (st === "root") return EDGE_COLORS.root_job;
    if (st === "job") return EDGE_COLORS.job_skill;
    if (st === "skill") return EDGE_COLORS.skill_subskill;
    if (st === "subskill") return EDGE_COLORS.subskill_project;
    return EDGE_COLORS.default;
  };

  const rfEdges: Edge[] = rawEdges
    .filter((e) => visible.has(e.source) && visible.has(e.target))
    .map((e, i) => ({
      id: `e-${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: true,
      style: { stroke: getEdgeColor(e.source, e.target), strokeWidth: 1.5, opacity: 0.7 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: getEdgeColor(e.source, e.target),
        width: 12,
        height: 12,
      },
    }));

  return { nodes: rfNodes, edges: rfEdges };
}

// ─── Fallback Demo Data ───────────────────────────────────────────────────────

const DEMO_DATA: { nodes: CareerNode[]; edges: CareerEdge[] } = {
  nodes: [
    { id: "careers", label: "Careers", type: "root" },
    { id: "ai_engineer", label: "AI Engineer", type: "job" },
    { id: "software_engineer", label: "Software Engineer", type: "job" },
    { id: "data_scientist", label: "Data Scientist", type: "job" },
    { id: "ml_engineer", label: "ML Engineer", type: "job" },
    { id: "backend_engineer", label: "Backend Engineer", type: "job" },
    { id: "python", label: "Python", type: "skill" },
    { id: "machine_learning", label: "Machine Learning", type: "skill" },
    { id: "deep_learning", label: "Deep Learning", type: "skill" },
    { id: "data_structures", label: "Data Structures", type: "skill" },
    { id: "algorithms", label: "Algorithms", type: "skill" },
    { id: "statistics", label: "Statistics", type: "skill" },
    { id: "numpy", label: "NumPy", type: "subskill" },
    { id: "pandas", label: "Pandas", type: "subskill" },
    { id: "regression", label: "Regression", type: "subskill" },
    { id: "classification", label: "Classification", type: "subskill" },
    { id: "cnn", label: "CNN", type: "subskill" },
    { id: "transformers", label: "Transformers", type: "subskill" },
    { id: "linked_lists", label: "Linked Lists", type: "subskill" },
    { id: "trees", label: "Trees & Graphs", type: "subskill" },
    { id: "build_ml_model", label: "Build ML Model", type: "project" },
    { id: "image_classifier", label: "Image Classifier", type: "project" },
    { id: "data_pipeline", label: "Data Pipeline", type: "project" },
  ],
  edges: [
    { source: "careers", target: "ai_engineer" },
    { source: "careers", target: "software_engineer" },
    { source: "careers", target: "data_scientist" },
    { source: "careers", target: "ml_engineer" },
    { source: "careers", target: "backend_engineer" },
    { source: "ai_engineer", target: "python" },
    { source: "machine_learning", target: "ai_engineer" },
    { source: "deep_learning", target: "ai_engineer" },
    { source: "python", target: "ml_engineer" },
    { source: "machine_learning", target: "ml_engineer" },
    { source: "data_structures", target: "software_engineer" },
    { source: "algorithms", target: "software_engineer" },
    { source: "statistics", target: "data_scientist" },
    { source: "python", target: "data_scientist" },
    { source: "python", target: "numpy" },
    { source: "pandas", target: "python" },
    { source: "regression", target: "machine_learning" },
    { source: "classification", target: "machine_learning" },
    { source: "cnn", target: "deep_learning" },
    { source: "transformers", target: "deep_learning" },
    { source: "linked_lists", target: "data_structures" },
    { source: "trees", target: "data_structures" },
    { source: "build_ml_model", target: "machine_learning" },
    { source: "image_classifier", target: "cnn" },
    { source: "data_pipeline", target: "pandas" },
  ],
};

// ─── Info Panel ───────────────────────────────────────────────────────────────

const NODE_DESCRIPTIONS: Record<string, string> = {
  root: "The central hub connecting all career pathways.",
  job: "A career role. Click to expand the skills required.",
  skill: "A core skill domain. Click to explore subskills.",
  subskill: "A specific technical topic within a skill area.",
  project: "A hands-on project to solidify this skill.",
};

function InfoPanel({ node, onClose }: { node: Node | null; onClose: () => void }) {
  if (!node) return null;
  const cfg = NODE_CONFIG[node.data.type as keyof typeof NODE_CONFIG] ?? NODE_CONFIG.subskill;
  const icon = typeIcons[node.data.type] ?? "•";
  const desc = NODE_DESCRIPTIONS[node.data.type] ?? "";

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 240,
        background:
          "linear-gradient(135deg, rgba(15,20,40,0.97), rgba(8,12,28,0.97))",
        border: "1px solid rgba(99,102,241,0.3)",
        borderRadius: 14,
        padding: "18px 20px",
        zIndex: 20,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.1)",
        backdropFilter: "blur(12px)",
        animation: "panelSlide 0.25s ease forwards",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          background: "none",
          border: "none",
          color: "rgba(148,163,184,0.6)",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20, color: cfg.text }}>{icon}</span>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: cfg.text,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {node.data.label}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(148,163,184,0.6)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {node.data.nodeType}
          </div>
        </div>
      </div>
      <p
        style={{
          fontSize: 12,
          color: "rgba(148,163,184,0.8)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {desc}
      </p>
      {node.data.expandable && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "rgba(99,102,241,0.1)",
            borderRadius: 8,
            fontSize: 11,
            color: "rgba(167,139,250,0.8)",
          }}
        >
          💡 Click node to {node.data.expanded ? "collapse" : "expand"} connections
        </div>
      )}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { type: "root", label: "Root" },
    { type: "job", label: "Career" },
    { type: "skill", label: "Skill" },
    { type: "subskill", label: "Subskill" },
    { type: "project", label: "Project" },
  ] as const;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      {items.map(({ type, label }) => {
        const cfg = NODE_CONFIG[type];
        return (
          <div
            key={type}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: type === "root" ? 3 : 2,
                background: cfg.bg,
                border: cfg.border,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "rgba(148,163,184,0.7)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
const nodeTypes = { careerNode: CareerNodeComponent };
// ─── Inner Graph (uses useReactFlow hook) ─────────────────────────────────────

function CareerGraphInner({
  rawNodes,
  rawEdges,
}: {
  rawNodes: CareerNode[];
  rawEdges: CareerEdge[];
}) {
  const { fitView } = useReactFlow();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  const [dynamicNodes, setDynamicNodes] = useState<CareerNode[]>([]);
  const [dynamicEdges, setDynamicEdges] = useState<CareerEdge[]>([]);

  // Recompute layout whenever expanded set changes
  useEffect(() => {
    const mergedNodes = [...rawNodes, ...dynamicNodes];
    const mergedEdges = [...rawEdges, ...dynamicEdges];

    // Find root dynamically
    const rootNode = mergedNodes.find((n) => n.type === "root");
    const rootId = rootNode?.id || "careers";

    const { nodes, edges } = computeLayout(
      mergedNodes,
      mergedEdges,
      expandedNodes
    );

    setRfNodes(nodes);
    setRfEdges(edges);

    setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 80);
  }, [
    expandedNodes,
    rawNodes,
    rawEdges,
    dynamicNodes,
    dynamicEdges,
    fitView,
  ]);
  const handleNodeClick = useCallback(
    async (_: React.MouseEvent, node: Node) => {
    console.log("CLICKED NODE:", node);
    console.log("NODE DATA:", node.data);
    console.log("EXPANDABLE:", node.data.expandable);
    console.log("EXPANDED:", expandedNodes.has(node.id));
    console.log("Fetching children for:", node.id);
      setSelectedNode((prev) => (prev?.id === node.id ? null : node));

      //if (!node.data.expandable) return;

      // If already expanded, just toggle off
      if (expandedNodes.has(node.id)) {
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
        return;
      }

      // Check if we already have children for this node in our merged dataset
      const allEdges = [...rawEdges, ...dynamicEdges];
      const hasChildrenLoaded = allEdges.some(e => e.source === node.id);

      if (hasChildrenLoaded) {
        setExpandedNodes((prev) => new Set(prev).add(node.id));
        return;
      }

      // If not loaded, fetch from API
      try {
        let res: { nodes: CareerNode[]; edges: CareerEdge[] } = { nodes: [], edges: [] };

        if (node.data.type === "root") {
          res = await getCareerJobs();
        } else if (node.data.type === "job") {
          res = await getCareerSkills(node.id);
        } else if (node.data.type === "skill") {
          res = await getCareerSubskills(node.id);
        }

        if (res.nodes?.length) {
          setDynamicNodes((prev) => {
            const existingIds = new Set(prev.map(n => n.id));
            const newOnes = res.nodes.filter(n => !existingIds.has(n.id));
            return [...prev, ...newOnes];
          });
        }

        if (res.edges?.length) {
          setDynamicEdges((prev) => [...prev, ...res.edges]);
        }

        setExpandedNodes((prev) => new Set(prev).add(node.id));
      } catch (err) {
        console.error("Graph expansion failed:", err);
      }
    },
    [expandedNodes, rawEdges, dynamicEdges]
  );

  return (
  <div
    style={{
      width: "100%",
      height: "700px",
      position: "relative",
      borderRadius: 16,
      overflow: "hidden",
    }}
  >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(e, node) => handleNodeClick(e, node)}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="rgba(99,102,241,0.15)"
        />
        <Controls
          style={{
            background: "rgba(15,20,40,0.9)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        />
        <Panel position="bottom-left">
          <div
            style={{
              background: "rgba(8,12,28,0.85)",
              border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 10,
              padding: "10px 14px",
              backdropFilter: "blur(8px)",
            }}
          >
            <Legend />
          </div>
        </Panel>
        <Panel position="top-left">
          <div
            style={{
              background: "rgba(8,12,28,0.85)",
              border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 10,
              padding: "10px 16px",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#e9d5ff",
                fontFamily: "'Space Mono', monospace",
                letterSpacing: "-0.02em",
              }}
            >
              ✦ Career Graph
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(148,163,184,0.5)",
                marginTop: 2,
                fontFamily: "monospace",
              }}
            >
              Click nodes to explore paths
            </div>
          </div>
        </Panel>
      </ReactFlow>
      <InfoPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}

// ─── Public Component ─────────────────────────────────────────────────────────

export default function CareerGraph({ nodes, edges }: CareerGraphProps) {
const rawNodes = nodes ?? [];
const rawEdges = edges ?? [];
  

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

        @keyframes nodeAppear {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes panelSlide {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .react-flow__controls-button {
          background: rgba(15,20,40,0.9) !important;
          border-color: rgba(99,102,241,0.2) !important;
          color: rgba(148,163,184,0.8) !important;
        }
        .react-flow__controls-button:hover {
          background: rgba(99,102,241,0.15) !important;
        }
        .react-flow__controls-button svg {
          fill: rgba(148,163,184,0.8) !important;
        }
      `}</style>
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: 600,
          background:
            "linear-gradient(160deg, rgba(8,12,28,0.98) 0%, rgba(6,10,24,0.98) 100%)",
          borderRadius: 16,
          border: "1px solid rgba(99,102,241,0.15)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            height: 300,
            background:
              "radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <ReactFlowProvider>
          <CareerGraphInner rawNodes={rawNodes} rawEdges={rawEdges} />
        </ReactFlowProvider>
      </div>
    </>
  );
}