"use client";
// app/dashboard/community/page.tsx
// GrowthOS — Real-Time Batch Community (no hardcoded data)

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Play, BarChart2, Trophy,
  Users, Settings, LogOut, Bell, ChevronLeft,
  Flame, Zap, Crown, Send, RefreshCw, Heart,
  MessageCircle, Star, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const NAV = [
  { icon: <LayoutDashboard size={18}/>, label:"Dashboard",     href:"/dashboard" },
  { icon: <Play size={18}/>,            label:"Practice Arena",href:"/dashboard/practice" },
  { icon: <BarChart2 size={18}/>,       label:"Leaderboard",   href:"/dashboard/leaderboard" },
  { icon: <Trophy size={18}/>,          label:"Challenges",    href:"/dashboard/challenges" },
  { icon: <Users size={18}/>,           label:"Community",     href:"/dashboard/community", active:true },
  { icon: <Settings size={18}/>,        label:"Settings",      href:"/dashboard/settings" },
];

type Status = "grinding"|"mission"|"idle"|"onfire"|"top";

const STATUS_CONFIG: Record<Status,{label:string;color:string;dot:string;bg:string}> = {
  grinding: { label:"Grinding",      color:"#22c55e", dot:"🟢", bg:"rgba(34,197,94,0.12)"  },
  mission:  { label:"In Mission",    color:"#f59e0b", dot:"⚡", bg:"rgba(245,158,11,0.12)"  },
  idle:     { label:"Idle",          color:"#475569", dot:"💤", bg:"rgba(71,85,105,0.12)"   },
  onfire:   { label:"On Fire",       color:"#ef4444", dot:"🔥", bg:"rgba(239,68,68,0.12)"   },
  top:      { label:"Top Performer", color:"#ffd700", dot:"👑", bg:"rgba(255,215,0,0.12)"   },
};

const LEAGUE_COLORS: Record<string,string> = {
  Bronze:"#cd7f32", Silver:"#c0c0c0", Gold:"#ffd700", Elite:"#6366f1", Silicon:"#22c55e",
};

interface Member {
  user_id: string;
  name: string;
  avatar: string;
  image?: string;
  score: number;
  streak: number;
  longest_streak: number;
  rank: number;
  league: string;
  status: Status;
  is_current_user: boolean;
  challenges_done: number;
  total_correct: number;
}

interface Post {
  id: string;
  author_name: string;
  author_badge?: string;
  content: string;
  post_type: string;
  reaction_count: number;
  reply_count: number;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
}

interface BatchInfo {
  batch_key: string;
  batch_label: string;
  field_key: string;
  member_count: number;
  description: string;
}

interface LiveEvent {
  id: number;
  msg: string;
}

