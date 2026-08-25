"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";

export type NovaArea = "dashboard" | "learning" | "practice" | "progress" | "roadmap" | "general";

export interface NovaContextState {
  currentArea: NovaArea;
  activeTopic?: string | null;
  activeGoal?: string | null;
  currentTaskId?: string | null;
  setPageContext: (ctx: Partial<Omit<NovaContextState, "currentArea" | "setPageContext">>) => void;
}

const NovaContext = createContext<NovaContextState>({
  currentArea: "general",
  activeTopic: null,
  activeGoal: null,
  currentTaskId: null,
  setPageContext: () => {},
});

export function NovaProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Auto-detect current GrowthOS location from URL pathname
  const getCurrentArea = (path: string | null): NovaArea => {
    if (!path) return "general";
    if (path.includes("/dashboard/practice") || path.includes("/practice-arena")) return "practice";
    if (path.includes("/dashboard/learning") || path.includes("/learning")) return "learning";
    if (path.includes("/dashboard/growth-plan") || path.includes("/roadmap")) return "roadmap";
    if (path.includes("/dashboard/progress") || path.includes("/activity")) return "progress";
    if (path.includes("/dashboard")) return "dashboard";
    return "general";
  };

  const currentArea = getCurrentArea(pathname);

  const setPageContext = (ctx: Partial<Omit<NovaContextState, "currentArea" | "setPageContext">>) => {
    if (ctx.activeTopic !== undefined) setActiveTopic(ctx.activeTopic);
    if (ctx.activeGoal !== undefined) setActiveGoal(ctx.activeGoal);
    if (ctx.currentTaskId !== undefined) setCurrentTaskId(ctx.currentTaskId);
  };

  return (
    <NovaContext.Provider
      value={{
        currentArea,
        activeTopic,
        activeGoal,
        currentTaskId,
        setPageContext,
      }}
    >
      {children}
    </NovaContext.Provider>
  );
}

export function useNovaContext() {
  return useContext(NovaContext);
}
