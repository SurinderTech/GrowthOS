"use client";
// app/pricing/page.tsx
// GrowthOS — Premium Pricing + Payment Simulation System

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
type BillingCycle = "monthly" | "yearly";
type PlanId = "free" | "premium" | "pro" | "silicon";
type PaymentMethod = "upi" | "card" | "wallet";
type CheckoutStep = "details" | "payment" | "processing" | "success";

interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  icon: string;
  badge?: string;
  color: string;
  glow: string;
  border: string;
  monthlyPrice: number;
  yearlyPrice: number;
  cta: string;
  highlight?: boolean;
  features: string[];
}

// ── Plan Data ─────────────────────────────────────────────────────────────────
const PLANS: Plan[] = [
  {
    id: "free",
    name: "Explorer",
    tagline: "Start your journey",
    icon: "🟢",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.2)",
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: "Start Free",
    features: [
      "Basic Challenges (5/day)",
      "Limited Arena access",
      "Basic Growth Plan",
      "Standard leaderboard",
      "1x XP multiplier",
      "Limited rewards",
      "Community access",
    ],
  },
  {
    id: "premium",
    name: "Grinder",
    tagline: "Serious about growth",
    icon: "⚡",
    badge: "🔥 Most Popular",
    color: "#6366f1",
    glow: "rgba(99,102,241,0.2)",
    border: "rgba(99,102,241,0.4)",
    monthlyPrice: 299,
    yearlyPrice: 199,
    cta: "Upgrade to Grinder",
    highlight: true,
    features: [
      "Full Challenges access",
      "Full Arena access",
      "Advanced Growth Plan",
      "Double XP ⚡ boost",
      "AI hint access (50/month)",
      "Better reward eligibility",
      "Streak boosters",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Elite Builder",
    tagline: "Built for top performers",
    icon: "👑",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.3)",
    monthlyPrice: 599,
    yearlyPrice: 399,
    cta: "Go Elite 👑",
    features: [
      "Everything in Grinder",
      "Elite leaderboard access",
      "Higher reward eligibility",
      "Priority AI access (200/month)",
      "Advanced analytics dashboard",
      "Exclusive missions",
      "Profile highlight 👑",
      "AI reward priority",
    ],
  },
  {
    id: "silicon",
    name: "Silicon",
    tagline: "The top 1% experience",
    icon: "💎",
    badge: "💎 Top 1%",
    color: "#00e5ff",
    glow: "rgba(0,229,255,0.15)",
    border: "rgba(0,229,255,0.35)",
    monthlyPrice: 999,
    yearlyPrice: 699,
    cta: "Enter Silicon 🚀",
    features: [
      "Everything in Elite",
      "Highest XP multiplier (5x)",
      "Silicon-exclusive leaderboard",
      "Priority rewards (cash + tools)",
      "Unlimited AI access",
      "Personalized growth strategy",
      "Profile featured globally",
      "Freelance & hiring opportunities",
      "Early feature access",
    ],
  },
];

const COMPARISON_FEATURES = [
  { label: "Daily Challenges",    free: "5/day",    premium: "Unlimited", pro: "Unlimited", silicon: "Unlimited" },
  { label: "Practice Arena",      free: "Limited",  premium: "Full",      pro: "Full",      silicon: "Full + Elite" },
  { label: "Growth Plan",         free: "Basic",    premium: "Advanced",  pro: "Advanced",  silicon: "Personalized" },
  { label: "AI Usage",            free: "—",        premium: "50/month",  pro: "200/month", silicon: "Unlimited" },
  { label: "XP Multiplier",       free: "1×",       premium: "2×",        pro: "3×",        silicon: "5×" },
  { label: "Rewards",             free: "Limited",  premium: "Better",    pro: "High",      silicon: "Priority" },
  { label: "Analytics",           free: "—",        premium: "Basic",     pro: "Advanced",  silicon: "Full" },
  { label: "Leaderboard",         free: "Standard", premium: "Standard",  pro: "Elite",     silicon: "Silicon" },
];

