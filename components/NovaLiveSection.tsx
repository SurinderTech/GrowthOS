"use client";
// components/NovaLiveSection.tsx
//
// "Nova in Action" — 3-column living dashboard with Nova placed in the center column.
// Left cards updated with explicit Agent names (Learning Agent, Career Agent, Execution Agent,
// Resource Agent, Progress Agent, Memory Agent, Community Agent) as requested.
// Sequential typewriter effect: 3 distinct sentences type out one-by-one for each active agent card
// sequentially while other cards display static status, looping continuously from card 01 to 07.

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  User,
  Target,
  Search,
  Zap,
  BarChart3,
  RotateCw,
  Sparkles,
  Brain,
  TrendingUp,
  Star,
  Quote,
  Heart,
  Play,
  CheckCircle2,
  Circle,
  ListChecks,
  Mic,
  Volume2,
  Users,
} from "lucide-react";

interface AgentStep {
  num: string;
  name: string;
  desc: string;
  color: string;
  pct: number;
  icon: typeof User;
  messages: string[];
}

const STEPS: AgentStep[] = [
  {
    num: "01",
    name: "Learning Agent",
    desc: "Learning how you study...",
    color: "#22d3ee",
    pct: 78,
    icon: Brain,
    messages: [
      "Analyzing how you learn best...",
      "Identifying peak focus hours...",
      "Adapting learning speed to your goals...",
    ],
  },
  {
    num: "02",
    name: "Career Agent",
    desc: "Finding opportunities...",
    color: "#ec4899",
    pct: 65,
    icon: Target,
    messages: [
      "Finding top internship opportunities...",
      "Matching skill prerequisites...",
      "Curating industry growth paths...",
    ],
  },
  {
    num: "03",
    name: "Execution Agent",
    desc: "Building today's plan...",
    color: "#f59e0b",
    pct: 71,
    icon: Zap,
    messages: [
      "Building today's focused task plan...",
      "Setting pomodoro deep work timers...",
      "Eliminating daily study bottlenecks...",
    ],
  },
  {
    num: "04",
    name: "Resource Agent",
    desc: "Searching best resources...",
    color: "#10b981",
    pct: 92,
    icon: Search,
    messages: [
      "Searching top DBMS & OS study guides...",
      "Verifying high-yield practice questions...",
      "Organizing revision notes for you...",
    ],
  },
  {
    num: "05",
    name: "Progress Agent",
    desc: "Tracking today's progress...",
    color: "#8b5cf6",
    pct: 64,
    icon: BarChart3,
    messages: [
      "Tracking today's completion rate...",
      "Calculating consistency metrics...",
      "Predicting weekly rank improvement...",
    ],
  },
  {
    num: "06",
    name: "Memory Agent",
    desc: "Remembering everything...",
    color: "#6366f1",
    pct: 83,
    icon: RotateCw,
    messages: [
      "Remembering weak topic areas...",
      "Scheduling spaced repetition review...",
      "Locking concepts into long-term memory...",
    ],
  },
  {
    num: "07",
    name: "Community Agent",
    desc: "Matching your tribe...",
    color: "#d946ef",
    pct: 88,
    icon: Users,
    messages: [
      "Matching your study tribe...",
      "Connecting with top peer mentors...",
      "Celebrating your growth streak! 🎉",
    ],
  },
];

const LOG_POOL = [
  "Analyzing your goal: Crack GATE 2025",
  "Checking your study progress... ✓",
  "Found 3 weak topics: DBMS, OS, CN",
  "Searching best resources for you... ✓",
  "Creating a focused study plan... ✓",
  "Scheduling Pomodoro sessions...",
  "Setting reminders & notifications...",
  "Looking for internships matching your skills...",
  "Cross-referencing your weak topics...",
  "Predicting tomorrow's focus window...",
  "Sending you daily growth report...",
  "Motivational boost activated 💪",
  "Nova is always with you.",
];

const HEADER_STATES = [
  "NOVA'S LIVE THINKING",
  "NOVA IS ANALYZING",
  "NOVA IS PLANNING",
  "NOVA IS LEARNING",
  "NOVA IS OPTIMIZING",
  "NOVA IS PREDICTING",
  "NOVA IS REFLECTING",
];

const INSIGHTS = [
  { icon: Brain, color: "#a78bfa", text: "You learn best in the morning (6AM - 10AM)" },
  { icon: TrendingUp, color: "#ec4899", text: "Your consistency has increased by 32% this week" },
  { icon: Target, color: "#3b82f6", text: "Complete 2 more tasks to hit your daily streak goal!" },
  { icon: Star, color: "#eab308", text: "You're in the top 18% of students on the platform!" },
];

const TODAY_TASKS = [
  { label: "DBMS - Normalization", done: true },
  { label: "OS - Process Scheduling", done: true },
  { label: "CN - TCP/IP Protocols", done: false },
  { label: "System Design Basics", done: false },
];

const RING_COUNT = 26;
const RING_PALETTE = ["#a855f7", "#6366f1", "#ec4899", "#3b82f6", "#22d3ee", "#818cf8", "#c084fc", "#10b981"];
const PARTICLES = Array.from({ length: RING_COUNT }, (_, i) => {
  const angle = (i / RING_COUNT) * 360 + (i % 2 === 0 ? 0 : 8);
  const radius = 98 + ((i * 37) % 26);
  const rad = (angle * Math.PI) / 180;
  return {
    left: 135 + radius * Math.cos(rad),
    top: 135 + radius * Math.sin(rad),
    size: 2 + (i % 4) * 1.1,
    color: RING_PALETTE[i % RING_PALETTE.length],
    duration: 3.2 + (i % 5) * 0.8,
    delay: -(i * 0.35),
    amp: 6 + (i % 4) * 4,
  };
});

// Dynamic Ray Metadata
const LEFT_STEP_META = [
  { id: "l-ray-0", color: "#22d3ee" },
  { id: "l-ray-1", color: "#ec4899" },
  { id: "l-ray-2", color: "#f59e0b" },
  { id: "l-ray-3", color: "#10b981" },
  { id: "l-ray-4", color: "#8b5cf6" },
  { id: "l-ray-5", color: "#6366f1" },
  { id: "l-ray-6", color: "#d946ef" },
];

