"use client";
import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";

// Spark/particle component
function Sparks({ active }) {
  const sparks = Array.from({ length: 18 }, (_, i) => i);
  return (
    <AnimatePresence>
      {active &&
        sparks.map((i) => {
          const angle = (i / sparks.length) * 360;
          const distance = 60 + Math.random() * 50;
          const rad = (angle * Math.PI) / 180;
          const tx = Math.cos(rad) * distance;
          const ty = Math.sin(rad) * distance;
          const size = 2 + Math.random() * 4;
          const colors = ["#a78bfa", "#60a5fa", "#f472b6", "#34d399", "#fbbf24"];
          const color = colors[i % colors.length];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{ opacity: 0, x: tx, y: ty, scale: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 + Math.random() * 0.4, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: size,
                height: size,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 6px ${color}`,
                pointerEvents: "none",
                zIndex: 50,
              }}
            />
          );
        })}
    </AnimatePresence>
  );
}

// Floating orb for card glow
function CardGlow({ color }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 24,
        background: `radial-gradient(ellipse at 30% 40%, ${color}22 0%, transparent 70%)`,
        pointerEvents: "none",
      }}
    />
  );
}

// Real looping video demo component
const videoData = [
  {
    src: "",
    fallbackSrc: "",
    accent: "#a78bfa",
    label: "Identity Setup",
    description: "Choose goals & define who you're becoming",
    icon: "🎯",
    tag: "",
  },
  {
    src: "/videos/istockphoto-2165951351-640_adpp_is.mp4",
    fallbackSrc: "",
    accent: "#34d399",
    label: "AI System Builder",
    description: "AI creates your personalized execution environment",
    icon: "⚡",
    tag: "",
  },
  {
    src: "/videos/Create_a_cinematic_202602220713_r35kk.mp4",
    fallbackSrc: "",
    accent: "#f472b6",
    label: "Daily Execution",
    description: "Streaks, alerts & momentum tracked automatically",
    icon: "🔥",
    tag: "",
  },
  {
    src: "/videos/istockphoto-2242432142-640_adpp_is.mp4",
    fallbackSrc: "",
    accent: "#60a5fa",
    label: "AI Evolution",
    description: "Workflow adapts & improves over time",
    icon: "∞",
    tag: "",
  },
];


// ─── Identity selector data ───────────────────────────────────────────────────
const identityMap = {
  "🎓 Student": {
    color: "#a78bfa",
    niches: ["JEE Aspirant", "NEET Aspirant", "UPSC Aspirant", "Engineering Student", "MBA Prep", "School Topper"],
  },
  "💼 Professional": {
    color: "#60a5fa",
    niches: ["Corporate Employee", "Sales Executive", "Finance Analyst", "Marketing Manager", "Product Manager", "Team Lead"],
  },
  "🧑‍💻 Freelancer": {
    color: "#34d399",
    niches: ["UI/UX Designer", "Content Writer", "Video Editor", "Social Media Manager", "Copywriter", "Consultant"],
  },
  "⚡ Developer": {
    color: "#f472b6",
    niches: ["Full Stack Dev", "AI/ML Engineer", "Mobile Dev", "DevOps Engineer", "Indie Hacker", "Open Source Builder"],
  },
};

function IdentityCard() {
  const [selected, setSelected] = useState(null);
  const [selectedNiche, setSelectedNiche] = useState(null);
  const accent = selected ? identityMap[selected].color : "#a78bfa";

  // Auto-cycle demo if user hasn't interacted
  const [autoCycle, setAutoCycle] = useState(true);
  const categories = Object.keys(identityMap);
  const [autoIdx, setAutoIdx] = useState(0);

  useEffect(() => {
    if (!autoCycle) return;
    const t = setInterval(() => {
      setAutoIdx((p) => (p + 1) % categories.length);
    }, 2000);
    return () => clearInterval(t);
  }, [autoCycle]);

  const activeCategory = autoCycle ? categories[autoIdx] : selected;
  const activeColor = activeCategory ? identityMap[activeCategory].color : "#a78bfa";
  const activeNiches = activeCategory ? identityMap[activeCategory].niches : [];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 20,
        background: "linear-gradient(160deg, #0d0d1a 0%, #111122 100%)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "14px 14px 10px",
      }}
      onMouseEnter={() => { if (autoCycle) setAutoCycle(false); }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 0%, ${activeColor}18 0%, transparent 65%)`,
        transition: "background 0.5s ease",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: activeColor }} />
          <span style={{ fontSize: 9, color: activeColor, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
            Step 01 · Identity
          </span>
        </div>
        {selectedNiche && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              fontSize: 9, padding: "3px 8px", borderRadius: 100,
              background: `${activeColor}22`, border: `1px solid ${activeColor}55`,
              color: activeColor, fontWeight: 700,
            }}
          >
            ✓ Set
          </motion.div>
        )}
      </div>

      {/* Prompt text */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, fontStyle: "italic" }}>
        {autoCycle ? "Who are you becoming?" : selected ? "Now pick your niche ↓" : "Select your category ↓"}
      </div>

      {/* Category pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const catColor = identityMap[cat].color;
          return (
            <motion.button
              key={cat}
              onClick={() => { setSelected(cat); setSelectedNiche(null); setAutoCycle(false); }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={isActive ? { borderColor: catColor, background: catColor + "22" } : {}}
              style={{
                padding: "5px 10px",
                borderRadius: 100,
                border: `1px solid ${isActive ? catColor : "rgba(255,255,255,0.12)"}`,
                background: isActive ? `${catColor}22` : "rgba(255,255,255,0.04)",
                color: isActive ? catColor : "rgba(255,255,255,0.5)",
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {cat}
            </motion.button>
          );
        })}
      </div>

      {/* Niche list */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", flexDirection: "column", gap: 5 }}
          >
            {activeNiches.map((niche, i) => {
              const isChosen = selectedNiche === niche;
              return (
                <motion.div
                  key={niche}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { if (!autoCycle) { setSelectedNiche(niche); } }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: isChosen ? `${activeColor}22` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isChosen ? activeColor + "55" : "rgba(255,255,255,0.06)"}`,
                    cursor: autoCycle ? "default" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <motion.div
                    animate={isChosen
                      ? { scale: [1, 1.4, 1], background: activeColor }
                      : { scale: 1, background: activeColor + "55" }}
                    transition={{ duration: 0.3 }}
                    style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 11,
                    color: isChosen ? "white" : "rgba(255,255,255,0.6)",
                    fontWeight: isChosen ? 700 : 400,
                    flex: 1,
                  }}>
                    {niche}
                  </span>
                  {isChosen && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ fontSize: 10, color: activeColor }}
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <AnimatePresence>
        {selectedNiche && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 10,
              background: `linear-gradient(135deg, ${activeColor}33, ${activeColor}11)`,
              border: `1px solid ${activeColor}44`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13 }}>🎯</span>
            <div>
              <div style={{ fontSize: 10, color: activeColor, fontWeight: 700, letterSpacing: 1 }}>IDENTITY LOCKED</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{selectedNiche} · Building your system...</div>
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              style={{ marginLeft: "auto", fontSize: 14 }}
            >
              ⚙️
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Video demo for steps 1–3 ─────────────────────────────────────────────────
function VideoDemo({ step }) {
  const videoRef = useRef(null);
  const v = videoData[step];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // Step 0 uses the interactive identity card instead
  if (step === 0) return <IdentityCard />;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 20,
        position: "relative",
        overflow: "hidden",
        background: "#0a0a14",
      }}
    >
      <video
        ref={videoRef}
        src={v.src}
        autoPlay
        loop
        muted
        playsInline
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== v.fallbackSrc) {
            target.src = v.fallbackSrc;
            target.play().catch(() => {});
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          opacity: 0.85,
        }}
      />

      {/* Color tint overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `linear-gradient(180deg, ${v.accent}11 0%, transparent 40%, rgba(0,0,0,0.7) 100%)`,
      }} />

      {/* Top left step tag */}
      <div style={{
        position: "absolute", top: 14, left: 14,
        padding: "4px 10px", borderRadius: 100,
        background: "rgba(0,0,0,0.55)", border: `1px solid ${v.accent}55`,
        fontSize: 9, fontWeight: 800, letterSpacing: 2, color: v.accent,
        backdropFilter: "blur(8px)", textTransform: "uppercase",
      }}>
        {v.tag}
      </div>

      {/* Top right icon */}
      <div style={{
        position: "absolute", top: 12, right: 12,
        width: 32, height: 32, borderRadius: "50%",
        background: `${v.accent}22`, border: `1px solid ${v.accent}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, backdropFilter: "blur(8px)",
      }}>
        {v.icon}
      </div>

      {/* Bottom label */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "28px 16px 16px",
        background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: v.accent }} />
          <span style={{ fontSize: 9, color: v.accent, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
            
          </span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "white", marginBottom: 3 }}>{v.label}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>{v.description}</div>
      </div>
    </div>
  );
}

// Single timeline card
function TimelineCard({ step, index, isLeft, data }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-10% 0px -10% 0px" });
  const [hovered, setHovered] = useState(false);
  const [sparking, setSparking] = useState(false);

  const handleHover = () => {
    setHovered(true);
    setSparking(true);
    setTimeout(() => setSparking(false), 800);
  };

  return (
    <div
      ref={ref}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 80px 1fr",
        alignItems: "center",
        marginBottom: 80,
        position: "relative",
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 0 }}>
        {isLeft ? (
          <CardComponent
            step={index}
            data={data}
            isInView={isInView}
            hovered={hovered}
            sparking={sparking}
            onHover={handleHover}
            onLeave={() => setHovered(false)}
            align="right"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              textAlign: "right",
              paddingRight: 32,
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>
              Step {index + 1}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 8, fontFamily: "'Clash Display', 'Syne', sans-serif" }}>
              {data.title}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 280, marginLeft: "auto" }}>
              {data.desc}
            </div>
          </motion.div>
        )}
      </div>

      {/* Center dot */}
      <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
        <Sparks active={sparking} />
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${data.accent}33 0%, rgba(10,10,20,0.9) 100%)`,
            border: `2px solid ${data.accent}88`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            zIndex: 10,
            position: "relative",
            backdropFilter: "blur(12px)",
            boxShadow: isInView ? `0 0 30px ${data.accent}44, 0 0 60px ${data.accent}22` : "none",
            transition: "box-shadow 0.5s ease",
          }}
        >
          {data.icon}
        </motion.div>
      </div>

      {/* Right side */}
      <div style={{ paddingLeft: 0 }}>
        {!isLeft ? (
          <CardComponent
            step={index}
            data={data}
            isInView={isInView}
            hovered={hovered}
            sparking={sparking}
            onHover={handleHover}
            onLeave={() => setHovered(false)}
            align="left"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ paddingLeft: 32 }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>
              Step {index + 1}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 8, fontFamily: "'Clash Display', 'Syne', sans-serif" }}>
              {data.title}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 280 }}>
              {data.desc}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function CardComponent({ step, data, isInView, hovered, sparking, onHover, onLeave, align }) {
  const justify = align === "right" ? "flex-end" : "flex-start";
  const translateX = align === "right" ? -40 : 40;
  const hoverX = align === "right" ? -8 : 8;
  const paddingStyle = align === "right" ? { paddingRight: 32 } : { paddingLeft: 32 };

  return (
    <motion.div
      initial={{ opacity: 0, x: translateX, y: 20 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: translateX, y: 20 }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
      style={{ display: "flex", justifyContent: justify, ...paddingStyle }}
    >
      <motion.div
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        animate={
          hovered
            ? { y: -12, scale: 1.03, rotateX: align === "right" ? 2 : -2, rotateY: align === "right" ? -3 : 3 }
            : { y: 0, scale: 1, rotateX: 0, rotateY: 0 }
        }
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{
          width: 300,
          height: 340,
          borderRadius: 24,
          position: "relative",
          cursor: "pointer",
          transformStyle: "preserve-3d",
          background: "rgba(10,10,20,0.6)",
          border: `1px solid ${hovered ? data.accent + "66" : "rgba(255,255,255,0.08)"}`,
          boxShadow: hovered
            ? `0 30px 80px ${data.accent}33, 0 0 0 1px ${data.accent}44, inset 0 1px 0 rgba(255,255,255,0.1)`
            : `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
          overflow: "hidden",
          transition: "border-color 0.3s, box-shadow 0.3s",
          backdropFilter: "blur(20px)",
        }}
      >
        <CardGlow color={data.accent} />
        <VideoDemo step={step} />

        {/* Hover shimmer */}
        <motion.div
          animate={hovered ? { opacity: 1, x: "100%" } : { opacity: 0, x: "-100%" }}
          initial={{ x: "-100%", opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
            pointerEvents: "none",
            borderRadius: 24,
          }}
        />

        {/* Corner number */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          {step + 1}
        </div>
      </motion.div>
    </motion.div>
  );
}

