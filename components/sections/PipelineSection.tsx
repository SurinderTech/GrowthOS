// src/components/sections/PipelineSection.tsx
'use client';

import { Timeline } from "../ui/Timeline";

export function PipelineSection() {
  return (
    <section id="HowItWorks" style={{ padding: "100px 5%", background: "#050709" }}>
      <Timeline />
    </section>
  );
}