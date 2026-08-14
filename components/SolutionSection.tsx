"use client";
// components/SolutionSection.tsx
//
// "The Solution" — GrowthOS: Your AI Operating System.
// A radial orbit of seven agents around a living, breathing core, a
// feature strip, and a "See It In Action" autoplaying video + step process block.

import { useEffect, useRef } from "react";
import {
  Brain,
  Target,
  Briefcase,
  Box,
  Sparkles,
  BarChart3,
  ShieldCheck,
  RefreshCw,
  User,
  TrendingUp,
  Shield,
  Infinity as InfinityIcon,
  ClipboardList,
  Zap,
  Trophy,
} from "lucide-react";

interface Agent {
  num: string;
  name: string;
  color: string;
  icon: typeof Brain;
  lines: string[];
  x: number;
  y: number;
  side: "top" | "left" | "right";
}

// Center of viewBox (1000 x 640)
const CENTER_X = 500;
const CENTER_Y = 320;
const RADIUS = 210;
const INNER_RADIUS = 90;

// Angles for 7 agents starting from 0° (top center) clockwise:
// theta_i = i * (360° / 7)
// x = CENTER_X + RADIUS * sin(theta)
// y = CENTER_Y - RADIUS * cos(theta)
const AGENTS: Agent[] = [
  {
    num: "01",
    name: "Learning Agent",
    color: "#22d3ee",
    icon: Brain,
    lines: ["Understands how you learn.", "Adapts. Personalizes.", "Improves continuously."],
    x: 500,
    y: 110,
    side: "top",
  },
  {
    num: "02",
    name: "Career Agent",
    color: "#ec4899",
    icon: Target,
    lines: ["Finds the right opportunities.", "Guides your path.", "Opens doors."],
    x: 664.2,
    y: 189.1,
    side: "right",
  },
  {
    num: "03",
    name: "Execution Agent",
    color: "#f59e0b",
    icon: Briefcase,
    lines: ["Keeps you focused.", "Tracks progress.", "Ensures you finish."],
    x: 704.7,
    y: 366.7,
    side: "right",
  },
  {
    num: "04",
    name: "Builder Agent",
    color: "#8b5cf6",
    icon: Box,
    lines: ["Helps you build projects.", "Turns ideas into reality.", "Step by step."],
    x: 591.1,
    y: 509.2,
    side: "right",
  },
  {
    num: "05",
    name: "Nova Assistant",
    color: "#2dd4bf",
    icon: Sparkles,
    lines: ["Your AI copilot.", "Always here.", "Always with you."],
    x: 408.9,
    y: 509.2,
    side: "left",
  },
  {
    num: "06",
    name: "Analytics Agent",
    color: "#eab308",
    icon: BarChart3,
    lines: ["Analyzes your data.", "Provides insights.", "Helps you grow."],
    x: 295.3,
    y: 366.7,
    side: "left",
  },
  {
    num: "07",
    name: "Guard Agent",
    color: "#a855f7",
    icon: ShieldCheck,
    lines: ["Protects your data.", "Ensures privacy.", "Keeps you secure."],
    x: 335.8,
    y: 189.1,
    side: "left",
  },
];

const FEATURES = [
  { icon: RefreshCw, title: "All Agents", sub: "Work Together" },
  { icon: User, title: "Personalized", sub: "For You" },
  { icon: TrendingUp, title: "Track & Improve", sub: "Every Day" },
  { icon: Shield, title: "Secure & Private", sub: "By Design" },
  { icon: RefreshCw, title: "Always Evolving", sub: "Always Improving" },
  { icon: InfinityIcon, title: "One System", sub: "Infinite Possibilities" },
];

const STEPS = [
  { icon: ClipboardList, color: "#3b82f6", title: "Understand You", lines: ["We learn your goals,", "interests & strengths."] },
  { icon: Target, color: "#ec4899", title: "Plan For You", lines: ["We create a personalized", "plan just for you."] },
  { icon: Zap, color: "#eab308", title: "Execute With You", lines: ["We keep you focused", "and help you take action."] },
  { icon: BarChart3, color: "#14b8a6", title: "Track & Improve", lines: ["We analyze, give insights", "and optimize constantly."] },
  { icon: Trophy, color: "#8b5cf6", title: "Achieve More", lines: ["You grow. You win.", "We celebrate with you."] },
];

