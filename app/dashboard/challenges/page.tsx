"use client";
// app/dashboard/challenges/page.tsx
// GrowthOS — Daily Mission Control · Challenge Engine

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Target, Play, BarChart2, Trophy,
  BookOpen, Users, Settings, LogOut, Bell, ChevronLeft,
  Flame, Zap, Clock, X, ChevronRight, Lock, Star,
  Swords, Shield, CheckCircle2, AlertTriangle,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  { icon:<LayoutDashboard size={18}/>, label:"Dashboard",    href:"/dashboard" },
  { icon:<Play size={18}/>,            label:"Practice Arena",href:"/dashboard/practice" },
  { icon:<BarChart2 size={18}/>,       label:"Leaderboard",  href:"/dashboard/leaderboard" },
  { icon:<Trophy size={18}/>,          label:"Challenges",   href:"/dashboard/challenges", active:true },
  { icon:<Users size={18}/>,           label:"Community",    href:"/dashboard/community" },
  { icon:<Settings size={18}/>,        label:"Settings",     href:"/dashboard/settings" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Diff     = "Easy"|"Medium"|"Hard"|"Expert";
type CatType  = "daily"|"weekly"|"monthly"|"special";
type Domain   = "Developer"|"JEE"|"NEET"|"UPSC"|"Creator"|"Business"|"All";

interface Challenge {
  id: number; title: string; description: string;
  type: CatType; domain: Domain; difficulty: Diff;
  xp: number; bonusXp: number; timeMinutes: number;
  participants: number; completed: boolean;
  endsIn: string; streakImpact: boolean;
  topSolvers: { name:string; avatar:string; time:string; xp:number }[];
  hints: string[]; tags: string[];
  weekendBonus?: boolean; battleMode?: boolean; communityMode?: boolean;
}

// ── Mock Challenge Data ────────────────────────────────────────────────────────
const ALL_CHALLENGES: Challenge[] = [
  // ── DAILY ──────────────────────────────────────────────────────────────────
  {
    id:1, title:"Two Sum — LeetCode Style",
    description:"Given an array of integers and a target, return indices of two numbers that add up to target. O(n) solution required.",
    type:"daily", domain:"Developer", difficulty:"Medium", xp:80, bonusXp:20,
    timeMinutes:25, participants:847, completed:false, endsIn:"11h 42m",
    streakImpact:true,
    topSolvers:[
      {name:"Arjun",avatar:"AS",time:"4m 12s",xp:100},
      {name:"Priya",avatar:"PN",time:"5m 38s",xp:95},
      {name:"Rahul",avatar:"RV",time:"6m 20s",xp:90},
    ],
    hints:["Think about using a hash map","What complement do you need?","Store visited numbers as keys"],
    tags:["Arrays","Hash Map","Two Pointers"],
  },
  {
    id:2, title:"JEE Physics — Kinematics Sprint",
    description:"20 MCQs on kinematics with projectile motion, relative velocity, and circular motion. 15 minutes. JEE Advanced level.",
    type:"daily", domain:"JEE", difficulty:"Hard", xp:100, bonusXp:25,
    timeMinutes:15, participants:612, completed:false, endsIn:"11h 42m",
    streakImpact:true,
    topSolvers:[
      {name:"Rohan",avatar:"RA",time:"11m 05s",xp:125},
      {name:"Tanvi",avatar:"TS",time:"12m 18s",xp:118},
      {name:"Aryan",avatar:"AK",time:"13m 40s",xp:110},
    ],
    hints:["Use v²=u²+2as for constant acceleration","Break vectors into components","For relative motion: subtract velocities"],
    tags:["Physics","Kinematics","MCQ"],
  },
  {
    id:3, title:"NEET Biology — Cell Division",
    description:"30 NCERT-level MCQs on mitosis and meiosis. Focus on phases, spindle formation, and genetic outcomes.",
    type:"daily", domain:"NEET", difficulty:"Medium", xp:90, bonusXp:20,
    timeMinutes:20, participants:534, completed:false, endsIn:"11h 42m",
    streakImpact:true,
    topSolvers:[
      {name:"Kavitha",avatar:"KR",time:"14m 22s",xp:110},
      {name:"Rahul N",avatar:"RN",time:"15m 45s",xp:105},
      {name:"Sana",avatar:"SK",time:"16m 10s",xp:100},
    ],
    hints:["Meiosis I separates homologous chromosomes","G2 phase precedes mitosis","Crossing over happens in prophase I"],
    tags:["Biology","Cell Division","NCERT"],
  },
  {
    id:4, title:"UPSC Polity — Fundamental Rights",
    description:"25 statement-based MCQs on Articles 12-35. UPSC Prelims pattern. Focus on exceptions and Supreme Court interpretations.",
    type:"daily", domain:"UPSC", difficulty:"Hard", xp:95, bonusXp:25,
    timeMinutes:20, participants:421, completed:false, endsIn:"11h 42m",
    streakImpact:true,
    topSolvers:[
      {name:"Vikram",avatar:"VC",time:"15m 30s",xp:120},
      {name:"Ananya",avatar:"AK",time:"16m 15s",xp:115},
      {name:"Suresh",avatar:"SB",time:"17m 50s",xp:108},
    ],
    hints:["Article 19 has 6 freedoms not 7","Article 20 protects against self-incrimination","Right to equality includes Art 14-18"],
    tags:["Polity","Fundamental Rights","Prelims"],
  },

  // ── WEEKLY ─────────────────────────────────────────────────────────────────
  {
    id:5, title:"Build a REST API in 90 Minutes",
    description:"Create a fully functional CRUD REST API with authentication, rate limiting, and proper error handling. Deploy or submit GitHub link.",
    type:"weekly", domain:"Developer", difficulty:"Hard", xp:200, bonusXp:50,
    timeMinutes:90, participants:312, completed:false, endsIn:"3d 14h",
    streakImpact:true,
    topSolvers:[
      {name:"Arjun",avatar:"AS",time:"72m",xp:250},
      {name:"Aman",avatar:"AG",time:"78m",xp:238},
      {name:"Sneha",avatar:"SI",time:"85m",xp:220},
    ],
    hints:["Use Express.js or FastAPI","JWT for auth","Rate limit with express-rate-limit"],
    tags:["Backend","API","Node.js","FastAPI"],
  },
  {
    id:6, title:"JEE Full Syllabus Mock — 3 Hours",
    description:"60 questions across Physics, Chemistry, Mathematics. Fully timed. JEE Advanced pattern with marking scheme +4/-1.",
    type:"weekly", domain:"JEE", difficulty:"Expert", xp:250, bonusXp:75,
    timeMinutes:180, participants:289, completed:false, endsIn:"3d 14h",
    streakImpact:true,
    topSolvers:[
      {name:"Rohan",avatar:"RA",time:"168m",xp:310},
      {name:"Tanvi",avatar:"TS",time:"172m",xp:295},
      {name:"Pooja",avatar:"PM",time:"175m",xp:280},
    ],
    hints:["Attempt strong subjects first","Don't guess if you're unsure (negative marking)","Review formulas before starting"],
    tags:["JEE Advanced","Full Mock","3 Hours"],
  },
  {
    id:7, title:"Content Strategy — 7-Day Plan",
    description:"Build a complete 7-day content calendar for Instagram or YouTube. Include hooks, CTAs, posting time optimization and growth targets.",
    type:"weekly", domain:"Creator", difficulty:"Medium", xp:180, bonusXp:40,
    timeMinutes:60, participants:198, completed:false, endsIn:"3d 14h",
    streakImpact:true,
    topSolvers:[
      {name:"Simran",avatar:"SK",time:"45m",xp:220},
      {name:"Aman D",avatar:"AD",time:"52m",xp:208},
      {name:"Priya K",avatar:"PK",time:"58m",xp:195},
    ],
    hints:["Research competitor content first","Mix educational and entertainment","Schedule morning posts for peak reach"],
    tags:["Content","Strategy","Creator","Instagram"],
  },

  // ── MONTHLY ────────────────────────────────────────────────────────────────
  {
    id:8, title:"30-Day Coding Streak Challenge",
    description:"Complete at least 1 coding problem every day for 30 days. Track your progress. Bonus XP for maintaining perfect streak.",
    type:"monthly", domain:"Developer", difficulty:"Expert", xp:500, bonusXp:200,
    timeMinutes:30, participants:1240, completed:false, endsIn:"18d 6h",
    streakImpact:true,
    topSolvers:[
      {name:"Arjun",avatar:"AS",time:"28d done",xp:640},
      {name:"Priya",avatar:"PN",time:"27d done",xp:610},
      {name:"Vikram",avatar:"VS",time:"26d done",xp:580},
    ],
    hints:["Start with Easy problems to build habit","Review old problems on day 7, 14, 21","Use Pomodoro technique"],
    tags:["Streak","DSA","30 Days","Habit"],
  },
  {
    id:9, title:"UPSC Monthly Current Affairs Mastery",
    description:"Cover all major events of the month — Economy, Polity, Environment, S&T, International Relations. Weekly mini-tests included.",
    type:"monthly", domain:"UPSC", difficulty:"Expert", xp:450, bonusXp:150,
    timeMinutes:30, participants:876, completed:false, endsIn:"18d 6h",
    streakImpact:true,
    topSolvers:[
      {name:"Vikram",avatar:"VC",time:"Week 3",xp:550},
      {name:"Ananya",avatar:"AK",time:"Week 3",xp:530},
      {name:"Meena",avatar:"MI",time:"Week 2",xp:490},
    ],
    hints:["Use The Hindu + PIB daily","Make short notes per topic","Revise on weekends"],
    tags:["Current Affairs","UPSC","Monthly","Notes"],
  },

  // ── SPECIAL ────────────────────────────────────────────────────────────────
  {
    id:10, title:"⚔️ Weekend Battle: DSA vs DSA",
    description:"1v1 live coding battle. Same problem, same time. Judged on correctness + speed + code quality. Winner gets 2x XP.",
    type:"special", domain:"Developer", difficulty:"Hard", xp:150, bonusXp:150,
    timeMinutes:45, participants:420, completed:false, endsIn:"2d 8h",
    streakImpact:false, weekendBonus:true, battleMode:true,
    topSolvers:[
      {name:"Arjun",avatar:"AS",time:"18m",xp:300},
      {name:"Priya",avatar:"PN",time:"21m",xp:275},
    ],
    hints:["Practice edge cases","Optimise after first solution works","Comment your logic"],
    tags:["Battle","1v1","Weekend","DSA"],
  },
  {
    id:11, title:"🌍 Community: 1000 NEET MCQs Together",
    description:"The entire NEET community solves 1000 MCQs together today. Every submission counts. Live progress bar. Hit the target = bonus XP for all.",
    type:"special", domain:"NEET", difficulty:"Medium", xp:120, bonusXp:80,
    timeMinutes:60, participants:2840, completed:false, endsIn:"23h 15m",
    streakImpact:true, communityMode:true,
    topSolvers:[
      {name:"Kavitha",avatar:"KR",time:"Top",xp:200},
      {name:"Rahul N",avatar:"RN",time:"2nd",xp:185},
    ],
    hints:["Focus on your weak chapter first","Every attempt counts to community goal"],
    tags:["Community","NEET","Collective","MCQ"],
  },
  {
    id:12, title:"🚀 Hackathon Sprint: Build in 4 Hours",
    description:"Build a working mini-product in 4 hours. Submit GitHub link. Top 3 products get featured on GrowthOS and win AI subscriptions.",
    type:"special", domain:"Developer", difficulty:"Expert", xp:300, bonusXp:300,
    timeMinutes:240, participants:384, completed:false, endsIn:"1d 18h",
    streakImpact:false, weekendBonus:true,
    topSolvers:[
      {name:"Arjun",avatar:"AS",time:"3h 45m",xp:600},
      {name:"Aman",avatar:"AG",time:"3h 58m",xp:570},
    ],
    hints:["Plan for 30 min before coding","Use a starter template","Deploy early, polish later"],
    tags:["Hackathon","Build","4 Hours","Ship"],
  },
];

// ── Mini leaderboard data ─────────────────────────────────────────────────────
const ARENA_SOLVERS = [
  {name:"Arjun Sharma",  avatar:"AS", rank:1, solved:12, accuracy:94, xp:1240},
  {name:"Priya Nair",    avatar:"PN", rank:2, solved:11, accuracy:91, xp:1150},
  {name:"Rahul Verma",   avatar:"RV", rank:3, solved:10, accuracy:88, xp:1080},
  {name:"Sneha Iyer",    avatar:"SI", rank:4, solved:9,  accuracy:86, xp:980},
  {name:"You",           avatar:"YO", rank:5, solved:7,  accuracy:73, xp:820, isMe:true},
];

const HISTORY = [
  {title:"Array Rotation",    domain:"Dev",  date:"Yesterday", xp:80,  accuracy:90, time:"18m", result:"passed"},
  {title:"JEE Chemistry Mock",domain:"JEE",  date:"2d ago",    xp:100, accuracy:84, time:"24m", result:"passed"},
  {title:"Binary Search",     domain:"Dev",  date:"3d ago",    xp:60,  accuracy:100,time:"9m",  result:"passed"},
  {title:"UPSC Economy MCQs", domain:"UPSC", date:"4d ago",    xp:95,  accuracy:76, time:"22m", result:"passed"},
  {title:"String Reversal",   domain:"Dev",  date:"5d ago",    xp:50,  accuracy:100,time:"5m",  result:"passed"},
  {title:"NEET Physiology",   domain:"NEET", date:"6d ago",    xp:90,  accuracy:82, time:"19m", result:"passed"},
];

const LIVE_EVENTS = [
  "⚡ Arjun just solved Two Sum in 4m 12s!",
  "🔥 847 users are solving today's challenge",
  "🏆 Priya extended her streak to 98 days!",
  "🚀 Rohan scored 18/20 in JEE Physics sprint",
  "⚔️ New 1v1 battle started between Aman & Vikram",
  "🎯 Community challenge is 68% complete — keep going!",
  "💥 Kavitha solved NEET Biology in 14 minutes!",
  "🌟 You're in the top 20% of challenge solvers today",
];

const DIFF_CONFIG: Record<Diff,{color:string;bg:string;border:string}> = {
  Easy:   {color:"#22c55e",bg:"rgba(34,197,94,0.1)",  border:"rgba(34,197,94,0.3)"},
  Medium: {color:"#f59e0b",bg:"rgba(245,158,11,0.1)", border:"rgba(245,158,11,0.3)"},
  Hard:   {color:"#ef4444",bg:"rgba(239,68,68,0.1)",  border:"rgba(239,68,68,0.3)"},
  Expert: {color:"#8b5cf6",bg:"rgba(139,92,246,0.1)", border:"rgba(139,92,246,0.3)"},
};

const DOMAIN_COLORS: Record<string,string> = {
  Developer:"#6366f1", JEE:"#f59e0b", NEET:"#22c55e",
  UPSC:"#3b82f6", Creator:"#ec4899", Business:"#f97316", All:"#64748b",
};

const CAT_TABS: {id:CatType;icon:string;label:string}[] = [
  {id:"daily",   icon:"🔥", label:"Daily"},
  {id:"weekly",  icon:"⚡", label:"Weekly"},
  {id:"monthly", icon:"🏆", label:"Monthly"},
  {id:"special", icon:"🎯", label:"Special"},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function useCountdown(initial:string){
  const [val,setVal] = useState(initial);
  useEffect(()=>{
    const t=setInterval(()=>setVal(v=>{
      const parts=v.split(/[hm\s]+/).filter(Boolean);
      if(parts.length<2)return v;
      let h=parseInt(parts[0])||0, m=parseInt(parts[1])||0;
      if(m>0)m--;else if(h>0){h--;m=59;}
      return `${h}h ${String(m).padStart(2,"0")}m`;
    }),60000);
    return()=>clearInterval(t);
  },[]);
  return val;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ChallengesPage() {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [mounted, setMounted] = useState(false);

  const rawName = (user as any)?.full_name || (user as any)?.name || (typeof window !== "undefined" ? localStorage.getItem("user_name") : "") || "User";
  const currentUser = mounted ? (rawName.includes("@") ? rawName.split("@")[0] : rawName) : "User";
  const avatarInitials = mounted && currentUser && currentUser !== "User" ? currentUser.slice(0, 2).toUpperCase() : "US";
  const userAvatarUrl = (user as any)?.avatar_url || (user as any)?.image || null;

  const [loaded, setLoaded]           = useState(false);
  const [activeTab, setActiveTab]     = useState<CatType>("daily");
  const [activeDomain, setActiveDomain] = useState<Domain>("All");
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge|null>(null);
  const [solving, setSolving]         = useState(false);
  const [hintsUsed, setHintsUsed]     = useState<Set<number>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [showCompletion, setShowCompletion] = useState<{xp:number;bonus:number}|null>(null);
  const [battleTarget, setBattleTarget] = useState<string|null>(null);
  const [battleState, setBattleState] = useState<"idle"|"fighting"|"won"|"lost">("idle");
  const [liveEvents, setLiveEvents]   = useState<{id:number;msg:string}[]>([]);
  const [participants, setParticipants] = useState<Record<number,number>>({});
  const [communityProgress, setCommunityProgress] = useState(68);
  const [xpTotal, setXpTotal]         = useState(820);
  const [streak, setStreak]           = useState(0);
  const [hintsLeft, setHintsLeft]     = useState(3);
  const evId = useRef(0);
  const dailyCountdown = useCountdown("11h 42m");

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setLoaded(true), 100);

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
    if (token) {
      fetch(`${API}/practice/streak`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d?.current_streak !== undefined) setStreak(d.current_streak); })
        .catch(() => {});
    }
  }, []);

  // Live events
  useEffect(()=>{
    const t=setInterval(()=>{
      const msg=LIVE_EVENTS[Math.floor(Math.random()*LIVE_EVENTS.length)];
      const id=evId.current++;
      setLiveEvents(prev=>[{id,msg},...prev.slice(0,5)]);
    },3000);
    return()=>clearInterval(t);
  },[]);

  // Participant drift
  useEffect(()=>{
    const t=setInterval(()=>{
      setParticipants(prev=>{
        const next={...prev};
        ALL_CHALLENGES.forEach(c=>{ next[c.id]=(next[c.id]||c.participants)+Math.floor(Math.random()*3); });
        return next;
      });
      if(Math.random()>0.5) setCommunityProgress(p=>Math.min(100,p+Math.floor(Math.random()*2)));
    },4500);
    return()=>clearInterval(t);
  },[]);

  const startSolving = useCallback((c:Challenge)=>{
    setSelectedChallenge(c);
    setSolving(true);
    setHintsUsed(new Set());
  },[]);

  const completeChallenge = useCallback(()=>{
    if(!selectedChallenge)return;
    const bonus = Math.random()>0.4 ? selectedChallenge.bonusXp : 0;
    setCompletedIds(prev=>new Set([...prev,selectedChallenge.id]));
    setXpTotal(p=>p+selectedChallenge.xp+bonus);
    setShowCompletion({xp:selectedChallenge.xp,bonus});
    setSolving(false);
  },[selectedChallenge]);

  const startBattle = (name:string)=>{
    setBattleTarget(name);
    setBattleState("fighting");
    setTimeout(()=>{
      setBattleState(Math.random()>0.4?"won":"lost");
    },3000);
  };

  const filteredChallenges = ALL_CHALLENGES.filter(c=>{
    if(c.type!==activeTab) return false;
    if(activeDomain!=="All" && c.domain!==activeDomain) return false;
    return true;
  });

  const mainDaily = ALL_CHALLENGES.find(c=>c.type==="daily"&&c.domain==="Developer") || ALL_CHALLENGES[0];
  const pCount = (id:number)=>participants[id]||ALL_CHALLENGES.find(c=>c.id===id)?.participants||0;

  return (
    <div style={s.root}>
      <div style={s.bg}/><div style={s.grid}/>
      <div style={s.glow1}/><div style={s.glow2}/><div style={s.glow3}/>

      {/* ── Completion popup ── */}
      {showCompletion && (
        <div style={s.completionOverlay}>
          <div style={s.completionCard}>
            <div style={{fontSize:"3rem",textAlign:"center" as const}}>🎉</div>
            <div style={s.completionTitle}>Challenge Completed!</div>
            <div style={s.completionXp}>+{showCompletion.xp} XP Earned</div>
            {showCompletion.bonus>0 && (
              <div style={s.completionBonus}>⚡ Early Bird Bonus: +{showCompletion.bonus} XP</div>
            )}
            <div style={s.completionStreak}>🔥 Streak Maintained — {streak} days</div>
            <div style={{fontSize:"0.78rem",color:"#64748b",textAlign:"center" as const}}>
              You're ahead of 80% of users today 🚀
            </div>
            <button style={s.completionBtn} onClick={()=>{setShowCompletion(null);setSelectedChallenge(null);}}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Battle modal ── */}
      {battleTarget && (
        <div style={s.completionOverlay}>
          <div style={s.battleModal}>
            {battleState==="fighting" ? (
              <>
                <div style={s.battleTitle}>⚔️ BATTLE IN PROGRESS</div>
                <div style={s.battleRow}>
                  <div style={s.battleFighter}>
                    <div style={s.battleAv}>YO</div>
                    <div style={{color:"white",fontWeight:700}}>You</div>
                  </div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.8rem",fontWeight:800,color:"#ef4444"}}>VS</div>
                  <div style={s.battleFighter}>
                    <div style={{...s.battleAv,background:"rgba(245,158,11,0.2)",border:"2px solid #f59e0b"}}>{battleTarget.slice(0,2).toUpperCase()}</div>
                    <div style={{color:"white",fontWeight:700}}>{battleTarget}</div>
                  </div>
                </div>
                <div style={s.battleBarWrap}>
                  <div style={s.battleBar}/>
                </div>
                <div style={{fontSize:"0.78rem",color:"#475569"}}>Solving same problem simultaneously...</div>
              </>
            ) : (
              <>
                <div style={{fontSize:"3rem",textAlign:"center" as const}}>{battleState==="won"?"🏆":"💪"}</div>
                <div style={{...s.battleTitle,color:battleState==="won"?"#22c55e":"#f59e0b"}}>
                  {battleState==="won"?"YOU WIN!":"GOOD FIGHT!"}
                </div>
                <div style={{fontSize:"1.2rem",fontWeight:800,color:"#ffd700",textAlign:"center" as const}}>
                  +{battleState==="won"?150:50} XP
                </div>
                <div style={{fontSize:"0.8rem",color:"#64748b",textAlign:"center" as const}}>
                  {battleState==="won"?"Faster + higher accuracy sealed it.":"Close match — practice more!"}
                </div>
                <div style={{display:"flex",gap:"10px",marginTop:"16px"}}>
                  <button style={s.battleRetryBtn} onClick={()=>startBattle(battleTarget)}>⚔️ Rematch</button>
                  <button style={{...s.battleRetryBtn,background:"rgba(255,255,255,0.04)",borderColor:"rgba(255,255,255,0.1)",color:"#64748b"}}
                    onClick={()=>{setBattleTarget(null);setBattleState("idle");}}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Solve Modal ── */}
      {solving && selectedChallenge && (
        <div style={s.completionOverlay} onClick={()=>setSolving(false)}>
          <div style={s.solveModal} onClick={e=>e.stopPropagation()}>
            <div style={s.solveHeader}>
              <div>
                <div style={s.solveTitle}>{selectedChallenge.title}</div>
                <div style={{display:"flex",gap:"8px",marginTop:"4px",flexWrap:"wrap" as const}}>
                  <span style={{...s.diffBadge,...DIFF_CONFIG[selectedChallenge.difficulty]}}>{selectedChallenge.difficulty}</span>
                  <span style={{...s.domainTag,color:DOMAIN_COLORS[selectedChallenge.domain],borderColor:`${DOMAIN_COLORS[selectedChallenge.domain]}40`}}>{selectedChallenge.domain}</span>
                  <span style={s.xpTag}>⚡ {selectedChallenge.xp} XP</span>
                  <span style={s.timeTag}><Clock size={10}/> {selectedChallenge.timeMinutes}m</span>
                </div>
              </div>
              <button style={s.solveClose} onClick={()=>setSolving(false)}><X size={16}/></button>
            </div>

            <div style={s.solveDesc}>{selectedChallenge.description}</div>

            {/* Tags */}
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap" as const,marginBottom:"14px"}}>
              {selectedChallenge.tags.map((tag,i)=>(
                <span key={i} style={s.tagChip}>{tag}</span>
              ))}
            </div>

            {/* AI Hints */}
            <div style={s.hintsSection}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
                <div style={{fontSize:"0.78rem",fontWeight:700,color:"white"}}>🤖 AI Hints ({hintsLeft} remaining)</div>
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap" as const}}>
                {selectedChallenge.hints.map((hint,i)=>(
                  <div key={i}>
                    {hintsUsed.has(i) ? (
                      <div style={s.hintRevealedCard}>{hint}</div>
                    ) : (
                      <button style={{...s.hintBtn,opacity:hintsLeft===0?0.4:1}}
                        disabled={hintsLeft===0}
                        onClick={()=>{
                          if(hintsLeft>0){
                            setHintsUsed(prev=>new Set([...prev,i]));
                            setHintsLeft(p=>p-1);
                          }
                        }}>
                        {hintsLeft===0?"🔒":"💡"} Hint {i+1}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {hintsLeft===0&&<div style={{fontSize:"0.7rem",color:"#475569",marginTop:"4px"}}>🔒 No more hints — upgrade for unlimited</div>}
            </div>

            {/* Top solvers */}
            <div style={s.solveLeaderboard}>
              <div style={{fontSize:"0.75rem",fontWeight:700,color:"#475569",marginBottom:"8px",letterSpacing:"0.05em"}}>⚡ FASTEST SOLVERS</div>
              {selectedChallenge.topSolvers.map((solver,i)=>(
                <div key={i} style={s.solverRow}>
                  <span style={{fontSize:"0.7rem",fontWeight:800,color:["#ffd700","#c0c0c0","#cd7f32"][i],minWidth:"16px"}}>#{i+1}</span>
                  <div style={s.solverAv}>{solver.avatar}</div>
                  <span style={{flex:1,fontSize:"0.75rem",color:"#94a3b8"}}>{solver.name}</span>
                  <span style={{fontSize:"0.7rem",color:"#475569"}}>{solver.time}</span>
                  <span style={{fontSize:"0.72rem",fontWeight:700,color:"#6366f1"}}>+{solver.xp}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{display:"flex",gap:"10px",marginTop:"16px"}}>
              <button style={s.submitBtn} onClick={completeChallenge}>
                ✅ Submit — Complete Challenge
              </button>
              {selectedChallenge.battleMode && (
                <button style={s.battleStartBtn} onClick={()=>{setSolving(false);startBattle("Arjun Sharma");}}>
                  ⚔️ Battle Mode
                </button>
              )}
            </div>
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
          <div
            style={{ ...s.sidebarUser, cursor: "pointer" }}
            onClick={() => setIsProfileModalOpen(true)}
            title="Open Profile Settings"
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={currentUser} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={s.avatarSmall}>{avatarInitials}</div>
            )}
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:600,color:"#e2e8f0"}}>{currentUser}</div>
              <div style={{fontSize:"0.68rem",color:"#818cf8",fontWeight:600}}>{user?.plan || user?.plan_tier || "MEMBER PLAN"} · 🔥 {streak}d streak</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={() => logout && logout()} title="Log Out"><LogOut size={15}/></button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{...s.main,opacity:loaded?1:0,transform:loaded?"none":"translateY(14px)",transition:"all 0.5s ease"}}>

        {/* Topbar */}
        <div style={s.topbar}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <Link href="/dashboard" style={{textDecoration:"none"}}>
              <button style={s.backBtn}><ChevronLeft size={16}/> Dashboard</button>
            </Link>
            <div>
              <div style={s.pageTitle}>🎯 Challenges</div>
              <div style={{fontSize:"0.68rem",color:"#475569"}}>Daily Mission Control · Execute. Compete. Level Up.</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={s.xpDisplay}>⚡ {xpTotal.toLocaleString()} XP</div>
            <button style={s.iconBtn}><Bell size={18}/></button>
            <div
              style={{ ...s.avatarMed, cursor: "pointer", overflow: "hidden" }}
              onClick={() => setIsProfileModalOpen(true)}
              title="Open Profile Settings"
            >
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={currentUser} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                avatarInitials
              )}
            </div>
          </div>
        </div>

        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />

        {/* ══ HERO DAILY CHALLENGE ══ */}
        <div style={s.heroCard}>
          <div style={s.heroGlow}/>
          <div style={s.heroLeft}>
            <div style={s.heroTag}>
              <Flame size={12} style={{color:"#ef4444"}}/>
              <span>DAILY CHALLENGE · {dailyCountdown} LEFT</span>
            </div>
            <div style={s.heroTitle}>{mainDaily.title}</div>
            <div style={s.heroDesc}>{mainDaily.description}</div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap" as const,marginBottom:"14px"}}>
              <span style={{...s.diffBadge,...DIFF_CONFIG[mainDaily.difficulty]}}>{mainDaily.difficulty}</span>
              <span style={s.xpTag}>⚡ {mainDaily.xp}+{mainDaily.bonusXp} XP</span>
              <span style={s.timeTag}><Clock size={10}/> {mainDaily.timeMinutes}m</span>
              <span style={{...s.domainTag,color:DOMAIN_COLORS[mainDaily.domain],borderColor:`${DOMAIN_COLORS[mainDaily.domain]}40`}}>{mainDaily.domain}</span>
            </div>

            {/* Participants */}
            <div style={s.participantsRow}>
              <div style={s.miniAvatars}>
                {["AS","PN","RV","SI","AG"].map((av,i)=>(
                  <div key={i} style={{...s.miniAv,marginLeft:i>0?"-6px":"0",zIndex:5-i}}>{av}</div>
                ))}
              </div>
              <span style={{fontSize:"0.78rem",color:"#94a3b8"}}>
                <strong style={{color:"#22c55e"}}>{pCount(mainDaily.id).toLocaleString()}</strong> solving right now
              </span>
            </div>
            <div style={{display:"flex",gap:"10px",marginTop:"14px"}}>
              <button style={{...s.startBtn,...(completedIds.has(mainDaily.id)?s.completedBtn:{})}}
                onClick={()=>!completedIds.has(mainDaily.id)&&startSolving(mainDaily)}>
                {completedIds.has(mainDaily.id)?"✅ Completed":"▶ Start Challenge"}
              </button>
              <button style={s.battleBtn} onClick={()=>startBattle("Arjun Sharma")}>
                ⚔️ Battle Mode
              </button>
            </div>
          </div>

          <div style={s.heroRight}>
            {/* Streak warning */}
            <div style={{...s.streakCard,...(streak<7?s.streakAtRisk:{})}}>
              {streak<7 ? (
                <><AlertTriangle size={16} style={{color:"#f59e0b"}}/><div><div style={{fontSize:"0.75rem",fontWeight:700,color:"#f59e0b"}}>⚠️ Streak at risk!</div><div style={{fontSize:"0.68rem",color:"#64748b"}}>Complete today to save your streak</div></div></>
              ) : (
                <><Flame size={16} style={{color:"#f97316"}}/><div><div style={{fontSize:"0.75rem",fontWeight:700,color:"#f97316"}}>{streak}-Day Streak 🔥</div><div style={{fontSize:"0.68rem",color:"#64748b"}}>Complete today's challenge to maintain it</div></div></>
              )}
            </div>

            {/* Motivation */}
            <div style={s.motivBox}>
              <div style={{fontSize:"0.72rem",fontWeight:700,color:"#6366f1",marginBottom:"3px"}}>⚡ Mission Status</div>
              <div style={{fontSize:"0.75rem",color:"#94a3b8",lineHeight:1.6}}>
                🔥 5-day streak — don't break it<br/>
                You're ahead of <strong style={{color:"#22c55e"}}>80% of users</strong> today<br/>
                Complete 1 more to level up 🚀
              </div>
            </div>

            {/* Community challenge progress */}
            <div style={s.communityProgress}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"0.72rem",fontWeight:700,color:"#ec4899"}}>🌍 Community Goal</span>
                <span style={{fontSize:"0.72rem",color:"#475569"}}>{communityProgress}%</span>
              </div>
              <div style={s.communityBar}>
                <div style={{...s.communityFill,width:`${communityProgress}%`}}/>
              </div>
              <div style={{fontSize:"0.68rem",color:"#475569",marginTop:"4px"}}>
                {Math.floor(communityProgress*10)} / 1000 NEET MCQs solved today
              </div>
            </div>

            {/* Live events mini */}
            <div style={s.herFeedCard}>
              <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"8px"}}>
                <div style={s.liveDot}/>
                <span style={{fontSize:"0.7rem",fontWeight:700,color:"#22c55e"}}>LIVE</span>
              </div>
              {liveEvents.slice(0,3).map((ev,i)=>(
                <div key={ev.id} style={{fontSize:"0.7rem",color:i===0?"#94a3b8":"#475569",marginBottom:"4px",lineHeight:1.4}}>{ev.msg}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ MAIN CONTENT ══ */}
        <div style={s.contentLayout}>

          {/* Left: Challenge grid */}
          <div style={s.challengesCol}>

            {/* Tab + domain filter */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap" as const,gap:"10px",marginBottom:"14px"}}>
              <div style={s.catTabs}>
                {CAT_TABS.map(tab=>(
                  <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                    style={{...s.catTab,...(activeTab===tab.id?s.catTabActive:{})}}>
                    <span>{tab.icon}</span><span>{tab.label}</span>
                    {tab.id==="daily"&&<span style={s.mainBadge}>MAIN</span>}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:"5px",flexWrap:"wrap" as const}}>
                {(["All","Developer","JEE","NEET","UPSC","Creator"] as Domain[]).map(d=>(
                  <button key={d} onClick={()=>setActiveDomain(d)}
                    style={{...s.domainFilterBtn,...(activeDomain===d?{background:`${DOMAIN_COLORS[d]}15`,borderColor:`${DOMAIN_COLORS[d]}50`,color:DOMAIN_COLORS[d]}:{})}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Challenge cards */}
            {filteredChallenges.length===0 ? (
              <div style={s.emptyState}>No challenges in this category for your domain. Try "All" or switch domain.</div>
            ) : (
              <div style={s.challengeGrid}>
                {filteredChallenges.map(challenge=>{
                  const done = completedIds.has(challenge.id);
                  const dc = DIFF_CONFIG[challenge.difficulty];
                  const domCol = DOMAIN_COLORS[challenge.domain];
                  return (
                    <div key={challenge.id} style={{...s.challengeCard,...(done?s.challengeCardDone:{}),
                      ...(challenge.battleMode?{borderColor:"rgba(239,68,68,0.25)"}:{}),
                      ...(challenge.communityMode?{borderColor:"rgba(236,72,153,0.25)"}:{}),
                    }}>
                      {/* Top glow bar */}
                      <div style={{...s.cGlowBar,background:`linear-gradient(90deg,${domCol},${domCol}60)`}}/>

                      {/* Special badges */}
                      {challenge.weekendBonus&&<div style={s.weekendBadge}>🎁 2x XP Weekend</div>}
                      {challenge.battleMode&&<div style={s.battleBadge}>⚔️ Battle Mode</div>}
                      {challenge.communityMode&&<div style={s.communityBadge}>🌍 Community</div>}
                      {done&&<div style={s.doneBadge}><CheckCircle2 size={12}/> Done</div>}

                      <div style={s.cCardBody}>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"10px",marginBottom:"8px"}}>
                          <div style={{flex:1}}>
                            <div style={s.cTitle}>{challenge.title}</div>
                            <div style={s.cDesc}>{challenge.description.slice(0,100)}...</div>
                          </div>
                        </div>

                        <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const,marginBottom:"10px"}}>
                          <span style={{...s.diffBadge,...dc}}>{challenge.difficulty}</span>
                          <span style={{...s.domainTag,color:domCol,borderColor:`${domCol}40`}}>{challenge.domain}</span>
                          <span style={s.xpTag}>⚡ {challenge.xp}+{challenge.bonusXp}</span>
                          <span style={s.timeTag}><Clock size={9}/> {challenge.timeMinutes}m</span>
                        </div>

                        {/* Participants */}
                        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
                          <div style={s.miniAvatars}>
                            {challenge.topSolvers.slice(0,3).map((sv,i)=>(
                              <div key={i} style={{...s.miniAv,width:"20px",height:"20px",fontSize:"0.55rem",marginLeft:i>0?"-4px":"0",zIndex:3-i}}>{sv.avatar}</div>
                            ))}
                          </div>
                          <span style={{fontSize:"0.68rem",color:"#64748b"}}>
                            <span style={{color:"#22c55e",fontWeight:700}}>{pCount(challenge.id).toLocaleString()}</span> solving
                          </span>
                          <span style={{fontSize:"0.65rem",color:"#334155",marginLeft:"auto"}}>
                            ⏳ {challenge.endsIn}
                          </span>
                        </div>

                        {/* Top solver */}
                        <div style={s.topSolverRow}>
                          <span style={{fontSize:"0.62rem",color:"#334155"}}>🏆 Fastest:</span>
                          <span style={{fontSize:"0.65rem",color:"#ffd700",fontWeight:700}}>{challenge.topSolvers[0]?.name}</span>
                          <span style={{fontSize:"0.62rem",color:"#475569"}}>{challenge.topSolvers[0]?.time}</span>
                        </div>

                        {/* Streak tag */}
                        {challenge.streakImpact && (
                          <div style={s.streakTag}>🔥 Counts for streak</div>
                        )}

                        <button
                          style={{...s.cStartBtn,...(done?s.cDoneBtn:{}),...(challenge.battleMode&&!done?s.cBattleBtn:{})}}
                          onClick={()=>!done&&startSolving(challenge)}>
                          {done?"✅ Completed":challenge.battleMode?"⚔️ Start Battle":challenge.communityMode?"🌍 Join Community":"▶ Start Challenge"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div style={s.rightPanel}>

            {/* Challenge leaderboard */}
            <div style={s.leaderCard}>
              <div style={s.leaderTitle}>🏆 Challenge Board</div>
              <div style={{fontSize:"0.68rem",color:"#334155",marginBottom:"10px"}}>Top solvers this week</div>
              {ARENA_SOLVERS.map((p,i)=>(
                <div key={i} style={{...s.leaderRow,...(p.isMe?s.leaderRowMe:{})}}>
                  <span style={{fontSize:"0.72rem",fontWeight:800,color:["#ffd700","#c0c0c0","#cd7f32","#6366f1","#6366f1"][i],minWidth:"20px"}}>#{p.rank}</span>
                  <div style={{...s.leaderAv,background:p.isMe?"linear-gradient(135deg,#6366f1,#3b82f6)":"rgba(255,255,255,0.06)"}}>{p.avatar}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.75rem",fontWeight:p.isMe?700:500,color:p.isMe?"white":"#94a3b8"}}>{p.name}</div>
                    <div style={{fontSize:"0.62rem",color:"#334155"}}>{p.solved} solved · {p.accuracy}% acc</div>
                  </div>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:p.isMe?"#6366f1":"#475569"}}>
                    {p.xp.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Live feed */}
            <div style={s.liveFeedCard}>
              <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"10px"}}>
                <div style={s.liveDot}/>
                <span style={{fontSize:"0.8rem",fontWeight:700,color:"white"}}>Live Activity</span>
              </div>
              {liveEvents.slice(0,6).map((ev,i)=>(
                <div key={ev.id} style={{fontSize:"0.72rem",color:i===0?"#94a3b8":"#475569",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",lineHeight:1.4}}>
                  {ev.msg}
                </div>
              ))}
            </div>

            {/* Challenge history */}
            <div style={s.historyCard}>
              <div style={s.leaderTitle}>📋 Recent History</div>
              <div style={{display:"flex",flexDirection:"column",gap:"5px",marginTop:"10px"}}>
                {HISTORY.map((h,i)=>(
                  <div key={i} style={s.histRow}>
                    <CheckCircle2 size={12} style={{color:"#22c55e",flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.75rem",color:"white",fontWeight:500}}>{h.title}</div>
                      <div style={{fontSize:"0.62rem",color:"#334155"}}>{h.domain} · {h.date} · {h.time}</div>
                    </div>
                    <div style={{textAlign:"right" as const}}>
                      <div style={{fontSize:"0.72rem",fontWeight:700,color:"#6366f1"}}>+{h.xp}</div>
                      <div style={{fontSize:"0.6rem",color:"#334155"}}>{h.accuracy}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Locked section */}
            <div style={s.lockedCard}>
              <Lock size={14} style={{color:"#ffd700"}}/>
              <div>
                <div style={{fontSize:"0.78rem",fontWeight:700,color:"#ffd700"}}>🔒 Elite Analytics</div>
                <div style={{fontSize:"0.68rem",color:"#334155",marginTop:"2px"}}>Performance trends, weakness analysis, custom challenges</div>
              </div>
              <div style={{fontSize:"0.65rem",color:"#ffd700",marginTop:"6px",fontWeight:700}}>Upgrade →</div>
            </div>
          </div>
        </div>
        <div style={{height:"40px"}}/>
      </main>

      <style>{`
        @keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes battleBarAnim{0%{width:0}100%{width:100%}}
        @keyframes completionPop{0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string,React.CSSProperties> = {
  root:{display:"flex",minHeight:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",position:"relative",overflow:"hidden",background:"#020818"},
  bg:{position:"fixed",inset:0,background:"linear-gradient(135deg,#020818 0%,#040d1e 50%,#02091a 100%)",zIndex:0},
  grid:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(59,130,246,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.03) 1px,transparent 1px)",backgroundSize:"40px 40px",zIndex:0},
  glow1:{position:"fixed",top:"-15%",left:"-5%",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},
  glow2:{position:"fixed",bottom:"-20%",right:"5%",width:"450px",height:"450px",borderRadius:"50%",background:"radial-gradient(circle,rgba(239,68,68,0.07) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},
  glow3:{position:"fixed",top:"50%",right:"-5%",width:"300px",height:"300px",borderRadius:"50%",background:"radial-gradient(circle,rgba(34,197,94,0.05) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},

  // Modals
  completionOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"},
  completionCard:{background:"rgba(6,15,34,0.99)",border:"1px solid rgba(34,197,94,0.4)",borderRadius:"20px",padding:"32px 28px",width:"min(400px,90vw)",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"10px",boxShadow:"0 0 60px rgba(34,197,94,0.2)",animation:"completionPop 0.4s ease"},
  completionTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.6rem",fontWeight:800,color:"white"},
  completionXp:{fontSize:"1.4rem",fontWeight:800,color:"#6366f1"},
  completionBonus:{fontSize:"0.9rem",color:"#f59e0b",fontWeight:700},
  completionStreak:{fontSize:"0.88rem",color:"#f97316",fontWeight:600},
  completionBtn:{marginTop:"8px",padding:"11px 32px",background:"linear-gradient(135deg,rgba(99,102,241,0.3),rgba(59,130,246,0.2))",border:"1px solid rgba(99,102,241,0.4)",borderRadius:"12px",color:"#a5b4fc",fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  battleModal:{background:"rgba(6,15,34,0.99)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"20px",padding:"28px",width:"min(420px,90vw)",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"12px",boxShadow:"0 0 60px rgba(239,68,68,0.15)"},
  battleTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.3rem",fontWeight:800,color:"white",textAlign:"center" as const},
  battleRow:{display:"flex",alignItems:"center",gap:"20px",width:"100%",justifyContent:"center"},
  battleFighter:{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"6px"},
  battleAv:{width:"52px",height:"52px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.88rem",fontWeight:700,color:"white"},
  battleBarWrap:{width:"100%",height:"6px",background:"rgba(255,255,255,0.06)",borderRadius:"3px",overflow:"hidden"},
  battleBar:{height:"100%",background:"linear-gradient(90deg,#6366f1,#ef4444)",borderRadius:"3px",animation:"battleBarAnim 3s linear"},
  battleRetryBtn:{padding:"10px 20px",background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"10px",color:"#ef4444",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},

  // Solve modal
  solveModal:{position:"relative",background:"rgba(6,15,34,0.99)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:"20px",padding:"24px",width:"min(680px,95vw)",maxHeight:"88vh",overflowY:"auto"},
  solveHeader:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px",marginBottom:"12px"},
  solveTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.2rem",fontWeight:700,color:"white"},
  solveClose:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"#64748b",cursor:"pointer",padding:"5px",display:"flex",flexShrink:0},
  solveDesc:{fontSize:"0.85rem",color:"#94a3b8",lineHeight:1.7,padding:"12px 14px",background:"rgba(255,255,255,0.02)",borderRadius:"10px",marginBottom:"12px",border:"1px solid rgba(255,255,255,0.06)"},
  hintsSection:{padding:"12px 14px",background:"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:"12px",marginBottom:"12px"},
  hintBtn:{padding:"5px 12px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"8px",color:"#818cf8",fontSize:"0.72rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  hintRevealedCard:{padding:"6px 10px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"8px",fontSize:"0.75rem",color:"#86efac",maxWidth:"200px"},
  solveLeaderboard:{padding:"12px 14px",background:"rgba(255,215,0,0.03)",border:"1px solid rgba(255,215,0,0.12)",borderRadius:"12px",marginBottom:"4px"},
  solverRow:{display:"flex",alignItems:"center",gap:"8px",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  solverAv:{width:"24px",height:"24px",borderRadius:"50%",background:"rgba(99,102,241,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",fontWeight:700,color:"white"},
  submitBtn:{flex:2,padding:"11px",background:"linear-gradient(135deg,rgba(34,197,94,0.2),rgba(16,185,129,0.15))",border:"1px solid rgba(34,197,94,0.35)",borderRadius:"11px",color:"#22c55e",fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  battleStartBtn:{flex:1,padding:"11px",background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"11px",color:"#ef4444",fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},

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
  pageTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.5rem",fontWeight:700,color:"white"},
  xpDisplay:{padding:"6px 14px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:"20px",fontSize:"0.8rem",fontWeight:700,color:"#818cf8"},
  iconBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"7px",color:"#64748b",cursor:"pointer",display:"flex"},
  avatarMed:{width:"34px",height:"34px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#3b82f6)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"},

  // Hero card
  heroCard:{position:"relative",display:"flex",gap:"20px",padding:"24px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"20px",marginBottom:"20px",overflow:"hidden",flexWrap:"wrap" as const},
  heroGlow:{position:"absolute",top:"-30%",right:"-5%",width:"300px",height:"300px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)",pointerEvents:"none"},
  heroLeft:{flex:1,minWidth:"300px"},
  heroTag:{display:"inline-flex",alignItems:"center",gap:"6px",background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"20px",padding:"4px 12px",fontSize:"0.7rem",color:"#ef4444",fontWeight:700,marginBottom:"10px",letterSpacing:"0.03em"},
  heroTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.4rem",fontWeight:700,color:"white",marginBottom:"6px"},
  heroDesc:{fontSize:"0.83rem",color:"#64748b",lineHeight:1.6,marginBottom:"12px"},
  participantsRow:{display:"flex",alignItems:"center",gap:"8px"},
  miniAvatars:{display:"flex"},
  miniAv:{width:"24px",height:"24px",borderRadius:"50%",background:"rgba(99,102,241,0.3)",border:"1.5px solid rgba(6,15,34,1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.58rem",fontWeight:700,color:"white"},
  startBtn:{padding:"10px 24px",background:"linear-gradient(135deg,rgba(99,102,241,0.3),rgba(59,130,246,0.2))",border:"1px solid rgba(99,102,241,0.4)",borderRadius:"10px",color:"#a5b4fc",fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  completedBtn:{background:"rgba(34,197,94,0.1)",borderColor:"rgba(34,197,94,0.3)",color:"#22c55e",cursor:"default"},
  battleBtn:{padding:"10px 18px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"10px",color:"#ef4444",fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  heroRight:{width:"240px",display:"flex",flexDirection:"column" as const,gap:"10px",flexShrink:0},
  streakCard:{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:"12px"},
  streakAtRisk:{background:"rgba(245,158,11,0.08)",borderColor:"rgba(245,158,11,0.3)"},
  motivBox:{padding:"10px 12px",background:"rgba(0,0,0,0.2)",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.05)"},
  communityProgress:{padding:"10px 12px",background:"rgba(236,72,153,0.06)",borderRadius:"10px",border:"1px solid rgba(236,72,153,0.15)"},
  communityBar:{height:"5px",background:"rgba(255,255,255,0.06)",borderRadius:"3px",overflow:"hidden"},
  communityFill:{height:"100%",background:"linear-gradient(90deg,#ec4899,#f43f5e)",borderRadius:"3px",transition:"width 1s ease"},
  herFeedCard:{padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.05)"},
  liveDot:{width:"7px",height:"7px",borderRadius:"50%",background:"#22c55e",animation:"livePulse 1.5s ease-in-out infinite"},

  // Content layout
  contentLayout:{display:"flex",gap:"16px",alignItems:"flex-start"},
  challengesCol:{flex:1,minWidth:0},
  rightPanel:{width:"270px",flexShrink:0,display:"flex",flexDirection:"column",gap:"12px"},

  // Tabs
  catTabs:{display:"flex",gap:"3px",background:"rgba(255,255,255,0.02)",padding:"3px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.06)"},
  catTab:{display:"flex",alignItems:"center",gap:"5px",padding:"7px 12px",borderRadius:"7px",border:"none",background:"none",color:"#475569",fontSize:"0.75rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"},
  catTabActive:{background:"rgba(99,102,241,0.15)",color:"white"},
  mainBadge:{fontSize:"0.5rem",padding:"1px 4px",borderRadius:"4px",background:"rgba(239,68,68,0.2)",color:"#ef4444",fontWeight:700},
  domainFilterBtn:{padding:"4px 10px",borderRadius:"7px",border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)",color:"#475569",fontSize:"0.68rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"},

  // Challenge grid
  emptyState:{padding:"24px",background:"rgba(255,255,255,0.02)",borderRadius:"12px",fontSize:"0.82rem",color:"#475569",textAlign:"center" as const},
  challengeGrid:{display:"flex",flexDirection:"column" as const,gap:"8px"},
  challengeCard:{position:"relative",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px",overflow:"hidden",transition:"all .2s"},
  challengeCardDone:{opacity:0.6},
  cGlowBar:{height:"2px",width:"100%"},
  weekendBadge:{position:"absolute",top:"8px",right:"8px",fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:"6px",background:"rgba(255,215,0,0.15)",color:"#ffd700",border:"1px solid rgba(255,215,0,0.3)"},
  battleBadge:{position:"absolute",top:"8px",right:"8px",fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:"6px",background:"rgba(239,68,68,0.15)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)"},
  communityBadge:{position:"absolute",top:"8px",right:"8px",fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:"6px",background:"rgba(236,72,153,0.15)",color:"#ec4899",border:"1px solid rgba(236,72,153,0.3)"},
  doneBadge:{position:"absolute",top:"8px",right:"8px",display:"flex",alignItems:"center",gap:"3px",fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:"6px",background:"rgba(34,197,94,0.12)",color:"#22c55e",border:"1px solid rgba(34,197,94,0.25)"},
  cCardBody:{padding:"10px 14px 12px"},
  cTitle:{fontSize:"0.88rem",fontWeight:700,color:"white",marginBottom:"3px"},
  cDesc:{fontSize:"0.72rem",color:"#475569",lineHeight:1.5,marginBottom:"8px"},
  topSolverRow:{display:"flex",alignItems:"center",gap:"6px",padding:"4px 0",marginBottom:"6px"},
  streakTag:{display:"inline-block",fontSize:"0.62rem",fontWeight:600,color:"#f97316",background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:"6px",padding:"1px 7px",marginBottom:"8px"},
  cStartBtn:{width:"100%",padding:"9px",background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:"9px",color:"#a5b4fc",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  cDoneBtn:{background:"rgba(34,197,94,0.08)",borderColor:"rgba(34,197,94,0.25)",color:"#22c55e",cursor:"default"},
  cBattleBtn:{background:"rgba(239,68,68,0.1)",borderColor:"rgba(239,68,68,0.25)",color:"#ef4444"},

  // Shared badges
  diffBadge:{fontSize:"0.65rem",fontWeight:700,padding:"2px 8px",borderRadius:"8px",border:"1px solid"},
  domainTag:{fontSize:"0.65rem",fontWeight:700,padding:"2px 8px",borderRadius:"8px",border:"1px solid"},
  xpTag:{fontSize:"0.65rem",fontWeight:700,padding:"2px 8px",borderRadius:"8px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",color:"#818cf8"},
  timeTag:{display:"flex",alignItems:"center",gap:"3px",fontSize:"0.65rem",fontWeight:700,padding:"2px 8px",borderRadius:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#64748b"},
  tagChip:{fontSize:"0.65rem",padding:"2px 8px",borderRadius:"7px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"#475569"},

  // Right panel
  leaderCard:{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px"},
  leaderTitle:{fontSize:"0.85rem",fontWeight:700,color:"white"},
  leaderRow:{display:"flex",alignItems:"center",gap:"7px",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  leaderRowMe:{background:"rgba(99,102,241,0.07)",borderRadius:"8px",padding:"6px 8px",margin:"0 -8px"},
  leaderAv:{width:"26px",height:"26px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",fontWeight:700,color:"white",flexShrink:0},
  liveFeedCard:{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px"},
  historyCard:{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px"},
  histRow:{display:"flex",alignItems:"center",gap:"8px",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  lockedCard:{display:"flex",flexDirection:"column" as const,gap:"4px",padding:"14px",background:"rgba(255,215,0,0.03)",border:"1px solid rgba(255,215,0,0.12)",borderRadius:"14px",cursor:"pointer"},
};