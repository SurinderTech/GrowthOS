"use client";

import Link from "next/link";
import { useState } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────

const NAV = [
  {
    heading: "Product",
    items: [
      { label: "How it Works", href: "#" },
      { label: "Execution Dashboard", href: "#" },
      { label: "AI Planner", href: "#", badge: "New" },
      { label: "Streak System", href: "#" },
      { label: "Leaderboards", href: "#" },
    ],
  },
  {
    heading: "Platform",
    items: [
      { label: "Students", href: "#" },
      { label: "Freelancers", href: "#" },
      { label: "Exam Aspirants", href: "#" },
      { label: "Developers", href: "#" },
      { label: "Communities", href: "#" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About", href: "#" },
      { label: "Vision", href: "#" },
      { label: "Community", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
];

const LEGAL = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Security", href: "#" },
  { label: "Cookie Policy", href: "#" },
];

const MARQUEE_ITEMS = [
  "Execution is the new intelligence",
  "Digital Silicon Valley",
  "Built for the 1%",
  "Systems over willpower",
  "A movement, not just a product",
];

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconX = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L2.25 2.25h6.988l4.26 5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const IconGitHub = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <>
      {/* Inline styles for animations not expressible in Tailwind */}
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 24s linear infinite;
          white-space: nowrap;
          gap: 0;
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        .pulse-dot { animation: pulseDot 2s ease-in-out infinite; }
      `}</style>

      <footer style={{ background: "#080b10", fontFamily: "inherit" }}>

        {/* ── CTA Band ── */}
        <div
          className="relative overflow-hidden border-t border-white/[0.07]"
          style={{ background: "linear-gradient(135deg,#0f0c2a 0%,#0a0d1a 50%,#0c1020 100%)" }}
        >
          {/* Glow blob */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 80% at 75% 50%, rgba(123,94,248,0.22), transparent 70%)" }}
          />

          <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            {/* Text */}
            <div>
              <h2 className="text-3xl md:text-[42px] font-extrabold leading-tight" style={{ color: "#eef1f7", letterSpacing: "-0.01em" }}>
                Build the infrastructure<br />
                of your{" "}
                <span style={{ color: "#7b5ef8" }}>success.</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed max-w-md" style={{ color: "#5a6478" }}>
                ExecutionAI is where ambition meets systems. Get early access and start executing at a different level.
              </p>
            </div>

            {/* Form */}
            {!submitted ? (
              <form
                onSubmit={(e) => { e.preventDefault(); if (email) setSubmitted(true); }}
                className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-shrink-0"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="rounded-xl px-5 py-3.5 text-sm outline-none w-full sm:w-60 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#eef1f7",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#7b5ef8")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
                />
                <button
                  type="submit"
                  className="rounded-xl px-6 py-3.5 text-sm font-bold whitespace-nowrap transition-all duration-150 hover:opacity-85 active:scale-[0.98] cursor-pointer"
                  style={{ background: "#7b5ef8", color: "#fff", letterSpacing: "0.02em" }}
                >
                  Enter Execution Mode →
                </button>
              </form>
            ) : (
              <div
                className="flex items-center gap-3 rounded-xl px-6 py-4"
                style={{ background: "rgba(123,94,248,0.1)", border: "1px solid rgba(123,94,248,0.3)" }}
              >
                <span style={{ color: "#7b5ef8" }}>⚡</span>
                <p className="text-sm" style={{ color: "#eef1f7" }}>
                  You&apos;re on the list. We&apos;ll be in touch.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Main Body ── */}
        <div className="border-t border-white/[0.07]">
          <div className="max-w-7xl mx-auto px-6 md:px-12 pt-16">

            {/* Top: brand + nav */}
            <div className="flex flex-col lg:flex-row gap-14 pb-14 border-b border-white/[0.07]">

              {/* Brand */}
              <div className="max-w-xs flex-shrink-0">
                {/* Logo */}
                <div className="flex items-center gap-2.5 mb-5">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg"
                    style={{ background: "linear-gradient(135deg,#7b5ef8,#4c2fa0)" }}
                  >
                    ⚡
                  </div>
                  <span className="text-lg font-bold" style={{ color: "#eef1f7" }}>
                    Execution<span style={{ color: "#7b5ef8" }}>AI</span>
                  </span>
                </div>

                <p className="text-sm leading-relaxed mb-6" style={{ color: "#c8d0de" }}>
                  Building the Digital Silicon Valley where execution defines intelligence. The platform where driven people build the infrastructure of their success.
                </p>

                {/* Badge */}
                <div
                  className="inline-flex items-center gap-2 text-[10px] font-bold uppercase rounded-full px-3.5 py-1.5"
                  style={{
                    letterSpacing: "0.1em",
                    color: "#7b5ef8",
                    border: "1px solid rgba(123,94,248,0.3)",
                    background: "rgba(123,94,248,0.08)",
                  }}
                >
                  <span
                    className="pulse-dot w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "#7b5ef8" }}
                  />
                  A movement, not just a product
                </div>
              </div>

              {/* Nav columns */}
              <div className="flex-1 flex justify-start lg:justify-end">
                <div className="flex flex-wrap gap-12 md:gap-16">
                  {NAV.map((col) => (
                    <div key={col.heading}>
                      <h4
                        className="text-[10px] font-bold uppercase mb-5"
                        style={{ letterSpacing: "0.14em", color: "#5a6478" }}
                      >
                        {col.heading}
                      </h4>
                      <ul className="flex flex-col gap-3">
                        {col.items.map((item) => (
                          <li key={item.label}>
                            <Link
                              href={item.href}
                              className="flex items-center gap-2 text-sm transition-colors duration-150"
                              style={{ color: "#c8d0de" }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#eef1f7")}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#c8d0de")}
                            >
                              {item.label}
                              {item.badge && (
                                <span
                                  className="text-[10px] font-bold rounded px-1.5 py-0.5 leading-none"
                                  style={{ background: "#7b5ef8", color: "#fff", letterSpacing: "0.04em" }}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 py-6">
              {/* Left: copyright + legal */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 flex-wrap">
                <span className="text-xs" style={{ color: "#5a6478" }}>
                  © 2025 ExecutionAI. All rights reserved.
                </span>
                <nav className="flex flex-wrap gap-5">
                  {LEGAL.map((l) => (
                    <Link
                      key={l.label}
                      href={l.href}
                      className="text-xs transition-colors duration-150 hover:text-[#c8d0de]"
                      style={{ color: "#5a6478" }}
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Socials */}
              <div className="flex gap-2">
                {[
                  { label: "X", icon: <IconX /> },
                  { label: "LinkedIn", icon: <IconLinkedIn /> },
                  { label: "GitHub", icon: <IconGitHub /> },
                ].map((s) => (
                  <a
                    key={s.label}
                    href="#"
                    aria-label={s.label}
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-200 group"
                    style={{ border: "1px solid rgba(255,255,255,0.07)", color: "#c8d0de" }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "#7b5ef8";
                      el.style.background = "rgba(123,94,248,0.1)";
                      el.style.color = "#eef1f7";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "rgba(255,255,255,0.07)";
                      el.style.background = "transparent";
                      el.style.color = "#c8d0de";
                    }}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ── Marquee strip ── */}
          <div className="overflow-hidden border-t border-white/[0.07]">
            <div className="marquee-track py-3.5">
              {doubled.map((text, i) => (
                <span key={i} className="inline-flex items-center" style={{ paddingRight: "56px" }}>
                  <span
                    className="text-[10px] font-bold uppercase"
                    style={{ letterSpacing: "0.18em", color: "#5a6478" }}
                  >
                    {text}
                  </span>
                  <span className="ml-[56px]" style={{ color: "#7b5ef8", fontSize: "10px" }}>◆</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}