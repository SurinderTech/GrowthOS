"use client";
// components/WhoItsForSection.tsx
//
// "Who GrowthOS is For" — Comprehensive living section displaying the 8-node AI Orchestrator Wheel,
// Live Activity & Orchestration Feeds, Category Pills (NEET, JEE, UPSC, MBBS, Engineering, AI/ML, etc.),
// 9-Step Journey Stepper, Community Video Carousel, Feature Grid, and Why Choose GrowthOS grid.
// Built with Vanilla CSS styling (scoped .wif classes) to guarantee 100% pixel-perfect layout.

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Compass,
  BookOpen,
  PenLine,
  Code2,
  Users,
  Trophy,
  Rocket,
  TrendingUp,
  Infinity as InfinityIcon,
  Layers,
  UserCheck,
  Map as MapIcon,
  FlagTriangleRight,
  Activity,
  NotebookPen,
  Wand2,
  Search,
  Zap,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  Landmark,
  HeartPulse,
  Cog,
  BarChart3,
  Palette,
  Scale,
  Building2,
  ShieldCheck,
  ShoppingCart,
  Pill,
  FlaskConical,
  Video,
  MoreHorizontal,
  Cloud,
  Lightbulb,
  Brain,
  Globe,
  Lock,
  Smartphone,
  ArrowRight,
} from "lucide-react";

/* -------------------------------------------------------------------- */
/*  Data                                                                */
/* -------------------------------------------------------------------- */

type WheelNode = {
  label: string;
  sub: string;
  icon: React.ElementType;
  color: string;
};

const WHEEL_NODES: WheelNode[] = [
  { label: "Discover", sub: "Find your path", icon: Compass, color: "#a78bfa" },
  { label: "Learn", sub: "Learn smarter", icon: BookOpen, color: "#60a5fa" },
  { label: "Practice", sub: "Practice daily", icon: PenLine, color: "#f472b6" },
  { label: "Build", sub: "Build real things", icon: Code2, color: "#c084fc" },
  { label: "Collaborate", sub: "Work together", icon: Users, color: "#fbbf24" },
  { label: "Compete", sub: "Challenge yourself", icon: Trophy, color: "#fb923c" },
  { label: "Launch", sub: "Unlock opportunities", icon: Rocket, color: "#2dd4bf" },
  { label: "Grow", sub: "Level up every day", icon: TrendingUp, color: "#34d399" },
];

const ORCHESTRATING_FEED = [
  { icon: UserCheck, title: "Connecting Mentor...", sub: "Finding the perfect mentor for you", time: "2s ago", color: "#60a5fa" },
  { icon: MapIcon, title: "Generating Roadmap...", sub: "Creating your personalized plan", time: "5s ago", color: "#c084fc" },
  { icon: FlagTriangleRight, title: "Finding Hackathon...", sub: "Discovering relevant hackathons", time: "8s ago", color: "#fbbf24" },
  { icon: Activity, title: "Tracking Progress...", sub: "Analyzing your daily progress", time: "12s ago", color: "#34d399" },
  { icon: NotebookPen, title: "Preparing Revision...", sub: "Creating revision notes for you", time: "16s ago", color: "#f87171" },
  { icon: Wand2, title: "Updating Skills...", sub: "Optimizing your skill roadmap", time: "20s ago", color: "#22d3ee" },
  { icon: Users, title: "Matching Community...", sub: "Finding your study buddies", time: "24s ago", color: "#fbbf24" },
  { icon: Search, title: "Analyzing Weakness...", sub: "Identifying areas to improve", time: "28s ago", color: "#f472b6" },
];

const LIVE_ACTIVITY = [
  { name: "Aditi", action: "solved 3 DSA problems", time: "2m ago" },
  { name: "Rohan", action: "completed Day 27 of JEE Roadmap", time: "5m ago" },
  { name: "Sneha", action: "finished NEET Biology Revision", time: "7m ago" },
  { name: "Akash", action: "joined AI Study Room", time: "9m ago" },
  { name: "Priya", action: "earned Consistency Champion badge", time: "11m ago" },
  { name: "Arjun", action: "built his first Flutter project", time: "13m ago" },
  { name: "Kavya", action: "submitted Hackathon project", time: "15m ago" },
  { name: "Manav", action: "climbed to Rank #156 on LeetCode", time: "17m ago" },
];

