"use client";
// components/ui/BrandLogo.tsx
// Universal Circulating Holographic AI Brain Orb Brand Logo for GrowthOS

import React from "react";
import { Brain } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
}

export default function BrandLogo({ size = "md", showSubtitle = true }: BrandLogoProps) {
  const orbSize = size === "sm" ? 38 : size === "lg" ? 54 : 44;
  const brainSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;
  const titleSize = size === "sm" ? "1.05rem" : size === "lg" ? "1.35rem" : "1.18rem";
  const subSize = size === "sm" ? "0.56rem" : size === "lg" ? "0.68rem" : "0.6rem";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size === "sm" ? "10px" : "12px" }}>
      <style>{`
        .gos-brand-orb {
          position: relative;
          width: ${orbSize}px;
          height: ${orbSize}px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.85);
          animation: gosOrbFloat 4s ease-in-out infinite;
        }

        .gos-brand-orb__glow,
        .gos-brand-orb__ring,
        .gos-brand-orb__core {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }

        .gos-brand-orb__glow--outer {
          inset: -10px;
          background: radial-gradient(circle, rgba(0, 229, 255, 0.4) 0%, rgba(124, 58, 237, 0.2) 42%, transparent 72%);
          filter: blur(8px);
          animation: gosOrbPulse 2.4s ease-in-out infinite;
        }

        .gos-brand-orb__glow--inner {
          inset: -4px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 68%);
          filter: blur(4px);
        }

        .gos-brand-orb__ring--outer {
          border: 2px solid transparent;
          border-top-color: #00e5ff;
          border-right-color: #7c3aed;
          animation: gosOrbSpin 3s linear infinite;
          filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.7));
        }

        .gos-brand-orb__ring--middle {
          inset: 5px;
          border: 1.8px solid transparent;
          border-bottom-color: #7c3aed;
          border-left-color: #3b82f6;
          animation: gosOrbSpinReverse 2.4s linear infinite;
        }

        .gos-brand-orb__ring--inner {
          inset: 10px;
          border: 1.5px solid transparent;
          border-top-color: rgba(255, 255, 255, 0.9);
          border-bottom-color: #00e5ff;
          animation: gosOrbSpin 1.6s linear infinite;
          opacity: 0.9;
        }

        .gos-brand-orb__core {
          inset: 8px;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at top, rgba(99, 102, 241, 0.96), rgba(8, 11, 20, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 0 14px rgba(0, 229, 255, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.12);
          color: white;
          animation: gosOrbGlow 2.2s ease-in-out infinite;
        }

        @keyframes gosOrbSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes gosOrbSpinReverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @keyframes gosOrbGlow {
          0%, 100% { transform: scale(0.96); opacity: 0.88; }
          50% { transform: scale(1.05); opacity: 1; }
        }

        @keyframes gosOrbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes gosOrbPulse {
          0%, 100% { opacity: 0.55; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>

      {/* Circulating Holographic AI Brain Orb */}
      <div className="gos-brand-orb" aria-hidden="true">
        <div className="gos-brand-orb__glow gos-brand-orb__glow--outer" />
        <div className="gos-brand-orb__glow gos-brand-orb__glow--inner" />
        <div className="gos-brand-orb__ring gos-brand-orb__ring--outer" />
        <div className="gos-brand-orb__ring gos-brand-orb__ring--middle" />
        <div className="gos-brand-orb__ring gos-brand-orb__ring--inner" />
        <div className="gos-brand-orb__core">
          <Brain size={brainSize} style={{ color: "#ffffff", filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))" }} />
        </div>
      </div>

      {/* Brand Text */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <div style={{ fontFamily: "var(--font-syne), 'Syne', 'Rajdhani', sans-serif", fontSize: titleSize, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          Growth<span style={{ color: "#00e5ff" }}>OS</span>
        </div>
        {showSubtitle && (
          <div style={{ fontSize: subSize, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255, 255, 255, 0.45)", fontWeight: 600, marginTop: "2px" }}>
            AI OPERATING SYSTEM
          </div>
        )}
      </div>
    </div>
  );
}
