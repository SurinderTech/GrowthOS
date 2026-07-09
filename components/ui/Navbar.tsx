"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain } from "lucide-react";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { label: "How it Works", href: "#HowItWorks", isAnchor: true },
  { label: "Features", href: "#features", isAnchor: true },
  { label: "About", href: "#about", isAnchor: true },
  { label: "Community", href: "#community", isAnchor: true },
  { label: "Pricing", href: "/pricing", isAnchor: false },
];

function BrainOrb() {
  return (
    <div className="gos-orb" aria-hidden="true">
      <div className="gos-orb__glow gos-orb__glow--outer" />
      <div className="gos-orb__glow gos-orb__glow--inner" />
      <div className="gos-orb__ring gos-orb__ring--outer" />
      <div className="gos-orb__ring gos-orb__ring--middle" />
      <div className="gos-orb__ring gos-orb__ring--inner" />
      <div className="gos-orb__core">
        <Brain size={18} />
      </div>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");
  const isAuthed = isDashboard;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const getHref = (href: string) => {
    if (!href.startsWith("#")) {
      return href;
    }

    return pathname === "/" ? href : `/${href}`;
  };

  const closeMenu = () => setMenuOpen(false);

  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (pathname !== "/") {
      closeMenu();
      return;
    }

    e.preventDefault();
    closeMenu();

    const target = document.getElementById(href.slice(1));
    if (!target) return;

    const navHeight = 92;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        .gos-nav {
          position: fixed;
          top: 16px;
          left: 16px;
          right: 16px;
          z-index: 50;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px 0 16px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(5, 7, 9, 0.58);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 16px 50px rgba(0, 0, 0, 0.28);
          transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .gos-nav--scrolled {
          background: rgba(5, 7, 9, 0.82);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.42);
        }

        .gos-nav__brand {
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          min-width: 0;
          color: white;
        }

        .gos-nav__brandText {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .gos-nav__title {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-size: 1.1rem;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 900;
          white-space: nowrap;
        }

        .gos-nav__title span {
          color: #00e5ff;
        }

        .gos-nav__subtitle {
          font-size: 0.64rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.42);
          white-space: nowrap;
        }

        .gos-nav__links {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 22px;
          flex: 1;
          justify-content: center;
        }

        .gos-nav__link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.62);
          text-decoration: none;
          font-size: 0.92rem;
          line-height: 1;
          transition: background 160ms ease, color 160ms ease, transform 160ms ease;
        }

        .gos-nav__link:hover {
          color: white;
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-1px);
        }

        .gos-nav__link--pricing {
          color: #00e5ff;
        }

        .gos-nav__actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .gos-nav__login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
          font-size: 0.92rem;
          transition: background 160ms ease, color 160ms ease;
        }

        .gos-nav__login:hover {
          color: white;
          background: rgba(255, 255, 255, 0.06);
        }

        .gos-nav__signup {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 18px;
          border-radius: 999px;
          border: 0;
          background: linear-gradient(135deg, #00e5ff, #7c3aed);
          color: #04101a;
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-weight: 800;
          font-size: 0.92rem;
          text-decoration: none;
          box-shadow: 0 12px 28px rgba(0, 229, 255, 0.18);
          transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
        }

        .gos-nav__signup:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 32px rgba(0, 229, 255, 0.26);
          filter: brightness(1.02);
        }

        .gos-nav__menuButton {
          display: none;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
        }

        .gos-nav__menuIcon {
          width: 18px;
          height: 12px;
          position: relative;
        }

        .gos-nav__menuIcon span {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          border-radius: 999px;
          background: currentColor;
          transition: transform 160ms ease, opacity 160ms ease, top 160ms ease;
        }

        .gos-nav__menuIcon span:nth-child(1) { top: 0; }
        .gos-nav__menuIcon span:nth-child(2) { top: 5px; }
        .gos-nav__menuIcon span:nth-child(3) { top: 10px; }

        .gos-nav__menuButton--open .gos-nav__menuIcon span:nth-child(1) {
          top: 5px;
          transform: rotate(45deg);
        }

        .gos-nav__menuButton--open .gos-nav__menuIcon span:nth-child(2) {
          opacity: 0;
        }

        .gos-nav__menuButton--open .gos-nav__menuIcon span:nth-child(3) {
          top: 5px;
          transform: rotate(-45deg);
        }

        .gos-nav__drawer {
          display: none;
        }

        .gos-nav__drawerPanel {
          position: fixed;
          top: 106px;
          left: 16px;
          right: 16px;
          z-index: 49;
          padding: 16px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(5, 7, 9, 0.96);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.42);
          display: flex;
          flex-direction: column;
          gap: 8px;
          transform: translateY(-8px);
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .gos-nav__drawerPanel--open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .gos-nav__drawerLink {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 12px;
          border-radius: 16px;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.02);
        }

        .gos-nav__drawerLink--pricing {
          color: #00e5ff;
        }

        .gos-nav__drawerActions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 6px;
        }

        .gos-nav__drawerLogin,
        .gos-nav__drawerSignup {
          width: 100%;
          justify-content: center;
          text-align: center;
          padding: 14px 16px;
          border-radius: 18px;
          text-decoration: none;
          font-weight: 700;
        }

        .gos-nav__drawerLogin {
          color: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
        }

        .gos-nav__drawerSignup {
          color: #04101a;
          background: linear-gradient(135deg, #00e5ff, #7c3aed);
        }

        .gos-orb {
          position: relative;
          width: 56px;
          height: 56px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.84);
          transform: translateZ(0);
          animation: gosOrbFloat 4s ease-in-out infinite;
        }

        .gos-orb__glow,
        .gos-orb__ring,
        .gos-orb__core {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }

        .gos-orb__glow--outer {
          inset: -20px;
          background: radial-gradient(circle, rgba(0, 229, 255, 0.36) 0%, rgba(124, 58, 237, 0.18) 42%, transparent 72%);
          filter: blur(12px);
          animation: gosOrbPulse 2.4s ease-in-out infinite;
        }

        .gos-orb__glow--inner {
          inset: -10px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.28) 0%, transparent 68%);
          filter: blur(8px);
        }

        .gos-orb__ring--outer {
          border: 2px solid transparent;
          border-top-color: #00e5ff;
          border-right-color: #7c3aed;
          animation: gosOrbSpin 3s linear infinite;
          filter: drop-shadow(0 0 14px rgba(0, 229, 255, 0.65));
        }

        .gos-orb__ring--middle {
          inset: 8px;
          border: 2px solid transparent;
          border-bottom-color: #7c3aed;
          border-left-color: #3b82f6;
          animation: gosOrbSpinReverse 2.4s linear infinite;
        }

        .gos-orb__ring--inner {
          inset: 16px;
          border: 1.5px solid transparent;
          border-top-color: rgba(255, 255, 255, 0.9);
          border-bottom-color: #00e5ff;
          animation: gosOrbSpin 1.6s linear infinite;
          opacity: 0.9;
        }

        .gos-orb__core {
          inset: 12px;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at top, rgba(99, 102, 241, 0.96), rgba(8, 11, 20, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 0 22px rgba(0, 229, 255, 0.48), inset 0 0 16px rgba(255, 255, 255, 0.1);
          color: white;
          animation: gosOrbGlow 2.2s ease-in-out infinite;
        }

        @keyframes gosOrbSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes gosOrbSpinReverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @keyframes gosOrbGlow {
          0%, 100% { transform: scale(0.96); opacity: 0.88; }
          50% { transform: scale(1.05); opacity: 1; }
        }

        @keyframes gosOrbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes gosOrbPulse {
          0%, 100% { opacity: 0.55; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        @media (max-width: 1023px) {
          .gos-nav {
            top: 12px;
            left: 12px;
            right: 12px;
            height: 72px;
            padding: 0 12px 0 12px;
            border-radius: 20px;
          }

          .gos-nav__links,
          .gos-nav__actions {
            display: none;
          }

          .gos-nav__menuButton {
            display: inline-flex;
          }

          .gos-nav__title {
            font-size: 1rem;
          }

          .gos-nav__subtitle {
            display: none;
          }

          .gos-orb {
            width: 48px;
            height: 48px;
          }

          .gos-orb__core {
            inset: 10px;
          }

          .gos-nav__drawer {
            display: block;
          }
        }
      `}</style>

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className={`gos-nav ${scrolled ? "gos-nav--scrolled" : ""}`}
      >
        <Link href="/" className="gos-nav__brand" onClick={closeMenu}>
          <BrainOrb />
          <div className="gos-nav__brandText">
            <div className="gos-nav__title">
              Growth<span>OS</span>
            </div>
          </div>
        </Link>

        <nav className="gos-nav__links" aria-label="Primary">
          {NAV_LINKS.map(({ label, href, isAnchor }) => {
            const linkHref = getHref(href);
            const linkClassName = `gos-nav__link ${label === "Pricing" ? "gos-nav__link--pricing" : ""}`;

            if (isAnchor) {
              return (
                <Link
                  key={href}
                  href={linkHref}
                  onClick={(event) => handleAnchorClick(event, href)}
                  className={linkClassName}
                >
                  {label}
                </Link>
              );
            }

            return (
              <Link key={href} href={linkHref} className={linkClassName} onClick={closeMenu}>
                {label}
              </Link>
            );
          })}
        </nav>

        {!isAuthed && (
          <div className="gos-nav__actions">
            <Link href="/login" className="gos-nav__login" onClick={closeMenu}>
              Login
            </Link>
            <Link href="/signup" className="gos-nav__signup" onClick={closeMenu}>
              Sign up
            </Link>
          </div>
        )}

        <button
          type="button"
          className={`gos-nav__menuButton ${menuOpen ? "gos-nav__menuButton--open" : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span className="gos-nav__menuIcon">
            <span />
            <span />
            <span />
          </span>
        </button>
      </motion.header>

      <div className="gos-nav__drawer" aria-hidden={!menuOpen}>
        <div className={`gos-nav__drawerPanel ${menuOpen ? "gos-nav__drawerPanel--open" : ""}`}>
          {NAV_LINKS.map(({ label, href, isAnchor }) => {
            const linkHref = getHref(href);
            const drawerClassName = `gos-nav__drawerLink ${label === "Pricing" ? "gos-nav__drawerLink--pricing" : ""}`;

            if (isAnchor) {
              return (
                <Link
                  key={href}
                  href={linkHref}
                  onClick={(event) => handleAnchorClick(event, href)}
                  className={drawerClassName}
                >
                  <span>{label}</span>
                  <span>→</span>
                </Link>
              );
            }

            return (
              <Link key={href} href={linkHref} className={drawerClassName} onClick={closeMenu}>
                <span>{label}</span>
                <span>→</span>
              </Link>
            );
          })}

          {!isAuthed && (
            <div className="gos-nav__drawerActions">
              <Link href="/login" className="gos-nav__drawerLogin" onClick={closeMenu}>
                Login
              </Link>
              <Link href="/signup" className="gos-nav__drawerSignup" onClick={closeMenu}>
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