const CATEGORY_PILLS: { label: string; icon: React.ElementType; color: string }[] = [
  { label: "NEET", icon: Stethoscope, color: "#f87171" },
  { label: "JEE", icon: FlaskConical, color: "#60a5fa" },
  { label: "UPSC", icon: Landmark, color: "#fbbf24" },
  { label: "MBBS", icon: HeartPulse, color: "#34d399" },
  { label: "Engineering", icon: Cog, color: "#9ca3af" },
  { label: "AI & ML", icon: Sparkles, color: "#c084fc" },
  { label: "Data Science", icon: BarChart3, color: "#60a5fa" },
  { label: "Design", icon: Palette, color: "#f472b6" },
  { label: "Law", icon: Scale, color: "#818cf8" },
  { label: "Banking", icon: Building2, color: "#2dd4bf" },
  { label: "SSC CGL", icon: ShieldCheck, color: "#fb923c" },
  { label: "Commerce", icon: ShoppingCart, color: "#34d399" },
  { label: "Nursing", icon: HeartPulse, color: "#f472b6" },
  { label: "Pharmacy", icon: Pill, color: "#2dd4bf" },
  { label: "Research", icon: Search, color: "#9ca3af" },
  { label: "Content Creator", icon: Video, color: "#c084fc" },
  { label: "More", icon: MoreHorizontal, color: "#9ca3af" },
];

const JOURNEY_STEPS: { label: string; sub: string; icon: React.ElementType; color: string }[] = [
  { label: "Dream", sub: "Visualize your goal and future", icon: Cloud, color: "#f87171" },
  { label: "Understand", sub: "AI helps you understand deeply", icon: Lightbulb, color: "#60a5fa" },
  { label: "Learn", sub: "Smart resources tailored for you", icon: BookOpen, color: "#fbbf24" },
  { label: "Practice", sub: "Solve, test and improve daily", icon: PenLine, color: "#f472b6" },
  { label: "Collaborate", sub: "Learn with peers and mentors", icon: Users, color: "#c084fc" },
  { label: "Build", sub: "Build projects that matter", icon: Code2, color: "#2dd4bf" },
  { label: "Compete", sub: "Contests, rankings, hackathons", icon: Trophy, color: "#fbbf24" },
  { label: "Opportunities", sub: "Scholarships, internships, jobs & more", icon: Rocket, color: "#f59e0b" },
  { label: "Grow", sub: "Level up your skills and mindset", icon: TrendingUp, color: "#34d399" },
];

type CommunityCard = {
  name: string;
  badge: string;
  badgeColor: string;
  dream: string;
  focus: string;
  video: string;
};

const COMMUNITY_CARDS: CommunityCard[] = [
  { name: "Ananya", badge: "Medical Student", badgeColor: "#34d399", dream: "Become a Doctor", focus: "NEET 2025", video: "/videos/Doctor.mp4" },
  { name: "Raghav", badge: "UPSC Aspirant", badgeColor: "#fbbf24", dream: "Serve the Nation", focus: "UPSC Prelims", video: "/videos/IAS.mp4" },
  { name: "Ishaan", badge: "Programmer", badgeColor: "#60a5fa", dream: "Build Scalable Tech", focus: "System Design", video: "/videos/Coder.mp4" },
  { name: "Meera", badge: "Designer", badgeColor: "#f472b6", dream: "Design Impactful Experiences", focus: "UI/UX Development", video: "/videos/Builder.mp4" },
  { name: "Vivaan", badge: "Entrepreneur", badgeColor: "#f87171", dream: "Build Something Meaningful", focus: "MVP Development", video: "/videos/College_Student.mp4" },
  { name: "Kartik", badge: "JEE Aspirant", badgeColor: "#c084fc", dream: "Top IIT", focus: "JEE Advanced", video: "/videos/JEE.mp4" },
  { name: "Diya", badge: "Law Student", badgeColor: "#818cf8", dream: "Fight for Justice", focus: "CLAT Preparation", video: "/videos/College_Student.mp4" },
  { name: "Aarav", badge: "NEET Aspirant", badgeColor: "#22d3ee", dream: "Crack NEET", focus: "Biology & Chemistry", video: "/videos/Neet.mp4" },
];

