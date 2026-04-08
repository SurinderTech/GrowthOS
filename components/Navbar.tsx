"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain } from "lucide-react";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { label: "How it Works", href: "#HowItWorks",  isAnchor: true  },
  { label: "Features",     href: "#features",    isAnchor: true  },
  { label: "About",        href: "#about",       isAnchor: true  },
  { label: "Community",    href: "#community",   isAnchor: true  },
  { label: "Pricing",      href: "/pricing",     isAnchor: false },
];

/* ── Animated Brain Orb ── */
function BrainOrb() {
  return (
    <>
      <style>{`
        @keyframes spinSlow    { from { transform: rotate(0deg); }   to { transform: rotate(360deg); }  }
        @keyframes spinReverse { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
        @keyframes pulseGlow   { 0%,100% { transform: scale(0.96); opacity: 0.65; } 50% { transform: scale(1.04); opacity: 1; } }
        @keyframes orbFloat    { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        @keyframes outerGlowPulse {
          0%,100% { opacity: 0.55; transform: scale(1);    }
          50%     { opacity: 1;    transform: scale(1.12); }
        }
      `}</style>
      <div style={{
        position: "relative", width: 46, height: 46,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "orbFloat 4s ease-in-out infinite",
        flexShrink: 0,
      }}>
        {/* Far glow bloom — enhanced */}
        <div style={{
          position: "absolute", inset: -18, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(59,130,246,0.22) 45%, transparent 72%)",
          filter: "blur(8px)",
          animation: "outerGlowPulse 2.8s ease-in-out infinite",
        }} />
        {/* Cyan secondary glow */}
        <div style={{
          position: "absolute", inset: -8, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.28) 0%, transparent 68%)",
          filter: "blur(4px)",
          animation: "outerGlowPulse 2.2s ease-in-out infinite reverse",
        }} />
        {/* Indigo soft halo */}
        <div style={{
          position: "absolute", inset: -12, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 65%)",
          filter: "blur(6px)",
        }} />
        {/* Spinning ring 1 */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "1.5px solid transparent",
          borderTopColor: "#818cf8", borderRightColor: "#3b82f6",
          animation: "spinSlow 3s linear infinite",
          filter: "drop-shadow(0 0 6px rgba(129,140,248,0.9))",
        }} />
        {/* Spinning ring 2 */}
        <div style={{
          position: "absolute", inset: "8px", borderRadius: "50%",
          border: "1.5px solid transparent",
          borderBottomColor: "#06b6d4", borderLeftColor: "#8b5cf6",
          animation: "spinReverse 2.2s linear infinite",
          filter: "drop-shadow(0 0 5px rgba(6,182,212,0.85))",
        }} />
        {/* Center orb */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(99,102,241,0.22)",
          border: "1px solid rgba(129,140,248,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "pulseGlow 2.2s ease-in-out infinite",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 18px rgba(99,102,241,0.7), 0 0 36px rgba(99,102,241,0.3), inset 0 0 12px rgba(99,102,241,0.18)",
        }}>
          <Brain size={13} style={{ color: "#a5b4fc", filter: "drop-shadow(0 0 4px rgba(165,180,252,0.9))" }} />
        </div>
      </div>
    </>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const pathname = usePathname();

  /*
   * AUTH CONDITION:
   * Hide Sign in / Sign up on dashboard and any authed route.
   * Replace this with your real auth check (e.g. useSession from next-auth,
   * or a Zustand/Context store that holds the logged-in user).
   *
   * Example with next-auth:
   *   const { data: session } = useSession();
   *   const isAuthed = !!session;
   */
  const isDashboard = pathname?.startsWith("/dashboard");
  // TODO: Replace the line below with your real auth state check.
  // e.g.  const isAuthed = !!session?.user || isDashboard;
  const isAuthed = isDashboard;

  // Glass effect on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Smooth scroll for anchor links
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    setMenuOpen(false);
    const target = document.querySelector(href);
    if (!target) return;
    const navHeight = 72;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
      `}</style>

      {/* ── Main Nav ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center px-[5%] transition-all duration-400 ${
          scrolled
            ? "bg-[#04070f]/60 backdrop-blur-2xl border-b border-white/[0.07] shadow-[0_4px_40px_rgba(0,0,0,0.4)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        {/* ── Logo + Branding (Left) ── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}
        >
          <BrainOrb />
          <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1 }}>
            <span style={{
              fontSize: 18, fontWeight: 800, color: "white",
              letterSpacing: "-0.5px", fontFamily: "'Syne', sans-serif",
              textShadow: "0 0 20px rgba(129,140,248,0.45)",
            }}>
              GrowthOS
            </span>
            <span style={{
              fontSize: 8, color: "rgba(255,255,255,0.3)",
              letterSpacing: 2, textTransform: "uppercase",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Digital Silicon Valley
            </span>
          </div>
        </motion.div>

        {/* ── Nav Links (Centre) ── */}
        <ul className="hidden lg:flex items-center gap-1 mx-auto list-none">
          {NAV_LINKS.map(({ label, href, isAnchor }) => (
            <li key={href}>
              {isAnchor ? (
                <a
                  href={href}
                  onClick={(e) => handleAnchorClick(e, href)}
                  className="text-sm text-[#8892a4] hover:text-white hover:bg-black/20 px-[14px] py-2 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  {label}
                </a>
              ) : (
                <Link
                  href={href}
                  className={`text-sm px-[14px] py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                    label === "Pricing"
                      ? "text-[#00e5ff] hover:text-white hover:bg-[#00e5ff]/10 font-semibold"
                      : "text-[#8892a4] hover:text-white hover:bg-black/20"
                  }`}
                >
                  {label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {/* ── Right Actions (hidden when authed / on dashboard) ── */}
        {!isAuthed && (
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="text-sm font-medium text-[#8892a4] hover:text-white hover:bg-white/[0.06] px-4 py-2 rounded-lg transition-all duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1.5 text-sm font-bold text-[#04070f] bg-[#00e5ff] hover:bg-[#33ecff] px-5 py-2.5 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(0,229,255,0.25)] hover:shadow-[0_0_30px_rgba(0,229,255,0.45)] hover:-translate-y-px"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Sign up
            </Link>
          </div>
        )}

        {/* ── Hamburger ── */}
        <button
          className="lg:hidden ml-auto flex flex-col gap-[5px] p-1.5 bg-none border-none cursor-pointer"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-white rounded transition-transform duration-300 ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
          <span className={`block w-6 h-0.5 bg-white rounded transition-opacity duration-300 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-white rounded transition-transform duration-300 ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
        </button>
      </nav>

      {/* ── Mobile Drawer ── */}
      <div
        className={`lg:hidden fixed top-[72px] left-0 right-0 z-40 bg-[#04070f]/97 backdrop-blur-2xl border-b border-white/[0.07] px-[5%] pb-7 flex flex-col gap-1 transition-all duration-350 ${
          menuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        {NAV_LINKS.map(({ label, href, isAnchor }) => (
          isAnchor ? (
            <a
              key={href}
              href={href}
              onClick={(e) => handleAnchorClick(e, href)}
              className="text-base text-[#8892a4] hover:text-white py-3 border-b border-white/[0.05] transition-colors duration-200 cursor-pointer"
            >
              {label}
            </a>
          ) : (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`text-base py-3 border-b border-white/[0.05] transition-colors duration-200 ${
                label === "Pricing"
                  ? "text-[#00e5ff] font-semibold"
                  : "text-[#8892a4] hover:text-white"
              }`}
            >
              {label}
            </Link>
          )
        ))}

        {/* Mobile: hide login/signup when authed */}
        {!isAuthed && (
          <>
            <Link
              href="/login"
              className="text-base text-[#8892a4] hover:text-white py-3 border-b border-white/[0.05] transition-colors duration-200"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>
            <div className="mt-4">
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 text-sm font-bold text-[#04070f] bg-[#00e5ff] hover:bg-[#33ecff] w-full py-3 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                style={{ fontFamily: "'Syne', sans-serif" }}
                onClick={() => setMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}