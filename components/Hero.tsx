"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const videos = [
  "/videos/video1.mp4",
  "/videos/video2.mp4",
  "/videos/video3.mp4",
  "/videos/video4.mp4",
  "/videos/video5.mp4",
];

const DURATION = 5000;

function LiveDot() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 8, height: 8 }}>
        <motion.div
          animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#34d399" }}
        />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#34d399" }} />
      </div>
      <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
      
      </span>
    </div>
  );
}

export default function Hero() {
  // Two persistent video elements — NEVER remounted, we only swap src
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeSlot, setActiveSlot] = useState<"a" | "b">("a");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSlotRef = useRef<"a" | "b">("a");
  const currentIdxRef = useRef(0);

  const startProgress = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
    const start = Date.now();
    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - start) / DURATION) * 100, 100));
    }, 40);
  };

  const doTransition = (fromIdx: number, fromSlot: "a" | "b") => {
    const nextIdx = (fromIdx + 1) % videos.length;
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;

    const nextSlot = fromSlot === "a" ? "b" : "a";
    const nextVideo = nextSlot === "a" ? a : b;
    const prevVideo = nextSlot === "a" ? b : a;

    // next video is already preloaded — just play it
    nextVideo.play().catch(() => {});
    setActiveSlot(nextSlot);
    setCurrentIdx(nextIdx);
    activeSlotRef.current = nextSlot;
    currentIdxRef.current = nextIdx;

    // preload the one after next into the now-hidden slot
    setTimeout(() => {
      prevVideo.src = videos[(nextIdx + 1) % videos.length];
      prevVideo.load();
    }, 1300);

    startProgress();
    timerRef.current = setTimeout(() => doTransition(nextIdx, nextSlot), DURATION);
  };

  useEffect(() => {
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;

    // Load first into A, preload second into B
    a.src = videos[0];
    a.load();
    a.play().catch(() => {});

    b.src = videos[1];
    b.load();

    startProgress();
    timerRef.current = setTimeout(() => doTransition(0, "a"), DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const jumpTo = (idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;

    const curSlot = activeSlotRef.current;
    const nextSlot = curSlot === "a" ? "b" : "a";
    const targetVideo = nextSlot === "a" ? a : b;
    const otherVideo = nextSlot === "a" ? b : a;

    targetVideo.src = videos[idx];
    targetVideo.load();
    targetVideo.play().catch(() => {});
    setActiveSlot(nextSlot);
    setCurrentIdx(idx);
    activeSlotRef.current = nextSlot;
    currentIdxRef.current = idx;

    setTimeout(() => {
      otherVideo.src = videos[(idx + 1) % videos.length];
      otherVideo.load();
    }, 1300);

    startProgress();
    timerRef.current = setTimeout(() => doTransition(idx, nextSlot), DURATION);
  };

  return (
    <>
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
      .hero-wrap * { box-sizing: border-box; }

      .hero-btn-primary {
        position: relative; overflow: hidden;
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        border: none; color: white; padding: 16px 38px;
        border-radius: 14px; font-size: 15px; font-weight: 700;
        cursor: pointer; letter-spacing: 0.3px;
        font-family: 'Syne', sans-serif;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 8px 32px rgba(99,102,241,0.42);
        white-space: nowrap;
      }
      .hero-btn-primary::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.18), transparent);
        opacity: 0; transition: opacity 0.2s;
      }
      .hero-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 18px 50px rgba(99,102,241,0.52); }
      .hero-btn-primary:hover::after { opacity: 1; }
      .hero-btn-primary:active { transform: translateY(0); }

      .hero-btn-ghost {
        background: rgba(255,255,255,0.07);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255,255,255,0.16);
        color: white; padding: 16px 38px;
        border-radius: 14px; font-size: 15px; font-weight: 600;
        cursor: pointer; letter-spacing: 0.3px;
        font-family: 'Syne', sans-serif;
        transition: all 0.2s;
        display: flex; align-items: center; gap: 10px;
        white-space: nowrap;
      }
      .hero-btn-ghost:hover {
        background: rgba(255,255,255,0.13);
        border-color: rgba(255,255,255,0.28);
        transform: translateY(-2px);
      }

      .stat-glass {
        background: rgba(8,8,20,0.5);
        backdrop-filter: blur(24px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        padding: 16px 20px;
      }

      @keyframes grain {
        0%,100%{transform:translate(0,0)}
        10%{transform:translate(-2%,-3%)}20%{transform:translate(3%,2%)}
        30%{transform:translate(-1%,4%)}40%{transform:translate(4%,-1%)}
        50%{transform:translate(-3%,3%)}60%{transform:translate(2%,-4%)}
        70%{transform:translate(-4%,1%)}80%{transform:translate(1%,-2%)}
        90%{transform:translate(-2%,4%)}
      }
      .grain { animation: grain 0.5s steps(1) infinite; }

      .marquee-track {
        display: flex; gap: 40px;
        animation: marquee 22s linear infinite;
        white-space: nowrap;
      }
      @keyframes marquee {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }

      @media (max-width: 920px) { .stat-l, .stat-r { display: none !important; } }
      `}</style>

      <section
      className="hero-wrap"
      style={{
        position: "relative", height: "100vh", minHeight: 680,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", fontFamily: "'Syne', sans-serif",
      }}
      >
      {/* ══ DUAL VIDEO SLOTS — seamless crossfade, never remounted ══ */}
      <video ref={videoARef} autoPlay muted playsInline loop style={{
        position: "absolute", inset: 0, zIndex: 0,
        width: "100%", height: "100%", objectFit: "cover",
        opacity: activeSlot === "a" ? 1 : 0,
        transition: "opacity 1.2s ease-in-out",
      }} />
      <video ref={videoBRef} muted playsInline loop style={{
        position: "absolute", inset: 0, zIndex: 0,
        width: "100%", height: "100%", objectFit: "cover",
        opacity: activeSlot === "b" ? 1 : 0,
        transition: "opacity 1.2s ease-in-out",
      }} />

      {/* ══ OVERLAY LAYERS ══ */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(0,0,0,0.52)" }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.62) 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", zIndex: 2, background: "linear-gradient(to top, rgba(2,4,14,1) 0%, rgba(2,4,14,0.5) 55%, transparent 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "22%", zIndex: 2, background: "linear-gradient(to bottom, rgba(2,4,14,0.75) 0%, transparent 100%)" }} />
      <div style={{ position: "absolute", top: "16%", left: "50%", transform: "translateX(-50%)", width: 700, height: 350, zIndex: 2, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%)" }} />
      <div className="grain" style={{ position: "absolute", inset: "-50%", zIndex: 3, pointerEvents: "none", width: "200%", height: "200%", opacity: 0.025, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      {/* Floating GrowthOS Logo */}
<div
  style={{
    position: "fixed",
    top: "15%",     // adjust vertically
    left: "10%",    // adjust horizontally
    transform: "translate(-50%, -50%)",
    zIndex: 6,
    pointerEvents: "none",
  }}
>
  <img
    src="/images/GrowthOs.png"
    alt="GrowthOS Logo"
    style={{
      width: 140,
      height: 140,
      borderRadius: "50%",
      objectFit: "cover",
      border: "2px solid rgba(255,255,255,0.15)",
      boxShadow: "0 20px 60px rgba(99,102,241,0.45)",
      opacity: 0.95,
    }}
  />
</div>

      {/* ══ MAIN CONTENT ══ */}
      <div style={{
        position: "relative", zIndex: 10, textAlign: "center",
        maxWidth: 860, padding: "0 24px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Badge */}
        <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.06)", backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 100, padding: "8px 20px", marginBottom: 28,
        }}
        >
        <LiveDot />
        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.13)" }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", letterSpacing: 1 }}>Your Digital Silicon Valley</span>
        </motion.div>
        <div style={{ overflow: "hidden", marginBottom: 4 }}>
        <motion.h1
          initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
          style={{ fontSize: "clamp(44px, 7.5vw, 90px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-2.5px", color: "white", margin: 0, fontFamily: "'Syne', sans-serif" }}
        >
          Welcome to
        </motion.h1>
        </div>

        {/* H1 line 2 — gradient */}
        <div style={{ overflow: "hidden", marginBottom: 28 }}>
        <motion.h1
          initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
          style={{
          fontSize: "clamp(44px, 7.5vw, 90px)", fontWeight: 900, lineHeight: 1.0,
          letterSpacing: "-2.5px", margin: 0, fontFamily: "'Syne', sans-serif",
          background: "linear-gradient(135deg, #818cf8 0%, #ffffff 45%, #38bdf8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}
        >
          GrowthOS
        </motion.h1>
        </div>

        {/* Subtext */}
        <motion.p
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        style={{
          fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.45)",
          maxWidth: 500, lineHeight: 1.75, margin: "0 0 38px",
          fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
        }}
        >
        Where goals become measurable daily action. AI that doesn&apos;t just plan —{" "}
        <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>it executes</span>{" "}
        alongside you.
        </motion.p>

        {/* Buttons */}
        <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.6 }}
        style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 46 }}
        >
        <button className="hero-btn-primary">Enter Execution Mode →</button>
        <button className="hero-btn-ghost">
          <motion.div
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, paddingLeft: 2 }}
          >▶</motion.div>
          Watch Demo
        </button>
        </motion.div>

        {/* Social proof */}
        <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.25, duration: 0.6 }}
        style={{ display: "flex", alignItems: "center", gap: 14 }}
        >
        <div style={{ display: "flex" }}>
          {["#6366f1","#f472b6","#34d399","#fbbf24","#60a5fa"].map((c, i) => (
          <div key={i} style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `linear-gradient(135deg, ${c}99, ${c})`,
            border: "2px solid rgba(2,4,14,0.8)",
            marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: "white", fontWeight: 800,
          }}>
            {["S","J","A","M","R"][i]}
          </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", gap: 1 }}>
          {[1,2,3,4,5].map(i => <span key={i} style={{ color: "#fbbf24", fontSize: 12 }}>★</span>)}
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>
          Trusted by <strong style={{ color: "rgba(255,255,255,0.7)" }}>000+</strong> executors
          </span>
        </div>
        </motion.div>
      </div>

      {/* ══ VIDEO PROGRESS DOTS ══ */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{ position: "absolute", bottom: 50, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: 8, alignItems: "center" }}
      >
        {videos.map((_, i) => (
        <div key={i} onClick={() => jumpTo(i)}
          style={{
          height: 2, width: i === currentIdx ? 44 : 16, borderRadius: 2,
          background: "rgba(255,255,255,0.18)", overflow: "hidden",
          cursor: "pointer", transition: "width 0.35s ease",
          }}
        >
          {i === currentIdx && (
          <div style={{ height: "100%", width: `${progress}%`, background: "white", borderRadius: 2, transition: "width 0.04s linear" }} />
          )}
        </div>
        ))}
      </motion.div>

      {/* ══ MARQUEE STRIP ══ */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 38, zIndex: 15,
        background: "rgba(0,0,0,0.32)", backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        overflow: "hidden", display: "flex", alignItems: "center",
      }}>
        <div className="marquee-track">
        {[...Array(2)].flatMap((_, rep) =>
          ["Goal Execution","Daily Streaks","AI Coaching","Smart Scheduling","Progress Tracking","Habit Building","Deep Focus","Identity Design","System Building","Peak Performance","JEE Prep","UPSC Strategy","Freelance Growth","Dev Productivity"].map((item, i) => (
          <span key={`${rep}-${i}`} style={{
            fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 2.5,
            textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 16, flexShrink: 0,
          }}>
            {item}
            <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 7 }}>◆</span>
          </span>
          ))
        )}
        </div>
      </div>
      </section>
    </>
  );
}  