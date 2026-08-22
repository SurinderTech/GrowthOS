"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveToken, saveUser, apiVerifyGoogleCode } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import BrandLogo from "@/components/ui/BrandLogo";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();

  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const hasTriggeredRef = useRef(false);

  // Timer to cycle through friendly loading messages during backend cold start
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerification = async (code: string) => {
    try {
      setErrorMsg(null);
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await apiVerifyGoogleCode(code, redirectUri);

      if (res.access_token && res.user) {
        saveToken(res.access_token);
        saveUser(res.user);
        setUser(res.user);
        toast.success("Welcome to GrowthOS! 🎉");
        const nextUrl = res.user.onboarding_completed ? "/dashboard" : "/onboarding";
        router.push(nextUrl);
      } else {
        throw new Error("Invalid response format from authentication server.");
      }
    } catch (err: any) {
      console.error("Google Auth verification failed:", err);
      const message = err.message || "Google sign-in couldn't be completed. Please try again.";
      setErrorMsg(message);
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const code = params.get("code");
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      setErrorMsg(decodeURIComponent(error));
      return;
    }

    if (code) {
      handleVerification(code);
      return;
    }

    if (token) {
      // Support legacy backend direct token return if present
      saveToken(token);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((user) => {
          saveUser(user);
          setUser(user);
          toast.success("Welcome to GrowthOS! 🎉");
          router.push("/dashboard");
        })
        .catch(() => {
          toast.error("Login succeeded but failed to fetch profile details");
          router.push("/dashboard");
        });
      return;
    }

    // No code or token provided
    setErrorMsg("No authorization code or session token received.");
  }, [params]);

  const onRetry = () => {
    const code = params.get("code");
    if (code) {
      setIsRetrying(true);
      setElapsed(0);
      handleVerification(code);
    } else {
      router.push("/login");
    }
  };

  // Dynamic progress text based on cold-start elapsed duration
  const getStatusText = () => {
    if (elapsed < 4) return "Connecting to GrowthOS...";
    if (elapsed < 9) return "Starting your secure session...";
    if (elapsed < 16) return "Waking up cloud workspace resources...";
    return "Almost ready. Finalizing authentication...";
  };

  return (
    <div className="gos-auth-callback-container">
      <style>{`
        .gos-auth-callback-container {
          min-height: 100vh;
          background: #060913;
          background-image: 
            radial-gradient(circle at 50% 30%, rgba(0, 229, 255, 0.08) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.06) 0%, transparent 50%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: var(--font-sans, system-ui, sans-serif);
          color: #ffffff;
        }

        .gos-auth-card {
          width: 100%;
          max-width: 440px;
          background: rgba(13, 18, 30, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 1px rgba(255, 255, 255, 0.2);
        }

        .gos-loader-spinner-wrapper {
          position: relative;
          margin: 32px 0 24px 0;
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
        }

        .gos-spinner-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid rgba(0, 229, 255, 0.15);
          border-top-color: #00e5ff;
          border-right-color: #7c3aed;
          animation: gosSpin 1.1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }

        .gos-spinner-glow {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 229, 255, 0.3) 0%, transparent 70%);
          filter: blur(6px);
          animation: gosPulse 2s ease-in-out infinite;
        }

        .gos-status-text {
          font-size: 1.05rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 8px;
        }

        .gos-sub-status-text {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.4;
        }

        .gos-progress-bar-bg {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          margin-top: 24px;
          overflow: hidden;
          position: relative;
        }

        .gos-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00e5ff, #7c3aed);
          border-radius: 999px;
          transition: width 1s linear;
        }

        .gos-error-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .gos-error-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          display: grid;
          place-items: center;
          margin-bottom: 8px;
        }

        .gos-btn-primary {
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #00e5ff 0%, #00b4d8 100%);
          color: #060913;
          font-size: 0.95rem;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(0, 229, 255, 0.3);
        }

        .gos-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 229, 255, 0.4);
        }

        .gos-btn-secondary {
          width: 100%;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          margin-top: 10px;
        }

        .gos-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        @keyframes gosSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes gosPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>

      <div className="gos-auth-card">
        <BrandLogo size="md" showSubtitle={true} />

        {errorMsg ? (
          <div className="gos-error-box" style={{ marginTop: "28px" }}>
            <div className="gos-error-icon-wrap">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#f87171" }}>
                Authentication Issue
              </h3>
              <p className="gos-sub-status-text" style={{ maxWidth: "340px" }}>
                {errorMsg}
              </p>
            </div>

            <div style={{ width: "100%", marginTop: "12px" }}>
              <button className="gos-btn-primary" onClick={onRetry} disabled={isRetrying}>
                <RefreshCw size={16} className={isRetrying ? "animate-spin" : ""} />
                <span>{isRetrying ? "Retrying..." : "Retry Authentication"}</span>
              </button>

              <button className="gos-btn-secondary" onClick={() => router.push("/login")}>
                <ArrowLeft size={16} />
                <span>Back to Login</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="gos-loader-spinner-wrapper">
              <div className="gos-spinner-glow" />
              <div className="gos-spinner-ring" />
            </div>

            <div className="gos-status-text">{getStatusText()}</div>
            <div className="gos-sub-status-text">
              Securing your identity & synchronizing your GrowthOS profile...
            </div>

            <div className="gos-progress-bar-bg">
              <div
                className="gos-progress-bar-fill"
                style={{ width: `${Math.min(100, Math.max(12, (elapsed / 25) * 100))}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060913",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BrandLogo size="md" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Loader />}>
      <CallbackInner />
    </Suspense>
  );
}