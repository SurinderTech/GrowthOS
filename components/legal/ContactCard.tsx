"use client";

import { ReactNode } from "react";
import { Mail, ArrowUpRight } from "lucide-react";

interface ContactCardProps {
  title: string;
  description: string;
  emailPlaceholder: string;
  icon?: ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export function ContactCard({
  title,
  description,
  emailPlaceholder,
  icon,
  actionText = "Send Email Request",
  onAction
}: ContactCardProps) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(5,7,9,0.9) 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: 16,
      transition: "all 0.25s ease"
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          {icon || <Mail size={20} style={{ color: "#38bdf8" }} />}
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{title}</h3>
        </div>
        <p style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.6 }}>{description}</p>
      </div>

      <div style={{
        padding: "12px 14px",
        background: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(255,255,255,0.15)",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "0.85rem",
        color: "#cbd5e1"
      }}>
        <span>Target Contact:</span>
        <code style={{ color: "#38bdf8", fontFamily: "monospace", fontWeight: 600 }}>{emailPlaceholder}</code>
      </div>
    </div>
  );
}
