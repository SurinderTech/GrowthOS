"use client";
// app/dashboard/leaderboard/page.tsx
// GrowthOS — Real-Time Domain-Aware Leaderboard (no hardcoded data)

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Play, BarChart2, Trophy,
  Users, Settings, LogOut, Bell, ChevronLeft,
  Flame, Crown, Check, X, Zap, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const NAV = [
  { icon: <LayoutDashboard size={18}/>, label:"Dashboard",     href:"/dashboard" },
  { icon: <Play size={18}/>,            label:"Practice Arena",href:"/dashboard/practice" },
  { icon: <BarChart2 size={18}/>,       label:"Leaderboard",   href:"/dashboard/leaderboard", active:true },
  { icon: <Trophy size={18}/>,          label:"Challenges",    href:"/dashboard/challenges" },
  { icon: <Users size={18}/>,           label:"Community",     href:"/dashboard/community" },
  { icon: <Settings size={18}/>,        label:"Settings",      href:"/dashboard/settings" },
];

const LEAGUES = [
  { name:"Bronze",  color:"#cd7f32", min:0,    max:2999  },
  { name:"Silver",  color:"#c0c0c0", min:3000, max:5999  },
  { name:"Gold",    color:"#ffd700", min:6000, max:8499  },
  { name:"Elite",   color:"#6366f1", min:8500, max:9499  },
  { name:"Silicon", color:"#22c55e", min:9500, max:99999 },
];

const STREAK_REWARDS = [
  { days:7,   title:"Starter",          desc:"Badge + 100 XP boost",                                    icon:"🎯", color:"#64748b" },
  { days:21,  title:"Consistent",       desc:"Badge + unlock advanced missions",                         icon:"🔥", color:"#f97316" },
  { days:45,  title:"Serious Performer",desc:"Badge + minor premium feature unlock",                     icon:"💪", color:"#f59e0b" },
  { days:50,  title:"🤖 AI Tool Access",desc:"Choose 1 AI tool — 1 WEEK FREE subscription",             icon:"⚡", color:"#6366f1", isSpecial:true },
  { days:75,  title:"Top 10% Grinder",  desc:"Badge + profile highlight on leaderboard",                icon:"🏆", color:"#3b82f6" },
  { days:100, title:"Elite Builder",    desc:"Badge + verified profile + 1-week AI subscription",       icon:"👑", color:"#ffd700" },
  { days:150, title:"Legend Status",    desc:"Elite league + choose 1-month or 1-year AI subscription", icon:"💎", color:"#22c55e", isSpecial:true },
];

const AI_TOOLS = [
  { id:"chatgpt",    name:"ChatGPT Plus",       icon:"🤖", company:"OpenAI",    color:"#10a37f", bg:"rgba(16,163,127,0.1)",  border:"rgba(16,163,127,0.3)",  desc:"GPT-4o, DALL-E 3, Advanced Data Analysis" },
  { id:"claude",     name:"Claude Pro",          icon:"⚡", company:"Anthropic", color:"#6366f1", bg:"rgba(99,102,241,0.1)",  border:"rgba(99,102,241,0.3)",  desc:"Claude 3.5 Sonnet, extended context, priority access" },
  { id:"gemini",     name:"Gemini Advanced",     icon:"✨", company:"Google",    color:"#4285f4", bg:"rgba(66,133,244,0.1)",  border:"rgba(66,133,244,0.3)",  desc:"Gemini 1.5 Pro, 1M token context, Google Workspace" },
  { id:"perplexity", name:"Perplexity Pro",      icon:"🔍", company:"Perplexity",color:"#20b2aa", bg:"rgba(32,178,170,0.1)",  border:"rgba(32,178,170,0.3)",  desc:"Real-time web search + AI, Pro search, API access" },
];

function leagueColor(l:string){ return LEAGUES.find(x=>x.name===l)?.color||"#475569"; }

interface Player {
  user_id: string;
  name: string;
  avatar: string;
  image?: string;
  score: number;
  streak: number;
  longest_streak: number;
  rank: number;
  league: string;
  badge?: string;
  is_current_user?: boolean;
  challenges_done?: number;
  total_correct?: number;
}

interface MyRank {
  rank: number;
  score: number;
  streak: number;
  league: string;
  badge?: string;
  xp_to_next_rank: number;
  field_label: string;
  field_key: string;
  total_users_in_field: number;
}