const FEATURE_GRID = [
  { icon: Brain, title: "AI-Powered", sub: "Personalized guidance that adapts to you." },
  { icon: Layers, title: "Everything in One Place", sub: "Resources, tools, notes, roadmaps, community." },
  { icon: BarChart3, title: "Track Everything", sub: "Visualize progress and stay consistent." },
  { icon: Rocket, title: "Opportunities for All", sub: "Open doors to scholarships, internships, jobs & more." },
];

const WHY_GRID = [
  { icon: UserCheck, title: "Personalized", sub: "for You" },
  { icon: Brain, title: "AI that", sub: "Understands" },
  { icon: Users, title: "Community", sub: "Driven" },
  { icon: Activity, title: "Progress", sub: "That Matters" },
  { icon: Rocket, title: "Opportunities", sub: "That Change Lives" },
  { icon: Sparkles, title: "Journeys", sub: "That Inspire" },
];

const AVATAR_SEEDS = ["Aditi", "Rohan", "Sneha", "Akash", "Priya", "Arjun", "Kavya", "Manav"];

function Avatar({ seed, size = 32 }: { seed: string; size?: number }) {
  return (
    <img
      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`}
      alt={seed}
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%", background: "#181a24", border: "2px solid #0a0b12", objectFit: "cover" }}
    />
  );
}

function AvatarStack({ seeds, size = 32 }: { seeds: string[]; size?: number }) {
  return (
    <div style={{ display: "flex", margin: "0" }}>
      {seeds.map((s, idx) => (
        <div key={s} style={{ marginLeft: idx === 0 ? 0 : "-8px" }}>
          <Avatar seed={s} size={size} />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Orchestrator Wheel                                                  */
/* -------------------------------------------------------------------- */

function OrchestratorWheel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % WHEEL_NODES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const activeStep = WHEEL_NODES[active];

  return (
    <div className="wif__wheelStage">
      {/* Outer dashed spinning ring */}
      <div className="wif__wheelRing" />
      <div className="wif__wheelGlow" />

      {/* Center Hub */}
      <div className="wif__wheelHub">
        <div className="wif__hubIconBox">
          <InfinityIcon size={26} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div className="wif__hubText">
          <span className="wif__hubTitle">GrowthOS</span>
          <span className="wif__hubSub">AI Operating System</span>
        </div>
        <div className="wif__hubTag">
          <Sparkles size={13} color="#c084fc" />
          <span>{activeStep.label}ing...</span>
        </div>
      </div>

      {/* 8 Orbiting Wheel Nodes */}
      {WHEEL_NODES.map((node, i) => {
        const angle = (i / WHEEL_NODES.length) * 2 * Math.PI - Math.PI / 2;
        const R = 44; // percent radius
        const x = 50 + R * Math.cos(angle);
        const y = 50 + R * Math.sin(angle);
        const isActive = i === active;
        const Icon = node.icon;

        return (
          <div
            key={node.label}
            className={`wif__node ${isActive ? "wif__node--active" : ""}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              ["--c" as string]: node.color,
            }}
          >
            <div className="wif__nodeIconBox">
              <Icon size={20} color={node.color} strokeWidth={2} />
            </div>
            <span className="wif__nodeLabel">{node.label}</span>
            <span className="wif__nodeSub">{node.sub}</span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Right-Side Panels                                                   */
/* -------------------------------------------------------------------- */

function OrchestratingPanel() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % ORCHESTRATING_FEED.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="wif__panel">
      <div className="wif__panelHead">
        <div className="wif__panelTitle">
          <Sparkles size={15} color="#c084fc" />
          <span>AI Orchestrating...</span>
        </div>
        <span className="wif__liveBadge">
          <span className="wif__liveDot" />
          LIVE
        </span>
      </div>

      <div className="wif__feedList">
        {ORCHESTRATING_FEED.map((item, i) => {
          const Icon = item.icon;
          const isActive = i === active;
          return (
            <div key={item.title} className={`wif__feedItem ${isActive ? "wif__feedItem--active" : ""}`}>
              <div className="wif__feedIcon" style={{ background: `${item.color}20`, color: item.color }}>
                <Icon size={14} />
              </div>
              <div className="wif__feedBody">
                <div className="wif__feedTitle" style={{ color: item.color }}>{item.title}</div>
                <div className="wif__feedSub">{item.sub}</div>
              </div>
              <span className="wif__feedTime">{item.time}</span>
            </div>
          );
        })}
      </div>

      <div className="wif__panelFoot">
        Always working. Always for you. <Zap size={13} fill="#fbbf24" color="#fbbf24" />
      </div>
    </div>
  );
}

