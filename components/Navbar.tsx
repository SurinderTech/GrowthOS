"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "How it Works", href: "#HowItWorks",  isAnchor: true  },
  { label: "Features",     href: "#features",    isAnchor: true  },
  { label: "About",        href: "#about",       isAnchor: true  },
  { label: "Community",    href: "#community",   isAnchor: true  },
  { label: "Pricing",      href: "/pricing",     isAnchor: false },
];

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

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
      {/* ── Main Nav ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center px-[5%] transition-all duration-400 ${
          scrolled
            ? "bg-[#04070f]/60 backdrop-blur-2xl border-b border-white/[0.07] shadow-[0_4px_40px_rgba(0,0,0,0.4)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        {/* Nav Links */}
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

        {/* Right Actions */}
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

        {/* Hamburger */}
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

        <Link
          href="/login"
          className="text-base text-[#8892a4] hover:text-white py-3 border-b border-white/[0.05] transition-colors duration-200"
          onClick={() => setMenuOpen(false)}
        >
          Login
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
      </div>
    </>
  );
}