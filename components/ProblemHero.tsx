"use client";
// components/ProblemHero.tsx
//
// Act 1 ("The Problem") with live AI typing on continuous loop, 5 horizontal connected
// icon rows below the video player (one row per quote/milestone: The Plan, The Distraction,
// Information Overloaded, No Direction, The Reality) with blushing glow animations,
// Web Audio API typing sound, autoplay landscape 16:9 clean video player without control overlays,
// and notification rail.

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Calendar,
  Bell,
  Search,
  Brain,
  Frown,
  Play,
  Instagram,
  Youtube,
  Mail,
  MessageCircle,
  Bot,
  MessageSquare,
  ArrowRight,
  GraduationCap,
  Layers,
  Clock,
  MapPin,
  FileCode,
  Zap,
  Sparkles,
} from "lucide-react";

interface MilestoneBadge {
  label: string;
  icon: any;
  color: string;
  glowColor: string;
}

interface Milestone {
  time: string;
  title: string;
  fullLines: string[];
  icon: any;
  color: string;
  startT: number;
  badges: MilestoneBadge[];
}

const MILESTONES: Milestone[] = [
  {
    time: "09:00 AM",
    title: "The Plan",
    fullLines: ["You always make a timetable.", "This time, you promise to follow it."],
    icon: Calendar,
    color: "#3b82f6",
    startT: 0,
    badges: [
      { label: "Timetable", icon: Clock, color: "#3b82f6", glowColor: "rgba(59,130,246,0.9)" },
      { label: "Notion", icon: Layers, color: "#60a5fa", glowColor: "rgba(96,165,250,0.9)" },
      { label: "Google Cal", icon: Calendar, color: "#34d399", glowColor: "rgba(52,211,153,0.9)" },
    ],
  },
  {
    time: "09:30 AM",
    title: "The Distraction",
    fullLines: ["One notification.", "You said, 'just one minute'.", "One minute became an hour."],
    icon: Bell,
    color: "#f43f5e",
    startT: 18.9,
    badges: [
      { label: "Instagram", icon: Instagram, color: "#e1306c", glowColor: "rgba(225,48,108,0.95)" },
      { label: "WhatsApp", icon: MessageCircle, color: "#25d366", glowColor: "rgba(37,211,102,0.95)" },
      { label: "YouTube", icon: Youtube, color: "#ff0000", glowColor: "rgba(255,0,0,0.95)" },
      { label: "Reddit", icon: MessageSquare, color: "#ff4500", glowColor: "rgba(255,69,0,0.95)" },
      { label: "Gmail", icon: Mail, color: "#ea4335", glowColor: "rgba(234,67,53,0.95)" },
    ],
  },
  {
    time: "11:00 AM",
    title: "Information Overloaded",
    fullLines: ["Another tutorial. Another roadmap.", "Another tab. Still no direction."],
    icon: Search,
    color: "#a855f7",
    startT: 30.6,
    badges: [
      { label: "Online Courses", icon: GraduationCap, color: "#a855f7", glowColor: "rgba(168,85,247,0.95)" },
      { label: "Youtubing", icon: Youtube, color: "#ff0000", glowColor: "rgba(255,0,0,0.95)" },
      { label: "ChatGPTing", icon: Bot, color: "#10a37f", glowColor: "rgba(16,163,127,0.95)" },
      { label: "Roadmaps", icon: MapPin, color: "#f59e0b", glowColor: "rgba(245,158,11,0.95)" },
      { label: "Tutorials", icon: FileCode, color: "#38bdf8", glowColor: "rgba(56,189,248,0.95)" },
    ],
  },
  {
    time: "03:00 PM",
    title: "No Direction",
    fullLines: ["You weren't lazy. You were trying everything.", "But finishing nothing."],
    icon: Brain,
    color: "#14b8a6",
    startT: 40.9,
    badges: [
      { label: "Multitasking", icon: Zap, color: "#14b8a6", glowColor: "rgba(20,184,166,0.9)" },
      { label: "50 Open Tabs", icon: Layers, color: "#f43f5e", glowColor: "rgba(244,63,94,0.9)" },
      { label: "Half-done Code", icon: FileCode, color: "#fbbf24", glowColor: "rgba(251,191,36,0.9)" },
    ],
  },
  {
    time: "11:30 PM",
    title: "The Reality",
    fullLines: ["Maybe the problem was never motivation.", "Maybe you never had a system."],
    icon: Frown,
    color: "#6366f1",
    startT: 44.3,
    badges: [
      { label: "Burnout", icon: Frown, color: "#ef4444", glowColor: "rgba(239,68,68,0.9)" },
      { label: "System Gap", icon: Sparkles, color: "#818cf8", glowColor: "rgba(129,140,248,0.9)" },
      { label: "Need GrowthOS", icon: Zap, color: "#22d3ee", glowColor: "rgba(34,211,238,0.95)" },
    ],
  },
];