const AI_TOOLS = [
  { name: "ChatGPT", icon: "🤖", color: "#10a37f" },
  { name: "Claude",  icon: "✦",  color: "#d97706" },
  { name: "Gemini",  icon: "✦",  color: "#4285f4" },
  { name: "Notion AI",icon: "📝", color: "#ffffff" },
  { name: "Canva Pro",icon: "🎨", color: "#7c3aed" },
  { name: "Kling AI", icon: "🎬", color: "#ef4444" },
];

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const colors = ["#6366f1","#00e5ff","#f59e0b","#22c55e","#f97316","#ec4899"];
  const pieces = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${((i * 37 + 11) % 95) + 2}%`,
      delay: `${(i % 10) * 0.15}s`,
      duration: `${2 + (i % 5) * 0.4}s`,
      size: `${6 + (i % 4) * 2}px`,
      rotate: `${(i * 45) % 360}deg`,
    }));
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000, overflow: "hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          top: "-20px",
          left: p.left,
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: "2px",
          transform: `rotate(${p.rotate})`,
          animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ── Checkout Modal ────────────────────────────────────────────────────────────
function CheckoutModal({ plan, billing, onClose }: {
  plan: Plan;
  billing: BillingCycle;
  onClose: () => void;
}) {
  const [step, setStep] = useState<CheckoutStep>("details");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("upi");
  const [upiId, setUpiId] = useState("");
  const [name, setName] = useState("Surinder Kumar");
  const [email, setEmail] = useState("surinder@example.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [showConfetti, setShowConfetti] = useState(false);
  const price = billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const saving = billing === "yearly" ? Math.round(((plan.monthlyPrice - plan.yearlyPrice) / plan.monthlyPrice) * 100) : 0;

  const handlePay = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("success");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }, 2200);
  };

  return (
    <>
      {showConfetti && <Confetti />}
      <div style={co.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={co.modal}>

          {/* Header */}
          <div style={co.header}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.4rem" }}>{plan.icon}</span>
              <div>
                <div style={{ fontSize: "0.72rem", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>GrowthOS Pay</div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "white", fontFamily: "'Rajdhani',sans-serif" }}>{plan.name} Plan</div>
              </div>
            </div>
            <button style={co.closeBtn} onClick={onClose}>✕</button>
          </div>

          {/* Price summary */}
          <div style={{ ...co.priceBand, borderColor: plan.border, background: plan.glow }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {billing === "yearly" ? "Yearly Plan (billed annually)" : "Monthly Plan"}
              </div>
              {billing === "yearly" && plan.monthlyPrice > 0 && (
                <div style={{ fontSize: "0.72rem", color: "#22c55e", marginTop: "2px" }}>
                  You save {saving}% vs monthly
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" as const }}>
              {billing === "yearly" && plan.monthlyPrice > 0 && (
                <div style={{ fontSize: "0.8rem", color: "#475569", textDecoration: "line-through" }}>
                  ₹{plan.monthlyPrice}/mo
                </div>
              )}
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.8rem", fontWeight: 800, color: plan.color }}>
                {price === 0 ? "FREE" : `₹${price}`}
                {price > 0 && <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 400 }}>/mo</span>}
              </div>
            </div>
          </div>

          {/* Steps */}
          {step === "details" && (
            <div style={co.body}>
              <div style={co.stepTitle}>Your Details</div>
              {[
                { label: "Full Name", value: name, setter: setName, type: "text" },
                { label: "Email", value: email, setter: setEmail, type: "email" },
                { label: "Phone", value: phone, setter: setPhone, type: "tel" },
              ].map(field => (
                <div key={field.label} style={co.fieldWrap}>
                  <label style={co.label}>{field.label}</label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    style={co.input}
                  />
                </div>
              ))}
              <button style={{ ...co.primaryBtn, background: `linear-gradient(135deg,${plan.color},${plan.color}cc)` }}
                onClick={() => setStep("payment")}>
                Continue to Payment →
              </button>
            </div>
          )}

          {step === "payment" && (
            <div style={co.body}>
              <div style={co.stepTitle}>Choose Payment Method</div>

              {/* Payment method tabs */}
              <div style={co.methodTabs}>
                {(["upi","card","wallet"] as PaymentMethod[]).map(m => (
                  <button key={m} style={{ ...co.methodTab, ...(payMethod === m ? { ...co.methodTabActive, borderColor: plan.color, color: plan.color } : {}) }}
                    onClick={() => setPayMethod(m)}>
                    {m === "upi" ? "📱 UPI" : m === "card" ? "💳 Card" : "👝 Wallet"}
                  </button>
                ))}
              </div>

              {/* UPI */}
              {payMethod === "upi" && (
                <div>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                    {[
                      { name: "GPay", bg: "#fff", color: "#1a73e8" },
                      { name: "PhonePe", bg: "#5f259f", color: "white" },
                      { name: "Paytm", bg: "#00baf2", color: "white" },
                    ].map(app => (
                      <button key={app.name} style={{ ...co.upiApp, background: app.bg, color: app.color }}>
                        {app.name}
                      </button>
                    ))}
                  </div>
                  <div style={co.fieldWrap}>
                    <label style={co.label}>Or enter UPI ID</label>
                    <input placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} style={co.input} />
                  </div>
                </div>
              )}

              {/* Card */}
              {payMethod === "card" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={co.fieldWrap}>
                    <label style={co.label}>Card Number</label>
                    <input placeholder="4242 4242 4242 4242" style={co.input} />
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...co.fieldWrap, flex: 1 }}>
                      <label style={co.label}>Expiry</label>
                      <input placeholder="MM/YY" style={co.input} />
                    </div>
                    <div style={{ ...co.fieldWrap, flex: 1 }}>
                      <label style={co.label}>CVV</label>
                      <input placeholder="•••" style={co.input} type="password" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    {["VISA", "MC", "AMEX"].map(c => (
                      <span key={c} style={co.cardBadge}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Wallet */}
              {payMethod === "wallet" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {["Paytm Wallet", "Amazon Pay", "Mobikwik", "Freecharge"].map(w => (
                    <button key={w} style={co.walletOption}>{w}</button>
                  ))}
                </div>
              )}

              <button
                style={{ ...co.primaryBtn, background: `linear-gradient(135deg,${plan.color},${plan.color}aa)`, marginTop: "16px" }}
                onClick={handlePay}>
                🔒 Pay {price === 0 ? "Free" : `₹${price}`} →
              </button>
              <div style={co.trustNote}>🔒 Secure Payment • Powered by GrowthOS Pay</div>
            </div>
          )}

          {step === "processing" && (
            <div style={{ ...co.body, alignItems: "center", textAlign: "center" as const, padding: "48px 24px" }}>
              <div style={co.processingOrb}>
                <div style={co.orbRing1} />
                <div style={co.orbRing2} />
                <div style={{ position: "relative", zIndex: 2, fontSize: "2rem" }}>💳</div>
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "white", marginBottom: "8px" }}>
                Processing Payment...
              </div>
              <div style={{ fontSize: "0.82rem", color: "#475569" }}>Please wait, do not close this window</div>
              <div style={co.progressBar}>
                <div style={co.progressFill} />
              </div>
            </div>
          )}

          {step === "success" && (
            <div style={{ ...co.body, alignItems: "center", textAlign: "center" as const, padding: "40px 24px" }}>
              <div style={co.successOrb}>✅</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.6rem", fontWeight: 800, color: "#22c55e", marginBottom: "6px" }}>
                Payment Successful!
              </div>
              <div style={{ fontSize: "1rem", color: "white", marginBottom: "4px" }}>
                🎉 Welcome to <span style={{ color: plan.color, fontWeight: 700 }}>{plan.name}</span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#475569", marginBottom: "24px" }}>
                Your account has been upgraded. Premium features are now active.
              </div>
              <div style={{ ...co.badgeDisplay, background: plan.glow, borderColor: plan.border, color: plan.color }}>
                {plan.icon} {plan.name} Member
              </div>
              <button style={{ ...co.primaryBtn, background: `linear-gradient(135deg,${plan.color},${plan.color}aa)`, marginTop: "20px" }}
                onClick={onClose}>
                Start Grinding 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [activatedPlan, setActivatedPlan] = useState<PlanId | null>(null);

  const handleCTA = (plan: Plan) => {
    if (plan.id === "free") {
      window.location.href = "/signup";
      return;
    }
    setSelectedPlan(plan);
  };

  const handleCheckoutClose = () => {
    setSelectedPlan(null);
  };

  return (
    <div style={p.root}>
      {/* Background */}
      <div style={p.bg} />
      <div style={p.bgGrid} />
      <div style={p.bgGlow1} />
      <div style={p.bgGlow2} />
      <div style={p.bgGlow3} />

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal plan={selectedPlan} billing={billing} onClose={handleCheckoutClose} />
      )}

      {/* ── HERO ── */}
      <section style={p.hero}>
        <div style={p.heroTag}>
          <span>🚀</span>
          <span>Level Up Your Growth</span>
        </div>
        <h1 style={p.heroTitle}>
          Choose Your{" "}
          <span style={{ background: "linear-gradient(135deg,#6366f1,#00e5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Growth Level
          </span>
        </h1>
        <p style={p.heroSub}>From beginner to top 1% — unlock your full potential</p>

        {/* Billing Toggle */}
        <div style={p.toggleWrap}>
          <span style={{ fontSize: "0.88rem", color: billing === "monthly" ? "white" : "#475569", fontWeight: billing === "monthly" ? 700 : 400 }}>Monthly</span>
          <button style={p.toggleBtn} onClick={() => setBilling(b => b === "monthly" ? "yearly" : "monthly")}>
            <div style={{ ...p.toggleKnob, transform: billing === "yearly" ? "translateX(24px)" : "translateX(2px)" }} />
          </button>
          <span style={{ fontSize: "0.88rem", color: billing === "yearly" ? "white" : "#475569", fontWeight: billing === "yearly" ? 700 : 400 }}>
            Yearly
          </span>
          {billing === "yearly" && (
            <span style={p.saveBadge}>Save up to 30%</span>
          )}
        </div>
      </section>

      {/* ── PRICING CARDS ── */}
      <section style={p.cardsSection}>
        <div style={p.cardsGrid}>
          {PLANS.map((plan, idx) => {
            const price = billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const saving = billing === "yearly" && plan.monthlyPrice > 0
              ? Math.round(((plan.monthlyPrice - plan.yearlyPrice) / plan.monthlyPrice) * 100)
              : 0;

            return (
              <div key={plan.id} style={{
                ...p.card,
                borderColor: plan.highlight ? plan.border : "rgba(255,255,255,0.06)",
                background: plan.highlight ? `linear-gradient(180deg,${plan.glow} 0%,rgba(6,15,34,0.95) 100%)` : "rgba(6,15,34,0.8)",
                transform: plan.highlight ? "scale(1.03)" : "none",
                boxShadow: plan.highlight ? `0 0 40px ${plan.glow}, 0 20px 60px rgba(0,0,0,0.5)` : "0 8px 32px rgba(0,0,0,0.3)",
                zIndex: plan.highlight ? 2 : 1,
                animationDelay: `${idx * 0.1}s`,
              }}>
                {/* Badge */}
                {plan.badge && (
                  <div style={{ ...p.planBadge, background: plan.highlight ? plan.color : "rgba(0,229,255,0.15)", color: plan.highlight ? "#04070f" : "#00e5ff" }}>
                    {plan.badge}
                  </div>
                )}

                {/* Plan header */}
                <div style={p.planHeader}>
                  <span style={{ fontSize: "2rem" }}>{plan.icon}</span>
                  <div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.3rem", fontWeight: 800, color: "white" }}>{plan.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>{plan.tagline}</div>
                  </div>
                </div>

                {/* Price */}
                <div style={p.priceRow}>
                  {billing === "yearly" && plan.monthlyPrice > 0 && (
                    <span style={{ fontSize: "0.9rem", color: "#334155", textDecoration: "line-through", marginRight: "6px" }}>₹{plan.monthlyPrice}</span>
                  )}
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "2.8rem", fontWeight: 900, color: price === 0 ? "#22c55e" : plan.color, lineHeight: 1 }}>
                    {price === 0 ? "FREE" : `₹${price}`}
                  </span>
                  {price > 0 && <span style={{ fontSize: "0.8rem", color: "#475569", marginLeft: "4px", alignSelf: "flex-end", paddingBottom: "6px" }}>/mo</span>}
                </div>
                {billing === "yearly" && saving > 0 && (
                  <div style={{ fontSize: "0.72rem", color: "#22c55e", marginBottom: "16px", fontWeight: 700 }}>
                    💰 Save {saving}% vs monthly
                  </div>
                )}

                {/* Features */}
                <div style={p.featureList}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={p.featureItem}>
                      <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  style={{
                    ...p.ctaBtn,
                    background: plan.highlight
                      ? `linear-gradient(135deg,${plan.color},${plan.color}cc)`
                      : `rgba(${plan.id === "free" ? "34,197,94" : plan.id === "pro" ? "245,158,11" : "0,229,255"},0.12)`,
                    color: plan.highlight ? "#04070f" : plan.color,
                    border: plan.highlight ? "none" : `1px solid ${plan.border}`,
                    boxShadow: plan.highlight ? `0 0 20px ${plan.glow}` : "none",
                    fontWeight: 800,
                  }}
                  onClick={() => handleCTA(plan)}>
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FEATURE COMPARISON TABLE ── */}
      <section style={p.section}>
        <div style={p.sectionTag}>Complete Comparison</div>
        <h2 style={p.sectionTitle}>What's included in each level</h2>
        <div style={p.tableWrap}>
          <table style={p.table}>
            <thead>
              <tr>
                <th style={{ ...p.th, textAlign: "left" as const, color: "#475569" }}>Feature</th>
                {PLANS.map(plan => (
                  <th key={plan.id} style={{ ...p.th, color: plan.color }}>
                    {plan.icon} {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <td style={{ ...p.td, color: "#94a3b8", textAlign: "left" as const, fontWeight: 500 }}>{row.label}</td>
                  {[row.free, row.premium, row.pro, row.silicon].map((val, j) => (
                    <td key={j} style={{ ...p.td, color: val === "—" ? "#334155" : "white", fontWeight: val !== "—" ? 600 : 400 }}>
                      {val === "Unlimited" ? <span style={{ color: "#22c55e" }}>✓ {val}</span> : val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── AI TOOLS VALUE ── */}
      <section style={p.section}>
        <div style={p.sectionTag}>Exclusive Access</div>
        <h2 style={p.sectionTitle}>Unlock AI Power Tools 🎁</h2>
        <p style={p.sectionSub}>Earn or unlock access to the world's most powerful AI tools through GrowthOS rewards.</p>
        <div style={p.toolsGrid}>
          {AI_TOOLS.map((tool, i) => (
            <div key={i} style={{ ...p.toolCard, animationDelay: `${i * 0.08}s` }}>
              <div style={{ ...p.toolIcon, color: tool.color }}>{tool.icon}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "white" }}>{tool.name}</div>
              <div style={{ fontSize: "0.68rem", color: "#475569", marginTop: "2px" }}>Earn via rewards</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── VALUE PROPOSITION ── */}
      <section style={p.section}>
        <div style={p.valueWrap}>
          <div style={{ flex: 1 }}>
            <div style={p.sectionTag}>What You Actually Get</div>
            <h2 style={{ ...p.sectionTitle, textAlign: "left" as const, marginBottom: "20px" }}>Not a course. Not passive learning.</h2>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
              {[
                { icon: "⚡", title: "Daily Execution System", desc: "Real tasks generated for your specific goal. Every single day." },
                { icon: "🏆", title: "Real Competition", desc: "Compete with peers on leaderboards. Rank up or fall behind." },
                { icon: "📈", title: "Real Progress Tracking", desc: "AI tracks your growth and adjusts your plan in real time." },
                { icon: "🎁", title: "Real Rewards", desc: "Top performers earn actual AI tools, cash prizes, and opportunities." },
              ].map((item, i) => (
                <div key={i} style={p.valueItem}>
                  <div style={p.valueIcon}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "white", marginBottom: "2px" }}>{item.title}</div>
                    <div style={{ fontSize: "0.78rem", color: "#475569", lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: "10px" }}>
            {[
              { stat: "10,000+", label: "Users grinding daily", icon: "👥" },
              { stat: "Top 1%", label: "Unlocking AI rewards", icon: "🤖" },
              { stat: "94%", label: "Report real improvement", icon: "📈" },
              { stat: "₹50L+", label: "In rewards distributed", icon: "💰" },
            ].map((s, i) => (
              <div key={i} style={p.statCard}>
                <span style={{ fontSize: "1.4rem" }}>{s.icon}</span>
                <div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: "white" }}>{s.stat}</div>
                  <div style={{ fontSize: "0.75rem", color: "#475569" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOCKED PREVIEW ── */}
      <section style={p.section}>
        <div style={p.sectionTag}>Premium Only</div>
        <h2 style={p.sectionTitle}>Features waiting to be unlocked</h2>
        <div style={p.lockedGrid}>
          {[
            { icon: "🏆", title: "Elite League", desc: "Compete only with top-tier performers for exclusive prizes." },
            { icon: "🤖", title: "AI Rewards Priority", desc: "First access to AI tool credits and hardware rewards." },
            { icon: "📊", title: "Advanced Insights", desc: "Deep analytics on your learning patterns and weak spots." },
            { icon: "💎", title: "Silicon Network", desc: "Direct access to hiring opportunities and freelance projects." },
          ].map((item, i) => (
            <div key={i} style={p.lockedCard}>
              <div style={p.lockedOverlay}>
                <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>🔒</div>
                <div style={{ fontSize: "0.78rem", color: "#475569" }}>Unlock to access</div>
              </div>
              <div style={{ filter: "blur(3px)", pointerEvents: "none" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{item.icon}</div>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "white", marginBottom: "6px" }}>{item.title}</div>
                <div style={{ fontSize: "0.78rem", color: "#475569" }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center" as const, marginTop: "24px" }}>
          <button style={p.unlockBtn} onClick={() => handleCTA(PLANS[1])}>
            Unlock Full Power ⚡
          </button>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={p.finalCTA}>
        <div style={p.finalGlow} />
        <div style={p.sectionTag}>Join 10,000+ Grinders</div>
        <h2 style={{ ...p.heroTitle, marginBottom: "12px" }}>
          Stop planning.{" "}
          <span style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Start executing.
          </span>
        </h2>
        <p style={p.heroSub}>Your next level is one click away.</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" as const, marginTop: "28px" }}>
          <button style={p.finalPrimaryBtn} onClick={() => handleCTA(PLANS[1])}>
            Upgrade Now 🚀
          </button>
          <Link href="/signup">
            <button style={p.finalSecondaryBtn}>Start Free →</button>
          </Link>
        </div>
      </section>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes orbSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes orbRevSpin { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes progressAnim { from{width:0%} to{width:100%} }
        @keyframes successPop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        input { font-family: 'DM Sans', sans-serif; }
        button { font-family: 'DM Sans', sans-serif; }
      `}</style>
    </div>
  );
}

