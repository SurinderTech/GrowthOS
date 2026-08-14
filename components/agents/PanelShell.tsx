"use client";

import { X } from "lucide-react";
import React from "react";

export function PanelShell({
  icon,
  title,
  sub,
  accent,
  onClose,
  children,
}: {
  icon: string | React.ReactNode;
  title: string;
  sub: string;
  accent: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={ps.overlay} onClick={onClose}>
      <style>{`
        @media (max-width: 640px) {
          .ps-panel {
            width: 96vw !important;
            max-height: 92vh !important;
            border-radius: 16px !important;
          }
          .ps-header {
            padding: 14px 16px !important;
          }
          .ps-content {
            padding: 14px 16px !important;
          }
        }
      `}</style>
      <div className="ps-panel" style={{ ...ps.panel, border: `1px solid ${accent}40`, boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 30px ${accent}15` }} onClick={e => e.stopPropagation()}>
        <div className="ps-header" style={ps.header}>
          <div style={ps.headerLeft}>
            <span style={{ fontSize: "1.6rem", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
            <div>
              <div style={{ ...ps.title, color: accent }}>{title}</div>
              <div style={ps.sub}>{sub}</div>
            </div>
          </div>
          <button style={ps.closeBtn} onClick={onClose} aria-label="Close panel">
            <X size={16} />
          </button>
        </div>
        <div className="ps-content" style={ps.content}>{children}</div>
      </div>
    </div>
  );
}

const ps: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,18,0.8)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
    animation: "panelFadeIn 0.3s ease-out",
  },
  panel: {
    position: "relative",
    background: "rgba(8,14,32,0.98)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "20px",
    width: "min(640px,95vw)",
    maxHeight: "86vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    animation: "panelZoomIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 22px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  title: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.15rem", fontWeight: 700 },
  sub: { fontSize: "0.75rem", color: "#64748b", marginTop: "2px" },
  closeBtn: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#64748b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  content: { flex: 1, overflowY: "auto", padding: "18px 22px" },
};

export const sharedStyles = {
  textarea: {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    color: "#e2e8f0",
    fontFamily: "inherit",
    fontSize: "0.83rem",
    resize: "vertical" as const,
    outline: "none",
    lineHeight: 1.6,
  },
  input: {
    padding: "9px 12px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "9px",
    color: "#e2e8f0",
    fontFamily: "inherit",
    fontSize: "0.83rem",
    outline: "none",
  },
  primaryBtn: (accent: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 16px",
    background: `${accent}22`,
    border: `1px solid ${accent}55`,
    borderRadius: "9px",
    color: accent,
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
  }),
  emptyState: {
    padding: "16px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px",
    fontSize: "0.8rem",
    color: "#475569",
    textAlign: "center" as const,
  },
};
