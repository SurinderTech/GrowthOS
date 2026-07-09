// src/components/ui/PricingCard.tsx
'use client';

interface PricingCardProps {
  title: string;
  price: string;
  features: string[];
  isPopular?: boolean;
  onCTA: () => void;
}

export function PricingCard({ title, price, features, isPopular, onCTA }: PricingCardProps) {
  return (
    <div style={{
      padding: "32px 24px",
      background: isPopular ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))" : "rgba(255,255,255,0.03)",
      border: isPopular ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.07)",
      borderRadius: 24,
      position: "relative",
      transition: "all 0.3s ease"
    }}>
      {isPopular && (
        <div style={{
          position: "absolute",
          top: -12,
          left: "50%",
          transform: "translateX(-50%)",
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          padding: "4px 16px",
          borderRadius: 100,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1
        }}>
          MOST POPULAR
        </div>
      )}
      
      <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{title}</h3>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 42, fontWeight: 900 }}>{price}</span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>/month</span>
      </div>
      
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {features.map((feature, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            <span>✓</span> {feature}
          </li>
        ))}
      </ul>
      
      <button onClick={onCTA} style={{
        width: "100%",
        padding: "12px",
        borderRadius: 12,
        border: "none",
        background: isPopular ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.08)",
        color: "white",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s"
      }}>
        Get Started
      </button>
    </div>
  );
}