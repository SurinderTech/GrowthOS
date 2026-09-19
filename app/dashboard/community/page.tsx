"use client";
// app/dashboard/community/page.tsx
// GrowthOS — Batch Community + Friends System
// Same-batch users always visible. Friends tab shows accepted friends with presence.

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Play, BarChart2, Trophy,
  Users, Settings, LogOut, Send, RefreshCw, Flame,
  UserPlus, UserCheck, Heart, MessageCircle, ChevronLeft,
  Star, Swords, Circle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import BrandLogo from "@/components/ui/BrandLogo";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const NAV = [
  { icon: <LayoutDashboard size={18}/>, label:"Dashboard",     href:"/dashboard" },
  { icon: <Play size={18}/>,            label:"Practice Arena", href:"/dashboard/practice" },
  { icon: <BarChart2 size={18}/>,       label:"Leaderboard",   href:"/dashboard/leaderboard" },
  { icon: <Trophy size={18}/>,          label:"Challenges",    href:"/dashboard/challenges" },
  { icon: <Users size={18}/>,           label:"Community",     href:"/dashboard/community", active:true },
  { icon: <Settings size={18}/>,        label:"Settings",      href:"/dashboard/settings" },
];

const LEAGUE_COLORS: Record<string,string> = {
  Bronze:"#cd7f32", Silver:"#c0c0c0", Gold:"#ffd700", Elite:"#a855f7", Silicon:"#22c55e",
};

type ActiveView = "feed"|"members"|"friends";

interface Member {
  user_id: string;
  name: string;
  avatar: string;
  image?: string;
  score: number;
  streak: number;
  rank: number;
  league: string;
  status: string;
  is_current_user: boolean;
  challenges_done: number;
}

interface Friend {
  user_id: string;
  name: string;
  avatar: string;
  image?: string;
  presence_status: "online"|"in_battle"|"offline";
  last_seen_at?: string;
  current_battle_id?: string;
}

interface PendingRequest {
  request_id: string;
  user_id: string;
  name: string;
  image?: string;
  avatar: string;
  created_at?: string;
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

function PresenceDot({ status }: { status: string }) {
  const cfg: Record<string,{color:string;label:string;icon:string}> = {
    online:    { color:"#22c55e", label:"Online",    icon:"●" },
    in_battle: { color:"#f59e0b", label:"In Battle", icon:"⚔" },
    offline:   { color:"#475569", label:"Offline",   icon:"○" },
  };
  const c = cfg[status] || cfg.offline;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:c.color,fontWeight:600}}>
      <span style={{
        width:7,height:7,borderRadius:"50%",
        background:c.color,
        boxShadow:status==="online"?`0 0 8px ${c.color}`:undefined,
      }}/>
      {c.label}
    </span>
  );
}

