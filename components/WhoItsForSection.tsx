"use client";
// components/WhoItsForSection.tsx
//
// "Who GrowthOS is For" — Redesigned with AI Operating System Positioning:
// 1. Top 4-column Hero Grid (Left Copy | Center Orbiting Wheel | Live Typewriter AI Orchestrating Panel | Dynamic Diverse Live Activity Stream)
// 2. Full-Width "Your Journey, Orchestrated by AI" Stepper section
// 3. Completely Redesigned "Different Dreams. One GrowthOS." Execution System section (NOT an EdTech / course list)
// 4. Full-Width "A Community That Feels Like Home" Video Carousel
// 5. "You Are Not Alone" / "Join the Community" Banner placed directly BELOW the video carousel
// 6. Bottom Grid (Feature Cards & Why Learners Choose GrowthOS) + Trust Footer Bar

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import {
  Compass,
  BookOpen,
  PenLine,
  Code2,
  Users,
  Trophy,
  Rocket,
  TrendingUp,
  Users2,
  Map,
  Flame,
  Activity,
  FileText,
  Sparkles,
  Target,
  Stethoscope,
  Triangle,
  Landmark,
  HeartPulse,
  Cog,
  Brain,
  Database,
  PenTool,
  Scale,
  Building2,
  Briefcase,
  ShoppingCart,
  Heart,
  Pill,
  Search,
  Video,
  MoreHorizontal,
  Cloud,
  Lightbulb,
  Layers,
  BarChart3,
  DoorOpen,
  UserCheck,
  ShieldCheck,
  Headphones,
  Lock,
  Smartphone,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ---------------------------------------------------------------- */
/* Shared GrowthOS spiral mark                                      */
/* ---------------------------------------------------------------- */
const G_MARK_PATH = (() => {
  const cx = 32, cy = 32, r = 22;
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const pt = (d: number) => ({ x: cx + r * Math.cos(toRad(d)), y: cy + r * Math.sin(toRad(d)) });
  const s = pt(130), e = pt(50);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 1 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
})();

function GMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="wifGmark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path d={G_MARK_PATH} fill="none" stroke="url(#wifGmark)" strokeWidth="7" strokeLinecap="round" />
      <line x1="37" y1="32" x2="53" y2="32" stroke="url(#wifGmark)" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Data                                                             */
/* ---------------------------------------------------------------- */
interface OrbitNode { name: string; sub: string; icon: typeof Compass; color: string; angle: number; }
const ORBIT: OrbitNode[] = [
  { name: "Discover", sub: "Find your path", icon: Compass, color: "#22d3ee", angle: 0 },
  { name: "Learn", sub: "Learn smarter", icon: BookOpen, color: "#3b82f6", angle: 45 },
  { name: "Practice", sub: "Practice daily", icon: PenLine, color: "#a855f7", angle: 90 },
  { name: "Build", sub: "Build real things", icon: Code2, color: "#f43f5e", angle: 135 },
  { name: "Collaborate", sub: "Work together", icon: Users, color: "#eab308", angle: 180 },
  { name: "Compete", sub: "Challenge yourself", icon: Trophy, color: "#22c55e", angle: 225 },
  { name: "Launch", sub: "Unlock opportunities", icon: Rocket, color: "#f97316", angle: 270 },
  { name: "Grow", sub: "Level up every day", icon: TrendingUp, color: "#c084fc", angle: 315 },
];

// Live AI Orchestration Feed Items
const AI_FEED_ITEMS = [
  { icon: Users, color: "#22d3ee", title: "Connecting Mentor...", sub: "Matching top NEET, JEE & UPSC mentors for you", defaultTime: "2s ago" },
  { icon: Map, color: "#a855f7", title: "Generating Roadmap...", sub: "Creating your personalized daily study plan", defaultTime: "5s ago" },
  { icon: Flame, color: "#f97316", title: "Finding Opportunities...", sub: "Discovering scholarships, hackathons & contests", defaultTime: "8s ago" },
  { icon: Activity, color: "#3b82f6", title: "Tracking Progress...", sub: "Analyzing your daily focus & completion rates", defaultTime: "12s ago" },
  { icon: FileText, color: "#ec4899", title: "Preparing Revision...", sub: "Curating high-yield notes for UPSC & CLAT", defaultTime: "16s ago" },
  { icon: Sparkles, color: "#22c55e", title: "Updating Skill Graph...", sub: "Optimizing your weak area practice sessions", defaultTime: "20s ago" },
  { icon: Users2, color: "#eab308", title: "Matching Community...", sub: "Connecting with active study buddies in your field", defaultTime: "24s ago" },
  { icon: Target, color: "#f43f5e", title: "Analyzing Weakness...", sub: "Identifying concepts for instant review", defaultTime: "28s ago" },
];

// Diverse Student Activity Pool for ALL aspirants (NEET, JEE, UPSC, MBBS, Design, Law, Commerce, CSE)
const DIVERSE_ACTIVITY_POOL = [
  { name: "Sneha", field: "NEET", action: "finished NEET Biology Revision (Genetics)", color: "#ec4899" },
  { name: "Rohan", field: "JEE", action: "completed Day 27 of JEE Physics Roadmap", color: "#a855f7" },
  { name: "Raghav", field: "UPSC", action: "completed UPSC Polity Revision (Laxmikanth Ch 12)", color: "#eab308" },
  { name: "Ananya", field: "MBBS", action: "solved 40 NEET Mock Test Questions with 94% accuracy", color: "#22c55e" },
  { name: "Ajay", field: "Design", action: "published her UI/UX Design System Case Study", color: "#f43f5e" },
  { name: "Ishaan", field: "Tech", action: "built a real-time System Design Microservice", color: "#22d3ee" },
  { name: "Aditya", field: "Law", action: "prepared CLAT Legal Reasoning Brief on Landmark Cases", color: "#f59e0b" },
  { name: "Priya", field: "Commerce", action: "earned Consistency Champion badge in SSC CGL Prep", color: "#eab308" },
  { name: "Kartik", field: "JEE", action: "solved 5 JEE Advanced Calculus Problems", color: "#a855f7" },
  { name: "Rahul", field: "NEET", action: "mastered Organic Chemistry Reaction Mechanisms", color: "#22d3ee" },
  { name: "Arjun", field: "Tech", action: "built his first Flutter App & deployed to Web", color: "#22c55e" },
  { name: "Vikram", field: "UPSC", action: "submitted UPSC Mains Essay for Mentor Feedback", color: "#f97316" },
];

// Learner Communities (NOT course seller categories)
const LEARNER_COMMUNITIES = [
  { label: "Medical", icon: HeartPulse, emoji: "🩺", color: "#f43f5e" },
  { label: "JEE", icon: Triangle, emoji: "📐", color: "#3b82f6" },
  { label: "NEET", icon: Stethoscope, emoji: "🧬", color: "#22c55e" },
  { label: "UPSC", icon: Landmark, emoji: "🏛", color: "#eab308" },
  { label: "Technology", icon: Code2, emoji: "💻", color: "#22d3ee" },
  { label: "Government Exams", icon: Building2, emoji: "🏦", color: "#f97316" },
  { label: "Startup Builders", icon: Rocket, emoji: "🚀", color: "#ec4899" },
  { label: "University Students", icon: BookOpen, emoji: "🎓", color: "#a855f7" },
];

const JOURNEY = [
  { name: "Dream", sub: "Visualize your goal and future", icon: Cloud, color: "#f43f5e" },
  { name: "Understand", sub: "AI helps you understand deeply", icon: Lightbulb, color: "#3b82f6" },
  { name: "Learn", sub: "Smart resources tailored for you", icon: BookOpen, color: "#22c55e" },
  { name: "Practice", sub: "Solve, test and improve daily", icon: PenLine, color: "#a855f7" },
  { name: "Collaborate", sub: "Learn with peers and mentors", icon: Users, color: "#22d3ee" },
  { name: "Build", sub: "Build projects that matter", icon: Code2, color: "#6366f1" },
  { name: "Compete", sub: "Contests, rankings, hackathons", icon: Trophy, color: "#f59e0b" },
  { name: "Opportunities", sub: "Scholarships, internships, jobs & more", icon: Rocket, color: "#eab308" },
  { name: "Grow", sub: "Level up your skills and mindset", icon: TrendingUp, color: "#22c55e" },
];

interface CommunityCard {
  name: string;
  video: string;
  badge: string;
  badgeColor: string;
  dream: string;
  focus: string;
}

const COMMUNITY: CommunityCard[] = [
  { name: "Priya", video: "/videos/Doctor.mp4", badge: "Medical Student", badgeColor: "#22c55e", dream: "Become a Doctor", focus: "NEET 2025" },
  { name: "Raghav", video: "/videos/IAS.mp4", badge: "UPSC Aspirant", badgeColor: "#3b82f6", dream: "Serve the Nation", focus: "UPSC Prelims" },
  { name: "Ishaan", video: "/videos/Coder.mp4", badge: "Programmer", badgeColor: "#22d3ee", dream: "Build Scalable Tech", focus: "System Design" },
  { name: "Ajay", video: "/videos/College_Student.mp4", badge: "College Student", badgeColor: "#ec4899", dream: "Master Skills & Tech", focus: "UI/UX & Engineering" },
  { name: "Vivaan", video: "/videos/Builder.mp4", badge: "Entrepreneur", badgeColor: "#f97316", dream: "Build Something Meaningful", focus: "MVP Development" },
  { name: "Kartik", video: "/videos/JEE.mp4", badge: "JEE Aspirant", badgeColor: "#a855f7", dream: "Top IIT", focus: "JEE Advanced" },
  { name: "Rahul", video: "/videos/Neet.mp4", badge: "NEET Aspirant", badgeColor: "#22d3ee", dream: "Crack NEET Exam", focus: "Biology & Chemistry" },
];

const WHY_LEFT = [
  { icon: Brain, title: "AI-Powered", sub: "Personalized guidance that adapts to you.", color: "#a855f7" },
  { icon: Layers, title: "Everything in One Place", sub: "Resources, tools, notes, roadmaps, community.", color: "#22d3ee" },
  { icon: BarChart3, title: "Track Everything", sub: "Visualize progress and stay consistent.", color: "#3b82f6" },
  { icon: DoorOpen, title: "Opportunities for All", sub: "Open doors to scholarships, internships, jobs & more.", color: "#f59e0b" },
];

const WHY_RIGHT = [
  { icon: UserCheck, title: "Personalized", sub: "for You", color: "#a855f7" },
  { icon: Brain, title: "AI that", sub: "Understands", color: "#22d3ee" },
  { icon: Users2, title: "Community", sub: "Driven", color: "#3b82f6" },
  { icon: TrendingUp, title: "Progress", sub: "That Matters", color: "#22c55e" },
  { icon: DoorOpen, title: "Opportunities", sub: "That Change Lives", color: "#f97316" },
  { icon: Compass, title: "Journeys", sub: "That Inspire", color: "#ec4899" },
];

const FOOTER_TRUST = [
  { icon: Layers, title: "All-in-One Platform", sub: "Everything you need, in one place." },
  { icon: ShieldCheck, title: "Safe & Positive Community", sub: "Respect. Support. Grow together." },
  { icon: Headphones, title: "24/7 Support", sub: "We're here for you." },
  { icon: Lock, title: "Privacy First", sub: "Your data is safe with us." },
  { icon: Smartphone, title: "Accessible Anywhere", sub: "Web. Mobile. Always." },
];

const AVATAR_COLORS = ["#3b82f6", "#a855f7", "#ec4899", "#22c55e"];

interface WhoItsForSectionProps {
  onCTA?: () => void;
}

export default function WhoItsForSection({ onCTA }: WhoItsForSectionProps = {}) {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeCard, setActiveCard] = useState(0);

  const handleCTA = () => {
    if (onCTA) {
      onCTA();
    } else {
      router.push("/signup");
    }
  };

  // ---------- 1. AI Orchestrating Typewriter Engine ----------
  const [activeOrchIdx, setActiveOrchIdx] = useState(0);
  const [typedOrchSubs, setTypedOrchSubs] = useState<string[]>(
    AI_FEED_ITEMS.map((item) => item.sub)
  );
  const charIdxRef = useRef(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const currentItem = AI_FEED_ITEMS[activeOrchIdx];

    const typeTick = () => {
      if (charIdxRef.current <= currentItem.sub.length) {
        const textSlice = currentItem.sub.slice(0, charIdxRef.current);
        setTypedOrchSubs((prev) => {
          const next = [...prev];
          next[activeOrchIdx] = textSlice;
          return next;
        });
        charIdxRef.current += 1;
        timeout = setTimeout(typeTick, 28 + Math.random() * 18);
      } else {
        timeout = setTimeout(() => {
          charIdxRef.current = 0;
          setTypedOrchSubs((prev) => {
            const next = [...prev];
            next[activeOrchIdx] = currentItem.sub;
            return next;
          });
          setActiveOrchIdx((prev) => (prev + 1) % AI_FEED_ITEMS.length);
        }, 1600);
      }
    };

    timeout = setTimeout(typeTick, 300);
    return () => clearTimeout(timeout);
  }, [activeOrchIdx]);

  // ---------- 2. Live Activity Dynamic Ticker Engine ----------
  const [liveActivities, setLiveActivities] = useState([
    { name: "Sneha", action: "finished NEET Biology Revision (Genetics)", time: "Just now", color: "#ec4899" },
    { name: "Rohan", action: "completed Day 27 of JEE Physics Roadmap", time: "4s ago", color: "#a855f7" },
    { name: "Raghav", action: "completed UPSC Polity Revision (Laxmikanth)", time: "9s ago", color: "#eab308" },
    { name: "Ananya", action: "solved 40 NEET Mock Questions", time: "14s ago", color: "#22c55e" },
    { name: "Ajay", action: "published her UI/UX Design System Case Study", time: "19s ago", color: "#f43f5e" },
    { name: "Ishaan", action: "built a real-time System Design Microservice", time: "24s ago", color: "#22d3ee" },
    { name: "Aditya", action: "prepared CLAT Legal Reasoning Brief", time: "30s ago", color: "#f59e0b" },
    { name: "Priya", action: "earned Consistency Champion badge in SSC Prep", time: "38s ago", color: "#eab308" },
  ]);
  const poolIndexRef = useRef(8);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextItem = DIVERSE_ACTIVITY_POOL[poolIndexRef.current % DIVERSE_ACTIVITY_POOL.length];
      poolIndexRef.current += 1;

      setLiveActivities((prev) => {
        const updatedTimes = prev.slice(0, 7).map((item, idx) => {
          if (idx === 0) return { ...item, time: "4s ago" };
          if (idx === 1) return { ...item, time: "11s ago" };
          if (idx === 2) return { ...item, time: "18s ago" };
          if (idx === 3) return { ...item, time: "26s ago" };
          if (idx === 4) return { ...item, time: "35s ago" };
          if (idx === 5) return { ...item, time: "44s ago" };
          return { ...item, time: "1m ago" };
        });

        return [
          { name: nextItem.name, action: nextItem.action, time: "Just now", color: nextItem.color },
          ...updatedTimes,
        ];
      });
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  const scrollCarousel = useCallback((dir: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>(".wif__commCard")?.offsetWidth ?? 230;
    el.scrollBy({ left: dir * (cardWidth + 16), behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = el.querySelector<HTMLElement>(".wif__commCard")?.offsetWidth ?? 230;
      setActiveCard(Math.round(el.scrollLeft / (cardWidth + 16)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="wif">
      <style>{`
        .wif {
          position: relative;
          width: 100%;
          background: #04050d;
          color: rgba(255,255,255,0.92);
          overflow-x: hidden;
          padding: 60px 4vw 70px;
          border-top: 1px solid rgba(255,255,255,0.08);
          font-family: var(--font-inter), system-ui, -apple-system, sans-serif;
        }

        .wif * { box-sizing: border-box; }

        .wif__container {
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ================= TOP HERO GRID (4 COLUMNS) ================= */
        .wif__heroGrid {
          display: grid;
          grid-template-columns: minmax(0, 3.2fr) minmax(0, 4.2fr) minmax(0, 3fr) minmax(0, 2.8fr);
          gap: 22px;
          align-items: start;
        }

        .wif__eyebrow {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #c084fc;
          margin-bottom: 14px;
        }

        .wif__h1 {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(30px, 3.1vw, 44px);
          line-height: 1.12;
          letter-spacing: -0.02em;
          color: white;
          margin: 0 0 16px;
        }

        .wif__h1 span {
          background: linear-gradient(135deg, #a855f7, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .wif__heroSub {
          font-size: 15px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          margin-bottom: 8px;
        }

        .wif__heroLede {
          font-size: 13.5px;
          line-height: 1.65;
          color: rgba(255,255,255,0.48);
          margin-bottom: 22px;
        }

        .wif__miniCards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 22px;
        }

        .wif__miniCard {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 14px;
          background: rgba(255,255,255,0.02);
        }

        .wif__miniCardIcon { color: #a78bfa; margin-bottom: 8px; }
        .wif__miniCardTitle { font-size: 13px; font-weight: 700; color: white; margin-bottom: 3px; }
        .wif__miniCardSub { font-size: 11px; color: rgba(255,255,255,0.42); line-height: 1.4; }

        .wif__avatarRow { display: flex; align-items: center; gap: 12px; }
        .wif__avatars { display: flex; }
        .wif__avatarStack {
          width: 30px; height: 30px; border-radius: 50%; border: 2px solid #04050d;
          display: grid; place-items: center; color: white; font-size: 10px; font-weight: 700;
          margin-left: -8px;
        }
        .wif__avatarStack:first-child { margin-left: 0; }
        .wif__avatarPlus { background: rgba(255,255,255,0.1); }
        .wif__avatarLabel { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.4; }

        /* -------- Center Orbiting Wheel -------- */
        .wif__orbitWrap { display: flex; justify-content: center; position: relative; }
        .wif__orbitStage {
          position: relative;
          width: 480px;
          height: 480px;
          max-width: 100%;
        }

        .wif__spokes { position: absolute; inset: 0; }
        .wif__spoke {
          position: absolute; left: 50%; top: 50%;
          width: 1px; height: 176px;
          background: linear-gradient(180deg, rgba(168,85,247,0.25), transparent);
          transform-origin: top center;
        }

        .wif__orbitRing {
          position: absolute; inset: 62px; border-radius: 50%;
          border: 1px dashed rgba(168,85,247,0.18);
        }

        .wif__orbitCore {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
          display: flex; flex-direction: column; align-items: center; z-index: 3;
        }

        .wif__coreRing {
          position: relative; width: 116px; height: 116px; border-radius: 50%;
          display: grid; place-items: center;
        }

        .wif__coreGlow {
          position: absolute; inset: -22px; border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,0.45), transparent 70%);
          filter: blur(12px); animation: wifBreathe 3s ease-in-out infinite;
        }

        .wif__coreSpin { position: absolute; inset: 0; border-radius: 50%; border: 2px solid transparent; border-top-color: #a855f7; border-right-color: #22d3ee; animation: wifSpin 5s linear infinite; }
        .wif__coreDisc {
          position: relative; width: 88px; height: 88px; border-radius: 50%;
          background: radial-gradient(circle at 35% 25%, rgba(139,92,246,0.55), rgba(8,6,16,0.98));
          border: 1px solid rgba(196,181,253,0.4);
          display: grid; place-items: center;
          box-shadow: 0 0 34px rgba(139,92,246,0.45);
        }

        .wif__coreLabel { margin-top: 14px; font-family: var(--font-syne), 'Syne', sans-serif; font-weight: 800; font-size: 17px; color: white; text-align: center; }
        .wif__coreSub { font-size: 10.5px; color: #a78bfa; text-align: center; margin-top: 1px; }

        .wif__orchestrating {
          margin-top: 12px; display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.14); border-radius: 999px; padding: 6px 13px;
          background: rgba(255,255,255,0.03);
        }
        .wif__orchDot { width: 5px; height: 5px; border-radius: 50%; background: #a78bfa; animation: wifPulse 1.4s ease-in-out infinite; }

        .wif__orbitNode {
          position: absolute; left: 50%; top: 50%;
          animation: wifOrbit var(--dur) linear infinite;
          animation-delay: var(--delay);
        }

        .wif__orbitNodeInner {
          position: absolute; transform: translate(-50%,-50%);
          display: flex; flex-direction: column; align-items: center; width: 108px;
        }

        .wif__nodeIcon {
          width: 54px; height: 54px; border-radius: 50%;
          display: grid; place-items: center;
          background: rgba(4,5,13,0.95);
          border: 1.5px solid var(--nc);
          color: var(--nc);
          box-shadow: 0 0 16px color-mix(in srgb, var(--nc) 50%, transparent);
          margin-bottom: 8px;
        }

        .wif__nodeName { font-size: 12.5px; font-weight: 700; color: white; text-align: center; }
        .wif__nodeSub { font-size: 10px; color: rgba(255,255,255,0.4); text-align: center; margin-top: 1px; }

        /* -------- Glass Panels (AI Orchestrating & Live Activity) -------- */
        .wif__panel {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          background: rgba(12, 14, 28, 0.78);
          backdrop-filter: blur(12px);
          padding: 16px;
        }

        .wif__panelHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .wif__panelTitle { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.88); }
        .wif__liveChip { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; color: #ef4444; border: 1px solid rgba(239,68,68,0.4); border-radius: 999px; padding: 2px 8px; }
        .wif__liveChipDot { width: 5px; height: 5px; border-radius: 50%; background: #ef4444; animation: wifPulse 1.4s ease-in-out infinite; }
        .wif__panelSub { font-size: 10.5px; color: rgba(255,255,255,0.38); margin: -6px 0 10px; }

        .wif__feedRow {
          display: flex;
          gap: 10px;
          padding: 7px 8px;
          border-radius: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: background 200ms ease;
        }
        .wif__feedRow:last-of-type { border-bottom: none; }
        .wif__feedRow--active {
          background: rgba(255,255,255,0.05);
          border-left: 2px solid var(--fc);
        }

        .wif__feedIcon { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; background: color-mix(in srgb, var(--fc) 14%, transparent); color: var(--fc); }
        .wif__feedTitle { font-size: 11.5px; font-weight: 700; color: var(--fc); }
        .wif__feedSub { font-size: 10.5px; color: rgba(255,255,255,0.45); margin-top: 1px; min-height: 16px; display: flex; align-items: center; }
        .wif__feedTime { font-size: 9.5px; color: rgba(255,255,255,0.28); white-space: nowrap; flex-shrink: 0; margin-left: auto; padding-left: 6px; }
        .wif__feedFoot { font-size: 11px; font-weight: 600; color: #fbbf24; margin-top: 12px; display: flex; align-items: center; gap: 6px; }

        .wif__cursor {
          display: inline-block;
          width: 4px;
          height: 10px;
          margin-left: 3px;
          background: var(--fc);
          animation: wifBlink 1s step-end infinite;
        }

        /* Dynamic Live Activity Row Animation */
        .wif__actRow {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
          animation: wifItemSlideIn 0.35s ease-out;
        }

        .wif__actAvatar { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: white; font-size: 10px; font-weight: 700; flex-shrink: 0; }
        .wif__actText { font-size: 11.5px; color: rgba(255,255,255,0.68); line-height: 1.4; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wif__actText b { color: white; font-weight: 700; }
        .wif__actTime { font-size: 9.5px; color: rgba(255,255,255,0.28); white-space: nowrap; margin-left: auto; padding-left: 6px; }
        .wif__seeMore { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 11.5px; color: #c084fc; cursor: pointer; text-decoration: none; }

        /* ================= FULL-WIDTH JOURNEY STEPPER ================= */
        .wif__journeySection {
          margin-top: 56px;
        }

        .wif__sectionTitle { font-size: 21px; font-weight: 800; color: white; font-family: var(--font-syne), 'Syne', sans-serif; }
        .wif__sectionSub { font-size: 12.5px; color: rgba(255,255,255,0.45); margin-top: 4px; margin-bottom: 22px; }

        .wif__journeyTrack { display: flex; align-items: flex-start; gap: 8px; overflow-x: auto; padding-bottom: 14px; scrollbar-width: none; }
        .wif__journeyTrack::-webkit-scrollbar { display: none; }
        .wif__journeyStep { display: flex; flex-direction: column; align-items: center; text-align: center; width: 118px; flex-shrink: 0; }
        .wif__journeyIcon {
          width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center;
          border: 1.5px solid var(--jc); color: var(--jc);
          box-shadow: 0 0 16px color-mix(in srgb, var(--jc) 40%, transparent);
          margin-bottom: 10px; background: rgba(12, 14, 28, 0.85);
        }
        .wif__journeyName { font-size: 13px; font-weight: 700; color: white; }
        .wif__journeySubT { font-size: 10.5px; color: rgba(255,255,255,0.45); margin-top: 3px; line-height: 1.35; }
        .wif__journeyArrow { color: rgba(255,255,255,0.25); margin-top: 24px; flex-shrink: 0; }

        /* ================= REDESIGNED OS EXECUTION SECTION (NOT AN EDTECH) ================= */
        .wif__osSection {
          position: relative;
          margin-top: 64px;
          padding: 54px 32px 48px;
          border-radius: 24px;
          border: 1px solid rgba(168, 85, 247, 0.22);
          background: radial-gradient(circle at 50% 0%, rgba(168, 85, 247, 0.08), rgba(4, 5, 13, 0.96) 70%);
          overflow: hidden;
          text-align: center;
        }

        .wif__particleField {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
        }

        .wif__osContent { position: relative; z-index: 2; max-width: 1180px; margin: 0 auto; }

        .wif__osTitle {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(30px, 3.6vw, 48px);
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: white;
          margin: 0 0 14px;
        }

        .wif__osTitle span {
          background: linear-gradient(135deg, #a855f7, #22d3ee, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .wif__osSubMain {
          font-size: clamp(14.5px, 1.4vw, 17px);
          color: rgba(255, 255, 255, 0.78);
          max-width: 720px;
          margin: 0 auto 22px;
          line-height: 1.55;
          font-weight: 500;
        }

        .wif__byoBox {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          margin-bottom: 30px;
        }

        .wif__byoLineMuted {
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.42);
          font-weight: 500;
        }

        .wif__byoLineGlow {
          font-size: 15.5px;
          font-weight: 800;
          color: #c084fc;
          margin-top: 6px;
          text-shadow: 0 0 18px rgba(192, 132, 252, 0.65);
          letter-spacing: 0.02em;
        }

        /* Glass Information Strip */
        .wif__infoStrip {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 14px 26px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(14px);
          margin-bottom: 40px;
          max-width: 92%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }

        .wif__infoIcon {
          width: 36px; height: 36px; border-radius: 50%;
          display: grid; place-items: center;
          background: rgba(168, 85, 247, 0.18);
          border: 1px solid rgba(168, 85, 247, 0.45);
          flex-shrink: 0;
          box-shadow: 0 0 14px rgba(168,85,247,0.4);
        }

        .wif__infoText {
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .wif__infoText b { font-size: 13.5px; color: white; font-weight: 700; }
        .wif__infoText span { font-size: 12px; color: rgba(255, 255, 255, 0.55); }

        /* Premium Community Pills */
        .wif__commPillsGrid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 14px;
          max-width: 1050px;
          margin: 0 auto 32px;
        }

        .wif__commPill {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 22px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.11);
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          cursor: pointer;
          transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1), border-color 260ms ease, background 260ms ease, box-shadow 260ms ease;
          animation: wifPillBreathe 4s ease-in-out infinite;
        }

        .wif__commPill:hover {
          transform: translateY(-3px) scale(1.05);
          border-color: color-mix(in srgb, var(--cc) 70%, transparent);
          background: color-mix(in srgb, var(--cc) 12%, transparent);
          box-shadow: 0 10px 32px color-mix(in srgb, var(--cc) 35%, transparent);
        }

        .wif__pillEmoji { font-size: 16px; }

        .wif__pillIcon {
          color: var(--cc);
          display: flex;
          align-items: center;
          transition: transform 300ms ease;
        }

        .wif__commPill:hover .wif__pillIcon {
          transform: rotate(12deg) scale(1.15);
        }

        .wif__pillLabel {
          font-size: 13.5px;
          font-weight: 700;
          color: white;
        }

        .wif__pillBadge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.65);
        }

        /* Elegant Closing Sentence */
        .wif__osClosing {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 14.5px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.48);
          margin-top: 14px;
        }

        .wif__osClosingGlow {
          color: white;
          background: linear-gradient(135deg, #a855f7, #22d3ee);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 800;
        }

        /* Keyframe animations */
        @keyframes wifPillBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.018); }
        }

        /* ================= FULL-WIDTH COMMUNITY VIDEO CAROUSEL ================= */
        .wif__commSection { margin-top: 56px; }
        .wif__commHeader { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 22px; }
        .wif__commNav { display: flex; gap: 8px; }
        .wif__commNavBtn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: white; display: grid; place-items: center; cursor: pointer; transition: background 160ms ease; }
        .wif__commNavBtn:hover { background: rgba(255,255,255,0.12); }

        .wif__carousel { display: flex; gap: 18px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 12px; scrollbar-width: none; }
        .wif__carousel::-webkit-scrollbar { display: none; }

        .wif__commCard {
          position: relative; flex-shrink: 0; width: 215px; height: 290px;
          border-radius: 18px; overflow: hidden; scroll-snap-align: start;
          border: 1px solid rgba(255,255,255,0.12); background: #0d0e17;
        }

        .wif__commVideo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: transform 400ms ease, opacity 400ms ease; }
        .wif__commCard:hover .wif__commVideo { transform: scale(1.05); opacity: 1; }

        .wif__commScrim { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(4,5,13,0.95) 14%, rgba(4,5,13,0.25) 55%, rgba(4,5,13,0.3) 100%); }

        .wif__commBadge {
          position: absolute; top: 12px; left: 12px; font-size: 9.5px; font-weight: 700;
          padding: 4px 10px; border-radius: 999px; color: white; backdrop-filter: blur(8px);
        }

        .wif__commBody { position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 16px; }
        .wif__commName { font-size: 15.5px; font-weight: 800; color: white; margin-bottom: 3px; }
        .wif__commDream { font-size: 11px; color: rgba(255,255,255,0.78); line-height: 1.38; }
        .wif__commFocus { font-size: 11px; color: rgba(255,255,255,0.48); line-height: 1.38; }

        .wif__dots { display: flex; justify-content: center; gap: 6px; margin-top: 16px; }
        .wif__dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.15); transition: background 200ms ease, width 200ms ease; }
        .wif__dot--active { background: #a855f7; width: 18px; border-radius: 4px; }

        /* ---------- Banner: You Are Not Alone (Placed Directly Below Video Carousel) ---------- */
        .wif__tribeBanner {
          margin-top: 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          padding: 22px 28px;
          border-radius: 18px;
          border: 1px solid rgba(168, 85, 247, 0.3);
          background: linear-gradient(120deg, rgba(168, 85, 247, 0.09), rgba(236, 72, 153, 0.05));
          backdrop-filter: blur(12px);
        }

        .wif__tribeTitle { font-size: 15px; font-weight: 700; color: white; }
        .wif__tribeSub { font-size: 12px; color: rgba(255, 255, 255, 0.45); margin-top: 2px; }

        .wif__tribeGroup { display: flex; align-items: center; gap: 12px; margin-top: 8px; }

        .wif__tribeCountNum { font-size: 14px; font-weight: 800; color: white; }
        .wif__tribeCountLabel { font-weight: 400; color: rgba(255, 255, 255, 0.45); }

        .wif__joinBtn {
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

        .wif__joinBtn:hover { transform: translateY(-1px); opacity: 0.95; }

        /* ================= BOTTOM GRID (FEATURES & WHY CHOOSE) ================= */
        .wif__botGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
          gap: 36px;
          margin-top: 56px;
          align-items: center;
        }

        .wif__featureGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .wif__featureCard { border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; background: rgba(255,255,255,0.02); }
        .wif__featureIcon { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; margin-bottom: 12px; background: color-mix(in srgb, var(--wc) 14%, transparent); color: var(--wc); }
        .wif__featureTitle { font-size: 13.5px; font-weight: 700; color: white; margin-bottom: 4px; }
        .wif__featureSub { font-size: 11px; color: rgba(255,255,255,0.45); line-height: 1.5; }

        .wif__whyRight { display: flex; flex-direction: column; justify-content: center; }
        .wif__whyRightTitle { text-align: center; font-size: 16px; font-weight: 700; color: white; margin-bottom: 22px; }
        .wif__whyRightGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .wif__whyRightItem { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
        .wif__whyRightIcon { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; border: 1.5px solid var(--wc); color: var(--wc); background: rgba(255,255,255,0.02); }
        .wif__whyRightText { font-size: 11.5px; font-weight: 700; color: white; line-height: 1.35; }

        /* ================= FOOTER BAR ================= */
        .wif__footer { margin-top: 60px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px; }
        .wif__footerTrust { display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; margin-bottom: 24px; }
        .wif__trustItem { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 180px; }
        .wif__trustIcon { color: #c084fc; flex-shrink: 0; }
        .wif__trustTitle { font-size: 12px; font-weight: 700; color: white; }
        .wif__trustSub { font-size: 10.5px; color: rgba(255,255,255,0.4); }

        .wif__footerBottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); }
        .wif__footerBrand { display: flex; align-items: center; gap: 10px; font-family: var(--font-syne), 'Syne', sans-serif; font-weight: 800; color: white; font-size: 15px; }
        .wif__footerTag { font-size: 13.5px; color: rgba(255,255,255,0.8); }
        .wif__footerTag span { background: linear-gradient(135deg, #a855f7, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; }
        
        .wif__footerCta {
          display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: white;
          background: linear-gradient(135deg, #8b5cf6, #ec4899); border: none; border-radius: 999px; padding: 11px 22px; cursor: pointer;
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35); transition: opacity 160ms ease;
        }

        .wif__footerCta:hover { opacity: 0.94; }

        /* Keyframes */
        @keyframes wifPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
        @keyframes wifSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wifBreathe { 0%, 100% { opacity: 0.7; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes wifOrbit {
          from { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(var(--r)) rotate(-360deg); }
        }
        @keyframes wifBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes wifItemSlideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1400px) {
          .wif__heroGrid { grid-template-columns: 1fr 1fr; }
          .wif__botGrid { grid-template-columns: 1fr; }
        }

        @media (max-width: 800px) {
          .wif__heroGrid { grid-template-columns: 1fr; }
          .wif__whyRightGrid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="wif__container">
        {/* ================= TOP HERO GRID (4 COLUMNS) ================= */}
        <div className="wif__heroGrid">
          {/* Column 1: Left Copy */}
          <div>
            <div className="wif__eyebrow">Who is it for</div>
            <h1 className="wif__h1">
              One Environment.
              <br />
              Every <span>Ambition.</span>
            </h1>
            <div className="wif__heroSub">Dream it. Learn it. Build it. Become it.</div>
            <p className="wif__heroLede">
              GrowthOS orchestrates your entire journey with AI, the right
              people, resources, and opportunities — no matter what you want
              to achieve.
            </p>

            <div className="wif__miniCards">
              <div className="wif__miniCard">
                <div className="wif__miniCardIcon"><Compass size={18} /></div>
                <div className="wif__miniCardTitle">Infinite Paths</div>
                <div className="wif__miniCardSub">Any dream. Any field. Infinite possibilities.</div>
              </div>
              <div className="wif__miniCard">
                <div className="wif__miniCardIcon"><Layers size={18} /></div>
                <div className="wif__miniCardTitle">One System</div>
                <div className="wif__miniCardSub">All the tools, guidance and support in one place.</div>
              </div>
            </div>

            <div className="wif__avatarRow">
              <div className="wif__avatars">
                {AVATAR_COLORS.map((c, i) => (
                  <div key={i} className="wif__avatarStack" style={{ background: c }}>{String.fromCharCode(65 + i)}</div>
                ))}
                <div className="wif__avatarStack wif__avatarPlus">+</div>
              </div>
              <div className="wif__avatarLabel">Join thousands of learners<br />growing together</div>
            </div>
          </div>

          {/* Column 2: Center Orbiting Wheel */}
          <div className="wif__orbitWrap">
            <div className="wif__orbitStage">
              <div className="wif__spokes">
                {ORBIT.map((n) => (
                  <div key={n.name} className="wif__spoke" style={{ transform: `translate(-50%,0) rotate(${n.angle}deg)` }} />
                ))}
              </div>
              <div className="wif__orbitRing" />

              <div className="wif__orbitCore">
                <div className="wif__coreRing">
                  <div className="wif__coreGlow" />
                  <div className="wif__coreSpin" />
                  <div className="wif__coreDisc">
                    <GMark size={40} />
                  </div>
                </div>
                <div className="wif__coreLabel">GrowthOS</div>
                <div className="wif__coreSub">AI Operating System</div>
                <div className="wif__orchestrating">
                  <span className="wif__orchDot" />
                  + AI Orchestrating...
                </div>
              </div>

              {ORBIT.map((n, i) => {
                const Icon = n.icon;
                const dur = 70;
                const delay = -(i / ORBIT.length) * dur;
                return (
                  <div
                    key={n.name}
                    className="wif__orbitNode"
                    style={{ ["--r" as string]: "192px", ["--dur" as string]: `${dur}s`, animationDelay: `${delay}s` }}
                  >
                    <div className="wif__orbitNodeInner">
                      <div className="wif__nodeIcon" style={{ ["--nc" as string]: n.color }}>
                        <Icon size={22} />
                      </div>
                      <div className="wif__nodeName">{n.name}</div>
                      <div className="wif__nodeSub">{n.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: AI Orchestrating Panel (Live Line-by-Line Typewriter) */}
          <div>
            <div className="wif__panel">
              <div className="wif__panelHead">
                <span className="wif__panelTitle"><Sparkles size={14} color="#a78bfa" /> AI Orchestrating...</span>
                <span className="wif__liveChip"><span className="wif__liveChipDot" />LIVE</span>
              </div>
              {AI_FEED_ITEMS.map((f, i) => {
                const Icon = f.icon;
                const isActive = i === activeOrchIdx;
                return (
                  <div
                    key={f.title}
                    className={`wif__feedRow ${isActive ? "wif__feedRow--active" : ""}`}
                    style={{ ["--fc" as string]: f.color }}
                  >
                    <span className="wif__feedIcon" style={{ ["--fc" as string]: f.color }}><Icon size={14} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="wif__feedTitle" style={{ ["--fc" as string]: f.color }}>{f.title}</div>
                      <div className="wif__feedSub">
                        {typedOrchSubs[i]}
                        {isActive && <span className="wif__cursor" style={{ ["--fc" as string]: f.color }} />}
                      </div>
                    </div>
                    <span className="wif__feedTime">{f.defaultTime}</span>
                  </div>
                );
              })}
              <div className="wif__feedFoot">Always working. Always for you. ✨</div>
            </div>
          </div>

          {/* Column 4: Far Right Column (Diverse Live Activity Dynamic Stream) */}
          <div>
            <div className="wif__panel">
              <div className="wif__panelHead">
                <span className="wif__panelTitle">Live Activity</span>
                <span className="wif__liveChip"><span className="wif__liveChipDot" />LIVE</span>
              </div>
              <div className="wif__panelSub">Real people. Real progress. Right now.</div>
              {liveActivities.map((a, i) => (
                <div key={a.name + i} className="wif__actRow">
                  <span className="wif__actAvatar" style={{ background: a.color }}>{a.name[0]}</span>
                  <span className="wif__actText"><b>{a.name}</b> {a.action}</span>
                  <span className="wif__actTime">{a.time}</span>
                </div>
              ))}
              <a href="#" className="wif__seeMore">See what others are achieving &rarr;</a>
            </div>
          </div>
        </div>

        {/* ================= FULL-WIDTH JOURNEY STEPPER SECTION ================= */}
        <div className="wif__journeySection">
          <div className="wif__sectionTitle">Your Journey, Orchestrated by AI</div>
          <div className="wif__sectionSub">Every step. Every day. Personalized for you.</div>
          <div className="wif__journeyTrack">
            {JOURNEY.map((j, i) => {
              const Icon = j.icon;
              return (
                <div key={j.name} style={{ display: "flex", alignItems: "flex-start" }}>
                  <div className="wif__journeyStep">
                    <div className="wif__journeyIcon" style={{ ["--jc" as string]: j.color }}>
                      <Icon size={22} />
                    </div>
                    <div className="wif__journeyName">{j.name}</div>
                    <div className="wif__journeySubT">{j.sub}</div>
                  </div>
                  {i < JOURNEY.length - 1 && (
                    <div className="wif__journeyArrow"><ChevronRight size={16} /></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= REDESIGNED "DIFFERENT DREAMS. ONE GROWTHOS." EXECUTION SECTION ================= */}
        <div className="wif__osSection">
          <svg className="wif__particleField" width="100%" height="100%">
            <defs>
              <radialGradient id="wifNodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </radialGradient>
            </defs>
            <line x1="15%" y1="20%" x2="45%" y2="80%" stroke="rgba(168,85,247,0.12)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="45%" y1="80%" x2="85%" y2="30%" stroke="rgba(34,211,238,0.12)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="85%" y1="30%" x2="25%" y2="70%" stroke="rgba(236,72,153,0.12)" strokeWidth="1" />
            <circle cx="15%" cy="20%" r="3" fill="#a855f7" />
            <circle cx="45%" cy="80%" r="3" fill="#22d3ee" />
            <circle cx="85%" cy="30%" r="3" fill="#ec4899" />
            <circle cx="25%" cy="70%" r="3" fill="#eab308" />
          </svg>

          <div className="wif__osContent">
            <h2 className="wif__osTitle">
              Different Dreams. <span>One GrowthOS.</span>
            </h2>

            <div className="wif__osSubMain">
              No matter what you&apos;re preparing for, GrowthOS becomes your execution system—not your classroom.
            </div>

            <div className="wif__byoBox">
              <div className="wif__byoLineMuted">Bring your own books.</div>
              <div className="wif__byoLineMuted">Bring your own courses.</div>
              <div className="wif__byoLineMuted">Bring your own teachers.</div>
              <div className="wif__byoLineGlow">We&apos;ll orchestrate everything else.</div>
            </div>

            {/* Information Glass Strip */}
            <div className="wif__infoStrip">
              <div className="wif__infoIcon">
                <Sparkles size={18} color="#c084fc" />
              </div>
              <div className="wif__infoText">
                <b>GrowthOS doesn&apos;t replace your books, courses or teachers.</b>
                <span>It becomes the intelligent system that helps you finish them.</span>
              </div>
            </div>

            {/* Premium Learner Community Pills */}
            <div className="wif__commPillsGrid">
              {LEARNER_COMMUNITIES.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="wif__commPill" style={{ ["--cc" as string]: c.color }}>
                    <span className="wif__pillEmoji">{c.emoji}</span>
                    <span className="wif__pillIcon"><Icon size={16} /></span>
                    <span className="wif__pillLabel">{c.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Closing Statement */}
            <div className="wif__osClosing">
              <span>Different goals.</span>
              <span>Different journeys.</span>
              <span className="wif__osClosingGlow">One AI Operating System.</span>
            </div>
          </div>
        </div>

        {/* ================= FULL-WIDTH COMMUNITY VIDEO CAROUSEL ================= */}
        <div className="wif__commSection">
          <div className="wif__commHeader">
            <div>
              <div className="wif__sectionTitle">A Community That Feels Like Home</div>
              <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
                Different dreams. Same mindset. One GrowthOS.
              </div>
            </div>
            <div className="wif__commNav">
              <button type="button" className="wif__commNavBtn" onClick={() => scrollCarousel(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
              <button type="button" className="wif__commNavBtn" onClick={() => scrollCarousel(1)} aria-label="Next"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="wif__carousel" ref={carouselRef}>
            {COMMUNITY.map((c) => (
              <div key={c.name} className="wif__commCard">
                <video
                  ref={(el) => {
                    if (el) {
                      el.muted = true;
                      el.play().catch(() => { });
                    }
                  }}
                  className="wif__commVideo"
                  src={c.video}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
                <div className="wif__commScrim" />
                <span className="wif__commBadge" style={{ background: `${c.badgeColor}33`, color: c.badgeColor, border: `1px solid ${c.badgeColor}55` }}>
                  {c.badge}
                </span>
                <div className="wif__commBody">
                  <div className="wif__commName">{c.name}</div>
                  <div className="wif__commDream">Dream: {c.dream}</div>
                  <div className="wif__commFocus">Focus: {c.focus}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="wif__dots">
            {COMMUNITY.map((_, i) => (
              <span key={i} className={`wif__dot ${i === activeCard ? "wif__dot--active" : ""}`} />
            ))}
          </div>
        </div>

        {/* ================= YOU ARE NOT ALONE / JOIN COMMUNITY BANNER (BELOW VIDEOS) ================= */}
        <div className="wif__tribeBanner">
          <div>
            <div className="wif__tribeTitle">You are not alone.</div>
            <div className="wif__tribeSub">Find your tribe. Share. Learn. Grow.</div>
            <div className="wif__tribeGroup">
              <div className="wif__avatars">
                {AVATAR_COLORS.map((c, i) => (
                  <div key={i} className="wif__avatarStack" style={{ background: c }}>{String.fromCharCode(75 + i)}</div>
                ))}
              </div>
            </div>
          </div>
          <button type="button" className="wif__joinBtn" onClick={handleCTA}>
            Join the Community <ArrowRight size={15} />
          </button>
        </div>

        {/* ================= BOTTOM GRID (FEATURES & WHY CHOOSE) ================= */}
        <div className="wif__botGrid">
          {/* Left Side: 4 Feature Cards */}
          <div className="wif__featureGrid">
            {WHY_LEFT.map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.title} className="wif__featureCard">
                  <div className="wif__featureIcon" style={{ ["--wc" as string]: w.color }}><Icon size={19} /></div>
                  <div className="wif__featureTitle">{w.title}</div>
                  <div className="wif__featureSub">{w.sub}</div>
                </div>
              );
            })}
          </div>

          {/* Right Side: Why Choose GrowthOS */}
          <div className="wif__whyRight">
            <div className="wif__whyRightTitle">Why Learners Choose GrowthOS</div>
            <div className="wif__whyRightGrid">
              {WHY_RIGHT.map((w) => {
                const Icon = w.icon;
                return (
                  <div key={w.title} className="wif__whyRightItem">
                    <div className="wif__whyRightIcon" style={{ ["--wc" as string]: w.color }}><Icon size={19} /></div>
                    <div className="wif__whyRightText">{w.title}<br />{w.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================= FOOTER BAR ================= */}
        <footer className="wif__footer">
          <div className="wif__footerTrust">
            {FOOTER_TRUST.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.title} className="wif__trustItem">
                  <span className="wif__trustIcon"><Icon size={20} /></span>
                  <div>
                    <div className="wif__trustTitle">{t.title}</div>
                    <div className="wif__trustSub">{t.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="wif__footerBottom">
            <BrandLogo size="sm" showSubtitle={true} />
            <div className="wif__footerTag">
              Your Dream. Our System. <span>Your Future.</span>
            </div>
            <button type="button" className="wif__footerCta" onClick={handleCTA}>
              Start for Free <ArrowRight size={14} />
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