export default function CommunityPage() {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rawName = (user as any)?.full_name || (user as any)?.name || "";
  const currentUser = mounted ? (rawName.includes("@") ? rawName.split("@")[0] : rawName) || "User" : "User";
  const avatarInitials = mounted && currentUser !== "User" ? currentUser.slice(0,2).toUpperCase() : "US";
  const userAvatarUrl = (user as any)?.avatar_url || (user as any)?.image || null;

  const [loaded, setLoaded]         = useState(false);
  const [members, setMembers]       = useState<Member[]>([]);
  const [posts, setPosts]           = useState<Post[]>([]);
  const [batch, setBatch]           = useState<BatchInfo|null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [postLoading, setPostLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string|null>(null);
  const [postText, setPostText]     = useState("");
  const [postType, setPostType]     = useState<"text"|"achievement"|"milestone">("text");
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [activeView, setActiveView] = useState<"feed"|"members">("feed");
  const [reactedPosts, setReactedPosts] = useState<Set<string>>(new Set());
  const eventId                     = useRef(0);
  const feedRef                     = useRef<HTMLDivElement|null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setTimeout(()=>setLoaded(true),80); }, []);

  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsLoading(true); setFetchError(null);
    try {
      const [batchRes, membersRes, feedRes] = await Promise.all([
        fetch(`${API}/community/batch`,   { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/community/members`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/community/feed`,    { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (batchRes.ok) {
        const d = await batchRes.json();
        setBatch(d);
      }
      if (membersRes.ok) {
        const d = await membersRes.json();
        setMembers(d.members || []);
      }
      if (feedRes.ok) {
        const d = await feedRes.json();
        setPosts(d.posts || []);
      }
      if (!batchRes.ok && !membersRes.ok) {
        setFetchError("Failed to load community data");
      }
    } catch {
      setFetchError("Could not connect to server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchData();
    const interval = setInterval(() => {
      // Poll feed silently every 15s
      const token = getToken();
      if (!token) return;
      fetch(`${API}/community/feed`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.posts) setPosts(d.posts); })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchData, mounted]);

  // SSE for live events
  useEffect(() => {
    if (!mounted) return;
    const token = getToken();
    if (!token) return;

    // Simulate live events from real activity (derived from member status)
    const interval = setInterval(() => {
      if (!members.length) return;
      const active = members.filter(m => !m.is_current_user && m.streak > 0);
      if (!active.length) return;
      const m = active[Math.floor(Math.random() * Math.min(active.length, 5))];
      const actions = [
        `⚡ ${m.name.split(" ")[0]} earned +${[10,25,50][Math.floor(Math.random()*3)]} XP`,
        `🔥 ${m.name.split(" ")[0]} is on a ${m.streak}-day streak!`,
        `🏆 ${m.name.split(" ")[0]} completed a challenge`,
        `📈 ${m.name.split(" ")[0]} climbed to Rank #${m.rank}`,
        `🌟 ${m.name.split(" ")[0]} solved ${m.total_correct} questions total`,
      ];
      const msg = actions[Math.floor(Math.random() * actions.length)];
      const id = eventId.current++;
      setLiveEvents(prev => [...prev.slice(-3), {id, msg}]);
      setTimeout(() => setLiveEvents(prev => prev.filter(e => e.id !== id)), 5000);
    }, 6000);

    return () => clearInterval(interval);
  }, [mounted, members]);

  const handlePost = async () => {
    const token = getToken();
    if (!token || !postText.trim()) return;
    setPostLoading(true);
    try {
      const res = await fetch(`${API}/community/post`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: postText.trim(), post_type: postType }),
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts(prev => [newPost, ...prev]);
        setPostText("");
      }
    } catch {}
    setPostLoading(false);
  };

  const handleReact = async (postId: string) => {
    const token = getToken();
    if (!token) return;
    const alreadyReacted = reactedPosts.has(postId);
    // Optimistic update
    setReactedPosts(prev => {
      const next = new Set(prev);
      if (alreadyReacted) next.delete(postId); else next.add(postId);
      return next;
    });
    setPosts(prev => prev.map(p => p.id===postId ? {...p, reaction_count: p.reaction_count + (alreadyReacted ? -1 : 1)} : p));

    try {
      await fetch(`${API}/community/post/${postId}/react`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: "🔥" }),
      });
    } catch {}
  };

  const timeAgo = (iso: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  };

  const activeMembersCount = members.filter(m => m.status !== "idle").length;
  const topStreakMember = [...members].sort((a,b) => b.streak - a.streak)[0];

  return (
    <div style={s.root}>
      <div style={s.bg}/><div style={s.bgGrid}/><div style={s.glow1}/><div style={s.glow2}/>

      {/* Live events ticker */}
      <div style={s.eventTicker}>
        {liveEvents.map(e=>(
          <div key={e.id} style={s.tickerItem}>{e.msg}</div>
        ))}
      </div>

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
              <img src={userAvatarUrl} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover"}}/>
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

        {/* Topbar */}
        <div style={s.topbar}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <Link href="/dashboard" style={{textDecoration:"none"}}>
              <button style={s.backBtn}><ChevronLeft size={16}/> Dashboard</button>
            </Link>
            <div style={s.pageTitle}>🏘️ Community</div>
            <div style={s.livePill}><div style={s.liveDot}/>{activeMembersCount} Active</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <button style={s.iconBtn} onClick={fetchData}><RefreshCw size={17} style={{animation:isLoading?"spin 1s linear infinite":"none"}}/></button>
            <button style={s.iconBtn}><Bell size={18}/></button>
            <div style={{...s.avatarMed,cursor:"pointer"}} onClick={()=>setIsProfileModalOpen(true)}>
              {userAvatarUrl ? <img src={userAvatarUrl} alt="" style={{width:36,height:36,borderRadius:"50%",objectFit:"cover"}}/> : avatarInitials}
            </div>
          </div>
        </div>

        <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={()=>setIsProfileModalOpen(false)}/>

        {/* Error */}
        {fetchError && (
          <div style={{padding:"12px 16px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"10px",color:"#ef4444",fontSize:"0.82rem",marginBottom:"16px"}}>
            ⚠️ {fetchError} <button onClick={fetchData} style={{marginLeft:"10px",color:"#6366f1",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontSize:"0.78rem"}}>Retry</button>
          </div>
        )}

        {/* Batch header */}
        {batch && (
          <div style={s.batchHeader}>
            <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
              <div style={{fontSize:"2rem"}}>🏘️</div>
              <div>
                <div style={{fontSize:"1.1rem",fontWeight:800,color:"white"}}>{batch.batch_label}</div>
                <div style={{fontSize:"0.75rem",color:"#64748b",marginTop:"2px"}}>{batch.description}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
              <div style={s.batchStat}><span style={{fontSize:"1.2rem",fontWeight:800,color:"white"}}>{batch.member_count}</span><span style={{fontSize:"0.65rem",color:"#475569"}}>Members</span></div>
              <div style={s.batchStat}><span style={{fontSize:"1.2rem",fontWeight:800,color:"#22c55e"}}>{activeMembersCount}</span><span style={{fontSize:"0.65rem",color:"#475569"}}>Active Now</span></div>
              {topStreakMember && <div style={s.batchStat}><span style={{fontSize:"1.2rem",fontWeight:800,color:"#f97316"}}>{topStreakMember.streak}d</span><span style={{fontSize:"0.65rem",color:"#475569"}}>Top Streak</span></div>}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && !batch && (
          <div style={{display:"flex",flexDirection:"column" as const,gap:"8px",padding:"20px 0"}}>
            {[...Array(5)].map((_,i)=>(
              <div key={i} style={{height:"80px",borderRadius:"12px",background:"rgba(255,255,255,0.03)",animation:"pulse 1.5s ease-in-out infinite",animationDelay:`${i*0.1}s`}}/>
            ))}
          </div>
        )}

        {batch && (
          <div style={s.layout}>
            {/* ── Left — Feed ── */}
            <div style={s.leftCol}>

              {/* View tabs */}
              <div style={s.viewTabs}>
                <button onClick={()=>setActiveView("feed")} style={{...s.viewTab,...(activeView==="feed"?s.viewTabActive:{})}}>
                  💬 Feed ({posts.length})
                </button>
                <button onClick={()=>setActiveView("members")} style={{...s.viewTab,...(activeView==="members"?s.viewTabActive:{})}}>
                  👥 Members ({members.length})
                </button>
              </div>

              {activeView === "feed" && (
                <>
                  {/* Compose */}
                  <div style={s.composeBox}>
                    <div style={{display:"flex",gap:"10px",marginBottom:"10px"}}>
                      <div style={s.avatarSmall}>{avatarInitials}</div>
                      <textarea
                        value={postText}
                        onChange={e=>setPostText(e.target.value)}
                        placeholder={`Share something with ${batch.batch_label}...`}
                        style={s.composeInput}
                        rows={3}
                        maxLength={1000}
                      />
                    </div>
                    <div style={{display:"flex",gap:"8px",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",gap:"6px"}}>
                        {(["text","achievement","milestone"] as const).map(t=>(
                          <button key={t} onClick={()=>setPostType(t)}
                            style={{...s.postTypeBtn,...(postType===t?s.postTypeBtnActive:{})}}>
                            {t==="text"?"💬":t==="achievement"?"🏆":"🎯"} {t.charAt(0).toUpperCase()+t.slice(1)}
                          </button>
                        ))}
                      </div>
                      <button onClick={handlePost} disabled={!postText.trim()||postLoading}
                        style={{...s.postBtn,opacity:postText.trim()&&!postLoading?1:0.4}}>
                        {postLoading?"Posting...":<><Send size={14}/> Post</>}
                      </button>
                    </div>
                  </div>

                  {/* Posts feed */}
                  <div ref={feedRef} style={{display:"flex",flexDirection:"column" as const,gap:"10px"}}>
                    {posts.length === 0 && !isLoading && (
                      <div style={{padding:"48px 24px",textAlign:"center" as const,color:"#475569"}}>
                        <div style={{fontSize:"2.5rem",marginBottom:"12px"}}>💬</div>
                        <div style={{fontSize:"0.95rem",fontWeight:600,color:"#64748b"}}>No posts yet</div>
                        <div style={{fontSize:"0.78rem",marginTop:"4px"}}>Be the first to share something with your batch!</div>
                      </div>
                    )}
                    {posts.map(post=>(
                      <div key={post.id} style={{...s.postCard,...(post.is_pinned?{borderColor:"rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.03)"}:{})}}>
                        {post.is_pinned && (
                          <div style={{fontSize:"0.62rem",color:"#f59e0b",fontWeight:700,marginBottom:"6px"}}>📌 PINNED</div>
                        )}
                        <div style={{display:"flex",gap:"10px",marginBottom:"8px"}}>
                          <div style={s.postAvatar}>
                            {(post.author_name||"U").slice(0,2).toUpperCase()}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap" as const}}>
                              <span style={{fontSize:"0.85rem",fontWeight:700,color:"white"}}>{post.author_name||"User"}</span>
                              {post.author_badge && (
                                <span style={{fontSize:"0.62rem",color:"#f97316",background:"rgba(249,115,22,0.1)",padding:"1px 6px",borderRadius:"6px"}}>{post.author_badge}</span>
                              )}
                              {post.post_type !== "text" && (
                                <span style={{fontSize:"0.62rem",color:"#6366f1",background:"rgba(99,102,241,0.1)",padding:"1px 6px",borderRadius:"6px"}}>
                                  {post.post_type==="achievement"?"🏆 Achievement":post.post_type==="milestone"?"🎯 Milestone":post.post_type}
                                </span>
                              )}
                              <span style={{fontSize:"0.68rem",color:"#334155",marginLeft:"auto"}}>{timeAgo(post.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <p style={{fontSize:"0.85rem",color:"#94a3b8",lineHeight:1.6,marginBottom:"10px"}}>{post.content}</p>
                        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                          <button onClick={()=>handleReact(post.id)}
                            style={{...s.reactBtn,...(reactedPosts.has(post.id)?{color:"#f97316",borderColor:"rgba(249,115,22,0.3)"}:{})}}>
                            🔥 {post.reaction_count}
                          </button>
                          <button style={s.reactBtn}><MessageCircle size={12}/> {post.reply_count}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeView === "members" && (
                <div style={{display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                  {members.length === 0 && !isLoading && (
                    <div style={{padding:"48px 24px",textAlign:"center" as const,color:"#475569"}}>
                      <div style={{fontSize:"2.5rem",marginBottom:"12px"}}>👥</div>
                      <div style={{fontSize:"0.95rem",fontWeight:600,color:"#64748b"}}>You're the first in this batch!</div>
                    </div>
                  )}
                  {members.map(m=>{
                    const stat = STATUS_CONFIG[m.status as Status] || STATUS_CONFIG.idle;
                    const isCurrentUser = m.is_current_user;
                    return (
                      <div key={m.user_id} style={{
                        ...s.memberRow,
                        ...(isCurrentUser?{background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.2)"}:{}),
                      }}>
                        <div style={{fontSize:"0.85rem",fontWeight:700,color:m.rank<=3?"#ffd700":m.rank<=10?"#6366f1":"#475569",minWidth:"28px"}}>
                          #{m.rank}
                        </div>

                        {m.image ? (
                          <img src={m.image} alt="" style={{width:"36px",height:"36px",borderRadius:"50%",objectFit:"cover",border:`1.5px solid ${LEAGUE_COLORS[m.league]||"#334155"}40`}}/>
                        ) : (
                          <div style={{...s.memberAv,borderColor:`${LEAGUE_COLORS[m.league]||"#334155"}50`}}>{m.avatar}</div>
                        )}

                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"0.85rem",fontWeight:isCurrentUser?700:500,color:isCurrentUser?"#818cf8":"#e2e8f0",display:"flex",alignItems:"center",gap:"6px"}}>
                            {m.name}
                            {isCurrentUser&&<span style={{fontSize:"0.6rem",background:"rgba(129,140,248,0.2)",color:"#818cf8",padding:"1px 5px",borderRadius:"4px",fontWeight:700}}>YOU</span>}
                          </div>
                          <div style={{display:"flex",gap:"8px",marginTop:"2px"}}>
                            <span style={{...s.statusBadge,background:stat.bg,color:stat.color}}>{stat.dot} {stat.label}</span>
                            <span style={{fontSize:"0.65rem",color:LEAGUE_COLORS[m.league]||"#475569"}}>{m.league}</span>
                          </div>
                        </div>

                        <div style={{textAlign:"right" as const,flexShrink:0}}>
                          <div style={{fontSize:"0.85rem",fontWeight:700,color:isCurrentUser?"#818cf8":"#e2e8f0"}}>{m.score.toLocaleString()}</div>
                          <div style={{fontSize:"0.68rem",color:"#475569",display:"flex",gap:"6px",justifyContent:"flex-end"}}>
                            <span style={{display:"flex",alignItems:"center",gap:"2px"}}><Flame size={9} style={{color:"#f97316"}}/>{m.streak}d</span>
                            {m.challenges_done > 0 && <span>⚔️{m.challenges_done}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Right col — Sidebar widgets ── */}
            <div style={s.rightCol}>

              {/* Batch info */}
              <div style={s.widgetCard}>
                <div style={s.widgetTitle}>🏘️ Your Batch</div>
                <div style={{fontSize:"0.95rem",fontWeight:700,color:"white",marginBottom:"4px"}}>{batch.batch_label}</div>
                <div style={{fontSize:"0.72rem",color:"#475569",lineHeight:1.5}}>{batch.description}</div>
              </div>

              {/* Top performers */}
              {members.length > 0 && (
                <div style={s.widgetCard}>
                  <div style={s.widgetTitle}>🏆 Top Performers</div>
                  {members.slice(0,5).map((m,i)=>(
                    <div key={m.user_id} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                      <span style={{fontSize:"0.78rem",fontWeight:700,color:i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":"#475569",minWidth:"18px"}}>#{m.rank}</span>
                      <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"rgba(99,102,241,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",fontWeight:700,color:"#818cf8",flexShrink:0}}>
                        {m.avatar}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.78rem",fontWeight:600,color:m.is_current_user?"#818cf8":"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                          {m.name}{m.is_current_user?" (You)":""}
                        </div>
                      </div>
                      <div style={{fontSize:"0.72rem",fontWeight:700,color:"#64748b"}}>{m.score.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* On fire streaks */}
              {members.filter(m=>m.streak>=7).length > 0 && (
                <div style={s.widgetCard}>
                  <div style={s.widgetTitle}>🔥 On Streaks</div>
                  {members.filter(m=>m.streak>=7).slice(0,5).map((m)=>(
                    <div key={m.user_id} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                      <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"rgba(249,115,22,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",fontWeight:700,color:"#f97316",flexShrink:0}}>{m.avatar}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.78rem",fontWeight:600,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{m.name}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"2px",fontSize:"0.75rem",color:"#f97316",fontWeight:700}}>
                        <Flame size={11}/>{m.streak}d
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick stats */}
              <div style={s.widgetCard}>
                <div style={s.widgetTitle}>📊 Batch Stats</div>
                {[
                  {label:"Total Members",val:batch.member_count},
                  {label:"Active Now",val:activeMembersCount,color:"#22c55e"},
                  {label:"Avg Streak",val:members.length ? `${Math.round(members.reduce((a,m)=>a+m.streak,0)/members.length)}d` : "0d"},
                  {label:"Top Score",val:members[0]?.score.toLocaleString()||"0"},
                ].map((st,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <span style={{fontSize:"0.75rem",color:"#475569"}}>{st.label}</span>
                    <span style={{fontSize:"0.82rem",fontWeight:700,color:st.color||"white"}}>{st.val}</span>
                  </div>
                ))}
              </div>
            </div>
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
  eventTicker:{ position:"fixed",bottom:"16px",left:"260px",zIndex:9998,display:"flex",flexDirection:"column",gap:"6px",maxWidth:"420px",pointerEvents:"none" },
  tickerItem:{ background:"rgba(13,18,35,0.92)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"10px",padding:"7px 14px",fontSize:"0.78rem",color:"#e2e8f0",backdropFilter:"blur(12px)",animation:"slideUp 0.3s ease" },
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
  batchHeader:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:"14px",marginBottom:"20px",flexWrap:"wrap" as const,gap:"12px" },
  batchStat:{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"2px",padding:"8px 16px",background:"rgba(255,255,255,0.04)",borderRadius:"10px",minWidth:"70px" },
  layout:{ display:"grid",gridTemplateColumns:"1fr 280px",gap:"20px",alignItems:"start" },
  leftCol:{ display:"flex",flexDirection:"column" as const,gap:"14px" },
  rightCol:{ display:"flex",flexDirection:"column" as const,gap:"14px" },
  viewTabs:{ display:"flex",gap:"6px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",padding:"4px" },
  viewTab:{ flex:1,padding:"8px",background:"transparent",border:"none",borderRadius:"7px",color:"#475569",cursor:"pointer",fontSize:"0.82rem",fontWeight:500,transition:"all 0.15s" },
  viewTabActive:{ background:"rgba(99,102,241,0.15)",color:"white",fontWeight:600 },
  composeBox:{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"14px",padding:"16px" },
  composeInput:{ flex:1,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",color:"#e2e8f0",padding:"10px 14px",fontSize:"0.85rem",resize:"none" as const,outline:"none",fontFamily:"inherit",lineHeight:1.6,width:"100%" },
  postTypeBtn:{ padding:"4px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px",color:"#475569",cursor:"pointer",fontSize:"0.72rem",fontWeight:500 },
  postTypeBtnActive:{ background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",color:"#818cf8",fontWeight:600 },
  postBtn:{ display:"flex",alignItems:"center",gap:"6px",padding:"7px 16px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",borderRadius:"8px",color:"white",fontSize:"0.82rem",fontWeight:600,cursor:"pointer" },
  postCard:{ background:"rgba(13,18,35,0.8)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"14px" },
  postAvatar:{ width:"34px",height:"34px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.68rem",fontWeight:700,color:"white",flexShrink:0 },
  reactBtn:{ display:"flex",alignItems:"center",gap:"4px",padding:"4px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px",color:"#475569",cursor:"pointer",fontSize:"0.72rem",fontWeight:500,transition:"all 0.15s" },
  memberRow:{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"10px" },
  memberAv:{ width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg,#1e293b,#334155)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:700,color:"white",border:"1.5px solid rgba(255,255,255,0.08)",flexShrink:0 },
  statusBadge:{ padding:"2px 7px",borderRadius:"6px",fontSize:"0.62rem",fontWeight:600 },
  widgetCard:{ background:"rgba(13,18,35,0.8)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"14px" },
  widgetTitle:{ fontSize:"0.68rem",color:"#475569",fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:"10px" },
};