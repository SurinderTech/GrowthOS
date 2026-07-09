// src/components/ui/HowitWork.tsx
'use client';

export function HowitWork() {
  const steps = [
    { number: "01", title: "Connect Your Goals", desc: "Link your calendar, tasks, and objectives" },
    { number: "02", title: "AI Creates Your System", desc: "Personalized execution framework" },
    { number: "03", title: "Daily Accountability", desc: "AI check-ins and progress tracking" },
    { number: "04", title: "Optimize & Scale", desc: "Continuous improvement loops" }
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div className="section-tag" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8" }}>How It Works</div>
        <h2 style={{ fontSize: "clamp(28px,4vw,52px)", fontWeight: 900, letterSpacing: -1 }}>
          From Chaos to{" "}
          <span style={{ background: "linear-gradient(135deg,#818cf8,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Execution</span>
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ textAlign: "center", padding: 24, background: "rgba(255,255,255,0.03)", borderRadius: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#6366f1", marginBottom: 12 }}>{step.number}</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{step.title}</h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}