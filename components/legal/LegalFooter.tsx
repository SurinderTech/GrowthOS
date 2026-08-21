"use client";

import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";

export function LegalFooter() {
  const footerColumns = [
    {
      title: "Product",
      links: [
        { label: "Product Overview", href: "/#HowItWorks" },
        { label: "AI Agents", href: "/#features" },
        { label: "How It Works", href: "/#HowItWorks" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/#documentation" },
        { label: "Help Center", href: "/contact" },
        { label: "Contact Support", href: "/contact" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About GrowthOS", href: "/#about" },
        { label: "Community", href: "/#community" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Legal & Trust",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "AI Disclaimer", href: "/ai-disclaimer" },
        { label: "Contact Privacy Team", href: "/contact" },
      ],
    },
  ];

  return (
    <footer style={{ background: "#050709", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "60px 5% 40px", position: "relative", zIndex: 10 }}>
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        
        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 36, marginBottom: 48 }}>
          
          {/* Brand Info Column */}
          <div style={{ gridColumn: "span 1", maxWidth: 280 }}>
            <Link href="/" style={{ textDecoration: "none", marginBottom: 14, display: "inline-block" }}>
              <BrandLogo size="sm" showSubtitle={true} />
            </Link>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginTop: 8 }}>
              Turn Potential Into Progress. AI-powered learning, execution, and daily growth orchestration system.
            </p>
            <p style={{ fontSize: 11, color: "#818cf8", marginTop: 12, fontWeight: 600 }}>
              &quot;Whatever You Dream, Start Here.&quot;
            </p>
          </div>

          {/* Dynamic Link Columns */}
          {footerColumns.map(({ title, links }) => (
            <div key={title}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 18 }}>
                {title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {links.map(({ label, href }) => (
                  <Link key={label} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.2s ease" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              © 2026 GrowthOS. All rights reserved.
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
              GrowthOS is an execution platform around your existing learning journey.
            </span>
          </div>

          <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
            <Link href="/privacy" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Terms</Link>
            <Link href="/ai-disclaimer" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>AI Disclaimer</Link>
            <Link href="/contact" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Contact</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