function PostTypeIcon({ t }: { t: string }) {
  if (t === "achievement") return <span style={{fontSize:14}}>🏆</span>;
  if (t === "milestone")   return <span style={{fontSize:14}}>🎯</span>;
  if (t === "challenge")   return <span style={{fontSize:14}}>⚡</span>;
  return <span style={{fontSize:14}}>💬</span>;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)  return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function CommunityPage() {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rawName = (user as any)?.full_name || (user as any)?.name || "";
  const currentUser = mounted ? (rawName.includes("@") ? rawName.split("@")[0] : rawName) || "User" : "User";
  const avatarInitials = mounted && currentUser !== "User" ? currentUser.slice(0,2).toUpperCase() : "US";
  const userAvatarUrl = (user as any)?.avatar_url || (user as any)?.image || null;

  const [loaded, setLoaded] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts]     = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<PendingRequest[]>([]);
  const [batch, setBatch]     = useState<BatchInfo|null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(false);
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState<"text"|"achievement"|"milestone">("text");
  const [activeView, setActiveView] = useState<ActiveView>("feed");
  const [reactedPosts, setReactedPosts] = useState<Set<string>>(new Set());
  const [friendActionStates, setFriendActionStates] = useState<Record<string,string>>({});

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setTimeout(()=>setLoaded(true),80); }, []);

  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const [batchRes, membersRes, feedRes] = await Promise.all([
        fetch(`${API}/community/batch`,   { headers:{Authorization:`Bearer ${token}`} }),
        fetch(`${API}/community/members`, { headers:{Authorization:`Bearer ${token}`} }),
        fetch(`${API}/community/feed`,    { headers:{Authorization:`Bearer ${token}`} }),
      ]);
      if (batchRes.ok)   setBatch(await batchRes.json());
      if (membersRes.ok) setMembers((await membersRes.json()).members || []);
      if (feedRes.ok)    setPosts((await feedRes.json()).posts || []);
    } catch {}
    setIsLoading(false);
  }, []);

  const fetchSocial = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const [friendsRes, incomingRes] = await Promise.all([
      fetch(`${API}/social/friends`, { headers:{Authorization:`Bearer ${token}`} }),
      fetch(`${API}/social/friend-requests/incoming`, { headers:{Authorization:`Bearer ${token}`} }),
    ]);
    if (friendsRes.ok)  setFriends((await friendsRes.json()).friends || []);
    if (incomingRes.ok) setIncoming((await incomingRes.json()).requests || []);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchData();
    fetchSocial();
    const iv = setInterval(() => { fetchData(); fetchSocial(); }, 30000);
    return () => clearInterval(iv);
  }, [mounted, fetchData, fetchSocial]);

  // Heartbeat
  useEffect(() => {
    if (!mounted) return;
    const token = getToken();
    if (!token) return;
    const hb = () => fetch(`${API}/social/presence/heartbeat`, {
      method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({})
    }).catch(()=>{});
    hb();
    const iv = setInterval(hb, 30000);
    return () => clearInterval(iv);
  }, [mounted]);

  const submitPost = async () => {
    const token = getToken();
    if (!token || !postText.trim() || postLoading) return;
    setPostLoading(true);
    try {
      const res = await fetch(`${API}/community/post`, {
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({content:postText.trim(),post_type:postType}),
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts(prev => [newPost, ...prev]);
        setPostText("");
      }
    } catch {}
    setPostLoading(false);
  };

  const reactToPost = async (postId: string) => {
    const token = getToken();
    if (!token) return;
    const wasReacted = reactedPosts.has(postId);
    setReactedPosts(prev => {
      const n = new Set(prev);
      wasReacted ? n.delete(postId) : n.add(postId);
      return n;
    });
    setPosts(prev => prev.map(p => p.id === postId
      ? {...p, reaction_count: p.reaction_count + (wasReacted ? -1 : 1)}
      : p
    ));
    fetch(`${API}/community/post/${postId}/react`, {
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({emoji:"🔥"}),
    }).catch(()=>{});
  };

  const sendFriendRequest = async (userId: string) => {
    const token = getToken();
    if (!token) return;
    setFriendActionStates(prev => ({...prev, [userId]: "loading"}));
    try {
      const res = await fetch(`${API}/social/friend-request`, {
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({addressee_id:userId}),
      });
      if (res.ok) {
        const data = await res.json();
        setFriendActionStates(prev => ({...prev, [userId]: data.status || "pending"}));
        fetchSocial();
      }
    } catch {
      setFriendActionStates(prev => ({...prev, [userId]: "error"}));
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    const token = getToken();
    if (!token) return;
    await fetch(`${API}/social/friend-request/${requestId}/respond`, {
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({accept}),
    });
    fetchSocial();
  };

  const lc = "#6366f1";
  const incomingCount = incoming.length;

  return (
    <div style={{
      minHeight:"100vh",background:"#020817",color:"#f1f5f9",
      fontFamily:"'Inter',sans-serif",
      opacity:loaded?1:0,transition:"opacity 0.4s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:4px}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
      `}</style>

      {isProfileModalOpen && <ProfileSettingsModal onClose={() => setIsProfileModalOpen(false)} />}

      <div style={{display:"flex",minHeight:"100vh"}}>
        {/* Sidebar */}
        <aside style={{
          width:220,flexShrink:0,borderRight:"1px solid rgba(255,255,255,0.06)",
          background:"rgba(2,8,23,0.95)",backdropFilter:"blur(20px)",
          display:"flex",flexDirection:"column",
          position:"sticky",top:0,height:"100vh",
        }}>
          <div style={{padding:"20px 16px 0"}}><BrandLogo/></div>
          <nav style={{flex:1,padding:"16px 8px",display:"flex",flexDirection:"column",gap:4}}>
            {NAV.map(item => (
              <Link key={item.href} href={item.href} style={{
                display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,
                color:item.active?"#f1f5f9":"#64748b",
                background:item.active?"rgba(99,102,241,0.15)":"transparent",
                textDecoration:"none",fontSize:14,fontWeight:item.active?600:400,transition:"all 0.15s",
              }}>{item.icon}{item.label}</Link>
            ))}
          </nav>
          <div style={{padding:"12px 8px 20px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <button onClick={() => setIsProfileModalOpen(true)} style={{
              display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
              borderRadius:10,background:"transparent",border:"none",cursor:"pointer",width:"100%",
            }}>
              <div style={{width:30,height:30,borderRadius:"50%",overflow:"hidden",background:"linear-gradient(135deg,#6366f1,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {userAvatarUrl?<img src={userAvatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{avatarInitials}</span>}
              </div>
              <span style={{fontSize:13,color:"#94a3b8",flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentUser}</span>
            </button>
            <button onClick={logout} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,background:"transparent",border:"none",cursor:"pointer",width:"100%",color:"#64748b",fontSize:13}}>
              <LogOut size={16}/>Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{flex:1,overflowY:"auto",maxHeight:"100vh"}}>
          <div style={{maxWidth:780,margin:"0 auto",padding:"24px 20px"}}>

            {/* Header */}
            <div style={{marginBottom:20}}>
              <Link href="/dashboard" style={{display:"inline-flex",alignItems:"center",gap:6,color:"#64748b",fontSize:13,textDecoration:"none",marginBottom:12}}>
                <ChevronLeft size={14}/>Dashboard
              </Link>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                <div>
                  <h1 style={{margin:0,fontSize:26,fontWeight:900,letterSpacing:-0.5}}>👥 Community</h1>
                  {batch && (
                    <p style={{margin:"4px 0 0",color:"#64748b",fontSize:14}}>
                      {batch.batch_label} · {batch.member_count.toLocaleString()} members
                    </p>
                  )}
                </div>
                <button onClick={()=>{fetchData();fetchSocial();}} style={{
                  display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
                  borderRadius:8,background:"rgba(255,255,255,0.06)",border:"none",
                  cursor:"pointer",color:"#94a3b8",fontSize:13,
                }}>
                  <RefreshCw size={14}/>Refresh
                </button>
              </div>
            </div>

            {/* View Tabs */}
            <div style={{
              display:"flex",gap:4,padding:4,
              background:"rgba(255,255,255,0.04)",borderRadius:14,marginBottom:20,
            }}>
              {([
                { key:"feed",    label:"Feed",    icon:<MessageCircle size={14}/> },
                { key:"members", label:"My Batch", icon:<Users size={14}/> },
                { key:"friends", label:`Friends${incomingCount>0?` (${incomingCount})`:""}`, icon:<UserCheck size={14}/> },
              ] as const).map(v => (
                <button key={v.key} onClick={()=>setActiveView(v.key)} style={{
                  flex:1,padding:"9px 6px",borderRadius:10,border:"none",
                  background:activeView===v.key?"rgba(99,102,241,0.25)":"transparent",
                  color:activeView===v.key?"#f1f5f9":"#64748b",
                  fontWeight:activeView===v.key?700:400,
                  fontSize:13,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                  transition:"all 0.2s",
                }}>
                  {v.icon}{v.label}
                  {v.key==="friends"&&incomingCount>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:99,fontSize:10,padding:"1px 5px",fontWeight:700}}>{incomingCount}</span>}
                </button>
              ))}
            </div>

            {/* ── FEED ─────────────────────────────────────────────────────── */}
            {activeView === "feed" && (
              <div style={{animation:"slideUp 0.3s ease"}}>
                {/* Compose */}
                <div style={{
                  background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:16,padding:16,marginBottom:20,
                }}>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    {(["text","achievement","milestone"] as const).map(t => (
                      <button key={t} onClick={()=>setPostType(t)} style={{
                        padding:"5px 12px",borderRadius:8,border:"none",
                        background:postType===t?"rgba(99,102,241,0.25)":"rgba(255,255,255,0.05)",
                        color:postType===t?"#f1f5f9":"#64748b",
                        fontSize:12,cursor:"pointer",fontWeight:postType===t?700:400,
                      }}>
                        {t==="text"?"💬 Post":t==="achievement"?"🏆 Achievement":"🎯 Milestone"}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={postText}
                    onChange={e=>setPostText(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)submitPost();}}
                    placeholder={
                      postType==="achievement"?"Share an achievement with your batch…"
                      :postType==="milestone"?"Share a milestone…"
                      :"Share a thought, tip, or update…"
                    }
                    maxLength={1000}
                    style={{
                      width:"100%",minHeight:80,background:"rgba(255,255,255,0.05)",
                      border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,
                      padding:12,color:"#f1f5f9",fontSize:14,resize:"vertical",
                      outline:"none",boxSizing:"border-box",fontFamily:"'Inter',sans-serif",
                    }}
                  />
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10}}>
                    <span style={{fontSize:12,color:"#475569"}}>{postText.length}/1000 · Ctrl+Enter to post</span>
                    <button
                      onClick={submitPost}
                      disabled={!postText.trim()||postLoading}
                      style={{
                        display:"flex",alignItems:"center",gap:6,padding:"8px 18px",
                        borderRadius:8,background:postText.trim()?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.2)",
                        border:"none",color:"#fff",fontWeight:700,fontSize:13,
                        cursor:postText.trim()?"pointer":"not-allowed",
                        opacity:postLoading?0.7:1,
                      }}
                    >
                      <Send size={14}/>{postLoading?"Posting…":"Post"}
                    </button>
                  </div>
                </div>

                {/* Posts */}
                {isLoading ? (
                  Array.from({length:3}).map((_,i)=>(
                    <div key={i} style={{height:100,borderRadius:14,marginBottom:10,background:"rgba(255,255,255,0.04)",animation:"pulse 1.5s infinite"}}/>
                  ))
                ) : posts.length === 0 ? (
                  <div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}>
                    <div style={{fontSize:36,marginBottom:12}}>💬</div>
                    <div style={{fontWeight:600,fontSize:15,color:"#64748b"}}>No posts yet</div>
                    <div style={{fontSize:13,color:"#475569",marginTop:6}}>Be the first to post in your batch!</div>
                  </div>
                ) : posts.map(p => (
                  <div key={p.id} style={{
                    background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:14,padding:16,marginBottom:10,
                    animation:"slideUp 0.3s ease",
                    ...(p.is_pinned ? {borderColor:"rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.05)"} : {}),
                  }}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                      <div style={{
                        width:36,height:36,borderRadius:"50%",flexShrink:0,
                        background:"linear-gradient(135deg,#6366f1,#a855f7)",
                        display:"flex",alignItems:"center",justifyContent:"center",
                      }}>
                        <span style={{fontSize:12,fontWeight:800,color:"#fff"}}>
                          {p.author_name?.slice(0,2).toUpperCase()||"US"}
                        </span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{fontWeight:700,fontSize:14,color:"#f1f5f9"}}>{p.author_name}</span>
                          {p.author_badge && <span style={{fontSize:11,color:"#f97316",background:"rgba(249,115,22,0.1)",padding:"1px 6px",borderRadius:99}}>{p.author_badge}</span>}
                          <PostTypeIcon t={p.post_type}/>
                          {p.is_pinned && <span style={{fontSize:10,color:"#6366f1",background:"rgba(99,102,241,0.15)",padding:"1px 6px",borderRadius:99}}>📌 Pinned</span>}
                          <span style={{fontSize:11,color:"#475569",marginLeft:"auto"}}>{timeAgo(p.created_at)}</span>
                        </div>
                        <p style={{margin:0,fontSize:14,color:"#cbd5e1",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{p.content}</p>
                        <div style={{display:"flex",gap:12,marginTop:10}}>
                          <button onClick={()=>reactToPost(p.id)} style={{
                            display:"flex",alignItems:"center",gap:5,
                            background:"transparent",border:"none",cursor:"pointer",
                            color:reactedPosts.has(p.id)?"#f97316":"#64748b",fontSize:13,padding:"4px 8px",borderRadius:6,
                            transition:"all 0.15s",
                          }}>
                            🔥 {p.reaction_count}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── MEMBERS (MY BATCH) ──────────────────────────────────────── */}
            {activeView === "members" && (
              <div style={{animation:"slideUp 0.3s ease"}}>
                {batch && (
                  <div style={{
                    background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",
                    borderRadius:14,padding:"14px 18px",marginBottom:16,
                  }}>
                    <div style={{fontWeight:700,color:"#f1f5f9",fontSize:15}}>{batch.batch_label}</div>
                    <div style={{color:"#94a3b8",fontSize:13,marginTop:4}}>{batch.description}</div>
                    <div style={{fontSize:12,color:"#6366f1",marginTop:6,fontWeight:600}}>
                      {batch.member_count.toLocaleString()} members in your cohort
                    </div>
                  </div>
                )}

                {isLoading ? (
                  Array.from({length:8}).map((_,i)=>(
                    <div key={i} style={{height:64,borderRadius:12,marginBottom:8,background:"rgba(255,255,255,0.04)",animation:"pulse 1.5s infinite"}}/>
                  ))
                ) : members.length === 0 ? (
                  <div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}>
                    No members in your batch yet.
                  </div>
                ) : members.map(m => {
                  const lc2 = LEAGUE_COLORS[m.league] || "#475569";
                  const friendState = friendActionStates[m.user_id];
                  return (
                    <div key={m.user_id} style={{
                      display:"flex",alignItems:"center",gap:12,
                      padding:"12px 14px",borderRadius:12,marginBottom:8,
                      background:m.is_current_user?"rgba(99,102,241,0.1)":"rgba(255,255,255,0.02)",
                      border:`1px solid ${m.is_current_user?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.07)"}`,
                      transition:"background 0.15s",
                    }}>
                      {/* Rank */}
                      <div style={{width:28,textAlign:"center",fontWeight:700,color:"#94a3b8",fontSize:13,flexShrink:0}}>
                        #{m.rank}
                      </div>
                      {/* Avatar */}
                      <div style={{
                        width:40,height:40,borderRadius:"50%",flexShrink:0,
                        background:`rgba(${lc2},0.1)`,border:`2px solid ${lc2}`,
                        display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",
                      }}>
                        {m.image?<img src={m.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          :<span style={{fontSize:13,fontWeight:800,color:lc2}}>{m.avatar}</span>}
                      </div>
                      {/* Info */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontWeight:600,color:"#f1f5f9",fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {m.name}
                          </span>
                          {m.is_current_user&&<span style={{fontSize:10,color:"#6366f1",background:"rgba(99,102,241,0.2)",padding:"1px 6px",borderRadius:99,fontWeight:700}}>YOU</span>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
                          {m.streak>0&&<span style={{fontSize:11,color:"#f97316"}}>🔥 {m.streak}d</span>}
                          <span style={{fontSize:11,color:"#64748b",fontWeight:600,color:lc2}}>{m.score.toLocaleString()} pts</span>
                          <span style={{fontSize:11,color:"#475569"}}>{m.league}</span>
                        </div>
                      </div>
                      {/* Add friend button (only for non-self, non-friend) */}
                      {!m.is_current_user && (
                        <button
                          onClick={()=>sendFriendRequest(m.user_id)}
                          disabled={friendState==="loading"||friendState==="accepted"||friendState==="pending"}
                          style={{
                            display:"flex",alignItems:"center",gap:5,padding:"6px 12px",
                            borderRadius:8,border:"none",cursor:
                              friendState==="accepted"||friendState==="pending"?"default":"pointer",
                            fontSize:12,fontWeight:700,flexShrink:0,
                            background:
                              friendState==="accepted"?"rgba(34,197,94,0.15)":
                              friendState==="pending"?"rgba(148,163,184,0.1)":
                              "rgba(99,102,241,0.15)",
                            color:
                              friendState==="accepted"?"#22c55e":
                              friendState==="pending"?"#94a3b8":
                              "#6366f1",
                            transition:"all 0.15s",
                          }}
                        >
                          {friendState==="accepted"?<><UserCheck size={13}/>Friends</>:
                           friendState==="pending"?<>⏳ Sent</>:
                           friendState==="loading"?<>…</>:
                           <><UserPlus size={13}/>Add</>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── FRIENDS ─────────────────────────────────────────────────── */}
            {activeView === "friends" && (
              <div style={{animation:"slideUp 0.3s ease"}}>
                {/* Incoming requests */}
                {incoming.length > 0 && (
                  <div style={{marginBottom:20}}>
                    <div style={{
                      fontSize:12,color:"#ef4444",fontWeight:700,letterSpacing:1,marginBottom:10,
                      display:"flex",alignItems:"center",gap:6,
                    }}>
                      <span style={{background:"#ef4444",color:"#fff",borderRadius:99,fontSize:10,padding:"1px 6px"}}>{incoming.length}</span>
                      FRIEND REQUESTS
                    </div>
                    {incoming.map(req => (
                      <div key={req.request_id} style={{
                        display:"flex",alignItems:"center",gap:12,
                        padding:"12px 14px",borderRadius:12,marginBottom:8,
                        background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",
                      }}>
                        <div style={{
                          width:40,height:40,borderRadius:"50%",
                          background:"linear-gradient(135deg,#6366f1,#a855f7)",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          flexShrink:0,overflow:"hidden",
                        }}>
                          {req.image?<img src={req.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            :<span style={{fontSize:13,fontWeight:800,color:"#fff"}}>{req.avatar}</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,color:"#f1f5f9",fontSize:14}}>{req.name}</div>
                          <div style={{fontSize:12,color:"#64748b"}}>wants to be your friend</div>
                        </div>
                        <div style={{display:"flex",gap:8,flexShrink:0}}>
                          <button onClick={()=>respondToRequest(req.request_id,true)} style={{
                            padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",
                            background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",fontSize:12,fontWeight:700,
                          }}>Accept</button>
                          <button onClick={()=>respondToRequest(req.request_id,false)} style={{
                            padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",
                            background:"rgba(148,163,184,0.1)",color:"#94a3b8",fontSize:12,fontWeight:600,
                          }}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Friends list */}
                <div style={{fontSize:12,color:"#64748b",fontWeight:700,letterSpacing:1,marginBottom:10}}>
                  YOUR FRIENDS ({friends.length})
                </div>
                {friends.length === 0 ? (
                  <div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}>
                    <div style={{fontSize:36,marginBottom:12}}>👾</div>
                    <div style={{fontWeight:600,fontSize:15,color:"#64748b"}}>No friends yet</div>
                    <div style={{fontSize:13,color:"#475569",marginTop:6}}>Go to My Batch, click Add on someone, and wait for them to accept!</div>
                    <button onClick={()=>setActiveView("members")} style={{
                      marginTop:16,padding:"10px 24px",borderRadius:10,
                      background:"linear-gradient(135deg,#6366f1,#a855f7)",
                      border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
                    }}>
                      Browse My Batch
                    </button>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {friends.map(f => (
                      <div key={f.user_id} style={{
                        display:"flex",alignItems:"center",gap:12,
                        padding:"12px 14px",borderRadius:12,
                        background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",
                        transition:"background 0.15s",cursor:"pointer",
                      }}
                        onClick={()=>{
                          // open profile
                          const token=getToken();
                          if(!token)return;
                          fetch(`${API}/leaderboard/profile/${f.user_id}`,{headers:{Authorization:`Bearer ${token}`}})
                            .then(r=>r.json()).then(data=>{/* handle in parent — for now just navigate */});
                        }}
                      >
                        <div style={{position:"relative",flexShrink:0}}>
                          <div style={{
                            width:44,height:44,borderRadius:"50%",
                            background:"linear-gradient(135deg,#6366f1,#a855f7)",
                            display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",
                          }}>
                            {f.image?<img src={f.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                              :<span style={{fontSize:14,fontWeight:800,color:"#fff"}}>{f.avatar}</span>}
                          </div>
                          {/* Status dot */}
                          <div style={{
                            position:"absolute",bottom:0,right:0,
                            width:12,height:12,borderRadius:"50%",
                            background:f.presence_status==="online"?"#22c55e":f.presence_status==="in_battle"?"#f59e0b":"#475569",
                            border:"2px solid #020817",
                            boxShadow:f.presence_status==="online"?"0 0 8px #22c55e":undefined,
                          }}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,color:"#f1f5f9",fontSize:14}}>{f.name}</div>
                          <PresenceDot status={f.presence_status}/>
                        </div>
                        {f.presence_status==="in_battle"&&(
                          <span style={{
                            display:"flex",alignItems:"center",gap:4,
                            fontSize:11,color:"#f59e0b",
                            background:"rgba(245,158,11,0.1)",borderRadius:8,padding:"4px 8px",fontWeight:700,
                          }}>
                            <Swords size={12}/>In Battle
                          </span>
                        )}
                        {f.presence_status==="online"&&(
                          <span style={{fontSize:11,color:"#22c55e",background:"rgba(34,197,94,0.1)",borderRadius:8,padding:"4px 8px",fontWeight:700}}>
                            Online
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{height:48}}/>
          </div>
        </main>
      </div>
    </div>
  );
}