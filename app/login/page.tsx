"use client";
// app/login/page.tsx  — fully responsive (mobile-first)

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, Loader2, Brain } from "lucide-react";
import { apiLogin, saveToken, saveUser, loginWithGoogle, loginWithFacebook, loginWithLinkedIn } from "@/lib/api";
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

      <div style={{ animation:"orbFloat 4s ease-in-out infinite", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"relative", width:"clamp(80px,28vw,160px)", height:"clamp(80px,28vw,160px)", display:"flex", alignItems:"center", justifyContent:"center" }}>

          {/* Ambient bloom */}
          <div style={{ position:"absolute", inset:"clamp(-10px,-4vw,-18px)", borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(59,130,246,0.22) 45%, transparent 70%)", animation:"orbPulse 3s ease-in-out infinite", zIndex:0 }} />

          {/* Cyan glow */}
          <div style={{ position:"absolute", inset:"clamp(-5px,-2vw,-8px)", borderRadius:"50%", background:"radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 65%)", zIndex:0 }} />

          {/* Conic ring */}
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"conic-gradient(from 0deg, #6366f1 0deg, #3b82f6 60deg, #06b6d4 120deg, #818cf8 180deg, transparent 181deg, transparent 360deg)", animation:"conicSpin 3s linear infinite", zIndex:1, filter:"blur(0.5px)" }} />

          {/* Dark mask */}
          <div style={{ position:"absolute", inset:"clamp(2px,0.8vw,4px)", borderRadius:"50%", background:"#0d1f3c", zIndex:1 }} />

          {/* Orbit ring 1 */}
          <div style={{ position:"absolute", inset:"clamp(6px,2vw,10px)", borderRadius:"50%", border:"1.5px solid transparent", borderTopColor:"#818cf8", borderRightColor:"#3b82f6", animation:"spinSlow 2.8s linear infinite", filter:"drop-shadow(0 0 5px rgba(129,140,248,0.85))", zIndex:2 }} />

          {/* Orbit ring 2 */}
          <div style={{ position:"absolute", inset:"clamp(16px,5vw,24px)", borderRadius:"50%", border:"1.5px solid transparent", borderBottomColor:"#06b6d4", borderLeftColor:"rgba(6,182,212,0.4)", animation:"spinRev 2s linear infinite", filter:"drop-shadow(0 0 5px rgba(6,182,212,0.8))", zIndex:2 }} />

          {/* Core */}
          <div style={{ position:"relative", zIndex:3, width:"clamp(40px,14vw,72px)", height:"clamp(40px,14vw,72px)", borderRadius:"50%", background:"radial-gradient(circle at 38% 35%, rgba(147,197,253,0.22) 0%, rgba(13,31,60,0.97) 65%)", border:"1.5px solid rgba(129,140,248,0.55)", display:"flex", alignItems:"center", justifyContent:"center", animation:"orbPulse 2.2s ease-in-out infinite", backdropFilter:"blur(12px)", boxShadow:"0 0 32px rgba(99,102,241,0.6), 0 0 12px rgba(59,130,246,0.4), inset 0 0 22px rgba(99,102,241,0.18)" }}>
            <Brain style={{ width:"clamp(16px,5vw,30px)", height:"clamp(16px,5vw,30px)", color:"#a5b4fc", filter:"drop-shadow(0 0 8px rgba(165,180,252,0.9))" }} />
          </div>

        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPwd]  = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      saveToken(data.access_token);
      saveUser(data.user);
      setUser(data.user);
      toast.success("Welcome back! 🎉");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Global responsive styles ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes spin { to { transform: rotate(360deg); } }

        input:focus {
          border-color: #1565c0 !important;
          box-shadow: 0 0 0 3px rgba(21,101,192,0.12) !important;
          outline: none;
        }
        button:not(:disabled):hover { opacity: 0.88; transform: translateY(-1px); }

        /* Prevent iOS zoom on input focus */
        @media (max-width: 768px) {
          input, select, textarea { font-size: 16px !important; }
        }

        /* ── Layout: stack on mobile, side-by-side on desktop ── */
        .gos-root {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          font-family: 'DM Sans','Segoe UI',sans-serif;
        }
        @media (min-width: 768px) {
          .gos-root { flex-direction: row; }
        }

        /* ── LEFT PANEL ── */
        .gos-left {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 36px 24px 28px;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 30% 40%, rgba(21,101,192,.22) 0%, transparent 60%),
            linear-gradient(135deg, #0d1f3c 0%, #0a1628 60%, #0d2547 100%);
        }
        @media (min-width: 768px) {
          .gos-left {
            width: 52%;
            min-height: 100vh;
            padding: clamp(40px, 6vw, 60px) clamp(32px, 5vw, 50px);
          }
        }

        /* ── LEFT INNER ── */
        .gos-left-inner {
          position: relative;
          z-index: 2;
          text-align: center;
          width: 100%;
          max-width: 420px;
        }

        /* Orb: smaller on mobile */
        .gos-orb-wrap {
          margin-bottom: 20px;
        }
        @media (min-width: 768px) {
          .gos-orb-wrap { margin-bottom: 32px; }
        }

        /* Brand */
        .gos-brand-name {
          font-family: 'Rajdhani','Segoe UI',sans-serif;
          font-size: clamp(1.35rem, 5vw, 2rem);
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .gos-brand-sub {
          font-size: clamp(0.45rem, 1.8vw, 0.62rem);
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          margin-top: 4px;
        }
        .gos-headline {
          font-family: 'Rajdhani','Segoe UI',sans-serif;
          font-size: clamp(1.15rem, 5vw, 2rem);
          font-weight: 700;
          color: #fff;
          line-height: 1.15;
          margin: 12px 0 10px;
        }
        .gos-sub {
          font-size: clamp(0.78rem, 2.5vw, 0.93rem);
          color: #b0bec5;
          line-height: 1.7;
          margin-bottom: 20px;
        }
        @media (min-width: 768px) {
          .gos-sub { margin-bottom: 32px; }
        }

        /* Stats */
        .gos-stats {
          display: flex;
          gap: clamp(8px, 2vw, 12px);
          justify-content: center;
          flex-wrap: wrap;
        }
        .gos-stat-card {
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          padding: clamp(8px,2vw,12px) clamp(12px,3vw,20px);
          text-align: center;
          flex: 1;
          min-width: 80px;
        }
        .gos-stat-num {
          font-family: 'Rajdhani',sans-serif;
          font-size: clamp(1rem, 4vw, 1.5rem);
          font-weight: 700;
          color: #2196f3;
        }
        .gos-stat-lbl {
          font-size: clamp(0.48rem, 1.8vw, 0.65rem);
          color: #b0bec5;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* ── RIGHT PANEL ── */
        .gos-right {
          background: linear-gradient(145deg,#fff 0%,#e8f0fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px 40px;
          overflow-y: auto;
        }
        @media (min-width: 768px) {
          .gos-right {
            width: 48%;
            min-height: 100vh;
            padding: clamp(40px,5vw,60px) clamp(24px,4vw,50px);
          }
        }

        .gos-box {
          width: 100%;
          max-width: 400px;
        }

        /* Tabs */
        .gos-tabs {
          display: flex;
          background: #e0e7f0;
          border-radius: 12px;
          padding: 5px;
          margin-bottom: clamp(20px, 4vw, 28px);
        }
        .gos-tab {
          flex: 1;
          text-align: center;
          padding: 10px;
          font-size: clamp(0.78rem, 2.5vw, 0.9rem);
          font-weight: 600;
          color: #6b7a99;
          text-decoration: none;
          border-radius: 9px;
          transition: all .25s;
        }
        .gos-tab-on {
          background: white;
          color: #1565c0;
          box-shadow: 0 2px 8px rgba(0,0,0,.12);
        }

        .gos-title {
          font-family: 'Rajdhani',sans-serif;
          font-size: clamp(1.4rem, 5vw, 1.9rem);
          font-weight: 700;
          color: #0d1f3c;
          margin-bottom: 4px;
        }
        .gos-desc {
          font-size: clamp(0.75rem, 2.5vw, 0.85rem);
          color: #7a8aa0;
          margin-bottom: clamp(18px, 4vw, 24px);
        }

        /* Form */
        .gos-form {
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 2.5vw, 14px);
        }
        .gos-field { display: flex; flex-direction: column; gap: 5px; }
        .gos-lbl {
          font-size: clamp(0.6rem, 1.8vw, 0.7rem);
          font-weight: 700;
          color: #4a5568;
          letter-spacing: 0.06em;
        }
        .gos-wrap { position: relative; }
        .gos-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #1565c0;
          opacity: .5;
          pointer-events: none;
        }
        .gos-input {
          width: 100%;
          padding: clamp(10px,2.2vw,11px) clamp(10px,2vw,14px) clamp(10px,2.2vw,11px) 38px;
          border: 1.5px solid #d0dbe8;
          border-radius: 10px;
          color: #1a2740;
          background: white;
          transition: all .25s;
          font-family: inherit;
        }
        .gos-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #7a8aa0;
          display: flex;
          align-items: center;
          padding: 0;
        }
        .gos-forgot {
          font-size: clamp(0.68rem, 2vw, 0.78rem);
          color: #1565c0;
          text-decoration: none;
          font-weight: 500;
        }
        .gos-btn-main {
          width: 100%;
          padding: clamp(11px,2.5vw,13px);
          background: linear-gradient(135deg,#1565c0 0%,#1e88e5 100%);
          border: none;
          border-radius: 10px;
          font-size: clamp(0.82rem,2.5vw,0.95rem);
          font-weight: 700;
          letter-spacing: 0.06em;
          color: white;
          cursor: pointer;
          transition: all .25s;
          box-shadow: 0 4px 15px rgba(21,101,192,.35);
          font-family: 'Rajdhani',sans-serif;
          margin-top: 4px;
        }
        .gos-row { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .gos-spin { animation: spin .8s linear infinite; }

        /* Divider */
        .gos-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: clamp(16px, 3vw, 20px) 0;
        }
        .gos-line { flex: 1; height: 1px; background: #d0dbe8; }
        .gos-or {
          font-size: clamp(0.65rem, 2vw, 0.75rem);
          color: #9aabb8;
          white-space: nowrap;
          font-weight: 500;
        }

        /* Socials */
        .gos-socials {
          display: flex;
          gap: clamp(7px, 2vw, 10px);
        }
        .gos-social-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(4px, 1vw, 7px);
          padding: clamp(9px,2vw,10px) clamp(6px,1.5vw,8px);
          border: 1.5px solid #d0dbe8;
          border-radius: 10px;
          background: white;
          font-size: clamp(0.66rem, 2vw, 0.8rem);
          font-weight: 600;
          color: #1a2740;
          cursor: pointer;
          transition: all .25s;
          font-family: inherit;
        }
        .gos-switch {
          text-align: center;
          margin-top: clamp(14px, 3vw, 20px);
          font-size: clamp(0.72rem, 2.5vw, 0.82rem);
          color: #7a8aa0;
        }
        .gos-switch-link { color: #1565c0; font-weight: 600; text-decoration: none; }

        /* Grid overlay */
        .gos-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(33,150,243,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(33,150,243,.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      <div className="gos-root">

        {/* ── LEFT: Brand Panel ── */}
        <div className="gos-left">
          <div className="gos-grid" />
          <div className="gos-left-inner">

            <div className="gos-orb-wrap">
              <BrainOrb />
            </div>

            <div style={{ marginBottom: 8 }}>
              <div className="gos-brand-name">
                Growth<span style={{ background:"linear-gradient(135deg,#818cf8,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>OS</span>
              </div>
              <div className="gos-brand-sub">Digital Silicon Valley</div>
            </div>

            <h1 className="gos-headline">
              Your Digital Silicon <span style={{ color:"#ff6b00" }}>Valley.</span>
            </h1>
            <p className="gos-sub">
              Turn Potential Into Progress — power your digital growth journey.
            </p>

            <div className="gos-stats">
              {[["500+","Members"],["120+","Projects Built"],["1000+","Hours of Learning"]].map(([n,l]) => (
                <div key={l} className="gos-stat-card">
                  <div className="gos-stat-num">{n}</div>
                  <div className="gos-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── RIGHT: Login Form ── */}
        <div className="gos-right">
          <div className="gos-box">

            <div className="gos-tabs">
              <Link href="/login" className="gos-tab gos-tab-on">Sign In</Link>
              <Link href="/signup" className="gos-tab">Sign Up</Link>
            </div>

            <h2 className="gos-title">Welcome back 👋</h2>
            <p className="gos-desc">Sign in to your GrowthOS account</p>

            <form onSubmit={handleSubmit} className="gos-form">
              <div className="gos-field">
                <label className="gos-lbl">EMAIL ADDRESS</label>
                <div className="gos-wrap">
                  <Mail size={16} className="gos-icon" style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"#1565c0", opacity:.5, pointerEvents:"none" }} />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="gos-input"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="gos-field">
                <label className="gos-lbl">PASSWORD</label>
                <div className="gos-wrap">
                  <Lock size={16} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"#1565c0", opacity:.5, pointerEvents:"none" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="gos-input"
                    style={{ paddingRight:"42px" }}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(!showPassword)} className="gos-eye-btn">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <div style={{ textAlign:"right" }}>
                <Link href="/forgot-password" className="gos-forgot">Forgot password?</Link>
              </div>

              <button type="submit" className="gos-btn-main" disabled={loading}>
                {loading
                  ? <span className="gos-row"><Loader2 size={17} className="gos-spin"/> Signing in...</span>
                  : "SIGN IN TO GROWTHOS"}
              </button>
            </form>

            <div className="gos-divider">
              <div className="gos-line"/><span className="gos-or">or continue with</span><div className="gos-line"/>
            </div>

            <div className="gos-socials">
              <button className="gos-social-btn" onClick={loginWithGoogle}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </button>
              <button className="gos-social-btn" onClick={loginWithFacebook}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
                </svg>
                <span>Facebook</span>
              </button>
              <button className="gos-social-btn" onClick={loginWithLinkedIn}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
                </svg>
                <span>LinkedIn</span>
              </button>
            </div>

            <p className="gos-switch">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="gos-switch-link">Create one free →</Link>
            </p>

          </div>
        </div>

      </div>
    </>
  );
}