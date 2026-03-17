'use client';

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  BackgroundVariant,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  title: string;
  week: number;
  completed: boolean;
  description?: string;
}

export interface Month {
  id: string;
  label: string;        // e.g. "Month 1"
  milestones: Milestone[];
}

export interface GrowthPlan {
  id: string;
  title: string;
  months: Month[];
}

type Props = {
  plan: GrowthPlan;
};

// ─── Node Data Shape ──────────────────────────────────────────────────────────

interface MilestoneNodeData {
  title: string;
  week: number;
  completed: boolean;
  monthLabel: string;
  isFirst: boolean;
  isLast: boolean;
}

// ─── Layout Constants ─────────────────────────────────────────────────────────

const NODE_WIDTH  = 210;
const NODE_HEIGHT = 90;
const H_GAP       = 100;  // horizontal gap between month columns
const V_GAP       = 36;   // vertical gap between milestone rows
const COL_WIDTH   = NODE_WIDTH + H_GAP;

// ─── Milestone Node Component ─────────────────────────────────────────────────

const MilestoneNode: React.FC<NodeProps<MilestoneNodeData>> = ({ data, selected }) => {
  const { title, week, completed, monthLabel, isFirst, isLast } = data;

  return (
    <div
      style={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        borderRadius: 14,
        padding: '14px 16px',
        background: completed
          ? 'linear-gradient(135deg, rgba(20, 60, 40, 0.95) 0%, rgba(10, 40, 28, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(15, 20, 40, 0.97) 0%, rgba(10, 14, 32, 0.97) 100%)',
        border: completed
          ? '1px solid rgba(52, 211, 153, 0.55)'
          : selected
            ? '1px solid rgba(99, 179, 237, 0.7)'
            : '1px solid rgba(99, 120, 180, 0.28)',
        boxShadow: completed
          ? '0 0 18px rgba(52, 211, 153, 0.28), inset 0 0 12px rgba(52, 211, 153, 0.06)'
          : selected
            ? '0 0 18px rgba(99, 179, 237, 0.22)'
            : '0 4px 24px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        cursor: 'default',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer overlay for completed nodes */}
      {completed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 14,
            background:
              'linear-gradient(120deg, transparent 30%, rgba(52, 211, 153, 0.07) 50%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Month label (only on first node of each column) */}
      {isFirst && (
        <span
          style={{
            fontFamily: "'DM Mono', 'Fira Code', monospace",
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: completed ? 'rgba(52, 211, 153, 0.6)' : 'rgba(148, 163, 220, 0.5)',
            marginBottom: 2,
          }}
        >
          {monthLabel}
        </span>
      )}

      {/* Title */}
      <span
        style={{
          fontFamily: "'Outfit', 'DM Sans', sans-serif",
          fontSize: 13.5,
          fontWeight: 600,
          color: completed ? 'rgba(167, 243, 208, 0.95)' : 'rgba(220, 230, 255, 0.92)',
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </span>

      {/* Week badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: completed ? 'rgba(52, 211, 153, 0.75)' : 'rgba(148, 163, 220, 0.55)',
            letterSpacing: '0.06em',
          }}
        >
          Week {week}
        </span>

        {completed && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              background: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              borderRadius: 6,
              padding: '1px 7px',
              fontSize: 9,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.12em',
              color: 'rgba(52, 211, 153, 0.9)',
              textTransform: 'uppercase',
            }}
          >
            ✓ Done
          </span>
        )}
      </div>

      {/* Handles */}
      {!isFirst && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: completed ? 'rgba(52, 211, 153, 0.6)' : 'rgba(99, 120, 200, 0.4)',
            border: 'none',
            width: 8,
            height: 8,
          }}
        />
      )}
      {!isLast && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: completed ? 'rgba(52, 211, 153, 0.6)' : 'rgba(99, 120, 200, 0.4)',
            border: 'none',
            width: 8,
            height: 8,
          }}
        />
      )}
    </div>
  );
};

const nodeTypes = { milestone: MilestoneNode };

// ─── Graph Builder ────────────────────────────────────────────────────────────

