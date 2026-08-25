"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, CheckCircle2, Clock, Zap, RefreshCw, X, MessageSquare } from "lucide-react";
import { useNovaContext } from "@/context/NovaContext";

export interface ProactiveInsight {
  id: string;
  type: "struggle_signal" | "velocity_boost" | "consistency_streak";
  badgeText: string;
  title: string;
  description: string;
  recommendation: string;
  suggestedActionText: string;
  applied: boolean;
}

const SAMPLE_INSIGHTS: ProactiveInsight[] = [
  {
    id: "insight-1",
    type: "struggle_signal",
    badgeText: "NOVA Adaptive Engine Notice",
    title: "Prerequisite Review Added for Today's Mission",
    description: "NOVA noticed yesterday's Graph Traversal topic took 48 minutes (estimated 25 minutes).",
    recommendation: "I've added a short 15-minute prerequisite review on 'Recursion Call Stacks' before your next practice task to solidify your foundation.",
    suggestedActionText: "Accept & Apply Plan Adjustment",
    applied: false,
  },
];

export function NovaProactiveInsightCard() {
  const { currentArea } = useNovaContext();
  const [insight, setInsight] = useState<ProactiveInsight | null>(SAMPLE_INSIGHTS[0]);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  if (isDismissed || !insight) return null;

  const handleApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      setInsight((prev) => (prev ? { ...prev, applied: true } : null));
      setIsApplying(false);
    }, 800);
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(99, 102, 241, 0.08))",
        border: "1px solid rgba(56, 189, 248, 0.3)",
        borderRadius: "16px",
        padding: "18px 22px",
        marginBottom: "20px",
        position: "relative",
        boxShadow: "0 10px 30px rgba(2, 132, 199, 0.15)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1 }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0284c7, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0,
              boxShadow: "0 0 15px rgba(56, 189, 248, 0.4)",
            }}
          >
            <Sparkles size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "#38bdf8",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                ✦ {insight.badgeText}
              </span>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Proactive Progress Monitoring</span>
            </div>

            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#ffffff", margin: "4px 0 6px 0" }}>
              {insight.title}
            </h3>

            <p style={{ fontSize: "0.83rem", color: "#cbd5e1", lineHeight: 1.45, margin: "0 0 10px 0" }}>
              {insight.description}
            </p>

            <div
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "0.78rem",
                color: "#94a3b8",
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: "#38bdf8" }}>NOVA Insight: </strong> "{insight.recommendation}"
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {insight.applied ? (
            <span style={{ fontSize: "0.78rem", color: "#4ade80", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", backgroundColor: "rgba(34, 197, 94, 0.12)", padding: "8px 14px", borderRadius: "10px", border: "1px solid rgba(34, 197, 94, 0.25)" }}>
              <CheckCircle2 size={16} /> Roadmap Plan Updated
            </span>
          ) : (
            <button
              onClick={handleApply}
              disabled={isApplying}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 16px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(2, 132, 199, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              <RefreshCw size={14} style={{ animation: isApplying ? "mcSpin 0.9s linear infinite" : "none" }} />
              <span>{isApplying ? "Updating Plan..." : insight.suggestedActionText}</span>
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            title="Dismiss Insight"
            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "6px" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NovaProactiveInsightCard;