const PARTICLES = [
  { x: 6, y: 12, d: 0 }, { x: 92, y: 8, d: 0.4 }, { x: 14, y: 78, d: 0.8 },
  { x: 85, y: 88, d: 1.2 }, { x: 48, y: 4, d: 1.6 }, { x: 74, y: 46, d: 2.0 },
  { x: 24, y: 44, d: 0.6 }, { x: 96, y: 60, d: 1.0 }, { x: 4, y: 55, d: 1.4 },
  { x: 60, y: 94, d: 1.8 }, { x: 36, y: 92, d: 0.2 }, { x: 90, y: 30, d: 0.9 },
];

export default function SolutionSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.loop = true;
    v.play().catch(() => { });
  }, []);

  return (
    <section className="sol">
      <style>{`
        .sol {
          position: relative;
          width: 100%;
          background: #04050a;
          padding: 60px 1.5vw 70px;
          overflow: hidden;
        }

        .sol__particles { position: absolute; inset: 0; pointer-events: none; }
        .sol__particle {
          position: absolute;
          width: 3px; height: 3px;
          border-radius: 50%;
          background: #a5b4fc;
          animation: solTwinkle 3.4s ease-in-out infinite;
        }

        .sol__card {
          position: relative;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          border: 1px solid rgba(139,92,246,0.18);
          border-radius: 24px;
          background: radial-gradient(120% 100% at 50% 0%, rgba(88,28,135,0.18), transparent 60%),
                      radial-gradient(80% 80% at 50% 50%, rgba(15,10,30,0.95), rgba(4,5,10,0.98));
          padding: 48px 36px 40px;
        }

        /* ---------- Centered Header ---------- */
        .sol__header {
          text-align: center;
          max-width: 840px;
          margin: 0 auto 36px;
        }

        .sol__eyebrow {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: #a78bfa;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .sol__heading {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(30px, 3.2vw, 44px);
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin: 0 0 14px;
        }

        .sol__heading span {
          background: linear-gradient(135deg, #c084fc 0%, #60a5fa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-left: 8px;
        }

        .sol__lede {
          font-size: 15.5px;
          line-height: 1.6;
          color: rgba(255,255,255,0.7);
          margin: 0 0 4px;
          font-weight: 400;
        }

        .sol__sublede {
          font-size: 15.5px;
          line-height: 1.6;
          color: rgba(255,255,255,0.7);
          margin: 0;
          font-weight: 400;
        }

        .sol__highlight {
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 600;
        }

        /* ---------- Orbit Container ---------- */
        .sol__orbitWrap {
          position: relative;
          width: 100%;
          max-width: 1300px;
          margin: 0 auto;
          aspect-ratio: 1000 / 640;
        }

        .sol__orbitSvg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .sol__node {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 3;
        }

        .sol__nodeIcon {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(8, 9, 20, 0.92);
          border: 1.5px solid var(--c);
          color: var(--c);
          box-shadow: 0 0 20px color-mix(in srgb, var(--c) 55%, transparent);
          animation: solBreathe 3.2s ease-in-out infinite;
          animation-delay: var(--delay);
          transition: transform 0.2s ease;
        }

        .sol__nodeIcon:hover {
          transform: scale(1.08);
        }

        .sol__nodeBadge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          color: var(--c);
          background: #080914;
          border: 1px solid var(--c);
          border-radius: 999px;
          padding: 1px 7px;
          line-height: 1.2;
          box-shadow: 0 0 8px color-mix(in srgb, var(--c) 40%, transparent);
        }

        .sol__label {
          position: absolute;
          top: 50%;
          width: 210px;
          transform: translateY(-50%);
          pointer-events: none;
          z-index: 3;
        }

        .sol__label--top { text-align: center; width: 220px; }
        .sol__label--right { text-align: left; }
        .sol__label--left { text-align: right; }

        .sol__labelName {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
          color: var(--c);
          letter-spacing: -0.01em;
        }
        .sol__labelLine {
          font-size: 11.5px;
          line-height: 1.5;
          color: rgba(255,255,255,0.52);
        }

        .sol__mobileAgentGrid {
          display: none;
        }

        /* Center Core */
        .sol__core {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 4;
        }

        .sol__coreOrb {
          position: relative;
          width: 126px;
          height: 126px;
          display: grid;
          place-items: center;
          border-radius: 50%;
        }

        .sol__coreGlow {
          position: absolute;
          inset: -28px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(99,102,241,0.2) 45%, transparent 75%);
          filter: blur(12px);
          animation: solCoreBreathe 2.8s ease-in-out infinite;
        }

        .sol__coreRingOuter {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #c084fc;
          border-right-color: #60a5fa;
          animation: solSpin 5s linear infinite;
        }

        .sol__coreRingMiddle {
          position: absolute;
          inset: 9px;
          border-radius: 50%;
          border: 1.5px solid transparent;
          border-bottom-color: #818cf8;
          border-left-color: #22d3ee;
          animation: solSpinReverse 4s linear infinite;
        }

        .sol__coreCenter {
          position: relative;
          width: 84px;
          height: 84px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 35% 25%, rgba(139,92,246,0.95), rgba(8,6,20,0.98));
          border: 1.5px solid rgba(255,255,255,0.2);
          box-shadow: 0 0 30px rgba(168,85,247,0.6), inset 0 0 18px rgba(255,255,255,0.1);
          color: white;
        }

        .sol__coreName {
          margin-top: 10px;
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: 19px;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .sol__coreSub {
          font-size: 11px;
          color: #a78bfa;
          margin-top: 1px;
          letter-spacing: 0.03em;
        }

        /* ---------- Feature strip ---------- */
        .sol__strip {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          max-width: 1400px;
          margin: 40px auto 0;
          padding: 16px 28px;
          border-radius: 9999px;
          border: 1px solid rgba(139,92,246,0.25);
          background: rgba(10,8,24,0.6);
          backdrop-filter: blur(12px);
        }

        .sol__stripItem {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sol__stripIcon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid rgba(139,92,246,0.35);
          color: #c084fc;
          background: rgba(139,92,246,0.08);
          flex-shrink: 0;
        }

        .sol__stripIcon--spin svg { animation: solSpin 6s linear infinite; }

        .sol__stripTitle { font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.92); white-space: nowrap; }
        .sol__stripSub { font-size: 11px; color: rgba(255,255,255,0.45); white-space: nowrap; }

        /* ---------- Footer Text Banner ---------- */
        .sol__footerText {
          text-align: center;
          margin-top: 36px;
        }

        .sol__footerTitle {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-size: clamp(20px, 2.2vw, 28px);
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }

        .sol__footerTitle span {
          background: linear-gradient(135deg, #c084fc, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sol__footerSub {
          font-size: 14.5px;
          color: rgba(255,255,255,0.5);
        }

        .sol__footerSub span {
          color: #a78bfa;
          font-weight: 600;
        }

        /* ---------- See it in action ---------- */
        .sol__action {
          width: 100%;
          max-width: 100%;
          margin: 64px auto 0;
          display: grid;
          grid-template-columns: minmax(0,5fr) minmax(0,6fr);
          gap: 48px;
          align-items: center;
        }

        .sol__stage {
          position: relative;
          aspect-ratio: 16 / 9;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(139,92,246,0.4);
          box-shadow: 0 0 40px rgba(139,92,246,0.14), 0 30px 70px rgba(0,0,0,0.5);
          background: #000;
        }

        .sol__video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }

        .sol__actionHeading {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(24px, 2.3vw, 34px);
          color: rgba(255,255,255,0.95);
          margin: 0 0 14px;
        }

        .sol__actionHeading span {
          background: linear-gradient(135deg,#a855f7,#818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sol__actionLede { font-size: 14.5px; line-height: 1.7; color: rgba(255,255,255,0.5); max-width: 520px; margin: 0 0 30px; font-weight: 300; }

        .sol__steps { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }

        .sol__stepConnector {
          position: absolute;
          top: 27px;
          left: 8%;
          right: 8%;
          height: 0;
          border-top: 1px dashed rgba(139,92,246,0.35);
          z-index: 0;
        }

        .sol__step { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 120px; }

        .sol__stepIcon {
          width: 54px; height: 54px; border-radius: 50%;
          display: grid; place-items: center;
          background: #04050a;
          border: 1.5px solid var(--sc);
          color: var(--sc);
          box-shadow: 0 0 14px color-mix(in srgb, var(--sc) 50%, transparent);
          margin-bottom: 12px;
          animation: solBreathe 3.4s ease-in-out infinite;
          animation-delay: var(--sdelay);
        }

        .sol__stepTitle { font-size: 12.5px; font-weight: 700; color: var(--sc); margin-bottom: 6px; }
        .sol__stepLine { font-size: 11px; line-height: 1.5; color: rgba(255,255,255,0.42); }

        /* ---------- Animations ---------- */
        @keyframes solTwinkle { 0%, 100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.6); } }
        @keyframes solBreathe {
          0%, 100% { box-shadow: 0 0 14px color-mix(in srgb, var(--c, var(--sc)) 40%, transparent); transform: scale(1); }
          50% { box-shadow: 0 0 26px color-mix(in srgb, var(--c, var(--sc)) 75%, transparent); transform: scale(1.05); }
        }
        @keyframes solCoreBreathe { 0%, 100% { opacity: 0.75; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.06); } }
        @keyframes solSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes solSpinReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

        @media (max-width: 1024px) {
          .sol__strip { border-radius: 20px; justify-content: center; padding: 16px 20px; }
          .sol__action { grid-template-columns: 1fr; gap: 32px; }
        }

        @media (max-width: 820px) {
          .sol { padding: 36px 12px 48px; }
          .sol__card { padding: 28px 14px 24px; border-radius: 16px; }
          .sol__label { width: 130px; }
          .sol__labelName { font-size: 11.5px; }
          .sol__labelLine { font-size: 10px; }
          .sol__steps { flex-wrap: wrap; justify-content: center; gap: 18px; }
          .sol__stepConnector { display: none; }
        }

        @media (max-width: 768px) {
          .sol { padding: 28px 10px 36px; }
          .sol__card { padding: 20px 10px 18px; border-radius: 14px; }
          .sol__heading { font-size: 22px; }
          .sol__lede { font-size: 13px; }
          .sol__label { display: none !important; }
          .sol__orbitWrap { padding-bottom: 0; }
          .sol__core { transform: translate(-50%, -24%); }
          .sol__coreOrb { width: 72px; height: 72px; }
          .sol__coreCenter { width: 48px; height: 48px; }
          .sol__coreCenter svg { width: 26px; height: 26px; }
          .sol__coreName { font-size: 13px; margin-top: 70px; font-weight: 800; }
          .sol__coreSub { font-size: 9px; margin-top: 1px; color: #a78bfa; }
          .sol__nodeIcon { width: 38px; height: 38px; }
          .sol__nodeIcon svg { width: 17px; height: 17px; }
          .sol__mobileAgentGrid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
            margin-top: 20px;
            width: 100%;
          }
          .sol__mobileAgentCard {
            background: rgba(12, 14, 28, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-left: 3px solid var(--c);
            border-radius: 12px;
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .sol__mobileAgentHeader {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            color: var(--c);
          }
          .sol__mobileAgentNum {
            font-size: 9px;
            font-weight: 800;
            color: var(--c);
            background: rgba(255,255,255,0.08);
            padding: 1px 4px;
            border-radius: 4px;
          }
          .sol__mobileAgentLine {
            font-size: 10.5px;
            color: rgba(255, 255, 255, 0.55);
            line-height: 1.35;
          }
          .sol__step { flex: 1 1 calc(50% - 12px); max-width: 140px; }
          .sol__stepIcon { width: 44px; height: 44px; margin-bottom: 8px; }
          .sol__strip { padding: 12px 14px; gap: 10px; border-radius: 16px; }
          .sol__stripItem { gap: 8px; }
          .sol__stripTitle { font-size: 11.5px; }
          .sol__stripSub { font-size: 10px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sol__particle, .sol__nodeIcon, .sol__coreGlow, .sol__coreRingOuter,
          .sol__coreRingMiddle, .sol__stepIcon, .sol__stripIcon--spin svg {
            animation: none !important;
          }
        }
      `}</style>

      <div className="sol__particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="sol__particle"
            style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` }}
          />
        ))}
      </div>

      <div className="sol__card">
        {/* ---------- Centered Header ---------- */}
        <div className="sol__header">
          <div className="sol__eyebrow">THE SOLUTION</div>
          <h2 className="sol__heading">
            GrowthOS:<span>Your AI Operating System</span>
          </h2>
          <p className="sol__lede">
            Seven intelligent AI agents working together as one system.
          </p>
          <p className="sol__sublede">
            Every step. Every goal. <span className="sol__highlight">Every day.</span>
          </p>
        </div>

        {/* ---------- Perfect Circular Orbit Diagram ---------- */}
        <div className="sol__orbitWrap">
          <svg className="sol__orbitSvg" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet">
            {/* Outer Orbit Circle (Perfect 1:1 Circle) */}
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={RADIUS}
              fill="none"
              stroke="rgba(139,92,246,0.22)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />

            {/* Inner Ring Circle */}
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={INNER_RADIUS}
              fill="none"
              stroke="rgba(168,85,247,0.3)"
              strokeWidth="1.5"
              strokeDasharray="3 4"
            />

            {/* Core Background Ring */}
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r="65"
              fill="none"
              stroke="rgba(139,92,246,0.35)"
              strokeWidth="1"
            />

            {/* Radiating Spoke Lines & Animated Particles */}
            {AGENTS.map((a, i) => {
              const dx = a.x - CENTER_X;
              const dy = a.y - CENTER_Y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const innerX = CENTER_X + (dx / len) * INNER_RADIUS;
              const innerY = CENTER_Y + (dy / len) * INNER_RADIUS;

              return (
                <g key={a.name}>
                  {/* Spoke line */}
                  <line
                    x1={CENTER_X}
                    y1={CENTER_Y}
                    x2={a.x}
                    y2={a.y}
                    stroke={a.color}
                    strokeOpacity="0.38"
                    strokeWidth="1.2"
                    strokeDasharray="3 4"
                  />
                  {/* Glowing dot at inner ring intersection */}
                  <circle
                    cx={innerX}
                    cy={innerY}
                    r="3.5"
                    fill={a.color}
                  />
                  {/* Moving particle on spoke line */}
                  <circle r="2.5" fill={a.color}>
                    <animateMotion
                      dur={`${2.2 + i * 0.3}s`}
                      repeatCount="indefinite"
                      path={`M${CENTER_X},${CENTER_Y} L${a.x},${a.y}`}
                    />
                  </circle>
                </g>
              );
            })}
          </svg>

          {/* Center Core Logo */}
          <div className="sol__core">
            <div className="sol__coreOrb">
              <div className="sol__coreGlow" />
              <div className="sol__coreRingOuter" />
              <div className="sol__coreRingMiddle" />
              <div className="sol__coreCenter">
                {/* Stylized GrowthOS 'G' Monogram SVG Logo */}
                <svg width="46" height="46" viewBox="0 0 48 48" fill="none">
                  <path
                    d="M24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C31.5 42 37.8 37.4 40.5 30.8"
                    stroke="url(#sol_g_grad)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M24 14C18.4772 14 14 18.4772 14 24C14 29.5228 18.4772 34 24 34C27.5 34 30.5 32 32.2 29"
                    stroke="url(#sol_g_grad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M24 24H34"
                    stroke="url(#sol_g_grad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="sol_g_grad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#c084fc" />
                      <stop offset="1" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <div className="sol__coreName">GrowthOS</div>
            <div className="sol__coreSub">AI Operating System</div>
          </div>

          {/* 7 Agent Nodes & Text Labels */}
          {AGENTS.map((a, i) => {
            const Icon = a.icon;
            const leftPct = (a.x / 1000) * 100;
            const topPct = (a.y / 640) * 100;

            return (
              <div key={a.name}>
                <div
                  className="sol__node"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <div
                    className="sol__nodeIcon"
                    style={{
                      ["--c" as string]: a.color,
                      ["--delay" as string]: `${i * 0.25}s`,
                    }}
                  >
                    <Icon size={26} />
                    <span className="sol__nodeBadge">{a.num}</span>
                  </div>
                </div>
                <div
                  className={`sol__label sol__label--${a.side}`}
                  style={
                    a.side === "top"
                      ? { left: `${leftPct}%`, top: `calc(${topPct}% - 38px)`, transform: "translate(-50%, -100%)", textAlign: "center", width: "220px" }
                      : a.side === "right"
                        ? { left: `calc(${leftPct}% + 42px)`, top: `${topPct}%` }
                        : { right: `calc(${100 - leftPct}% + 42px)`, top: `${topPct}%` }
                  }
                >
                  <div
                    className="sol__labelName"
                    style={{ ["--c" as string]: a.color }}
                  >
                    {a.name}
                  </div>
                  {a.lines.map((l, li) => (
                    <div key={li} className="sol__labelLine">
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile 7-Agent Card Grid (Displayed on Mobile Screens) */}
        <div className="sol__mobileAgentGrid">
          {AGENTS.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.name} className="sol__mobileAgentCard" style={{ ["--c" as string]: a.color }}>
                <div className="sol__mobileAgentHeader">
                  <span className="sol__mobileAgentNum">{a.num}</span>
                  <Icon size={14} style={{ color: a.color }} />
                  <span>{a.name}</span>
                </div>
                <div className="sol__mobileAgentLine">{a.lines[0]} {a.lines[1]}</div>
              </div>
            );
          })}
        </div>

        {/* ---------- Feature Strip ---------- */}
        <div className="sol__strip">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="sol__stripItem">
                <span
                  className={`sol__stripIcon ${f.title.includes("Evolving") || f.title.includes("All Agents")
                    ? "sol__stripIcon--spin"
                    : ""
                    }`}
                >
                  <Icon size={16} />
                </span>
                <div>
                  <div className="sol__stripTitle">{f.title}</div>
                  <div className="sol__stripSub">{f.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------- Bottom Text Banner ---------- */}
        <div className="sol__footerText">
          <div className="sol__footerTitle">
            One System. <span>Seven Agents.</span> Infinite Possibilities.
          </div>
          <div className="sol__footerSub">
            Your journey. Powered by <span>GrowthOS.</span>
          </div>
        </div>
      </div>

      {/* ---------- See It In Action Video Block ---------- */}
      <div className="sol__action">
        <div className="sol__stage">
          <video
            ref={videoRef}
            className="sol__video"
            src="/videos/the-shift.mp4"
            poster="/videos/the-shift-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>

        <div>
          <h3 className="sol__actionHeading">
            See It In Action. <span>See the Impact.</span>
          </h3>
          <p className="sol__actionLede">
            GrowthOS works in the background, so you can focus on what truly
            matters. We plan, guide, execute, and help you grow — every step
            of the way.
          </p>

          <div className="sol__steps">
            <div className="sol__stepConnector" />
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="sol__step">
                  <div
                    className="sol__stepIcon"
                    style={{
                      ["--sc" as string]: s.color,
                      ["--sdelay" as string]: `${i * 0.25}s`,
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="sol__stepTitle" style={{ color: s.color }}>
                    {s.title}
                  </div>
                  {s.lines.map((l, li) => (
                    <div key={li} className="sol__stepLine">
                      {l}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