const RIGHT_PANEL_META = [
  { id: "r-ray-0", color: "#34d399" },
  { id: "r-ray-1", color: "#22d3ee" },
  { id: "r-ray-2", color: "#ec4899" },
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function fmtClock(d: Date) {
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function LogText({ text }: { text: string }) {
  if (text.endsWith("✓")) {
    return (
      <>
        <span className="nv__logText">{text.slice(0, -1)}</span>
        <span className="nv__logCheck">✓</span>
      </>
    );
  }
  return <span className="nv__logText">{text}</span>;
}

export default function NovaLiveSection() {
  const [now, setNow] = useState<Date | null>(null);
  const [tasks, setTasks] = useState(TODAY_TASKS);
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 + 59);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Console state
  const [logLines, setLogLines] = useState<{ time: string; text: string }[]>([]);
  const [typed, setTyped] = useState("");
  const poolIdxRef = useRef(0);
  const charIdxRef = useRef(0);
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const [headerIdx, setHeaderIdx] = useState(0);

  // Sequential Agent Cards Typewriter State Machine
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [activeMsgIdx, setActiveMsgIdx] = useState(0);
  const [typedStatusTexts, setTypedStatusTexts] = useState<string[]>(
    STEPS.map((s) => s.messages[0])
  );
  const activeCharRef = useRef(0);

  // TTS & STT Voice AI States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- React Refs for Dynamic DOM Positioning ----------
  const svgRef = useRef<SVGSVGElement | null>(null);
  const novaCoreRef = useRef<HTMLDivElement | null>(null);
  const leftCardDotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rightPanelDotRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // State to hold dynamically generated Bezier path strings
  const [leftRayPaths, setLeftRayPaths] = useState<string[]>([]);
  const [rightRayPaths, setRightRayPaths] = useState<string[]>([]);

  // Calculate SVG paths dynamically from DOM element bounding rectangles
  const recalculateRays = useCallback(() => {
    if (!svgRef.current || !novaCoreRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width === 0 || svgRect.height === 0) return;

    const novaRect = novaCoreRef.current.getBoundingClientRect();
    const startX = ((novaRect.left + novaRect.width / 2 - svgRect.left) / svgRect.width) * 1000;
    const startY = ((novaRect.top + novaRect.height / 2 - svgRect.top) / svgRect.height) * 680;

    // Calculate 7 Left Step Rays
    const newLeft = LEFT_STEP_META.map((_, i) => {
      const dotEl = leftCardDotRefs.current[i];
      if (!dotEl) return "";
      const dotRect = dotEl.getBoundingClientRect();
      const endX = ((dotRect.left + dotRect.width / 2 - svgRect.left) / svgRect.width) * 1000;
      const endY = ((dotRect.top + dotRect.height / 2 - svgRect.top) / svgRect.height) * 680;

      const cp1X = startX + (endX - startX) * 0.45;
      const cp1Y = startY;
      const cp2X = startX + (endX - startX) * 0.85;
      const cp2Y = endY;
      return `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
    });

    // Calculate 3 Right Panel Rays
    const newRight = RIGHT_PANEL_META.map((_, i) => {
      const dotEl = rightPanelDotRefs.current[i];
      if (!dotEl) return "";
      const dotRect = dotEl.getBoundingClientRect();
      const endX = ((dotRect.left + dotRect.width / 2 - svgRect.left) / svgRect.width) * 1000;
      const endY = ((dotRect.top + dotRect.height / 2 - svgRect.top) / svgRect.height) * 680;

      const cp1X = startX + (endX - startX) * 0.45;
      const cp1Y = startY;
      const cp2X = startX + (endX - startX) * 0.85;
      const cp2Y = endY;
      return `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
    });

    setLeftRayPaths(newLeft);
    setRightRayPaths(newRight);
  }, []);

  // Update rays on mount, window resize, and layout changes
  useEffect(() => {
    recalculateRays();
    const raf = requestAnimationFrame(() => recalculateRays());
    const timer = setTimeout(() => recalculateRays(), 150);

    window.addEventListener("resize", recalculateRays);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && svgRef.current) {
      ro = new ResizeObserver(() => recalculateRays());
      ro.observe(svgRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", recalculateRays);
      if (ro) ro.disconnect();
    };
  }, [recalculateRays]);

  // Sequential Agent Cards Typewriter Effect (Card 01 -> 07, 3 sentences each)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const stepCard = STEPS[activeCardIdx];
    const targetMessage = stepCard.messages[activeMsgIdx];

    const typeTick = () => {
      if (activeCharRef.current <= targetMessage.length) {
        const textSlice = targetMessage.slice(0, activeCharRef.current);
        setTypedStatusTexts((prev) => {
          const next = [...prev];
          next[activeCardIdx] = textSlice;
          return next;
        });
        activeCharRef.current += 1;
        timeout = setTimeout(typeTick, 26 + Math.random() * 18);
      } else {
        // Finished sentence -> pause then next sentence or next card
        timeout = setTimeout(() => {
          activeCharRef.current = 0;
          if (activeMsgIdx < stepCard.messages.length - 1) {
            setActiveMsgIdx((prev) => prev + 1);
          } else {
            // Completed 3 sentences for current card -> reset text to default & move to next card
            setTypedStatusTexts((prev) => {
              const next = [...prev];
              next[activeCardIdx] = stepCard.messages[0];
              return next;
            });
            setActiveMsgIdx(0);
            setActiveCardIdx((prev) => (prev + 1) % STEPS.length);
          }
        }, 1300);
      }
    };

    timeout = setTimeout(typeTick, 280);
    return () => clearTimeout(timeout);
  }, [activeCardIdx, activeMsgIdx]);

  useEffect(() => {
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHeaderIdx((i) => (i + 1) % HEADER_STATES.length), 4200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const target = LOG_POOL[poolIdxRef.current % LOG_POOL.length];
      if (charIdxRef.current <= target.length) {
        setTyped(target.slice(0, charIdxRef.current));
        charIdxRef.current += 1;
        timeout = setTimeout(tick, 24 + Math.random() * 20);
      } else {
        timeout = setTimeout(() => {
          const stamp = new Date();
          setLogLines((prev) => {
            const next = [...prev, { time: fmtClock(stamp), text: target }];
            return next.length > 9 ? next.slice(next.length - 9) : next;
          });
          charIdxRef.current = 0;
          poolIdxRef.current += 1;
          setTyped("");
          timeout = setTimeout(tick, 260);
        }, 1150);
      }
    };

    timeout = setTimeout(tick, 400);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logLines, typed]);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 24 * 60 + 59 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Text-To-Speech (TTS) Engine
  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechText(text);
      setShowSpeechBubble(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.1;
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const prefVoice = voices.find(
      (v) =>
        v.name.includes("Google") ||
        v.name.includes("Natural") ||
        v.name.includes("Samantha") ||
        v.name.includes("Zira") ||
        v.lang.startsWith("en")
    );
    if (prefVoice) utterance.voice = prefVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeechText(text);
      setShowSpeechBubble(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => setShowSpeechBubble(false), 4500);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Speech-To-Text (STT) Voice Recognition Engine
  const toggleListening = useCallback(() => {
    if (isSpeaking) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setShowSpeechBubble(false);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = "en-US";

          recognition.onstart = () => {
            setIsListening(true);
            setSpeechText("Listening... Speak your goal or ask Nova anything! 🎙️");
            setShowSpeechBubble(true);
          };

          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setIsListening(false);
            const aiResponse = `I heard: "${transcript}". Nova is optimizing your study plan for that right now! 🚀`;
            speakText(aiResponse);
          };

          recognition.onerror = () => {
            setIsListening(false);
            const fallback = "Hi! I am Nova, your AI copilot. Tap me anytime to speak or hear live insights!";
            speakText(fallback);
          };

          recognition.onend = () => {
            setIsListening(false);
          };

          recognition.start();
        } catch {
          setIsListening(false);
          speakText("Hi! I am Nova, your AI copilot. Always working in the background for your growth!");
        }
      } else {
        const responses = [
          "Hello! Nova is actively optimizing your study plan and tracking your goals!",
          "Great job! Your consistency has increased by 32% this week. Keep going!",
          "I've scheduled your next 45-minute Focus Session.",
        ];
        const randomResp = responses[Math.floor(Math.random() * responses.length)];
        speakText(randomResp);
      }
    }
  }, [isSpeaking, isListening, speakText]);

  const toggleTask = useCallback((i: number) => {
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t)));
  }, []);

  const doneCount = tasks.filter((t) => t.done).length;
  const planPct = Math.round((doneCount / tasks.length) * 100);

  const timeLabel = useMemo(() => {
    if (!now) return "--:--:-- --";
    let h = now.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;
  }, [now]);

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const focusPct = 1 - secondsLeft / (25 * 60);
  const ringCirc = 2 * Math.PI * 40;
  const dailyPct = 78;

  return (
    <section className="nv">
      <style>{`
        .nv {
          position: relative;
          width: 100%;
          background: #04050d;
          padding: 50px 4vw 60px;
          overflow: hidden;
          color: #fff;
        }

        .nv__eyebrow {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #c084fc;
          margin-bottom: 10px;
        }

        .nv__heading {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(26px, 2.7vw, 40px);
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: rgba(255,255,255,0.96);
          margin: 0 0 10px;
          max-width: 680px;
        }

        .nv__heading span {
          background: linear-gradient(135deg, #c084fc, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nv__lede {
          font-size: 14.5px;
          line-height: 1.65;
          color: rgba(255,255,255,0.5);
          max-width: 660px;
          margin: 0 0 34px;
          font-weight: 300;
        }

        .nv__stageWrap {
          position: relative;
          max-width: 1500px;
          margin: 0 auto;
        }

        /* 3-Column Grid Layout: Left Steps | Middle Nova (aligned in front of Resource Agent & Today's Plan) | Right Panels */
        .nv__grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 3.1fr) minmax(0, 2.5fr) minmax(0, 3.6fr);
          gap: 24px;
          align-items: center;
        }

        /* SVG Rays Overlay - Layered STRICTLY BEHIND Nova's face (z-index 1) */
        .nv__raysSvg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
          overflow: visible;
        }

        .nv__rayPathBase {
          fill: none;
          stroke-width: 2px;
          opacity: 0.38;
          filter: drop-shadow(0 0 6px var(--rc));
        }

        .nv__rayPathFlow {
          fill: none;
          stroke-width: 2.5px;
          stroke-dasharray: 8 22;
          animation: nvRayDashFlowOut 2.4s linear infinite;
          filter: drop-shadow(0 0 8px var(--rc));
        }

        .nv__rayGroup {
          animation: nvSwimRays 5.5s ease-in-out infinite alternate;
          transform-origin: center;
        }

        /* Left Steps Cards */
        .nv__steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          z-index: 3;
        }

        .nv__stepCard {
          position: relative;
          display: flex;
          gap: 14px;
          padding: 13px 16px;
          border-radius: 14px;
          border-left: 3.5px solid var(--c);
          border-top: 1px solid rgba(255,255,255,0.08);
          border-right: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(12, 14, 28, 0.78);
          backdrop-filter: blur(12px);
          transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
        }

        .nv__stepCard:hover {
          transform: translateX(4px);
          border-color: color-mix(in srgb, var(--c) 50%, transparent);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--c) 16%, transparent);
        }

        .nv__stepCard--active {
          border-color: color-mix(in srgb, var(--c) 65%, transparent);
          box-shadow: 0 8px 26px color-mix(in srgb, var(--c) 25%, transparent);
        }

        .nv__stepNum {
          position: absolute;
          top: 12px;
          left: 12px;
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          color: var(--c);
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
          padding: 1px 5px;
        }

        .nv__stepIcon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-left: 24px;
          display: grid;
          place-items: center;
          border: 1.5px solid var(--c);
          background: color-mix(in srgb, var(--c) 14%, transparent);
          color: var(--c);
          box-shadow: 0 0 12px color-mix(in srgb, var(--c) 35%, transparent);
        }

        .nv__stepBody { flex: 1; min-width: 0; }

        .nv__stepTop { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }

        .nv__stepTitle { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.96); letter-spacing: -0.01em; }

        .nv__stepDesc { font-size: 11.5px; color: rgba(255,255,255,0.48); margin-top: 2px; line-height: 1.4; }

        .nv__liveTag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--c);
          border: 1px solid var(--c);
          border-radius: 999px;
          padding: 2px 7px;
          flex-shrink: 0;
          white-space: nowrap;
          background: color-mix(in srgb, var(--c) 10%, transparent);
        }

        .nv__liveDot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--c);
          animation: nvPulseDot 1.4s ease-in-out infinite;
        }

        .nv__stepFoot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 8px 0 5px; }

        .nv__stepStatus {
          font-size: 11.5px;
          color: rgba(255,255,255,0.85);
          font-style: italic;
          display: flex;
          align-items: center;
          min-height: 18px;
        }

        .nv__typeCursor {
          display: inline-block;
          width: 5px;
          height: 11px;
          margin-left: 3px;
          background: var(--c);
          animation: nvBlink 1s step-end infinite;
        }

        .nv__stepPct { font-size: 11px; font-weight: 700; color: var(--c); flex-shrink: 0; }

        .nv__stepBar { height: 3.5px; border-radius: 2px; background: rgba(255,255,255,0.08); overflow: hidden; }

        .nv__stepBarFill {
          height: 100%;
          border-radius: 2px;
          background: var(--c);
          box-shadow: 0 0 10px var(--c);
        }

        .nv__nodeDot {
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--c);
          box-shadow: 0 0 12px var(--c), 0 0 20px var(--c);
          animation: nvPulseDot 1.8s ease-in-out infinite;
          z-index: 4;
        }

        .nv__nodeDotLeft {
          position: absolute;
          left: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--rc);
          box-shadow: 0 0 12px var(--rc), 0 0 20px var(--rc);
          animation: nvPulseDot 1.8s ease-in-out infinite;
          z-index: 4;
        }

        .nv__nodeDotCorner {
          position: absolute;
          left: -6px;
          top: 14px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--rc);
          box-shadow: 0 0 12px var(--rc), 0 0 20px var(--rc);
          animation: nvPulseDot 1.8s ease-in-out infinite;
          z-index: 4;
        }

        /* ---------- Center Column: Nova Avatar ---------- */
        .nv__orbCol {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .nv__avatarStage {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: nvFloatOrb 6.5s ease-in-out infinite;
          cursor: pointer;
        }

        .nv__speechBubble {
          position: relative;
          max-width: 320px;
          padding: 12px 18px;
          border-radius: 18px;
          background: rgba(20, 16, 40, 0.94);
          border: 1.5px solid rgba(192, 132, 252, 0.45);
          backdrop-filter: blur(14px);
          box-shadow: 0 10px 30px rgba(168, 85, 247, 0.35);
          margin-bottom: 22px;
          text-align: center;
          animation: nvPopBubble 0.3s ease-out;
        }

        .nv__speechBubble::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 14px;
          height: 14px;
          background: rgba(20, 16, 40, 0.94);
          border-right: 1.5px solid rgba(192, 132, 252, 0.45);
          border-bottom: 1.5px solid rgba(192, 132, 252, 0.45);
        }

        .nv__speechText {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.95);
          font-weight: 500;
        }

        .nv__voiceWave {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3.5px;
          margin-top: 6px;
        }

        .nv__voiceBar {
          width: 3px;
          height: 12px;
          background: #c084fc;
          border-radius: 2px;
          animation: nvWaveBounce 0.7s ease-in-out infinite alternate;
        }
        .nv__voiceBar:nth-child(2) { animation-delay: 0.15s; height: 18px; background: #ec4899; }
        .nv__voiceBar:nth-child(3) { animation-delay: 0.3s; height: 10px; background: #22d3ee; }
        .nv__voiceBar:nth-child(4) { animation-delay: 0.45s; height: 16px; background: #c084fc; }

        .nv__orbStage {
          position: relative;
          width: 270px;
          height: 270px;
          display: grid;
          place-items: center;
          transition: transform 200ms ease;
        }

        .nv__avatarStage:hover .nv__orbStage {
          transform: scale(1.03);
        }

        .nv__particle {
          position: absolute;
          border-radius: 50%;
          animation: nvFloatParticle ease-in-out infinite;
        }

        .nv__ringOuter {
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          border: 1.5px solid rgba(192, 132, 252, 0.38);
          box-shadow: 0 0 28px rgba(168, 85, 247, 0.3);
          animation: nvSpin 26s linear infinite;
        }

        .nv__ringDash {
          position: absolute;
          inset: 0px;
          border-radius: 50%;
          border: 1.5px dashed rgba(99, 102, 241, 0.38);
          animation: nvSpinReverse 38s linear infinite;
        }

        .nv__glow {
          position: absolute;
          inset: 15px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168,85,247,0.9) 0%, rgba(236,72,153,0.5) 45%, rgba(99,102,241,0.25) 70%, transparent 85%);
          filter: blur(18px);
          animation: nvCoreBreathe 3.4s ease-in-out infinite;
        }

        .nv__core {
          position: absolute;
          inset: 54px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 30%, rgba(147, 51, 234, 1), rgba(8, 6, 22, 1));
          border: 1.8px solid rgba(216, 180, 254, 0.7);
          display: grid;
          place-items: center;
          box-shadow: 0 0 65px rgba(168, 85, 247, 0.75), inset 0 0 30px rgba(255, 255, 255, 0.18);
          overflow: hidden;
        }

        .nv__faceSvg {
          width: 104px;
          height: 104px;
          overflow: visible;
        }

        .nv__eyeGlow {
          filter: drop-shadow(0 0 6px #c084fc);
        }

        .nv__eyeBlink {
          animation: nvBlinkEye 4s infinite;
          transform-origin: center;
        }

        .nv__mouthTalk {
          animation: nvMouthOpen 0.5s ease-in-out infinite alternate;
          transform-origin: 50px 62px;
        }

        .nv__novaName {
          margin-top: 16px;
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: 26px;
          letter-spacing: 0.06em;
          background: linear-gradient(135deg, #c084fc, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nv__novaSub { font-size: 12.5px; color: #a5b4fc; margin-top: 2px; }

        .nv__tapBadge {
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          border-radius: 999px;
          border: 1px solid rgba(192, 132, 252, 0.35);
          background: rgba(192, 132, 252, 0.12);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.92);
          font-weight: 600;
          box-shadow: 0 0 18px rgba(168, 85, 247, 0.25);
          transition: background 160ms ease, border-color 160ms ease;
        }

        .nv__tapBadge:hover {
          background: rgba(192, 132, 252, 0.22);
          border-color: rgba(192, 132, 252, 0.55);
        }

        /* ---------- Right Console & Widgets ---------- */
        .nv__right {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          z-index: 3;
        }

        .nv__panel {
          position: relative;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(12, 14, 28, 0.75);
          backdrop-filter: blur(12px);
          padding: 18px 20px;
        }

        .nv__consoleHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .nv__consoleTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          color: rgba(255,255,255,0.75);
        }

        .nv__consoleTitleText { display: inline-block; animation: nvLabelFade 500ms ease; }

        .nv__consoleDot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 6px #34d399; animation: nvPulseDot 1.4s ease-in-out infinite; }
        .nv__consoleClock { font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.45); }

        .nv__consoleBody {
          font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace;
          font-size: 11.5px;
          line-height: 2;
          height: 230px;
          overflow: hidden;
          scroll-behavior: smooth;
        }

        .nv__logTime { color: rgba(255,255,255,0.3); margin-right: 10px; }
        .nv__logText { color: rgba(255,255,255,0.7); }
        .nv__logCheck { color: #34d399; margin-left: 3px; font-weight: bold; }

        .nv__typingRow { color: rgba(255,255,255,0.7); }

        .nv__cursor {
          display: inline-block;
          width: 6px;
          height: 12px;
          margin-left: 4px;
          background: #c084fc;
          transform: translateY(2px);
          animation: nvBlink 1s step-end infinite;
        }

        .nv__widgets { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .nv__widgetHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .nv__widgetTitle { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.9); }
        .nv__widgetTag { font-size: 10px; color: rgba(255,255,255,0.45); border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 2px 8px; }

        .nv__planBar { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; margin-bottom: 12px; }
        .nv__planBarFill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #22d3ee, #a855f7); transition: width 400ms ease; }

        .nv__taskRow { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: rgba(255,255,255,0.75); padding: 4px 0; cursor: pointer; }
        .nv__taskRow--done { color: rgba(255,255,255,0.4); text-decoration: line-through; }
        .nv__taskCheck { color: #34d399; flex-shrink: 0; }
        .nv__taskCheck--off { color: rgba(255,255,255,0.25); }

        .nv__nextTask { font-size: 13.5px; font-weight: 700; color: rgba(255,255,255,0.94); margin-bottom: 2px; }
        .nv__nextSub { font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 14px; }

        .nv__startBtn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
        }

        .nv__startBtn:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(139,92,246,0.38); }
        .nv__startBtn--active { opacity: 0.6; cursor: default; }

        .nv__focusRing { display: flex; flex-direction: column; align-items: center; }
        .nv__focusSvg { transform: rotate(-90deg); }
        .nv__focusTimeWrap { position: relative; width: 118px; height: 118px; }
        .nv__focusTime { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .nv__focusMM { font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', monospace; font-size: 21px; font-weight: 700; color: white; }
        .nv__focusLabel { font-size: 9.5px; color: rgba(255,255,255,0.45); letter-spacing: 0.06em; margin-top: 2px; }
        .nv__pomodoroLabel { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 12px; }
        .nv__pomodoroDots { display: flex; gap: 5px; margin-top: 8px; }
        .nv__pomodoroDot { width: 16px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); }
        .nv__pomodoroDot--active { background: linear-gradient(90deg, #ec4899, #a855f7); }

        .nv__dailyWrap { display: flex; flex-direction: column; align-items: center; }
        .nv__dailyRingWrap { position: relative; width: 92px; height: 92px; }
        .nv__dailyPct { position: absolute; inset: 0; display: grid; place-items: center; font-size: 18px; font-weight: 800; color: white; }
        .nv__dailyMsg { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.88); margin-top: 10px; text-align: center; }
        .nv__dailySub { font-size: 10.5px; color: rgba(255,255,255,0.45); text-align: center; margin-top: 2px; }
        .nv__sparkline { margin-top: 10px; width: 100%; }

        /* Bottom Insights */
        .nv__insights {
          max-width: 1500px;
          margin: 32px auto 0;
          display: flex;
          flex-wrap: wrap;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(12, 14, 28, 0.65);
          backdrop-filter: blur(12px);
          overflow: hidden;
          position: relative;
          z-index: 3;
        }

        .nv__insight {
          flex: 1;
          min-width: 220px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 20px;
          border-right: 1px solid rgba(255,255,255,0.07);
        }

        .nv__insight:last-child { border-right: none; }

        .nv__insightIcon {
          width: 36px; height: 36px; border-radius: 10px;
          display: grid; place-items: center;
          background: color-mix(in srgb, var(--ic) 14%, transparent);
          color: var(--ic);
          flex-shrink: 0;
          box-shadow: 0 0 12px color-mix(in srgb, var(--ic) 25%, transparent);
        }

        .nv__insightText { font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.7); }

        /* Quote Banner */
        .nv__banner {
          max-width: 1500px;
          margin: 22px auto 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          padding: 26px 32px;
          border-radius: 18px;
          border: 1px solid rgba(139,92,246,0.3);
          background: linear-gradient(120deg, rgba(139,92,246,0.1), rgba(236,72,153,0.06));
          backdrop-filter: blur(12px);
          position: relative;
          z-index: 3;
        }

        .nv__bannerLeft { display: flex; align-items: flex-start; gap: 16px; }
        .nv__quoteIcon { color: #a855f7; flex-shrink: 0; margin-top: 2px; }
        .nv__bannerText { font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.94); line-height: 1.5; }

        .nv__bannerRight { display: flex; align-items: center; gap: 14px; }
        .nv__bannerAvatar {
          width: 46px; height: 46px; border-radius: 50%;
          border: 1.5px solid rgba(196,181,253,0.6);
          display: grid; place-items: center;
          background: radial-gradient(circle, rgba(139,92,246,0.5), rgba(8,6,20,0.95));
          color: #d8b4fe;
          box-shadow: 0 0 16px rgba(139,92,246,0.4);
        }

        .nv__bannerName { font-size: 14px; font-weight: 700; color: white; }
        .nv__bannerRole { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.48); }
        .nv__bannerRoleDot { width: 5px; height: 5px; border-radius: 50%; background: #34d399; box-shadow: 0 0 6px #34d399; }

        /* ---------- Keyframe Animations ---------- */
        @keyframes nvPulseDot { 0%, 100% { opacity: 1; transform: translateY(-50%) scale(1); } 50% { opacity: 0.4; transform: translateY(-50%) scale(0.75); } }
        @keyframes nvSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes nvSpinReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes nvCoreBreathe { 0%, 100% { opacity: 0.75; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.06); } }
        @keyframes nvDotBounce { 0%, 80%, 100% { opacity: 0.3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        @keyframes nvBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes nvLabelFade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        
        @keyframes nvFloatOrb {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes nvFloatParticle {
          0%   { transform: translateY(0px) scale(1); opacity: 0.6; }
          25%  { transform: translateY(calc(var(--amp) * -1)) scale(1.2); opacity: 1; }
          50%  { transform: translateY(2px) scale(0.9); opacity: 0.5; }
          75%  { transform: translateY(var(--amp)) scale(1.1); opacity: 0.95; }
          100% { transform: translateY(0px) scale(1); opacity: 0.6; }
        }

        @keyframes nvSwimRays {
          0% { transform: translateY(0px) skewY(0deg); }
          50% { transform: translateY(-5px) skewY(0.3deg); }
          100% { transform: translateY(3px) skewY(-0.3deg); }
        }

        /* Flow OUTWARD from Nova's face center */
        @keyframes nvRayDashFlowOut {
          from { stroke-dashoffset: 56; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes nvPopBubble {
          0% { opacity: 0; transform: scale(0.9) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes nvWaveBounce {
          0% { transform: scaleY(0.6); }
          100% { transform: scaleY(1.4); }
        }

        @keyframes nvBlinkEye {
          0%, 46%, 48%, 100% { transform: scaleY(1); }
          47% { transform: scaleY(0.1); }
        }

        @keyframes nvMouthOpen {
          0% { transform: scaleY(0.8); }
          100% { transform: scaleY(1.3); }
        }

        @media (max-width: 1180px) {
          .nv__grid { grid-template-columns: 1fr; }
          .nv__orbCol { position: static; padding: 25px 0 0; }
          .nv__raysSvg { display: none; }
          .nv__widgets { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 620px) {
          .nv__widgets { grid-template-columns: 1fr; }
          .nv__insight { border-right: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .nv__particle, .nv__ringOuter, .nv__ringDash, .nv__glow,
          .nv__liveDot, .nv__consoleDot, .nv__dots span, .nv__cursor,
          .nv__nodeDot, .nv__avatarStage, .nv__rayGroup, .nv__rayPathFlow {
            animation: none !important;
          }
        }
      `}</style>

      <div className="nv__eyebrow">Nova in Action</div>
      <h2 className="nv__heading">
        See How GrowthOS Works For You, <span>In Real Time</span>
      </h2>
      <p className="nv__lede">
        Meet Nova — your living AI copilot. Tap Nova to speak out loud (TTS & STT voice AI) or watch her coordinate your daily growth.
      </p>

      <div className="nv__stageWrap">
        {/* SVG Swimming Rays Overlay - Layered STRICTLY BEHIND Nova Core (z-index 1) */}
        <svg ref={svgRef} className="nv__raysSvg" viewBox="0 0 1000 680" preserveAspectRatio="none">
          <defs>
            <filter id="nvGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Gradients for 7 Left Outward Rays */}
            {LEFT_STEP_META.map((r) => (
              <linearGradient key={`grad-${r.id}`} id={`grad-${r.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.95" />
                <stop offset="60%" stopColor={r.color} stopOpacity="0.6" />
                <stop offset="100%" stopColor={r.color} stopOpacity="0.95" />
              </linearGradient>
            ))}

            {/* Gradients for 3 Right Outward Rays */}
            {RIGHT_PANEL_META.map((r) => (
              <linearGradient key={`grad-${r.id}`} id={`grad-${r.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.95" />
                <stop offset="50%" stopColor={r.color} stopOpacity="0.6" />
                <stop offset="100%" stopColor={r.color} stopOpacity="0.95" />
              </linearGradient>
            ))}
          </defs>

          <g className="nv__rayGroup">
            {/* 7 Left Outward Rays Dynamic DOM Connected */}
            {LEFT_STEP_META.map((r, i) => {
              const dPath = leftRayPaths[i] || "";
              if (!dPath) return null;
              return (
                <g key={r.id}>
                  <path
                    className="nv__rayPathBase"
                    d={dPath}
                    stroke={`url(#grad-${r.id})`}
                    style={{ ["--rc" as string]: r.color }}
                  />
                  <path
                    className="nv__rayPathFlow"
                    d={dPath}
                    stroke={r.color}
                    style={{
                      ["--rc" as string]: r.color,
                      animationDelay: `${-(i * 0.35)}s`,
                    }}
                  />
                  <circle r="3" fill={r.color} filter="url(#nvGlowFilter)">
                    <animateMotion
                      path={dPath}
                      dur={`${3.2 + i * 0.3}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.4}s`}
                    />
                  </circle>
                </g>
              );
            })}

            {/* 3 Right Outward Rays Dynamic DOM Connected */}
            {RIGHT_PANEL_META.map((r, i) => {
              const dPath = rightRayPaths[i] || "";
              if (!dPath) return null;
              return (
                <g key={r.id}>
                  <path
                    className="nv__rayPathBase"
                    d={dPath}
                    stroke={`url(#grad-${r.id})`}
                    style={{ ["--rc" as string]: r.color }}
                  />
                  <path
                    className="nv__rayPathFlow"
                    d={dPath}
                    stroke={r.color}
                    style={{
                      ["--rc" as string]: r.color,
                      animationDelay: `${-(i * 0.4)}s`,
                    }}
                  />
                  <circle r="3.2" fill={r.color} filter="url(#nvGlowFilter)">
                    <animateMotion
                      path={dPath}
                      dur={`${3.0 + i * 0.4}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.3}s`}
                    />
                  </circle>
                </g>
              );
            })}
          </g>
        </svg>

        {/* 3-Column Dashboard Grid: Left Steps | Middle Nova | Right Panels */}
        <div className="nv__grid">
          {/* ---------- Left Agent Step Cards ---------- */}
          <div className="nv__steps">
            {STEPS.map((s, idx) => {
              const StepIcon = s.icon;
              const isActive = idx === activeCardIdx;
              return (
                <div
                  key={s.num}
                  className={`nv__stepCard ${isActive ? "nv__stepCard--active" : ""}`}
                  style={{ ["--c" as string]: s.color }}
                >
                  <span className="nv__stepNum">{s.num}</span>
                  <div className="nv__stepIcon">
                    <StepIcon size={18} />
                  </div>
                  <div className="nv__stepBody">
                    <div className="nv__stepTop">
                      <span className="nv__stepTitle">{s.name}</span>
                      <span className="nv__liveTag">
                        <span className="nv__liveDot" />
                        LIVE
                      </span>
                    </div>
                    <div className="nv__stepDesc">{s.desc}</div>
                    <div className="nv__stepFoot">
                      <span className="nv__stepStatus">
                        {typedStatusTexts[idx]}
                        {isActive && <span className="nv__typeCursor" />}
                      </span>
                      <span className="nv__stepPct">{s.pct}%</span>
                    </div>
                    <div className="nv__stepBar">
                      <div className="nv__stepBarFill" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                  <span
                    ref={(el) => {
                      leftCardDotRefs.current[idx] = el;
                    }}
                    className="nv__nodeDot"
                  />
                </div>
              );
            })}
          </div>

          {/* ---------- Center Column: Nova Avatar ---------- */}
          <div className="nv__orbCol">
            <div className="nv__avatarStage" onClick={toggleListening} title="Tap Nova to speak out loud (TTS & STT)">
              {/* Automatic Speech Bubble when speaking or listening */}
              {showSpeechBubble && (
                <div className="nv__speechBubble">
                  <div className="nv__speechText">{speechText}</div>
                  {(isSpeaking || isListening) && (
                    <div className="nv__voiceWave">
                      <span className="nv__voiceBar" />
                      <span className="nv__voiceBar" />
                      <span className="nv__voiceBar" />
                      <span className="nv__voiceBar" />
                    </div>
                  )}
                </div>
              )}

              {/* Central Glowing Orb & Human Face */}
              <div className="nv__orbStage">
                {PARTICLES.map((p, i) => (
                  <span
                    key={i}
                    className="nv__particle"
                    style={{
                      left: p.left,
                      top: p.top,
                      width: p.size,
                      height: p.size,
                      background: p.color,
                      boxShadow: `0 0 8px ${p.color}`,
                      ["--amp" as string]: `${p.amp}px`,
                      animationDuration: `${p.duration}s`,
                      animationDelay: `${p.delay}s`,
                    }}
                  />
                ))}
                <div className="nv__ringDash" />
                <div className="nv__ringOuter" />
                <div className="nv__glow" />

                {/* Human Styled AI Face Core - Solid Backdrop guarantees ZERO ray origin is visible */}
                <div ref={novaCoreRef} className="nv__core">
                  <svg viewBox="0 0 100 100" className="nv__faceSvg">
                    {/* Cute Cheek Glow / Blush */}
                    <ellipse cx="24" cy="54" rx="8" ry="5" fill="rgba(236,72,153,0.35)" filter="blur(2px)" />
                    <ellipse cx="76" cy="54" rx="8" ry="5" fill="rgba(236,72,153,0.35)" filter="blur(2px)" />

                    {/* Glowing Eyes */}
                    <g className="nv__eyeBlink nv__eyeGlow">
                      <ellipse cx="35" cy="40" rx="7" ry="9" fill="#e9d5ff" />
                      <ellipse cx="37" cy="39" rx="3.5" ry="4.5" fill="#3b0764" />
                      <circle cx="39" cy="37" r="1.8" fill="#ffffff" />

                      <ellipse cx="65" cy="40" rx="7" ry="9" fill="#e9d5ff" />
                      <ellipse cx="63" cy="39" rx="3.5" ry="4.5" fill="#3b0764" />
                      <circle cx="61" cy="37" r="1.8" fill="#ffffff" />
                    </g>

                    {/* Lips / Mouth */}
                    {isSpeaking ? (
                      <path d="M 36 58 Q 50 70 64 58 Z" fill="rgba(236, 72, 153, 0.65)" stroke="#f472b6" strokeWidth="2.5" className="nv__mouthTalk" />
                    ) : (
                      <path d="M 36 58 Q 50 68 64 58" stroke="#f472b6" strokeWidth="3" fill="none" strokeLinecap="round" />
                    )}
                  </svg>
                </div>
              </div>

              <div className="nv__novaName">NOVA</div>
              <div className="nv__novaSub">Voice AI Copilot</div>

              {/* Tap to Talk Badge */}
              <div className="nv__tapBadge">
                {isListening ? (
                  <>
                    <Mic size={14} color="#ec4899" />
                    Listening...
                  </>
                ) : isSpeaking ? (
                  <>
                    <Volume2 size={14} color="#34d399" />
                    Speaking...
                  </>
                ) : (
                  <>
                    <Mic size={14} color="#c084fc" />
                    Tap Nova to Speak (TTS & STT)
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ---------- Right Console & Widgets ---------- */}
          <div className="nv__right">
            {/* Thinking Console */}
            <div className="nv__panel">
              <span
                ref={(el) => {
                  rightPanelDotRefs.current[0] = el;
                }}
                className="nv__nodeDotCorner"
                style={{ ["--rc" as string]: "#34d399" }}
              />
              <div className="nv__consoleHead">
                <div className="nv__consoleTitle">
                  <span className="nv__consoleDot" />
                  <span key={headerIdx} className="nv__consoleTitleText">{HEADER_STATES[headerIdx]}</span>
                </div>
                <span className="nv__consoleClock">{timeLabel}</span>
              </div>
              <div className="nv__consoleBody" ref={consoleRef}>
                {logLines.map((l, i) => (
                  <div key={i}>
                    <span className="nv__logTime">{l.time}</span>
                    <LogText text={l.text} />
                  </div>
                ))}
                <div className="nv__typingRow">
                  <span className="nv__logTime">{now ? fmtClock(now) : ""}</span>
                  <span className="nv__logText">{typed}</span>
                  <span className="nv__cursor" />
                </div>
              </div>
            </div>

            <div className="nv__widgets">
              {/* Today's Plan */}
              <div className="nv__panel">
                <span
                  ref={(el) => {
                    rightPanelDotRefs.current[1] = el;
                  }}
                  className="nv__nodeDotLeft"
                  style={{ ["--rc" as string]: "#22d3ee" }}
                />
                <div className="nv__widgetHead">
                  <span className="nv__widgetTitle">
                    <ListChecks size={15} color="#22d3ee" />
                    Today's Plan
                  </span>
                  <span className="nv__widgetTag">{doneCount}/{tasks.length} Tasks</span>
                </div>
                <div className="nv__planBar">
                  <div className="nv__planBarFill" style={{ width: `${planPct}%` }} />
                </div>
                {tasks.map((t, i) => (
                  <div key={t.label} className={`nv__taskRow ${t.done ? "nv__taskRow--done" : ""}`} onClick={() => toggleTask(i)}>
                    {t.done ? <CheckCircle2 size={15} className="nv__taskCheck" /> : <Circle size={15} className="nv__taskCheck--off" />}
                    {t.label}
                  </div>
                ))}
              </div>

              <div className="nv__panel">
                <div className="nv__widgetHead">
                  <span className="nv__widgetTitle">
                    <Zap size={15} color="#eab308" />
                    Next Up
                  </span>
                  <span className="nv__widgetTag">in 25 mins</span>
                </div>
                <div className="nv__nextTask">OS - Process Scheduling</div>
                <div className="nv__nextSub">45 min Focus Session</div>
                <button
                  type="button"
                  className={`nv__startBtn ${sessionStarted ? "nv__startBtn--active" : ""}`}
                  onClick={() => setSessionStarted(true)}
                >
                  <Play size={13} fill="currentColor" />
                  {sessionStarted ? "Session Active" : "Start Session"}
                </button>
              </div>

              {/* Focus Mode */}
              <div className="nv__panel nv__focusRing">
                <span
                  ref={(el) => {
                    rightPanelDotRefs.current[2] = el;
                  }}
                  className="nv__nodeDotLeft"
                  style={{ ["--rc" as string]: "#ec4899" }}
                />
                <div className="nv__widgetHead" style={{ width: "100%" }}>
                  <span className="nv__widgetTitle">
                    <Target size={15} color="#ec4899" />
                    Focus Mode
                  </span>
                </div>
                <div className="nv__focusTimeWrap">
                  <svg className="nv__focusSvg" width="118" height="118" viewBox="0 0 118 118">
                    <circle cx="59" cy="59" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                    <circle
                      cx="59" cy="59" r="50" fill="none" stroke="url(#nvFocusGrad)" strokeWidth="7"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - focusPct)}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                    <defs>
                      <linearGradient id="nvFocusGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="nv__focusTime">
                    <span className="nv__focusMM">{pad(mm)}:{pad(ss)}</span>
                    <span className="nv__focusLabel">DEEP WORK</span>
                  </div>
                </div>
                <div className="nv__pomodoroLabel">Pomodoro 1 of 4</div>
                <div className="nv__pomodoroDots">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`nv__pomodoroDot ${i === 0 ? "nv__pomodoroDot--active" : ""}`} />
                  ))}
                </div>
              </div>

              {/* Daily Progress */}
              <div className="nv__panel nv__dailyWrap">
                <div className="nv__widgetHead" style={{ width: "100%" }}>
                  <span className="nv__widgetTitle">
                    <Heart size={15} color="#f472b6" />
                    Daily Progress
                  </span>
                </div>
                <div className="nv__dailyRingWrap">
                  <svg width="92" height="92" viewBox="0 0 92 92" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="46" cy="46" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                    <circle
                      cx="46" cy="46" r="40" fill="none" stroke="#34d399" strokeWidth="6"
                      strokeDasharray={`${ringCirc}`}
                      strokeDashoffset={`${ringCirc * (1 - dailyPct / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="nv__dailyPct">{dailyPct}%</div>
                </div>
                <div className="nv__dailyMsg">Great Progress! 🎉</div>
                <div className="nv__dailySub">Keep going, you're doing awesome!</div>
                <svg className="nv__sparkline" width="100%" height="30" viewBox="0 0 160 30" preserveAspectRatio="none">
                  <polyline
                    points="0,22 20,18 40,24 60,10 80,16 100,6 120,12 140,4 160,8"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Bottom Insights Strip ---------- */}
        <div className="nv__insights">
          {INSIGHTS.map((ins, i) => {
            const Icon = ins.icon;
            return (
              <div key={i} className="nv__insight">
                <span className="nv__insightIcon" style={{ ["--ic" as string]: ins.color }}>
                  <Icon size={17} />
                </span>
                <span className="nv__insightText">{ins.text}</span>
              </div>
            );
          })}
        </div>

        {/* ---------- Quote Banner ---------- */}
        <div className="nv__banner">
          <div className="nv__bannerLeft">
            <Quote size={32} className="nv__quoteIcon" fill="currentColor" />
            <div className="nv__bannerText">
              Nova doesn't just assist.
              <br />
              Nova understands, adapts, and grows with you.
            </div>
          </div>
          <div className="nv__bannerRight">
            <div className="nv__bannerAvatar">
              <Sparkles size={20} fill="currentColor" />
            </div>
            <div>
              <div className="nv__bannerName">NOVA</div>
              <div className="nv__bannerRole">
                Voice AI Copilot
                <span className="nv__bannerRoleDot" />
                Always On. Always For You
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