// ── Main Page Styles ───────────────────────────────────────────────────────────
const p: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif", position: "relative", overflowX: "hidden", paddingTop: "80px" },
  bg: { position: "fixed", inset: 0, background: "linear-gradient(135deg,#020818 0%,#060f22 50%,#02091a 100%)", zIndex: 0 },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px)", backgroundSize: "48px 48px", zIndex: 0 },
  bgGlow1: { position: "fixed", top: "-20%", left: "-10%", width: "700px", height: "700px", borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)", zIndex: 0, pointerEvents: "none" },
  bgGlow2: { position: "fixed", bottom: "-20%", right: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle,rgba(0,229,255,0.06) 0%,transparent 70%)", zIndex: 0, pointerEvents: "none" },
  bgGlow3: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "800px", height: "400px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(99,102,241,0.04) 0%,transparent 70%)", zIndex: 0, pointerEvents: "none" },

  hero: { position: "relative", zIndex: 1, textAlign: "center" as const, padding: "60px 20px 40px", maxWidth: "900px", margin: "0 auto" },
  heroTag: { display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "20px", padding: "5px 16px", fontSize: "0.78rem", color: "#818cf8", fontWeight: 700, marginBottom: "20px", letterSpacing: "0.04em" },
  heroTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "clamp(2.2rem,5vw,3.5rem)", fontWeight: 900, color: "white", margin: "0 0 14px", lineHeight: 1.1 },
  heroSub: { fontSize: "1.05rem", color: "#475569", margin: "0 0 28px", lineHeight: 1.6 },

  toggleWrap: { display: "inline-flex", alignItems: "center", gap: "12px", padding: "8px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "50px" },
  toggleBtn: { position: "relative", width: "50px", height: "26px", background: "rgba(99,102,241,0.3)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "50px", cursor: "pointer", transition: "background 0.3s" },
  toggleKnob: { position: "absolute", top: "2px", width: "20px", height: "20px", borderRadius: "50%", background: "#6366f1", transition: "transform 0.3s", boxShadow: "0 0 8px rgba(99,102,241,0.6)" },
  saveBadge: { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px" },

  cardsSection: { position: "relative", zIndex: 1, padding: "20px 20px 60px", maxWidth: "1300px", margin: "0 auto" },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "20px", alignItems: "start" },
  card: { position: "relative", display: "flex", flexDirection: "column" as const, padding: "28px 24px", borderRadius: "20px", border: "1px solid", backdropFilter: "blur(20px)", transition: "all 0.3s", animation: "fadeUp 0.6s ease forwards" },
  planBadge: { position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "4px 16px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap" as const, letterSpacing: "0.04em" },
  planHeader: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", marginTop: "8px" },
  priceRow: { display: "flex", alignItems: "baseline", gap: "0", marginBottom: "6px" },
  featureList: { flex: 1, display: "flex", flexDirection: "column" as const, gap: "8px", margin: "16px 0 24px" },
  featureItem: { display: "flex", gap: "8px", alignItems: "flex-start" },
  ctaBtn: { width: "100%", padding: "13px", borderRadius: "12px", fontSize: "0.88rem", cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.02em" },

  section: { position: "relative", zIndex: 1, padding: "60px 20px", maxWidth: "1100px", margin: "0 auto", textAlign: "center" as const },
  sectionTag: { display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "20px", padding: "4px 14px", fontSize: "0.72rem", color: "#818cf8", fontWeight: 700, marginBottom: "14px", letterSpacing: "0.05em", textTransform: "uppercase" as const },
  sectionTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 800, color: "white", margin: "0 0 10px", textAlign: "center" as const },
  sectionSub: { fontSize: "0.9rem", color: "#475569", maxWidth: "560px", margin: "0 auto 32px", lineHeight: 1.7 },

  tableWrap: { overflowX: "auto", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(6,15,34,0.6)", backdropFilter: "blur(10px)" },
  table: { width: "100%", borderCollapse: "collapse" as const, minWidth: "600px" },
  th: { padding: "14px 16px", fontSize: "0.82rem", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)", textAlign: "center" as const },
  td: { padding: "12px 16px", fontSize: "0.82rem", borderBottom: "1px solid rgba(255,255,255,0.04)", textAlign: "center" as const },

  toolsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "14px", maxWidth: "800px", margin: "0 auto" },
  toolCard: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "8px", padding: "20px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", transition: "all 0.2s", animation: "fadeUp 0.5s ease forwards" },
  toolIcon: { fontSize: "1.8rem" },

  valueWrap: { display: "flex", gap: "40px", alignItems: "flex-start", textAlign: "left" as const, flexWrap: "wrap" as const },
  valueItem: { display: "flex", gap: "14px", alignItems: "flex-start", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px" },
  valueIcon: { fontSize: "1.4rem", flexShrink: 0, marginTop: "2px" },
  statCard: { display: "flex", gap: "14px", alignItems: "center", padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" },

  lockedGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "16px" },
  lockedCard: { position: "relative", padding: "24px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", textAlign: "left" as const, overflow: "hidden" },
  lockedOverlay: { position: "absolute", inset: 0, background: "rgba(2,8,24,0.6)", backdropFilter: "blur(2px)", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", zIndex: 2, borderRadius: "16px" },
  unlockBtn: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "13px 28px", background: "linear-gradient(135deg,#6366f1,#3b82f6)", border: "none", borderRadius: "12px", color: "white", fontSize: "0.9rem", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 24px rgba(99,102,241,0.4)" },

  finalCTA: { position: "relative", zIndex: 1, textAlign: "center" as const, padding: "80px 20px", overflow: "hidden" },
  finalGlow: { position: "absolute", inset: 0, background: "radial-gradient(ellipse at center,rgba(99,102,241,0.1) 0%,transparent 70%)", pointerEvents: "none" },
  finalPrimaryBtn: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "15px 36px", background: "linear-gradient(135deg,#6366f1,#00e5ff)", border: "none", borderRadius: "14px", color: "#04070f", fontSize: "1rem", fontWeight: 900, cursor: "pointer", boxShadow: "0 0 30px rgba(99,102,241,0.5)", transition: "all 0.2s", fontFamily: "'Rajdhani',sans-serif" },
  finalSecondaryBtn: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "15px 28px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", color: "#94a3b8", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" },
};

// ── Checkout Modal Styles ──────────────────────────────────────────────────────
const co: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modal: { position: "relative", width: "min(460px,100%)", background: "rgba(4,7,15,0.98)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.8)", animation: "fadeUp 0.3s ease" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  closeBtn: { width: "28px", height: "28px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" },
  priceBand: { margin: "0 24px 4px", padding: "14px 16px", borderRadius: "12px", border: "1px solid", display: "flex", alignItems: "center", justifyContent: "space-between" },
  body: { padding: "20px 24px 24px", display: "flex", flexDirection: "column" as const, gap: "12px" },
  stepTitle: { fontSize: "0.82rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: "4px" },
  fieldWrap: { display: "flex", flexDirection: "column" as const, gap: "5px" },
  label: { fontSize: "0.72rem", color: "#475569", fontWeight: 600, letterSpacing: "0.04em" },
  input: { padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9px", color: "white", fontSize: "0.85rem", outline: "none", transition: "border-color 0.2s" },
  primaryBtn: { width: "100%", padding: "13px", borderRadius: "12px", border: "none", color: "white", fontSize: "0.9rem", fontWeight: 800, cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.02em" },
  methodTabs: { display: "flex", gap: "8px" },
  methodTab: { flex: 1, padding: "9px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "9px", color: "#475569", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" },
  methodTabActive: { background: "rgba(99,102,241,0.1)" },
  upiApp: { flex: 1, padding: "9px", borderRadius: "9px", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" },
  cardBadge: { padding: "3px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "0.65rem", color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" },
  walletOption: { padding: "11px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "9px", color: "#94a3b8", fontSize: "0.83rem", fontWeight: 600, cursor: "pointer", textAlign: "left" as const, transition: "all 0.2s" },
  trustNote: { textAlign: "center" as const, fontSize: "0.72rem", color: "#334155", marginTop: "4px" },
  processingOrb: { position: "relative", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" },
  orbRing1: { position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#6366f1", animation: "orbSpin 1.2s linear infinite" },
  orbRing2: { position: "absolute", inset: "10px", borderRadius: "50%", border: "2px solid transparent", borderBottomColor: "#00e5ff", animation: "orbRevSpin 0.9s linear infinite" },
  progressBar: { width: "100%", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginTop: "20px" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#6366f1,#00e5ff)", borderRadius: "2px", animation: "progressAnim 2s ease forwards" },
  successOrb: { fontSize: "3.5rem", animation: "successPop 0.6s ease forwards", marginBottom: "12px" },
  badgeDisplay: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 20px", borderRadius: "20px", border: "1px solid", fontSize: "0.88rem", fontWeight: 700 },
};