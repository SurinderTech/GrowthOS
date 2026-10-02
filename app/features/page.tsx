"use client";
// app/features/page.tsx — GrowthOS Features Page

import { useState } from "react";
import Link from "next/link";

const AGENTS = [
  { num:"01", name:"Nova AI Assistant", icon:"✦", color:"#00e5ff", glow:"rgba(0,229,255,0.15)", tag:"CORE INTELLIGENCE", headline:"Your always-on AI growth co-pilot", desc:"Nova is the brain of GrowthOS. It analyzes your goals, tracks your progress daily, adapts your plan in real-time, and gives you proactive nudges before you even realize you need them. Nova does not just respond — it thinks ahead.", bullets:["Real-time goal analysis & daily task generation","Proactive insights — Nova alerts you before you fall behind","Voice & text interface — ask anything about your growth","Memory layer — Nova remembers everything you have told it","Adaptive learning — gets smarter the more you use it"], demo:["Analyzing your goal: Crack GATE 2025 ✓","Found 3 weak topics: DBMS, OS, CN","Scheduled 4 Pomodoro sessions for today","Predicted rank improvement: +42 positions this week 📈"] },
  { num:"02", name:"Learning Agent", icon:"🧠", color:"#22d3ee", glow:"rgba(34,211,238,0.15)", tag:"ADAPTIVE LEARNING", headline:"Learns how you learn, then teaches you better", desc:"The Learning Agent observes your study patterns, identifies your peak focus hours, detects weak areas, and generates a hyper-personalized curriculum. It adapts daily — not weekly, not monthly, daily.", bullets:["Identifies your learning style (visual, auditory, kinesthetic)","Maps your knowledge gaps with precision","Generates personalized practice problems","Schedules spaced repetition for long-term retention","Adapts pace to your schedule and energy levels"], demo:["Analyzing study sessions from last 14 days...","Peak focus window detected: 9–11 AM","Weak areas: Binary Trees, Graph Algorithms","Generated 12 targeted practice problems ✓"] },
  { num:"03", name:"Career Agent", icon:"🎯", color:"#ec4899", glow:"rgba(236,72,153,0.15)", tag:"CAREER NAVIGATION", headline:"Opens doors you did not know existed", desc:"The Career Agent scans thousands of opportunities, matches them to your exact skill set and goals, identifies skill gaps, and builds you a clear path to your dream role. It works while you sleep.", bullets:["Real-time job & internship opportunity matching","Skill gap analysis vs. target roles","Resume & portfolio optimization feedback","Industry trend monitoring & alerts","Interview preparation roadmaps"], demo:["Found 23 matching opportunities for your profile","Skill gap detected: System Design","Recommended: 3 projects to close skill gap","Interview prep roadmap generated ✓"] },
  { num:"04", name:"Execution Agent", icon:"⚡", color:"#f59e0b", glow:"rgba(245,158,11,0.15)", tag:"DAILY EXECUTION", headline:"Keeps you locked in and focused every single day", desc:"The Execution Agent converts your big goals into atomic daily tasks. It runs Pomodoro sessions, eliminates bottlenecks, blocks distractions, and ensures you actually finish what you start — every day.", bullets:["Breaks goals into atomic daily tasks automatically","Pomodoro & deep work session management","Daily, weekly, and monthly execution reports","Bottleneck detection — finds why you are stuck","Accountability streaks with streak multipliers"], demo:["Today plan: 6 tasks generated","Deep work block: 2h 30min scheduled","Streak: 14 days 🔥","Completion rate this week: 87% ↑"] },
  { num:"05", name:"Resource Agent", icon:"🔍", color:"#10b981", glow:"rgba(16,185,129,0.15)", tag:"SMART RESOURCES", headline:"Finds the best resources so you do not have to", desc:"The Resource Agent searches, curates, and organizes the highest-quality study materials, tutorials, and references for your specific goals — filtering out noise so you only consume what actually moves the needle.", bullets:["Searches across YouTube, docs, papers, and courses","Quality-ranks resources by community feedback + AI","Auto-organizes into your personal resource library","Sends topic-specific resource drops daily","Tracks which resources actually improved your performance"], demo:["Searching best DBMS resources... ✓","Found 7 high-yield practice sets","Organized into your library ✓","Top pick: CMU Database Systems (2024) 📚"] },
  { num:"06", name:"Progress Agent", icon:"📊", color:"#8b5cf6", glow:"rgba(139,92,246,0.15)", tag:"ANALYTICS & INSIGHTS", headline:"Turns your data into decisions", desc:"The Progress Agent tracks every task, streak, score, and session. It computes your growth velocity, compares you to peers on the leaderboard, and generates predictive insights so you always know where you are headed.", bullets:["Real-time XP, streak, and rank tracking","Growth velocity calculation & trend graphs","Peer comparison on global leaderboards","Predictive rank forecasting (7-day & 30-day)","Weekly growth reports delivered automatically"], demo:["Current XP: 4,820 up 340 this week","Rank: #127 globally (+42 this week)","Completion velocity: 87%","Projected rank in 30 days: Top 50 🏆"] },
  { num:"07", name:"Memory Agent", icon:"🔄", color:"#6366f1", glow:"rgba(99,102,241,0.15)", tag:"LONG-TERM RETENTION", headline:"Locks knowledge into your long-term memory", desc:"The Memory Agent schedules spaced repetition reviews, detects which concepts you are forgetting, and brings them back at exactly the right time — so nothing you learn ever disappears.", bullets:["Spaced repetition scheduling (SM-2 algorithm)","Detects concept decay before you forget","Flashcard generation from your notes","Review reminders at optimal intervals","Retention rate tracking per topic"], demo:["12 cards due for review today","Weak concept: TCP/IP Handshake","Scheduled review: Tomorrow 9 AM","Retention rate: 91% (+4% this week) ✓"] },
  { num:"08", name:"Community Agent", icon:"🌐", color:"#d946ef", glow:"rgba(217,70,239,0.15)", tag:"COMMUNITY & NETWORK", headline:"Connects you with your growth tribe", desc:"The Community Agent matches you with peers at your exact level, finds accountability partners, surfaces study groups, and celebrates your milestones with your tribe — because growth is faster together.", bullets:["Peer matching based on goals & progress level","Accountability partner system","Study group discovery and management","Milestone celebration and community feeds","Mentorship matching for advanced users"], demo:["Matched with 3 accountability partners ✓","Study group found: 8 members (GATE prep)","Your milestone shared with community 🎉","Mentor match: Aarav S. (AIR 12, 2024)"] },
];

