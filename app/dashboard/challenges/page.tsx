"use client";
// app/dashboard/challenges/page.tsx
// GrowthOS — Real-Time Challenges (no hardcoded data)

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Play, BarChart2, Trophy,
  Users, Settings, LogOut, Bell, ChevronLeft,
  Flame, Zap, Clock, X, ChevronRight, Lock, Star,
  Swords, Shield, CheckCircle2, AlertTriangle, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const NAV = [
  { icon:<LayoutDashboard size={18}/>, label:"Dashboard",    href:"/dashboard" },
  { icon:<Play size={18}/>,            label:"Practice Arena",href:"/dashboard/practice" },
  { icon:<BarChart2 size={18}/>,       label:"Leaderboard",  href:"/dashboard/leaderboard" },
  { icon:<Trophy size={18}/>,          label:"Challenges",   href:"/dashboard/challenges", active:true },
  { icon:<Users size={18}/>,           label:"Community",    href:"/dashboard/community" },
  { icon:<Settings size={18}/>,        label:"Settings",     href:"/dashboard/settings" },
];

type Diff = "Easy"|"Medium"|"Hard"|"Expert";
type ChallengeType = "daily"|"weekly"|"monthly"|"special";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  domain: string;
  difficulty: Diff;
  xp: number;
  bonusXp: number;
  timeMinutes: number;
  participants: number;
  completed: boolean;
  joined: boolean;
  endsIn: string;
  streakImpact: boolean;
  topSolvers: {name:string;avatar:string;time:string;xp:number}[];
  hints: string[];
  tags: string[];
  battleMode?: boolean;
  communityMode?: boolean;
  weekendBonus?: boolean;
  myScore: number;
  myTimeTaken?: number;
}

const DIFF_CONFIG: Record<Diff,{color:string;bg:string;border:string}> = {
  Easy:   { color:"#22c55e", bg:"rgba(34,197,94,0.1)",   border:"rgba(34,197,94,0.25)" },
  Medium: { color:"#f59e0b", bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.25)" },
  Hard:   { color:"#ef4444", bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.25)" },
  Expert: { color:"#8b5cf6", bg:"rgba(139,92,246,0.1)",  border:"rgba(139,92,246,0.25)" },
};

const TYPE_CONFIG: Record<ChallengeType,{label:string;color:string;bg:string}> = {
  daily:   { label:"Daily",   color:"#6366f1", bg:"rgba(99,102,241,0.12)"  },
  weekly:  { label:"Weekly",  color:"#3b82f6", bg:"rgba(59,130,246,0.12)"  },
  monthly: { label:"Monthly", color:"#f59e0b", bg:"rgba(245,158,11,0.12)"  },
  special: { label:"Special", color:"#ec4899", bg:"rgba(236,72,153,0.12)"  },
};

