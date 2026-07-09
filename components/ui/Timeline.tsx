// src/components/ui/Timeline.tsx
'use client';

import { useState, useEffect } from "react";
import { PIPELINE } from "../constants";

export function Timeline() {
  const [activePipeline, setActivePipeline] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActivePipeline(p => (p + 1) % PIPELINE.length), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
      <div className="section-tag" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>Execution Engine</div>
      <h2 style={{ fontSize: "clamp(28px,4vw,52px)", fontWeight: 900, letterSpacing: -1, marginBottom: 12 }}>
        This Isn't a To-Do App.
      </h2>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 60, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
        A complete execution pipeline that turns ambition into automatic daily momentum.
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
        {PIPELINE.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              padding: "14px 20px", 
              borderRadius: 12,
              background: activePipeline === i ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
              border: activePipeline === i ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.08)",
              transition: "all 0.4s ease",
              transform: activePipeline === i ? "scale(1.08)" : "scale(1)",
              boxShadow: activePipeline === i ? "0 0 20px rgba(99,102,241,0.25)" : "none",
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{step.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: activePipeline === i ? "#818cf8" : "rgba(255,255,255,0.4)", letterSpacing: 0.5 }}>
                {step.label}
              </div>
            </div>
            {i < PIPELINE.length - 1 && (
              <div style={{ 
                width: 20, 
                height: 2, 
                background: activePipeline > i ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.08)", 
                borderRadius: 2, 
                transition: "background 0.4s ease" 
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}