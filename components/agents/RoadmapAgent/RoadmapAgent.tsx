"use client";

import { useState, useEffect } from "react";
import { Sparkles, GitBranch } from "lucide-react";
import { PanelShell } from "../PanelShell";
import { getGrowthPlan, type GrowthPlan } from "@/lib/dashboard-api";

export function RoadmapAgent({ onClose }: { onClose: () => void }) {
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
    <PanelShell
      icon={<GitBranch size={22} style={{ color: "#818cf8" }} />}
      title="Roadmap Agent Workspace"
      sub="AI Growth Plan & Milestone Execution Roadmap"
      accent="#818cf8"
      onClose={onClose}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "white" }}>{currentPlan.title}</div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>{currentPlan.summary}</div>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={{ padding: "6px 12px", background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.3)", borderRadius: "8px", color: "#818cf8", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}
        >
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
            }}
          >
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
            }}
          >
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

export const RoadmapAgentPanel = RoadmapAgent;
export default RoadmapAgent;
