"use client";

import React from "react";
import Link from "next/link";
import {
  Target,
  Zap,
  TrendingUp,
  Sparkles,
  Compass,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Gamepad2,
  BatteryLow,
  BookOpen,
  HelpCircle,
  Linkedin,
  Twitter,
  Github,
  ArrowRight,
  Send,
  Flame,
  Globe2,
  Heart,
  Bot
} from "lucide-react";

export default function AboutPage() {
  return (
    <>
      {/* Import Caveat font for handwritten annotations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        .handwritten {
          font-family: 'Caveat', cursive;
        }
        
        .font-syne {
          font-family: 'Syne', sans-serif;
        }

        .about-card-shadow {
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .about-card-shadow:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px -4px rgba(0, 0, 0, 0.12);
        }
      `}</style>

      <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: "#111827", background: "#ffffff", overflowX: "hidden" }}>
        
        {/* ========================================================================= */}
        {/* SECTION 1: HERO (DARK CINEMATIC MOUNTAIN SUNRISE) */}
        {/* ========================================================================= */}
        <section style={{
          position: "relative",
          minHeight: "88vh",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#030712",
          color: "#ffffff",
          overflow: "hidden",
          padding: "80px 24px 70px"
        }}>
          {/* Hero Background Image */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/about-hero-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center right",
            opacity: 0.72,
            zIndex: 0
          }} />
          
          {/* Gradient Overlay for Text Readability */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, #030712 0%, rgba(3,7,18,0.85) 45%, rgba(3,7,18,0.2) 100%)",
            zIndex: 1
          }} />
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(3,7,18,0.4) 0%, transparent 60%, #030712 100%)",
            zIndex: 1
          }} />

          {/* Hero Content */}
          <div style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "1240px",
            margin: "0 auto",
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "center"
          }}>
            {/* Left Column */}
            <div style={{ maxWidth: "620px" }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 16px",
                borderRadius: "9999px",
                background: "rgba(34, 211, 238, 0.12)",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                color: "#38bdf8",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "20px"
              }}>
                <Sparkles style={{ width: 14, height: 14 }} />
                <span>ABOUT GROWTHOS</span>
              </div>

              <h1 className="font-syne" style={{
                fontSize: "clamp(2.5rem, 5vw, 4.2rem)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                margin: "0 0 20px",
                color: "#ffffff"
              }}>
                For every dream{" "}
                <br />
                that{" "}
                <span style={{
                  background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>
                  refuses to fade.
                </span>
              </h1>

              <p style={{
                fontSize: "1.12rem",
                lineHeight: 1.7,
                color: "rgba(255, 255, 255, 0.8)",
                margin: "0 0 32px"
              }}>
                GrowthOS exists for the students, dreamers and doers who know what they want — and are ready to build a life around it.
              </p>

              {/* Honest Cohort Avatar Stack (No fake user counts) */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ display: "flex", marginLeft: "4px" }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #38bdf8)",
                    border: "2px solid #030712",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#ffffff",
                    marginLeft: "-6px"
                  }}>SK</div>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #a855f7, #ec4899)",
                    border: "2px solid #030712",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#ffffff",
                    marginLeft: "-10px"
                  }}>AI</div>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #10b981, #06b6d4)",
                    border: "2px solid #030712",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    color: "#ffffff",
                    marginLeft: "-10px"
                  }}>⚡</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ffffff" }}>Open Beta Early Access</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.55)" }}>Join the learners shaping their future with GrowthOS</div>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Pills */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "14px" }}>
              <div style={{ textAlign: "right", marginRight: "12px", marginBottom: "8px" }}>
                <span className="handwritten" style={{ fontSize: "1.85rem", color: "#67e8f9", fontWeight: 700, display: "block", transform: "rotate(-3deg)" }}>
                  Same Students. Bigger Futures. ⤴
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "270px" }}>
                {[
                  { icon: Target, label: "More Focus", color: "#38bdf8" },
                  { icon: Zap, label: "More Consistency", color: "#fbbf24" },
                  { icon: TrendingUp, label: "Real Progress", color: "#34d399" },
                  { icon: Sparkles, label: "A Better You", color: "#c084fc" },
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 18px",
                    borderRadius: "16px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(12px)"
                  }}>
                    <item.icon style={{ width: 18, height: 18, color: item.color }} />
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#ffffff" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: THE REALITY (CLEAN HIGH-CONTRAST LIGHT SECTION) */}
        {/* ========================================================================= */}
        <section style={{ padding: "90px 24px", maxWidth: "1240px", margin: "0 auto", background: "#ffffff" }}>
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 54px" }}>
            <span style={{
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: "9999px",
              background: "#fee2e2",
              color: "#dc2626",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "14px"
            }}>THE REALITY</span>
            <h2 className="font-syne" style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 16px", color: "#0f172a" }}>
              It&apos;s not a lack of talent.{" "}
              <br />
              It&apos;s the <span style={{ color: "#6366f1" }}>environment.</span>
            </h2>
            <p style={{ fontSize: "1.05rem", color: "#64748b", lineHeight: 1.65, margin: 0 }}>
              You have goals. You have resources. You even know what to do. But distractions, lack of structure, and no accountability make it easy to fall off track.
            </p>
          </div>

          {/* Reality Visual Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "28px",
            alignItems: "center"
          }}>
            {/* Left 3 Pain Points */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { icon: Clock, text: "I'll start tomorrow.", tag: "Procrastination" },
                { icon: Gamepad2, text: "I get distracted too easily.", tag: "Distractions" },
                { icon: BatteryLow, text: "I lose motivation after a few days.", tag: "Inconsistency" },
              ].map((p, idx) => (
                <div key={idx} className="about-card-shadow" style={{
                  padding: "18px 20px",
                  borderRadius: "16px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px"
                }}>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "#fee2e2", color: "#ef4444" }}>
                    <p.icon style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{p.tag}</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>&ldquo;{p.text}&rdquo;</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Center Student Image with Fixed Aspect Ratio & Containment */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                position: "relative",
                width: "100%",
                maxWidth: "380px",
                height: "380px",
                borderRadius: "24px",
                overflow: "hidden",
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
                border: "1px solid #e2e8f0"
              }}>
                <img
                  src="/student-studying.jpg"
                  alt="Student facing distractions while studying late"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>

            {/* Right 3 Pain Points */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { icon: BookOpen, text: "So many resources, I'm confused.", tag: "Overwhelm" },
                { icon: HelpCircle, text: "I knew what to do, but I don't do it.", tag: "Lack of System" },
                { icon: Users, text: "I don't have accountability.", tag: "Isolation" },
              ].map((p, idx) => (
                <div key={idx} className="about-card-shadow" style={{
                  padding: "18px 20px",
                  borderRadius: "16px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px"
                }}>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "#fef3c7", color: "#d97706" }}>
                    <p.icon style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{p.tag}</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>&ldquo;{p.text}&rdquo;</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: OUR BELIEF (CINEMATIC MOUNTAIN PATH BANNER) */}
        {/* ========================================================================= */}
        <section style={{
          position: "relative",
          padding: "90px 24px",
          background: "#030712",
          color: "#ffffff",
          overflow: "hidden"
        }}>
          {/* Mountain Path Background */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/mountain-path-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.45,
            zIndex: 0
          }} />
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, #030712 0%, rgba(3,7,18,0.85) 50%, rgba(3,7,18,0.7) 100%)",
            zIndex: 1
          }} />

          <div style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "1240px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "center"
          }}>
            <div>
              <span style={{
                display: "inline-block",
                padding: "4px 14px",
                borderRadius: "9999px",
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "16px"
              }}>OUR BELIEF</span>
              
              <h2 className="font-syne" style={{ fontSize: "clamp(2rem, 3.8vw, 3.2rem)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 20px", color: "#ffffff" }}>
                Your future is built on{" "}
                <span style={{ color: "#38bdf8" }}>ordinary days.</span>
              </h2>

              <p style={{ fontSize: "1.08rem", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.7, maxWidth: "540px" }}>
                Big goals aren&apos;t achieved in one day. They are built through a better environment, a clear system, and consistent action — every day.
              </p>
            </div>

            {/* 5 Stacked Pillars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "480px" }}>
              {[
                { title: "Right Environment", sub: "Less distractions", icon: ShieldCheck, color: "#34d399" },
                { title: "Clear System", sub: "Know what to do", icon: Compass, color: "#38bdf8" },
                { title: "Daily Motivation", sub: "Keep going", icon: Flame, color: "#fbbf24" },
                { title: "Accountability", sub: "Don't fall off", icon: Users, color: "#818cf8" },
                { title: "Real Progress", sub: "See results", icon: TrendingUp, color: "#c084fc" },
              ].map((item, idx) => (
                <div key={idx} style={{
                  padding: "14px 18px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(12px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.08)", color: item.color }}>
                      <item.icon style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#ffffff" }}>{item.title}</div>
                      <div style={{ fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.55)" }}>{item.sub}</div>
                    </div>
                  </div>
                  <CheckCircle2 style={{ width: 18, height: 18, color: item.color, opacity: 0.8 }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: OUR MISSION */}
        {/* ========================================================================= */}
        <section style={{ padding: "90px 24px", maxWidth: "1240px", margin: "0 auto", background: "#ffffff" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "center"
          }}>
            <div>
              <span style={{
                display: "inline-block",
                padding: "4px 14px",
                borderRadius: "9999px",
                background: "#e0e7ff",
                color: "#4f46e5",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "16px"
              }}>OUR MISSION</span>

              <h2 className="font-syne" style={{ fontSize: "clamp(2rem, 3.8vw, 3.2rem)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 20px", color: "#0f172a" }}>
                Turn ambition into a{" "}
                <span style={{ color: "#6366f1" }}>lifestyle.</span>
              </h2>

              <p style={{ fontSize: "1.08rem", color: "#64748b", lineHeight: 1.7, maxWidth: "520px" }}>
                We&apos;re building a personal growth operating system that combines AI, community and accountability to help students and learners turn their goals into consistent daily action.
              </p>
            </div>

            {/* Orbit / Hub Node Grid */}
            <div style={{ position: "relative" }}>
              <div style={{ textAlign: "right", marginBottom: "12px", marginRight: "16px" }}>
                <span className="handwritten" style={{ fontSize: "1.65rem", color: "#6366f1", fontWeight: 700, display: "block", transform: "rotate(-2deg)" }}>
                  A system that grows with you ⤴
                </span>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                padding: "24px",
                borderRadius: "24px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0"
              }}>
                <div className="about-card-shadow" style={{ padding: "18px", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <Bot style={{ width: 22, height: 22, color: "#38bdf8", marginBottom: "8px" }} />
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>AI Roadmaps</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>Personalized plans</div>
                </div>

                <div className="about-card-shadow" style={{ padding: "18px", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <Zap style={{ width: 22, height: 22, color: "#fbbf24", marginBottom: "8px" }} />
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>Daily Execution</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>Know what to do today</div>
                </div>

                <div className="about-card-shadow" style={{ padding: "18px", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <ShieldCheck style={{ width: 22, height: 22, color: "#818cf8", marginBottom: "8px" }} />
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>Accountability</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>Stay consistent</div>
                </div>

                <div className="about-card-shadow" style={{ padding: "18px", borderRadius: "16px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <Users style={{ width: 22, height: 22, color: "#c084fc", marginBottom: "8px" }} />
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>Community</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>Grow together</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: OUR VISION */}
        {/* ========================================================================= */}
        <section style={{ padding: "90px 24px", maxWidth: "1240px", margin: "0 auto", background: "#ffffff", borderTop: "1px solid #f1f5f9" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "center"
          }}>
            <div>
              <span style={{
                display: "inline-block",
                padding: "4px 14px",
                borderRadius: "9999px",
                background: "#e0f2fe",
                color: "#0284c7",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "16px"
              }}>OUR VISION</span>

              <h2 className="font-syne" style={{ fontSize: "clamp(2rem, 3.8vw, 3.2rem)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 20px", color: "#0f172a" }}>
                A generation that{" "}
                <span style={{ color: "#0284c7" }}>builds</span>,{" "}
                not just hopes.
              </h2>

              <p style={{ fontSize: "1.08rem", color: "#64748b", lineHeight: 1.7, maxWidth: "520px" }}>
                We believe everyone — no matter where they come from — should have the right environment, guidance and support to achieve their dreams. From cracking competitive exams to building a career, starting a company or simply becoming a better version of themselves.
              </p>
            </div>

            {/* Global Reach Card */}
            <div>
              <div style={{ textAlign: "right", marginBottom: "12px", marginRight: "16px" }}>
                <span className="handwritten" style={{ fontSize: "1.65rem", color: "#0284c7", fontWeight: 700, display: "block", transform: "rotate(-2deg)" }}>
                  Different Backgrounds. Same Ambitions. ⤴
                </span>
              </div>

              <div className="about-card-shadow" style={{
                padding: "36px 28px",
                borderRadius: "24px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                textAlign: "center"
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: "16px",
                  background: "#e0f2fe",
                  color: "#0284c7",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px"
                }}>
                  <Globe2 style={{ width: 28, height: 28 }} />
                </div>
                <h3 className="font-syne" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
                  From small towns to global opportunities.
                </h3>
                <p style={{ fontSize: "0.88rem", color: "#64748b", maxWidth: "420px", margin: "0 auto" }}>
                  Democratizing elite guidance, AI accountability, and relentless peer momentum for every dreamer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6: MEET THE FOUNDERS (DITO MATCH WITH AI MOUNTAIN PORTRAITS!) */}
        {/* ========================================================================= */}
        <section style={{ padding: "90px 24px", maxWidth: "1240px", margin: "0 auto", background: "#ffffff", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 54px" }}>
            <span style={{
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: "9999px",
              background: "#e0e7ff",
              color: "#4f46e5",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "14px"
            }}>MEET THE FOUNDERS</span>

            <h2 className="font-syne" style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 16px", color: "#0f172a" }}>
              Built by dreamers, for dreamers.
            </h2>

            <p style={{ fontSize: "1.05rem", color: "#64748b", lineHeight: 1.65, margin: 0 }}>
              We&apos;re a team of learners who have experienced the same struggles — distractions, inconsistent routines, and the challenge of staying motivated. GrowthOS is our solution to a problem we lived, and it&apos;s a system we wish we had.
            </p>
          </div>

          {/* TWO FOUNDER CARDS SIDE BY SIDE */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "32px",
            maxWidth: "960px",
            margin: "0 auto"
          }}>
            {/* FOUNDER CARD (Surinder Kumar with AI Mountain Sunrise Portrait) */}
            <div className="about-card-shadow" style={{
              borderRadius: "20px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                {/* Full Visible Photo - Surinder Kumar Original Photo */}
                <div style={{
                  position: "relative",
                  width: "100%",
                  height: "320px",
                  overflow: "hidden",
                  backgroundColor: "#060d1a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {/* Subtle blurred ambient backdrop from original photo */}
                  <img
                    src="/founder.jpg"
                    alt=""
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "blur(24px) brightness(0.45)",
                      transform: "scale(1.15)"
                    }}
                  />
                  {/* Complete 100% uncropped original photo */}
                  <img
                    src="/founder.jpg"
                    alt="Surinder Kumar - Founder & CEO"
                    style={{
                      position: "relative",
                      zIndex: 1,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: "center"
                    }}
                  />
                </div>

                <div style={{ padding: "24px 24px 0" }}>
                  <h3 className="font-syne" style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                    Surinder Kumar
                  </h3>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "12px" }}>
                    Founder &amp; CEO
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                    B.Tech CSE student, builder and believer in execution. I started GrowthOS to solve the problems I faced for years — knowing what to do, but not being consistent.
                  </p>
                </div>
              </div>

              {/* Social Links */}
              <div style={{
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderTop: "1px solid #f1f5f9",
                marginTop: "20px"
              }}>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ color: "#64748b", transition: "color 0.2s" }} aria-label="LinkedIn">
                  <Linkedin style={{ width: 18, height: 18 }} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ color: "#64748b", transition: "color 0.2s" }} aria-label="Twitter">
                  <Twitter style={{ width: 18, height: 18 }} />
                </a>
                <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: "#64748b", transition: "color 0.2s" }} aria-label="GitHub">
                  <Github style={{ width: 18, height: 18 }} />
                </a>
              </div>
            </div>

            {/* CO-FOUNDER CARD (Looking for Co-Founder with Mountain Silhouette & '?' DP) */}
            <div className="about-card-shadow" style={{
              borderRadius: "20px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                {/* 16:9 Banner Image - Mountain Silhouette with glowing '?' overlay */}
                <div style={{
                  position: "relative",
                  width: "100%",
                  height: "320px",
                  overflow: "hidden",
                  backgroundColor: "#0f172a"
                }}>
                  <img
                    src="/cofounder-banner.jpg"
                    alt="Co-Founder silhouette on mountain"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                  />
                  {/* Glowing Question Mark Badge */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(3, 7, 18, 0.35)"
                  }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "2px solid rgba(56, 189, 248, 0.6)",
                      backdropFilter: "blur(8px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 24px rgba(56, 189, 248, 0.4)"
                    }}>
                      <span className="font-syne" style={{ fontSize: "1.8rem", fontWeight: 900, color: "#38bdf8" }}>?</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "24px 24px 0" }}>
                  <h3 className="font-syne" style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                    Co-Founder
                  </h3>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "12px" }}>
                    Co-Founder &amp; Builder (Open Role)
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                    Looking for a better co-founder who aligns with this product and is really interested in building the future of learning and execution.
                  </p>
                </div>
              </div>

              {/* Action Button: Connect with Surinder */}
              <div style={{
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                borderTop: "1px solid #f1f5f9",
                marginTop: "20px"
              }}>
                <Link
                  href="/contact"
                  style={{
                    width: "100%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    transition: "background 0.2s"
                  }}
                >
                  <Send style={{ width: 14, height: 14 }} />
                  <span>Connect with Surinder</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 7: OUR VALUES */}
        {/* ========================================================================= */}
        <section style={{ padding: "90px 24px", maxWidth: "1240px", margin: "0 auto", background: "#ffffff", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 54px" }}>
            <span style={{
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: "9999px",
              background: "#fae8ff",
              color: "#a855f7",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "14px"
            }}>OUR VALUES</span>

            <h2 className="font-syne" style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 16px", color: "#0f172a" }}>
              What drives us every day.
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "24px"
          }}>
            {[
              {
                title: "Execution beats intention",
                desc: "Ideas mean nothing without action.",
                icon: Zap,
                color: "#eab308",
                bg: "#fef9c3"
              },
              {
                title: "Students first",
                desc: "We build for the real needs of learners.",
                icon: Users,
                color: "#6366f1",
                bg: "#e0e7ff"
              },
              {
                title: "Long-term impact",
                desc: "We care about where you'll be 5, 10, 20 years from now.",
                icon: Compass,
                color: "#06b6d4",
                bg: "#cffafe"
              },
              {
                title: "A global community",
                desc: "We grow stronger together.",
                icon: Heart,
                color: "#ec4899",
                bg: "#fce7f3"
              },
            ].map((v, idx) => (
              <div key={idx} className="about-card-shadow" style={{
                padding: "24px",
                borderRadius: "20px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "14px",
                  background: v.bg,
                  color: v.color,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px"
                }}>
                  <v.icon style={{ width: 22, height: 22 }} />
                </div>
                <h3 className="font-syne" style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
                  {v.title}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 8: FINAL CTA (DARK IMMERSIVE BANNER) */}
        {/* ========================================================================= */}
        <section style={{
          position: "relative",
          padding: "100px 24px",
          background: "#030712",
          color: "#ffffff",
          textAlign: "center",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/mountain-path-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.25,
            zIndex: 0
          }} />
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, #030712 0%, rgba(3,7,18,0.85) 50%, #030712 100%)",
            zIndex: 1
          }} />

          <div style={{ position: "relative", zIndex: 2, maxWidth: "780px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "0 10px" }}>
              <span className="handwritten" style={{ fontSize: "1.45rem", color: "#38bdf8", transform: "rotate(-4deg)" }}>
                A better you. A brighter future.
              </span>
              <span className="handwritten" style={{ fontSize: "1.45rem", color: "#c084fc", transform: "rotate(4deg)" }}>
                Same Dreams. Bigger Together.
              </span>
            </div>

            <h2 className="font-syne" style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.6rem)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 16px", color: "#ffffff" }}>
              Let&apos;s build your tomorrow, today.
            </h2>

            <p style={{ fontSize: "1.05rem", color: "rgba(255, 255, 255, 0.7)", maxWidth: "560px", margin: "0 auto 36px", lineHeight: 1.65 }}>
              Join students and learners who are choosing a better environment, a clearer system and a more focused future.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
              <Link
                href="/signup"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 32px",
                  borderRadius: "14px",
                  background: "#4f46e5",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  textDecoration: "none",
                  boxShadow: "0 0 24px rgba(79, 70, 229, 0.5)"
                }}
              >
                <span>Get Started</span>
                <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
              <Link
                href="/features"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "14px 28px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER NAVIGATION */}
        <div style={{
          padding: "24px",
          textAlign: "center",
          fontSize: "0.82rem",
          color: "#94a3b8",
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "center",
          gap: "18px"
        }}>
          <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>← Back to Home</Link>
          <span>•</span>
          <Link href="/features" style={{ color: "#64748b", textDecoration: "none" }}>Features</Link>
          <span>•</span>
          <Link href="/pricing" style={{ color: "#64748b", textDecoration: "none" }}>Pricing</Link>
          <span>•</span>
          <Link href="/contact" style={{ color: "#64748b", textDecoration: "none" }}>Contact</Link>
        </div>
      </div>
    </>
  );
}
