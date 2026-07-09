// src/components/sections/AIAccountabilitySection.tsx
'use client';

export function AIAccountabilitySection() {
  const features = ["Daily pressure system", "Adaptive schedules", "AI behavior analysis", "Missed deadline detection", "Smart focus sessions", "Execution scoring"];

  return (
    <section id="community" style={{ padding: "100px 5%", background: "#050709" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 60, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto", animation: "brainPulse 3s ease-in-out infinite" }}>
          <div style={{ width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.15) 0%,rgba(99,102,241,0.03) 60%,transparent 100%)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(99,102,241,0.15)", position: "relative" }}>
            <div style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.2)", animation: "spinSlow 12s linear infinite" }} />
            <div style={{ position: "absolute", inset: 20, borderRadius: "50%", border: "1px dashed rgba(168,85,247,0.15)", animation: "spinSlow 8s linear infinite reverse" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 8 }}>🤖</div>
              <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>AI Coach</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "pulse 1.5s infinite" }} />
                <span style={{ fontSize: 10, color: "#34d399" }}>ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="section-tag" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}>AI Accountability</div>
          <h2 style={{ fontSize: "clamp(28px,4vw,50px)", fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, marginBottom: 20 }}>
            Your AI Doesn't Just Suggest.<br />
            <span style={{ color: "#818cf8" }}>It Pushes.</span>
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 32, fontWeight: 300 }}>
            Unlike passive productivity tools, GrowthOS actively monitors your behavior, detects drift, and intervenes with precision to keep you on track.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {features.map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: "#818cf8" }}>✓</span>
                </div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}