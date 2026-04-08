"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const videos = [
  "/videos/video1.mp4",
  "/videos/video2.mp4",
  "/videos/video3.mp4",
  "/videos/video4.mp4",
  "/videos/video5.mp4",
];

const DURATION = 5000;

/* ── Pulsing Live Dot ── */
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
    </div>
  );
}

/* ── Floating stat card ── */
function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
      style={{
        background: "rgba(8,8,22,0.62)",
        backdropFilter: "blur(28px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18,
        padding: "14px 22px",
        display: "flex", flexDirection: "column", gap: 3,
        minWidth: 110,
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 800, color: "white", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.5px" }}>{value}</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
    </motion.div>
  );
}

/* ── Main Hero ── */
export default function Hero() {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeSlot, setActiveSlot] = useState<"a" | "b">("a");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSlotRef = useRef<"a" | "b">("a");
  const currentIdxRef = useRef(0);

  /* Scroll parallax */
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.6], [0.52, 0.82]);

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

    nextVideo.play().catch(() => {});
    setActiveSlot(nextSlot);
    setCurrentIdx(nextIdx);
    activeSlotRef.current = nextSlot;
    currentIdxRef.current = nextIdx;

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

        .cta-primary {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%);
          border: none; color: white; padding: 18px 42px;
          border-radius: 16px; font-size: 15px; font-weight: 700;
          cursor: pointer; letter-spacing: 0.2px;
          font-family: 'Syne', sans-serif;
          transition: transform 0.2s, box-shadow 0.25s;
          box-shadow: 0 0 0 0 rgba(99,102,241,0);
          white-space: nowrap;
        }
        .cta-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent 60%);
          opacity: 0; transition: opacity 0.25s;
        }
        .cta-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 60px rgba(99,102,241,0.55), 0 0 0 1px rgba(129,140,248,0.4);
        }
        .cta-primary:hover::before { opacity: 1; }
        .cta-primary:active { transform: translateY(-1px); }

        /* Shimmer sweep on CTA */
        .cta-primary::after {
          content: '';
          position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transform: skewX(-20deg);
          animation: shimmerBtn 3.5s infinite;
        }
        @keyframes shimmerBtn {
          0% { left: -100%; }
          60%, 100% { left: 160%; }
        }

        @keyframes grain {
          0%,100%{transform:translate(0,0)} 10%{transform:translate(-2%,-3%)}
          20%{transform:translate(3%,2%)} 30%{transform:translate(-1%,4%)}
          40%{transform:translate(4%,-1%)} 50%{transform:translate(-3%,3%)}
          60%{transform:translate(2%,-4%)} 70%{transform:translate(-4%,1%)}
          80%{transform:translate(1%,-2%)} 90%{transform:translate(-2%,4%)}
        }
        .grain { animation: grain 0.5s steps(1) infinite; }

        .marquee-track {
          display: flex; gap: 40px;
          animation: marquee 24s linear infinite;
          white-space: nowrap;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        /* Scroll cue bob */
        @keyframes scrollBob {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(6px); opacity: 0.9; }
        }
      `}</style>

      <section
        ref={sectionRef}
        className="hero-wrap"
        style={{
          position: "relative", height: "100vh", minHeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", fontFamily: "'Syne', sans-serif",
        }}
      >
        {/* ══ VIDEO SLOTS with scroll-driven scale ══ */}
        <motion.div style={{ position: "absolute", inset: 0, zIndex: 0, scale: videoScale }}>
          <video ref={videoARef} autoPlay muted playsInline loop style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            opacity: activeSlot === "a" ? 1 : 0,
            transition: "opacity 1.2s ease-in-out",
          }} />
          <video ref={videoBRef} muted playsInline loop style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            opacity: activeSlot === "b" ? 1 : 0,
            transition: "opacity 1.2s ease-in-out",
          }} />
        </motion.div>

        {/* ══ OVERLAY STACK ══ */}
        <motion.div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(0,0,0,1)", opacity: overlayOpacity }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 30%, rgba(0,0,0,0.7) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", zIndex: 2, background: "linear-gradient(to top, rgba(2,4,14,1) 0%, rgba(2,4,14,0.6) 50%, transparent 100%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "25%", zIndex: 2, background: "linear-gradient(to bottom, rgba(2,4,14,0.85) 0%, transparent 100%)" }} />

        {/* Indigo glow bloom */}
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 900, height: 500, zIndex: 2, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 65%)" }} />

        {/* Film grain */}
        <div className="grain" style={{ position: "absolute", inset: "-50%", zIndex: 3, pointerEvents: "none", width: "200%", height: "200%", opacity: 0.022, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        {/* ══ MAIN CONTENT ══ */}
        <motion.div
          style={{
            position: "relative", zIndex: 10, textAlign: "center",
            maxWidth: 820, padding: "0 24px",
            display: "flex", flexDirection: "column", alignItems: "center",
            y: contentY,
          }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "rgba(99,102,241,0.1)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(99,102,241,0.22)",
              borderRadius: 100, padding: "8px 22px", marginBottom: 32,
            }}
          >
            <LiveDot />
            <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.12)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>Your Digital Silicon Valley</span>
          </motion.div>

          {/* H1 line 1 */}
          <div style={{ overflow: "hidden", marginBottom: 2 }}>
            <motion.h1
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55, duration: 1, ease: [0.23, 1, 0.32, 1] }}
              style={{ fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-3px", color: "rgba(255,255,255,0.92)", margin: 0, fontFamily: "'Syne', sans-serif" }}
            >
              Build. Execute.
            </motion.h1>
          </div>

          {/* H1 line 2 — gradient */}
          <div style={{ overflow: "hidden", marginBottom: 30 }}>
            <motion.h1
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 1, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 900, lineHeight: 1.0,
                letterSpacing: "-3px", margin: 0, fontFamily: "'Syne', sans-serif",
                background: "linear-gradient(135deg, #818cf8 0%, #c4b5fd 35%, #ffffff 55%, #38bdf8 85%, #06b6d4 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              Dominate.
            </motion.h1>
          </div>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.92, duration: 0.7 }}
            style={{
              fontSize: "clamp(15px, 2vw, 19px)", color: "rgba(255,255,255,0.42)",
              maxWidth: 520, lineHeight: 1.8, margin: "0 0 12px",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
            }}
          >
            Where goals become measurable daily action. The AI that doesn&apos;t just plan —{" "}
            <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 500 }}>it executes alongside you</span>, every single day.
          </motion.p>

          {/* Category pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.6 }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 36 }}
          >
            {["JEE Prep", "UPSC Strategy", "Dev Productivity", "Freelance Growth", "Peak Performance"].map((tag, i) => (
              <span key={i} style={{
                fontSize: 10, color: "rgba(255,255,255,0.32)", letterSpacing: 1.5,
                textTransform: "uppercase", padding: "5px 12px",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100,
                fontFamily: "'DM Sans', sans-serif",
                background: "rgba(255,255,255,0.03)",
              }}>{tag}</span>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.12, duration: 0.6 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 44 }}
          >
            <button className="cta-primary">
              Start Your Growth System →
            </button>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
              No fluff · Just execution
            </span>
          </motion.div>

          {/* Social proof avatars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            <div style={{ display: "flex" }}>
              {["#6366f1","#f472b6","#34d399","#fbbf24","#60a5fa"].map((c, i) => (
                <div key={i} style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${c}88, ${c})`,
                  border: "2px solid rgba(2,4,14,0.85)",
                  marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "white", fontWeight: 800,
                }}>
                  {["S","J","A","M","R"][i]}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[1,2,3,4,5].map(i => <span key={i} style={{ color: "#fbbf24", fontSize: 11 }}>★</span>)}
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
                Trusted by <strong style={{ color: "rgba(255,255,255,0.65)" }}>++</strong> executors worldwide
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* ══ SCROLL CUE ══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.8 }}
          style={{
            position: "absolute", bottom: 62, left: "50%", transform: "translateX(-50%)",
            zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}
        >
          {/* Video progress dots */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            {videos.map((_, i) => (
              <div key={i} onClick={() => jumpTo(i)}
                style={{
                  height: 2, width: i === currentIdx ? 44 : 16, borderRadius: 2,
                  background: "rgba(255,255,255,0.15)", overflow: "hidden",
                  cursor: "pointer", transition: "width 0.35s ease",
                }}
              >
                {i === currentIdx && (
                  <div style={{ height: "100%", width: `${progress}%`, background: "rgba(255,255,255,0.9)", borderRadius: 2, transition: "width 0.04s linear" }} />
                )}
              </div>
            ))}
          </div>

          {/* Scroll arrow */}
          <div style={{ animation: "scrollBob 2s ease-in-out infinite" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </div>
        </motion.div>

        {/* ══ MARQUEE STRIP ══ */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 36, zIndex: 15,
          background: "rgba(0,0,0,0.28)", backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          overflow: "hidden", display: "flex", alignItems: "center",
        }}>
          <div className="marquee-track">
            {[...Array(2)].flatMap((_, rep) =>
              ["Goal Execution","Daily Streaks","AI Coaching","Smart Scheduling","Progress Tracking","Habit Building","Deep Focus","Identity Design","System Building","Peak Performance","JEE Prep","UPSC Strategy","Freelance Growth","Dev Productivity"].map((item, i) => (
                <span key={`${rep}-${i}`} style={{
                  fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: 3,
                  textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 18, flexShrink: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {item}
                  <span style={{ color: "rgba(255,255,255,0.07)", fontSize: 6 }}>◆</span>
                </span>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}