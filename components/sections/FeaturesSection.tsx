// src/components/sections/FeaturesSection.tsx
'use client';

import { FEATURES } from "../constants";

export function FeaturesSection() {
  return (
    <section id="features" style={{ padding: "100px 5%", background: "linear-gradient(180deg,#060913 0%,#050709 100%)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div className="section-tag" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8" }}>Features</div>
          <h2 style={{ fontSize: "clamp(28px,4vw,52px)", fontWeight: 900, letterSpacing: -1 }}>
            The Full Stack of{" "}
            <span style={{ background: "linear-gradient(135deg,#818cf8,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Execution</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="features-grid">
          {FEATURES.map(({ icon, title, desc, color }) => (
            <div 
              key={title} 
              className="card-hover" 
              style={{ 
                padding: "28px 24px", 
                background: "rgba(255,255,255,0.03)", 
                border: "1px solid rgba(255,255,255,0.07)", 
                borderRadius: 18, 
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${color}0f`;
                e.currentTarget.style.borderColor = `${color}44`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 18 }}>{icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}