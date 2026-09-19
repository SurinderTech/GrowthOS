"use client";
// app/dashboard/leaderboard/page.tsx
// GrowthOS — Multi-Level Leaderboard v2 (Global / My Field / My Batch / Friends)
// Default view: My Batch | This Week | People Around You

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Play, BarChart2, Trophy,
  Users, Settings, LogOut, Globe2, Crown, Zap,
  Flame, RefreshCw, UserPlus, UserCheck, ChevronLeft,
  TrendingUp, TrendingDown, Minus, Star, Shield,
  Swords, Circle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const NAV = [
  { icon: <LayoutDashboard size={18}/>, label:"Dashboard",     href:"/dashboard" },
  { icon: <Play size={18}/>,            label:"Practice Arena", href:"/dashboard/practice" },
  { icon: <BarChart2 size={18}/>,       label:"Leaderboard",   href:"/dashboard/leaderboard", active:true },
  { icon: <Trophy size={18}/>,          label:"Challenges",    href:"/dashboard/challenges" },
  { icon: <Users size={18}/>,           label:"Community",     href:"/dashboard/community" },
  { icon: <Settings size={18}/>,        label:"Settings",      href:"/dashboard/settings" },
];

const LEAGUES = [
  { name:"Bronze",  color:"#cd7f32", min:0,    bg:"rgba(205,127,50,0.15)"  },
  { name:"Silver",  color:"#c0c0c0", min:3000, bg:"rgba(192,192,192,0.15)" },
  { name:"Gold",    color:"#ffd700", min:6000, bg:"rgba(255,215,0,0.15)"   },
  { name:"Elite",   color:"#a855f7", min:8500, bg:"rgba(168,85,247,0.15)"  },
  { name:"Silicon", color:"#22c55e", min:9500, bg:"rgba(34,197,94,0.15)"   },
];

type Scope = "batch"|"field"|"global"|"friends";
type Period = "weekly"|"monthly"|"alltime";

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
  field_key?: string;
}

interface MyRankData {
  score: number;
  streak: number;
  longest_streak: number;
  league: string;
  badge?: string;
  xp_to_next_rank: number;
  xp_weekly: number;
  xp_monthly: number;
  xp_total: number;
  challenges_done: number;
  total_correct: number;
  field_key: string;
  field_label: string;
  batch_key: string;
  batch_label: string;
  ranks: {
    global?:  { rank?: number; total_users?: number; movement_label?: string; rank_change?: number };
    field?:   { rank?: number; total_users?: number; movement_label?: string; rank_change?: number };
    batch?:   { rank?: number; total_users?: number; movement_label?: string; rank_change?: number };
    weekly?:  { rank?: number; total_users?: number; movement_label?: string };
    friends?: { rank?: number; total_users?: number } | null;
  };
}

interface PublicProfile {
  user_id: string;
  name: string;
  avatar: string;
  image?: string;
  bio?: string;
  score: number;
  league: string;
  streak: number;
  longest_streak: number;
  challenges_done: number;
  weekly_wins: number;
  post_count: number;
  field_label: string;
  batch_label: string;
  institution_name?: string;
  graduation_year?: string;
  user_type?: string;
  exam_type?: string;
  global_rank?: number;
  global_total?: number;
  field_rank?: number;
  batch_rank?: number;
  arena?: { elo: number; level: number; wins: number; losses: number };
  member_since?: string;
  friendship_status: "none"|"pending_sent"|"pending_received"|"friends"|"self";
  xp_total: number;
  xp_weekly: number;
  is_me: boolean;
}

function leagueColor(l: string): string {
  return LEAGUES.find(x => x.name === l)?.color || "#475569";
}
function leagueBg(l: string): string {
  return LEAGUES.find(x => x.name === l)?.bg || "rgba(71,85,105,0.15)";
}

function MovementBadge({ label }: { label?: string }) {
  if (!label || label === "NEW") return <span style={{fontSize:"10px",color:"#22c55e",fontWeight:700,background:"rgba(34,197,94,0.15)",padding:"2px 6px",borderRadius:99}}>NEW</span>;
  if (label.startsWith("↑")) return <span style={{fontSize:"11px",color:"#22c55e",fontWeight:700}}>{label}</span>;
  if (label.startsWith("↓")) return <span style={{fontSize:"11px",color:"#ef4444",fontWeight:700}}>{label}</span>;
  return <span style={{fontSize:"11px",color:"#64748b"}}>—</span>;
}

function PresenceDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    online: "#22c55e", in_battle: "#f59e0b", offline: "#475569"
  };
  const labels: Record<string, string> = {
    online: "Online", in_battle: "In Battle", offline: "Offline"
  };
  const s = status || "offline";
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      fontSize:10,color:colors[s]||"#475569",fontWeight:600,
    }}>
      <span style={{
        width:7,height:7,borderRadius:"50%",
        background:colors[s]||"#475569",
        boxShadow: s === "online" ? `0 0 6px ${colors[s]}` : undefined,
      }}/>
      {labels[s]||"Offline"}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{fontSize:20}}>🥇</span>;
  if (rank === 2) return <span style={{fontSize:20}}>🥈</span>;
  if (rank === 3) return <span style={{fontSize:20}}>🥉</span>;
  return <span style={{fontWeight:700,color:"#94a3b8",fontSize:15}}>#{rank}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Row
// ─────────────────────────────────────────────────────────────────────────────
function PlayerRow({
  player, onClickProfile,
}: { player: Player; onClickProfile: (id: string) => void }) {
  const lc = leagueColor(player.league);
  return (
    <div
      onClick={() => onClickProfile(player.user_id)}
      style={{
        display:"flex",alignItems:"center",gap:12,padding:"10px 16px",
        borderRadius:12,cursor:"pointer",transition:"background 0.15s",
        background: player.is_current_user ? "rgba(99,102,241,0.12)" : "transparent",
        border: player.is_current_user ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
      }}
      onMouseEnter={e=>(e.currentTarget.style.background=player.is_current_user?"rgba(99,102,241,0.18)":"rgba(255,255,255,0.04)")}
      onMouseLeave={e=>(e.currentTarget.style.background=player.is_current_user?"rgba(99,102,241,0.12)":"transparent")}
    >
      {/* Rank */}
      <div style={{width:36,textAlign:"center",flexShrink:0}}>
        <RankBadge rank={player.rank}/>
      </div>

      {/* Avatar */}
      <div style={{
        width:38,height:38,borderRadius:"50%",flexShrink:0,
        background:leagueBg(player.league),
        border:`2px solid ${lc}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        overflow:"hidden",
      }}>
        {player.image
          ? <img src={player.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : <span style={{fontSize:13,fontWeight:700,color:lc}}>{player.avatar}</span>
        }
      </div>

      {/* Name + badge */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontWeight:600,color:"#f1f5f9",fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {player.name}
          </span>
          {player.is_current_user && (
            <span style={{fontSize:10,color:"#6366f1",background:"rgba(99,102,241,0.2)",padding:"1px 6px",borderRadius:99,fontWeight:700}}>YOU</span>
          )}
          {player.badge && (
            <span style={{fontSize:10,color:lc,background:leagueBg(player.league),padding:"1px 6px",borderRadius:99}}>{player.badge}</span>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
          {player.streak > 0 && (
            <span style={{fontSize:11,color:"#f97316",display:"flex",alignItems:"center",gap:3}}>
              <Flame size={11}/>{player.streak}d
            </span>
          )}
          {(player.challenges_done ?? 0) > 0 && (
            <span style={{fontSize:11,color:"#94a3b8"}}>
              🏆 {player.challenges_done}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontWeight:700,color:lc,fontSize:16}}>{player.score.toLocaleString()}</div>
        <div style={{fontSize:10,color:"#64748b"}}>{player.league}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Profile Modal
// ─────────────────────────────────────────────────────────────────────────────
function ProfileModal({
  profile, onClose, onFriendAction,
}: {
  profile: PublicProfile;
  onClose: () => void;
  onFriendAction: (userId: string, action: "send"|"cancel") => void;
}) {
  const lc = leagueColor(profile.league);
  const memberYear = profile.member_since
    ? new Date(profile.member_since).getFullYear()
    : null;

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:9999,
      background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"linear-gradient(160deg,#0f172a,#1e293b)",
        border:`1px solid ${lc}40`,
        borderRadius:20,maxWidth:480,width:"100%",
        maxHeight:"90vh",overflowY:"auto",
        boxShadow:`0 0 60px ${lc}20`,
        animation:"fadeInScale 0.2s ease",
      }}>
        {/* Header */}
        <div style={{
          background:`linear-gradient(135deg,${lc}15,transparent)`,
          borderBottom:`1px solid ${lc}20`,
          padding:"24px 24px 16px",
          display:"flex",alignItems:"flex-start",gap:16,
        }}>
          <div style={{
            width:70,height:70,borderRadius:"50%",
            background:leagueBg(profile.league),
            border:`3px solid ${lc}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,overflow:"hidden",position:"relative",
          }}>
            {profile.image
              ? <img src={profile.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <span style={{fontSize:24,fontWeight:800,color:lc}}>{profile.avatar}</span>
            }
            <div style={{
              position:"absolute",bottom:0,right:0,
              background:lc,borderRadius:"50%",width:20,height:20,
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              <Shield size={11} color="#000"/>
            </div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{margin:0,fontWeight:800,color:"#f1f5f9",fontSize:20}}>{profile.name}</h2>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
              <span style={{fontSize:12,color:lc,background:leagueBg(profile.league),padding:"2px 8px",borderRadius:99,fontWeight:700}}>
                {profile.league} League
              </span>
              {profile.user_type && (
                <span style={{fontSize:12,color:"#94a3b8",background:"rgba(148,163,184,0.1)",padding:"2px 8px",borderRadius:99}}>
                  {profile.field_label}
                </span>
              )}
            </div>
            {profile.bio && (
              <p style={{margin:"8px 0 0",fontSize:13,color:"#94a3b8",lineHeight:1.5}}>{profile.bio}</p>
            )}
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",cursor:"pointer",color:"#94a3b8",borderRadius:8,padding:"4px 8px",fontSize:18}}>×</button>
        </div>

        <div style={{padding:"16px 24px"}}>
          {/* Institution + Year */}
          {(profile.institution_name || profile.graduation_year) && (
            <div style={{
              background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",
              borderRadius:10,padding:"10px 14px",marginBottom:16,
              display:"flex",alignItems:"center",gap:8,
            }}>
              <span style={{fontSize:16}}>🏫</span>
              <div>
                {profile.institution_name && <div style={{color:"#f1f5f9",fontSize:13,fontWeight:600}}>{profile.institution_name}</div>}
                {profile.graduation_year && <div style={{color:"#94a3b8",fontSize:12}}>Class of {profile.graduation_year}</div>}
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
            {[
              { label:"Score", value: profile.score.toLocaleString(), color: lc, icon:"⚡" },
              { label:"Streak", value: `${profile.streak}d 🔥`, color:"#f97316", icon:"🔥" },
              { label:"Best Streak", value: `${profile.longest_streak}d`, color:"#f59e0b", icon:"🏅" },
              { label:"Challenges", value: profile.challenges_done, color:"#a855f7", icon:"🏆" },
              { label:"Weekly Wins", value: profile.weekly_wins, color:"#ffd700", icon:"👑" },
              { label:"XP Total", value: profile.xp_total?.toLocaleString() || "0", color:"#22c55e", icon:"💠" },
            ].map(s => (
              <div key={s.label} style={{
                background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:10,padding:"10px 12px",textAlign:"center",
              }}>
                <div style={{fontSize:18}}>{s.icon}</div>
                <div style={{fontSize:16,fontWeight:800,color:s.color,marginTop:2}}>{s.value}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Ranks */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:"#64748b",fontWeight:700,marginBottom:8,letterSpacing:1}}>RANKINGS</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                { label:"Global",    rank: profile.global_rank,  total: profile.global_total,  icon:<Globe2 size={14}/> },
                { label:"My Field",  rank: profile.field_rank,   total: undefined,              icon:<BarChart2 size={14}/> },
                { label:"My Batch",  rank: profile.batch_rank,   total: undefined,              icon:<Users size={14}/> },
              ].map(r => r.rank ? (
                <div key={r.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:8}}>
                  <span style={{display:"flex",alignItems:"center",gap:6,color:"#94a3b8",fontSize:13}}>{r.icon}{r.label}</span>
                  <span style={{fontWeight:700,color:"#f1f5f9",fontSize:14}}>
                    #{r.rank} {r.total ? <span style={{color:"#64748b",fontWeight:400,fontSize:12}}>/ {r.total.toLocaleString()}</span> : ""}
                  </span>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Arena stats */}
          {profile.arena && profile.arena.elo > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,color:"#64748b",fontWeight:700,marginBottom:8,letterSpacing:1}}>ARENA</div>
              <div style={{display:"flex",gap:10}}>
                {[
                  { label:"ELO", value:profile.arena.elo, color:"#6366f1" },
                  { label:"Level", value:profile.arena.level, color:"#22c55e" },
                  { label:"Wins", value:profile.arena.wins, color:"#ffd700" },
                  { label:"Losses", value:profile.arena.losses, color:"#ef4444" },
                ].map(s => (
                  <div key={s.label} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 4px"}}>
                    <div style={{fontSize:15,fontWeight:800,color:s.color}}>{s.value}</div>
                    <div style={{fontSize:11,color:"#64748b"}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member since */}
          {memberYear && (
            <div style={{fontSize:12,color:"#475569",textAlign:"center",marginBottom:12}}>
              Member since {memberYear}
            </div>
          )}

          {/* Batch */}
          <div style={{fontSize:12,color:"#64748b",textAlign:"center",marginBottom:16}}>
            {profile.batch_label}
          </div>

          {/* Friend action */}
          {!profile.is_me && (
            <div style={{display:"flex",gap:10}}>
              {profile.friendship_status === "none" && (
                <button
                  onClick={() => onFriendAction(profile.user_id, "send")}
                  style={{
                    flex:1,background:"linear-gradient(135deg,#6366f1,#a855f7)",
                    border:"none",borderRadius:10,padding:"11px 0",color:"#fff",
                    fontWeight:700,fontSize:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                    transition:"transform 0.15s,box-shadow 0.15s",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.02)";e.currentTarget.style.boxShadow="0 4px 20px rgba(99,102,241,0.4)"}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none"}}
                >
                  <UserPlus size={16}/> Add Friend
                </button>
              )}
              {profile.friendship_status === "pending_sent" && (
                <div style={{flex:1,textAlign:"center",padding:"11px 0",color:"#94a3b8",fontSize:14,fontWeight:600,background:"rgba(148,163,184,0.08)",borderRadius:10}}>
                  ⏳ Request Sent
                </div>
              )}
              {profile.friendship_status === "pending_received" && (
                <button
                  onClick={() => onFriendAction(profile.user_id, "send")}
                  style={{
                    flex:1,background:"linear-gradient(135deg,#22c55e,#16a34a)",
                    border:"none",borderRadius:10,padding:"11px 0",color:"#fff",
                    fontWeight:700,fontSize:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  }}
                >
                  <UserCheck size={16}/> Accept Request
                </button>
              )}
              {profile.friendship_status === "friends" && (
                <div style={{flex:1,textAlign:"center",padding:"11px 0",color:"#22c55e",fontSize:14,fontWeight:700,background:"rgba(34,197,94,0.1)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <UserCheck size={16}/> Friends
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rawName = (user as any)?.full_name || (user as any)?.name || "";
  const currentUser = mounted ? (rawName.includes("@") ? rawName.split("@")[0] : rawName) || "User" : "User";
  const avatarInitials = mounted && currentUser !== "User" ? currentUser.slice(0,2).toUpperCase() : "US";
  const userAvatarUrl = (user as any)?.avatar_url || (user as any)?.image || null;

  const [loaded, setLoaded]     = useState(false);
  const [scope, setScope]       = useState<Scope>("batch");
  const [period, setPeriod]     = useState<Period>("weekly");
  const [players, setPlayers]   = useState<Player[]>([]);
  const [around, setAround]     = useState<Player[]>([]);
  const [myData, setMyData]     = useState<MyRankData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string|null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile|null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [total, setTotal]       = useState(0);
  const [scopeLabel, setScopeLabel] = useState("");

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setTimeout(()=>setLoaded(true),80); }, []);

  const fetchLeaderboard = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const [lbRes, meRes, aroundRes] = await Promise.all([
        fetch(`${API}/leaderboard/v2/?scope=${scope}&period=${period}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/leaderboard/v2/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/leaderboard/v2/around?scope=${scope}&period=${period}&radius=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (lbRes.ok) {
        const data = await lbRes.json();
        setPlayers(data.users || []);
        setTotal(data.total || 0);
        setScopeLabel(data.scope_label || "");
      } else {
        setFetchError("Failed to load leaderboard");
      }
      if (meRes.ok) {
        const data = await meRes.json();
        setMyData(data);
      }
      if (aroundRes.ok) {
        const data = await aroundRes.json();
        setAround(data.users || []);
      }
    } catch {
      setFetchError("Could not connect to server");
    } finally {
      setIsLoading(false);
    }
  }, [scope, period]);

  useEffect(() => {
    if (!mounted) return;
    fetchLeaderboard();
    const iv = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(iv);
  }, [fetchLeaderboard, mounted]);

  // Heartbeat
  useEffect(() => {
    if (!mounted) return;
    const token = getToken();
    if (!token) return;
    const hb = () => fetch(`${API}/social/presence/heartbeat`, {
      method:"POST", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body: JSON.stringify({}),
    }).catch(() => {});
    hb();
    const iv = setInterval(hb, 30000);
    return () => clearInterval(iv);
  }, [mounted]);

  const openProfile = useCallback(async (userId: string) => {
    const token = getToken();
    if (!token) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`${API}/leaderboard/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedProfile(data);
      }
    } catch {}
    setProfileLoading(false);
  }, []);

  const handleFriendAction = useCallback(async (userId: string, action: "send"|"cancel") => {
    const token = getToken();
    if (!token) return;
    await fetch(`${API}/social/friend-request`, {
      method:"POST",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ addressee_id: userId }),
    });
    // Refresh profile
    openProfile(userId);
  }, [openProfile]);

  const scopeOptions: { key: Scope; label: string; icon: React.ReactNode }[] = [
    { key:"batch",   label:"My Batch",   icon:<Users size={14}/> },
    { key:"field",   label:"My Field",   icon:<BarChart2 size={14}/> },
    { key:"global",  label:"Global",     icon:<Globe2 size={14}/> },
    { key:"friends", label:"Friends",    icon:<UserCheck size={14}/> },
  ];
  const periodOptions: { key: Period; label: string }[] = [
    { key:"weekly",   label:"This Week"  },
    { key:"monthly",  label:"This Month" },
    { key:"alltime",  label:"All Time"   },
  ];

  const myBatchRank = myData?.ranks?.batch;
  const myWeekRank  = myData?.ranks?.weekly;
  const league      = myData?.league || "Bronze";
  const lc          = leagueColor(league);

  const skeleton = (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {Array.from({length:10}).map((_,i) => (
        <div key={i} style={{
          height:60,borderRadius:12,
          background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
          backgroundSize:"200% 100%",
          animation:"shimmer 1.5s infinite",
        }}/>
      ))}
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh",background:"#020817",color:"#f1f5f9",
      fontFamily:"'Inter',sans-serif",
      opacity:loaded?1:0,transition:"opacity 0.4s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:4px}
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeInScale { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>

      {isProfileModalOpen && (
        <ProfileSettingsModal onClose={() => setIsProfileModalOpen(false)} />
      )}

      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onFriendAction={handleFriendAction}
        />
      )}

      {profileLoading && (
        <div style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{color:"#6366f1",fontSize:14,fontWeight:600,animation:"pulse 1s infinite"}}>Loading profile…</div>
        </div>
      )}

      <div style={{display:"flex",minHeight:"100vh"}}>
        {/* Sidebar */}
        <aside style={{
          width:220,flexShrink:0,borderRight:"1px solid rgba(255,255,255,0.06)",
          background:"rgba(2,8,23,0.95)",backdropFilter:"blur(20px)",
          display:"flex",flexDirection:"column",
          position:"sticky",top:0,height:"100vh",
        }}>
          <div style={{padding:"20px 16px 0"}}>
            <BrandLogo/>
          </div>
          <nav style={{flex:1,padding:"16px 8px",display:"flex",flexDirection:"column",gap:4}}>
            {NAV.map(item => (
              <Link key={item.href} href={item.href} style={{
                display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                borderRadius:10,color:item.active?"#f1f5f9":"#64748b",
                background:item.active?"rgba(99,102,241,0.15)":"transparent",
                textDecoration:"none",fontSize:14,fontWeight:item.active?600:400,
                transition:"all 0.15s",
              }}>
                {item.icon}{item.label}
              </Link>
            ))}
          </nav>
          <div style={{padding:"12px 8px 20px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              style={{
                display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                borderRadius:10,background:"transparent",border:"none",
                cursor:"pointer",width:"100%",
              }}
            >
              <div style={{
                width:30,height:30,borderRadius:"50%",overflow:"hidden",
                background:"linear-gradient(135deg,#6366f1,#a855f7)",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                {userAvatarUrl
                  ? <img src={userAvatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{avatarInitials}</span>
                }
              </div>
              <span style={{fontSize:13,color:"#94a3b8",flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentUser}</span>
            </button>
            <button
              onClick={logout}
              style={{
                display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                borderRadius:10,background:"transparent",border:"none",
                cursor:"pointer",width:"100%",color:"#64748b",fontSize:13,
              }}
            >
              <LogOut size={16}/> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{flex:1,overflowY:"auto",maxHeight:"100vh"}}>
          <div style={{maxWidth:800,margin:"0 auto",padding:"24px 20px"}}>

            {/* Header */}
            <div style={{marginBottom:24}}>
              <Link href="/dashboard" style={{display:"inline-flex",alignItems:"center",gap:6,color:"#64748b",fontSize:13,textDecoration:"none",marginBottom:12}}>
                <ChevronLeft size={14}/>Dashboard
              </Link>
              <h1 style={{margin:0,fontSize:28,fontWeight:900,letterSpacing:-0.5}}>
                🏆 Leaderboard
              </h1>
              <p style={{margin:"4px 0 0",color:"#64748b",fontSize:14}}>
                Compete with real people in your field. Scores update live.
              </p>
            </div>

            {/* Hero: My Rank Card */}
            {myData && (
              <div style={{
                background:`linear-gradient(135deg,${lc}12,rgba(99,102,241,0.06),transparent)`,
                border:`1px solid ${lc}30`,
                borderRadius:20,padding:"20px 24px",marginBottom:24,
                boxShadow:`0 0 40px ${lc}08`,
                animation:"slideUp 0.4s ease",
              }}>
                <div style={{display:"flex",alignItems:"flex-start",gap:20,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontSize:12,color:"#64748b",fontWeight:700,letterSpacing:1,marginBottom:8}}>YOUR POSITION</div>
                    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontWeight:900,color:lc,fontSize:40,lineHeight:1}}>
                          {myBatchRank?.rank ? `#${myBatchRank.rank}` : "—"}
                        </div>
                        <div style={{fontSize:13,color:"#94a3b8",marginTop:2}}>
                          in {myData.batch_label}
                        </div>
                      </div>
                      {myBatchRank?.movement_label && (
                        <div style={{textAlign:"center"}}>
                          <MovementBadge label={myBatchRank.movement_label}/>
                          <div style={{fontSize:10,color:"#475569",marginTop:2}}>this week</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                    {[
                      { label:"Score", value: myData.score.toLocaleString(), color: lc },
                      { label:"Streak", value: `🔥 ${myData.streak}d`, color:"#f97316" },
                      { label:"This Week", value: myData.xp_weekly?.toLocaleString() || "0", color:"#22c55e" },
                      { label:"Challenges", value: `🏆 ${myData.challenges_done}`, color:"#a855f7" },
                    ].map(s => (
                      <div key={s.label} style={{textAlign:"center"}}>
                        <div style={{fontWeight:800,color:s.color,fontSize:18}}>{s.value}</div>
                        <div style={{fontSize:11,color:"#475569"}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other ranks */}
                {myData.ranks && (
                  <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
                    {[
                      { label:"Global", rank: myData.ranks.global?.rank, total: myData.ranks.global?.total_users },
                      { label:"My Field", rank: myData.ranks.field?.rank, total: myData.ranks.field?.total_users },
                      { label:"My Batch", rank: myData.ranks.batch?.rank, total: myData.ranks.batch?.total_users },
                    ].filter(r => r.rank).map(r => (
                      <div key={r.label} style={{
                        background:"rgba(255,255,255,0.05)",borderRadius:8,
                        padding:"5px 10px",fontSize:12,
                      }}>
                        <span style={{color:"#64748b"}}>{r.label}: </span>
                        <span style={{fontWeight:700,color:"#f1f5f9"}}>#{r.rank}</span>
                        {r.total && <span style={{color:"#475569"}}> / {r.total.toLocaleString()}</span>}
                      </div>
                    ))}
                    {myData.xp_to_next_rank > 0 && (
                      <div style={{
                        background:"rgba(99,102,241,0.1)",borderRadius:8,
                        padding:"5px 10px",fontSize:12,color:"#6366f1",fontWeight:600,
                      }}>
                        <Zap size={12} style={{verticalAlign:"middle"}}/> {myData.xp_to_next_rank.toLocaleString()} to next rank
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Scope Tabs */}
            <div style={{
              display:"flex",gap:4,padding:4,
              background:"rgba(255,255,255,0.04)",borderRadius:14,
              marginBottom:12,
            }}>
              {scopeOptions.map(s => (
                <button key={s.key} onClick={() => setScope(s.key)}
                  style={{
                    flex:1,padding:"8px 4px",borderRadius:10,border:"none",
                    background: scope === s.key ? "rgba(99,102,241,0.25)" : "transparent",
                    color: scope === s.key ? "#f1f5f9" : "#64748b",
                    fontWeight: scope === s.key ? 700 : 400,
                    fontSize:13,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                    transition:"all 0.2s",
                  }}>
                  {s.icon}{s.label}
                </button>
              ))}
            </div>

            {/* Period Tabs */}
            <div style={{display:"flex",gap:6,marginBottom:20}}>
              {periodOptions.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  style={{
                    padding:"6px 14px",borderRadius:8,border:"none",
                    background: period === p.key
                      ? "linear-gradient(135deg,#6366f1,#a855f7)"
                      : "rgba(255,255,255,0.06)",
                    color: period === p.key ? "#fff" : "#64748b",
                    fontWeight: period === p.key ? 700 : 400,
                    fontSize:12,cursor:"pointer",
                    transition:"all 0.2s",
                  }}>
                  {p.label}
                </button>
              ))}
              <button onClick={fetchLeaderboard} style={{
                marginLeft:"auto",padding:"6px 12px",borderRadius:8,
                background:"rgba(255,255,255,0.06)",border:"none",
                cursor:"pointer",color:"#64748b",display:"flex",alignItems:"center",gap:5,fontSize:12,
              }}>
                <RefreshCw size={12}/> Refresh
              </button>
            </div>

            {fetchError && (
              <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"12px 16px",color:"#ef4444",marginBottom:20,fontSize:14}}>
                {fetchError}
              </div>
            )}

            {/* People Around You */}
            {around.length > 0 && !isLoading && (
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <TrendingUp size={16} color="#6366f1"/>
                  <span style={{fontWeight:700,fontSize:15,color:"#f1f5f9"}}>People Around You</span>
                  <span style={{fontSize:12,color:"#475569"}}>±5 ranks</span>
                </div>
                <div style={{
                  background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:14,overflow:"hidden",
                }}>
                  {around.map(p => (
                    <PlayerRow key={p.user_id} player={p} onClickProfile={openProfile}/>
                  ))}
                </div>
              </div>
            )}

            {/* Main Leaderboard */}
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <Crown size={16} color="#ffd700"/>
                <span style={{fontWeight:700,fontSize:15,color:"#f1f5f9"}}>
                  {scopeLabel || "Leaderboard"}
                </span>
                {!isLoading && (
                  <span style={{fontSize:12,color:"#475569"}}>{total.toLocaleString()} users</span>
                )}
              </div>

              {isLoading ? skeleton : (
                players.length === 0 ? (
                  <div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}>
                    {scope === "friends"
                      ? "Add friends to see them here! Click on any player to send a request."
                      : "No users in this leaderboard yet. Be the first to earn points!"
                    }
                  </div>
                ) : (
                  <div style={{
                    background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:14,overflow:"hidden",
                  }}>
                    {players.map(p => (
                      <PlayerRow key={p.user_id} player={p} onClickProfile={openProfile}/>
                    ))}
                  </div>
                )
              )}
            </div>

            <div style={{height:48}}/>
          </div>
        </main>
      </div>
    </div>
  );
}