function LiveActivityPanel() {
  return (
    <div className="wif__panel">
      <div className="wif__panelHead">
        <span className="wif__panelTitleText">Live Activity</span>
        <span className="wif__liveBadge">
          <span className="wif__liveDot" />
          LIVE
        </span>
      </div>
      <p className="wif__panelSub">Real people. Real progress. Right now.</p>

      <div className="wif__feedList">
        {LIVE_ACTIVITY.map((item) => (
          <div key={item.name + item.time} className="wif__activityItem">
            <Avatar seed={item.name} size={24} />
            <div className="wif__activityText">
              <span className="wif__activityName">{item.name}</span> {item.action}
            </div>
            <span className="wif__feedTime">{item.time}</span>
          </div>
        ))}
      </div>

      <button type="button" className="wif__btnSubtle">
        See what others are achieving <ArrowRight size={13} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Community Video Carousel                                            */
/* -------------------------------------------------------------------- */

function CommunityCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    trackRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  return (
    <div className="wif__carouselWrap">
      <button type="button" onClick={() => scrollBy(-1)} className="wif__scrollBtn wif__scrollBtn--left">
        <ChevronLeft size={18} />
      </button>

      <div ref={trackRef} className="wif__carouselTrack">
        {COMMUNITY_CARDS.map((card) => (
          <div key={card.name} className="wif__videoCard">
            <video className="wif__video" src={card.video} autoPlay loop muted playsInline />
            <div className="wif__videoOverlay" />
            <span className="wif__videoBadge" style={{ background: `${card.badgeColor}25`, color: card.badgeColor }}>
              {card.badge}
            </span>
            <div className="wif__videoContent">
              <div className="wif__videoName">{card.name}</div>
              <div className="wif__videoText">Dream: <span>{card.dream}</span></div>
              <div className="wif__videoSubText">Focus: <span>{card.focus}</span></div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => scrollBy(1)} className="wif__scrollBtn wif__scrollBtn--right">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Main Component Export                                               */
/* -------------------------------------------------------------------- */

export default function WhoItsForSection() {
  return (
    <section className="wif">
      <style>{`
        .wif {
          position: relative;
          width: 100%;
          background: #04050d;
          padding: 60px 4vw 70px;
          color: #fff;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .wif__container {
          max-width: 1500px;
          margin: 0 auto;
        }

        .wif__eyebrow {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #c084fc;
          margin-bottom: 10px;
        }

        .wif__heading {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(28px, 3.2vw, 46px);
          line-height: 1.12;
          letter-spacing: -0.02em;
          color: rgba(255, 255, 255, 0.96);
          margin: 0 0 10px;
        }

        .wif__heading span {
          background: linear-gradient(135deg, #c084fc, #ec4899, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .wif__lede {
          font-size: 17px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 12px;
        }

        .wif__desc {
          font-size: 14px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 8px;
          max-width: 440px;
        }

        /* 3-Column Top Grid: Copy | Wheel | Feeds */
        .wif__grid {
          display: grid;
          grid-template-columns: minmax(0, 3fr) minmax(0, 3.4fr) minmax(0, 2.6fr);
          gap: 28px;
          align-items: center;
        }

        .wif__featureCards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 24px;
        }

        .wif__miniCard {
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .wif__miniCardTitle {
          font-size: 13.5px;
          font-weight: 700;
          color: #fff;
          margin: 6px 0 2px;
        }

        .wif__miniCardSub {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          line-height: 1.4;
        }

        .wif__joinCount {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
        }

        .wif__joinText {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.4;
        }

        /* ---------- Orchestrator Wheel CSS ---------- */
        .wif__wheelStage {
          position: relative;
          width: 100%;
          max-width: 520px;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          display: grid;
          place-items: center;
        }

        .wif__wheelRing {
          position: absolute;
          inset: 6%;
          border-radius: 50%;
          border: 1px dashed rgba(255, 255, 255, 0.12);
          animation: wifSpin 40s linear infinite;
        }

        .wif__wheelGlow {
          position: absolute;
          inset: 16%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(236, 72, 153, 0.1) 45%, transparent 75%);
          filter: blur(24px);
        }

        .wif__wheelHub {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 136px;
          height: 136px;
          border-radius: 50%;
          background: rgba(13, 14, 23, 0.94);
          border: 1.5px solid rgba(192, 132, 252, 0.35);
          box-shadow: 0 0 50px rgba(139, 92, 246, 0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 5;
        }

        .wif__hubIconBox {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          display: grid;
          place-items: center;
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }

        .wif__hubText {
          text-align: center;
          margin-top: 8px;
        }

        .wif__hubTitle {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: white;
        }

        .wif__hubSub {
          display: block;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.45);
        }

        .wif__hubTag {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(192, 132, 252, 0.12);
          border: 1px solid rgba(192, 132, 252, 0.3);
          font-size: 10px;
          font-weight: 600;
          color: #e9d5ff;
        }

        .wif__node {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: transform 300ms ease, opacity 300ms ease;
          z-index: 6;
        }

        .wif__nodeIconBox {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: #0d0e17;
          border: 1px solid rgba(255, 255, 255, 0.12);
          display: grid;
          place-items: center;
          transition: transform 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
        }

        .wif__node--active .wif__nodeIconBox {
          transform: scale(1.18);
          border-color: var(--c);
          box-shadow: 0 0 24px color-mix(in srgb, var(--c) 40%, transparent);
        }

        .wif__nodeLabel {
          font-size: 11px;
          font-weight: 700;
          color: white;
          margin-top: 6px;
          white-space: nowrap;
        }

        .wif__nodeSub {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.45);
          white-space: nowrap;
        }

        /* ---------- Right Panels ---------- */
        .wif__panelsCol {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .wif__panel {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(12, 14, 28, 0.78);
          backdrop-filter: blur(12px);
          padding: 16px 18px;
        }

        .wif__panelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .wif__panelTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: white;
        }

        .wif__panelTitleText {
          font-size: 13px;
          font-weight: 700;
          color: white;
        }

        .wif__panelSub {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          margin-bottom: 12px;
        }

        .wif__liveBadge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          font-weight: 700;
          color: #ef4444;
        }

        .wif__liveDot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ef4444;
          animation: wifPulse 1.4s ease-in-out infinite;
        }

        .wif__feedList {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .wif__feedItem {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 6px 8px;
          border-radius: 8px;
          transition: background 200ms ease;
        }

        .wif__feedItem--active {
          background: rgba(255, 255, 255, 0.04);
        }

        .wif__feedIcon {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .wif__feedBody {
          flex: 1;
          min-width: 0;
        }

        .wif__feedTitle {
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wif__feedSub {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.45);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wif__feedTime {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          flex-shrink: 0;
        }

        .wif__activityItem {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .wif__activityText {
          flex: 1;
          min-width: 0;
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wif__activityName {
          font-weight: 700;
          color: white;
        }

        .wif__panelFoot {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #fbbf24;
        }

        .wif__btnSubtle {
          width: 100%;
          margin-top: 12px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.8);
          font-size: 11.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: background 160ms ease;
        }

        .wif__btnSubtle:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        /* ---------- Category Pills Row ---------- */
        .wif__pillsSection {
          margin-top: 48px;
        }

        .wif__pillsLabel {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 14px;
        }

        .wif__pillsTrack {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 8px;
          scroll-behavior: smooth;
        }

        .wif__pillsTrack::-webkit-scrollbar { display: none; }

        .wif__pillBtn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.88);
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: background 160ms ease, border-color 160ms ease;
        }

        .wif__pillBtn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* ---------- You Are Not Alone Banner ---------- */
        .wif__banner {
          margin-top: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          padding: 22px 28px;
          border-radius: 18px;
          border: 1px solid rgba(168, 85, 247, 0.3);
          background: linear-gradient(120deg, rgba(168, 85, 247, 0.08), rgba(236, 72, 153, 0.04));
        }

        .wif__bannerTitle {
          font-size: 15px;
          font-weight: 700;
          color: white;
        }

        .wif__bannerSub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          margin-top: 2px;
        }

        .wif__bannerGroup {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
        }

        .wif__bannerStat {
          font-size: 14px;
          font-weight: 800;
          color: white;
        }

        .wif__bannerStat span {
          font-weight: 400;
          color: rgba(255, 255, 255, 0.45);
        }

        .wif__ctaBtn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35);
          transition: transform 160ms ease, opacity 160ms ease;
        }

        .wif__ctaBtn:hover {
          transform: translateY(-1px);
          opacity: 0.95;
        }

        /* ---------- Journey Stepper Row ---------- */
        .wif__stepperSection {
          margin-top: 60px;
        }

        .wif__sectionHeading {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: white;
        }

        .wif__sectionSub {
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.45);
          margin-top: 3px;
        }

        .wif__stepperTrack {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          overflow-x: auto;
          padding-top: 24px;
          padding-bottom: 12px;
        }

        .wif__stepperTrack::-webkit-scrollbar { display: none; }

        .wif__stepNode {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 115px;
          flex-shrink: 0;
        }

        .wif__stepCircle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #0d0e17;
          border: 1.5px solid var(--sc);
          display: grid;
          place-items: center;
          color: var(--sc);
          box-shadow: 0 0 16px color-mix(in srgb, var(--sc) 25%, transparent);
        }

        .wif__stepTitle {
          font-size: 13px;
          font-weight: 700;
          color: white;
          margin-top: 8px;
        }

        .wif__stepSub {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.45);
          line-height: 1.3;
          margin-top: 2px;
        }

        /* ---------- Community Video Carousel ---------- */
        .wif__carouselSection {
          margin-top: 60px;
        }

        .wif__carouselWrap {
          position: relative;
          margin-top: 20px;
        }

        .wif__carouselTrack {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding-bottom: 12px;
        }

        .wif__carouselTrack::-webkit-scrollbar { display: none; }

        .wif__videoCard {
          position: relative;
          width: 210px;
          height: 280px;
          flex-shrink: 0;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #0d0e17;
        }

        .wif__video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.8;
          transition: transform 400ms ease, opacity 400ms ease;
        }

        .wif__videoCard:hover .wif__video {
          transform: scale(1.05);
          opacity: 1;
        }

        .wif__videoOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%);
        }

        .wif__videoBadge {
          position: absolute;
          top: 12px;
          left: 12px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
          backdrop-filter: blur(8px);
        }

        .wif__videoContent {
          position: absolute;
          inset-x: 0;
          bottom: 0;
          padding: 14px;
        }

        .wif__videoName {
          font-size: 15px;
          font-weight: 700;
          color: white;
        }

        .wif__videoText {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 2px;
        }

        .wif__videoText span { color: rgba(255, 255, 255, 0.9); font-weight: 600; }

        .wif__videoSubText {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
        }

        .wif__videoSubText span { color: rgba(255, 255, 255, 0.85); }

        .wif__scrollBtn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          color: white;
          display: grid;
          place-items: center;
          cursor: pointer;
          z-index: 10;
          transition: background 160ms ease;
        }

        .wif__scrollBtn:hover { background: rgba(0, 0, 0, 0.9); }
        .wif__scrollBtn--left { left: 8px; }
        .wif__scrollBtn--right { right: 8px; }

        /* ---------- Grids ---------- */
        .wif__featureGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-top: 48px;
        }

        .wif__featureCard {
          padding: 22px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .wif__featureTitle {
          font-size: 14.5px;
          font-weight: 700;
          color: white;
          margin-top: 12px;
        }

        .wif__featureSub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          line-height: 1.5;
          margin-top: 4px;
        }

        .wif__whyGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
          margin-top: 48px;
        }

        .wif__whyCard {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 16px;
        }

        .wif__whyIconBox {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          display: grid;
          place-items: center;
          margin-bottom: 10px;
        }

        .wif__whyTitle {
          font-size: 13.5px;
          font-weight: 600;
          color: white;
        }

        .wif__whySub {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
        }

        /* Animations */
        @keyframes wifSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wifPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        @media (max-width: 1180px) {
          .wif__grid { grid-template-columns: 1fr; }
          .wif__wheelStage { max-width: 420px; margin: 30px auto; }
        }
      `}</style>

      <div className="wif__container">
        {/* ---------- 3-Column Top Grid ---------- */}
        <div className="wif__grid">
          {/* Left Column: Heading & Copy */}
          <div>
            <div className="wif__eyebrow">WHO GROWTHOS IS FOR</div>
            <h2 className="wif__heading">
              One Environment.
              <br />
              Every <span>Ambition.</span>
            </h2>
            <div className="wif__lede">Dream it. Learn it. Build it. Become it.</div>
            <p className="wif__desc">
              GrowthOS orchestrates your entire journey with AI, the right people, resources, and opportunities — no matter what you want to achieve.
            </p>

            <div className="wif__featureCards">
              <div className="wif__miniCard">
                <InfinityIcon size={20} color="#c084fc" />
                <div className="wif__miniCardTitle">Infinite Paths</div>
                <div className="wif__miniCardSub">Any dream. Any field. Infinite possibilities.</div>
              </div>
              <div className="wif__miniCard">
                <Layers size={20} color="#c084fc" />
                <div className="wif__miniCardTitle">One System</div>
                <div className="wif__miniCardSub">All the tools, guidance and support in one place.</div>
              </div>
            </div>

            <div className="wif__joinCount">
              <AvatarStack seeds={AVATAR_SEEDS.slice(0, 4)} size={30} />
              <div className="wif__joinText">
                Join thousands of learners
                <br />
                growing together
              </div>
            </div>
          </div>

          {/* Center Column: Orchestrator Wheel */}
          <div>
            <OrchestratorWheel />
          </div>

          {/* Right Column: Live Orchestrating & Activity Feeds */}
          <div className="wif__panelsCol">
            <OrchestratingPanel />
            <LiveActivityPanel />
          </div>
        </div>

        {/* ---------- Category Pills Row ---------- */}
        <div className="wif__pillsSection">
          <div className="wif__pillsLabel">Whatever You Dream, Start Here</div>
          <div className="wif__pillsTrack">
            {CATEGORY_PILLS.map((p) => {
              const Icon = p.icon;
              return (
                <button key={p.label} type="button" className="wif__pillBtn">
                  <Icon size={15} color={p.color} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- Banner: You Are Not Alone ---------- */}
        <div className="wif__banner">
          <div>
            <div className="wif__bannerTitle">You are not alone.</div>
            <div className="wif__bannerSub">Find your tribe. Share. Learn. Grow.</div>
            <div className="wif__bannerGroup">
              <AvatarStack seeds={AVATAR_SEEDS} size={28} />
              <div className="wif__bannerStat">
                50K+ <span>Active Learners</span>
              </div>
            </div>
          </div>
          <button type="button" className="wif__ctaBtn">
            Join the Community <ArrowRight size={15} />
          </button>
        </div>

        {/* ---------- 9-Step Journey Stepper ---------- */}
        <div className="wif__stepperSection">
          <div className="wif__sectionHeading">Your Journey, Orchestrated by AI</div>
          <div className="wif__sectionSub">Every step. Every day. Personalized for you.</div>

          <div className="wif__stepperTrack">
            {JOURNEY_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="wif__stepNode" style={{ ["--sc" as string]: step.color }}>
                  <div className="wif__stepCircle">
                    <Icon size={22} />
                  </div>
                  <div className="wif__stepTitle">{step.label}</div>
                  <div className="wif__stepSub">{step.sub}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- Community Video Carousel ---------- */}
        <div className="wif__carouselSection">
          <div className="wif__sectionHeading">A Community That Feels Like Home</div>
          <div className="wif__sectionSub">Different dreams. Same mindset. One GrowthOS.</div>
          <CommunityCarousel />
        </div>

        {/* ---------- Feature Grid ---------- */}
        <div className="wif__featureGrid">
          {FEATURE_GRID.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="wif__featureCard">
                <Icon size={24} color="#c084fc" />
                <div className="wif__featureTitle">{f.title}</div>
                <div className="wif__featureSub">{f.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ---------- Why Choose Grid ---------- */}
        <div style={{ marginTop: "60px", textAlign: "center" }}>
          <div className="wif__sectionHeading">Why Learners Choose GrowthOS</div>
        </div>

        <div className="wif__whyGrid">
          {WHY_GRID.map((w) => {
            const Icon = w.icon;
            return (
              <div key={w.title} className="wif__whyCard">
                <div className="wif__whyIconBox">
                  <Icon size={20} color="#c084fc" />
                </div>
                <div className="wif__whyTitle">{w.title}</div>
                <div className="wif__whySub">{w.sub}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
