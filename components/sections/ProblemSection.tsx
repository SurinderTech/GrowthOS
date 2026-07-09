// src/components/sections/ProblemSection.tsx
'use client';

export function ProblemSection() {
  const failures = [
    ["Infinite motivation. Zero systems.", "Goals die without structure."],
    ["Goals without accountability die.", "No one to answer to = no urgency."],
    ["Consistency fails without feedback loops.", "You can't improve what you don't measure."],
    ["Willpower runs out by Tuesday.", "Biology beats intention every time."],
  ];

  const solutions = [
    ["AI builds your system automatically.", "No guesswork, no setup paralysis."],
    ["Daily AI accountability check-ins.", "Your AI pushes back when you drift."],
    ["Real-time execution scoring.", "Every action tracked, every win reinforced."],
    ["Behavioral loops, not willpower.", "Science-backed habit architecture."],
  ];

  return (
    <section style={{ padding: "100px 5%", background: "#050709" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div className="section-tag" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>The Problem</div>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>
            Why Most People<br />
            <span style={{ color: "#f87171" }}>Never Execute</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {failures.map(([h, d], i) => (
              <div 
                key={i} 
                style={{ 
                  padding: "18px 22px", 
                  borderRadius: 14, 
                  background: "rgba(248,113,113,0.05)", 
                  border: "1px solid rgba(248,113,113,0.1)",
                  transition: "all 0.2s ease",
                  cursor: "default"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.85";
                  e.currentTarget.style.background = "rgba(248,113,113,0.05)";
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>❌ {h}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{d}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {solutions.map(([h, d], i) => (
              <div 
                key={i} 
                style={{ 
                  padding: "18px 22px", 
                  borderRadius: 14, 
                  background: "rgba(99,102,241,0.07)", 
                  border: "1px solid rgba(99,102,241,0.2)",
                  transition: "all 0.2s ease",
                  cursor: "default"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.12)";
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.07)";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", marginBottom: 4 }}>✅ {h}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}