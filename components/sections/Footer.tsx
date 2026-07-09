// src/components/sections/Footer.tsx
'use client';

import Link from "next/link";

interface FooterProps {
  onCTA: () => void;
}

export function Footer({ onCTA }: FooterProps) {
  const footerColumns = [
    {
      title: "Product",
      links: [
        { label: "How it Works", href: "/#HowItWorks" },
        { label: "Features", href: "/#features" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Account",
      links: [
        { label: "Login", href: "/login" },
        { label: "Sign up", href: "/signup" },
        { label: "Dashboard", href: "/dashboard" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/#about" },
        { label: "Community", href: "/#community" },
        { label: "Home", href: "/" },
      ],
    },
  ];

  return (
    <footer style={{ background: "#080b10", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "60px 5% 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "60px 20px", marginBottom: 60, background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(168,85,247,0.05))", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 24 }}>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,44px)", fontWeight: 900, letterSpacing: -0.5, marginBottom: 12 }}>
            Ready to Execute at a{" "}
            <span style={{ color: "#818cf8" }}>Different Level?</span>
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>Join the movement. Build the infrastructure of your success.</p>
          <button className="cta-btn" onClick={onCTA} style={{ fontSize: 16, padding: "16px 44px" }}>
            Enter Execution Mode →
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 40 }}>
          <div style={{ maxWidth: 240 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, textDecoration: "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
              <span style={{ fontSize: 18, fontWeight: 900, color: "white" }}>Growth<span style={{ color: "#6366f1" }}>OS</span></span>
            </Link>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>Building the Digital Silicon Valley where execution defines intelligence.</p>
          </div>
          {footerColumns.map(({ title, links }) => (
            <div key={title}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 18 }}>{title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {links.map(({ label, href }) => (
                  <Link key={label} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>© 2025 GrowthOS. All rights reserved.</span>
          <div style={{ display: "flex", gap: 16 }}>
            {["X","LinkedIn","GitHub"].map(s => (
              <Link key={s} href="#" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 24, paddingTop: 14 }}>
        <div style={{ display: "flex", animation: "marquee 28s linear infinite", gap: 48, whiteSpace: "nowrap" }}>
          {[...Array(4)].flatMap(() => ["Execution is the new intelligence", "Digital Silicon Valley", "Built for the 1%", "Systems over willpower", "A movement, not just a product"].map((t, i) => (
            <span key={t + i} style={{ fontSize: 9, color: "rgba(255,255,255,0.12)", letterSpacing: 3, textTransform: "uppercase", paddingRight: 48, flexShrink: 0 }}>
              {t} <span style={{ color: "rgba(99,102,241,0.3)" }}>◆</span>
            </span>
          )))}
        </div>
      </div>
    </footer>
  );
}