export default function ChallengesPage() {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rawName = (user as any)?.full_name || (user as any)?.name || "";
  const currentUser = mounted ? (rawName.includes("@") ? rawName.split("@")[0] : rawName) || "User" : "User";
  const avatarInitials = mounted && currentUser !== "User" ? currentUser.slice(0,2).toUpperCase() : "US";
  const userAvatarUrl = (user as any)?.avatar_url || (user as any)?.image || null;

  const [loaded, setLoaded]         = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string|null>(null);
  const [filter, setFilter]         = useState<"all"|ChallengeType>("all");
  const [selected, setSelected]     = useState<Challenge|null>(null);
  const [hintIdx, setHintIdx]       = useState(0);
  const [joinLoading, setJoinLoading] = useState<string|null>(null);
  const [completeLoading, setCompleteLoading] = useState<string|null>(null);
  const [timer, setTimer]           = useState<number|null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef                    = useRef<NodeJS.Timeout|null>(null);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);
  const [fieldLabel, setFieldLabel] = useState<string>("");

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setTimeout(()=>setLoaded(true),80); }, []);

  const fetchChallenges = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsLoading(true); setFetchError(null);
    try {
      const [res, myRes] = await Promise.all([
        fetch(`${API}/challenges/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/challenges/my`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges || []);
        setFieldLabel(data.field || "");
      } else {
        setFetchError("Failed to load challenges");
      }
      if (myRes.ok) {
        const data = await myRes.json();
        setMyChallenges(data.challenges || []);
      }
    } catch {
      setFetchError("Could not connect to server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchChallenges();
  }, [fetchChallenges, mounted]);

  const handleJoin = async (challenge: Challenge) => {
    const token = getToken();
    if (!token) return;
    setJoinLoading(challenge.id);
    try {
      const res = await fetch(`${API}/challenges/${challenge.id}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        setChallenges(prev => prev.map(c => c.id===challenge.id ? {...c, joined:true} : c));
        if (selected?.id === challenge.id) setSelected({...challenge, joined:true});
        // Start timer
        setTimer(challenge.timeMinutes * 60);
        setTimerActive(true);
      }
    } catch {}
    setJoinLoading(null);
  };

  const handleComplete = async (challenge: Challenge) => {
    const token = getToken();
    if (!token) return;
    setCompleteLoading(challenge.id);
    const timeTaken = challenge.timeMinutes * 60 - (timer || 0);
    try {
      const res = await fetch(`${API}/challenges/${challenge.id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ time_taken_s: timeTaken > 0 ? timeTaken : null }),
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges(prev => prev.map(c => c.id===challenge.id ? {...c, completed:true, myScore: data.xp} : c));
        if (selected?.id === challenge.id) setSelected({...challenge, completed:true, myScore: data.xp});
        setTimerActive(false);
        await fetchChallenges();
      }
    } catch {}
    setCompleteLoading(null);
  };

  // Timer countdown
  useEffect(() => {
    if (timerActive && timer !== null && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => (t||1) - 1), 1000);
    }
    if (timer === 0) setTimerActive(false);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timerActive, timer]);

  const filtered = filter === "all" ? challenges : challenges.filter(c => c.type === filter);
  const completedCount = myChallenges.filter(c => c.completed).length;
  const totalXP = myChallenges.filter(c => c.completed).reduce((a, c) => a + (c.score||0), 0);

  const formatTimer = (s: number) => {
    const m = Math.floor(s/60), sec = s%60;
    return `${m}:${sec.toString().padStart(2,"0")}`;
  };

  return (
    <div style={s.root}>
      <div style={s.bg}/><div style={s.bgGrid}/><div style={s.glow1}/><div style={s.glow2}/>

      {/* Challenge Detail Modal */}
      {selected && (
        <div style={s.overlay} onClick={()=>setSelected(null)}>
          <div style={{...s.modal, maxWidth:"620px"}} onClick={e=>e.stopPropagation()}>
            <button style={s.modalClose} onClick={()=>setSelected(null)}><X size={16}/></button>

            {/* Header */}
            <div style={{marginBottom:"16px"}}>
              <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
                <span style={{...s.typeBadge, background:TYPE_CONFIG[selected.type].bg, color:TYPE_CONFIG[selected.type].color}}>
                  {TYPE_CONFIG[selected.type].label}
                </span>
                <span style={{...s.typeBadge, background:DIFF_CONFIG[selected.difficulty].bg, color:DIFF_CONFIG[selected.difficulty].color}}>
                  {selected.difficulty}
                </span>
                {selected.weekendBonus && <span style={{...s.typeBadge, background:"rgba(245,158,11,0.1)", color:"#f59e0b"}}>⚡ 2x XP Weekend</span>}
              </div>
              <h2 style={{fontSize:"1.2rem",fontWeight:800,color:"white",marginBottom:"6px"}}>{selected.title}</h2>
              <p style={{fontSize:"0.85rem",color:"#94a3b8",lineHeight:1.6}}>{selected.description}</p>
            </div>

            {/* Stats row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"16px"}}>
              {[
                {icon:"⚡",val:`+${selected.xp} XP`,sub:"Base reward"},
                {icon:"⏱️",val:`${selected.timeMinutes}m`,sub:"Time limit"},
                {icon:"👥",val:selected.participants,sub:"Participants"},
                {icon:"⏰",val:selected.endsIn,sub:"Ends in"},
              ].map((st,i)=>(
                <div key={i} style={s.statMini}>
                  <div style={{fontSize:"1rem"}}>{st.icon}</div>
                  <div style={{fontSize:"0.85rem",fontWeight:700,color:"white"}}>{st.val}</div>
                  <div style={{fontSize:"0.62rem",color:"#475569"}}>{st.sub}</div>
                </div>
              ))}
            </div>

            {/* Timer (if active) */}
            {selected.joined && timerActive && timer !== null && (
              <div style={{textAlign:"center" as const,padding:"12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"10px",marginBottom:"14px"}}>
                <div style={{fontSize:"0.68rem",color:"#ef4444",fontWeight:600,marginBottom:"4px"}}>⏱ TIME REMAINING</div>
                <div style={{fontSize:"2rem",fontWeight:800,color:"#ef4444",fontVariantNumeric:"tabular-nums"}}>{formatTimer(timer)}</div>
              </div>
            )}

            {/* Completed */}
            {selected.completed && (
              <div style={{padding:"12px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"10px",marginBottom:"14px",textAlign:"center" as const}}>
                <div style={{fontSize:"1.5rem"}}>✅</div>
                <div style={{fontSize:"0.85rem",fontWeight:700,color:"#22c55e",marginTop:"4px"}}>Challenge Completed!</div>
                <div style={{fontSize:"0.75rem",color:"#64748b",marginTop:"2px"}}>+{selected.myScore} XP earned</div>
              </div>
            )}

            {/* Tags */}
            <div style={{display:"flex",flexWrap:"wrap" as const,gap:"6px",marginBottom:"14px"}}>
              {selected.tags.map((t,i)=>(
                <span key={i} style={{padding:"3px 10px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"20px",fontSize:"0.68rem",color:"#818cf8",fontWeight:600}}>#{t}</span>
              ))}
            </div>

            {/* Hints */}
            {selected.hints.length > 0 && (
              <div style={{marginBottom:"14px"}}>
                <div style={{fontSize:"0.72rem",color:"#475569",fontWeight:600,marginBottom:"6px"}}>💡 HINTS ({hintIdx+1}/{selected.hints.length})</div>
                <div style={{padding:"10px 14px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:"8px",fontSize:"0.82rem",color:"#f59e0b",lineHeight:1.5}}>
                  {selected.hints[hintIdx]}
                </div>
                {hintIdx < selected.hints.length - 1 && (
                  <button onClick={()=>setHintIdx(i=>i+1)} style={{marginTop:"6px",background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"0.72rem",textDecoration:"underline"}}>
                    Next hint →
                  </button>
                )}
              </div>
            )}

            {/* Top Solvers */}
            {selected.topSolvers.length > 0 && (
              <div style={{marginBottom:"16px"}}>
                <div style={{fontSize:"0.72rem",color:"#475569",fontWeight:600,marginBottom:"6px"}}>🏆 TOP SOLVERS</div>
                <div style={{display:"flex",flexDirection:"column" as const,gap:"4px"}}>
                  {selected.topSolvers.map((sv,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 10px",background:"rgba(255,255,255,0.02)",borderRadius:"8px"}}>
                      <span style={{color:i===0?"#ffd700":i===1?"#c0c0c0":"#cd7f32",fontWeight:700,fontSize:"0.78rem"}}>#{i+1}</span>
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",background:"rgba(99,102,241,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.62rem",fontWeight:700,color:"#818cf8"}}>{sv.avatar}</div>
                      <span style={{flex:1,fontSize:"0.78rem",color:"#e2e8f0"}}>{sv.name}</span>
                      <span style={{fontSize:"0.72rem",color:"#475569"}}>{sv.time}</span>
                      <span style={{fontSize:"0.72rem",color:"#ffd700",fontWeight:700}}>+{sv.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {!selected.completed && (
              <div style={{display:"flex",gap:"8px"}}>
                {!selected.joined ? (
                  <button
                    style={{...s.ctaBtn, opacity:joinLoading===selected.id?0.6:1}}
                    disabled={!!joinLoading}
                    onClick={()=>handleJoin(selected)}>
                    {joinLoading===selected.id ? "Joining..." : `⚡ Start Challenge — +${selected.xp} XP`}
                  </button>
                ) : (
                  <button
                    style={{...s.ctaBtn, background:"linear-gradient(135deg,#22c55e,#16a34a)", opacity:completeLoading===selected.id?0.6:1}}
                    disabled={!!completeLoading}
                    onClick={()=>handleComplete(selected)}>
                    {completeLoading===selected.id ? "Submitting..." : "✅ Mark as Completed"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={{ padding: "0 4px 24px" }}><BrandLogo size="md" /></div>
        <nav style={s.nav}>
          {NAV.map(item=>(
            <Link key={item.label} href={item.href} style={{textDecoration:"none"}}>
              <button style={{...s.navItem,...(item.active?s.navItemActive:{})}}>
                <span style={{opacity:item.active?1:0.5}}>{item.icon}</span>
                <span style={{opacity:item.active?1:0.6,fontSize:"0.85rem",fontWeight:item.active?600:400,color:item.active?"white":"#94a3b8"}}>{item.label}</span>
                {item.active&&<div style={s.navActiveDot}/>}
              </button>
            </Link>
          ))}
        </nav>
        <div style={s.sidebarFooter}>
          <div style={{...s.sidebarUser,cursor:"pointer"}} onClick={()=>setIsProfileModalOpen(true)}>
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={currentUser} style={{width:32,height:32,borderRadius:"50%",objectFit:"cover"}}/>
            ) : <div style={s.avatarSmall}>{avatarInitials}</div>}
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:600,color:"#e2e8f0"}}>{currentUser}</div>
              <div style={{fontSize:"0.7rem",color:"#818cf8",fontWeight:600}}>{user?.plan||"MEMBER PLAN"}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={()=>logout&&logout()}><LogOut size={15}/></button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{...s.main,opacity:loaded?1:0,transform:loaded?"none":"translateY(12px)",transition:"all 0.5s ease"}}>
        <div style={s.topbar}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <Link href="/dashboard" style={{textDecoration:"none"}}>
              <button style={s.backBtn}><ChevronLeft size={16}/> Dashboard</button>
            </Link>
            <div style={s.pageTitle}>⚔️ Challenges</div>
            <div style={s.livePill}><div style={s.liveDot}/>Live</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <button style={s.iconBtn} onClick={fetchChallenges}><RefreshCw size={17} style={{animation:isLoading?"spin 1s linear infinite":"none"}}/></button>
            <button style={s.iconBtn}><Bell size={18}/></button>
            <div style={{...s.avatarMed,cursor:"pointer"}} onClick={()=>setIsProfileModalOpen(true)}>
              {userAvatarUrl ? <img src={userAvatarUrl} alt="" style={{width:36,height:36,borderRadius:"50%",objectFit:"cover"}}/> : avatarInitials}
            </div>
          </div>
        </div>

        <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={()=>setIsProfileModalOpen(false)}/>

        {/* Stats header */}
        <div style={s.statsHeader}>
          {[
            {icon:"⚔️", val:challenges.length, label:"Available"},
            {icon:"✅", val:completedCount, label:"Completed"},
            {icon:"⚡", val:totalXP, label:"XP Earned"},
            {icon:"🔥", val:myChallenges.filter(c=>c.completed&&c.challenge_type==="daily").length, label:"Daily Done"},
          ].map((st,i)=>(
            <div key={i} style={s.statBox}>
              <div style={{fontSize:"1.5rem"}}>{st.icon}</div>
              <div style={{fontSize:"1.4rem",fontWeight:800,color:"white"}}>{st.val.toLocaleString()}</div>
              <div style={{fontSize:"0.68rem",color:"#475569"}}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Field label */}
        {fieldLabel && (
          <div style={{marginBottom:"16px",padding:"10px 16px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:"10px",fontSize:"0.8rem",color:"#818cf8",fontWeight:600}}>
            🎯 Showing challenges for your field: <span style={{color:"white"}}>{fieldLabel}</span>
          </div>
        )}

        {/* Error */}
        {fetchError && (
          <div style={{padding:"12px 16px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"10px",color:"#ef4444",fontSize:"0.82rem",marginBottom:"16px"}}>
            ⚠️ {fetchError}
            <button onClick={fetchChallenges} style={{marginLeft:"10px",color:"#6366f1",background:"none",border:"none",cursor:"pointer",fontSize:"0.78rem",textDecoration:"underline"}}>Retry</button>
          </div>
        )}

        {/* Filter tabs */}
        <div style={s.filterRow}>
          {(["all","daily","weekly","monthly","special"] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{...s.filterBtn,...(filter===f?s.filterBtnActive:{})}}>
              {f==="all"?"All":(f.charAt(0).toUpperCase()+f.slice(1))}
              <span style={{marginLeft:"4px",fontSize:"0.65rem",opacity:0.6}}>
                ({f==="all"?challenges.length:challenges.filter(c=>c.type===f).length})
              </span>
            </button>
          ))}
        </div>

        {/* Challenge grid */}
        {isLoading && !challenges.length ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:"14px"}}>
            {[...Array(6)].map((_,i)=>(
              <div key={i} style={{height:"200px",borderRadius:"14px",background:"rgba(255,255,255,0.03)",animation:"pulse 1.5s ease-in-out infinite"}}/>
            ))}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:"14px"}}>
            {filtered.map(c=>{
              const diff = DIFF_CONFIG[c.difficulty];
              const type = TYPE_CONFIG[c.type];
              return (
                <div key={c.id} onClick={()=>{setSelected(c);setHintIdx(0);}}
                  style={{...s.challengeCard,...(c.completed?{opacity:0.65}:{})}}>
                  {/* Top row */}
                  <div style={{display:"flex",gap:"6px",marginBottom:"10px",flexWrap:"wrap" as const}}>
                    <span style={{...s.typeBadge,background:type.bg,color:type.color}}>{type.label}</span>
                    <span style={{...s.typeBadge,background:diff.bg,color:diff.color}}>{c.difficulty}</span>
                    {c.weekendBonus&&<span style={{...s.typeBadge,background:"rgba(245,158,11,0.1)",color:"#f59e0b"}}>⚡ 2x</span>}
                    {c.battleMode&&<span style={{...s.typeBadge,background:"rgba(239,68,68,0.1)",color:"#ef4444"}}>⚔️ Battle</span>}
                    {c.completed&&<span style={{...s.typeBadge,background:"rgba(34,197,94,0.1)",color:"#22c55e"}}>✅ Done</span>}
                  </div>

                  <div style={{fontSize:"0.95rem",fontWeight:700,color:"white",marginBottom:"6px",lineHeight:1.3}}>{c.title}</div>
                  <div style={{fontSize:"0.75rem",color:"#64748b",lineHeight:1.5,marginBottom:"10px",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{c.description}</div>

                  {/* Tags */}
                  <div style={{display:"flex",gap:"4px",flexWrap:"wrap" as const,marginBottom:"10px"}}>
                    {c.tags.slice(0,3).map((t,i)=>(
                      <span key={i} style={{padding:"2px 7px",background:"rgba(99,102,241,0.1)",borderRadius:"6px",fontSize:"0.6rem",color:"#818cf8",fontWeight:600}}>#{t}</span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div style={{display:"flex",gap:"12px",alignItems:"center",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"10px"}}>
                    <span style={{fontSize:"0.78rem",fontWeight:800,color:"#ffd700"}}>+{c.xp} XP</span>
                    <span style={{fontSize:"0.72rem",color:"#475569",display:"flex",alignItems:"center",gap:"3px"}}><Clock size={11}/>{c.timeMinutes}m</span>
                    <span style={{fontSize:"0.72rem",color:"#475569",display:"flex",alignItems:"center",gap:"3px"}}><Users size={11}/>{c.participants}</span>
                    <span style={{fontSize:"0.72rem",color:"#ef4444",marginLeft:"auto"}}>⏰ {c.endsIn}</span>
                  </div>

                  {/* Action hint */}
                  {!c.completed && (
                    <div style={{marginTop:"8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:"0.72rem",color:c.joined?"#22c55e":"#6366f1",fontWeight:600}}>
                        {c.joined ? "▶ In Progress" : "▶ Start Challenge"}
                      </span>
                      <ChevronRight size={14} style={{color:"#334155"}}/>
                    </div>
                  )}
                  {c.completed && c.myScore > 0 && (
                    <div style={{marginTop:"8px",fontSize:"0.72rem",color:"#22c55e",fontWeight:600}}>✅ +{c.myScore} XP earned</div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && !isLoading && (
              <div style={{gridColumn:"1/-1",padding:"64px 24px",textAlign:"center" as const,color:"#475569"}}>
                <div style={{fontSize:"2.5rem",marginBottom:"12px"}}>⚔️</div>
                <div style={{fontSize:"0.95rem",fontWeight:600,color:"#64748b"}}>No challenges yet for this filter</div>
                <div style={{fontSize:"0.78rem",marginTop:"4px"}}>Try a different category or check back soon</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const s: Record<string,React.CSSProperties> = {
  root:{ display:"flex",minHeight:"100vh",background:"#040711",fontFamily:"'Inter',sans-serif",position:"relative",overflow:"hidden" },
  bg:{ position:"fixed",inset:0,background:"radial-gradient(ellipse 80% 60% at 20% 0%,rgba(99,102,241,0.08) 0%,transparent 60%)",pointerEvents:"none" },
  bgGrid:{ position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none" },
  glow1:{ position:"fixed",top:"-200px",left:"30%",width:"500px",height:"500px",borderRadius:"50%",background:"rgba(99,102,241,0.06)",filter:"blur(80px)",pointerEvents:"none" },
  glow2:{ position:"fixed",bottom:"-200px",right:"20%",width:"400px",height:"400px",borderRadius:"50%",background:"rgba(34,197,94,0.04)",filter:"blur(80px)",pointerEvents:"none" },
  overlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" },
  modal:{ background:"linear-gradient(135deg,#0d1224 0%,#0f172a 100%)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"20px",padding:"28px",width:"100%",maxHeight:"88vh",overflowY:"auto",position:"relative" },
  modalClose:{ position:"absolute",top:"16px",right:"16px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",color:"#64748b",cursor:"pointer",padding:"6px",display:"flex",alignItems:"center" },
  statMini:{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"2px",padding:"10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",textAlign:"center" as const },
  typeBadge:{ padding:"2px 8px",borderRadius:"6px",fontSize:"0.65rem",fontWeight:700 },
  ctaBtn:{ flex:1,padding:"12px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",borderRadius:"10px",color:"white",fontSize:"0.88rem",fontWeight:700,cursor:"pointer" },
  sidebar:{ width:"220px",minHeight:"100vh",background:"rgba(13,17,35,0.96)",borderRight:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column" as const,padding:"24px 12px",position:"fixed",left:0,top:0,bottom:0,zIndex:100 },
  nav:{ display:"flex",flexDirection:"column" as const,gap:"2px",flex:1 },
  navItem:{ width:"100%",display:"flex",alignItems:"center",gap:"10px",padding:"9px 12px",borderRadius:"10px",border:"none",background:"transparent",cursor:"pointer",transition:"all 0.15s",color:"#94a3b8" },
  navItemActive:{ background:"rgba(99,102,241,0.12)",color:"white" },
  navActiveDot:{ width:"5px",height:"5px",borderRadius:"50%",background:"#6366f1",marginLeft:"auto" },
  sidebarFooter:{ borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:"16px",display:"flex",alignItems:"center",gap:"8px" },
  sidebarUser:{ display:"flex",alignItems:"center",gap:"10px",flex:1,minWidth:0 },
  avatarSmall:{ width:"32px",height:"32px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",fontWeight:700,color:"white",flexShrink:0 },
  logoutBtn:{ background:"none",border:"none",color:"#475569",cursor:"pointer",padding:"6px",borderRadius:"8px" },
  main:{ marginLeft:"220px",flex:1,padding:"24px 28px",minHeight:"100vh" },
  topbar:{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px" },
  backBtn:{ display:"flex",alignItems:"center",gap:"4px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",color:"#64748b",cursor:"pointer",padding:"6px 12px",fontSize:"0.82rem" },
  pageTitle:{ fontSize:"1.1rem",fontWeight:700,color:"white" },
  livePill:{ display:"flex",alignItems:"center",gap:"5px",padding:"3px 10px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"20px",fontSize:"0.72rem",color:"#22c55e",fontWeight:600 },
  liveDot:{ width:"6px",height:"6px",borderRadius:"50%",background:"#22c55e",animation:"pulse 1.5s ease infinite" },
  iconBtn:{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",color:"#64748b",cursor:"pointer",padding:"7px",display:"flex",alignItems:"center" },
  avatarMed:{ width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:700,color:"white",flexShrink:0 },
  statsHeader:{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px" },
  statBox:{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"4px",padding:"16px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"12px",textAlign:"center" as const },
  filterRow:{ display:"flex",gap:"6px",marginBottom:"20px",flexWrap:"wrap" as const },
  filterBtn:{ padding:"7px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",color:"#64748b",cursor:"pointer",fontSize:"0.78rem",fontWeight:500,transition:"all 0.15s" },
  filterBtnActive:{ background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",color:"#818cf8",fontWeight:600 },
  challengeCard:{ background:"rgba(13,18,35,0.8)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"14px",padding:"16px",cursor:"pointer",transition:"all 0.2s",display:"flex",flexDirection:"column" as const },
};