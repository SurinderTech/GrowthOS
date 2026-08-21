"use client";

import { ReactNode } from "react";
import { Info, AlertTriangle, ShieldAlert, Cpu } from "lucide-react";

type CalloutType = "info" | "warning" | "important" | "ai";

interface LegalCalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

export function LegalCallout({ type = "info", title, children }: LegalCalloutProps) {
  const styles: Record<CalloutType, { bg: string; border: string; color: string; icon: ReactNode }> = {
    info: {
      bg: "rgba(56, 189, 248, 0.05)",
      border: "rgba(56, 189, 248, 0.25)",
      color: "#38bdf8",
      icon: <Info size={18} style={{ color: "#38bdf8" }} />
    },
    warning: {
      bg: "rgba(245, 158, 11, 0.05)",
      border: "rgba(245, 158, 11, 0.25)",
      color: "#fbbf24",
      icon: <AlertTriangle size={18} style={{ color: "#fbbf24" }} />
    },
    important: {
      bg: "rgba(99, 102, 241, 0.06)",
      border: "rgba(99, 102, 241, 0.3)",
      color: "#818cf8",
      icon: <ShieldAlert size={18} style={{ color: "#818cf8" }} />
    },
    ai: {
      bg: "rgba(168, 85, 247, 0.06)",
      border: "rgba(168, 85, 247, 0.3)",
      color: "#c084fc",
      icon: <Cpu size={18} style={{ color: "#c084fc" }} />
    }
  };

  const style = styles[type];

  return (
    <div style={{
      margin: "20px 0",
      padding: "20px 22px",
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: "14px",
      backdropFilter: "blur(8px)"
    }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontWeight: 700, fontSize: "0.95rem", color: style.color }}>
          {style.icon}
          <span>{title}</span>
        </div>
      )}
      <div style={{ fontSize: "0.92rem", color: "#e2e8f0", lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}
