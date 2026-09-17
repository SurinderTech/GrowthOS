"use client";
// components/ui/NovaStickyWidget.tsx
// GrowthOS — Production Floating AI Chatbot Widget (Docked Bottom-Right Side).
// Connected 100% to the live 12-Step NOVA LangGraph Engine, pgvector RAG, and Web Research.

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles, MessageSquare, X, Minimize2, Maximize2, Send, Trash2,
  Bot, User, Zap, BookOpen, BarChart2, RefreshCw, Search, ExternalLink,
  Loader2
} from "lucide-react";
import { sendNovaMessage, NovaChatMessage } from "@/lib/nova-api";
import { useNovaContext } from "@/context/NovaContext";

interface ChatItem extends NovaChatMessage {
  id: string;
  executionStage?: string;
  sources?: Array<{ title?: string; domain?: string; url?: string }>;
}

const INITIAL_GREETINGS: Record<string, string> = {
  dashboard: "Hello! I'm **NOVA**, your GrowthOS intelligence partner.\n\nI monitor your active goal, daily tasks, and overall progress. What would you like to focus on today?",
  learning: "Hello! I'm **NOVA**. I'm connected to your **Learning Workspace**, knowledge notes (RAG), and daily study mission. Ask me to explain a concept, search your notes, or adjust your workload!",
  practice: "Hello! I'm **NOVA**. I see you're in the **Practice Arena**. Need help analyzing a mistake, getting a problem hint, or reviewing core concepts?",
  roadmap: "Hello! I'm **NOVA**. I can adapt your learning roadmap, reorder upcoming milestones, or adjust your daily commitment schedule.",
  progress: "Hello! I'm **NOVA**. I track your execution velocity, task completion consistency, and learning analytics. How can I assist your growth?",
  general: "Hello! I am **NOVA**, your GrowthOS AI partner.\n\nI decompose goals, search web sources, query your indexed notes via `pgvector`, and adapt your learning plan dynamically. What would you like to work on?",
};

const AREA_QUICK_ACTIONS: Record<string, Array<{ label: string; icon: any; prompt: string }>> = {
  dashboard: [
    { label: "What to focus on today?", icon: Zap, prompt: "What should I focus on today based on my goals?" },
    { label: "Check my progress", icon: BarChart2, prompt: "Give me my current progress update and time snapshot" },
    { label: "Find study resources", icon: BookOpen, prompt: "Find top resources for my active target" },
    { label: "Adjust my pace", icon: RefreshCw, prompt: "I only have 30 minutes today, please adjust my plan" },
  ],
  learning: [
    { label: "Explain this topic", icon: BookOpen, prompt: "Explain the current study topic in simple terms with an example" },
    { label: "Search my notes", icon: Zap, prompt: "What do my uploaded knowledge notes say about this topic?" },
    { label: "Find study resources", icon: Search, prompt: "Find top tutorials and docs for my current topic" },
    { label: "I have 30 mins today", icon: RefreshCw, prompt: "I only have 30 minutes today, please adjust my daily study mission" },
  ],
  practice: [
    { label: "Why is this wrong?", icon: Zap, prompt: "Can you explain why my answer is wrong and what concept I missed?" },
    { label: "Give me a hint", icon: BookOpen, prompt: "Give me a subtle hint to solve this problem without revealing the full solution" },
    { label: "Practice concepts", icon: Search, prompt: "What underlying concept should I review for this exercise?" },
  ],
  roadmap: [
    { label: "Replan my roadmap", icon: RefreshCw, prompt: "Adjust my plan schedule and replan my roadmap milestones" },
    { label: "Break down next phase", icon: Zap, prompt: "Break down the next phase of my goal into step-by-step tasks" },
    { label: "Change study hours", icon: BarChart2, prompt: "Change my daily study commitment to 45 minutes per day" },
  ],
  progress: [
    { label: "Why is progress slowing?", icon: BarChart2, prompt: "Why is my progress slowing down and how can I regain momentum?" },
    { label: "Show weekly summary", icon: Zap, prompt: "Give me a summary of my tasks completed and hours spent this week" },
    { label: "Adaptive suggestions", icon: RefreshCw, prompt: "What changes has NOVA made to my plan based on my struggle signals?" },
  ],
  general: [
    { label: "Decompose my goal", icon: Zap, prompt: "Break down my goal step-by-step into a structured roadmap" },
    { label: "Find study resources", icon: BookOpen, prompt: "Find top resources and study guides for my active target" },
    { label: "Check my progress", icon: BarChart2, prompt: "Give me my current progress update and time snapshot" },
    { label: "Web research 2026", icon: Search, prompt: "Search web for latest trends and companies hiring in AI 2026" },
  ],
};

