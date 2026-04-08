"use client";
// app/login/page.tsx

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
        @keyframes spinSlow   { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes spinRev    { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
        @keyframes orbPulse   { 0%,100% { opacity:.6; transform:scale(.96); } 50% { opacity:1; transform:scale(1.05); } }
        @keyframes orbFloat   { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-7px); } }
        @keyframes conicSpin  { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {/* Float wrapper */}
      <div style={{ animation: "orbFloat 4s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>

          {/* ── Soft ambient pulse bloom ── */}
          <div style={{
            position: "absolute", inset: -18, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(59,130,246,0.22) 45%, transparent 70%)",
            animation: "orbPulse 3s ease-in-out infinite",
            zIndex: 0,
          }} />

          {/* ── Cyan accent glow ── */}
          <div style={{
            position: "absolute", inset: -8, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 65%)",
            zIndex: 0,
          }} />

          {/* ── Spinning conic border ring ── */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "conic-gradient(from 0deg, #6366f1 0deg, #3b82f6 60deg, #06b6d4 120deg, #818cf8 180deg, transparent 181deg, transparent 360deg)",
            animation: "conicSpin 3s linear infinite",
            zIndex: 1,
            filter: "blur(0.5px)",
          }} />

          {/* ── Dark mask to isolate ring ── */}
          <div style={{
            position: "absolute", inset: 4, borderRadius: "50%",
            background: "#0d1f3c",
            zIndex: 1,
          }} />

          {/* ── Inner spinning orbit ring 1 ── */}
          <div style={{
            position: "absolute", inset: 10, borderRadius: "50%",
            border: "1.5px solid transparent",
            borderTopColor: "#818cf8", borderRightColor: "#3b82f6",
            animation: "spinSlow 2.8s linear infinite",
            filter: "drop-shadow(0 0 5px rgba(129,140,248,0.85))",
            zIndex: 2,
          }} />

          {/* ── Inner spinning orbit ring 2 ── */}
          <div style={{
            position: "absolute", inset: 24, borderRadius: "50%",
            border: "1.5px solid transparent",
            borderBottomColor: "#06b6d4", borderLeftColor: "rgba(6,182,212,0.4)",
            animation: "spinRev 2s linear infinite",
            filter: "drop-shadow(0 0 5px rgba(6,182,212,0.8))",
            zIndex: 2,
          }} />

          {/* ── Center core ── */}
          <div style={{
            position: "relative", zIndex: 3,
            width: 72, height: 72, borderRadius: "50%",
            background: "radial-gradient(circle at 38% 35%, rgba(147,197,253,0.22) 0%, rgba(13,31,60,0.97) 65%)",
            border: "1.5px solid rgba(129,140,248,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "orbPulse 2.2s ease-in-out infinite",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 32px rgba(99,102,241,0.6), 0 0 12px rgba(59,130,246,0.4), inset 0 0 22px rgba(99,102,241,0.18)",
          }}>
            <Brain size={30} style={{ color: "#a5b4fc", filter: "drop-shadow(0 0 8px rgba(165,180,252,0.9))" }} />
          </div>

        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

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
    <div style={s.root}>
      {/* ── LEFT: Brand Panel ── */}
      <div style={s.left}>
        <div style={s.grid} />
        <div style={s.leftInner}>

          {/* Neon Brain Orb */}
          <div style={{ marginBottom: 32 }}>
            <BrainOrb />
          </div>

          {/* Brand name under orb */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: "'Rajdhani','Segoe UI',sans-serif", fontSize: "2rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1 }}>
              Growth<span style={{ background: "linear-gradient(135deg,#818cf8,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>OS</span>
            </div>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginTop: 4 }}>Digital Silicon Valley</div>
          </div>

          <h1 style={s.headline}>
            Your Digital Silicon <span style={s.orange}>Valley.</span>
          </h1>
          <p style={s.sub}>
            Turn Potential Into Progress — power your digital growth journey.
          </p>

          <div style={s.stats}>
            {[["500+","Members"],["120+","Projects Built"],["1000+","Hours of Learning"]].map(([n,l]) => (
              <div key={l} style={s.statCard}>
                <div style={s.statNum}>{n}</div>
                <div style={s.statLbl}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Login Form ── */}
      <div style={s.right}>
        <div style={s.box}>
          <div style={s.tabs}>
            <Link href="/login" style={{...s.tab,...s.tabOn}}>Sign In</Link>
            <Link href="/signup" style={s.tab}>Sign Up</Link>
          </div>

          <h2 style={s.title}>Welcome back 👋</h2>
          <p style={s.desc}>Sign in to your GrowthOS account</p>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.lbl}>EMAIL ADDRESS</label>
              <div style={s.wrap}>
                <Mail size={16} style={s.icon} />
                <input type="email" placeholder="you@company.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={s.input} autoComplete="email" required />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.lbl}>PASSWORD</label>
              <div style={s.wrap}>
                <Lock size={16} style={s.icon} />
                <input type={showPassword ? "text" : "password"} placeholder="••••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{...s.input, paddingRight:"42px"}} autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div style={{textAlign:"right"}}>
              <Link href="/forgot-password" style={s.forgot}>Forgot password?</Link>
            </div>

            <button type="submit" style={s.btnMain} disabled={loading}>
              {loading
                ? <span style={s.row}><Loader2 size={17} style={s.spin}/> Signing in...</span>
                : "SIGN IN TO GROWTHOS"}
            </button>
          </form>

          <div style={s.divider}>
            <div style={s.line}/><span style={s.or}>or continue with</span><div style={s.line}/>
          </div>

          <div style={s.socials}>
            <button style={s.socialBtn} onClick={loginWithGoogle} disabled={!!socialLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Google</span>
            </button>
            <button style={s.socialBtn} onClick={loginWithFacebook} disabled={!!socialLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
              </svg>
              <span>Facebook</span>
            </button>
            <button style={s.socialBtn} onClick={loginWithLinkedIn} disabled={!!socialLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
              </svg>
              <span>LinkedIn</span>
            </button>
          </div>

          <p style={s.switch}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={s.switchLink}>Create one free →</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #1565c0 !important; box-shadow: 0 0 0 3px rgba(21,101,192,0.12) !important; outline: none; }
        button:not(:disabled):hover { opacity: 0.88; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:      { display:"flex", minHeight:"100vh", fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  left:      { width:"52%", position:"relative", display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 50px", overflow:"visible", background:"radial-gradient(ellipse at 30% 40%,rgba(21,101,192,.22) 0%,transparent 60%),linear-gradient(135deg,#0d1f3c 0%,#0a1628 60%,#0d2547 100%)" },
  grid:      { position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(33,150,243,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(33,150,243,.05) 1px,transparent 1px)", backgroundSize:"40px 40px" },
  leftInner: { position:"relative", zIndex:2, textAlign:"center", maxWidth:"420px", overflow:"visible" },
  orange:    { color:"#ff6b00" },
  headline:  { fontFamily:"'Rajdhani','Segoe UI',sans-serif", fontSize:"2rem", fontWeight:700, color:"#fff", lineHeight:1.15, marginBottom:"12px", marginTop:"16px" },
  sub:       { fontSize:"0.93rem", color:"#b0bec5", lineHeight:1.7, marginBottom:"32px" },
  stats:     { display:"flex", gap:"12px", justifyContent:"center" },
  statCard:  { background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", borderRadius:"12px", padding:"12px 16px", textAlign:"center" },
  statNum:   { fontFamily:"'Rajdhani',sans-serif", fontSize:"1.5rem", fontWeight:700, color:"#2196f3" },
  statLbl:   { fontSize:"0.65rem", color:"#b0bec5", textTransform:"uppercase", letterSpacing:"0.1em" },
  right:     { width:"48%", background:"linear-gradient(145deg,#fff 0%,#e8f0fe 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:"50px 40px", overflowY:"auto" },
  box:       { width:"100%", maxWidth:"400px" },
  tabs:      { display:"flex", background:"#e0e7f0", borderRadius:"12px", padding:"5px", marginBottom:"28px" },
  tab:       { flex:1, textAlign:"center", padding:"10px", fontSize:"0.9rem", fontWeight:600, color:"#6b7a99", textDecoration:"none", borderRadius:"9px", transition:"all .25s" },
  tabOn:     { background:"white", color:"#1565c0", boxShadow:"0 2px 8px rgba(0,0,0,.12)" },
  title:     { fontFamily:"'Rajdhani',sans-serif", fontSize:"1.9rem", fontWeight:700, color:"#0d1f3c", marginBottom:"4px" },
  desc:      { fontSize:"0.85rem", color:"#7a8aa0", marginBottom:"24px" },
  form:      { display:"flex", flexDirection:"column", gap:"14px" },
  field:     { display:"flex", flexDirection:"column", gap:"5px" },
  lbl:       { fontSize:"0.7rem", fontWeight:700, color:"#4a5568", letterSpacing:"0.06em" },
  wrap:      { position:"relative" },
  icon:      { position:"absolute", left:"13px", top:"50%", transform:"translateY(-50%)", color:"#1565c0", opacity:.5, pointerEvents:"none" },
  input:     { width:"100%", padding:"11px 14px 11px 38px", border:"1.5px solid #d0dbe8", borderRadius:"10px", fontSize:"0.88rem", color:"#1a2740", background:"white", transition:"all .25s", fontFamily:"inherit", boxSizing:"border-box" },
  eyeBtn:    { position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#7a8aa0", display:"flex", alignItems:"center", padding:0 },
  forgot:    { fontSize:"0.78rem", color:"#1565c0", textDecoration:"none", fontWeight:500 },
  btnMain:   { width:"100%", padding:"13px", background:"linear-gradient(135deg,#1565c0 0%,#1e88e5 100%)", border:"none", borderRadius:"10px", fontSize:"0.95rem", fontWeight:700, letterSpacing:"0.06em", color:"white", cursor:"pointer", transition:"all .25s", boxShadow:"0 4px 15px rgba(21,101,192,.35)", fontFamily:"'Rajdhani',sans-serif", marginTop:"4px" },
  row:       { display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" },
  spin:      { animation:"spin .8s linear infinite" },
  divider:   { display:"flex", alignItems:"center", gap:"12px", margin:"20px 0" },
  line:      { flex:1, height:"1px", background:"#d0dbe8" },
  or:        { fontSize:"0.75rem", color:"#9aabb8", whiteSpace:"nowrap", fontWeight:500 },
  socials:   { display:"flex", gap:"10px" },
  socialBtn: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", padding:"10px 8px", border:"1.5px solid #d0dbe8", borderRadius:"10px", background:"white", fontSize:"0.8rem", fontWeight:600, color:"#1a2740", cursor:"pointer", transition:"all .25s", fontFamily:"inherit" },
  switch:    { textAlign:"center", marginTop:"20px", fontSize:"0.82rem", color:"#7a8aa0" },
  switchLink:{ color:"#1565c0", fontWeight:600, textDecoration:"none" },
};