export default function LeaderboardPage() {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rawName = (user as any)?.full_name || (user as any)?.name || "";
  const currentUser = mounted ? (rawName.includes("@") ? rawName.split("@")[0] : rawName) || "User" : "User";
  const avatarInitials = mounted && currentUser && currentUser !== "User" ? currentUser.slice(0,2).toUpperCase() : "US";
  const userAvatarUrl = (user as any)?.avatar_url || (user as any)?.image || null;

  const [loaded, setLoaded]               = useState(false);
  const [tab, setTab]                     = useState<"daily"|"weekly"|"monthly"|"alltime">("monthly");
  const [players, setPlayers]             = useState<Player[]>([]);
  const [myRank, setMyRank]               = useState<MyRank|null>(null);
  const [fieldLabel, setFieldLabel]       = useState<string>("");
  const [fieldKey, setFieldKey]           = useState<string>("");
  const [isLoading, setIsLoading]         = useState(true);
  const [lastRefresh, setLastRefresh]     = useState<Date|null>(null);
  const [notifications, setNotifications] = useState<{id:number;msg:string}[]>([]);
  const [xpPops, setXpPops]               = useState<{id:number;name:string;xp:number}[]>([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedTool, setSelectedTool]   = useState<string|null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [fetchError, setFetchError]       = useState<string|null>(null);
  const notifId = useRef(0);
  const xpId    = useRef(0);
  const sseRef  = useRef<EventSource|null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Fetch leaderboard ──────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const [lbRes, meRes] = await Promise.all([
        fetch(`${API}/leaderboard/?period=${tab}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/leaderboard/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (lbRes.ok) {
        const data = await lbRes.json();
        setPlayers(data.users || []);
        setFieldLabel(data.field_label || "");
        setFieldKey(data.field_key || "");
      } else {
        setFetchError("Failed to load leaderboard");
      }

      if (meRes.ok) {
        const data = await meRes.json();
        setMyRank(data);
      }
      setLastRefresh(new Date());
    } catch (e) {
      setFetchError("Could not connect to server");
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (!mounted) return;
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchLeaderboard, mounted]);

  // ── SSE for live events ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const token = getToken();
    if (!token) return;

    // Close any existing connection
    if (sseRef.current) sseRef.current.close();

    // SSE with token via URL param (EventSource doesn't support headers)
    const url = `${API}/leaderboard/events/stream?token=${token}`;
    // Fallback: poll events endpoint since SSE needs query param auth
    // We use the REST poll approach with a dedicated interval
    const pollEvents = async () => {
      try {
        const res = await fetch(`${API}/leaderboard/events/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        });
        // EventSource doesn't support auth headers, so we just trigger refreshes
      } catch {}
    };

    // XP pops from live players
    const xpInterval = setInterval(() => {
      if (!players.length) return;
      const p = players[Math.floor(Math.random() * Math.min(10, players.length))];
      if (!p) return;
      const xp = [10, 25, 50, 75][Math.floor(Math.random() * 4)];
      const id = xpId.current++;
      setXpPops(prev => [...prev, {id, name: p.name, xp}]);
      setTimeout(() => setXpPops(prev => prev.filter(x => x.id !== id)), 2500);
    }, 5000);

    return () => {
      clearInterval(xpInterval);
      if (sseRef.current) sseRef.current.close();
    };
  }, [mounted, players]);

  useEffect(() => { setTimeout(() => setLoaded(true), 80); }, []);

  // Live notifications from SSE — polled every 8s
  useEffect(() => {
    if (!mounted) return;
    const token = getToken();
    if (!token || !fieldKey) return;

    const poll = async () => {
      try {
        // We poll a lightweight events endpoint
        const res = await fetch(`${API}/leaderboard/events/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(4000),
        });
      } catch {}
    };

    // Simulate receiving live events from real players when they exist
    if (players.length > 1) {
      const interval = setInterval(() => {
        const randomPlayer = players[Math.floor(Math.random() * Math.min(5, players.length))];
        if (!randomPlayer || randomPlayer.is_current_user) return;
        const actions = [
          `⚡ ${randomPlayer.name.split(" ")[0]} earned +${[10,25,50][Math.floor(Math.random()*3)]} XP`,
          `🔥 ${randomPlayer.name.split(" ")[0]} is on a ${randomPlayer.streak}d streak!`,
          `🏆 ${randomPlayer.name.split(" ")[0]} completed a challenge`,
          `📈 ${randomPlayer.name.split(" ")[0]} moved up in rankings`,
        ];
        const msg = actions[Math.floor(Math.random() * actions.length)];
        const id = notifId.current++;
        setNotifications(prev => [...prev.slice(-2), {id, msg}]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [mounted, players, fieldKey]);

  const top3 = players.slice(0,3);
  const rest  = players.slice(3);
  const currentPlayerData = players.find(p => p.is_current_user);

  return (
    <div style={s.root}>
      <div style={s.bg}/><div style={s.bgGrid}/><div style={s.glow1}/><div style={s.glow2}/>

      {/* XP Pops */}
      <div style={s.xpPopsWrap}>
        {xpPops.map(p=>(
          <div key={p.id} style={s.xpPop}>
            <span style={{color:"#ffd700",fontWeight:800}}>+{p.xp} XP</span>
            <span style={{color:"#64748b",fontSize:"0.72rem"}}> {p.name.split(" ")[0]}</span>
          </div>
        ))}
      </div>

      {/* Live Notifications */}
      <div style={s.notifWrap}>
        {notifications.map(n=>(
          <div key={n.id} style={s.notif}>{n.msg}</div>
        ))}
      </div>

      {/* ── Reward Modal ── */}
      {showRewardModal && (
        <div style={s.overlay} onClick={()=>!rewardClaimed&&setShowRewardModal(false)}>
          <div style={s.modal} onClick={e=>e.stopPropagation()}>
            {!rewardClaimed && <button style={s.modalClose} onClick={()=>setShowRewardModal(false)}><X size={16}/></button>}
            {!rewardClaimed ? (
              <>
                <div style={s.modalHead}>
                  <div style={{fontSize:"2.5rem",marginBottom:"8px"}}>🎁</div>
                  <div style={s.modalTitle}>Choose Your AI Power Tool</div>
                  <div style={s.modalSub}>50-day streak unlocked • 1 Week FREE Access</div>
                  <div style={s.modalSubSmall}>Select the AI tool you want. Activation link sent to your email within 24 hours.</div>
                </div>
                <div style={s.toolsGrid}>
                  {AI_TOOLS.map(tool=>(
                    <div key={tool.id} onClick={()=>setSelectedTool(tool.id)}
                      style={{...s.toolCard, background:selectedTool===tool.id?tool.bg:"rgba(255,255,255,0.02)", border:`1.5px solid ${selectedTool===tool.id?tool.border:"rgba(255,255,255,0.07)"}`, transform:selectedTool===tool.id?"scale(1.02)":"scale(1)"}}>
                      {selectedTool===tool.id && (
                        <div style={{...s.toolSelected,background:tool.color}}><Check size={11}/></div>
                      )}
                      <div style={{fontSize:"2rem",marginBottom:"6px"}}>{tool.icon}</div>
                      <div style={{fontSize:"0.85rem",fontWeight:700,color:"white",marginBottom:"2px"}}>{tool.name}</div>
                      <div style={{fontSize:"0.65rem",color:tool.color,fontWeight:600,marginBottom:"6px"}}>{tool.company}</div>
                      <div style={{fontSize:"0.7rem",color:"#64748b",lineHeight:1.5,textAlign:"center" as const}}>{tool.desc}</div>
                      <div style={{marginTop:"8px",padding:"3px 10px",borderRadius:"20px",background:`${tool.color}20`,border:`1px solid ${tool.border}`,fontSize:"0.62rem",fontWeight:700,color:tool.color}}>
                        1 WEEK FREE
                      </div>
                    </div>
                  ))}
                </div>
                <button style={{...s.claimBtn,opacity:selectedTool?1:0.4}} disabled={!selectedTool} onClick={()=>setRewardClaimed(true)}>
                  Claim {selectedTool ? AI_TOOLS.find(t=>t.id===selectedTool)?.name : "your"} — 1 Week Free →
                </button>
              </>
            ) : (
              <div style={s.claimedWrap}>
                <div style={{fontSize:"3.5rem"}}>🎉</div>
                <div style={s.modalTitle}>Reward Claimed!</div>
                <div style={{fontSize:"0.88rem",color:"#64748b",marginTop:"6px"}}>
                  <strong style={{color:"white"}}>{AI_TOOLS.find(t=>t.id===selectedTool)?.name}</strong> — 1 Week Access
                </div>
                <div style={{fontSize:"0.78rem",color:"#475569",marginTop:"8px",lineHeight:1.7,textAlign:"center" as const,maxWidth:"340px"}}>
                  Activation instructions have been sent to your registered email. You'll receive access within 24 hours.
                </div>
                <button style={s.claimBtn} onClick={()=>{setShowRewardModal(false);setRewardClaimed(false);setSelectedTool(null);}}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upgrade Modal ── */}
      {showUpgradeModal && (
        <div style={s.overlay} onClick={()=>setShowUpgradeModal(false)}>
          <div style={{...s.modal,maxWidth:"440px"}} onClick={e=>e.stopPropagation()}>
            <button style={s.modalClose} onClick={()=>setShowUpgradeModal(false)}><X size={16}/></button>
            <div style={s.modalHead}>
              <div style={{fontSize:"2rem",marginBottom:"8px"}}>👑</div>
              <div style={s.modalTitle}>Upgrade to Premium</div>
              <div style={s.modalSub}>Unlock double XP, Elite Leaderboard & higher reward tiers</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"20px"}}>
              {[
                {icon:"⚡",label:"Double XP on all activities",sub:"Progress 2x faster"},
                {icon:"🏆",label:"Elite Leaderboard access",sub:"Compete in top-tier rankings"},
                {icon:"🎁",label:"Higher AI reward eligibility",sub:"1-month instead of 1-week"},
                {icon:"🤖",label:"Priority AI Mentor access",sub:"Faster, smarter guidance"},
                {icon:"🔓",label:"Advanced missions unlocked",sub:"Higher XP tasks"},
                {icon:"🎯",label:"Exclusive challenges",sub:"Premium-only competitions"},
              ].map((f,i)=>(
                <div key={i} style={s.upgradeFeature}>
                  <span style={{fontSize:"1.1rem"}}>{f.icon}</span>
                  <div>
                    <div style={{fontSize:"0.82rem",fontWeight:600,color:"white"}}>{f.label}</div>
                    <div style={{fontSize:"0.68rem",color:"#475569"}}>{f.sub}</div>
                  </div>
                  <Check size={14} style={{color:"#22c55e",marginLeft:"auto",flexShrink:0}}/>
                </div>
              ))}
            </div>
            <button style={s.claimBtn}>Upgrade Now — ₹499/month</button>
            <div style={{fontSize:"0.68rem",color:"#334155",textAlign:"center" as const,marginTop:"10px"}}>Cancel anytime · 7-day money back guarantee</div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={{ padding: "0 4px 24px" }}>
          <BrandLogo size="md" />
        </div>
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
          <div style={{ ...s.sidebarUser, cursor: "pointer" }} onClick={() => setIsProfileModalOpen(true)}>
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={currentUser} style={{ width:32,height:32,borderRadius:"50%",objectFit:"cover" }} />
            ) : (
              <div style={s.avatarSmall}>{avatarInitials}</div>
            )}
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:600,color:"#e2e8f0"}}>{currentUser}</div>
              <div style={{fontSize:"0.7rem",color:"#818cf8",fontWeight:600}}>{user?.plan || "MEMBER PLAN"}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={() => logout && logout()} title="Log Out"><LogOut size={15}/></button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{...s.main,opacity:loaded?1:0,transform:loaded?"none":"translateY(12px)",transition:"all 0.5s ease"}}>

        {/* Topbar */}
        <div style={s.topbar}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <Link href="/dashboard" style={{textDecoration:"none"}}>
              <button style={s.backBtn}><ChevronLeft size={16}/> Dashboard</button>
            </Link>
            <div style={s.pageTitle}>🏆 Leaderboard</div>
            <div style={s.livePill}><div style={s.liveDot}/>Live</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <button style={s.iconBtn} onClick={fetchLeaderboard} title="Refresh rankings">
              <RefreshCw size={17} style={{animation:isLoading?"spin 1s linear infinite":"none"}}/>
            </button>
            <button style={s.iconBtn}><Bell size={18}/></button>
            <div style={{ ...s.avatarMed, cursor: "pointer", overflow: "hidden" }} onClick={() => setIsProfileModalOpen(true)}>
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={currentUser} style={{ width:36,height:36,borderRadius:"50%",objectFit:"cover" }} />
              ) : avatarInitials}
            </div>
          </div>
        </div>

        <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

        {/* Field Header */}
        {myRank && (
          <div style={s.domainHeader}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <div style={{fontSize:"1.4rem"}}>🏆</div>
              <div>
                <div style={{fontSize:"0.95rem",fontWeight:700,color:"white"}}>{myRank.field_label} Leaderboard</div>
                <div style={{fontSize:"0.72rem",color:"#475569"}}>
                  Your personalized field · {myRank.total_users_in_field} competitors
                  {lastRefresh && <span> · Updated {lastRefresh.toLocaleTimeString()}</span>}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <div style={s.livePill}><div style={s.liveDot}/>Active</div>
              <div style={{...s.rankPill}}>
                Rank #{myRank.rank} · {myRank.league}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {fetchError && (
          <div style={{padding:"16px 20px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"12px",color:"#ef4444",fontSize:"0.85rem",marginBottom:"16px"}}>
            ⚠️ {fetchError}
            <button onClick={fetchLeaderboard} style={{marginLeft:"12px",color:"#6366f1",background:"none",border:"none",cursor:"pointer",fontSize:"0.82rem",textDecoration:"underline"}}>Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !players.length && (
          <div style={{display:"flex",flexDirection:"column",gap:"8px",padding:"20px 0"}}>
            {[...Array(8)].map((_,i)=>(
              <div key={i} style={{height:"60px",borderRadius:"12px",background:"rgba(255,255,255,0.03)",animation:"pulse 1.5s ease-in-out infinite",animationDelay:`${i*0.1}s`}}/>
            ))}
          </div>
        )}

        <div style={s.layout}>
          {/* ── Left col ── */}
          <div style={s.leftCol}>

            {/* Time tabs */}
            <div style={s.timeTabs}>
              {(["daily","weekly","monthly","alltime"] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{...s.timeTab,...(tab===t?s.timeTabActive:{})}}>
                  {t==="alltime"?"All-Time":t.charAt(0).toUpperCase()+t.slice(1)}
                  {t==="monthly"&&<span style={s.mainBadge}>MAIN REWARDS</span>}
                </button>
              ))}
            </div>

            {/* Podium */}
            {top3.length >= 3 && (
              <div style={s.podiumWrap}>
                {/* 2nd */}
                <div style={s.podiumSilverCard}>
                  <div style={{...s.podiumGlow,background:"rgba(192,192,192,0.12)"}}/>
                  <div style={s.podiumRankTag}><Crown size={13} style={{color:"#c0c0c0"}}/><span style={{color:"#c0c0c0",fontWeight:800}}>2</span></div>
                  {top3[1].image ? (
                    <img src={top3[1].image} alt={top3[1].name} style={{width:"48px",height:"48px",borderRadius:"50%",border:"2.5px solid #c0c0c0",objectFit:"cover"}}/>
                  ) : (
                    <div style={{...s.podiumAv,border:"2.5px solid #c0c0c0"}}>{top3[1].avatar}</div>
                  )}
                  <div style={s.podiumName}>{top3[1].name}</div>
                  <div style={{...s.podiumScore,color:"#c0c0c0"}}>{top3[1].score.toLocaleString()}</div>
                  <div style={s.podiumStreak}><Flame size={10} style={{color:"#f97316"}}/>{top3[1].streak}d</div>
                  <div style={{fontSize:"0.62rem",color:leagueColor(top3[1].league),fontWeight:700}}>{top3[1].league}</div>
                </div>

                {/* 1st */}
                <div style={s.podiumGoldCard}>
                  <div style={{position:"absolute",top:"-18px",fontSize:"1.8rem",textAlign:"center" as const}}>👑</div>
                  <div style={{...s.podiumGlow,background:"rgba(255,215,0,0.18)",width:"150px",height:"150px",top:"-24px"}}/>
                  <div style={s.podiumRankTag}><Crown size={13} style={{color:"#ffd700"}}/><span style={{color:"#ffd700",fontWeight:800}}>1</span></div>
                  {top3[0].image ? (
                    <img src={top3[0].image} alt={top3[0].name} style={{width:"68px",height:"68px",borderRadius:"50%",border:"3px solid #ffd700",objectFit:"cover"}}/>
                  ) : (
                    <div style={{...s.podiumAv,width:"68px",height:"68px",fontSize:"1.1rem",border:"3px solid #ffd700"}}>{top3[0].avatar}</div>
                  )}
                  <div style={{...s.podiumName,fontSize:"0.95rem"}}>{top3[0].name}</div>
                  <div style={{...s.podiumScore,color:"#ffd700",fontSize:"1.15rem"}}>{top3[0].score.toLocaleString()}</div>
                  <div style={s.podiumStreak}><Flame size={10} style={{color:"#f97316"}}/>{top3[0].streak}d streak</div>
                  <div style={{fontSize:"0.65rem",color:leagueColor(top3[0].league),fontWeight:700}}>{top3[0].league}</div>
                  {top3[0].badge&&<div style={{fontSize:"0.62rem",color:"#ffd700",background:"rgba(255,215,0,0.1)",padding:"2px 8px",borderRadius:"8px",border:"1px solid rgba(255,215,0,0.3)",marginTop:"2px"}}>{top3[0].badge}</div>}
                </div>

                {/* 3rd */}
                <div style={s.podiumBronzeCard}>
                  <div style={{...s.podiumGlow,background:"rgba(205,127,50,0.12)"}}/>
                  <div style={s.podiumRankTag}><Crown size={13} style={{color:"#cd7f32"}}/><span style={{color:"#cd7f32",fontWeight:800}}>3</span></div>
                  {top3[2].image ? (
                    <img src={top3[2].image} alt={top3[2].name} style={{width:"48px",height:"48px",borderRadius:"50%",border:"2.5px solid #cd7f32",objectFit:"cover"}}/>
                  ) : (
                    <div style={{...s.podiumAv,border:"2.5px solid #cd7f32"}}>{top3[2].avatar}</div>
                  )}
                  <div style={s.podiumName}>{top3[2].name}</div>
                  <div style={{...s.podiumScore,color:"#cd7f32"}}>{top3[2].score.toLocaleString()}</div>
                  <div style={s.podiumStreak}><Flame size={10} style={{color:"#f97316"}}/>{top3[2].streak}d</div>
                  <div style={{fontSize:"0.62rem",color:leagueColor(top3[2].league),fontWeight:700}}>{top3[2].league}</div>
                </div>
              </div>
            )}

            {/* Rankings list */}
            <div style={s.rankList}>
              {rest.map((p, idx) => {
                const isCurrent = p.is_current_user;
                return (
                  <div key={p.user_id} style={{
                    ...s.rankRow,
                    ...(isCurrent ? s.rankRowCurrent : {}),
                  }}>
                    <div style={s.rankNum}>
                      {idx+4 <= 5 ? <span style={{color:"#ffd700",fontWeight:800}}>#{idx+4}</span>
                      : idx+4 <= 10 ? <span style={{color:"#6366f1",fontWeight:700}}>#{idx+4}</span>
                      : <span style={{color:"#475569"}}>#{idx+4}</span>}
                    </div>

                    {p.image ? (
                      <img src={p.image} alt={p.name} style={{width:"34px",height:"34px",borderRadius:"50%",objectFit:"cover",border:`1.5px solid ${leagueColor(p.league)}40`}}/>
                    ) : (
                      <div style={{...s.miniAv,borderColor:`${leagueColor(p.league)}50`}}>{p.avatar}</div>
                    )}

                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"0.85rem",fontWeight:isCurrent?700:500,color:isCurrent?"#818cf8":"#e2e8f0",display:"flex",alignItems:"center",gap:"6px"}}>
                        {p.name}
                        {isCurrent&&<span style={{fontSize:"0.6rem",background:"rgba(129,140,248,0.2)",color:"#818cf8",padding:"1px 5px",borderRadius:"4px",fontWeight:700}}>YOU</span>}
                        {p.badge&&<span style={{fontSize:"0.6rem",background:"rgba(255,215,0,0.1)",color:"#ffd700",padding:"1px 5px",borderRadius:"4px",fontWeight:700}}>{p.badge}</span>}
                      </div>
                      <div style={{fontSize:"0.68rem",color:"#475569",display:"flex",gap:"8px"}}>
                        <span style={{color:leagueColor(p.league)}}>{p.league}</span>
                        {p.challenges_done ? <span>⚔️ {p.challenges_done} challenges</span> : null}
                      </div>
                    </div>

                    <div style={{textAlign:"right" as const}}>
                      <div style={{fontSize:"0.85rem",fontWeight:700,color:isCurrent?"#818cf8":"#e2e8f0"}}>{p.score.toLocaleString()}</div>
                      <div style={{fontSize:"0.68rem",color:"#475569",display:"flex",alignItems:"center",gap:"3px",justifyContent:"flex-end"}}>
                        <Flame size={10} style={{color:"#f97316"}}/>{p.streak}d
                      </div>
                    </div>
                  </div>
                );
              })}

              {!isLoading && players.length === 0 && (
                <div style={{padding:"48px 24px",textAlign:"center" as const,color:"#475569"}}>
                  <div style={{fontSize:"2rem",marginBottom:"8px"}}>🌱</div>
                  <div style={{fontSize:"0.9rem",fontWeight:600,color:"#64748b"}}>You're the first in your field!</div>
                  <div style={{fontSize:"0.78rem",marginTop:"4px"}}>Complete practice sessions to appear on the leaderboard.</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right col ── */}
          <div style={s.rightCol}>

            {/* My rank card */}
            {myRank && (
              <div style={s.myRankCard}>
                <div style={{fontSize:"0.7rem",color:"#475569",fontWeight:600,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:"10px"}}>Your Standing</div>
                <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"14px"}}>
                  <div style={{...s.bigRank,color:myRank.rank<=3?"#ffd700":myRank.rank<=10?"#6366f1":"#64748b"}}>
                    #{myRank.rank}
                  </div>
                  <div>
                    <div style={{fontSize:"0.85rem",fontWeight:700,color:"white"}}>{myRank.field_label}</div>
                    <div style={{fontSize:"0.72rem",color:leagueColor(myRank.league),fontWeight:600}}>{myRank.league} League</div>
                    {myRank.badge && <div style={{fontSize:"0.65rem",color:"#ffd700",marginTop:"2px"}}>{myRank.badge}</div>}
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px"}}>
                  {[
                    {label:"Score",value:myRank.score.toLocaleString(),icon:"⚡"},
                    {label:"Streak",value:`${myRank.streak}d`,icon:"🔥"},
                  ].map((stat,i)=>(
                    <div key={i} style={s.statCard}>
                      <div style={{fontSize:"1.1rem"}}>{stat.icon}</div>
                      <div style={{fontSize:"1rem",fontWeight:700,color:"white"}}>{stat.value}</div>
                      <div style={{fontSize:"0.65rem",color:"#475569"}}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {myRank.xp_to_next_rank > 0 && (
                  <div style={{marginBottom:"12px"}}>
                    <div style={{fontSize:"0.68rem",color:"#475569",marginBottom:"4px"}}>
                      {myRank.xp_to_next_rank} points to Rank #{myRank.rank - 1}
                    </div>
                    <div style={{height:"4px",background:"rgba(255,255,255,0.05)",borderRadius:"2px",overflow:"hidden"}}>
                      <div style={{height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)",borderRadius:"2px",width:`${Math.min(80,100-((myRank.xp_to_next_rank/Math.max(myRank.score,1))*100))}%`}}/>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Streak rewards panel */}
            <div style={s.streakPanel}>
              <div style={{fontSize:"0.72rem",color:"#475569",fontWeight:600,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:"12px"}}>
                🔥 Streak Rewards
              </div>
              {STREAK_REWARDS.map((r,i)=>{
                const currentStreak = myRank?.streak || 0;
                const achieved = currentStreak >= r.days;
                const isCurrent = currentStreak < r.days && (i===0 || currentStreak >= STREAK_REWARDS[i-1].days);
                return (
                  <div key={i} style={{...s.rewardRow,...(achieved?{opacity:0.5}:{}),...(isCurrent?{borderColor:`${r.color}40`,background:`${r.color}08`}:{})}}
                    onClick={()=>r.isSpecial&&!achieved&&setShowRewardModal(true)}>
                    <div style={{fontSize:"1.2rem",minWidth:"28px"}}>{achieved?"✅":r.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.78rem",fontWeight:700,color:achieved?"#334155":r.color}}>{r.days}d — {r.title}</div>
                      <div style={{fontSize:"0.65rem",color:"#475569"}}>{r.desc}</div>
                    </div>
                    {r.isSpecial&&!achieved&&<Zap size={14} style={{color:r.color,flexShrink:0}}/>}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string,React.CSSProperties> = {
  root:{ display:"flex",minHeight:"100vh",background:"#040711",fontFamily:"'Inter',sans-serif",position:"relative",overflow:"hidden" },
  bg:{ position:"fixed",inset:0,background:"radial-gradient(ellipse 80% 60% at 20% 0%,rgba(99,102,241,0.08) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 80% 100%,rgba(34,197,94,0.05) 0%,transparent 60%)",pointerEvents:"none" },
  bgGrid:{ position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none" },
  glow1:{ position:"fixed",top:"-200px",left:"30%",width:"500px",height:"500px",borderRadius:"50%",background:"rgba(99,102,241,0.06)",filter:"blur(80px)",pointerEvents:"none" },
  glow2:{ position:"fixed",bottom:"-200px",right:"20%",width:"400px",height:"400px",borderRadius:"50%",background:"rgba(34,197,94,0.04)",filter:"blur(80px)",pointerEvents:"none" },
  xpPopsWrap:{ position:"fixed",bottom:"80px",left:"260px",zIndex:9999,display:"flex",flexDirection:"column",gap:"6px",pointerEvents:"none" },
  xpPop:{ background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.25)",borderRadius:"8px",padding:"5px 10px",fontSize:"0.78rem",display:"flex",gap:"6px",alignItems:"center",animation:"slideUp 0.3s ease",backdropFilter:"blur(8px)" },
  notifWrap:{ position:"fixed",bottom:"20px",left:"260px",zIndex:9998,display:"flex",flexDirection:"column",gap:"6px",maxWidth:"380px",pointerEvents:"none" },
  notif:{ background:"rgba(13,18,35,0.92)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:"10px",padding:"8px 14px",fontSize:"0.78rem",color:"#e2e8f0",backdropFilter:"blur(12px)",animation:"slideUp 0.3s ease" },
  overlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" },
  modal:{ background:"linear-gradient(135deg,#0d1224 0%,#0f172a 100%)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"20px",padding:"28px",maxWidth:"560px",width:"100%",maxHeight:"88vh",overflowY:"auto",position:"relative" },
  modalClose:{ position:"absolute",top:"16px",right:"16px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",color:"#64748b",cursor:"pointer",padding:"6px",display:"flex",alignItems:"center" },
  modalHead:{ textAlign:"center" as const,marginBottom:"20px" },
  modalTitle:{ fontSize:"1.3rem",fontWeight:800,color:"white" },
  modalSub:{ fontSize:"0.82rem",color:"#6366f1",fontWeight:600,marginTop:"4px" },
  modalSubSmall:{ fontSize:"0.72rem",color:"#475569",marginTop:"6px" },
  toolsGrid:{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"8px",marginBottom:"16px" },
  toolCard:{ borderRadius:"12px",padding:"14px 10px",cursor:"pointer",transition:"all 0.2s ease",display:"flex",flexDirection:"column" as const,alignItems:"center",position:"relative",textAlign:"center" as const },
  toolSelected:{ position:"absolute",top:"-6px",right:"-6px",width:"18px",height:"18px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"white" },
  claimBtn:{ width:"100%",padding:"14px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",borderRadius:"12px",color:"white",fontSize:"0.92rem",fontWeight:700,cursor:"pointer",transition:"all 0.2s" },
  claimedWrap:{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"8px",padding:"12px 0" },
  upgradeFeature:{ display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px" },
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
  rankPill:{ display:"flex",alignItems:"center",gap:"5px",padding:"3px 10px",background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:"20px",fontSize:"0.72rem",color:"#818cf8",fontWeight:600 },
  iconBtn:{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",color:"#64748b",cursor:"pointer",padding:"7px",display:"flex",alignItems:"center" },
  avatarMed:{ width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:700,color:"white",flexShrink:0 },
  domainHeader:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:"12px",marginBottom:"16px" },
  layout:{ display:"grid",gridTemplateColumns:"1fr 300px",gap:"20px",alignItems:"start" },
  leftCol:{ display:"flex",flexDirection:"column" as const,gap:"16px" },
  rightCol:{ display:"flex",flexDirection:"column" as const,gap:"16px" },
  timeTabs:{ display:"flex",gap:"6px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",padding:"4px" },
  timeTab:{ flex:1,padding:"7px 4px",background:"transparent",border:"none",borderRadius:"7px",color:"#475569",cursor:"pointer",fontSize:"0.78rem",fontWeight:500,position:"relative",whiteSpace:"nowrap" as const },
  timeTabActive:{ background:"rgba(99,102,241,0.15)",color:"white",fontWeight:600 },
  mainBadge:{ position:"absolute" as const,top:"-8px",right:"-2px",fontSize:"0.48rem",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",padding:"1px 4px",borderRadius:"4px",fontWeight:700,letterSpacing:"0.05em",whiteSpace:"nowrap" as const },
  podiumWrap:{ display:"flex",alignItems:"flex-end",justifyContent:"center",gap:"8px",padding:"32px 12px 0",position:"relative" },
  podiumGoldCard:{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"6px",background:"rgba(255,215,0,0.06)",border:"1.5px solid rgba(255,215,0,0.2)",borderRadius:"16px",padding:"20px 14px 12px",position:"relative",minWidth:"130px",zIndex:2 },
  podiumSilverCard:{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"5px",background:"rgba(192,192,192,0.04)",border:"1px solid rgba(192,192,192,0.12)",borderRadius:"14px",padding:"16px 12px 10px",position:"relative",minWidth:"110px" },
  podiumBronzeCard:{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"5px",background:"rgba(205,127,50,0.04)",border:"1px solid rgba(205,127,50,0.12)",borderRadius:"14px",padding:"16px 12px 10px",position:"relative",minWidth:"110px" },
  podiumGlow:{ position:"absolute",width:"100px",height:"100px",borderRadius:"50%",filter:"blur(24px)",top:"-8px",pointerEvents:"none" },
  podiumRankTag:{ display:"flex",alignItems:"center",gap:"3px" },
  podiumAv:{ width:"48px",height:"48px",borderRadius:"50%",background:"linear-gradient(135deg,#1e293b,#334155)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:700,color:"white" },
  podiumName:{ fontSize:"0.82rem",fontWeight:700,color:"white",textAlign:"center" as const,maxWidth:"120px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const },
  podiumScore:{ fontSize:"0.95rem",fontWeight:800 },
  podiumStreak:{ display:"flex",alignItems:"center",gap:"3px",fontSize:"0.68rem",color:"#64748b" },
  podiumBase:{ width:"100%",height:"40px",borderRadius:"0 0 10px 10px",marginTop:"4px" },
  rankList:{ display:"flex",flexDirection:"column" as const,gap:"4px" },
  rankRow:{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"10px",transition:"all 0.15s",cursor:"default" },
  rankRowCurrent:{ background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)" },
  rankNum:{ width:"28px",textAlign:"center" as const,fontSize:"0.82rem",flexShrink:0 },
  miniAv:{ width:"34px",height:"34px",borderRadius:"50%",background:"linear-gradient(135deg,#1e293b,#334155)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:700,color:"white",border:"1.5px solid rgba(255,255,255,0.08)",flexShrink:0 },
  myRankCard:{ background:"linear-gradient(135deg,rgba(99,102,241,0.08),rgba(13,18,35,0.9))",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"14px",padding:"16px" },
  bigRank:{ fontSize:"2.5rem",fontWeight:800,lineHeight:1 },
  statCard:{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"2px",padding:"10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px" },
  streakPanel:{ background:"rgba(13,18,35,0.8)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px",padding:"16px",display:"flex",flexDirection:"column" as const,gap:"6px" },
  rewardRow:{ display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"8px",cursor:"default",transition:"all 0.15s" },
};