const PLATFORM_FEATURES = [
  { icon:"🏆", title:"Live Leaderboards", color:"#f59e0b", desc:"Compete globally and locally. Real-time rankings updated every hour. Climb from Rookie to Silicon tier.", points:["Global, regional & friend leaderboards","Hourly rank updates","5 tiers: Rookie → Silicon","XP multipliers per tier"] },
  { icon:"🔥", title:"Daily Challenges", color:"#ef4444", desc:"Fresh challenges generated every morning by Nova — tailored to your goals, skill level, and weak areas.", points:["AI-generated personalized challenges","5 categories: Code, DSA, System Design, Aptitude, Domain","Streak bonuses and XP rewards","Difficulty adapts to your level"] },
  { icon:"⚔️", title:"Practice Arena", color:"#6366f1", desc:"A competitive coding and problem-solving arena where you can battle peers in real-time, solo grind, or take timed assessments.", points:["Real-time 1v1 coding battles","Solo timed practice sessions","LeetCode-style problem bank","Live code editor with AI hints"] },
  { icon:"🗺️", title:"AI Growth Plan", color:"#22d3ee", desc:"Nova generates a complete, personalized growth roadmap based on your goal, current skill level, and timeline.", points:["Goal-based roadmap generation","Week-by-week milestones","Skill dependency mapping","Auto-adjusts on missed tasks"] },
  { icon:"🎁", title:"Real Rewards", color:"#22c55e", desc:"Top performers earn real rewards — AI tool subscriptions, cash prizes, and freelance opportunities.", points:["AI tools: ChatGPT, Claude, Gemini Pro access","Cash prizes for top leaderboard performers","Freelance & hiring opportunities for Silicon tier","Monthly reward cycles"] },
  { icon:"📈", title:"Growth Analytics", color:"#a855f7", desc:"A full-blown personal analytics dashboard. Track XP, streaks, completion rates, rank trajectory, and subject-wise performance.", points:["Daily, weekly, monthly performance charts","Subject-wise heatmaps","Peer comparison analytics","Growth velocity & momentum score"] },
];

