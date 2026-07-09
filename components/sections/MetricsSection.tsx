// src/components/sections/MetricsSection.tsx
'use client';

import { Counter } from "../ui/Counter";
import { METRICS } from "../constants";

// ✅ Make sure this is a named export, NOT a default export
export function MetricsSection() {
  return (
    <section style={{ padding: "80px 5%", background: "linear-gradient(180deg,#060913 0%,#080d1c 100%)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div className="section-tag" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>Live Platform Metrics</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }} className="metrics-grid">
          {METRICS.map(({ target, label }) => (
            <div key={label} style={{ textAlign: "center", padding: "28px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
              <div style={{ fontSize: 34, fontWeight: 900, background: "linear-gradient(135deg,#818cf8,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1, marginBottom: 8 }}>
                <Counter target={target} />
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}