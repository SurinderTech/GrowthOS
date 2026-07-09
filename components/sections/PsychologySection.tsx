// src/components/sections/PsychologySection.tsx
'use client';

import { PSYCHOLOGY } from "../constants";

interface PsychologySectionProps {
  onCTA: () => void;
}

export function PsychologySection({ onCTA }: PsychologySectionProps) {
  return (
    <section id="about" style={{ padding: "100px 5%", background: "linear-gradient(160deg,#060913,#080d1c,#060913)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 80, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="section-tag" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc" }}>Psychology</div>
          <h2 style={{ fontSize: "clamp(28px,4vw,50px)", fontWeight: 900, letterSpacing: -1, marginBottom: 16 }}>
            Built Around<br />
            <span style={{ color: "#c084fc" }}>Human Behavior.</span>
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.75, fontWeight: 300, marginBottom: 36 }}>
            Every feature is designed around how the brain actually works — not how we wish it did.
          </p>
          <button 
            className="cta-btn" 
            onClick={onCTA} 
            style={{ background: "linear-gradient(135deg,#9333ea,#c084fc)" }}
          >
            Start Your System →
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 16 }}>
          {PSYCHOLOGY.map(({ label, desc }, i) => (
            <div 
              key={label} 
              style={{ 
                display: "flex", 
                gap: 16, 
                alignItems: "flex-start", 
                padding: "18px 20px", 
                background: "rgba(168,85,247,0.05)", 
                border: "1px solid rgba(168,85,247,0.1)", 
                borderRadius: 14,
                transition: "all 0.2s ease",
                cursor: "default"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(168,85,247,0.1)";
                e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(168,85,247,0.05)";
                e.currentTarget.style.borderColor = "rgba(168,85,247,0.1)";
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, color: "#c084fc", fontWeight: 800 }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}