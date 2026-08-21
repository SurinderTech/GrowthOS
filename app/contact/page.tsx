"use client";

import { useState } from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { ContactCard } from "@/components/legal/ContactCard";
import { Mail, Shield, FileText, Trash2, Send, CheckCircle2, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

const TOC_ITEMS = [
  { id: "contact-channels", title: "Official Contact Channels" },
  { id: "request-form", title: "Submit a Privacy or Support Request" },
  { id: "data-requests", title: "Data Deletion & Access Requests" },
  { id: "response-sla", title: "Response Timeline & Process" },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "general",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Request received! We will respond shortly.");
    }, 1000);
  };

  return (
    <LegalLayout
      badge="CONTACT & TRUST CENTER"
      title="Contact GrowthOS — Support, Legal & Privacy Requests"
      subtitle="Have questions about your account, data privacy, AI features, or legal policies? Connect with our dedicated support and compliance team."
      lastUpdated="August 21, 2026"
      effectiveDate="[EFFECTIVE DATE]"
      tocItems={TOC_ITEMS}
    >
      {/* 1. Official Contact Channels */}
      <LegalSection id="contact-channels" number="1" title="Official Contact Channels">
        <p style={{ marginBottom: 20 }}>
          GrowthOS provides clear communication channels for general questions, privacy rights, legal inquiries, and data deletion requests. Select the appropriate contact route below:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <ContactCard
            title="General Customer Support"
            description="Questions about platform features, account settings, roadmap tools, or onboarding assistance."
            emailPlaceholder="[OFFICIAL CONTACT EMAIL]"
            icon={<Mail size={22} style={{ color: "#38bdf8" }} />}
          />

          <ContactCard
            title="Privacy & Data Protection"
            description="Inquiries regarding how your personal information is stored, processed, or shared."
            emailPlaceholder="[PRIVACY EMAIL]"
            icon={<Shield size={22} style={{ color: "#818cf8" }} />}
          />

          <ContactCard
            title="Legal & Compliance"
            description="Formal legal inquiries, intellectual property questions, or Terms of Service notices."
            emailPlaceholder="[OFFICIAL CONTACT EMAIL]"
            icon={<FileText size={22} style={{ color: "#fbbf24" }} />}
          />

          <ContactCard
            title="Data Deletion & Export"
            description="Submit formal data erasure or personal data export requests under applicable regulations."
            emailPlaceholder="[PRIVACY EMAIL]"
            icon={<Trash2 size={22} style={{ color: "#ef4444" }} />}
          />
        </div>
      </LegalSection>

      {/* 2. Interactive Request Form */}
      <LegalSection id="request-form" number="2" title="Submit a Privacy or Support Request">
        <p style={{ marginBottom: 20 }}>
          You can submit a message directly using the form below. Your request will be routed to the appropriate department:
        </p>

        {submitted ? (
          <div style={{
            padding: "36px 28px",
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "16px",
            textAlign: "center"
          }}>
            <CheckCircle2 size={48} style={{ color: "#22c55e", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              Thank You! Request Submitted
            </h3>
            <p style={{ fontSize: "0.95rem", color: "#cbd5e1", maxWidth: 500, margin: "0 auto 20px" }}>
              We have received your message regarding <strong>{form.category}</strong>. A copy of this request has been logged, and our team will respond to <strong>{form.email}</strong> within 24 to 48 hours.
            </p>
            <button
              type="button"
              onClick={() => { setSubmitted(false); setForm({ name: "", email: "", category: "general", subject: "", message: "" }); }}
              style={{
                padding: "10px 24px",
                borderRadius: "30px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer"
              }}
            >
              Submit Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "32px 24px",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            gap: 20
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                  Your Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                  Inquiry Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{
                    padding: "12px 14px",
                    background: "#0d1322",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none"
                  }}
                >
                  <option value="general">General Product Support</option>
                  <option value="privacy">Privacy & Data Question</option>
                  <option value="data-export">Personal Data Export Request</option>
                  <option value="data-deletion">Account & Data Deletion Request</option>
                  <option value="ai-feedback">AI Response Error / Feedback</option>
                  <option value="legal">Legal & Terms Inquiry</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of request"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                Message / Details *
              </label>
              <textarea
                rows={5}
                placeholder="Describe your request or privacy inquiry in detail..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                style={{
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cta-btn"
              style={{
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 15,
                marginTop: 8
              }}
            >
              <Send size={16} /> {loading ? "Sending..." : "Submit Inquiry"}
            </button>
          </form>
        )}
      </LegalSection>

      {/* 3. Data Deletion & Access Requests */}
      <LegalSection id="data-requests" number="3" title="Data Deletion & Access Requests">
        <p>
          GrowthOS respects your right to control your personal information. If you wish to permanently delete your account data or receive a copy of your personal activity logs:
        </p>

        <ol style={{ paddingLeft: 24, margin: "14px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          <li>Select <strong>&quot;Account & Data Deletion Request&quot;</strong> in the form above or email <code>[PRIVACY EMAIL]</code> directly.</li>
          <li>Include the registered email address associated with your GrowthOS account.</li>
          <li>Our privacy team will verify your identity and initiate automated data deletion across our database within 30 days.</li>
        </ol>
      </LegalSection>

      {/* 4. SLA */}
      <LegalSection id="response-sla" number="4" title="Response Timeline & Process">
        <div style={{
          padding: 20,
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 14,
          display: "flex",
          alignItems: "flex-start",
          gap: 16
        }}>
          <MessageSquare size={24} style={{ color: "#38bdf8", flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Expected Response SLA: 24 to 48 Hours
            </h4>
            <p style={{ fontSize: "0.9rem", color: "#cbd5e1", lineHeight: 1.6 }}>
              Our support team reviews inquiries during business operating hours. Formal data protection and rights requests are acknowledged within 48 business hours.
            </p>
          </div>
        </div>
      </LegalSection>
    </LegalLayout>
  );
}
