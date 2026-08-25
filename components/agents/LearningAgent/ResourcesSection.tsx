"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, PlaySquare, FileText, ExternalLink, Sparkles, Star, Clock, CheckCircle2 } from "lucide-react";
import { getTopicResources, TopicResources } from "@/lib/learning-agent-api";

interface RecommendedResource {
  id: string;
  title: string;
  type: "video" | "article" | "documentation" | "practice";
  source: string;
  url: string;
  duration: string;
  reason: string;
  matchScore: number;
}

const SAMPLE_RESOURCES: RecommendedResource[] = [
  {
    id: "res-1",
    title: "LangGraph Deep Dive & State Machine Architecture Guide",
    type: "video",
    source: "GrowthOS Academy",
    url: "https://youtube.com",
    duration: "22 min",
    reason: "Recommended because it directly matches today's LangGraph graph construction mission and fits your 45-min daily limit.",
    matchScore: 98,
  },
  {
    id: "res-2",
    title: "PostgreSQL pgvector Semantic Search & HNSW Indexing",
    type: "documentation",
    source: "Official PostgreSQL Docs",
    url: "https://docs.growthos.io",
    duration: "15 min",
    reason: "Recommended based on your recent interest in vector store chunking and RAG implementation.",
    matchScore: 94,
  },
  {
    id: "res-3",
    title: "5 Algorithmic Graph Traversal & Recursion Exercises",
    type: "practice",
    source: "Practice Arena",
    url: "/dashboard/practice",
    duration: "30 min",
    reason: "Recommended by Adaptive Engine to reinforce recursion concepts where you spent extra time yesterday.",
    matchScore: 91,
  },
];

export function ResourcesSection() {
  const [resources, setResources] = useState<RecommendedResource[]>(SAMPLE_RESOURCES);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", color: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(56, 189, 248, 0.05))", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "16px", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4ade80", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
          <BookOpen size={14} /> Step 7 Resource Intelligence Engine
        </div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>Recommended Study Material</h2>
        <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "4px", marginBottom: 0 }}>
          Curated specifically for your current target level, active topic, and available daily study time.
        </p>
      </div>

      {/* Recommended Resource List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {resources.map((res) => (
          <div
            key={res.id}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(56, 189, 248, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#38bdf8",
                  }}
                >
                  {res.type === "video" ? <PlaySquare size={18} style={{ color: "#ef4444" }} /> : <FileText size={18} style={{ color: "#38bdf8" }} />}
                </div>
                <div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <span>{res.title}</span>
                    <ExternalLink size={13} style={{ color: "#64748b" }} />
                  </a>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
                    <span>Source: {res.source}</span>
                    <span>• Duration: {res.duration}</span>
                  </div>
                </div>
              </div>

              <span style={{ fontSize: "0.72rem", color: "#4ade80", backgroundColor: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.25)", padding: "3px 8px", borderRadius: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>
                {res.matchScore}% Match
              </span>
            </div>

            {/* Recommendation Reason */}
            <div style={{ backgroundColor: "rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "10px 12px", fontSize: "0.76rem", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={14} style={{ color: "#38bdf8", flexShrink: 0 }} />
              <span>{res.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResourcesSection;