const steps = [
  {
    title: "Define Identity",
    desc: "Choose your goals and tell GrowthOS who you are becoming. Set the foundation for everything that follows.",
    icon: "🎯",
    accent: "#a78bfa",
  },
  {
    title: "AI Builds System",
    desc: "GrowthOS creates a personalized execution environment tailored precisely to your goals and working style.",
    icon: "⚡",
    accent: "#34d399",
  },
  {
    title: "Execute Daily",
    desc: "Track progress, streaks, and momentum automatically. Your system runs so you can focus on doing the work.",
    icon: "🔥",
    accent: "#f472b6",
  },
  {
    title: "Continuous Evolution",
    desc: "GrowthOS adapts and improves your workflow over time. The longer you use it, the smarter it gets.",
    icon: "∞",
    accent: "#60a5fa",
  },
];

export default function HowItWorks() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #020408 0%, #06090f 50%, #020408 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Syne', 'DM Sans', sans-serif",
      }}
    >
      {/* Background ambient */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 70%)" }} />
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "100px 40px" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          style={{ textAlign: "center", marginBottom: 100 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{
              display: "inline-block",
              padding: "6px 20px",
              borderRadius: 100,
              background: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.25)",
              fontSize: 11,
              letterSpacing: 3,
              color: "#a78bfa",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            How It Works
          </motion.div>
          <h2 style={{
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 900,
            color: "white",
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: -1,
            fontFamily: "'Syne', sans-serif",
          }}>
            The Execution Engine<br />
            <span style={{
              background: "linear-gradient(90deg, #a78bfa, #60a5fa, #f472b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Behind Your Goals
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.4)", marginTop: 20, maxWidth: 480, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>
            A four-step system designed to turn ambition into automatic, daily momentum.
          </p>
        </motion.div>

        {/* Timeline */}
        <div ref={containerRef} style={{ position: "relative" }}>
          {/* Static track */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 2,
              background: "rgba(255,255,255,0.06)",
              transform: "translateX(-50%)",
              borderRadius: 2,
            }}
          />
          {/* Animated fill */}
          <motion.div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              width: 2,
              height: lineHeight,
              background: "linear-gradient(180deg, #a78bfa, #60a5fa, #f472b6, #34d399)",
              transform: "translateX(-50%)",
              borderRadius: 2,
              boxShadow: "0 0 12px rgba(167,139,250,0.6)",
            }}
          />

          {/* Cards */}
          {steps.map((step, i) => (
            <TimelineCard
              key={i}
              step={step}
              index={i}
              isLeft={i % 2 === 0}
              data={step}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginTop: 60 }}
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 60px rgba(167,139,250,0.4)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "16px 48px",
              borderRadius: 100,
              background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
              border: "none",
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 0.5,
              boxShadow: "0 8px 30px rgba(167,139,250,0.25)",
            }}
          >
            Start Your Execution System →
          </motion.button>
        </motion.div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
