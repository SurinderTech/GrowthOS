"use client";

import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { LegalCallout } from "@/components/legal/LegalCallout";
import Link from "next/link";

const TOC_ITEMS = [
  { id: "acceptance", title: "Acceptance & Eligibility" },
  { id: "philosophy", title: "Product Scope & Philosophy" },
  { id: "accounts", title: "Account Creation & Security" },
  { id: "services", title: "GrowthOS Services & AI Features" },
  { id: "ai-tutor-disclaimer", title: "AI Assistance & Advice Limits" },
  { id: "user-content", title: "User Content & License" },
  { id: "intellectual-property", title: "GrowthOS Intellectual Property" },
  { id: "acceptable-use", title: "Acceptable Use Policy" },
  { id: "no-guaranteed-results", title: "No Guaranteed Exam or Career Results" },
  { id: "product-stage-pricing", title: "Product Stage & Future Pricing" },
  { id: "termination", title: "Suspension & Termination" },
  { id: "liability-disputes", title: "Liability & Governing Law" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      badge="TERMS OF SERVICE"
      title="Terms of Service — Platform Agreement"
      subtitle="Please read these Terms of Service carefully before using GrowthOS. This agreement governs your access to and use of our website, AI agents, and learning orchestration platform."
      lastUpdated="August 21, 2026"
      effectiveDate="[EFFECTIVE DATE]"
      tocItems={TOC_ITEMS}
    >
      {/* 1. Acceptance */}
      <LegalSection id="acceptance" number="1" title="Acceptance of Terms & Eligibility">
        <p>
          By accessing, registering for, or using GrowthOS (&quot;Service,&quot; &quot;Platform,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), operated by <code>[LEGAL ENTITY NAME]</code>, you agree to be legally bound by these Terms of Service (&quot;Terms&quot;) and our <Link href="/privacy" style={{ color: "#38bdf8" }}>Privacy Policy</Link>.
        </p>
        <p>
          If you do not agree to these Terms, you may not access or use GrowthOS.
        </p>
        <p>
          <strong>Eligibility:</strong> You must be at least the legal age of majority in your jurisdiction, or have proper consent and oversight from a parent or legal guardian if accessing GrowthOS as a student learner.
        </p>
      </LegalSection>

      {/* 2. Philosophy */}
      <LegalSection id="philosophy" number="2" title="Product Scope & GrowthOS Philosophy">
        <LegalCallout type="important" title="Core Operating Principle">
          <strong>&quot;Bring your own books. Bring your own courses. We&apos;ll orchestrate everything else.&quot;</strong>
        </LegalCallout>
        
        <p>
          GrowthOS is an AI-powered execution, habit-tracking, planning, and personal growth platform designed to wrap around your existing learning journey across fields such as <strong>JEE, NEET, UPSC, SSC, Banking, MBBS, Nursing, Pharmacy, Engineering, Computer Science, AI, Law, Commerce, Entrepreneurship</strong>, and other disciplines.
        </p>

        <p>
          GrowthOS is <strong>not</strong> a traditional educational institution, coaching center, university, or accredited course provider. We do not replace teachers, textbooks, or primary syllabus providers; we provide the intelligent execution environment to organize your study routines, monitor habits, and assist your research.
        </p>
      </LegalSection>

      {/* 3. Accounts */}
      <LegalSection id="accounts" number="3" title="Account Creation & Security">
        <p>
          To access GrowthOS features, you must create an account by providing accurate profile information. You are responsible for:
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li>Maintaining the confidentiality of your login credentials and JWT session tokens.</li>
          <li>All activities occurring under your account profile.</li>
          <li>Promptly notifying us at <code>[OFFICIAL CONTACT EMAIL]</code> if you suspect unauthorized access to your account.</li>
        </ul>
        <p>We reserve the right to suspend or terminate accounts with invalid or fraudulent registration information.</p>
      </LegalSection>

      {/* 4. Services */}
      <LegalSection id="services" number="4" title="GrowthOS Services & AI Features">
        <p>
          GrowthOS provides AI-assisted features which may include roadmap generation, AI tutoring assistance, progress analytics, daily smart task scheduling, interactive practice arenas, and learning agent guidance.
        </p>
        <p>
          Features are made available as implemented in the platform. Features described in product roadmaps or announcements do not constitute a legal guarantee of availability until deployed.
        </p>
      </LegalSection>

      {/* 5. AI Limitations */}
      <LegalSection id="ai-tutor-disclaimer" number="5" title="AI Assistance & Advice Limitations">
        <LegalCallout type="ai" title="AI Tutor & Model Clarification">
          AI agents (such as Nova or AI Tutors) within GrowthOS are synthetic computer software systems, <strong>not human teachers or professionals</strong>. AI outputs can occasionally produce inaccurate information, incorrect problem steps, or outdated explanations.
        </LegalCallout>

        <p>
          <strong>No Professional Advice:</strong> AI outputs generated on GrowthOS do not constitute professional advice under any circumstances:
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>No Medical Advice:</strong> Information related to MBBS, Nursing, Pharmacy, or healthcare topics is purely for academic study review and does not constitute medical diagnosis or clinical guidance.</li>
          <li><strong>No Legal Advice:</strong> Law learning prompts or case references do not constitute legal representation or formal advice.</li>
          <li><strong>No Financial/Career Guarantees:</strong> Planning models do not constitute licensed financial or career counseling.</li>
        </ul>
        <p>
          Users must independently verify critical facts, equations, exam dates, and official syllabus guidelines against authoritative source materials.
        </p>
      </LegalSection>

      {/* 6. User Content */}
      <LegalSection id="user-content" number="6" title="User Content & License">
        <p>
          You may upload or submit notes, study goals, custom tasks, practice answers, or prompts (&quot;User Content&quot;) to GrowthOS.
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Ownership:</strong> You retain ownership of all original intellectual property rights in your User Content.</li>
          <li><strong>Limited Platform License:</strong> By submitting User Content to GrowthOS, you grant us a limited, worldwide, non-exclusive, royalty-free license to store, process, display, and format your User Content solely to operate, personalize, and deliver the GrowthOS service for you.</li>
          <li><strong>Responsibility:</strong> You represent and warrant that you possess all necessary rights to submit your User Content and that it does not infringe any third-party copyright or proprietary right.</li>
        </ul>
      </LegalSection>

      {/* 7. IP */}
      <LegalSection id="intellectual-property" number="7" title="GrowthOS Intellectual Property">
        <p>
          The GrowthOS platform, including its software code, UI design system, logos, visual branding, AI agent orchestration architecture, algorithms, and original copy, is owned by or licensed to <code>[LEGAL ENTITY NAME]</code> and is protected by copyright, trademark, and intellectual property laws.
        </p>
        <p>
          You may not copy, reverse engineer, decompile, scrape, frame, or create derivative works from the GrowthOS platform without explicit written authorization.
        </p>
      </LegalSection>

      {/* 8. Acceptable Use */}
      <LegalSection id="acceptable-use" number="8" title="Acceptable Use Policy">
        <p>You agree not to engage in any of the following prohibited activities:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li>Attempting to bypass security controls, rate limiters, or authentication mechanisms.</li>
          <li>Using automated scripts, bots, or scrapers to extract platform data or exhaust server resources.</li>
          <li>Submitting malicious code, viruses, or prompt injection exploits targeting our AI infrastructure.</li>
          <li>Harassing, spamming, or violating the privacy of other community members.</li>
          <li>Using GrowthOS for any unlawful, deceptive, or fraudulent activity.</li>
        </ul>
      </LegalSection>

      {/* 9. No Guaranteed Results */}
      <LegalSection id="no-guaranteed-results" number="9" title="No Guaranteed Exam or Career Results">
        <LegalCallout type="warning" title="Disclaimer of Outcome Guarantees">
          GrowthOS is an execution and organization tool. We explicitly do <strong>NOT</strong> guarantee specific exam scores, competitive ranks, university admissions, job placements, salary increases, or academic outcomes.
        </LegalCallout>
        <p>
          Your learning success depends on individual effort, personal consistency, external coaching, official syllabus changes, and third-party evaluation criteria beyond the control of GrowthOS.
        </p>
      </LegalSection>

      {/* 10. Product Stage & Future Pricing */}
      <LegalSection id="product-stage-pricing" number="10" title="Product Stage & Pricing Terms">
        <p>
          <strong>Free Development Stage:</strong> GrowthOS is currently provided to users during its development phase without active subscription charges.
        </p>
        <p>
          <strong>Future Premium Options:</strong> We reserve the right to introduce optional paid subscription tiers, feature caps, or premium AI usage limits in the future. Any future pricing transitions will be communicated transparently in advance, and no user will be billed without explicit consent.
        </p>
      </LegalSection>

      {/* 11. Termination */}
      <LegalSection id="termination" number="11" title="Suspension & Termination">
        <p>
          We reserve the right to suspend or terminate your access to GrowthOS at any time, with or without prior notice, if you violate these Terms, engage in system abuse, or if required by legal authority.
        </p>
        <p>
          You may terminate your account at any time by stopping usage or submitting a account closure request to <code>[OFFICIAL CONTACT EMAIL]</code>.
        </p>
      </LegalSection>

      {/* 12. Liability */}
      <LegalSection id="liability-disputes" number="12" title="Limitation of Liability & Governing Law">
        <p>
          To the maximum extent permitted by applicable law, GrowthOS and <code>[LEGAL ENTITY NAME]</code> shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or academic opportunities resulting from your use of or inability to use the platform.
        </p>
        <p>
          <strong>Governing Law:</strong> These Terms shall be governed by and construed in accordance with the laws of <code>[JURISDICTION / INDIA]</code>, without regard to conflict of law principles. Any legal suit or proceeding arising under these Terms shall be instituted exclusively in the competent courts located in <code>[CITY / STATE]</code>.
        </p>
        <p style={{ marginTop: 16 }}>
          For formal legal notices or questions regarding these Terms, contact us:
          <br />
          <code>[LEGAL ENTITY NAME]</code> — <code>[OFFICIAL CONTACT EMAIL]</code>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
