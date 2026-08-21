"use client";

import { ReactNode } from "react";
import Navbar from "@/components/ui/Navbar";
import { LegalHeader } from "./LegalHeader";
import { LegalSidebar, TOCItem } from "./LegalSidebar";
import { LegalFooter } from "./LegalFooter";

interface LegalLayoutProps {
  badge: string;
  title: string;
  subtitle: string;
  lastUpdated?: string;
  effectiveDate?: string;
  tocItems: TOCItem[];
  children: ReactNode;
}

export function LegalLayout({
  badge,
  title,
  subtitle,
  lastUpdated,
  effectiveDate,
  tocItems,
  children,
}: LegalLayoutProps) {
  return (
    <div style={{ background: "#050709", color: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* Global Top Navbar */}
      <Navbar />

      {/* Hero Header */}
      <LegalHeader
        badge={badge}
        title={title}
        subtitle={subtitle}
        lastUpdated={lastUpdated}
        effectiveDate={effectiveDate}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "40px 5% 80px", maxWidth: 1200, width: "100%", margin: "0 auto" }}>
        
        {/* Developer Review Note (Visible to team / clean banner) */}
        <div style={{
          marginBottom: 32,
          padding: "12px 18px",
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 12,
          fontSize: 12,
          color: "#a5b4fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10
        }}>
          <span>
            📌 <strong>Founder Note:</strong> Placeholders marked as <code>[PLACEHOLDER]</code> must be configured with exact entity details before production deployment.
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            Drafted for GrowthOS Development Stage
          </span>
        </div>

        {/* Two-Column Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 48, alignItems: "start" }}>
          
          {/* Main Document Content */}
          <article style={{ minWidth: 0 }}>
            {children}
          </article>

          {/* Table of Contents Sidebar */}
          <LegalSidebar items={tocItems} />

        </div>
      </main>

      {/* Shared Legal Footer */}
      <LegalFooter />
    </div>
  );
}
