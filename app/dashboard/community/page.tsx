"use client";
// app/dashboard/community/page.tsx
// GrowthOS — Your Arena · Live Multiplayer Execution Environment

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Target, Play, BarChart2, Trophy,
  BookOpen, Users, Settings, LogOut, Bell, ChevronLeft,
  Flame, Zap, Crown, Shield, X, ChevronRight, Lock,
  Star, TrendingUp, Activity, Swords,
} from "lucide-react";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  { icon: <LayoutDashboard size={18}/>, label:"Dashboard",     href:"/dashboard" },
  { icon: <Target size={18}/>,          label:"Growth Plan",   href:"/dashboard/growth-plan" },
  { icon: <Play size={18}/>,            label:"Practice Arena",href:"/dashboard/practice" },
  { icon: <BarChart2 size={18}/>,       label:"Leaderboard",   href:"/dashboard/leaderboard" },
  { icon: <Trophy size={18}/>,          label:"Challenges",    href:"/dashboard/challenges" },
  { icon: <BookOpen size={18}/>,        label:"Skills",        href:"/dashboard/skills" },
  { icon: <Users size={18}/>,           label:"Your Arena",    href:"/dashboard/community", active:true },
  { icon: <Settings size={18}/>,        label:"Settings",      href:"/dashboard/settings" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Status = "grinding"|"mission"|"idle"|"onfire"|"top";
type Title  = "Rookie"|"Consistent"|"Performer"|"Elite Builder"|"Legend";
type League = "Bronze"|"Silver"|"Gold"|"Elite"|"Silicon";

interface Player {
  id: number; name: string; avatar: string; rank: number;
  score: number; streak: number; bestStreak: number;
  status: Status; title: Title; league: League;
  currentMission: string; lastActive: string;
  missions: number; accuracy: number;
  badges: string[]; rewards: string[];
  rankHistory: number[]; isCurrentUser?: boolean;
  domain: string;
}

// ── Mock Arena Data ────────────────────────────────────────────────────────────
const ARENA_PLAYERS: Player[] = [
  { id:1,  name:"Arjun Sharma",    avatar:"AS", rank:1,  score:9840, streak:127, bestStreak:127, status:"top",      title:"Legend",       league:"Silicon", currentMission:"System Design Review",      lastActive:"Now",    missions:847, accuracy:94, badges:["🏆 Legend","💎 127 Day Streak","⚡ Speed Solver","👑 Rank 1","🔥 On Fire"], rewards:["ChatGPT 1 Year","Claude Pro 6mo","Gemini Advanced"], rankHistory:[5,3,2,1,1,1,1], domain:"Developer" },
  { id:2,  name:"Priya Nair",      avatar:"PN", rank:2,  score:9210, streak:98,  bestStreak:112, status:"onfire",   title:"Legend",       league:"Silicon", currentMission:"Building REST API",         lastActive:"1m ago", missions:720, accuracy:91, badges:["🥈 Rank 2","🔥 98 Day Streak","💻 Full-Stack","🚀 Elite Builder"], rewards:["Claude Pro 3mo","Gemini 1mo"], rankHistory:[6,4,3,3,2,2,2], domain:"Developer" },
  { id:3,  name:"Rahul Verma",     avatar:"RV", rank:3,  score:8755, streak:75,  bestStreak:88,  status:"grinding", title:"Elite Builder",league:"Elite",   currentMission:"Solving DSA Problems",      lastActive:"3m ago", missions:612, accuracy:88, badges:["🥉 Rank 3","💪 75 Day Streak","🧠 DSA Master","⭐ Top 5%"], rewards:["ChatGPT 1mo","Perplexity Pro"], rankHistory:[8,6,5,4,3,3,3], domain:"Developer" },
  { id:4,  name:"Sneha Iyer",      avatar:"SI", rank:4,  score:8120, streak:62,  bestStreak:75,  status:"mission",  title:"Elite Builder",league:"Elite",   currentMission:"Mock Test — JEE Physics",   lastActive:"5m ago", missions:534, accuracy:86, badges:["⭐ Top 5%","🔥 62 Day Streak","📊 Consistent"], rewards:["Gemini Advanced","Lovable AI"], rankHistory:[10,8,7,5,4,4,4], domain:"JEE" },
  { id:5,  name:"Aman Gupta",      avatar:"AG", rank:5,  score:7890, streak:55,  bestStreak:68,  status:"grinding", title:"Elite Builder",league:"Elite",   currentMission:"React Component Build",     lastActive:"7m ago", missions:489, accuracy:84, badges:["🏅 Top 10%","🔥 55 Day Streak","💡 Builder"], rewards:["Kling AI 1mo"], rankHistory:[12,10,9,7,5,5,5], domain:"Developer" },
  { id:6,  name:"Kavya Reddy",     avatar:"KR", rank:6,  score:7340, streak:47,  bestStreak:55,  status:"onfire",   title:"Performer",    league:"Gold",    currentMission:"UPSC Current Affairs",      lastActive:"9m ago", missions:421, accuracy:82, badges:["🔥 On Fire","🏅 Top 15%","📰 UPSC Prep"], rewards:["Perplexity Pro"], rankHistory:[15,13,11,9,7,6,6], domain:"UPSC" },
  { id:7,  name:"Vikram Singh",    avatar:"VS", rank:7,  score:6980, streak:38,  bestStreak:50,  status:"grinding", title:"Performer",    league:"Gold",    currentMission:"DevOps Pipeline Setup",     lastActive:"12m ago",missions:388, accuracy:80, badges:["💻 DevOps","🔥 38 Day Streak"], rewards:["Kling AI Credits"], rankHistory:[18,15,13,11,8,7,7], domain:"Developer" },
  { id:8,  name:"Riya Patel",      avatar:"RP", rank:8,  score:6540, streak:31,  bestStreak:45,  status:"mission",  title:"Performer",    league:"Gold",    currentMission:"NEET Biology Revision",     lastActive:"15m ago",missions:342, accuracy:79, badges:["🧬 NEET Prep","📚 Consistent","🌟 Rising Star"], rewards:["Claude Pro Credits"], rankHistory:[20,17,15,12,9,8,8], domain:"NEET" },
  { id:9,  name:"Dev Joshi",       avatar:"DJ", rank:9,  score:6120, streak:28,  bestStreak:38,  status:"idle",     title:"Performer",    league:"Gold",    currentMission:"Reading about Open Source",  lastActive:"22m ago",missions:298, accuracy:77, badges:["🔓 Open Source","📖 Learner"], rewards:["Gemini Credits"], rankHistory:[22,19,17,14,11,9,9], domain:"Developer" },
  { id:10, name:"Aisha Khan",      avatar:"AK", rank:10, score:5870, streak:24,  bestStreak:32,  status:"grinding", title:"Consistent",   league:"Silver",  currentMission:"Marketing Strategy Plan",   lastActive:"28m ago",missions:267, accuracy:75, badges:["📈 Top 20%","🎯 Business Focus"], rewards:["Notion AI"], rankHistory:[25,22,20,17,13,11,10], domain:"Business" },
  { id:11, name:"You",             avatar:"YO", rank:11, score:5420, streak:18,  bestStreak:24,  status:"grinding", title:"Consistent",   league:"Silver",  currentMission:"Solving 20 MCQs",           lastActive:"Now",    missions:234, accuracy:73, badges:["🔥 18 Day Streak","📚 Studying","🌱 Growing"], rewards:["Perplexity 1wk"], rankHistory:[28,25,23,19,15,13,11], domain:"Developer", isCurrentUser:true },
  { id:12, name:"Neha Joshi",      avatar:"NJ", rank:12, score:4990, streak:16,  bestStreak:22,  status:"mission",  title:"Consistent",   league:"Silver",  currentMission:"Content Strategy Writing",  lastActive:"35m ago",missions:210, accuracy:71, badges:["📝 Creator","📱 Social Media"], rewards:["Canva Pro"], rankHistory:[30,27,24,21,17,14,12], domain:"Creator" },
  { id:13, name:"Karan Mehta",     avatar:"KM", rank:13, score:4650, streak:14,  bestStreak:19,  status:"idle",     title:"Consistent",   league:"Silver",  currentMission:"React Native Project",      lastActive:"42m ago",missions:188, accuracy:70, badges:["📱 Mobile Dev","🔧 Builder"], rewards:["Claude Credits"], rankHistory:[32,29,26,23,18,15,13], domain:"Developer" },
  { id:14, name:"Divya Das",       avatar:"DD", rank:14, score:4210, streak:11,  bestStreak:15,  status:"idle",     title:"Rookie",       league:"Bronze",  currentMission:"Watching Python Tutorial",  lastActive:"1hr ago",missions:156, accuracy:68, badges:["🐍 Python Starter"], rewards:[], rankHistory:[35,31,28,25,20,17,14], domain:"Developer" },
  { id:15, name:"Raj Malhotra",    avatar:"RM", rank:15, score:3890, streak:9,   bestStreak:14,  status:"idle",     title:"Rookie",       league:"Bronze",  currentMission:"Reading NCERT Chapter 5",   lastActive:"1hr ago",missions:132, accuracy:65, badges:["📖 NEET Aspirant"], rewards:[], rankHistory:[38,34,30,27,22,18,15], domain:"NEET" },
  { id:16, name:"Pooja Nanda",     avatar:"PP", rank:16, score:3540, streak:7,   bestStreak:10,  status:"idle",     title:"Rookie",       league:"Bronze",  currentMission:"Instagram Content Planning", lastActive:"2hr ago",missions:112, accuracy:63, badges:["🎬 Content Creator","🌟 Starter"], rewards:[], rankHistory:[40,36,32,28,24,20,16], domain:"Creator" },
  { id:17, name:"Siddharth Das",   avatar:"SD", rank:17, score:3120, streak:5,   bestStreak:8,   status:"idle",     title:"Rookie",       league:"Bronze",  currentMission:"Git & GitHub Practice",     lastActive:"3hr ago",missions:88,  accuracy:60, badges:["🐣 New Coder"], rewards:[], rankHistory:[42,38,34,30,26,21,17], domain:"Developer" },
  { id:18, name:"Ananya Roy",      avatar:"AR", rank:18, score:2780, streak:3,   bestStreak:5,   status:"idle",     title:"Rookie",       league:"Bronze",  currentMission:"Setting up Dev Environment", lastActive:"5hr ago",missions:64,  accuracy:57, badges:["🌱 Just Started"], rewards:[], rankHistory:[44,40,36,32,28,23,18], domain:"Developer" },
];

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status,{label:string;color:string;dot:string;bg:string}> = {
  grinding: { label:"Grinding",      color:"#22c55e", dot:"🟢", bg:"rgba(34,197,94,0.12)"  },
  mission:  { label:"In Mission",    color:"#f59e0b", dot:"⚡", bg:"rgba(245,158,11,0.12)"  },
  idle:     { label:"Idle",          color:"#475569", dot:"💤", bg:"rgba(71,85,105,0.12)"   },
  onfire:   { label:"On Fire",       color:"#ef4444", dot:"🔥", bg:"rgba(239,68,68,0.12)"   },
  top:      { label:"Top Performer", color:"#ffd700", dot:"👑", bg:"rgba(255,215,0,0.12)"   },
};

const TITLE_CONFIG: Record<Title,{color:string}> = {
  "Rookie":        { color:"#64748b" },
  "Consistent":    { color:"#22c55e" },
  "Performer":     { color:"#3b82f6" },
  "Elite Builder": { color:"#6366f1" },
  "Legend":        { color:"#ffd700" },
};

const LEAGUE_COLORS: Record<League,string> = {
  Bronze:"#cd7f32", Silver:"#c0c0c0", Gold:"#ffd700", Elite:"#6366f1", Silicon:"#22c55e",
};

const LIVE_EVENTS = [
  "⚡ Arjun just completed System Design in 18 minutes!",
  "🔥 Priya extended her streak to 98 days!",
  "🚀 Rahul solved 15 DSA problems — +120 XP",
  "👑 Sneha moved to Rank #4 in JEE Arena",
  "💥 Aman shipped a full React project today",
  "🎯 Kavya completed 50 UPSC MCQs this session",
  "⚡ You are in the top 20% of your Arena!",
  "🏆 Vikram set a new personal best streak",
  "🔥 Riya just started a NEET Biology session",
  "💎 Aisha climbed 3 ranks this week!",
  "🎮 Arjun challenged Priya — match starts in 3s",
  "🌟 Dev Joshi unlocked Open Source badge",
];

const CHALLENGE_RESULTS = [
  { win:true,  xp:30, msg:"You crushed it! Faster completion time." },
  { win:true,  xp:20, msg:"Higher accuracy sealed the win!" },
  { win:false, xp:10, msg:"Close match — you earned XP for trying!" },
  { win:true,  xp:25, msg:"Better streak gave you the edge." },
  { win:false, xp:10, msg:"Good fight! Challenge them again tomorrow." },
];

// ── Helper ────────────────────────────────────────────────────────────────────
function streakFlameLevel(streak:number){ if(streak>=100)return 3; if(streak>=50)return 2; if(streak>=20)return 1; return 0; }
function leagueGlow(league:League){ const c=LEAGUE_COLORS[league]; return league==="Silicon"||league==="Elite"?`0 0 20px ${c}40`:league==="Gold"?`0 0 12px ${c}25`:"none"; }

// ─────────────────────────────────────────────────────────────────────────────
export default function YourArenaPage() {
  const [loaded, setLoaded]                   = useState(false);
  const [players, setPlayers]                 = useState<Player[]>(ARENA_PLAYERS);
  const [domain, setDomain]                   = useState("All");
  const [liveEvents, setLiveEvents]           = useState<{id:number;msg:string}[]>([]);
  const [selectedPlayer, setSelectedPlayer]   = useState<Player|null>(null);
  const [challengeTarget, setChallengeTarget] = useState<Player|null>(null);
  const [challengeResult, setChallengeResult] = useState<{win:boolean;xp:number;msg:string}|null>(null);
  const [challengeAnim, setChallengeAnim]     = useState<"idle"|"fighting"|"result">("idle");
  const [onlineCount, setOnlineCount]         = useState(7);
  const [xpPops, setXpPops]                   = useState<{id:number;xp:number;x:number}[]>([]);
  const [hoveredCard, setHoveredCard]         = useState<number|null>(null);
  const evId = useRef(0); const xpId = useRef(0);

  useEffect(() => { setTimeout(()=>setLoaded(true),100); }, []);

  // Live events ticker
  useEffect(()=>{
    const t = setInterval(()=>{
      const msg = LIVE_EVENTS[Math.floor(Math.random()*LIVE_EVENTS.length)];
      const id = evId.current++;
      setLiveEvents(prev=>[{id,msg},...prev.slice(0,7)]);
    },2800);
    return ()=>clearInterval(t);
  },[]);

  // Random XP pops
  useEffect(()=>{
    const t = setInterval(()=>{
      const id=xpId.current++;
      const xp=[10,20,25,50][Math.floor(Math.random()*4)];
      setXpPops(prev=>[...prev,{id,xp,x:Math.random()*80+10}]);
      setTimeout(()=>setXpPops(prev=>prev.filter(p=>p.id!==id)),2200);
    },3500);
    return ()=>clearInterval(t);
  },[]);

  // Online count fluctuation
  useEffect(()=>{
    const t = setInterval(()=>setOnlineCount(Math.floor(Math.random()*5)+5),6000);
    return ()=>clearInterval(t);
  },[]);

  // Score drift for live feel
  useEffect(()=>{
    const t = setInterval(()=>{
      setPlayers(prev=>{
        const next=[...prev];
        const idx=Math.floor(Math.random()*6);
        if(next[idx]&&!next[idx].isCurrentUser){
          next[idx]={...next[idx],score:next[idx].score+Math.floor(Math.random()*15)+5};
        }
        return next;
      });
    },4000);
    return ()=>clearInterval(t);
  },[]);

  const startChallenge = useCallback((p:Player)=>{
    setChallengeTarget(p);
    setChallengeAnim("fighting");
    setChallengeResult(null);
    const duration = 2500+Math.random()*1500;
    setTimeout(()=>{
      const result = CHALLENGE_RESULTS[Math.floor(Math.random()*CHALLENGE_RESULTS.length)];
      setChallengeResult(result);
      setChallengeAnim("result");
    },duration);
  },[]);

  const closeChallenge = ()=>{
    setChallengeTarget(null);
    setChallengeResult(null);
    setChallengeAnim("idle");
  };

  const filteredPlayers = domain==="All" ? players : players.filter(p=>p.domain===domain||p.isCurrentUser);
  const me = players.find(p=>p.isCurrentUser)!;
  const above = players.find(p=>p.rank===me.rank-1);
  const below = players.find(p=>p.rank===me.rank+1);

  return (
    <div style={s.root}>
      <div style={s.bg}/><div style={s.grid}/>
      <div style={s.scanline}/>
      <div style={s.glow1}/><div style={s.glow2}/><div style={s.glow3}/>

      {/* XP pops */}
      {xpPops.map(p=>(
        <div key={p.id} style={{...s.xpPop,left:`${p.x}%`}}>+{p.xp} XP</div>
      ))}

      {/* ── Profile Modal ── */}
      {selectedPlayer && (
        <div style={s.overlay} onClick={()=>setSelectedPlayer(null)}>
          <div style={s.profileModal} onClick={e=>e.stopPropagation()}>
            <button style={s.modalX} onClick={()=>setSelectedPlayer(null)}><X size={16}/></button>

            {/* Profile header */}
            <div style={{...s.profileHero,background:`radial-gradient(circle at 30% 50%, ${LEAGUE_COLORS[selectedPlayer.league]}20 0%, transparent 60%)`}}>
              <div style={{...s.profileAvatar, boxShadow:leagueGlow(selectedPlayer.league), border:`2px solid ${LEAGUE_COLORS[selectedPlayer.league]}`}}>
                {selectedPlayer.avatar}
              </div>
              <div style={s.profileInfo}>
                <div style={s.profileName}>{selectedPlayer.name}</div>
                <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap" as const}}>
                  <span style={{...s.profileTitle,color:TITLE_CONFIG[selectedPlayer.title].color}}>
                    {selectedPlayer.title}
                  </span>
                  <span style={{...s.leagueBadge,color:LEAGUE_COLORS[selectedPlayer.league],borderColor:`${LEAGUE_COLORS[selectedPlayer.league]}40`}}>
                    {selectedPlayer.league}
                  </span>
                  <span style={{...s.statusChip,...STATUS_CONFIG[selectedPlayer.status]}}>
                    {STATUS_CONFIG[selectedPlayer.status].dot} {STATUS_CONFIG[selectedPlayer.status].label}
                  </span>
                </div>
                <div style={{fontSize:"0.75rem",color:"#475569",marginTop:"4px"}}>
                  {selectedPlayer.domain} · Last active {selectedPlayer.lastActive}
                </div>
              </div>
              <div style={s.profileRankBig}>#{selectedPlayer.rank}</div>
            </div>

            {/* Stats grid */}
            <div style={s.profileStats}>
              {[
                {label:"Power Score",  value:selectedPlayer.score.toLocaleString(), color:"#6366f1", icon:"⚡"},
                {label:"Current Streak",value:`${selectedPlayer.streak} days`,      color:"#f97316", icon:"🔥"},
                {label:"Best Streak",   value:`${selectedPlayer.bestStreak} days`,   color:"#f59e0b", icon:"🏆"},
                {label:"Missions Done", value:selectedPlayer.missions.toLocaleString(), color:"#22c55e", icon:"✅"},
                {label:"Accuracy",      value:`${selectedPlayer.accuracy}%`,         color:"#3b82f6", icon:"🎯"},
                {label:"League",        value:selectedPlayer.league,                 color:LEAGUE_COLORS[selectedPlayer.league], icon:"🏅"},
              ].map((stat,i)=>(
                <div key={i} style={s.profileStat}>
                  <div style={{fontSize:"1.1rem"}}>{stat.icon}</div>
                  <div style={{fontSize:"1rem",fontWeight:700,color:stat.color}}>{stat.value}</div>
                  <div style={{fontSize:"0.65rem",color:"#475569"}}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Rank history */}
            <div style={s.rankHistoryWrap}>
              <div style={s.sectionLabel}>📈 Rank History (Last 7 weeks)</div>
              <div style={s.rankHistoryChart}>
                {selectedPlayer.rankHistory.map((r,i)=>{
                  const h = Math.max(10, 100-(r/44)*80);
                  return (
                    <div key={i} style={s.rankBar}>
                      <div style={{...s.rankBarFill,height:`${h}%`,background:`linear-gradient(180deg,${LEAGUE_COLORS[selectedPlayer.league]},${LEAGUE_COLORS[selectedPlayer.league]}60)`}}/>
                      <div style={{fontSize:"0.6rem",color:"#334155",marginTop:"2px"}}>#{r}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Badges */}
            <div style={s.badgesWrap}>
              <div style={s.sectionLabel}>🏆 Badges & Achievements</div>
              <div style={{display:"flex",flexWrap:"wrap" as const,gap:"6px"}}>
                {selectedPlayer.badges.map((b,i)=>(
                  <span key={i} style={s.badge}>{b}</span>
                ))}
              </div>
            </div>

            {/* Rewards */}
            {selectedPlayer.rewards.length>0 && (
              <div style={s.rewardsWrap}>
                <div style={s.sectionLabel}>🎁 Rewards Unlocked</div>
                <div style={{display:"flex",flexWrap:"wrap" as const,gap:"6px"}}>
                  {selectedPlayer.rewards.map((r,i)=>(
                    <span key={i} style={s.rewardChip}>{r}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Locked section */}
            <div style={s.lockedSection}>
              <Lock size={14} style={{color:"#ffd700"}}/>&nbsp;
              <span style={{fontSize:"0.78rem",color:"#64748b"}}>🔒 Detailed analytics, activity history & advanced comparison</span>
              &nbsp;<span style={{fontSize:"0.72rem",color:"#ffd700",fontWeight:700}}>Upgrade to Elite</span>
            </div>

            {/* Actions */}
            {!selectedPlayer.isCurrentUser && (
              <div style={{display:"flex",gap:"10px",marginTop:"16px"}}>
                <button style={s.challengeModalBtn}
                  onClick={()=>{setSelectedPlayer(null);startChallenge(selectedPlayer);}}>
                  ⚔️ Challenge {selectedPlayer.name.split(" ")[0]}
                </button>
                <button style={s.compareBtn}>
                  📊 Compare with Me
                </button>
                <button style={s.projectsBtn}>
                  🔗 View Projects
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Challenge Modal ── */}
      {challengeTarget && (
        <div style={s.overlay}>
          <div style={s.challengeModal}>
            {challengeAnim==="fighting" ? (
              <>
                <div style={s.fightTitle}>⚔️ BATTLE IN PROGRESS</div>
                <div style={s.fightRow}>
                  <div style={s.fighter}>
                    <div style={s.fighterAv}>YO</div>
                    <div style={{color:"white",fontWeight:700,fontSize:"0.88rem"}}>You</div>
                    <div style={{color:"#6366f1",fontSize:"0.72rem"}}>Rank #11</div>
                  </div>
                  <div style={s.vsText}>VS</div>
                  <div style={s.fighter}>
                    <div style={{...s.fighterAv,background:`${LEAGUE_COLORS[challengeTarget.league]}30`,border:`2px solid ${LEAGUE_COLORS[challengeTarget.league]}`}}>{challengeTarget.avatar}</div>
                    <div style={{color:"white",fontWeight:700,fontSize:"0.88rem"}}>{challengeTarget.name.split(" ")[0]}</div>
                    <div style={{color:LEAGUE_COLORS[challengeTarget.league],fontSize:"0.72rem"}}>Rank #{challengeTarget.rank}</div>
                  </div>
                </div>
                <div style={s.fightBar}>
                  <div style={s.fightBarFill}/>
                </div>
                <div style={{fontSize:"0.8rem",color:"#475569",marginTop:"8px"}}>Comparing scores, streak, accuracy...</div>
              </>
            ) : (
              <>
                <div style={{fontSize:"3rem",textAlign:"center" as const}}>{challengeResult?.win?"🎉":"💪"}</div>
                <div style={{...s.fightTitle,color:challengeResult?.win?"#22c55e":"#f59e0b"}}>
                  {challengeResult?.win?"YOU WIN!":"GOOD FIGHT!"}
                </div>
                <div style={{fontSize:"1.2rem",fontWeight:800,color:"#ffd700",textAlign:"center" as const}}>
                  +{challengeResult?.xp} XP EARNED
                </div>
                <div style={{fontSize:"0.82rem",color:"#64748b",textAlign:"center" as const,marginTop:"4px"}}>
                  {challengeResult?.msg}
                </div>
                <div style={{display:"flex",gap:"10px",marginTop:"16px"}}>
                  <button style={s.challengeAgainBtn} onClick={()=>startChallenge(challengeTarget)}>⚔️ Rematch</button>
                  <button style={s.compareBtn} onClick={closeChallenge}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={s.sidebarLogo}>
          <Image src="/images/GrowthOs.png" alt="GrowthOS" width={32} height={32} style={{borderRadius:"50%"}}/>
          <span style={s.sidebarLogoText}>GrowthOS</span>
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
          <div style={s.sidebarUser}>
            <div style={s.avatarSmall}>Y</div>
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:600,color:"#e2e8f0"}}>You</div>
              <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#22c55e",animation:"livePulse 1.5s ease-in-out infinite"}}/>
                <span style={{fontSize:"0.65rem",color:"#22c55e"}}>Online</span>
              </div>
            </div>
          </div>
          <button style={s.logoutBtn}><LogOut size={15}/></button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{...s.main,opacity:loaded?1:0,transform:loaded?"none":"translateY(14px)",transition:"all 0.6s ease"}}>

        {/* Topbar */}
        <div style={s.topbar}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <Link href="/dashboard" style={{textDecoration:"none"}}>
              <button style={s.backBtn}><ChevronLeft size={16}/> Dashboard</button>
            </Link>
            <div>
              <div style={s.arenaTitle}>⚔️ Your Arena</div>
              <div style={{fontSize:"0.7rem",color:"#475569"}}>Digital Silicon Valley · Live Execution Environment</div>
            </div>
            <div style={s.onlinePill}>
              <div style={s.onlineDot}/>
              {onlineCount} online now
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <button style={s.iconBtn}><Bell size={18}/></button>
            <div style={s.avatarMed}>Y</div>
          </div>
        </div>

        {/* ══ YOUR STATS BANNER ══ */}
        <div style={s.myStatsBanner}>
          <div style={s.myStatsLeft}>
            <div style={s.myAvatarWrap}>
              <div style={s.myAvatar}>YO</div>
              <div style={s.myStatusDot}/>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.2rem",fontWeight:700,color:"white"}}>You</span>
                <span style={{...s.myTitle,color:TITLE_CONFIG[me.title].color}}>{me.title}</span>
                <span style={{...s.myLeague,color:LEAGUE_COLORS[me.league]}}>{me.league}</span>
              </div>
              <div style={{fontSize:"0.75rem",color:"#22c55e",marginTop:"1px"}}>
                {me.currentMission} · Active now
              </div>
            </div>
          </div>
          <div style={s.myStatsCells}>
            {[
              {label:"Rank",    value:`#${me.rank}`,            color:"#6366f1"},
              {label:"Score",   value:me.score.toLocaleString(), color:"white"},
              {label:"Streak",  value:`${me.streak}🔥`,         color:"#f97316"},
              {label:"Missions",value:me.missions,              color:"#22c55e"},
              {label:"Accuracy",value:`${me.accuracy}%`,        color:"#3b82f6"},
            ].map((c,i)=>(
              <div key={i} style={s.myStatsCell}>
                <div style={{fontSize:"1rem",fontWeight:800,color:c.color}}>{c.value}</div>
                <div style={{fontSize:"0.62rem",color:"#475569"}}>{c.label}</div>
              </div>
            ))}
          </div>
          <div style={s.myInsight}>
            <div style={{fontSize:"0.72rem",color:"#6366f1",fontWeight:700,marginBottom:"3px"}}>AI Arena Insight</div>
            <div style={{fontSize:"0.75rem",color:"#94a3b8",lineHeight:1.5}}>
              You are in the <strong style={{color:"#f59e0b"}}>top 20%</strong> of your Arena.
              Only <strong style={{color:"#22c55e"}}>3 XP</strong> ahead of Neha Joshi.
              Complete 1 more mission to rank up! 🚀
            </div>
          </div>
        </div>

        {/* ══ TOP 5 PERFORMERS ══ */}
        <div style={s.topPerformersWrap}>
          <div style={s.sectionHeader}>
            <Crown size={16} style={{color:"#ffd700"}}/>
            <span style={s.sectionTitle}>Top Performers</span>
            <span style={s.sectionSub}>Elite executers in your arena right now</span>
          </div>
          <div style={s.topPerformersRow}>
            {players.slice(0,5).map((p,i)=>(
              <div key={p.id} style={{...s.topPCard, boxShadow:leagueGlow(p.league), cursor:"pointer"}}
                onClick={()=>setSelectedPlayer(p)}>
                <div style={{...s.topPRank,color:[
                  "#ffd700","#c0c0c0","#cd7f32","#6366f1","#22c55e"
                ][i]}}>#{p.rank}</div>
                <div style={{...s.topPAvatar,border:`2px solid ${LEAGUE_COLORS[p.league]}`,boxShadow:`0 0 12px ${LEAGUE_COLORS[p.league]}40`}}>
                  {p.avatar}
                </div>
                <div style={{fontSize:"0.78rem",fontWeight:700,color:"white",textAlign:"center" as const}}>{p.name.split(" ")[0]}</div>
                <div style={{...s.topPScore,color:LEAGUE_COLORS[p.league]}}>{p.score.toLocaleString()}</div>
                <div style={{display:"flex",alignItems:"center",gap:"3px",fontSize:"0.68rem",color:"#f97316"}}>
                  <span>🔥</span><span>{p.streak}d</span>
                </div>
                <div style={{...s.topPStatus,...STATUS_CONFIG[p.status]}}>
                  {STATUS_CONFIG[p.status].dot} {STATUS_CONFIG[p.status].label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ MAIN CONTENT ══ */}
        <div style={s.arenaLayout}>

          {/* ── Left: Player Cards ── */}
          <div style={s.cardsCol}>
            {/* Domain filter */}
            <div style={s.domainFilter}>
              {["All","Developer","JEE","NEET","UPSC","Creator","Business"].map(d=>(
                <button key={d} onClick={()=>setDomain(d)}
                  style={{...s.domainBtn,...(domain===d?s.domainBtnActive:{})}}>
                  {d}
                </button>
              ))}
            </div>

            {/* Your position band */}
            <div style={s.positionBand}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <Zap size={14} style={{color:"#6366f1"}}/>
                <span style={{fontSize:"0.78rem",color:"white",fontWeight:600}}>Your Position</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"12px",fontSize:"0.75rem",color:"#64748b"}}>
                {above && <span>↑ {above.name.split(" ")[0]} · #{above.rank}</span>}
                <span style={{color:"#6366f1",fontWeight:700}}>You · #{me.rank}</span>
                {below && <span>↓ {below.name.split(" ")[0]} · #{below.rank}</span>}
              </div>
              <div style={{fontSize:"0.72rem",color:"#22c55e"}}>
                Only {above?above.score-me.score:0} XP to rank up 🚀
              </div>
            </div>

            {/* Player cards grid */}
            <div style={s.cardsGrid}>
              {filteredPlayers.map((player,idx)=>{
                const flameLevel = streakFlameLevel(player.streak);
                const isMe = player.isCurrentUser;
                const st = STATUS_CONFIG[player.status];
                const isHovered = hoveredCard===player.id;

                return (
                  <div key={player.id}
                    onMouseEnter={()=>setHoveredCard(player.id)}
                    onMouseLeave={()=>setHoveredCard(null)}
                    style={{
                      ...s.playerCard,
                      ...(isMe?s.playerCardMe:{}),
                      boxShadow: isMe?"0 0 0 1.5px #6366f1, 0 0 24px rgba(99,102,241,0.2)":
                        player.league==="Silicon"?"0 0 16px rgba(34,197,94,0.15)":
                        player.league==="Elite"?"0 0 12px rgba(99,102,241,0.12)":"none",
                      transform: isHovered?"translateY(-2px)":"none",
                      transition:"all .2s ease",
                    }}>

                    {/* Glow bar top */}
                    <div style={{...s.cardGlowBar,background:isMe?`linear-gradient(90deg,#6366f1,#3b82f6)`:
                      player.league==="Silicon"?`linear-gradient(90deg,#22c55e,#10b981)`:
                      player.league==="Elite"?`linear-gradient(90deg,#6366f1,#8b5cf6)`:
                      player.league==="Gold"?`linear-gradient(90deg,#ffd700,#f59e0b)`:
                      `linear-gradient(90deg,#334155,#475569)`}}/>

                    {/* Card header */}
                    <div style={s.cardHeader}>
                      {/* Rank */}
                      <div style={{...s.cardRank,color:player.rank<=3?"#ffd700":player.rank<=10?"#6366f1":"#475569"}}>
                        #{player.rank}
                      </div>

                      {/* Avatar */}
                      <div style={{position:"relative"}}>
                        <div style={{
                          ...s.cardAvatar,
                          background:isMe?"linear-gradient(135deg,#6366f1,#3b82f6)":"rgba(255,255,255,0.06)",
                          border:`1.5px solid ${LEAGUE_COLORS[player.league]}50`,
                          boxShadow:flameLevel>=2?`0 0 14px ${LEAGUE_COLORS[player.league]}50`:"none",
                        }}>
                          {player.avatar}
                        </div>
                        {/* Status dot */}
                        <div style={{position:"absolute",bottom:"-2px",right:"-2px",width:"10px",height:"10px",borderRadius:"50%",background:st.color,border:"1.5px solid rgba(6,15,34,1)"}}/>
                      </div>

                      {/* Name + title */}
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                          <button style={s.playerNameBtn} onClick={()=>setSelectedPlayer(player)}>
                            {player.name}
                          </button>
                          {isMe&&<span style={s.youTag}>YOU</span>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:"5px",marginTop:"2px"}}>
                          <span style={{fontSize:"0.65rem",fontWeight:700,color:TITLE_CONFIG[player.title].color}}>
                            {player.title}
                          </span>
                          <span style={{fontSize:"0.6rem",color:"#334155"}}>·</span>
                          <span style={{fontSize:"0.65rem",color:"#334155"}}>{player.domain}</span>
                        </div>
                      </div>

                      {/* Score */}
                      <div style={{textAlign:"right" as const}}>
                        <div style={{fontSize:"0.88rem",fontWeight:800,color:isMe?"#6366f1":"#94a3b8"}}>
                          {player.score.toLocaleString()}
                        </div>
                        <div style={{fontSize:"0.6rem",color:"#334155"}}>XP</div>
                      </div>
                    </div>

                    {/* Streak + status row */}
                    <div style={s.cardMeta}>
                      {/* Streak with flame animation */}
                      <div style={s.streakWrap}>
                        <span style={{
                          fontSize: flameLevel>=3?"1rem":flameLevel>=2?"0.9rem":"0.82rem",
                          animation: flameLevel>=2?"flamePulse 1.2s ease-in-out infinite":"none",
                        }}>🔥</span>
                        <span style={{fontSize:"0.75rem",fontWeight:700,color:
                          flameLevel>=3?"#ef4444":flameLevel>=2?"#f97316":flameLevel>=1?"#f59e0b":"#64748b"}}>
                          {player.streak}d
                        </span>
                      </div>

                      {/* Status badge */}
                      <div style={{...s.statusBadge,background:st.bg,color:st.color}}>
                        {st.dot} {st.label}
                      </div>

                      {/* League */}
                      <div style={{fontSize:"0.62rem",fontWeight:700,color:LEAGUE_COLORS[player.league]}}>
                        {player.league}
                      </div>
                    </div>

                    {/* Current mission */}
                    <div style={s.missionWrap}>
                      <div style={{fontSize:"0.6rem",color:"#334155",marginBottom:"2px"}}>CURRENT MISSION</div>
                      <div style={{fontSize:"0.73rem",color:player.status==="idle"?"#334155":"#94a3b8"}}>
                        {player.status==="idle"?"💤 Resting":"⚡ "+player.currentMission}
                      </div>
                    </div>

                    {/* Progress to next rank */}
                    <div style={s.progressWrap}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                        <span style={{fontSize:"0.6rem",color:"#334155"}}>Progress to #{player.rank-1}</span>
                        <span style={{fontSize:"0.6rem",color:"#475569"}}>
                          {player.rank>1?`${Math.min(95,Math.floor((player.score/(players[player.rank-2]?.score||player.score+100))*100))}%`:"MAX"}
                        </span>
                      </div>
                      <div style={s.progressBar}>
                        <div style={{...s.progressFill,
                          width:`${player.rank>1?Math.min(95,Math.floor((player.score/(players[player.rank-2]?.score||player.score+100))*100)):100}%`,
                          background:isMe?"linear-gradient(90deg,#6366f1,#3b82f6)":
                            player.league==="Silicon"?"linear-gradient(90deg,#22c55e,#10b981)":
                            player.league==="Elite"?"linear-gradient(90deg,#6366f1,#8b5cf6)":
                            "linear-gradient(90deg,#334155,#475569)"
                        }}/>
                      </div>
                    </div>

                    {/* Last active + actions */}
                    <div style={s.cardFooter}>
                      <span style={{fontSize:"0.65rem",color:player.lastActive==="Now"?"#22c55e":"#334155"}}>
                        {player.lastActive==="Now"?"🟢 Active now":"⏱ "+player.lastActive}
                      </span>
                      {!isMe && (
                        <div style={{display:"flex",gap:"5px"}}>
                          <button style={s.viewBtn} onClick={()=>setSelectedPlayer(player)}>View</button>
                          <button style={s.challengeBtn} onClick={()=>startChallenge(player)}>⚔️</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Live Feed + Stats ── */}
          <div style={s.rightPanel}>

            {/* Live Activity Feed */}
            <div style={s.feedCard}>
              <div style={s.feedHeader}>
                <Activity size={14} style={{color:"#22c55e"}}/>
                <span style={s.feedTitle}>Live Feed</span>
                <div style={s.livePill}><div style={s.liveDot}/>LIVE</div>
              </div>
              <div style={s.feedList}>
                {liveEvents.slice(0,8).map((ev,i)=>(
                  <div key={ev.id} style={{...s.feedItem,opacity:1-i*0.1,fontSize:i===0?"0.78rem":"0.74rem"}}>
                    {ev.msg}
                  </div>
                ))}
                {liveEvents.length===0&&(
                  <div style={{fontSize:"0.75rem",color:"#334155",padding:"12px 0"}}>
                    Arena is warming up...
                  </div>
                )}
              </div>
            </div>

            {/* Arena stats */}
            <div style={s.arenaStatsCard}>
              <div style={s.feedTitle}>⚡ Arena Stats</div>
              <div style={{display:"flex",flexDirection:"column",gap:"8px",marginTop:"12px"}}>
                {[
                  {label:"Players Online",  value:onlineCount,  color:"#22c55e"},
                  {label:"Active Missions", value:6,            color:"#f59e0b"},
                  {label:"XP Given Today",  value:"2,840",      color:"#6366f1"},
                  {label:"Challenges Today",value:14,           color:"#ef4444"},
                  {label:"Streaks Active",  value:11,           color:"#f97316"},
                ].map((stat,i)=>(
                  <div key={i} style={s.arenaStat}>
                    <span style={{fontSize:"0.75rem",color:"#64748b"}}>{stat.label}</span>
                    <span style={{fontSize:"0.85rem",fontWeight:700,color:stat.color}}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Your position */}
            <div style={s.positionCard}>
              <div style={s.feedTitle}>📍 Your Position</div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",marginTop:"12px"}}>
                {[above,me,below].map((p,i)=>{
                  if(!p)return null;
                  const isMe = p.isCurrentUser;
                  return(
                    <div key={p.id} style={{...s.posRow,...(isMe?s.posRowMe:{})}}>
                      <span style={{fontSize:"0.72rem",fontWeight:700,color:isMe?"#6366f1":"#475569",minWidth:"28px"}}>#{p.rank}</span>
                      <div style={{...s.posAv,background:isMe?"linear-gradient(135deg,#6366f1,#3b82f6)":"rgba(255,255,255,0.05)"}}>{p.avatar}</div>
                      <span style={{flex:1,fontSize:"0.75rem",color:isMe?"white":"#64748b",fontWeight:isMe?600:400}}>{isMe?"You":p.name.split(" ")[0]}</span>
                      <span style={{fontSize:"0.72rem",fontWeight:700,color:isMe?"#6366f1":"#475569"}}>{p.score.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div style={s.posInsight}>
                🚀 Only <strong style={{color:"#6366f1"}}>{above?above.score-me.score:0} XP</strong> to Rank #{me.rank-1}
              </div>
            </div>

            {/* Motivational card */}
            <div style={s.motivCard}>
              <div style={{fontSize:"1.2rem",marginBottom:"6px"}}>🔥</div>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:"white",marginBottom:"4px",lineHeight:1.4}}>
                Don't break your streak today!
              </div>
              <div style={{fontSize:"0.72rem",color:"#64748b",lineHeight:1.6}}>
                You're in the <strong style={{color:"#f59e0b"}}>top 20%</strong> of your Arena.
                Complete 1 more mission to climb higher.
              </div>
              <div style={{marginTop:"10px",padding:"6px 10px",background:"rgba(99,102,241,0.08)",borderRadius:"8px",fontSize:"0.7rem",color:"#818cf8",border:"1px solid rgba(99,102,241,0.15)"}}>
                ⚡ 6 players are currently grinding ahead of you
              </div>
            </div>

            {/* Locked insights */}
            <div style={s.lockedCard} onClick={()=>{}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                <Lock size={16} style={{color:"#ffd700"}}/>
                <span style={{fontSize:"0.85rem",fontWeight:700,color:"#ffd700"}}>Elite Insights</span>
              </div>
              {["Deep performance analytics","Full activity history","Side-by-side comparison","AI coaching report"].map((f,i)=>(
                <div key={i} style={{fontSize:"0.72rem",color:"#334155",display:"flex",alignItems:"center",gap:"5px",marginBottom:"5px"}}>
                  <Lock size={10} style={{color:"#334155",flexShrink:0}}/>{f}
                </div>
              ))}
              <div style={{marginTop:"8px",fontSize:"0.72rem",color:"#ffd700",fontWeight:700}}>
                🔒 Upgrade to unlock Elite Insights →
              </div>
            </div>
          </div>
        </div>
        <div style={{height:"40px"}}/>
      </main>

      <style>{`
        @keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes xpFloat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-70px);opacity:0}}
        @keyframes flamePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
        @keyframes fightBar{0%{width:0}100%{width:100%}}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
        button:hover{opacity:0.9}
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string,React.CSSProperties> = {
  root:{display:"flex",minHeight:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",position:"relative",overflow:"hidden",background:"#020818"},
  bg:{position:"fixed",inset:0,background:"linear-gradient(135deg,#020818 0%,#040d1e 50%,#02091a 100%)",zIndex:0},
  grid:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)",backgroundSize:"40px 40px",zIndex:0},
  scanline:{position:"fixed",inset:0,backgroundImage:"linear-gradient(transparent 50%,rgba(0,0,0,0.03) 50%)",backgroundSize:"100% 4px",zIndex:0,pointerEvents:"none",opacity:0.4},
  glow1:{position:"fixed",top:"-15%",left:"-5%",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},
  glow2:{position:"fixed",bottom:"-20%",right:"10%",width:"450px",height:"450px",borderRadius:"50%",background:"radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},
  glow3:{position:"fixed",top:"40%",right:"-10%",width:"350px",height:"350px",borderRadius:"50%",background:"radial-gradient(circle,rgba(239,68,68,0.05) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},
  xpPop:{position:"fixed",bottom:"80px",fontSize:"0.82rem",fontWeight:800,color:"#ffd700",zIndex:150,animation:"xpFloat 2.2s ease-out forwards",pointerEvents:"none",background:"rgba(6,15,34,0.9)",padding:"4px 10px",borderRadius:"16px",border:"1px solid rgba(255,215,0,0.3)",backdropFilter:"blur(8px)"},

  // Modals
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"},
  profileModal:{position:"relative",background:"rgba(6,15,34,0.99)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:"20px",padding:"24px",width:"min(700px,95vw)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.8)"},
  modalX:{position:"absolute",top:"14px",right:"14px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"#64748b",cursor:"pointer",padding:"5px",display:"flex"},
  profileHero:{display:"flex",alignItems:"center",gap:"16px",padding:"16px",borderRadius:"14px",marginBottom:"16px",border:"1px solid rgba(255,255,255,0.05)"},
  profileAvatar:{width:"64px",height:"64px",borderRadius:"50%",background:"rgba(99,102,241,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",fontWeight:700,color:"white",flexShrink:0},
  profileInfo:{flex:1},
  profileName:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.4rem",fontWeight:700,color:"white",marginBottom:"4px"},
  profileTitle:{fontSize:"0.72rem",fontWeight:700,padding:"2px 8px",borderRadius:"6px",background:"rgba(255,255,255,0.05)"},
  leagueBadge:{fontSize:"0.65rem",fontWeight:700,padding:"2px 8px",borderRadius:"6px",border:"1px solid"},
  statusChip:{fontSize:"0.65rem",fontWeight:700,padding:"2px 8px",borderRadius:"6px"},
  profileRankBig:{fontFamily:"'Rajdhani',sans-serif",fontSize:"2.4rem",fontWeight:800,color:"rgba(99,102,241,0.4)"},
  profileStats:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"14px"},
  profileStat:{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"3px",padding:"10px 8px",background:"rgba(255,255,255,0.02)",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.06)"},
  rankHistoryWrap:{marginBottom:"14px"},
  sectionLabel:{fontSize:"0.72rem",fontWeight:700,color:"#475569",letterSpacing:"0.05em",marginBottom:"10px"},
  rankHistoryChart:{display:"flex",alignItems:"flex-end",gap:"6px",height:"70px"},
  rankBar:{display:"flex",flexDirection:"column" as const,alignItems:"center",flex:1},
  rankBarFill:{width:"100%",borderRadius:"3px 3px 0 0",minHeight:"4px",transition:"height 0.4s ease"},
  badgesWrap:{marginBottom:"12px"},
  badge:{fontSize:"0.68rem",padding:"3px 9px",borderRadius:"8px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",color:"#818cf8"},
  rewardsWrap:{marginBottom:"12px"},
  rewardChip:{fontSize:"0.68rem",padding:"3px 9px",borderRadius:"8px",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",color:"#ffd700"},
  lockedSection:{display:"flex",alignItems:"center",gap:"6px",padding:"10px 12px",background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"10px",marginBottom:"14px"},
  challengeModalBtn:{flex:1,padding:"10px",background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"10px",color:"#ef4444",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  compareBtn:{flex:1,padding:"10px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:"10px",color:"#818cf8",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  projectsBtn:{flex:1,padding:"10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"10px",color:"#64748b",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"},

  // Challenge modal
  challengeModal:{background:"rgba(6,15,34,0.99)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"20px",padding:"28px",width:"min(440px,90vw)",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"12px",boxShadow:"0 0 60px rgba(239,68,68,0.15)"},
  fightTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.3rem",fontWeight:800,color:"white",textAlign:"center" as const,letterSpacing:"0.05em"},
  fightRow:{display:"flex",alignItems:"center",gap:"20px",width:"100%",justifyContent:"center"},
  fighter:{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"6px"},
  fighterAv:{width:"52px",height:"52px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem",fontWeight:700,color:"white"},
  vsText:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.6rem",fontWeight:800,color:"#ef4444"},
  fightBar:{width:"100%",height:"6px",background:"rgba(255,255,255,0.06)",borderRadius:"3px",overflow:"hidden"},
  fightBarFill:{height:"100%",background:"linear-gradient(90deg,#6366f1,#ef4444)",borderRadius:"3px",animation:"fightBar 3s linear"},
  challengeAgainBtn:{padding:"10px 20px",background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"10px",color:"#ef4444",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},

  // Sidebar
  sidebar:{position:"fixed",left:0,top:0,bottom:0,width:"220px",background:"rgba(6,15,34,0.97)",backdropFilter:"blur(20px)",borderRight:"1px solid rgba(255,255,255,0.05)",display:"flex",flexDirection:"column",zIndex:10,padding:"0 0 20px"},
  sidebarLogo:{display:"flex",alignItems:"center",gap:"10px",padding:"22px 20px 18px"},
  sidebarLogoText:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.2rem",fontWeight:700,color:"white",letterSpacing:"0.05em"},
  nav:{flex:1,display:"flex",flexDirection:"column",gap:"2px",padding:"8px 12px",overflowY:"auto"},
  navItem:{position:"relative",display:"flex",alignItems:"center",gap:"10px",padding:"9px 12px",borderRadius:"10px",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",transition:"all .2s",textAlign:"left",width:"100%"},
  navItemActive:{background:"rgba(99,102,241,0.12)",color:"white"},
  navActiveDot:{position:"absolute",right:"10px",width:"6px",height:"6px",borderRadius:"50%",background:"#6366f1"},
  sidebarFooter:{display:"flex",alignItems:"center",gap:"10px",padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.05)"},
  sidebarUser:{flex:1,display:"flex",alignItems:"center",gap:"8px"},
  avatarSmall:{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#3b82f6)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",fontWeight:700},
  logoutBtn:{background:"none",border:"none",cursor:"pointer",color:"#475569",padding:"4px",display:"flex"},

  // Main
  main:{marginLeft:"220px",flex:1,padding:"0 24px 0",position:"relative",zIndex:1,maxWidth:"calc(100vw - 220px)",overflowX:"hidden"},
  topbar:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 0 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",marginBottom:"16px"},
  backBtn:{display:"flex",alignItems:"center",gap:"5px",padding:"7px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",color:"#64748b",fontSize:"0.8rem",cursor:"pointer",fontFamily:"inherit"},
  arenaTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.5rem",fontWeight:700,color:"white",letterSpacing:"0.02em"},
  onlinePill:{display:"flex",alignItems:"center",gap:"5px",padding:"4px 12px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"20px",fontSize:"0.72rem",color:"#22c55e",fontWeight:600},
  onlineDot:{width:"7px",height:"7px",borderRadius:"50%",background:"#22c55e",animation:"livePulse 1.5s ease-in-out infinite"},
  iconBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"7px",color:"#64748b",cursor:"pointer",display:"flex"},
  avatarMed:{width:"34px",height:"34px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#3b82f6)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"},

  // My stats banner
  myStatsBanner:{display:"flex",alignItems:"center",gap:"16px",padding:"16px 20px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"16px",marginBottom:"16px",flexWrap:"wrap" as const},
  myStatsLeft:{display:"flex",alignItems:"center",gap:"12px"},
  myAvatarWrap:{position:"relative"},
  myAvatar:{width:"44px",height:"44px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:700,color:"white",border:"2px solid rgba(99,102,241,0.5)"},
  myStatusDot:{position:"absolute",bottom:"-1px",right:"-1px",width:"10px",height:"10px",borderRadius:"50%",background:"#22c55e",border:"2px solid rgba(6,15,34,1)"},
  myTitle:{fontSize:"0.65rem",fontWeight:700,padding:"1px 6px",borderRadius:"6px",background:"rgba(255,255,255,0.05)"},
  myLeague:{fontSize:"0.65rem",fontWeight:700},
  myStatsCells:{display:"flex",gap:"14px",flexWrap:"wrap" as const},
  myStatsCell:{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"1px"},
  myInsight:{flex:1,padding:"10px 14px",background:"rgba(0,0,0,0.2)",borderRadius:"10px",border:"1px solid rgba(99,102,241,0.1)",minWidth:"180px"},

  // Top performers
  topPerformersWrap:{marginBottom:"16px"},
  sectionHeader:{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"},
  sectionTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1rem",fontWeight:700,color:"white"},
  sectionSub:{fontSize:"0.72rem",color:"#334155"},
  topPerformersRow:{display:"flex",gap:"10px",overflowX:"auto"},
  topPCard:{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"5px",padding:"14px 10px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px",minWidth:"130px",flexShrink:0,transition:"all .2s"},
  topPRank:{fontSize:"0.8rem",fontWeight:800},
  topPAvatar:{width:"44px",height:"44px",borderRadius:"50%",background:"rgba(99,102,241,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.82rem",fontWeight:700,color:"white"},
  topPScore:{fontSize:"0.78rem",fontWeight:700,textAlign:"center" as const},
  topPStatus:{fontSize:"0.62rem",fontWeight:700,padding:"2px 8px",borderRadius:"8px"},

  // Arena layout
  arenaLayout:{display:"flex",gap:"16px",alignItems:"flex-start"},
  cardsCol:{flex:1,minWidth:0},
  rightPanel:{width:"272px",flexShrink:0,display:"flex",flexDirection:"column",gap:"12px"},

  // Domain filter
  domainFilter:{display:"flex",gap:"5px",flexWrap:"wrap" as const,marginBottom:"10px"},
  domainBtn:{padding:"5px 12px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)",color:"#475569",fontSize:"0.72rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"},
  domainBtnActive:{background:"rgba(99,102,241,0.15)",borderColor:"rgba(99,102,241,0.35)",color:"#a5b4fc"},

  // Position band
  positionBand:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",background:"rgba(99,102,241,0.04)",border:"1px solid rgba(99,102,241,0.12)",borderRadius:"10px",marginBottom:"10px",flexWrap:"wrap" as const,gap:"8px"},

  // Cards grid
  cardsGrid:{display:"flex",flexDirection:"column" as const,gap:"6px"},
  playerCard:{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"12px",overflow:"hidden",cursor:"default"},
  playerCardMe:{background:"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.2)"},
  cardGlowBar:{height:"2px",width:"100%"},
  cardHeader:{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px 6px"},
  cardRank:{fontSize:"0.78rem",fontWeight:800,minWidth:"30px"},
  cardAvatar:{width:"34px",height:"34px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem",fontWeight:700,color:"white",flexShrink:0},
  playerNameBtn:{background:"none",border:"none",cursor:"pointer",color:"white",fontSize:"0.82rem",fontWeight:600,fontFamily:"inherit",padding:0,textAlign:"left" as const,textDecoration:"none"},
  youTag:{fontSize:"0.52rem",padding:"1px 4px",borderRadius:"4px",background:"rgba(99,102,241,0.2)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.3)",fontWeight:700,flexShrink:0},
  cardMeta:{display:"flex",alignItems:"center",gap:"8px",padding:"0 14px 6px"},
  streakWrap:{display:"flex",alignItems:"center",gap:"3px"},
  statusBadge:{fontSize:"0.62rem",fontWeight:700,padding:"2px 7px",borderRadius:"7px"},
  missionWrap:{padding:"4px 14px 6px"},
  progressWrap:{padding:"4px 14px 8px"},
  progressBar:{height:"3px",background:"rgba(255,255,255,0.05)",borderRadius:"2px",overflow:"hidden"},
  progressFill:{height:"100%",borderRadius:"2px",transition:"width 0.6s ease"},
  cardFooter:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 14px 10px"},
  viewBtn:{padding:"3px 10px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"6px",color:"#818cf8",fontSize:"0.65rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  challengeBtn:{padding:"3px 8px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"6px",color:"#ef4444",fontSize:"0.7rem",cursor:"pointer",fontFamily:"inherit"},

  // Right panel
  feedCard:{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px"},
  feedHeader:{display:"flex",alignItems:"center",gap:"6px",marginBottom:"12px"},
  feedTitle:{fontSize:"0.82rem",fontWeight:700,color:"white",flex:1},
  livePill:{display:"flex",alignItems:"center",gap:"4px",padding:"2px 8px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"10px",fontSize:"0.6rem",color:"#22c55e",fontWeight:700},
  liveDot:{width:"5px",height:"5px",borderRadius:"50%",background:"#22c55e",animation:"livePulse 1.5s ease-in-out infinite"},
  feedList:{display:"flex",flexDirection:"column" as const,gap:"5px"},
  feedItem:{fontSize:"0.74rem",color:"#64748b",padding:"5px 8px",background:"rgba(255,255,255,0.01)",borderRadius:"6px",borderLeft:"2px solid rgba(99,102,241,0.3)",lineHeight:1.4,animation:"fadeSlideIn 0.4s ease"},
  arenaStatsCard:{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px"},
  arenaStat:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  positionCard:{padding:"14px",background:"rgba(99,102,241,0.04)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:"14px"},
  posRow:{display:"flex",alignItems:"center",gap:"8px",padding:"6px 8px",borderRadius:"8px"},
  posRowMe:{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)"},
  posAv:{width:"26px",height:"26px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",fontWeight:700,color:"white",flexShrink:0},
  posInsight:{fontSize:"0.72rem",color:"#64748b",marginTop:"8px",paddingTop:"8px",borderTop:"1px solid rgba(255,255,255,0.05)"},
  motivCard:{padding:"14px",background:"rgba(249,115,22,0.05)",border:"1px solid rgba(249,115,22,0.15)",borderRadius:"14px"},
  lockedCard:{padding:"14px",background:"rgba(255,215,0,0.03)",border:"1px solid rgba(255,215,0,0.12)",borderRadius:"14px",cursor:"pointer"},
};