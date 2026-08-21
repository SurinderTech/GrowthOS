"use client";

import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { LegalCallout } from "@/components/legal/LegalCallout";
import Link from "next/link";

const TOC_ITEMS = [
  { id: "overview", title: "Overview: AI Can Help. You Stay in Control." },
  { id: "ai-capabilities", title: "AI-Powered Capabilities in GrowthOS" },
  { id: "ai-limitations", title: "Understanding AI Limitations" },
  { id: "non-professional", title: "No Professional Advice Disclaimers" },
  { id: "ai-tutor-clarification", title: "AI Tutor vs. Human Educator" },
  { id: "user-responsibility", title: "User Responsibility & Verification" },
  { id: "error-reporting", title: "Reporting Inaccuracies" },
];

export default function AIDisclaimerPage() {
  return (
    <LegalLayout
      badge="AI DISCLAIMER"
      title="AI Disclaimer — AI Can Help. You Stay in Control."
      subtitle="GrowthOS leverages artificial intelligence to help you plan, organize, and execute your study goals. Learn how our AI systems work, what they can do, and why critical verification remains in your hands."
      lastUpdated="August 21, 2026"
      effectiveDate="[EFFECTIVE DATE]"
      tocItems={TOC_ITEMS}
    >
      {/* 1. Overview */}
      <LegalSection id="overview" number="1" title="Overview: AI Can Help. You Stay in Control.">
        <LegalCallout type="ai" title="GrowthOS AI Mission Statement">
          Our philosophy is: <strong>&quot;Bring your own books. Bring your own courses. We&apos;ll orchestrate everything else.&quot;</strong>
          <br />
          Artificial Intelligence in GrowthOS serves as your personal learning assistant and execution catalyst — helping you structure habits, discover resources, and practice concepts efficiently.
        </LegalCallout>
        <p>
          While AI empowers ambitious learners across fields like <strong>JEE, NEET, UPSC, SSC, Banking, MBBS, Nursing, Pharmacy, Engineering, Computer Science, AI, Law, and Commerce</strong>, it is important to understand the capabilities and inherent boundaries of AI technologies.
        </p>
      </LegalSection>

      {/* 2. Capabilities */}
      <LegalSection id="ai-capabilities" number="2" title="AI-Powered Capabilities in GrowthOS">
        <p>Depending on implemented platform features, GrowthOS AI systems assist you with:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Adaptive Roadmap Generation:</strong> Organizing your syllabus goals into daily actionable study schedules.</li>
          <li><strong>Concept Summarization & Tutoring:</strong> Conversational explanations of complex academic topics.</li>
          <li><strong>Practice Arena Support:</strong> Generating mock queries, flashcards, and step-by-step problem breakdowns.</li>
          <li><strong>Progress Analytics:</strong> Identifying potential weak areas based on your self-reported task completion data.</li>
        </ul>
      </LegalSection>

      {/* 3. Limitations */}
      <LegalSection id="ai-limitations" number="3" title="Understanding AI Limitations">
        <LegalCallout type="warning" title="Potential AI Errors & Hallucinations">
          Large language models (LLMs) generate output based on statistical patterns in data. Consequently, AI-generated responses can sometimes contain errors, outdated facts, incorrect numerical calculations, or flawed logical reasoning.
        </LegalCallout>

        <p>Common limitations of AI systems include:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Syllabus Mismatches:</strong> Exam authorities (such as NTA, UPSC, or universities) update official syllabi and marking schemes frequently. AI models may not immediately reflect real-time changes.</li>
          <li><strong>Mathematical & Scientific Steps:</strong> Complex multi-step equations or scientific formulas may occasionally contain subtle calculation slips.</li>
          <li><strong>Incomplete Context:</strong> The AI responds to prompts provided. It may not have complete visibility into your institutional assignment instructions or official exam guidelines.</li>
        </ul>
      </LegalSection>

      {/* 4. Non-Professional Advice */}
      <LegalSection id="non-professional" number="4" title="No Professional Advice Disclaimers">
        <p>
          AI output provided on GrowthOS is strictly for academic learning support and personal productivity organization. It is <strong>NOT</strong> professional advice:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, margin: "16px 0" }}>
          {[
            { title: "No Medical Advice", text: "Study materials or AI answers relating to MBBS, Nursing, Pharmacy, or clinical medicine are for academic review only. They do NOT replace a qualified healthcare professional or clinical diagnosis." },
            { title: "No Legal Advice", text: "Law prompts, legal history, or statute summaries do NOT constitute formal legal representation, counsel, or legal advice." },
            { title: "No Financial Advice", text: "Commerce, business, or economics guidance does NOT constitute licensed financial, investment, or tax advice." },
            { title: "No Mental Health Advice", text: "Habit tracking and motivation tools do NOT replace licensed mental health professionals, counselors, or medical therapy." },
          ].map((item) => (
            <div key={item.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: 18, borderRadius: 14 }}>
              <h4 style={{ color: "#fbbf24", fontSize: "0.95rem", marginBottom: 6 }}>{item.title}</h4>
              <p style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.6 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      {/* 5. AI Tutor vs Human */}
      <LegalSection id="ai-tutor-disclaimer" number="5" title="AI Tutor vs. Human Educator">
        <p>
          GrowthOS AI tutors and interactive agents are <strong>synthetic computer software programs</strong>.
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li>AI tutors are not human teachers, professors, or official exam evaluators.</li>
          <li>Avatars, synthetic voices, or conversational agents are AI-generated interfaces designed to make study review engaging.</li>
          <li>AI tutors do not hold institutional authority, grading power, or official accreditation credentials.</li>
        </ul>
      </LegalSection>

      {/* 6. User Responsibility */}
      <LegalSection id="user-responsibility" number="6" title="User Responsibility & Verification">
        <LegalCallout type="info" title="The Golden Rule of AI Study">
          Always cross-check critical formulas, historical dates, exam notifications, and legal statutes against your official textbooks, teacher notes, and official exam board websites (e.g., NTA, UPSC, NBE).
        </LegalCallout>

        <p>As a GrowthOS user, you agree that:</p>
        <ol style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <li>You retain final responsibility for the accuracy of assignments, exam submissions, and academic decisions.</li>
          <li>You will not rely solely on AI-generated summaries for critical high-stakes test answers without independent verification.</li>
          <li>You will use AI features as an enhancement to — not a substitute for — rigorous study effort.</li>
        </ol>
      </LegalSection>

      {/* 7. Error Reporting */}
      <LegalSection id="error-reporting" number="7" title="Reporting Inaccuracies">
        <p>
          We continuously fine-tune our prompt engineering and model guardrails to maintain high academic utility. If you encounter an inaccurate response, hallucination, or inappropriate output:
        </p>
        <p style={{ marginTop: 10 }}>
          Please let us know by emailing our support team at <code>[OFFICIAL CONTACT EMAIL]</code> with details of the query so we can improve prompt safety and model accuracy.
        </p>
        <div style={{ marginTop: 20 }}>
          <Link href="/contact" style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "none" }}>
            Submit an AI Quality Report on our Contact Page →
          </Link>
        </div>
      </LegalSection>
    </LegalLayout>
  );
}
