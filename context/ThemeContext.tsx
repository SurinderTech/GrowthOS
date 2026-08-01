"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeMode = "dark" | "light" | "system";

interface AppearanceSettings {
  theme: ThemeMode;
  accent_color: string;
  compact_mode: boolean;
  animations: boolean;
}

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: "dark" | "light";
  accentColor: string;
  compactMode: boolean;
  animations: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setAccentColor: (color: string) => void;
  setCompactMode: (compact: boolean) => void;
  setAnimations: (anim: boolean) => void;
  updateAppearance: (newSettings: Partial<AppearanceSettings>) => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("access_token") || localStorage.getItem("token") || "";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [accentColor, setAccentColorState] = useState<string>("#6366f1");
  const [compactMode, setCompactModeState] = useState<boolean>(false);
  const [animations, setAnimationsState] = useState<boolean>(true);

  // Synchronize document element data-theme attribute and CSS variables
  const applyThemeToDOM = (mode: ThemeMode, color: string) => {
    if (typeof window === "undefined") return;

    let computedTheme: "dark" | "light" = "dark";
    if (mode === "system") {
      computedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      computedTheme = mode;
    }

    setResolvedTheme(computedTheme);

    const root = document.documentElement;
    root.setAttribute("data-theme", computedTheme);
    if (computedTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }

    root.style.setProperty("--accent-color", color);
  };

  // Initial loading from localStorage and Backend
  useEffect(() => {
    const savedTheme = (localStorage.getItem("growthos_theme") as ThemeMode) || "dark";
    const savedAccent = localStorage.getItem("growthos_accent") || "#6366f1";
    const savedCompact = localStorage.getItem("growthos_compact") === "true";
    const savedAnim = localStorage.getItem("growthos_anim") !== "false";

    setThemeState(savedTheme);
    setAccentColorState(savedAccent);
    setCompactModeState(savedCompact);
    setAnimationsState(savedAnim);
    applyThemeToDOM(savedTheme, savedAccent);

    // Sync with backend if logged in
    const token = getToken();
    if (token) {
      fetch(`${API}/settings/appearance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.settings) {
            const s = data.settings;
            if (s.theme) {
              setThemeState(s.theme);
              localStorage.setItem("growthos_theme", s.theme);
            }
            if (s.accent_color) {
              setAccentColorState(s.accent_color);
              localStorage.setItem("growthos_accent", s.accent_color);
            }
            if (s.compact_mode !== undefined) {
              setCompactModeState(s.compact_mode);
              localStorage.setItem("growthos_compact", String(s.compact_mode));
            }
            if (s.animations !== undefined) {
              setAnimationsState(s.animations);
              localStorage.setItem("growthos_anim", String(s.animations));
            }
            applyThemeToDOM(s.theme || savedTheme, s.accent_color || savedAccent);
          }
        })
        .catch(() => {});
    }
  }, []);

  // System preference change listener
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyThemeToDOM("system", accentColor);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, accentColor]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem("growthos_theme", mode);
    applyThemeToDOM(mode, accentColor);
    saveAppearanceToBackend({ theme: mode, accent_color: accentColor, compact_mode: compactMode, animations });
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem("growthos_accent", color);
    applyThemeToDOM(theme, color);
    saveAppearanceToBackend({ theme, accent_color: color, compact_mode: compactMode, animations });
  };

  const setCompactMode = (compact: boolean) => {
    setCompactModeState(compact);
    localStorage.setItem("growthos_compact", String(compact));
    saveAppearanceToBackend({ theme, accent_color: accentColor, compact_mode: compact, animations });
  };

  const setAnimations = (anim: boolean) => {
    setAnimationsState(anim);
    localStorage.setItem("growthos_anim", String(anim));
    saveAppearanceToBackend({ theme, accent_color: accentColor, compact_mode: compactMode, animations: anim });
  };

  const saveAppearanceToBackend = async (settings: AppearanceSettings) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API}/settings/appearance`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
    } catch {}
  };

  const updateAppearance = async (newSettings: Partial<AppearanceSettings>) => {
    const updatedTheme = newSettings.theme ?? theme;
    const updatedAccent = newSettings.accent_color ?? accentColor;
    const updatedCompact = newSettings.compact_mode ?? compactMode;
    const updatedAnim = newSettings.animations ?? animations;

    if (newSettings.theme !== undefined) setThemeState(updatedTheme);
    if (newSettings.accent_color !== undefined) setAccentColorState(updatedAccent);
    if (newSettings.compact_mode !== undefined) setCompactModeState(updatedCompact);
    if (newSettings.animations !== undefined) setAnimationsState(updatedAnim);

    localStorage.setItem("growthos_theme", updatedTheme);
    localStorage.setItem("growthos_accent", updatedAccent);
    localStorage.setItem("growthos_compact", String(updatedCompact));
    localStorage.setItem("growthos_anim", String(updatedAnim));

    applyThemeToDOM(updatedTheme, updatedAccent);

    await saveAppearanceToBackend({
      theme: updatedTheme,
      accent_color: updatedAccent,
      compact_mode: updatedCompact,
      animations: updatedAnim,
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        accentColor,
        compactMode,
        animations,
        setTheme,
        toggleTheme,
        setAccentColor,
        setCompactMode,
        setAnimations,
        updateAppearance,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
