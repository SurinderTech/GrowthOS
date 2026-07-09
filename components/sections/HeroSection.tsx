// src/components/sections/HeroSection.tsx
'use client';

import { AIDashboard } from "../ui/AIDashboard";
import { MARQUEE_ITEMS } from "../constants";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onCTA: () => void;
}

export function HeroSection({ onCTA }: HeroSectionProps) {
  const handleWatchSystem = () => {
    const target = document.getElementById("HowItWorks");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section style={{ 
      minHeight: "100vh", 
      position: "relative", 
      display: "flex", 
      alignItems: "center", 
      padding: "100px 5% 80px",
      zIndex: 2
    }}>
      <div style={{ 
        position: "relative", 
        zIndex: 2, 
        width: "100%", 
        maxWidth: 1280, 
        margin: "0 auto", 
        display: "flex", 
        alignItems: "center", 
        gap: 60,
        flexWrap: "wrap"
      }} className="hero-grid">
        
        {/* LEFT SIDE - Content */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {/* AI Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 10, 
              background: "rgba(99,102,241,0.12)", 
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(99,102,241,0.3)", 
              borderRadius: 100, 
              padding: "8px 20px", 
              marginBottom: 32 
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
              AI Operating System for Growth
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{ 
              fontSize: "clamp(48px, 7vw, 86px)", 
              fontWeight: 900, 
              lineHeight: 1.05, 
              letterSpacing: -2, 
              marginBottom: 24,
              fontFamily: "var(--font-syne), sans-serif"
            }}
          >
            Execution
            <br />
            <span className="text-gradient">Becomes</span>
            <br />
            Inevitable.
          </motion.h1>

          {/* Description */}
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{ 
              fontSize: 18, 
              color: "rgba(255,255,255,0.6)", 
              lineHeight: 1.6, 
              maxWidth: 540, 
              marginBottom: 40, 
              fontWeight: 400 
            }}
          >
            GrowthOS combines AI accountability, deep work systems, habit tracking, 
            and execution analytics into one operating system designed to make progress{" "}
            <span style={{ color: "white", fontWeight: 600 }}>unavoidable.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 48 }}
          >
            <button className="cta-btn" onClick={onCTA}>
              🔥 Start Building Your Future
            </button>
            <button className="cta-btn-ghost" onClick={handleWatchSystem} type="button">
              ▶ Watch The System
            </button>
          </motion.div>

          {/* Social Proof */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}
          >
            <div style={{ display: "flex" }}>
              {["#6366f1","#f472b6","#34d399","#fbbf24","#60a5fa"].map((c, i) => (
                <div key={i} style={{ 
                  width: 40, height: 40, borderRadius: "50%", 
                  background: `linear-gradient(135deg, ${c}, ${c}dd)`, 
                  border: "2px solid #050709", 
                  marginLeft: i === 0 ? 0 : -12, 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  fontSize: 13, fontWeight: 800, color: 'white',
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                }}>
                  {["S","J","A","M","R"][i]}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
                {[1,2,3,4,5].map(i => <span key={i} style={{ color: "#fbbf24", fontSize: 14 }}>★</span>)}
              </div>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                Trusted by <strong style={{ color: "rgba(255,255,255,0.8)" }}>12,400+</strong> executors worldwide
              </span>
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE - Dashboard */}
        <motion.div 
          style={{ flexShrink: 0 }}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <AIDashboard />
        </motion.div>
      </div>

      {/* MARQUEE STRIP - Working with animation */}
      <div style={{ 
        position: "absolute", 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 50, 
        background: "rgba(0,0,0,0.6)", 
        backdropFilter: "blur(12px)", 
        borderTop: "1px solid rgba(255,255,255,0.08)", 
        overflow: "hidden", 
        display: "flex", 
        alignItems: "center", 
        zIndex: 10 
      }}>
        <div style={{ 
          display: "flex", 
          animation: "marquee 25s linear infinite", 
          whiteSpace: "nowrap"
        }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span 
              key={i} 
              style={{ 
                fontSize: 12, 
                color: "rgba(255,255,255,0.4)", 
                letterSpacing: 6, 
                textTransform: "uppercase", 
                marginRight: 50,
                fontWeight: 600,
                fontFamily: "var(--font-dm-sans), sans-serif"
              }}
            >
              {item} 
              <span style={{ color: "rgba(99,102,241,0.6)", marginLeft: 50 }}>✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}