export function NovaStickyWidget() {
  const { currentArea, activeTopic } = useNovaContext();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: "init-1",
      role: "assistant",
      content: INITIAL_GREETINGS[currentArea] || INITIAL_GREETINGS.general,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      executionStage: "ready",
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  const quickActions = AREA_QUICK_ACTIONS[currentArea] || AREA_QUICK_ACTIONS.general;

  // Update initial greeting when area changes if message list is untouched
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "init-1") {
        return [
          {
            id: "init-1",
            role: "assistant",
            content: INITIAL_GREETINGS[currentArea] || INITIAL_GREETINGS.general,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            executionStage: "ready",
          },
        ];
      }
      return prev;
    });
  }, [currentArea]);


  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setIsLoading(true);

    try {
      const historyForApi = messages
        .filter((m) => m.id !== "init-1")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendNovaMessage(text.trim(), historyForApi);

      const sourcesList = res.state?.research_payload?.results || [];

      const assistantMsg: ChatItem = {
        id: `nova-${Date.now()}`,
        role: "assistant",
        content: res.response,
        executionStage: res.execution_stage,
        sources: sourcesList,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) setHasUnread(true);
    } catch (err: any) {
      const errorMsg: ChatItem = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **NOVA Error**: ${err.message || "Failed to reach NOVA backend engine."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([{
      id: `init-${Date.now()}`,
      role: "assistant",
      content: INITIAL_GREETINGS[currentArea] || INITIAL_GREETINGS.general,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
  };

  const formatMessageText = (content: string) => {
    return content.split("\n").map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h3 key={idx} style={{ fontWeight: 700, color: "#67e8f9", fontSize: "0.88rem", margin: "4px 0" }}>{line.replace("### ", "")}</h3>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={idx} style={{ fontWeight: 700, color: "#a5f3fc", fontSize: "0.92rem", margin: "4px 0" }}>{line.replace("## ", "")}</h2>;
      }
      if (line.startsWith("- ")) {
        return (
          <li key={idx} style={{ marginLeft: "12px", color: "#e2e8f0", margin: "2px 0" }}>
            {line.replace("- ", "")}
          </li>
        );
      }
      return (
        <p key={idx} style={{ margin: "2px 0", lineHeight: "1.5" }}>
          {line}
        </p>
      );
    });
  };

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 99999, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ── Trigger Floating Button (Bottom-Right) ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 20px",
            background: "linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)",
            color: "#ffffff",
            borderRadius: "30px",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            boxShadow: "0 10px 30px rgba(2, 132, 199, 0.4), 0 0 15px rgba(56, 189, 248, 0.2)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.88rem",
            transition: "all 0.25s ease",
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Bot size={20} style={{ color: "#7dd3fc" }} />
            {hasUnread && (
              <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "9px", height: "9px", backgroundColor: "#ef4444", borderRadius: "50%", border: "2px solid #091122" }} />
            )}
          </div>
          <span>Ask NOVA</span>
          <span style={{ width: "8px", height: "8px", backgroundColor: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
        </button>
      )}

      {/* ── Open Sticky Chat Window (Right Side Docked) ── */}
      {isOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "rgba(11, 19, 41, 0.96)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "16px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)",
            backdropFilter: "blur(12px)",
            width: isExpanded ? "540px" : "380px",
            height: isExpanded ? "680px" : "520px",
            maxWidth: "92vw",
            maxHeight: "85vh",
            overflow: "hidden",
            color: "#f8fafc",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              backgroundColor: "#070e20",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#38bdf8",
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#ffffff" }}>NOVA Assistant</span>
                  <span style={{ fontSize: "0.68rem", color: "#38bdf8", backgroundColor: "rgba(56, 189, 248, 0.12)", padding: "1px 6px", borderRadius: "10px", textTransform: "capitalize" }}>
                    {currentArea} Context
                  </span>
                </div>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>GrowthOS AI Partner</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={handleClear}
                title="Clear Chat"
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse Window" : "Expand Window"}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Widget"
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0284c7, #4f46e5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    <Sparkles size={14} />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: "85%",
                    borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    padding: "10px 14px",
                    fontSize: "0.83rem",
                    lineHeight: "1.45",
                    backgroundColor: msg.role === "user" ? "#1d4ed8" : "rgba(15, 23, 42, 0.9)",
                    color: "#f8fafc",
                    border: msg.role === "user" ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div>{formatMessageText(msg.content)}</div>

                  {/* Real Web Research Sources Badges */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#38bdf8", fontWeight: 600, marginBottom: "4px" }}>
                        <Search size={11} />
                        <span>Verified Web Sources ({msg.sources.length})</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {msg.sources.map((s, idx) => (
                          <a
                            key={idx}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.7rem",
                              color: "#cbd5e1",
                              backgroundColor: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              textDecoration: "none",
                            }}
                          >
                            <span>{s.title || s.domain}</span>
                            <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px", fontSize: "0.68rem", color: "#64748b" }}>
                    <span>{msg.timestamp}</span>
                    {msg.executionStage && (
                      <span style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "#38bdf8", backgroundColor: "#060d1e", padding: "1px 5px", borderRadius: "4px", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                        {msg.executionStage}
                      </span>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {/* Live Loading Indicator */}
            {isLoading && (
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #0284c7, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                  <Loader2 size={14} style={{ animation: "lsSpin 0.9s linear infinite" }} />
                </div>
                <div style={{ backgroundColor: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", padding: "10px 14px", fontSize: "0.78rem", color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🌐 NOVA is analyzing context, checking pgvector & web research...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompts */}
          {messages.length <= 2 && !isLoading && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", backgroundColor: "#060c1b" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                Quick Actions ({currentArea})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {quickActions.map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSend(act.prompt)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "4px 10px",
                        fontSize: "0.74rem",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        color: "#cbd5e1",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "14px",
                        cursor: "pointer",
                      }}
                    >
                      <Icon size={12} style={{ color: "#38bdf8" }} />
                      <span>{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div style={{ padding: "10px 12px", backgroundColor: "#060c1b", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask NOVA anything (e.g., 'replan my roadmap' or 'explain recursion')..."
              style={{
                flex: 1,
                backgroundColor: "#0d182e",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "0.82rem",
                color: "#ffffff",
                outline: "none",
              }}
              disabled={isLoading}
            />

            <button
              onClick={() => handleSend()}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                backgroundColor: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: !inputMessage.trim() || isLoading ? 0.5 : 1,
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NovaStickyWidget;
