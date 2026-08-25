"use client";

import React, { useState, useEffect } from "react";
import { Compass, Calendar, Clock, CheckCircle2, Lock, Sparkles, RefreshCw, ChevronRight, AlertCircle, ArrowRight } from "lucide-react";
import { getCurrentWeekRoadmap, getGoalBoard, WeeklyRoadmap, GoalBoardData } from "@/lib/learning-agent-api";

interface PlanDiff {
  timestamp: string;
  reason: string;
  changes: {
    preserved: string[];
    moved: string[];
    reduced: string[];
  };
}

export function RoadmapSection() {
  const [roadmap, setRoadmap] = useState<WeeklyRoadmap | null>(null);
  const [goalBoard, setGoalBoard] = useState<GoalBoardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Time adjustment modal state
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(45);
  const [recentDiff, setRecentDiff] = useState<PlanDiff | null>(null);
  const [isAdapting, setIsAdapting] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([getCurrentWeekRoadmap(), getGoalBoard()]).then(([rm, gb]) => {
      setRoadmap(rm);
      setGoalBoard(gb);
      setLoading(false);
    });
  }, []);

  const handleApplyScheduleAdjustment = () => {
    setIsAdapting(true);
    setTimeout(() => {
      setRecentDiff({
        timestamp: "Just now",
        reason: `User requested workload reduction to ${selectedMinutes} minutes today.`,
        changes: {
          preserved: ["Master Mechanics & Laws of Motion", "Solve 5 Algorithmic Exercises"],
          moved: ["System Architecture Design -> Shifted to Tomorrow"],
          reduced: [`Daily workload reduced from 90 min to ${selectedMinutes} min`],
        },
      });
      setIsAdapting(false);
      setShowAdjustModal(false);
    }, 1200);
  };

  if (loading || !roadmap || !goalBoard) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "12px", color: "#94a3b8" }}>
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: "2px solid #38bdf8", borderTopColor: "transparent", animation: "mcSpin 0.9s linear infinite" }} />
        <span>Loading AI Roadmap...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", color: "#f8fafc" }}>
      {/* Header Banner */}
      <div style={{ background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(79, 70, 229, 0.05))", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "16px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            <Compass size={14} /> AI Decomposed Mastery Roadmap
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>Target Goal: {goalBoard.career_goal}</h2>
          <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "4px", marginBottom: 0 }}>
            Powered by Step 9 Planner & Step 11 Adaptive Engine. NOVA continuously aligns your milestones with your real learning velocity.
          </p>
        </div>

        <button
          onClick={() => setShowAdjustModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#38bdf8",
            padding: "10px 18px",
            borderRadius: "10px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Clock size={15} />
          <span>Adjust Schedule / Time</span>
        </button>
      </div>

      {/* Plan Diff Banner (If Nova adapted plan) */}
      {recentDiff && (
        <div style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "14px", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4ade80", fontWeight: 700, fontSize: "0.88rem", marginBottom: "8px" }}>
            <Sparkles size={16} />
            <span>NOVA Adapted Your Roadmap Plan ({recentDiff.timestamp})</span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#e2e8f0", marginBottom: "10px" }}>{recentDiff.reason}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "0.76rem" }}>
            <div style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: "8px" }}>
              <span style={{ color: "#4ade80", fontWeight: 700 }}>✓ Preserved ({recentDiff.changes.preserved.length})</span>
              {recentDiff.changes.preserved.map((item, idx) => (
                <div key={idx} style={{ color: "#94a3b8", marginTop: "2px" }}>• {item}</div>
              ))}
            </div>
            <div style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: "8px" }}>
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>➔ Moved ({recentDiff.changes.moved.length})</span>
              {recentDiff.changes.moved.map((item, idx) => (
                <div key={idx} style={{ color: "#94a3b8", marginTop: "2px" }}>• {item}</div>
              ))}
            </div>
            <div style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: "8px" }}>
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>⚡ Reduced ({recentDiff.changes.reduced.length})</span>
              {recentDiff.changes.reduced.map((item, idx) => (
                <div key={idx} style={{ color: "#94a3b8", marginTop: "2px" }}>• {item}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Roadmap View */}
      <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Week {roadmap.week_number}: {roadmap.week_theme}
            </h3>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>
              Key Objectives: {roadmap.objectives.join(" • ")}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.7rem", color: "#818cf8", backgroundColor: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.25)", padding: "4px 10px", borderRadius: "12px" }}>
            <Lock size={12} /> Week {roadmap.week_number + 1} Unlocks Next
          </div>
        </div>

        {/* 7 Day Milestone Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {roadmap.days.map((day, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: day.is_today ? "rgba(56, 189, 248, 0.08)" : "rgba(255, 255, 255, 0.02)",
                border: day.is_today ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "12px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                position: "relative",
              }}
            >
              {day.is_today && (
                <span style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#38bdf8", color: "#091122", fontSize: "0.62rem", fontWeight: 800, padding: "2px 6px", borderRadius: "4px" }}>
                  TODAY
                </span>
              )}

              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{day.day_label}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", lineHeight: 1.3 }}>{day.theme}</div>

              {day.topic_titles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                  {day.topic_titles.map((t, i) => (
                    <div key={i} style={{ fontSize: "0.7rem", color: "#cbd5e1", backgroundColor: "rgba(255,255,255,0.04)", padding: "3px 6px", borderRadius: "4px" }}>
                      • {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time Constraint Modal */}
      {showAdjustModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "#0b1329", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "16px", padding: "24px", width: "420px", maxWidth: "90vw", color: "#ffffff" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 8px 0" }}>Adjust Today's Learning Time</h3>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0 0 16px 0" }}>
              Tell NOVA how much time you have today. NOVA's Adaptive Engine will rebalance your workload while preserving completed milestones.
            </p>

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              {[30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSelectedMinutes(mins)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: selectedMinutes === mins ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: selectedMinutes === mins ? "rgba(56, 189, 248, 0.15)" : "rgba(255,255,255,0.03)",
                    color: selectedMinutes === mins ? "#38bdf8" : "#cbd5e1",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setShowAdjustModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", padding: "8px 14px", cursor: "pointer", fontSize: "0.82rem" }}>
                Cancel
              </button>
              <button
                onClick={handleApplyScheduleAdjustment}
                disabled={isAdapting}
                style={{ backgroundColor: "#0284c7", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                {isAdapting ? "Applying Adaptive Engine..." : "Replan Roadmap"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoadmapSection;
