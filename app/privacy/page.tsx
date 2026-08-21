"use client";

import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { LegalCallout } from "@/components/legal/LegalCallout";
import Link from "next/link";

const TOC_ITEMS = [
  { id: "introduction", title: "Introduction & Scope" },
  { id: "who-we-are", title: "Who We Are & Product Stage" },
  { id: "information-collected", title: "Information We Collect" },
  { id: "how-we-use-data", title: "How We Use Information" },
  { id: "ai-processing", title: "AI Data Processing" },
  { id: "data-sharing", title: "Data Sharing & Service Providers" },
  { id: "data-security", title: "Data Security Measures" },
  { id: "data-retention", title: "Data Retention & Storage" },
  { id: "user-rights", title: "Your Rights & Controls" },
  { id: "children-students", title: "Children & Student Privacy" },
  { id: "third-parties", title: "Third-Party Services" },
  { id: "policy-changes", title: "Policy Updates & Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      badge="PRIVACY POLICY"
      title="Privacy Policy — Your Data. Your Control."
      subtitle="At GrowthOS, we believe transparency is the foundation of trust. This Privacy Policy explains clearly how we handle, process, and protect your personal and learning data."
      lastUpdated="August 21, 2026"
      effectiveDate="[EFFECTIVE DATE]"
      tocItems={TOC_ITEMS}
    >
      {/* 1. Introduction */}
      <LegalSection id="introduction" number="1" title="Introduction & Scope">
        <p>
          Welcome to <strong>GrowthOS</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). GrowthOS is an AI-powered learning, execution, productivity, and personal growth platform designed for ambitious learners across diverse fields — including <strong>JEE, NEET, UPSC, SSC, Banking, MBBS, Nursing, Pharmacy, Engineering, Computer Science, AI & ML, Data Science, Design, Law, Commerce, Entrepreneurship</strong>, and other academic or career growth paths.
        </p>
        
        <LegalCallout type="info" title="Our Philosophy">
          <strong>&quot;Bring your own books. Bring your own courses. We&apos;ll orchestrate everything else.&quot;</strong>
          <br />
          GrowthOS is <em>not</em> an education company that replaces your schools, teachers, coaching institutes, or textbooks. GrowthOS provides the intelligent execution environment, roadmap generation, habit tracking, and AI guidance around your existing learning journey.
        </LegalCallout>

        <p>
          This Privacy Policy describes how GrowthOS collects, uses, stores, and protects information when you visit our website, register for an account, interact with our AI agents, or use any of our tools and services.
        </p>
      </LegalSection>

      {/* 2. Who We Are */}
      <LegalSection id="who-we-are" number="2" title="Who We Are & Current Product Stage">
        <p>
          GrowthOS is operated by <code>[LEGAL ENTITY NAME]</code> (&quot;Company&quot;), having its registered office at <code>[REGISTERED ADDRESS]</code>.
        </p>
        <p>
          <strong>Current Stage Notice:</strong> GrowthOS is currently under active development. At this stage:
        </p>
        <ul style={{ paddingLeft: 24, margin: "10px 0" }}>
          <li>GrowthOS does not currently charge users or process credit card/payment transactions.</li>
          <li>We do not collect or store financial or credit card data.</li>
          <li>We do not claim SOC 2, ISO 27001, or GDPR official certifications at this development stage, though we design with industry-standard privacy principles.</li>
        </ul>
      </LegalSection>

      {/* 3. Information Collected */}
      <LegalSection id="information-collected" number="3" title="Information We Collect">
        <p>
          We only collect data necessary to provide and improve your learning orchestration experience. Categories of data we may collect include:
        </p>

        <h3 style={{ color: "#818cf8", fontSize: "1.1rem", marginTop: 12 }}>A. Account Information</h3>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Name:</strong> To personalize your workspace.</li>
          <li><strong>Email Address:</strong> Used for account creation, login, verification, and essential security notifications.</li>
          <li><strong>Authentication Data:</strong> Password hashes (salted and encrypted using bcrypt) or OAuth credentials (Google, Facebook, LinkedIn authentication tokens).</li>
          <li><strong>Phone Number (Optional):</strong> If you opt for phone OTP login via providers such as MSG91.</li>
        </ul>

        <h3 style={{ color: "#818cf8", fontSize: "1.1rem", marginTop: 12 }}>B. Learning & Profile Information</h3>
        <ul style={{ paddingLeft: 24 }}>
          <li>Target goals, competitive exam choices, or skill development paths.</li>
          <li>Daily task lists, learning roadmap preferences, practice session scores, and progress metrics.</li>
          <li>User-curated focus habits, streaks, and skill self-assessments.</li>
        </ul>

        <h3 style={{ color: "#818cf8", fontSize: "1.1rem", marginTop: 12 }}>C. AI Interaction Information</h3>
        <ul style={{ paddingLeft: 24 }}>
          <li>Questions, prompts, notes, or concept queries submitted to GrowthOS AI features (e.g., Nova, Learning Agent).</li>
          <li>AI-generated outputs, structured execution plans, and study recommendations saved to your profile.</li>
        </ul>

        <h3 style={{ color: "#818cf8", fontSize: "1.1rem", marginTop: 12 }}>D. Technical & Usage Information</h3>
        <ul style={{ paddingLeft: 24 }}>
          <li>Device type, browser configuration, operating system, and IP address for session security.</li>
          <li>Application logs, timestamps, and error diagnostic logs to maintain platform stability.</li>
        </ul>
      </LegalSection>

      {/* 4. How We Use Data */}
      <LegalSection id="how-we-use-data" number="4" title="How We Use Information">
        <p>We process your information strictly for legitimate product purposes:</p>
        <ol style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <li><strong>Personalized Orchestration:</strong> Generating daily action plans, adaptive roadmaps, and target milestones tailored to your target exam or field.</li>
          <li><strong>AI Feature Execution:</strong> Processing your prompts to deliver intelligent tutoring explanations, resource recommendations, and progress analysis.</li>
          <li><strong>Account Administration:</strong> Authenticating logins, sending verification OTP emails, and restoring account access.</li>
          <li><strong>System Reliability & Security:</strong> Monitoring for rate limits, bot abuse, spam, and security vulnerabilities.</li>
          <li><strong>Platform Improvement:</strong> Analyzing aggregated usage trends to optimize AI agent accuracy and feature performance.</li>
        </ol>
      </LegalSection>

      {/* 5. AI Data Processing */}
      <LegalSection id="ai-processing" number="5" title="AI Data Processing">
        <LegalCallout type="ai" title="How AI Features Work">
          GrowthOS leverages large language models (LLMs) and specialized AI models (via providers like OpenRouter and model hosts) to analyze queries and generate study recommendations.
        </LegalCallout>
        
        <p>When you use AI features in GrowthOS:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li>Relevant context (your query, target goal, or learning topic) is processed by our AI backend orchestration service.</li>
          <li>Prompts sent to third-party AI model providers are used solely to fulfill your requested response.</li>
          <li>We do <em>not</em> sell your prompts or private study notes to third parties.</li>
          <li>We encourage you to avoid submitting sensitive personal identification (such as national ID numbers, financial keys, or private confidential records) into conversational AI prompts.</li>
        </ul>
      </LegalSection>

      {/* 6. Data Sharing */}
      <LegalSection id="data-sharing" number="6" title="How We Share Information">
        <p>
          GrowthOS does <strong>not sell</strong>, rent, or trade your personal information to advertisers or data brokers. We share data only under the following limited circumstances:
        </p>

        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Infrastructure & Service Providers:</strong> Trusted third-party vendors who assist in cloud hosting, database management, email delivery, or authentication (e.g., Supabase, PostgreSQL host, Brevo for email, MSG91 for SMS OTP, Cloudflare Turnstile for CAPTCHA).</li>
          <li><strong>AI Model Partners:</strong> API endpoint providers used strictly to execute AI inference for your requests.</li>
          <li><strong>Legal Requirements:</strong> If required by applicable law, court order, or governmental authority under valid legal process.</li>
          <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset transfer involving GrowthOS, subject to equal or higher privacy protections.</li>
        </ul>
      </LegalSection>

      {/* 7. Data Security */}
      <LegalSection id="data-security" number="7" title="Data Security Measures">
        <p>
          We employ reasonable administrative, technical, and organizational measures designed to protect your personal information from unauthorized access, loss, misuse, alteration, or disclosure.
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li>Passwords are stored using industry-standard bcrypt hashing.</li>
          <li>All HTTP communications are encrypted in transit via SSL/TLS (HTTPS).</li>
          <li>Session authentication uses signed JWT tokens with defined expiration windows.</li>
        </ul>
        <LegalCallout type="warning" title="Security Reality Check">
          No internet transmission or electronic storage method is 100% secure. While we take diligent precautions to safeguard your data, we cannot guarantee absolute security against all unauthorized breaches or malicious attacks.
        </LegalCallout>
      </LegalSection>

      {/* 8. Retention */}
      <LegalSection id="data-retention" number="8" title="Data Retention & Storage">
        <p>
          We retain your personal data for as long as your account remains active or as needed to provide you with GrowthOS services. If you delete your account or request data removal, we will initiate deletion of your personal profile data within a reasonable timeframe (typically 30 days), except where longer retention is required to fulfill legal compliance or dispute resolution obligations.
        </p>
      </LegalSection>

      {/* 9. User Rights */}
      <LegalSection id="user-rights" number="9" title="Your Rights & Controls">
        <p>Depending on your jurisdiction, you possess specific rights regarding your personal information:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Right to Access:</strong> You can request a copy of the personal information stored in your account.</li>
          <li><strong>Right to Correction:</strong> You can edit or update your name, email, and learning profile directly in your settings page.</li>
          <li><strong>Right to Deletion:</strong> You can submit a data deletion request by contacting us at <code>[PRIVACY EMAIL]</code>.</li>
          <li><strong>Consent Withdrawal:</strong> You may stop using AI features or request account termination at any time.</li>
        </ul>
      </LegalSection>

      {/* 10. Children & Students */}
      <LegalSection id="children-students" title="Children & Student Privacy">
        <p>
          GrowthOS is an educational productivity tool that attracts learners of various ages, including students preparing for high school, entrance, or university examinations.
        </p>
        <p>
          We do not knowingly collect personal data from children under the age required by local law (such as under 13 in certain regions) without proper authorization or parental involvement where applicable. If you believe a child has provided us with personal information without required oversight, please contact <code>[PRIVACY EMAIL]</code> so we may review and delete the account.
        </p>
        <p style={{ fontSize: 13, color: "#94a3b8" }}>
          <em>Compliance Note: Final age verification processes and student data safeguards are being finalized prior to formal commercial launch under the applicable Indian Digital Personal Data Protection (DPDP) Act and international guidelines.</em>
        </p>
      </LegalSection>

      {/* 11. Third Party Services */}
      <LegalSection id="third-parties" title="Third-Party Services Infrastructure">
        <p>Below is the structured list of potential service categories and providers utilized by GrowthOS:</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, margin: "16px 0" }}>
          {[
            { category: "Database & Auth", provider: "Supabase / PostgreSQL", purpose: "User profile storage & authentication" },
            { category: "Email Delivery", provider: "Brevo API", purpose: "OTP & verification emails" },
            { category: "Phone OTP", provider: "MSG91 Widget", purpose: "SMS authentication" },
            { category: "Security & CAPTCHA", provider: "Cloudflare Turnstile", purpose: "Bot & rate-limit prevention" },
            { category: "AI Models & APIs", provider: "OpenRouter & Model APIs", purpose: "AI inference and roadmap processing" },
          ].map((item) => (
            <div key={item.category} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase" }}>{item.category}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "4px 0" }}>{item.provider}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.purpose}</div>
            </div>
          ))}
        </div>
      </LegalSection>

      {/* 12. Policy Updates & Contact */}
      <LegalSection id="policy-changes" title="Policy Updates & Contact Information">
        <p>
          We may update this Privacy Policy periodically to reflect product advancements or legal compliance requirements. Changes will be posted on this page with an updated &quot;Last Updated&quot; date.
        </p>
        <p>
          For any questions, privacy inquiries, or data access requests, please reach out to our team:
        </p>
        <div style={{ marginTop: 16, padding: 20, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14 }}>
          <div><strong>Official Legal Entity:</strong> <code>[LEGAL ENTITY NAME]</code></div>
          <div><strong>Privacy Contact:</strong> <code>[PRIVACY EMAIL]</code></div>
          <div><strong>Grievance Officer:</strong> <code>[GRIEVANCE CONTACT]</code></div>
          <div><strong>Registered Address:</strong> <code>[REGISTERED ADDRESS]</code></div>
          <div style={{ marginTop: 12 }}>
            <Link href="/contact" style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "none" }}>
              Visit Contact & Privacy Request Page →
            </Link>
          </div>
        </div>
      </LegalSection>
    </LegalLayout>
  );
}
