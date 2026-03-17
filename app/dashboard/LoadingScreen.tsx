"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles } from "lucide-react";

type LoadingScreenProps = {
  onDone: () => void;
};

export default function LoadingScreen({ onDone }: LoadingScreenProps) {
  const messages = useMemo(
    () => [
      "Analyzing your goals...",
      "Designing your growth roadmap...",
      "Preparing your AI growth system...",
    ],
    []
  );

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 900);

    console.log("LoadingScreen mounted. Will call onDone in 3s.");
    const doneTimer = setTimeout(() => {
      console.log("LoadingScreen timer done. Calling onDone.");
      onDone();
    }, 3000);

    return () => {
      console.log("LoadingScreen unmounting. Clearing timers.");
      clearInterval(msgTimer);
      clearTimeout(doneTimer);
    };
  }, [messages.length, onDone]);

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.grid} />

      <div style={s.card}>
        <div style={s.orbWrap}>
          <div style={s.orbRing1} />
          <div style={s.orbRing2} />
          <div style={s.orbCenter}>
            <Brain size={34} style={{ color: "#818cf8" }} />
          </div>
        </div>

        <div style={s.badge}>
          <Sparkles size={12} style={{ color: "#818cf8" }} />
          <span>GrowthOS AI is building your command center</span>
        </div>

        <h1 style={s.title}>Your AI Growth System is Loading</h1>

        <p style={s.message}>{messages[messageIndex]}</p>

        <div style={s.progressTrack}>
          <div style={s.progressFill} />
        </div>

        <div style={s.steps}>
          {messages.map((msg, i) => (
            <div
              key={msg}
              style={{
                ...s.stepDot,
                ...(i <= messageIndex ? s.stepDotActive : {}),
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spinReverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(0.96); opacity: 0.65; }
          50% { transform: scale(1.04); opacity: 1; }
        }

        @keyframes progressMove {
          from { width: 0%; }
          to { width: 100%; }
        }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    background: "#020818",
  },
  bg: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(135deg,#020818 0%,#060f22 50%,#02091a 100%)",
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px)",
    backgroundSize: "44px 44px",
  },
  card: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "520px",
    padding: "34px 28px",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 20px 80px rgba(0,0,0,0.35)",
    textAlign: "center",
  },
  orbWrap: {
    position: "relative",
    width: "96px",
    height: "96px",
    margin: "0 auto 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  orbRing1: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "2px solid transparent",
    borderTopColor: "#6366f1",
    borderRightColor: "#3b82f6",
    animation: "spinSlow 3s linear infinite",
  },
  orbRing2: {
    position: "absolute",
    inset: "14px",
    borderRadius: "50%",
    border: "2px solid transparent",
    borderBottomColor: "#06b6d4",
    animation: "spinReverse 2.2s linear infinite",
  },
  orbCenter: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "pulseGlow 2.2s ease-in-out infinite",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.22)",
    borderRadius: "999px",
    padding: "6px 12px",
    color: "#a5b4fc",
    fontSize: "0.74rem",
    fontWeight: 600,
    marginBottom: "16px",
  },
  title: {
    margin: "0 0 12px",
    color: "white",
    fontFamily: "'Rajdhani','Segoe UI',sans-serif",
    fontSize: "2rem",
    fontWeight: 700,
    lineHeight: 1.1,
  },
  message: {
    margin: "0 0 18px",
    color: "#94a3b8",
    fontSize: "0.92rem",
    minHeight: "22px",
    animation: "fadeSlide .35s ease",
  },
  progressTrack: {
    width: "100%",
    height: "6px",
    background: "rgba(255,255,255,0.07)",
    borderRadius: "999px",
    overflow: "hidden",
    marginBottom: "14px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg,#6366f1,#3b82f6,#06b6d4)",
    animation: "progressMove 3s linear forwards",
  },
  steps: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
  },
  stepDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.18)",
    transition: "all .25s ease",
  },
  stepDotActive: {
    background: "#818cf8",
    boxShadow: "0 0 12px rgba(129,140,248,0.55)",
  },
};
