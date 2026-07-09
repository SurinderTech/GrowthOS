// src/components/ui/AIDashboard.tsx
'use client';

import { useState, useEffect, useRef } from "react";

export function AIDashboard() {
  const [execScore, setExecScore] = useState(87);
  const [typing, setTyping] = useState("");
  const fullMsg = "Your focus block is scheduled. Eliminating 3 distractions...";
  const tIdx = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      tIdx.current = (tIdx.current + 1) % (fullMsg.length + 10);
      setTyping(fullMsg.slice(0, Math.min(tIdx.current, fullMsg.length)));
    }, 60);
    const s = setInterval(() => setExecScore(v => Math.min(99, v + Math.floor(Math.random() * 3))), 3000);
    return () => { clearInterval(t); clearInterval(s); };
  }, []);

  return (
    <div style={{ 
      background: "rgba(8,10,24,0.9)", 
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(99,102,241,0.25)", 
      borderRadius: 28, 
      padding: 24, 
      width: "100%", 
      maxWidth: 420,
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>GrowthOS Dashboard</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 11, color: "#34d399", fontWeight: 500 }}>LIVE</span>
        </div>
      </div>

      {/* Execution Score Circle */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="7" />
            <circle cx="45" cy="45" r="38" fill="none" stroke="#6366f1" strokeWidth="7"
              strokeDasharray={`${2 * Math.PI * 38 * execScore / 100} ${2 * Math.PI * 38 * (1 - execScore / 100)}`}
              strokeLinecap="round" transform="rotate(-90 45 45)"
              style={{ transition: "stroke-dasharray 1s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{execScore}%</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 1 }}>EXEC</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Execution Probability</div>
          <div style={{ fontSize: 13, color: "#818cf8", marginBottom: 12, fontWeight: 600 }}>🔥 On a 14-day streak</div>
          <div style={{ display: "flex", gap: 5 }}>
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <div key={i} style={{ 
                flex: 1, 
                height: 32, 
                borderRadius: 6, 
                background: i < 5 ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.08)", 
                display: "flex", 
                alignItems: "flex-end", 
                justifyContent: "center", 
                paddingBottom: 5 
              }}>
                <span style={{ fontSize: 8, color: i < 5 ? "white" : "rgba(255,255,255,0.3)" }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 15px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Task Completion</span>
          <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>+23% this week</span>
        </div>
        <svg width="100%" height="45" viewBox="0 0 280 45" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,35 C20,30 40,22 70,24 C100,26 120,12 150,10 C180,8 210,18 240,12 C260,9 270,7 280,5" fill="none" stroke="#6366f1" strokeWidth="2.5" />
          <path d="M0,35 C20,30 40,22 70,24 C100,26 120,12 150,10 C180,8 210,18 240,12 C260,9 270,7 280,5 L280,45 L0,45Z" fill="url(#chartGrad)" />
        </svg>
      </div>

      {/* AI Coach Chat */}
      <div style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, padding: "12px 15px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#a78bfa", marginBottom: 6, fontWeight: 700, letterSpacing: 1.5 }}>AI COACH</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
          {typing}<span style={{ animation: "blink 1s infinite", marginLeft: 2 }}>|</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { icon: "⏱", value: "4.2h", label: "Focus" },
          { icon: "🎯", value: "12/14", label: "Goals" },
          { icon: "⚡", value: "98", label: "Score" }
        ].map((item, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{item.value}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: 1 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}