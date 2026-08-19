"use client";
// app/verify-email/page.tsx — GrowthOS Email Verification & Unverified Prompt Screen

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Mail, CheckCircle2, AlertTriangle, Loader2, ArrowRight, RefreshCw, LogOut, ShieldCheck, Brain } from "lucide-react";
import { apiVerifyEmail, apiResendVerification, saveToken, saveUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/* ── Animated Neon Brain Orb ── */
function BrainOrb() {
  return (
    <>
      <style>{`
        @keyframes spinSlow  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes spinRev   { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
        @keyframes orbPulse  { 0%,100% { opacity:.6; transform:scale(.96); } 50% { opacity:1; transform:scale(1.05); } }
        @keyframes orbFloat  { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-7px); } }
        @keyframes conicSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      <div style={{ animation: "orbFloat 4s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: "clamp(80px,28vw,140px)", height: "clamp(80px,28vw,140px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: "clamp(-10px,-4vw,-18px)", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(59,130,246,0.22) 45%, transparent 70%)", animation: "orbPulse 3s ease-in-out infinite", zIndex: 0 }} />
          <div style={{ position: "absolute", inset: "clamp(-5px,-2vw,-8px)", borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 65%)", zIndex: 0 }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 0deg, #6366f1 0deg, #3b82f6 60deg, #06b6d4 120deg, #818cf8 180deg, transparent 181deg, transparent 360deg)", animation: "conicSpin 3s linear infinite", zIndex: 1, filter: "blur(0.5px)" }} />
          <div style={{ position: "absolute", inset: "clamp(2px,0.8vw,4px)", borderRadius: "50%", background: "#0d1f3c", zIndex: 1 }} />
          <div style={{ position: "absolute", inset: "clamp(6px,2vw,10px)", borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "#818cf8", borderRightColor: "#3b82f6", animation: "spinSlow 2.8s linear infinite", filter: "drop-shadow(0 0 5px rgba(129,140,248,0.85))", zIndex: 2 }} />
          <div style={{ position: "absolute", inset: "clamp(16px,5vw,24px)", borderRadius: "50%", border: "1.5px solid transparent", borderBottomColor: "#06b6d4", borderLeftColor: "rgba(6,182,212,0.4)", animation: "spinRev 2s linear infinite", filter: "drop-shadow(0 0 5px rgba(6,182,212,0.8))", zIndex: 2 }} />
          <div style={{ position: "relative", zIndex: 3, width: "clamp(40px,14vw,64px)", height: "clamp(40px,14vw,64px)", borderRadius: "50%", background: "radial-gradient(circle at 38% 35%, rgba(147,197,253,0.22) 0%, rgba(13,31,60,0.97) 65%)", border: "1.5px solid rgba(129,140,248,0.55)", display: "flex", alignItems: "center", justifyContent: "center", animation: "orbPulse 2.2s ease-in-out infinite", backdropFilter: "blur(12px)", boxShadow: "0 0 32px rgba(99,102,241,0.6), inset 0 0 22px rgba(99,102,241,0.18)" }}>
            <Brain style={{ width: "clamp(16px,5vw,26px)", height: "clamp(16px,5vw,26px)", color: "#a5b4fc", filter: "drop-shadow(0 0 8px rgba(165,180,252,0.9))" }} />
          </div>
        </div>
      </div>
    </>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, logout } = useAuth();

  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email") || user?.email || "";

  const [verifying, setVerifying] = useState<boolean>(!!tokenParam);
  const [success, setSuccess]     = useState<boolean>(false);
  const [errorMsg, setErrorMsg]   = useState<string>("");
  const [resending, setResending] = useState<boolean>(false);
  const [cooldown, setCooldown]   = useState<number>(0);

  // Handle Token Verification on Mount if token exists
  useEffect(() => {
    if (!tokenParam) return;

    let isMounted = true;
    async function doVerify() {
      setVerifying(true);
      try {
        const res = await apiVerifyEmail(tokenParam as string);
        if (!isMounted) return;

        saveToken(res.access_token);
        saveUser(res.user);
        setUser(res.user);

        setSuccess(true);
        toast.success("Email verified successfully! Welcome to GrowthOS 🎉");
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMsg(err.message || "Failed to verify email.");
        toast.error(err.message || "Invalid or expired verification link.");
      } finally {
        if (isMounted) setVerifying(false);
      }
    }

    doVerify();
    return () => { isMounted = false; };
  }, [tokenParam, setUser]);

  // Cooldown Timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await apiResendVerification(emailParam);
      toast.success(res.message || "Verification email sent successfully!");
      setCooldown(60); // 60s cooldown
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 40%, rgba(21,101,192,.22) 0%, transparent 60%), linear-gradient(135deg, #0d1f3c 0%, #0a1628 60%, #0d2547 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif"
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .gos-glass-box {
          width: 100%;
          max-width: 480px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 24px;
          padding: clamp(24px, 5vw, 40px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          text-align: center;
          color: white;
        }
        .gos-btn-primary {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #1565c0 0%, #1e88e5 100%);
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 700;
          color: white;
          cursor: pointer;
          transition: all 0.25s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 15px rgba(21, 101, 192, 0.35);
          font-family: 'Rajdhani', sans-serif;
        }
        .gos-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .gos-btn-secondary {
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.25s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .gos-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
        .gos-btn-secondary:not(:disabled):hover { background: rgba(255, 255, 255, 0.1); color: white; }
      `}</style>

      <div className="gos-glass-box">
        <div style={{ marginBottom: "24px" }}>
          <BrainOrb />
        </div>

        {/* State 1: Verifying Token */}
        {verifying && (
          <div>
            <Loader2 size={44} style={{ color: "#38bdf8", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>
              Verifying your email...
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
              Please wait while we validate your verification link.
            </p>
          </div>
        )}

        {/* State 2: Verification Successful */}
        {!verifying && success && (
          <div>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.15)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle2 size={36} style={{ color: "#22c55e" }} />
            </div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>
              Email Verified! 🚀
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: "28px", lineHeight: 1.6 }}>
              Your GrowthOS account is now fully active. You have complete access to your AI dashboard, practice arena, and personalized learning agents.
            </p>

            <button
              onClick={() => router.push(user?.onboarding_completed ? "/dashboard" : "/onboarding")}
              className="gos-btn-primary"
            >
              <span>CONTINUE TO GROWTHOS</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* State 3: Unverified Prompt / Link Error */}
        {!verifying && !success && (
          <div>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Mail size={32} style={{ color: "#f87171" }} />
            </div>

            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>
              Please Verify Your Email
            </h2>

            <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: "16px", lineHeight: 1.6 }}>
              We sent a verification link to{" "}
              <strong style={{ color: "#38bdf8", wordBreak: "break-all" }}>
                {emailParam || "your email address"}
              </strong>
              . Click the link in your email to verify your account and access GrowthOS.
            </p>

            {errorMsg && (
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "10px", padding: "10px 14px", marginBottom: "20px", fontSize: "0.82rem", color: "#fca5a5", display: "flex", alignItems: "center", gap: "8px", textAlign: "left" }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "16px", marginBottom: "24px", textAlign: "left", fontSize: "0.82rem", color: "#64748b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>
                <ShieldCheck size={16} style={{ color: "#38bdf8" }} />
                <span>Why email verification?</span>
              </div>
              Email verification prevents spam accounts and protects your GrowthOS AI career data and progress.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="gos-btn-secondary"
              >
                {resending ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    <span>Sending email...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Resend link in {cooldown}s</span>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>

              {user ? (
                <button
                  onClick={logout}
                  style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "8px" }}
                >
                  <LogOut size={14} />
                  <span>Log out & try another account</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  style={{ color: "#38bdf8", fontSize: "0.85rem", textDecoration: "none", fontWeight: 600, marginTop: "8px" }}
                >
                  Back to Sign In →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