function buildGraph(plan: GrowthPlan): { nodes: Node<MilestoneNodeData>[]; edges: Edge[] } {
  const nodes: Node<MilestoneNodeData>[] = [];
  const edges: Edge[] = [];

  let prevNodeId: string | null = null;

  plan.months.forEach((month, mIdx) => {
    const x = mIdx * COL_WIDTH;

    month.milestones.forEach((ms, msIdx) => {
      const y = msIdx * (NODE_HEIGHT + V_GAP);
      const nodeId = `node-${month.id}-${ms.id}`;

      const isFirst = mIdx === 0 && msIdx === 0;
      const totalNodes =
        plan.months.reduce((acc, m) => acc + m.milestones.length, 0);
      const globalIdx =
        plan.months.slice(0, mIdx).reduce((acc, m) => acc + m.milestones.length, 0) + msIdx;
      const isLast = globalIdx === totalNodes - 1;

      nodes.push({
        id: nodeId,
        type: 'milestone',
        position: { x, y },
        data: {
          title: ms.title,
          week: ms.week,
          completed: ms.completed,
          monthLabel: month.label,
          isFirst: msIdx === 0,   // first in column gets label
          isLast,
        },
      });

      // Sequential edge from previous node
      if (prevNodeId) {
        const prevMs = (() => {
          let idx = 0;
          for (const m of plan.months) {
            for (const milestone of m.milestones) {
              if (idx === globalIdx - 1) return milestone;
              idx++;
            }
          }
          return null;
        })();

        edges.push({
          id: `edge-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId,
          type: 'smoothstep',
          animated: !ms.completed,
          style: {
            stroke: ms.completed
              ? 'rgba(52, 211, 153, 0.45)'
              : 'rgba(99, 120, 200, 0.35)',
            strokeWidth: 1.5,
            strokeDasharray: ms.completed ? undefined : '5 4',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: ms.completed ? 'rgba(52, 211, 153, 0.6)' : 'rgba(99, 120, 200, 0.5)',
            width: 14,
            height: 14,
          },
        });
      }

      prevNodeId = nodeId;
    });
  });

  return { nodes, edges };
}

// ─── Inner Graph (needs ReactFlowProvider context) ────────────────────────────

const RoadmapGraphInner: React.FC<Props> = ({ plan }) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(plan),
    [plan]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Sync when plan changes
  const { nodes: freshNodes, edges: freshEdges } = useMemo(
    () => buildGraph(plan),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(plan)]
  );

  return (
    <ReactFlow
      nodes={freshNodes}
      edges={freshEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: 'transparent' }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={28}
        size={1}
        color="rgba(99, 120, 200, 0.18)"
      />
      <Controls
        style={{
          background: 'rgba(10, 14, 32, 0.85)',
          border: '1px solid rgba(99, 120, 180, 0.22)',
          borderRadius: 10,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      />
    </ReactFlow>
  );
};

// ─── Public Component ─────────────────────────────────────────────────────────

const RoadmapGraph: React.FC<Props> = ({ plan }) => {
  const completedCount = plan.months.reduce(
    (acc, m) => acc + m.milestones.filter((ms) => ms.completed).length,
    0
  );
  const totalCount = plan.months.reduce((acc, m) => acc + m.milestones.length, 0);
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      style={{
        width: '100%',
        height: 500,
        borderRadius: 20,
        overflow: 'hidden',
        background:
          'linear-gradient(160deg, rgba(8, 12, 28, 0.98) 0%, rgba(6, 10, 24, 0.98) 100%)',
        border: '1px solid rgba(99, 120, 180, 0.2)',
        boxShadow:
          '0 8px 40px rgba(0,0,0,0.6), inset 0 0 60px rgba(10, 20, 60, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif",
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px 12px',
          borderBottom: '1px solid rgba(99, 120, 180, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.015)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Pulse dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'rgba(52, 211, 153, 0.9)',
              boxShadow: '0 0 8px rgba(52, 211, 153, 0.7)',
              display: 'inline-block',
              animation: 'gos-pulse 2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(220, 230, 255, 0.88)',
              letterSpacing: '-0.01em',
            }}
          >
            {plan.title}
          </span>
        </div>

        {/* Progress pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: 'rgba(148, 163, 220, 0.6)',
              letterSpacing: '0.06em',
            }}
          >
            {completedCount}/{totalCount} milestones
          </span>
          <div
            style={{
              position: 'relative',
              width: 80,
              height: 5,
              borderRadius: 99,
              background: 'rgba(99, 120, 180, 0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progressPct}%`,
                borderRadius: 99,
                background:
                  'linear-gradient(90deg, rgba(52, 211, 153, 0.7), rgba(110, 231, 183, 0.9))',
                boxShadow: '0 0 6px rgba(52, 211, 153, 0.5)',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(52, 211, 153, 0.8)',
              letterSpacing: '0.04em',
              minWidth: 32,
            }}
          >
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Graph canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlowProvider>
          <RoadmapGraphInner plan={plan} />
        </ReactFlowProvider>
      </div>

      {/* Pulse animation keyframe injected via style tag */}
      <style>{`
        @keyframes gos-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        .react-flow__controls-button {
          background: rgba(10, 14, 32, 0.85) !important;
          border-color: rgba(99, 120, 180, 0.22) !important;
          color: rgba(148, 163, 220, 0.8) !important;
          fill: rgba(148, 163, 220, 0.8) !important;
        }
        .react-flow__controls-button:hover {
          background: rgba(30, 40, 80, 0.9) !important;
        }
      `}</style>
    </div>
  );
};

export default RoadmapGraph;