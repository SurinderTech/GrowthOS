"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ListFilter, Mail } from "lucide-react";
import Link from "next/link";

export interface TOCItem {
  id: string;
  title: string;
}

interface LegalSidebarProps {
  items: TOCItem[];
  activeId?: string;
  contactEmailPlaceholder?: string;
}

export function LegalSidebar({ items, contactEmailPlaceholder = "[OFFICIAL CONTACT EMAIL]" }: LegalSidebarProps) {
  const [activeSection, setActiveSection] = useState<string>(items[0]?.id || "");
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (const item of items) {
        const element = document.getElementById(item.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [items]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setMobileOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <>
      <style>{`
        .legal-sidebar-desktop {
          position: sticky;
          top: 100px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          padding-right: 12px;
        }

        .legal-toc-link {
          display: block;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          color: #94a3b8;
          text-decoration: none;
          border-left: 2px solid transparent;
          transition: all 0.2s ease;
          line-height: 1.4;
          cursor: pointer;
        }

        .legal-toc-link:hover {
          color: #f8fafc;
          background: rgba(255,255,255,0.04);
        }

        .legal-toc-link.active {
          color: #38bdf8;
          font-weight: 700;
          background: rgba(56,189,248,0.08);
          border-left-color: #38bdf8;
        }

        .legal-sidebar-mobile {
          display: none;
        }

        @media (max-width: 900px) {
          .legal-sidebar-desktop { display: none; }
          .legal-sidebar-mobile { display: block; margin-bottom: 24px; }
        }
      `}</style>

      {/* MOBILE COMPACT DROPDOWN TOC */}
      <div className="legal-sidebar-mobile">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: "14px",
            color: "#f8fafc",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ListFilter size={16} style={{ color: "#38bdf8" }} />
            <span>Table of Contents ({items.length} Sections)</span>
          </div>
          <ChevronDown
            size={18}
            style={{
              transition: "transform 0.2s ease",
              transform: mobileOpen ? "rotate(180deg)" : "rotate(0deg)"
            }}
          />
        </button>

        {mobileOpen && (
          <div style={{
            marginTop: 8,
            background: "#0b0f17",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            padding: 12,
            maxHeight: 320,
            overflowY: "auto"
          }}>
            {items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  fontSize: 13,
                  color: activeSection === item.id ? "#38bdf8" : "#cbd5e1",
                  fontWeight: activeSection === item.id ? 700 : 400,
                  background: activeSection === item.id ? "rgba(56,189,248,0.1)" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer"
                }}
              >
                {idx + 1}. {item.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DESKTOP STICKY SIDEBAR */}
      <aside className="legal-sidebar-desktop">
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: 2,
          textTransform: "uppercase",
          paddingLeft: 14,
          marginBottom: 4
        }}>
          On This Page
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className={`legal-toc-link ${activeSection === item.id ? "active" : ""}`}
            >
              <span style={{ opacity: 0.5, marginRight: 6 }}>{idx + 1}.</span>
              {item.title}
            </button>
          ))}
        </nav>

        {/* Quick Contact Card inside Sidebar */}
        <div style={{
          marginTop: 20,
          padding: 16,
          background: "linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(15,23,42,0.6) 100%)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            <Mail size={15} style={{ color: "#38bdf8" }} />
            <span>Have Questions?</span>
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 10 }}>
            Submit privacy requests or legal inquiries directly.
          </p>
          <Link
            href="/contact"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#38bdf8",
              textDecoration: "none",
              display: "inline-block"
            }}
          >
            Contact Legal Team →
          </Link>
        </div>
      </aside>
    </>
  );
}
