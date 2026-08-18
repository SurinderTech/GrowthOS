"use client";
// app/forgot-password/page.tsx — Email OTP Password Reset Flow

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Mail, Lock, KeyRound, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { requestForgotPasswordOTP, verifyForgotPasswordOTP, resetPasswordWithOTP } from "@/lib/api";

type Step = "request_otp" | "verify_otp" | "reset_password" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("request_otp");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Resend OTP countdown timer
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestForgotPasswordOTP(email.trim());
      toast.success(res.message || "OTP code sent to your email!");
      setStep("verify_otp");
      setResendTimer(60); // 60 seconds resend countdown
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const res = await requestForgotPasswordOTP(email.trim());
      toast.success(res.message || "New OTP code sent!");
      setResendTimer(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyForgotPasswordOTP(email.trim(), otpCode.trim());
      toast.success(res.message || "OTP code verified!");
      setStep("reset_password");
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordWithOTP(email.trim(), otpCode.trim(), newPassword.trim());
      toast.success(res.message || "Password reset successful!");
      setStep("success");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #22d3ee !important; box-shadow: 0 0 0 3px rgba(34,211,238,0.15) !important; outline: none; }
      `}</style>

      <div style={styles.card}>

        {/* Header Branding */}
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <ShieldCheck size={28} style={{ color: "#22d3ee" }} />
          </div>
          <h1 style={styles.title}>Password Recovery</h1>
          <p style={styles.subtitle}>
            {step === "request_otp" && "Enter your email address to receive a 6-digit OTP code"}
            {step === "verify_otp" && `Enter the 6-digit code sent to ${email}`}
            {step === "reset_password" && "Create a new strong password for your GrowthOS account"}
            {step === "success" && "Your password has been successfully updated"}
          </p>
        </div>

        {/* STEP 1: Request OTP */}
        {step === "request_otp" && (
          <form onSubmit={handleRequestOTP} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>EMAIL ADDRESS</label>
              <div style={styles.inputWrap}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} style={styles.mainBtn}>
              {loading ? (
                <span style={styles.btnRow}>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Sending Code...
                </span>
              ) : (
                "SEND VERIFICATION OTP"
              )}
            </button>

            <Link href="/login" style={styles.backLink}>
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === "verify_otp" && (
          <form onSubmit={handleVerifyOTP} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>6-DIGIT VERIFICATION CODE</label>
              <div style={styles.inputWrap}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  style={{ ...styles.input, letterSpacing: "6px", fontSize: "1.2rem", fontWeight: "bold" }}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading || otpCode.length !== 6} style={styles.mainBtn}>
              {loading ? (
                <span style={styles.btnRow}>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Verifying...
                </span>
              ) : (
                "VERIFY OTP CODE"
              )}
            </button>

            <div style={styles.resendRow}>
              {resendTimer > 0 ? (
                <span style={styles.timerText}>Resend code in {resendTimer}s</span>
              ) : (
                <button type="button" onClick={handleResendOTP} disabled={loading} style={styles.resendBtn}>
                  Didn't receive email? Resend OTP
                </button>
              )}
            </div>

            <button type="button" onClick={() => setStep("request_otp")} style={styles.backLinkBtn}>
              Change email address
            </button>
          </form>
        )}

        {/* STEP 3: Reset Password */}
        {step === "reset_password" && (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>NEW PASSWORD</label>
              <div style={styles.inputWrap}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>CONFIRM NEW PASSWORD</label>
              <div style={styles.inputWrap}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} style={styles.mainBtn}>
              {loading ? (
                <span style={styles.btnRow}>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Updating...
                </span>
              ) : (
                "RESET PASSWORD & LOGIN"
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Success */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={styles.successIconWrap}>
              <CheckCircle2 size={54} style={{ color: "#22c55e" }} />
            </div>
            <h2 style={styles.successTitle}>Password Updated 🎉</h2>
            <p style={styles.successDesc}>
              Your account password has been successfully changed. You can now log in using your new credentials.
            </p>

            <button onClick={() => router.push("/login")} style={{ ...styles.mainBtn, marginTop: "24px" }}>
              SIGN IN TO GROWTHOS →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#080e20",
    color: "#ffffff",
    padding: "24px",
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(34, 211, 238, 0.2)",
    borderRadius: "24px",
    padding: "40px 32px",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(34, 211, 238, 0.08)",
    animation: "fadeIn 0.35s ease-out",
  },
  header: {
    textAlign: "center",
    marginBottom: "28px",
  },
  iconCircle: {
    width: "60px",
    height: "60px",
    borderRadius: "18px",
    background: "rgba(34, 211, 238, 0.1)",
    border: "1px solid rgba(34, 211, 238, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#ffffff",
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: "0.86rem",
    color: "#94a3b8",
    lineHeight: 1.5,
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#38bdf8",
    letterSpacing: "0.05em",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "#64748b",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "13px 14px 13px 44px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "0.92rem",
    transition: "all 0.2s ease",
  },
  mainBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #0284c7, #22d3ee)",
    border: "none",
    borderRadius: "12px",
    color: "#030712",
    fontSize: "0.88rem",
    fontWeight: 800,
    letterSpacing: "0.04em",
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(34, 211, 238, 0.25)",
    transition: "transform 0.15s ease, opacity 0.15s ease",
    marginTop: "8px",
  },
  btnRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  backLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "0.82rem",
    color: "#94a3b8",
    textDecoration: "none",
    marginTop: "8px",
  },
  backLinkBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.8rem",
    cursor: "pointer",
    marginTop: "4px",
    textDecoration: "underline",
  },
  resendRow: {
    textAlign: "center",
    marginTop: "4px",
  },
  timerText: {
    fontSize: "0.8rem",
    color: "#64748b",
  },
  resendBtn: {
    background: "none",
    border: "none",
    color: "#22d3ee",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "underline",
  },
  successIconWrap: {
    margin: "0 auto 16px",
  },
  successTitle: {
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "#ffffff",
    margin: "0 0 8px",
  },
  successDesc: {
    fontSize: "0.88rem",
    color: "#94a3b8",
    lineHeight: 1.6,
  },
};
