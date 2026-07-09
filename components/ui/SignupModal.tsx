// src/components/ui/SignupModal.tsx
'use client';

import { useState } from "react";

interface SignupModalProps {
  onClose: () => void;
}

export function SignupModal({ onClose }: SignupModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);

  const submit = () => {
    if (name && email) setDone(true);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 440, background: "linear-gradient(160deg,#0d0f1e,#111827)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 24, padding: 36, boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.07)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}>×</button>

        {!done ? (
          <>
            <div style={{ marginBottom: 28, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: "white", margin: "0 0 8px", letterSpacing: -0.5 }}>Start Building Your Future</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>Join thousands executing at a different level.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Your Name</label>
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Enter your name"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Email Address</label>
                <input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  type="email" 
                  placeholder="your@email.com"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <button onClick={submit} style={{ padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)", border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 4 }}>
                🔥 Start Building My Future
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "white", marginBottom: 12 }}>You're In, {name.split(" ")[0]}.</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6 }}>Your execution system is being built. Check your inbox for the next steps.</p>
            <button onClick={onClose} style={{ marginTop: 24, padding: "12px 32px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Back to GrowthOS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}