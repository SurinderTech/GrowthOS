"use client";

import { ReactNode } from "react";

interface LegalSectionProps {
  id: string;
  number?: number | string;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, number, title, children }: LegalSectionProps) {
  return (
    <section
      id={id}
      style={{
        scrollMarginTop: 110,
        marginBottom: 48,
        paddingBottom: 36,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <h2 style={{
        fontSize: "clamp(1.25rem, 3vw, 1.65rem)",
        fontWeight: 800,
        color: "#ffffff",
        letterSpacing: "-0.02em",
        marginBottom: 20,
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        lineHeight: 1.3
      }}>
        {number && (
          <span style={{
            fontSize: "0.85em",
            color: "#818cf8",
            fontWeight: 700,
            fontFamily: "monospace"
          }}>
            {number}.
          </span>
        )}
        <span>{title}</span>
      </h2>

      <div style={{
        color: "#cbd5e1",
        fontSize: "0.98rem",
        lineHeight: 1.75,
        display: "flex",
        flexDirection: "column",
        gap: 16
      }}>
        {children}
      </div>
    </section>
  );
}