const TIERS = [
  { name:"Rookie", icon:"🟢", xp:"0–999 XP", color:"#22c55e", perks:["Basic features","5 challenges/day","Standard leaderboard"] },
  { name:"Grinder", icon:"⚡", xp:"1K–4.9K XP", color:"#6366f1", perks:["Full challenges","2x XP boost","AI hints (50/mo)"] },
  { name:"Elite", icon:"👑", xp:"5K–14.9K XP", color:"#f59e0b", perks:["Elite leaderboard","3x XP boost","Advanced analytics"] },
  { name:"Silicon", icon:"💎", xp:"15K+ XP", color:"#00e5ff", perks:["5x XP boost","Unlimited AI","Cash rewards + hiring"] },
];

export default function FeaturesPage() {
  const [activeAgent, setActiveAgent] = useState(0);
  const [activeTab, setActiveTab] = useState<"agents" | "platform" | "tiers">("agents");
  const agent = AGENTS[activeAgent];

  return (
    <div style={s.root}>
      <div style={s.bg} /><div style={s.bgGrid} /><div style={s.bgGlow1} /><div style={s.bgGlow2} />

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.badge}><span>⚡</span><span>Everything GrowthOS Can Do</span></div>
        <h1 style={s.heroTitle}>One Platform. <span style={{background:"linear-gradient(135deg,#6366f1,#00e5ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Infinite Growth.</span></h1>
        <p style={s.heroSub}>GrowthOS combines 8 specialized AI agents, live leaderboards, daily challenges, a practice arena, real rewards, and deep analytics — all working together to make you the top 1%.</p>
        <div style={s.heroCTAs}>
          <Link href="/signup" style={s.ctaPrimary}>Start Free Today</Link>
          <Link href="/pricing" style={s.ctaSecondary}>View Pricing</Link>
        </div>
        <div style={s.statBar}>
          {[{val:"8",label:"AI Agents"},{val:"Early",label:"Access — open beta"},{val:"∞",label:"Daily Challenges"},{val:"Real",label:"Rewards for top performers"}].map((x)=>(
            <div key={x.label} style={s.statBarItem}><div style={s.statBarVal}>{x.val}</div><div style={s.statBarLabel}>{x.label}</div></div>
          ))}
        </div>
      </section>

      {/* TABS */}
      <div style={s.tabBar}>
        {([{key:"agents",label:"🤖 AI Agents"},{key:"platform",label:"🎮 Platform Features"},{key:"tiers",label:"💎 Tier System"}] as const).map(({key,label})=>(
          <button key={key} style={{...s.tabBtn,...(activeTab===key?s.tabActive:{})}} onClick={()=>setActiveTab(key)}>{label}</button>
        ))}
      </div>

      {/* AGENTS TAB */}
      {activeTab==="agents" && (
        <section style={s.agentsWrap}>
          <div style={s.agentSidebar}>
            {AGENTS.map((ag,i)=>(
              <button key={ag.num} style={{...s.agentBtn,...(activeAgent===i?{...s.agentBtnOn,borderColor:ag.color,background:ag.glow}:{})}} onClick={()=>setActiveAgent(i)}>
                <span style={{fontSize:"1.05rem"}}>{ag.icon}</span>
                <div style={{textAlign:"left" as const,minWidth:0}}>
                  <div style={{fontSize:"0.65rem",color:activeAgent===i?ag.color:"#475569",fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase" as const,marginBottom:2}}>{ag.tag}</div>
                  <div style={{fontSize:"0.85rem",fontWeight:700,color:activeAgent===i?"white":"rgba(255,255,255,0.55)",whiteSpace:"nowrap" as const,overflow:"hidden",textOverflow:"ellipsis"}}>{ag.name}</div>
                </div>
                {activeAgent===i && <div style={{marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:ag.color,flexShrink:0,boxShadow:`0 0 8px ${ag.color}`}}/>}
              </button>
            ))}
          </div>
          <div style={s.agentPanel}>
            <div style={{...s.agentPanelHead,borderColor:agent.color+"44",background:agent.glow}}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{...s.agentIconBox,background:`linear-gradient(135deg,${agent.color},${agent.color}88)`,boxShadow:`0 0 24px ${agent.color}44`}}>{agent.icon}</div>
                <div>
                  <div style={{fontSize:"0.65rem",fontWeight:700,color:agent.color,letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:4}}>Agent {agent.num} · {agent.tag}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.2rem,2.5vw,1.7rem)",fontWeight:900,color:"white"}}>{agent.name}</div>
                </div>
              </div>
            </div>
            <div style={s.agentBody}>
              <div style={{flex:"1 1 300px"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.05rem",fontWeight:800,color:agent.color,marginBottom:12,lineHeight:1.35}}>{agent.headline}</div>
                <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.52)",lineHeight:1.75,marginBottom:18}}>{agent.desc}</p>
                <div style={{display:"flex",flexDirection:"column" as const,gap:9}}>
                  {agent.bullets.map((b,i)=>(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{color:agent.color,flexShrink:0,fontSize:"0.85rem"}}>✓</span>
                      <span style={{fontSize:"0.85rem",color:"rgba(255,255,255,0.68)",lineHeight:1.5}}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={s.terminal}>
                <div style={s.termHead}>
                  <div style={{display:"flex",gap:6}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#ef4444"}}/>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#f59e0b"}}/>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#22c55e"}}/>
                  </div>
                  <div style={{fontSize:"0.62rem",color:"#475569",letterSpacing:"0.08em",fontWeight:700}}>{agent.name.toUpperCase()} · LIVE</div>
                </div>
                <div style={s.termBody}>
                  <div style={{fontSize:"0.6rem",color:"#334155",marginBottom:10,fontFamily:"monospace"}}>{">"} nova run --agent={agent.name.toLowerCase().replace(/ /g,"-")}</div>
                  {agent.demo.map((line,i)=>(
                    <div key={i} style={{display:"flex",gap:8,fontSize:"0.76rem",lineHeight:1.6,color:i===agent.demo.length-1?agent.color:"rgba(255,255,255,0.72)",fontFamily:"monospace",animation:"termIn 0.4s ease forwards",animationDelay:`${i*0.28}s`,opacity:0}}>
                      <span style={{color:agent.color}}>›</span>{line}
                    </div>
                  ))}
                  <div style={{width:7,height:13,background:"rgba(99,102,241,0.8)",borderRadius:2,animation:"termBlink 1s step-end infinite",marginTop:6}}/>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PLATFORM TAB */}
      {activeTab==="platform" && (
        <section style={{position:"relative" as const,zIndex:1,padding:"40px 20px 80px",maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20}}>
            {PLATFORM_FEATURES.map((f)=>(
              <div key={f.title} style={{padding:"28px 24px",background:"rgba(255,255,255,0.02)",border:"1px solid "+f.color+"22",borderRadius:20}}>
                <div style={{width:52,height:52,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",marginBottom:16,background:f.color+"18",color:f.color}}>{f.icon}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.1rem",fontWeight:800,color:f.color,marginBottom:10}}>{f.title}</div>
                <p style={{fontSize:"0.875rem",color:"rgba(255,255,255,0.5)",lineHeight:1.7,marginBottom:16}}>{f.desc}</p>
                <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                  {f.points.map((pt,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:"0.82rem",color:"rgba(255,255,255,0.65)"}}>
                      <span style={{color:f.color}}>✓</span><span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TIERS TAB */}
      {activeTab==="tiers" && (
        <section style={{position:"relative" as const,zIndex:1,padding:"40px 20px 80px",maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center" as const,marginBottom:40}}>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.8rem,3vw,2.4rem)",fontWeight:900,color:"white",margin:"0 0 12px"}}>The GrowthOS Tier System</h2>
            <p style={{fontSize:"0.95rem",color:"rgba(255,255,255,0.45)",maxWidth:580,margin:"0 auto",lineHeight:1.7}}>Earn XP by completing challenges, maintaining streaks, and climbing leaderboards. Higher tiers unlock bigger multipliers and real rewards.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:48}}>
            {TIERS.map((tier,i)=>(
              <div key={tier.name} style={{padding:"28px 20px",background:"rgba(255,255,255,0.025)",border:"1px solid "+tier.color+"40",borderRadius:20,textAlign:"center" as const,position:"relative" as const,boxShadow:i===3?`0 0 40px ${tier.color}22`:"none"}}>
                <div style={{width:64,height:64,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",margin:"0 auto 4px",background:`linear-gradient(135deg,${tier.color},${tier.color}88)`}}>{tier.icon}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.4rem",fontWeight:900,color:"white",margin:"12px 0 4px"}}>{tier.name}</div>
                <div style={{fontSize:"0.78rem",color:tier.color,fontWeight:700,marginBottom:20}}>{tier.xp}</div>
                {tier.perks.map((perk,j)=>(
                  <div key={j} style={{display:"flex",gap:8,alignItems:"center",fontSize:"0.82rem",color:"rgba(255,255,255,0.65)",marginBottom:8,textAlign:"left" as const}}>
                    <span style={{color:tier.color}}>✓</span><span>{perk}</span>
                  </div>
                ))}
                {i===3 && <div style={{position:"absolute" as const,top:12,right:12,fontSize:"0.65rem",fontWeight:800,background:"rgba(0,229,255,0.12)",border:"1px solid rgba(0,229,255,0.3)",color:"#00e5ff",padding:"3px 10px",borderRadius:20}}>🏆 Top 1%</div>}
              </div>
            ))}
          </div>
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"28px 24px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.1rem",fontWeight:800,color:"white",marginBottom:20}}>How to Earn XP</div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
              {[{icon:"⚡",label:"Complete daily challenge",xp:"+50 XP"},{icon:"🔥",label:"Maintain streak (bonus multiplier)",xp:"+10–100 XP"},{icon:"⚔️",label:"Win arena battle",xp:"+200 XP"},{icon:"🎯",label:"Complete a mission",xp:"+300–1000 XP"},{icon:"📈",label:"Climb the leaderboard",xp:"Rank bonus"},{icon:"🤝",label:"Refer a friend",xp:"+500 XP"}].map((x)=>(
                <div key={x.label} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12}}>
                  <span style={{fontSize:"1.5rem"}}>{x.icon}</span>
                  <div style={{flex:1,fontSize:"0.88rem",color:"rgba(255,255,255,0.8)",fontWeight:600}}>{x.label}</div>
                  <div style={{fontSize:"0.82rem",fontWeight:800,color:"#22c55e",flexShrink:0}}>{x.xp}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section style={{position:"relative" as const,zIndex:1,padding:"60px 20px 80px",maxWidth:1100,margin:"0 auto",textAlign:"center" as const}}>
        <div style={s.badge}>The GrowthOS Loop</div>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.8rem,3vw,2.5rem)",fontWeight:900,color:"white",margin:"0 0 48px"}}>How it all works together</h2>
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap" as const}}>
          {[{icon:"🎯",step:"01",title:"Set Your Goal",desc:"Tell Nova what you want to achieve — crack an exam, land a job, build a product, or hit a skill milestone."},{icon:"🤖",step:"02",title:"Nova Plans",desc:"8 AI agents activate. Nova generates your personalized growth plan, daily tasks, resource list, and career path — in minutes."},{icon:"⚡",step:"03",title:"Execute Daily",desc:"Complete challenges, solve arena problems, and check off your AI-generated tasks. Streak bonuses keep you consistent."},{icon:"📊",step:"04",title:"Track & Climb",desc:"Watch your XP grow, your rank climb, and your analytics dashboard fill with green arrows."},{icon:"🎁",step:"05",title:"Earn Rewards",desc:"Top performers earn real prizes — AI tool access, cash, freelance opportunities, and recognition in the community."}].map((step)=>(
            <div key={step.step} style={{flex:"1 1 180px",maxWidth:200,display:"flex",flexDirection:"column" as const,alignItems:"center",padding:"0 12px"}}>
              <div style={{fontSize:"0.65rem",fontWeight:900,color:"#6366f1",letterSpacing:"0.12em",marginBottom:8}}>{step.step}</div>
              <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",marginBottom:12}}>{step.icon}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"0.95rem",fontWeight:800,color:"white",marginBottom:8}}>{step.title}</div>
              <div style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.42)",lineHeight:1.6,textAlign:"center" as const}}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{position:"relative" as const,zIndex:1,textAlign:"center" as const,padding:"80px 20px",overflow:"hidden"}}>
        <div style={{position:"absolute" as const,inset:0,background:"radial-gradient(ellipse at center,rgba(99,102,241,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={s.badge}>Start Today. It is Free.</div>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(2rem,4vw,3rem)",fontWeight:900,color:"white",margin:"0 0 16px",letterSpacing:"-0.02em"}}>Ready to become the <span style={{background:"linear-gradient(135deg,#6366f1,#00e5ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>top 1%?</span></h2>
        <p style={{fontSize:"1rem",color:"rgba(255,255,255,0.45)",maxWidth:520,margin:"0 auto 36px",lineHeight:1.7}}>GrowthOS is in early access. Be among the first to use all 8 AI agents, climb the leaderboard, and build the habits that actually compound.</p>
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap" as const}}>
          <Link href="/signup" style={s.ctaPrimary}>Get Started Free</Link>
          <Link href="/about" style={s.ctaSecondary}>Learn About Us</Link>
        </div>
      </section>

      <div style={{position:"relative" as const,zIndex:1,textAlign:"center" as const,padding:"0 20px 40px",display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
        {[{href:"/",label:"← Home"},{href:"/about",label:"About"},{href:"/pricing",label:"Pricing"},{href:"/contact",label:"Contact"}].map((l,i)=>(
          <span key={l.href} style={{display:"flex",alignItems:"center",gap:12}}>
            {i>0 && <span style={{color:"rgba(255,255,255,0.15)",fontSize:"0.82rem"}}>·</span>}
            <Link href={l.href} style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.3)",textDecoration:"none"}}>{l.label}</Link>
          </span>
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes termBlink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes termIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:{minHeight:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"rgba(255,255,255,0.85)",position:"relative",overflowX:"hidden"},
  bg:{position:"fixed",inset:0,background:"linear-gradient(135deg,#020818 0%,#060f22 50%,#02091a 100%)",zIndex:0},
  bgGrid:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px)",backgroundSize:"48px 48px",zIndex:0,pointerEvents:"none"},
  bgGlow1:{position:"fixed",top:"-15%",left:"-5%",width:"700px",height:"700px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},
  bgGlow2:{position:"fixed",bottom:"-15%",right:"-5%",width:"600px",height:"600px",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,229,255,0.06) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},
  hero:{position:"relative",zIndex:1,textAlign:"center",padding:"60px 20px 40px",maxWidth:920,margin:"0 auto",animation:"fadeUp 0.8s ease forwards"},
  badge:{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:20,padding:"6px 18px",fontSize:"0.78rem",color:"#818cf8",fontWeight:700,marginBottom:24,letterSpacing:"0.04em",textTransform:"uppercase"},
  heroTitle:{fontFamily:"'Syne',sans-serif",fontSize:"clamp(2.4rem,5.5vw,4rem)",fontWeight:900,color:"white",lineHeight:1.1,margin:"0 0 20px",letterSpacing:"-0.02em"},
  heroSub:{fontSize:"1.05rem",color:"rgba(255,255,255,0.5)",maxWidth:660,margin:"0 auto 32px",lineHeight:1.75},
  heroCTAs:{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",marginBottom:40},
  ctaPrimary:{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 32px",background:"linear-gradient(135deg,#6366f1,#00e5ff)",borderRadius:14,color:"#04070f",fontSize:"0.98rem",fontWeight:800,textDecoration:"none",boxShadow:"0 0 28px rgba(99,102,241,0.35)",fontFamily:"'Syne',sans-serif"},
  ctaSecondary:{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 28px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,color:"rgba(255,255,255,0.72)",fontSize:"0.92rem",fontWeight:600,textDecoration:"none"},
  statBar:{display:"flex",justifyContent:"center",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"hidden",maxWidth:520,margin:"0 auto"},
  statBarItem:{flex:1,padding:"16px 12px",textAlign:"center",borderRight:"1px solid rgba(255,255,255,0.06)"},
  statBarVal:{fontFamily:"'Syne',sans-serif",fontSize:"1.4rem",fontWeight:900,color:"white",lineHeight:1},
  statBarLabel:{fontSize:"0.7rem",color:"rgba(255,255,255,0.35)",fontWeight:500,marginTop:4},
  tabBar:{position:"relative",zIndex:1,display:"flex",justifyContent:"center",gap:8,padding:"32px 20px 0",flexWrap:"wrap"},
  tabBtn:{padding:"11px 24px",borderRadius:999,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.02)",color:"rgba(255,255,255,0.5)",fontSize:"0.88rem",fontWeight:700,cursor:"pointer"},
  tabActive:{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.4)",color:"white"},
  agentsWrap:{position:"relative",zIndex:1,display:"flex",gap:0,maxWidth:1280,margin:"32px auto 0",padding:"0 20px 80px",flexWrap:"wrap"},
  agentSidebar:{width:252,flexShrink:0,display:"flex",flexDirection:"column",gap:4,paddingRight:16},
  agentBtn:{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:12,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.02)",cursor:"pointer",textAlign:"left",transition:"all 0.18s"},
  agentBtnOn:{border:"1px solid"},
  agentPanel:{flex:1,minWidth:0,borderRadius:24,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(5,7,18,0.7)",backdropFilter:"blur(24px)",overflow:"hidden"},
  agentPanelHead:{padding:"22px 26px",borderBottom:"1px solid",display:"flex",alignItems:"center"},
  agentIconBox:{width:54,height:54,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",flexShrink:0},
  agentBody:{display:"flex",gap:28,padding:"26px",flexWrap:"wrap"},
  terminal:{flex:"1 1 260px",borderRadius:14,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(2,6,14,0.95)",overflow:"hidden",fontFamily:"monospace"},
  termHead:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)"},
  termBody:{padding:"14px 16px",display:"flex",flexDirection:"column",gap:8},
};
