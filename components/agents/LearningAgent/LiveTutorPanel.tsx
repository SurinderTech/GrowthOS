"use client";
// components/agents/LearningAgent/LiveTutorPanel.tsx
//
// Wraps AITutorDock for the right column of LearningStudio.

import { AITutorDock } from "./AITutorDock";
import type { TutorContext } from "@/lib/learning-agent-api";

export function LiveTutorPanel({ context }: { context: TutorContext }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", overflow: "hidden" }}>
      <AITutorDock context={context} compact={true} />
    </div>
  );
}

export default LiveTutorPanel;