interface Notification {
  name: string;
  ago: string;
  icon: any;
  bg: string;
  revealT: number;
}

const NOTIFICATIONS: Notification[] = [
  { name: "Instagram", ago: "now", icon: Instagram, bg: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)", revealT: 19.5 },
  { name: "WhatsApp", ago: "2m ago", icon: MessageCircle, bg: "#25D366", revealT: 22.0 },
  { name: "YouTube", ago: "10m ago", icon: Youtube, bg: "#FF0000", revealT: 31.5 },
  { name: "ChatGPT", ago: "1h ago", icon: Bot, bg: "#10a37f", revealT: 33.5 },
  { name: "Reddit", ago: "2h ago", icon: MessageSquare, bg: "#FF4500", revealT: 35.5 },
  { name: "Gmail", ago: "3h ago", icon: Mail, bg: "linear-gradient(135deg,#ea4335,#4285f4)", revealT: 37.5 },
];

interface ProblemHeroProps {
  onStartTransformation?: () => void;
  onComplete?: () => void;
}

export default function ProblemHero({ onStartTransformation, onComplete }: ProblemHeroProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Typewriting state for each milestone
  const [typedLines, setTypedLines] = useState<string[][]>(
    MILESTONES.map((m) => m.fullLines.map(() => ""))
  );

  const playTypingSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1100 + Math.random() * 500, ctx.currentTime);
        gain.gain.setValueAtTime(0.012, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.025);
      }
    } catch (e) {
      // AudioContext fallback ignored
    }
  }, []);

  // Handle Autoplay & intersection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.loop = true; // Continuous loop
    video.play().catch(() => {});
  }, []);

  // Typewriting ticker effect for the active milestone
  useEffect(() => {
    const currentMilestone = MILESTONES[activeIndex];
    const targetLines = currentMilestone.fullLines;
    let lineIdx = 0;
    let charIdx = 0;
    let timer: NodeJS.Timeout | null = null;

    // Reset lines for active index to start typing
    setTypedLines((prev) => {
      const next = [...prev];
      next[activeIndex] = targetLines.map(() => "");
      return next;
    });

    const typeStep = () => {
      if (lineIdx >= targetLines.length) return;

      const currentTargetLine = targetLines[lineIdx];
      if (charIdx < currentTargetLine.length) {
        charIdx++;
        const currentTypedText = currentTargetLine.slice(0, charIdx);

        setTypedLines((prev) => {
          const next = [...prev];
          const milestoneLines = [...(next[activeIndex] || [])];
          milestoneLines[lineIdx] = currentTypedText;
          next[activeIndex] = milestoneLines;
          return next;
        });

        playTypingSound();
        timer = setTimeout(typeStep, 35);
      } else {
        lineIdx++;
        charIdx = 0;
        if (lineIdx < targetLines.length) {
          timer = setTimeout(typeStep, 180);
        }
      }
    };

    timer = setTimeout(typeStep, 100);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeIndex, playTypingSound]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    let match = 0;
    for (let i = 0; i < MILESTONES.length; i++) {
      if (MILESTONES[i].startT <= video.currentTime) match = i;
      else break;
    }
    if (match !== activeIndex) {
      setActiveIndex(match);
    }
  }, [activeIndex]);

  const handleSeekToMilestone = useCallback((startT: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = startT;
    setCurrentTime(startT);
    if (video.paused) {
      video.play().catch(() => {});
    }
  }, []);

  const handleWatchStory = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    video.currentTime = 0;
    video.play().catch(() => {});
  }, []);

  const handleCTAClick = useCallback(() => {
    if (onStartTransformation) onStartTransformation();
    else if (onComplete) onComplete();
  }, [onStartTransformation, onComplete]);

  return (
    <section className="ph">
      <style>{`
        .ph {
          position: relative;
          width: 100%;
          background: #05070a;
          padding: 64px 5vw 100px;
          overflow: hidden;
        }

        .ph__bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(60% 50% at 100% 100%, rgba(59,130,246,0.12), transparent 60%),
            radial-gradient(40% 40% at 0% 0%, rgba(124,58,237,0.10), transparent 60%);
        }

        .ph__grid {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 5.2fr) minmax(0, 7.3fr);
          gap: 48px;
          align-items: start;
          max-width: 1480px;
          margin: 0 auto;
        }

        .ph__eyebrow {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #22d3ee;
          margin-bottom: 18px;
        }

        .ph__heading {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(32px, 3.2vw, 48px);
          line-height: 1.12;
          letter-spacing: -0.02em;
          color: rgba(255,255,255,0.94);
          margin: 0 0 20px;
        }

        .ph__heading span {
          background: linear-gradient(135deg,#3b82f6,#a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ph__lede {
          font-size: 15.5px;
          line-height: 1.7;
          color: rgba(255,255,255,0.48);
          max-width: 480px;
          margin: 0 0 36px;
          font-weight: 300;
        }

        .ph__timeline {
          position: relative;
          margin-bottom: 36px;
        }

        .ph__rail {
          position: absolute;
          left: 21px;
          top: 10px;
          bottom: 10px;
          width: 1px;
          background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03));
        }

        .ph__step {
          position: relative;
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 18px;
          padding: 14px 0;
          transition: opacity 300ms ease;
        }

        .ph__stepIcon {
          position: relative;
          z-index: 1;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.02);
          border: 1.5px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.35);
          transition: border-color 350ms ease, color 350ms ease, box-shadow 350ms ease, background 350ms ease;
        }

        .ph__step--active .ph__stepIcon {
          color: var(--step-color);
          border-color: var(--step-color);
          background: color-mix(in srgb, var(--step-color) 14%, transparent);
          box-shadow: 0 0 18px color-mix(in srgb, var(--step-color) 55%, transparent);
        }

        .ph__step--past .ph__stepIcon {
          color: var(--step-color);
          border-color: color-mix(in srgb, var(--step-color) 55%, transparent);
        }

        .ph__stepMeta {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 6px;
        }

        .ph__stepTime {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          white-space: nowrap;
        }

        .ph__stepTitle {
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          transition: color 350ms ease;
        }

        .ph__step--active .ph__stepTitle,
        .ph__step--past .ph__stepTitle {
          color: rgba(255,255,255,0.95);
        }

        .ph__stepText {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 13.5px;
          line-height: 1.65;
          color: rgba(255,255,255,0.25);
          min-height: 42px;
          transition: color 350ms ease;
        }

        .ph__step--active .ph__stepText {
          color: rgba(255,255,255,0.85);
        }

        .ph__step--past .ph__stepText {
          color: rgba(255,255,255,0.4);
        }

        .ph__cursor {
          display: inline-block;
          width: 2px;
          height: 13px;
          margin-left: 4px;
          background: var(--step-color);
          transform: translateY(2px);
          animation: phBlink 1s step-end infinite;
        }

        .ph__ctas {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .ph__ctaPrimary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 22px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg,#3b82f6,#7c3aed);
          color: white;
          font-weight: 700;
          font-size: 14.5px;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(59,130,246,0.28);
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .ph__ctaPrimary:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(59,130,246,0.38);
        }

        .ph__ctaGhost {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.82);
          font-weight: 600;
          font-size: 14.5px;
          cursor: pointer;
          transition: background 160ms ease, border-color 160ms ease;
        }

        .ph__ctaGhost:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.3);
        }

        .ph__ctaPlayDot {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.3);
          display: grid;
          place-items: center;
        }

        /* Right Column Stage & Clean Video Player */
        .ph__rightCol {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ph__stageCol {
          position: relative;
          display: flex;
          gap: 20px;
          align-items: stretch;
          margin-top: 32px;
        }

        .ph__stage {
          position: relative;
          flex: 1;
          aspect-ratio: 16 / 9;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(124,58,237,0.35);
          box-shadow: 0 0 0 1px rgba(59,130,246,0.08), 0 30px 80px rgba(0,0,0,0.65), 0 0 60px rgba(124,58,237,0.15);
          background: #05070a;
        }

        .ph__video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }

        /* 5 Rows of Connected Horizontal Icons Container Below Video */
        .ph__fiveRowsContainer {
          margin-top: 18px;
          padding: 20px 22px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .ph__fiveRowsTitle {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          margin-bottom: 2px;
        }

        .ph__iconRow {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 350ms ease;
        }

        .ph__iconRow--active {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.16);
          box-shadow: 0 0 24px rgba(0, 0, 0, 0.4);
        }

        .ph__iconRowHeader {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ph__iconRowTime {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 11.5px;
          font-weight: 700;
        }

        .ph__iconRowTitle {
          font-size: 12.5px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.75);
        }

        .ph__iconRowRail {
          display: flex;
          align-items: center;
          gap: 0;
          overflow-x: auto;
        }

        .ph__railPillWrap {
          display: flex;
          align-items: center;
        }

        .ph__railPill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 13px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.45);
          cursor: pointer;
          white-space: nowrap;
          transition: all 300ms ease;
          flex-shrink: 0;
        }

        .ph__railPill--active {
          color: #ffffff;
          border-color: var(--node-color);
          background: color-mix(in srgb, var(--node-color) 25%, transparent);
          box-shadow: 0 0 20px var(--node-glow);
          animation: phBlushPulse 2.2s ease-in-out infinite;
        }

        .ph__railPill--past {
          color: rgba(255, 255, 255, 0.85);
          border-color: color-mix(in srgb, var(--node-color) 60%, transparent);
          background: color-mix(in srgb, var(--node-color) 12%, transparent);
        }

        @keyframes phBlushPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 8px var(--node-glow, rgba(255,255,255,0.4)), 0 0 16px rgba(0,0,0,0.4);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 22px var(--node-glow, rgba(255,255,255,0.85)), 0 0 34px var(--node-glow, rgba(255,255,255,0.4));
          }
        }

        .ph__railLine {
          width: 24px;
          height: 2px;
          margin: 0 5px;
          background: rgba(255, 255, 255, 0.10);
          border-radius: 2px;
          transition: background 400ms ease, box-shadow 400ms ease;
          flex-shrink: 0;
        }

        .ph__railLine--active {
          background: linear-gradient(90deg, #3b82f6, #e1306c, #a855f7);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
        }

        .ph__notifs {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 12px;
          width: 190px;
          flex-shrink: 0;
          position: relative;
          padding-left: 12px;
        }

        .ph__notifRail {
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 1px;
          background-image: linear-gradient(rgba(59,130,246,0.35) 50%, transparent 0%);
          background-size: 1px 8px;
          background-repeat: repeat-y;
        }

        .ph__notif {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 11px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.03);
          opacity: 0;
          transform: translateX(14px);
          transition: opacity 450ms ease, transform 450ms ease;
        }

        .ph__notif--visible {
          opacity: 1;
          transform: translateX(0);
        }

        .ph__notifIcon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          color: white;
          flex-shrink: 0;
        }

        .ph__notifBody {
          min-width: 0;
        }

        .ph__notifName {
          font-size: 11.5px;
          font-weight: 700;
          color: rgba(255,255,255,0.88);
          white-space: nowrap;
        }

        .ph__notifAgo {
          font-size: 10px;
          color: rgba(255,255,255,0.35);
        }

        .ph__scrollCue {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 72px;
        }

        .ph__scrollLabel {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.32);
        }

        .ph__mouse {
          width: 22px;
          height: 34px;
          border-radius: 12px;
          border: 1.5px solid rgba(255,255,255,0.28);
          display: flex;
          justify-content: center;
          padding-top: 6px;
        }

        .ph__mouseDot {
          width: 3px;
          height: 6px;
          border-radius: 2px;
          background: #22d3ee;
          animation: phScroll 1.6s ease infinite;
        }

        @keyframes phScroll {
          0% { transform: translateY(0); opacity: 1; }
          70% { transform: translateY(10px); opacity: 0; }
          71% { transform: translateY(0); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes phBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @media (max-width: 1080px) {
          .ph__grid { grid-template-columns: 1fr; }
          .ph__stageCol { flex-direction: column; margin-top: 16px; }
          .ph__notifs {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            padding-left: 0;
          }
          .ph__notifRail { display: none; }
          .ph__notif { transform: translateY(10px); }
          .ph__notif--visible { transform: translateY(0); }
          .ph__stage { aspect-ratio: 16 / 9; }
        }
      `}</style>

      <div className="ph__bg" />

      <div className="ph__grid">
        <div>
          <div className="ph__eyebrow">AI Operating System for Your Future</div>
          <h2 className="ph__heading">
            You have the ambition.
            <br />
            We build the <span>environment.</span>
          </h2>
          <p className="ph__lede">
            GrowthOS orchestrates AI agents that transform information into
            execution through personalized learning, career guidance and
            daily action.
          </p>

          <div className="ph__timeline">
            <div className="ph__rail" />
            {MILESTONES.map((m, i) => {
              const Icon = m.icon;
              const state = i === activeIndex ? "active" : i < activeIndex ? "past" : "future";
              const currentTypedLines = typedLines[i] || [];

              return (
                <div
                  key={m.title}
                  className={`ph__step ${
                    state === "active" ? "ph__step--active" : state === "past" ? "ph__step--past" : ""
                  }`}
                  style={{ ["--step-color" as string]: m.color }}
                >
                  <div className="ph__stepIcon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="ph__stepMeta">
                      <span className="ph__stepTime">{m.time}</span>
                      <span className="ph__stepTitle">{m.title}</span>
                    </div>

                    <div className="ph__stepText">
                      {state === "active" ? (
                        <>
                          {currentTypedLines.map((lineText, li) => (
                            <div key={li}>
                              {lineText}
                              {li === currentTypedLines.length - 1 && <span className="ph__cursor" />}
                            </div>
                          ))}
                        </>
                      ) : state === "past" ? (
                        <>
                          {m.fullLines.map((l, li) => (
                            <div key={li}>{l}</div>
                          ))}
                        </>
                      ) : (
                        <div style={{ opacity: 0.35 }}>{m.fullLines[0]}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ph__ctas">
            <button type="button" className="ph__ctaPrimary" onClick={handleCTAClick}>
              Start Your Transformation
              <ArrowRight size={16} />
            </button>
            <button type="button" className="ph__ctaGhost" onClick={handleWatchStory}>
              <span className="ph__ctaPlayDot">
                <Play size={11} fill="currentColor" />
              </span>
              Watch the story
            </button>
          </div>
        </div>

        {/* Right Column Stage, Clean Video & 5 Horizontal Icon Rows */}
        <div className="ph__rightCol">
          <div className="ph__stageCol">
            <div className="ph__stage" ref={stageRef}>
              <video
                ref={videoRef}
                className="ph__video"
                src="/videos/the-problem.mp4"
                poster="/videos/the-problem-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                onTimeUpdate={handleTimeUpdate}
              />
            </div>

            <div className="ph__notifs">
              <div className="ph__notifRail" />
              {NOTIFICATIONS.map((n) => {
                const Icon = n.icon;
                const visible = currentTime >= n.revealT;
                return (
                  <div key={n.name} className={`ph__notif ${visible ? "ph__notif--visible" : ""}`}>
                    <div className="ph__notifIcon" style={{ background: n.bg }}>
                      <Icon size={14} />
                    </div>
                    <div className="ph__notifBody">
                      <div className="ph__notifName">{n.name}</div>
                      <div className="ph__notifAgo">{n.ago}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5 Rows of Connected Horizontal Icons below Video */}
          <div className="ph__fiveRowsContainer">
            <div className="ph__fiveRowsTitle">Connected Distractions & Tools (5 Story Acts)</div>
            {MILESTONES.map((m, rowIdx) => {
              const isRowActive = rowIdx === activeIndex;
              const isRowPast = rowIdx < activeIndex;

              return (
                <div
                  key={m.title}
                  className={`ph__iconRow ${
                    isRowActive ? "ph__iconRow--active" : isRowPast ? "ph__iconRow--past" : ""
                  }`}
                >
                  <div className="ph__iconRowHeader">
                    <span className="ph__iconRowTime" style={{ color: m.color }}>{m.time}</span>
                    <span className="ph__iconRowTitle">{m.title}</span>
                  </div>

                  <div className="ph__iconRowRail">
                    {m.badges.map((b, bIdx) => {
                      const BIcon = b.icon;
                      return (
                        <div key={b.label} className="ph__railPillWrap">
                          <button
                            type="button"
                            onClick={() => handleSeekToMilestone(m.startT)}
                            className={`ph__railPill ${
                              isRowActive ? "ph__railPill--active" : isRowPast ? "ph__railPill--past" : ""
                            }`}
                            style={{ ["--node-color" as string]: b.color, ["--node-glow" as string]: b.glowColor }}
                          >
                            <BIcon size={14} style={{ color: isRowActive || isRowPast ? b.color : "rgba(255,255,255,0.4)" }} />
                            <span>{b.label}</span>
                          </button>

                          {bIdx < m.badges.length - 1 && (
                            <div className={`ph__railLine ${isRowActive || isRowPast ? "ph__railLine--active" : ""}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ph__scrollCue">
        <span className="ph__scrollLabel">Scroll to discover the solution</span>
        <div className="ph__mouse">
          <span className="ph__mouseDot" />
        </div>
      </div>
    </section>
  );
}