"use client";

import { useState } from "react";
import { Sparkles, Rocket } from "lucide-react";
import { PanelShell } from "../PanelShell";

export function OpportunityAgent({ onClose }: { onClose: () => void }) {
  const [scanning, setScanning] = useState(false);
  const opportunities = [
    { title: "Senior AI Full-Stack Developer", desc: "Remote role building LLM agents & real-time workflows.", urgency: "⚡ Act Now", match: "96%", pay: "$120k–$150k" },
    { title: "Frontend Architecture Lead", desc: "Build state-of-the-art Next.js & React dashboards.", urgency: "📅 This Week", match: "91%", pay: "$110k–$135k" },
    { title: "AI Agentic Workflows Freelance Project", desc: "2-month contract to automate customer service pipelines.", urgency: "📆 This Month", match: "88%", pay: "₹1,500/hr" },
  ];

  return (
    <PanelShell
      icon={<Rocket size={22} style={{ color: "#f59e0b" }} />}
      title="Opportunity Agent Workspace"
      sub="AI market scanner matching you with high-value roles, gigs & projects"
      accent="#f59e0b"
      onClose={onClose}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Live AI Matched Opportunities</span>
        <button
          onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 1200); }}
          style={{ padding: "6px 12px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", color: "#f59e0b", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
        >
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

export const OpportunityAgentPanel = OpportunityAgent;
export default OpportunityAgent;
