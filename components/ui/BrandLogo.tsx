"use client";
// components/ui/BrandLogo.tsx — GrowthOS Premium Animated Logo
// Uses the actual logo image with CSS animated glowing orbital rings

import React from "react";
import Image from "next/image";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showSubtitle?: boolean;
  vertical?: boolean;
}

const CFG = {
  sm: { img: 52,  title: 20, sub: 10, gap: 12 },
  md: { img: 68,  title: 24, sub: 11, gap: 14 },
  lg: { img: 96,  title: 30, sub: 13, gap: 18 },
};

export default function BrandLogo({
  size       = "md",
  showText   = true,
  showSubtitle = false,
  vertical   = false,
}: BrandLogoProps) {
  const c = CFG[size];
  const outerSize = Math.round(c.img * 1.5); // tighter ratio = image more prominent

  return (
    <>
      <style>{`
        @keyframes gos-ring-cw  { to { transform: rotate(360deg);  } }
        @keyframes gos-ring-ccw { to { transform: rotate(-360deg); } }
        @keyframes gos-pulse-glow {
          0%,100% { opacity:.55; transform:scale(.97); }
          50%      { opacity:1;   transform:scale(1.06); }
        }
        @keyframes gos-float {
          0%,100% { transform:translateY(0px);  }
          50%      { transform:translateY(-4px); }
        }
        @keyframes gos-shimmer-w {
          0%   { background-position:-200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes gos-shimmer-c {
          0%   { background-position:-200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div style={{
        display:       "flex",
        flexDirection: vertical ? "column" : "row",
        alignItems:    "center",
        gap:           `${c.gap}px`,
        userSelect:    "none",
      }}>

        {/* ── Orbital orb with actual logo image ───────────────────── */}
        <div style={{
          position:   "relative",
          width:      `${outerSize}px`,
          height:     `${outerSize}px`,
          flexShrink: 0,
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          animation:  "gos-float 4s ease-in-out infinite",
        }}>

          {/* Outer ambient glow */}
          <div style={{
            position:  "absolute",
            inset:     `-${outerSize * 0.15}px`,
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(0,229,255,.3) 0%, rgba(168,85,247,.15) 45%, transparent 72%)",
            filter:    "blur(10px)",
            animation: "gos-pulse-glow 3s ease-in-out infinite",
            pointerEvents: "none",
          }} />

          {/* Ring 1 — cyan, tilted, clockwise */}
          <div style={{
            position:   "absolute",
            inset:      0,
            borderRadius: "50%",
            border:     `${Math.max(1.5, c.img * 0.038)}px solid transparent`,
            borderTopColor:   "#00e5ff",
            borderRightColor: "#22d3ee",
            borderBottomColor:"transparent",
            borderLeftColor:  "transparent",
            transform:  "rotateX(70deg) rotateY(-15deg)",
            animation:  "gos-ring-cw 4s linear infinite",
            filter:     "drop-shadow(0 0 5px rgba(0,229,255,.9))",
          }} />

          {/* Ring 2 — purple, tilted opposite, counter-clockwise */}
          <div style={{
            position:   "absolute",
            inset:      `${outerSize * 0.03}px`,
            borderRadius: "50%",
            border:     `${Math.max(1.5, c.img * 0.034)}px solid transparent`,
            borderTopColor:   "transparent",
            borderRightColor: "#a855f7",
            borderBottomColor:"#c084fc",
            borderLeftColor:  "transparent",
            transform:  "rotateX(70deg) rotateY(60deg)",
            animation:  "gos-ring-ccw 5s linear infinite",
            filter:     "drop-shadow(0 0 4px rgba(168,85,247,.85))",
          }} />

          {/* Ring 3 — indigo, diagonal, clockwise slower */}
          <div style={{
            position:   "absolute",
            inset:      `${outerSize * 0.06}px`,
            borderRadius: "50%",
            border:     `${Math.max(1, c.img * 0.028)}px solid transparent`,
            borderTopColor:   "#6366f1",
            borderLeftColor:  "#818cf8",
            borderBottomColor:"transparent",
            borderRightColor: "transparent",
            transform:  "rotateX(55deg) rotateY(-45deg)",
            animation:  "gos-ring-cw 7s linear infinite",
            filter:     "drop-shadow(0 0 3px rgba(99,102,241,.7))",
          }} />

          {/* Actual logo image */}
          <div style={{
            position:   "relative",
            width:      `${c.img}px`,
            height:     `${c.img}px`,
            borderRadius:"50%",
            overflow:   "hidden",
            flexShrink: 0,
            boxShadow:  `0 0 ${c.img * 0.4}px rgba(0,229,255,.4), 0 0 ${c.img * 0.15}px rgba(168,85,247,.3)`,
          }}>
            <Image
              src="/growthos-logo.jpg"
              alt="GrowthOS Logo"
              fill
              sizes={`${c.img}px`}
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        </div>

        {/* ── Brand Text ───────────────────────────────────────────── */}
        {showText && (
          <div style={{
            display:       "flex",
            flexDirection: "column",
            alignItems:    vertical ? "center" : "flex-start",
            gap:           "2px",
          }}>
            <div style={{
              display:    "flex",
              alignItems: "baseline",
              lineHeight: 1,
            }}>
              {/* "Growth" — white shimmer */}
              <span style={{
                fontFamily:    "'Syne','Inter',sans-serif",
                fontSize:      `${c.title}px`,
                fontWeight:    900,
                letterSpacing: "-0.025em",
                background:    "linear-gradient(90deg,#ffffff 0%,#e2e8f0 35%,#ffffff 55%,#e2e8f0 100%)",
                backgroundSize:"200% auto",
                WebkitBackgroundClip:"text",
                WebkitTextFillColor: "transparent",
                backgroundClip:"text",
                animation:     "gos-shimmer-w 4s linear infinite",
              }}>
                Growth
              </span>
              {/* "OS" — cyan glow shimmer */}
              <span style={{
                fontFamily:    "'Syne','Inter',sans-serif",
                fontSize:      `${c.title}px`,
                fontWeight:    900,
                letterSpacing: "-0.025em",
                background:    "linear-gradient(135deg,#00e5ff 0%,#67e8f9 40%,#00e5ff 70%,#22d3ee 100%)",
                backgroundSize:"200% auto",
                WebkitBackgroundClip:"text",
                WebkitTextFillColor: "transparent",
                backgroundClip:"text",
                filter:        "drop-shadow(0 0 6px rgba(0,229,255,.7))",
                animation:     "gos-shimmer-c 3s linear infinite",
              }}>
                OS
              </span>
            </div>

            {showSubtitle && (
              <div style={{
                fontSize:      `${c.sub}px`,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color:         "rgba(255,255,255,0.38)",
                fontWeight:    600,
                whiteSpace:    "nowrap",
              }}>
                AI Operating System
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
