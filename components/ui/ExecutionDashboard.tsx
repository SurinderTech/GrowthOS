// src/components/ui/ExecutionDashboard.tsx
'use client';

export function ExecutionDashboard() {
  return (
    <div style={{
      background: "rgba(8,10,24,0.95)",
      border: "1px solid rgba(99,102,241,0.25)",
      borderRadius: 20,
      padding: 20,
      width: "100%",
      maxWidth: 420,
      backdropFilter: "blur(20px)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Execution Dashboard</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 10, color: "#34d399" }}>LIVE</span>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Track Your Progress</h3>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Real-time metrics, streaks, and AI coaching</p>
      </div>
    </div>
  );
}