"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Send,
  Trash2,
  Bot,
  User,
  Zap,
  BookOpen,
  BarChart2,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { sendNovaMessage, NovaChatMessage } from "@/lib/nova-api";

interface ChatItem extends NovaChatMessage {
  id: string;
  executionStage?: string;
}

const INITIAL_GREETING: ChatItem = {
  id: "init-1",
  role: "assistant",
  content:
    "Hello! I am **NOVA**, the intelligent operating layer of GrowthOS.\n\nI can decompose your goals into structured roadmaps, retrieve your study notes via `pgvector`, discover personalized learning resources, track your progress, and adapt your plan in real-time. How can I help you today?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  executionStage: "ready",
};

const QUICK_ACTIONS = [
  { label: "Decompose my goal", icon: Zap, prompt: "Break down my goal step-by-step into a structured roadmap" },
  { label: "Find study resources", icon: BookOpen, prompt: "Find top resources and study guides for my active target" },
  { label: "Check my progress", icon: BarChart2, prompt: "Give me my current progress update and time snapshot" },
  { label: "Replan my roadmap", icon: RefreshCw, prompt: "I need to adjust my plan schedule and replan my roadmap" },
  { label: "Web research 2026", icon: Search, prompt: "Search web for latest trends and companies hiring in AI 2026" },
];

export function NovaStickyWidget() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [messages, setMessages] = useState<ChatItem[]>([INITIAL_GREETING]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(false);

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
      // Build history for backend API
      const historyForApi = messages
        .filter((m) => m.id !== "init-1")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendNovaMessage(text.trim(), historyForApi);

      const assistantMsg: ChatItem = {
        id: `nova-${Date.now()}`,
        role: "assistant",
        content: res.response,
        executionStage: res.execution_stage,
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
    setMessages([INITIAL_GREETING]);
  };

  const formatMessageText = (content: string) => {
    // Basic Markdown formatting helper
    return content.split("\n").map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-cyan-400 font-semibold mt-2 mb-1 text-sm">{line.replace("### ", "")}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-cyan-300 font-bold mt-3 mb-1 text-base">{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-white font-bold mt-3 mb-1 text-lg">{line.replace("# ", "")}</h2>;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-200 my-0.5 text-xs sm:text-sm">
            {renderInlineMarkdown(line.substring(2))}
          </li>
        );
      }
      if (line.match(/^\d+\.\s/)) {
        return (
          <li key={idx} className="ml-4 list-decimal text-slate-200 my-0.5 text-xs sm:text-sm">
            {renderInlineMarkdown(line.replace(/^\d+\.\s/, ""))}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-slate-200 my-1 text-xs sm:text-sm leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text: string) => {
    // Bold formatting
    const parts = text.split(/(\*\*.*?\*\*|\`.*?\`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-cyan-200 font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={i} className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans antialiased">
      {/* ── CLOSED STATE: Sticky Floating Launcher Button ────────────────────── */}
      {!isOpen && (
        <div className="relative group">
          {/* Subtle Ambient Pulse Ring */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse" />

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open NOVA AI Assistant"
            className="relative flex items-center justify-center gap-2.5 px-4 py-3 bg-slate-950 text-white rounded-full shadow-2xl border border-cyan-500/40 hover:border-cyan-400 hover:scale-105 transition-all duration-300"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600">
              <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
              {/* Green online dot */}
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full" />
            </div>

            <div className="flex flex-col text-left pr-1 hidden sm:flex">
              <span className="text-xs font-bold tracking-wider text-cyan-300 uppercase">NOVA AI</span>
              <span className="text-[10px] text-slate-400 font-medium">GrowthOS Assistant</span>
            </div>

            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── OPEN STATE: Floating Chat Window ─────────────────────────────────── */}
      {isOpen && (
        <div
          className={`flex flex-col bg-[#070b14]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
            isExpanded
              ? "w-[92vw] h-[85vh] max-w-4xl max-h-[850px] sm:w-[750px]"
              : "w-[92vw] sm:w-[420px] h-[580px] max-h-[80vh]"
          }`}
        >
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-md">
                <Bot className="w-5 h-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">NOVA Intelligence</h3>
                  <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    v2.0 Adaptive
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">pgvector RAG • Planning Engine • Web Fallback</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Clear Chat History"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse Window" : "Expand Window"}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Widget"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Messages Container ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-md ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none"
                      : "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none"
                  }`}
                >
                  <div className="break-words">{formatMessageText(msg.content)}</div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/50 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {msg.executionStage && (
                      <span className="font-mono text-cyan-400/80 bg-slate-950 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        {msg.executionStage}
                      </span>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* ── Typing Loading Indicator ─────────────────────────────────── */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl px-4 py-3 text-xs text-slate-300 flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">NOVA reasoning & retrieving...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick Action Chips (when message count is small) ─────────────── */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60">
              <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
                Quick Action Prompts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSend(act.prompt)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-cyan-950/70 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 rounded-full transition"
                    >
                      <Icon className="w-3 h-3 text-cyan-400" />
                      <span>{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Input Bar ───────────────────────────────────────────────────── */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
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
              placeholder="Ask NOVA anything (e.g., 'replan my roadmap' or 'find DBMS resources')..."
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
              disabled={isLoading}
            />

            <button
              onClick={() => handleSend()}
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-md transition flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
