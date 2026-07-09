// src/components/sections/CtaSection.tsx
'use client';

interface CtaSectionProps {
  onCTA: () => void;
}

export function CtaSection({ onCTA }: CtaSectionProps) {
  return (
    <section style={{ padding: "100px 5%", background: "#05070D", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 800, textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(32px,5vw,64px)", fontWeight: 900, lineHeight: 1.15, letterSpacing: -1.5, marginBottom: 24 }}>
          The Internet Gave Us Knowledge.
          <br />
          <span style={{ color: "#60a5fa" }}>It Never Gave Us Execution.</span>
        </h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 17, lineHeight: 1.7, marginBottom: 40 }}>
          Millions start goals every day. Few finish them.<br />GrowthOS is built to change that.
        </p>
        <button className="cta-btn" onClick={onCTA}>
          🔥 Start Building Your Future
        </button>
      </div>
    </section>
  );
}