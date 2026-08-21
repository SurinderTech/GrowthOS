"use client";

import Link from "next/link";
import { ShieldCheck, Calendar, ArrowLeft } from "lucide-react";

interface LegalHeaderProps {
  badge: string;
  title: string;
  subtitle: string;
  lastUpdated?: string;
  effectiveDate?: string;
}

export function LegalHeader({
  badge,
  title,
  subtitle,
  lastUpdated = "[LAST UPDATED DATE]",
  effectiveDate = "[EFFECTIVE DATE]",
}: LegalHeaderProps) {
  return (
    <div style={{
      position: "relative",
      padding: "130px 24px 60px",
      background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, rgba(5,7,9,1) 75%)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      overflow: "hidden"
    }}>
      {/* Background glow effects */}
      <div style={{
        position: "absolute",
        top: "-100px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "600px",
        height: "300px",
        background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(99,102,241,0.08) 50%, transparent 80%)",
        filter: "blur(60px)",
        pointerEvents: "none"
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 2 }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#818cf8",
              textDecoration: "none",
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.2)",
              padding: "6px 14px",
              borderRadius: 20,
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
          >
            <ArrowLeft size={14} /> Back to GrowthOS
          </Link>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Legal & Trust</span>
        </div>

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: "0 0 16px" }} className="section-tag">
          <ShieldCheck size={14} style={{ color: "#38bdf8" }} />
          {badge}
        </div>

        {/* Title & Subtitle */}
        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          marginBottom: 16,
        }}>
          {title}
        </h1>

        <p style={{
          fontSize: "clamp(1rem, 2vw, 1.2rem)",
          color: "#94a3b8",
          maxWidth: 720,
          lineHeight: 1.65,
          marginBottom: 28
        }}>
          {subtitle}
        </p>

        {/* Metadata Bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          fontSize: 13,
          color: "rgba(255,255,255,0.5)",
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.06)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} style={{ color: "#818cf8" }} />
            <span>Last Updated: <strong style={{ color: "#e2e8f0" }}>{lastUpdated}</strong></span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
          <div>
            <span>Effective Date: <strong style={{ color: "#e2e8f0" }}>{effectiveDate}</strong></span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
          <div style={{ color: "#38bdf8", fontWeight: 600 }}>
            GrowthOS Platform Stage: Initial Development
          </div>
        </div>

      </div>
    </div>
  );
}
