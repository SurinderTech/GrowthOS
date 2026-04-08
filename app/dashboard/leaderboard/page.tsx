"use client";
// app/dashboard/leaderboard/page.tsx
// GrowthOS — Domain-specific Leaderboard + Full Reward System

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Target, Play, BarChart2, Trophy,
  BookOpen, Users, Settings, LogOut, Bell, ChevronLeft,
  Flame, Crown, Check, X, Lock, ChevronRight, Star, Zap,
} from "lucide-react";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  { icon: <LayoutDashboard size={18}/>, label:"Dashboard",     href:"/dashboard" },
  { icon: <Target size={18}/>,          label:"Growth Plan",   href:"/dashboard/growth-plan" },
  { icon: <Play size={18}/>,            label:"Practice Arena",href:"/dashboard/practice" },
  { icon: <BarChart2 size={18}/>,       label:"Leaderboard",   href:"/dashboard/leaderboard", active:true },
  { icon: <Trophy size={18}/>,          label:"Challenges",    href:"/dashboard/challenges" },
  { icon: <BookOpen size={18}/>,        label:"Skills",        href:"/dashboard/skills" },
  { icon: <Users size={18}/>,           label:"Community",     href:"/dashboard/community" },
  { icon: <Settings size={18}/>,        label:"Settings",      href:"/dashboard/settings" },
];

// ── Domain config ─────────────────────────────────────────────────────────────
const DOMAINS = [
  { id:"developer", label:"👨‍💻 Developer",  color:"#6366f1", desc:"Full-stack, mobile, DSA" },
  { id:"jee",       label:"⚗️ JEE",         color:"#f59e0b", desc:"Physics, Chemistry, Math" },
  { id:"neet",      label:"🧬 NEET",        color:"#22c55e", desc:"Biology, Physics, Chemistry" },
  { id:"upsc",      label:"🏛️ UPSC",       color:"#3b82f6", desc:"GK, Current Affairs, Essay" },
  { id:"creator",   label:"🎬 Creator",     color:"#ec4899", desc:"YouTube, Instagram, Reels" },
  { id:"business",  label:"💼 Business",    color:"#f97316", desc:"Startup, Marketing, Finance" },
];

// ── Per-domain player data ─────────────────────────────────────────────────────
const DOMAIN_PLAYERS: Record<string, any[]> = {
  developer: [
    { id:1,  name:"Arjun Sharma",    avatar:"AS", score:9840, streak:127, rank:1,  prevRank:1,  league:"Silicon", badge:"Legend",           isPremium:true,  xpLabel:"DSA Master"     },
    { id:2,  name:"Priya Nair",      avatar:"PN", score:9210, streak:98,  rank:2,  prevRank:3,  league:"Silicon", badge:"Elite Builder",     isPremium:true,  xpLabel:"Full-Stack Pro"  },
    { id:3,  name:"Rahul Verma",     avatar:"RV", score:8755, streak:75,  rank:3,  prevRank:2,  league:"Elite",   badge:"Top 10% Grinder",   isPremium:true,  xpLabel:"System Design"  },
    { id:4,  name:"Sneha Iyer",      avatar:"SI", score:8120, streak:62,  rank:4,  prevRank:5,  league:"Elite",   isPremium:true,  xpLabel:"Backend Dev"    },
    { id:5,  name:"Aman Gupta",      avatar:"AG", score:7890, streak:55,  rank:5,  prevRank:4,  league:"Elite",   isPremium:false, xpLabel:"React Dev"      },
    { id:6,  name:"Kavya Reddy",     avatar:"KR", score:7340, streak:47,  rank:6,  prevRank:6,  league:"Gold",    isPremium:true,  xpLabel:"ML Engineer"    },
    { id:7,  name:"Vikram Singh",    avatar:"VS", score:6980, streak:38,  rank:7,  prevRank:9,  league:"Gold",    isPremium:false, xpLabel:"DevOps"         },
    { id:8,  name:"Riya Patel",      avatar:"RP", score:6540, streak:31,  rank:8,  prevRank:7,  league:"Gold",    isPremium:true,  xpLabel:"Mobile Dev"     },
    { id:9,  name:"Dev Joshi",       avatar:"DJ", score:6120, streak:28,  rank:9,  prevRank:8,  league:"Gold",    isPremium:false, xpLabel:"Open Source"    },
    { id:10, name:"Aisha Khan",      avatar:"AK", score:5870, streak:24,  rank:10, prevRank:12, league:"Silver",  isPremium:true,  xpLabel:"Frontend"       },
    { id:11, name:"You",             avatar:"YO", score:5420, streak:18,  rank:11, prevRank:13, league:"Silver",  isPremium:false, xpLabel:"Growing Dev",   isCurrentUser:true },
    { id:12, name:"Neha Joshi",      avatar:"NJ", score:4990, streak:16,  rank:12, prevRank:10, league:"Silver",  isPremium:false, xpLabel:"Learner"        },
    { id:13, name:"Karan Mehta",     avatar:"KM", score:4650, streak:14,  rank:13, prevRank:11, league:"Silver",  isPremium:true,  xpLabel:"Coder"          },
    { id:14, name:"Divya Das",       avatar:"DD", score:4210, streak:11,  rank:14, prevRank:14, league:"Bronze",  isPremium:false, xpLabel:"Beginner"       },
    { id:15, name:"Raj Malhotra",    avatar:"RM", score:3890, streak:9,   rank:15, prevRank:16, league:"Bronze",  isPremium:false, xpLabel:"Starter"        },
    { id:16, name:"Pooja Nanda",     avatar:"PP", score:3540, streak:7,   rank:16, prevRank:15, league:"Bronze",  isPremium:false, xpLabel:"New Joiner"     },
    { id:17, name:"Siddharth Das",   avatar:"SD", score:3120, streak:5,   rank:17, prevRank:17, league:"Bronze",  isPremium:false, xpLabel:"Explorer"       },
    { id:18, name:"Ananya Roy",      avatar:"AR", score:2780, streak:3,   rank:18, prevRank:18, league:"Bronze",  isPremium:false, xpLabel:"Newcomer"       },
  ],
  jee: [
    { id:1,  name:"Rohan Agarwal",   avatar:"RA", score:9920, streak:142, rank:1,  prevRank:1,  league:"Silicon", badge:"Legend",           isPremium:true,  xpLabel:"JEE Advanced"   },
    { id:2,  name:"Tanvi Sharma",    avatar:"TS", score:9450, streak:110, rank:2,  prevRank:2,  league:"Silicon", badge:"Elite Builder",     isPremium:true,  xpLabel:"Maths Topper"   },
    { id:3,  name:"Aryan Kapoor",    avatar:"AK", score:8900, streak:88,  rank:3,  prevRank:4,  league:"Elite",   badge:"Top 10% Grinder",   isPremium:true,  xpLabel:"Physics Pro"    },
    { id:4,  name:"Pooja Mishra",    avatar:"PM", score:8340, streak:70,  rank:4,  prevRank:3,  league:"Elite",   isPremium:true,  xpLabel:"Chemistry Star" },
    { id:5,  name:"Dev Tiwari",      avatar:"DT", score:7980, streak:58,  rank:5,  prevRank:6,  league:"Elite",   isPremium:false, xpLabel:"Mock Tests"     },
    { id:6,  name:"Shreya Verma",    avatar:"SV", score:7560, streak:49,  rank:6,  prevRank:5,  league:"Gold",    isPremium:true,  xpLabel:"Calculus King"  },
    { id:7,  name:"Aditya Singh",    avatar:"AS", score:7100, streak:41,  rank:7,  prevRank:8,  league:"Gold",    isPremium:false, xpLabel:"Org Chemistry"  },
    { id:8,  name:"Meera Patel",     avatar:"MP", score:6680, streak:33,  rank:8,  prevRank:7,  league:"Gold",    isPremium:true,  xpLabel:"Mechanics Pro"  },
    { id:9,  name:"Karan Joshi",     avatar:"KJ", score:6250, streak:27,  rank:9,  prevRank:10, league:"Gold",    isPremium:false, xpLabel:"Numericals"     },
    { id:10, name:"Nisha Gupta",     avatar:"NG", score:5900, streak:22,  rank:10, prevRank:9,  league:"Silver",  isPremium:true,  xpLabel:"Consistent"     },
    { id:11, name:"You",             avatar:"YO", score:4820, streak:18,  rank:11, prevRank:14, league:"Silver",  isPremium:false, xpLabel:"Rising Star",   isCurrentUser:true },
    { id:12, name:"Raj Kumar",       avatar:"RK", score:4400, streak:15,  rank:12, prevRank:11, league:"Silver",  isPremium:false, xpLabel:"Learner"        },
    { id:13, name:"Anita Rao",       avatar:"AR", score:4050, streak:12,  rank:13, prevRank:12, league:"Silver",  isPremium:true,  xpLabel:"Practising"     },
    { id:14, name:"Suresh Nair",     avatar:"SN", score:3700, streak:9,   rank:14, prevRank:13, league:"Bronze",  isPremium:false, xpLabel:"Solving"        },
    { id:15, name:"Priyanka Das",    avatar:"PD", score:3380, streak:7,   rank:15, prevRank:16, league:"Bronze",  isPremium:false, xpLabel:"Beginner"       },
    { id:16, name:"Vikas Mehta",     avatar:"VM", score:3020, streak:5,   rank:16, prevRank:15, league:"Bronze",  isPremium:false, xpLabel:"New"            },
    { id:17, name:"Swati Iyer",      avatar:"SI", score:2700, streak:4,   rank:17, prevRank:17, league:"Bronze",  isPremium:false, xpLabel:"Starting"       },
    { id:18, name:"Mohit Sinha",     avatar:"MS", score:2400, streak:2,   rank:18, prevRank:18, league:"Bronze",  isPremium:false, xpLabel:"Enrolled"       },
  ],
  neet: [
    { id:1,  name:"Kavitha Reddy",   avatar:"KR", score:9780, streak:135, rank:1,  prevRank:1,  league:"Silicon", badge:"Legend",           isPremium:true,  xpLabel:"Biology Master" },
    { id:2,  name:"Rahul Nair",      avatar:"RN", score:9320, streak:102, rank:2,  prevRank:3,  league:"Silicon", badge:"Elite Builder",     isPremium:true,  xpLabel:"NCERT Expert"   },
    { id:3,  name:"Sana Khan",       avatar:"SK", score:8840, streak:80,  rank:3,  prevRank:2,  league:"Elite",   badge:"Top 10% Grinder",   isPremium:true,  xpLabel:"Physiology Pro" },
    { id:4,  name:"Deepak Sharma",   avatar:"DS", score:8280, streak:65,  rank:4,  prevRank:5,  league:"Elite",   isPremium:true,  xpLabel:"Biochemistry"   },
    { id:5,  name:"Priya Singh",     avatar:"PS", score:7920, streak:54,  rank:5,  prevRank:4,  league:"Elite",   isPremium:false, xpLabel:"Botany Pro"     },
    { id:6,  name:"Amit Gupta",      avatar:"AG", score:7450, streak:46,  rank:6,  prevRank:7,  league:"Gold",    isPremium:true,  xpLabel:"Zoology Ace"    },
    { id:7,  name:"Neha Jain",       avatar:"NJ", score:6990, streak:38,  rank:7,  prevRank:6,  league:"Gold",    isPremium:false, xpLabel:"Clinical MCQs"  },
    { id:8,  name:"Sunil Verma",     avatar:"SV", score:6540, streak:30,  rank:8,  prevRank:8,  league:"Gold",    isPremium:true,  xpLabel:"Diagrams Pro"   },
    { id:9,  name:"Asha Patel",      avatar:"AP", score:6080, streak:25,  rank:9,  prevRank:11, league:"Gold",    isPremium:false, xpLabel:"Mock Tests"     },
    { id:10, name:"Kiran Kumar",     avatar:"KK", score:5720, streak:20,  rank:10, prevRank:9,  league:"Silver",  isPremium:true,  xpLabel:"Consistent"     },
    { id:11, name:"You",             avatar:"YO", score:5190, streak:18,  rank:11, prevRank:13, league:"Silver",  isPremium:false, xpLabel:"Rising",        isCurrentUser:true },
    { id:12, name:"Ritu Mehta",      avatar:"RM", score:4760, streak:14,  rank:12, prevRank:10, league:"Silver",  isPremium:false, xpLabel:"Studying"       },
    { id:13, name:"Vikash Roy",      avatar:"VR", score:4320, streak:11,  rank:13, prevRank:12, league:"Silver",  isPremium:true,  xpLabel:"Practising"     },
    { id:14, name:"Ananya Das",      avatar:"AD", score:3950, streak:8,   rank:14, prevRank:14, league:"Bronze",  isPremium:false, xpLabel:"Learning"       },
    { id:15, name:"Shiv Agarwal",    avatar:"SA", score:3600, streak:6,   rank:15, prevRank:16, league:"Bronze",  isPremium:false, xpLabel:"Beginner"       },
    { id:16, name:"Pooja Sharma",    avatar:"PS", score:3220, streak:5,   rank:16, prevRank:15, league:"Bronze",  isPremium:false, xpLabel:"New"            },
    { id:17, name:"Dinesh Iyer",     avatar:"DI", score:2880, streak:3,   rank:17, prevRank:17, league:"Bronze",  isPremium:false, xpLabel:"Starting"       },
    { id:18, name:"Lavanya Rao",     avatar:"LR", score:2540, streak:2,   rank:18, prevRank:18, league:"Bronze",  isPremium:false, xpLabel:"Enrolled"       },
  ],
  upsc: [
    { id:1,  name:"Vikram Chauhan",  avatar:"VC", score:9680, streak:118, rank:1,  prevRank:1,  league:"Silicon", badge:"Legend",           isPremium:true,  xpLabel:"GS Paper 1"     },
    { id:2,  name:"Ananya Krishnan", avatar:"AK", score:9180, streak:94,  rank:2,  prevRank:2,  league:"Silicon", badge:"Elite Builder",     isPremium:true,  xpLabel:"Essay Expert"   },
    { id:3,  name:"Suresh Babu",     avatar:"SB", score:8720, streak:76,  rank:3,  prevRank:4,  league:"Elite",   badge:"Top 10% Grinder",   isPremium:true,  xpLabel:"Polity Master"  },
    { id:4,  name:"Meena Iyer",      avatar:"MI", score:8160, streak:62,  rank:4,  prevRank:3,  league:"Elite",   isPremium:true,  xpLabel:"History Pro"    },
    { id:5,  name:"Rajan Nair",      avatar:"RN", score:7840, streak:53,  rank:5,  prevRank:6,  league:"Elite",   isPremium:false, xpLabel:"Geography Ace"  },
    { id:6,  name:"Deepika Singh",   avatar:"DS", score:7360, streak:44,  rank:6,  prevRank:5,  league:"Gold",    isPremium:true,  xpLabel:"Economy Pro"    },
    { id:7,  name:"Karthik Kumar",   avatar:"KK", score:6900, streak:36,  rank:7,  prevRank:8,  league:"Gold",    isPremium:false, xpLabel:"Current Affairs"},
    { id:8,  name:"Sunita Rao",      avatar:"SR", score:6440, streak:29,  rank:8,  prevRank:7,  league:"Gold",    isPremium:true,  xpLabel:"Env & Ecology"  },
    { id:9,  name:"Bharat Sharma",   avatar:"BS", score:6010, streak:24,  rank:9,  prevRank:10, league:"Gold",    isPremium:false, xpLabel:"Sci & Tech"     },
    { id:10, name:"Priya Reddy",     avatar:"PR", score:5680, streak:19,  rank:10, prevRank:9,  league:"Silver",  isPremium:true,  xpLabel:"Mains Practice" },
    { id:11, name:"You",             avatar:"YO", score:5080, streak:18,  rank:11, prevRank:13, league:"Silver",  isPremium:false, xpLabel:"Prelims Prep",  isCurrentUser:true },
    { id:12, name:"Rahul Mishra",    avatar:"RM", score:4650, streak:14,  rank:12, prevRank:11, league:"Silver",  isPremium:false, xpLabel:"Studying"       },
    { id:13, name:"Kavita Das",      avatar:"KD", score:4210, streak:10,  rank:13, prevRank:12, league:"Silver",  isPremium:true,  xpLabel:"Revision"       },
    { id:14, name:"Arun Gupta",      avatar:"AG", score:3860, streak:8,   rank:14, prevRank:14, league:"Bronze",  isPremium:false, xpLabel:"Reading"        },
    { id:15, name:"Nisha Verma",     avatar:"NV", score:3520, streak:6,   rank:15, prevRank:16, league:"Bronze",  isPremium:false, xpLabel:"Beginner"       },
    { id:16, name:"Sanjay Roy",      avatar:"SR", score:3160, streak:5,   rank:16, prevRank:15, league:"Bronze",  isPremium:false, xpLabel:"New"            },
    { id:17, name:"Lakshmi Nair",    avatar:"LN", score:2820, streak:3,   rank:17, prevRank:17, league:"Bronze",  isPremium:false, xpLabel:"Starting"       },
    { id:18, name:"Tarun Patel",     avatar:"TP", score:2490, streak:2,   rank:18, prevRank:18, league:"Bronze",  isPremium:false, xpLabel:"Enrolled"       },
  ],
  creator: [
    { id:1,  name:"Simran Kaur",     avatar:"SK", score:9750, streak:130, rank:1,  prevRank:1,  league:"Silicon", badge:"Legend",           isPremium:true,  xpLabel:"1M+ Views"      },
    { id:2,  name:"Aman Dhaliwal",   avatar:"AD", score:9280, streak:98,  rank:2,  prevRank:2,  league:"Silicon", badge:"Elite Builder",     isPremium:true,  xpLabel:"Viral Creator"  },
    { id:3,  name:"Priya Kapoor",    avatar:"PK", score:8810, streak:78,  rank:3,  prevRank:4,  league:"Elite",   badge:"Top 10% Grinder",   isPremium:true,  xpLabel:"YT + Insta Pro" },
    { id:4,  name:"Rohit Malhotra",  avatar:"RM", score:8240, streak:63,  rank:4,  prevRank:3,  league:"Elite",   isPremium:true,  xpLabel:"100K+ Subs"     },
    { id:5,  name:"Deepika Arora",   avatar:"DA", score:7870, streak:52,  rank:5,  prevRank:6,  league:"Elite",   isPremium:false, xpLabel:"Reels Master"   },
    { id:6,  name:"Vikas Sharma",    avatar:"VS", score:7410, streak:44,  rank:6,  prevRank:5,  league:"Gold",    isPremium:true,  xpLabel:"Brand Deals"    },
    { id:7,  name:"Neha Bhatia",     avatar:"NB", score:6940, streak:36,  rank:7,  prevRank:8,  league:"Gold",    isPremium:false, xpLabel:"Content Daily"  },
    { id:8,  name:"Tarun Singh",     avatar:"TS", score:6500, streak:29,  rank:8,  prevRank:7,  league:"Gold",    isPremium:true,  xpLabel:"Collab King"    },
    { id:9,  name:"Anjali Mehta",    avatar:"AM", score:6060, streak:23,  rank:9,  prevRank:11, league:"Gold",    isPremium:false, xpLabel:"Growing Fast"   },
    { id:10, name:"Rahul Grover",    avatar:"RG", score:5720, streak:19,  rank:10, prevRank:9,  league:"Silver",  isPremium:true,  xpLabel:"10K Club"       },
    { id:11, name:"You",             avatar:"YO", score:5120, streak:18,  rank:11, prevRank:13, league:"Silver",  isPremium:false, xpLabel:"Building Audience", isCurrentUser:true },
    { id:12, name:"Pooja Nanda",     avatar:"PN", score:4680, streak:14,  rank:12, prevRank:10, league:"Silver",  isPremium:false, xpLabel:"Posting Daily"  },
    { id:13, name:"Sachin Verma",    avatar:"SV", score:4230, streak:10,  rank:13, prevRank:12, league:"Silver",  isPremium:true,  xpLabel:"Improving"      },
    { id:14, name:"Ritu Kumar",      avatar:"RK", score:3880, streak:8,   rank:14, prevRank:14, league:"Bronze",  isPremium:false, xpLabel:"Learning"       },
    { id:15, name:"Mukesh Das",      avatar:"MD", score:3540, streak:5,   rank:15, prevRank:16, league:"Bronze",  isPremium:false, xpLabel:"Starting"       },
    { id:16, name:"Sunita Roy",      avatar:"SR", score:3180, streak:4,   rank:16, prevRank:15, league:"Bronze",  isPremium:false, xpLabel:"New Creator"    },
    { id:17, name:"Ajay Iyer",       avatar:"AI", score:2840, streak:3,   rank:17, prevRank:17, league:"Bronze",  isPremium:false, xpLabel:"Exploring"      },
    { id:18, name:"Meena Gupta",     avatar:"MG", score:2500, streak:1,   rank:18, prevRank:18, league:"Bronze",  isPremium:false, xpLabel:"Enrolled"       },
  ],
  business: [
    { id:1,  name:"Rajesh Bansal",   avatar:"RB", score:9860, streak:125, rank:1,  prevRank:1,  league:"Silicon", badge:"Legend",           isPremium:true,  xpLabel:"₹10Cr Revenue"  },
    { id:2,  name:"Nisha Kapoor",    avatar:"NK", score:9390, streak:96,  rank:2,  prevRank:3,  league:"Silicon", badge:"Elite Builder",     isPremium:true,  xpLabel:"Funded Startup" },
    { id:3,  name:"Amit Agarwal",    avatar:"AA", score:8870, streak:77,  rank:3,  prevRank:2,  league:"Elite",   badge:"Top 10% Grinder",   isPremium:true,  xpLabel:"Growth Hacker"  },
    { id:4,  name:"Seema Joshi",     avatar:"SJ", score:8290, streak:63,  rank:4,  prevRank:5,  league:"Elite",   isPremium:true,  xpLabel:"SaaS Builder"   },
    { id:5,  name:"Naveen Reddy",    avatar:"NR", score:7940, streak:54,  rank:5,  prevRank:4,  league:"Elite",   isPremium:false, xpLabel:"D2C Brand"      },
    { id:6,  name:"Sunita Mehta",    avatar:"SM", score:7470, streak:45,  rank:6,  prevRank:7,  league:"Gold",    isPremium:true,  xpLabel:"Marketing Pro"  },
    { id:7,  name:"Prakash Singh",   avatar:"PS", score:7010, streak:37,  rank:7,  prevRank:6,  league:"Gold",    isPremium:false, xpLabel:"Sales Expert"   },
    { id:8,  name:"Kavita Rao",      avatar:"KR", score:6550, streak:30,  rank:8,  prevRank:8,  league:"Gold",    isPremium:true,  xpLabel:"Product Lead"   },
    { id:9,  name:"Sanjay Kumar",    avatar:"SK", score:6110, streak:24,  rank:9,  prevRank:11, league:"Gold",    isPremium:false, xpLabel:"Finance Model"  },
    { id:10, name:"Divya Sharma",    avatar:"DS", score:5770, streak:20,  rank:10, prevRank:9,  league:"Silver",  isPremium:true,  xpLabel:"Consistent"     },
    { id:11, name:"You",             avatar:"YO", score:5230, streak:18,  rank:11, prevRank:13, league:"Silver",  isPremium:false, xpLabel:"Building MVP",  isCurrentUser:true },
    { id:12, name:"Rajan Verma",     avatar:"RV", score:4790, streak:14,  rank:12, prevRank:10, league:"Silver",  isPremium:false, xpLabel:"Ideating"       },
    { id:13, name:"Anita Patel",     avatar:"AP", score:4350, streak:11,  rank:13, prevRank:12, league:"Silver",  isPremium:true,  xpLabel:"Validating"     },
    { id:14, name:"Suresh Nair",     avatar:"SN", score:4000, streak:8,   rank:14, prevRank:14, league:"Bronze",  isPremium:false, xpLabel:"Learning"       },
    { id:15, name:"Priya Das",       avatar:"PD", score:3660, streak:6,   rank:15, prevRank:16, league:"Bronze",  isPremium:false, xpLabel:"Exploring"      },
    { id:16, name:"Vinay Iyer",      avatar:"VI", score:3300, streak:4,   rank:16, prevRank:15, league:"Bronze",  isPremium:false, xpLabel:"New"            },
    { id:17, name:"Lakshmi Singh",   avatar:"LS", score:2960, streak:3,   rank:17, prevRank:17, league:"Bronze",  isPremium:false, xpLabel:"Starting"       },
    { id:18, name:"Harish Gupta",    avatar:"HG", score:2620, streak:2,   rank:18, prevRank:18, league:"Bronze",  isPremium:false, xpLabel:"Enrolled"       },
  ],
};

// ── AI Tools for reward modal ─────────────────────────────────────────────────
const AI_TOOLS = [
  { id:"chatgpt",    name:"ChatGPT Plus",       icon:"🤖", company:"OpenAI",    color:"#10a37f", bg:"rgba(16,163,127,0.1)",  border:"rgba(16,163,127,0.3)",  desc:"GPT-4o, DALL-E 3, Advanced Data Analysis", tier:"1-week" },
  { id:"claude",     name:"Claude Pro",          icon:"⚡", company:"Anthropic", color:"#6366f1", bg:"rgba(99,102,241,0.1)",  border:"rgba(99,102,241,0.3)",  desc:"Claude 3.5 Sonnet, extended context, priority access", tier:"1-week" },
  { id:"gemini",     name:"Gemini Advanced",     icon:"✨", company:"Google",    color:"#4285f4", bg:"rgba(66,133,244,0.1)",  border:"rgba(66,133,244,0.3)",  desc:"Gemini 1.5 Pro, 1M token context, Google Workspace", tier:"1-week" },
  { id:"perplexity", name:"Perplexity Pro",      icon:"🔍", company:"Perplexity",color:"#20b2aa", bg:"rgba(32,178,170,0.1)",  border:"rgba(32,178,170,0.3)",  desc:"Real-time web search + AI, Pro search, API access", tier:"1-week" },
  { id:"sora",       name:"Sora AI (Video)",     icon:"🎞️", company:"OpenAI",   color:"#8b5cf6", bg:"rgba(139,92,246,0.1)",  border:"rgba(139,92,246,0.3)",  desc:"AI video generation, up to 1080p, 60 seconds", tier:"1-week" },
  { id:"kling",      name:"Kling AI",            icon:"🎬", company:"Kuaishou",  color:"#ef4444", bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.3)",   desc:"Video & image gen, 5s-2min videos, Pro features", tier:"1-week" },
  { id:"lovable",    name:"Lovable AI",          icon:"💜", company:"Lovable",   color:"#ec4899", bg:"rgba(236,72,153,0.1)",  border:"rgba(236,72,153,0.3)",  desc:"Build full-stack apps with AI, unlimited projects", tier:"1-week" },
];

// ── Leagues ───────────────────────────────────────────────────────────────────
const LEAGUES = [
  { name:"Bronze",  color:"#cd7f32", min:0,    max:2999  },
  { name:"Silver",  color:"#c0c0c0", min:3000, max:5999  },
  { name:"Gold",    color:"#ffd700", min:6000, max:8499  },
  { name:"Elite",   color:"#6366f1", min:8500, max:9499  },
  { name:"Silicon", color:"#22c55e", min:9500, max:99999 },
];

// ── Streak rewards ────────────────────────────────────────────────────────────
const STREAK_REWARDS = [
  { days:7,   title:"Starter",          desc:"Badge + 100 XP boost",                                    icon:"🎯", color:"#64748b" },
  { days:21,  title:"Consistent",       desc:"Badge + unlock advanced missions",                         icon:"🔥", color:"#f97316" },
  { days:45,  title:"Serious Performer",desc:"Badge + minor premium feature unlock",                     icon:"💪", color:"#f59e0b" },
  { days:50,  title:"🤖 AI Tool Access",desc:"Choose 1 AI tool — 1 WEEK FREE subscription",             icon:"⚡", color:"#6366f1", isSpecial:true },
  { days:75,  title:"Top 10% Grinder",  desc:"Badge + profile highlight on leaderboard",                icon:"🏆", color:"#3b82f6" },
  { days:100, title:"Elite Builder",    desc:"Badge + verified profile + 1-week AI subscription",       icon:"👑", color:"#ffd700" },
  { days:150, title:"Legend Status",    desc:"Elite league + choose 1-month or 1-year AI subscription", icon:"💎", color:"#22c55e", isSpecial:true },
];

const LIVE_NOTIFICATIONS: Record<string, string[]> = {
  developer: ["🔥 Arjun shipped a side project!", "⚡ Priya solved 10 LeetCode problems today", "🚀 Aman gained +50 XP from system design", "💻 Rahul earned the DSA Master badge"],
  jee:       ["🔥 Rohan scored 280/300 in mock test!", "⚡ Tanvi finished Organic Chemistry revision", "🚀 Aryan gained +75 XP from Physics numericals", "📚 Pooja completed NCERT Math in one sitting"],
  neet:      ["🔥 Kavitha memorized all diagrams!", "⚡ Rahul scored 360/360 in Biology mock", "🚀 Sana gained +60 XP from Physiology", "🧬 Deepak finished Botany NCERT today"],
  upsc:      ["🔥 Vikram read 3 Hindu editorials today!", "⚡ Ananya completed 50 Prelims MCQs", "🚀 Suresh gained +80 XP from Polity chapter", "📰 Meena finished Current Affairs weekly test"],
  creator:   ["🔥 Simran's Reel crossed 1M views!", "⚡ Aman posted 5 pieces of content today", "🚀 Priya gained +90 XP from collaboration", "🎬 Rohit unlocked Brand Deals badge"],
  business:  ["🔥 Rajesh closed a ₹50L deal!", "⚡ Nisha got her startup funded", "🚀 Amit gained +100 XP from product launch", "💼 Seema completed 5 customer discovery calls"],
};

function leagueColor(l:string){ return LEAGUES.find(x=>x.name===l)?.color||"#475569"; }

// ── Main Component ────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const [loaded, setLoaded]               = useState(false);
  const [domain, setDomain]               = useState("developer");
  const [tab, setTab]                     = useState<"daily"|"weekly"|"monthly"|"alltime">("monthly");
  const [players, setPlayers]             = useState<any[]>([]);
  const [notifications, setNotifications] = useState<{id:number;msg:string}[]>([]);
  const [xpPops, setXpPops]               = useState<{id:number;name:string;xp:number}[]>([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedTool, setSelectedTool]   = useState<string|null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const notifId = useRef(0);
  const xpId    = useRef(0);

  // Load domain players
  useEffect(() => {
    const base = DOMAIN_PLAYERS[domain] || DOMAIN_PLAYERS.developer;
    setPlayers(JSON.parse(JSON.stringify(base)));
  }, [domain]);

  useEffect(() => { setTimeout(()=>setLoaded(true),80); }, []);

  // Fake real-time rank changes within domain
  useEffect(() => {
    if (!players.length) return;
    const interval = setInterval(() => {
      setPlayers(prev => {
        const next = [...prev];
        const idx1 = 3 + Math.floor(Math.random() * Math.min(8, next.length-4));
        const idx2 = 3 + Math.floor(Math.random() * Math.min(8, next.length-4));
        if (idx1!==idx2 && !next[idx1]?.isCurrentUser && !next[idx2]?.isCurrentUser) {
          const delta = Math.floor(Math.random()*40)+10;
          next[idx1] = {...next[idx1], score: next[idx1].score+delta, prevRank:next[idx1].rank};
          const top3 = next.slice(0,3);
          const rest = next.slice(3).sort((a,b)=>b.score-a.score).map((p,i)=>({...p,rank:i+4}));
          return [...top3,...rest];
        }
        return next;
      });
    }, 3500);
    return ()=>clearInterval(interval);
  },[players.length, domain]);

  // XP pops
  useEffect(() => {
    const interval = setInterval(() => {
      if (!players.length) return;
      const p = players[Math.floor(Math.random()*Math.min(10,players.length))];
      if (!p) return;
      const xp = [10,25,50,75][Math.floor(Math.random()*4)];
      const id = xpId.current++;
      setXpPops(prev=>[...prev,{id,name:p.name,xp}]);
      setTimeout(()=>setXpPops(prev=>prev.filter(x=>x.id!==id)),2500);
    },4000);
    return()=>clearInterval(interval);
  },[players]);

  // Live notifications per domain
  useEffect(() => {
    const msgs = LIVE_NOTIFICATIONS[domain]||LIVE_NOTIFICATIONS.developer;
    const interval = setInterval(() => {
      const msg = msgs[Math.floor(Math.random()*msgs.length)];
      const id = notifId.current++;
      setNotifications(prev=>[...prev.slice(-2),{id,msg}]);
      setTimeout(()=>setNotifications(prev=>prev.filter(n=>n.id!==id)),4000);
    },3000);
    return()=>clearInterval(interval);
  },[domain]);

  const top3 = players.slice(0,3);
  const rest  = players.slice(3);
  const currentUser = players.find(p=>p.isCurrentUser);
  const xpToNext = currentUser && players[currentUser.rank-2]
    ? players[currentUser.rank-2].score - currentUser.score : 0;
  const domainInfo = DOMAINS.find(d=>d.id===domain)!;

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

      {/* Notifications */}
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

                {/* Tools grid */}
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

                {/* Higher tier rewards preview */}
                <div style={s.higherTierWrap}>
                  <div style={s.higherTierTitle}>🔓 Longer streaks = more access</div>
                  <div style={s.higherTierRow}>
                    {[
                      {days:"100 days", reward:"1 Week AI", color:"#ffd700"},
                      {days:"150 days", reward:"1 Month AI", color:"#22c55e"},
                      {days:"200 days", reward:"3 Months AI", color:"#6366f1"},
                      {days:"365 days", reward:"1 Year AI", color:"#ef4444"},
                    ].map((t,i)=>(
                      <div key={i} style={{...s.tierPill,borderColor:`${t.color}40`}}>
                        <span style={{fontSize:"0.62rem",color:t.color,fontWeight:700}}>{t.days}</span>
                        <span style={{fontSize:"0.6rem",color:"#475569"}}>{t.reward}</span>
                      </div>
                    ))}
                  </div>
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
                  Activation instructions have been sent to your registered email. You'll receive access within 24 hours. Keep your streak going for longer access!
                </div>
                <div style={s.nextRewardCard}>
                  <div style={{fontSize:"0.72rem",color:"#475569",marginBottom:"4px"}}>Next reward at 75 days 🔥</div>
                  <div style={{fontSize:"0.85rem",fontWeight:700,color:"#6366f1"}}>Top 10% badge + profile highlight</div>
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
              <div style={{fontSize:"0.7rem",color:"#475569"}}>Free Plan</div>
            </div>
          </div>
          <button style={s.logoutBtn}><LogOut size={15}/></button>
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
            <button style={s.iconBtn}><Bell size={18}/></button>
            <div style={s.avatarMed}>Y</div>
          </div>
        </div>

        {/* Domain selector */}
        <div style={s.domainRow}>
          {DOMAINS.map(d=>(
            <button key={d.id} onClick={()=>setDomain(d.id)}
              style={{...s.domainBtn,...(domain===d.id?{...s.domainBtnActive,borderColor:`${d.color}60`,color:d.color,background:`${d.color}12`}:{})}}>
              <span style={{fontSize:"1rem"}}>{d.label.split(" ")[0]}</span>
              <div>
                <div style={{fontSize:"0.75rem",fontWeight:700}}>{d.label.split(" ").slice(1).join(" ")}</div>
                <div style={{fontSize:"0.62rem",color:"#475569",fontWeight:400}}>{d.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Domain header */}
        <div style={{...s.domainHeader,borderColor:`${domainInfo?.color}30`,background:`${domainInfo?.color}08`}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{fontSize:"1.4rem"}}>{domainInfo?.label.split(" ")[0]}</div>
            <div>
              <div style={{fontSize:"0.95rem",fontWeight:700,color:"white"}}>{domainInfo?.label.split(" ").slice(1).join(" ")} Leaderboard</div>
              <div style={{fontSize:"0.72rem",color:"#475569"}}>{domainInfo?.desc} · {players.length} competitors</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"8px"}}>
            <div style={{...s.livePill,borderColor:`${domainInfo?.color}40`,color:domainInfo?.color,background:`${domainInfo?.color}15`}}>
              <div style={{...s.liveDot,background:domainInfo?.color}}/>Active
            </div>
          </div>
        </div>

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
                  <div style={{...s.podiumAv,border:"2.5px solid #c0c0c0"}}>{top3[1].avatar}</div>
                  <div style={s.podiumName}>{top3[1].name}</div>
                  <div style={{...s.podiumScore,color:"#c0c0c0"}}>{top3[1].score.toLocaleString()}</div>
                  <div style={s.podiumStreak}><Flame size={10} style={{color:"#f97316"}}/>{top3[1].streak}d</div>
                  <div style={{fontSize:"0.62rem",color:leagueColor(top3[1].league),fontWeight:700}}>{top3[1].league}</div>
                  {top3[1].xpLabel&&<div style={{fontSize:"0.62rem",color:"#334155",background:"rgba(255,255,255,0.04)",padding:"1px 6px",borderRadius:"6px",marginTop:"2px"}}>{top3[1].xpLabel}</div>}
                  <div style={{...s.podiumBase,background:"linear-gradient(180deg,rgba(192,192,192,0.2) 0%,transparent 100%)",height:"48px"}}/>
                </div>

                {/* 1st */}
                <div style={{...s.podiumGoldCard}}>
                  <div style={{position:"absolute",top:"-18px",fontSize:"1.8rem",textAlign:"center" as const}}>👑</div>
                  <div style={{...s.podiumGlow,background:"rgba(255,215,0,0.18)",width:"150px",height:"150px",top:"-24px"}}/>
                  <div style={s.podiumRankTag}><Crown size={13} style={{color:"#ffd700"}}/><span style={{color:"#ffd700",fontWeight:800}}>1</span></div>
                  <div style={{...s.podiumAv,width:"68px",height:"68px",fontSize:"1.1rem",border:"3px solid #ffd700"}}>{top3[0].avatar}</div>
                  <div style={{...s.podiumName,fontSize:"0.95rem"}}>{top3[0].name}</div>
                  <div style={{...s.podiumScore,color:"#ffd700",fontSize:"1.15rem"}}>{top3[0].score.toLocaleString()}</div>
                  <div style={s.podiumStreak}><Flame size={10} style={{color:"#f97316"}}/>{top3[0].streak}d streak</div>
                  <div style={{fontSize:"0.65rem",color:leagueColor(top3[0].league),fontWeight:700}}>{top3[0].league}</div>
                  {top3[0].badge&&<div style={{fontSize:"0.62rem",color:"#ffd700",background:"rgba(255,215,0,0.1)",padding:"2px 8px",borderRadius:"8px",border:"1px solid rgba(255,215,0,0.3)",marginTop:"2px"}}>{top3[0].badge}</div>}
                  {top3[0].xpLabel&&<div style={{fontSize:"0.62rem",color:"#334155",background:"rgba(255,255,255,0.04)",padding:"1px 6px",borderRadius:"6px",marginTop:"2px"}}>{top3[0].xpLabel}</div>}
                  <div style={{...s.podiumBase,background:"linear-gradient(180deg,rgba(255,215,0,0.22) 0%,transparent 100%)",height:"68px"}}/>
                </div>

                {/* 3rd */}
                <div style={s.podiumBronzeCard}>
                  <div style={{...s.podiumGlow,background:"rgba(205,127,50,0.12)"}}/>
                  <div style={s.podiumRankTag}><Crown size={13} style={{color:"#cd7f32"}}/><span style={{color:"#cd7f32",fontWeight:800}}>3</span></div>
                  <div style={{...s.podiumAv,border:"2.5px solid #cd7f32"}}>{top3[2].avatar}</div>
                  <div style={s.podiumName}>{top3[2].name}</div>
                  <div style={{...s.podiumScore,color:"#cd7f32"}}>{top3[2].score.toLocaleString()}</div>
                  <div style={s.podiumStreak}><Flame size={10} style={{color:"#f97316"}}/>{top3[2].streak}d</div>
                  <div style={{fontSize:"0.62rem",color:leagueColor(top3[2].league),fontWeight:700}}>{top3[2].league}</div>
                  {top3[2].xpLabel&&<div style={{fontSize:"0.62rem",color:"#334155",background:"rgba(255,255,255,0.04)",padding:"1px 6px",borderRadius:"6px",marginTop:"2px"}}>{top3[2].xpLabel}</div>}
                  <div style={{...s.podiumBase,background:"linear-gradient(180deg,rgba(205,127,50,0.18) 0%,transparent 100%)",height:"38px"}}/>
                </div>
              </div>
            )}

            {/* Rank list 4–18 */}
            <div style={s.rankList}>
              {rest.map(player=>{
                const moved = player.rank - player.prevRank;
                const isUser = player.isCurrentUser;
                return (
                  <div key={player.id} style={{...s.rankRow,...(isUser?s.rankRowUser:{})}}>
                    <div style={{...s.rankNum,color:isUser?"#6366f1":"#475569"}}>{player.rank}</div>
                    <div style={{width:"28px",textAlign:"center" as const}}>
                      {moved<0?<span style={{fontSize:"0.68rem",color:"#22c55e",fontWeight:700}}>↑{Math.abs(moved)}</span>
                        :moved>0?<span style={{fontSize:"0.68rem",color:"#ef4444",fontWeight:700}}>↓{moved}</span>
                        :<span style={{fontSize:"0.68rem",color:"#334155"}}>—</span>}
                    </div>
                    <div style={{...s.listAv,background:isUser?"linear-gradient(135deg,#6366f1,#3b82f6)":"rgba(255,255,255,0.05)",border:`1.5px solid ${leagueColor(player.league)}33`}}>{player.avatar}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap" as const}}>
                        <span style={{fontSize:"0.87rem",fontWeight:isUser?700:500,color:isUser?"white":"#e2e8f0"}}>{player.name}</span>
                        {player.isPremium&&<span style={s.proBadge}>PRO</span>}
                        {isUser&&<span style={s.youBadge}>YOU</span>}
                        {player.xpLabel&&<span style={{fontSize:"0.62rem",color:"#334155",background:"rgba(255,255,255,0.04)",padding:"1px 6px",borderRadius:"5px"}}>{player.xpLabel}</span>}
                      </div>
                      {player.badge&&<div style={{fontSize:"0.65rem",color:leagueColor(player.league),marginTop:"1px"}}>{player.badge}</div>}
                    </div>
                    <div style={s.streakCell}><Flame size={11} style={{color:"#f97316"}}/><span>{player.streak}d</span></div>
                    <div style={{fontSize:"0.88rem",fontWeight:700,color:isUser?"#6366f1":"#94a3b8",minWidth:"72px",textAlign:"right" as const}}>{player.score.toLocaleString()}</div>
                    <div style={{...s.leaguePill,background:`${leagueColor(player.league)}15`,color:leagueColor(player.league)}}>{player.league}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right col ── */}
          <div style={s.rightCol}>

            {/* Your stats */}
            {currentUser && (
              <div style={s.yourCard}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
                  <div style={{fontSize:"0.72rem",fontWeight:700,color:domainInfo?.color,letterSpacing:"0.06em",textTransform:"uppercase" as const}}>YOUR RANK — {domainInfo?.label.split(" ").slice(1).join(" ")}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"14px"}}>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"2.4rem",fontWeight:800,color:domainInfo?.color}}>#{currentUser.rank}</div>
                  <div>
                    <div style={{fontSize:"0.78rem",fontWeight:600,color:"white"}}>{currentUser.score.toLocaleString()} XP</div>
                    <div style={{fontSize:"0.68rem",color:"#475569"}}>League: <span style={{color:leagueColor(currentUser.league)}}>{currentUser.league}</span></div>
                    <div style={{fontSize:"0.68rem",color:"#f97316"}}>{currentUser.streak}d 🔥 streak</div>
                  </div>
                </div>
                {xpToNext > 0 && (
                  <div style={{marginBottom:"12px"}}>
                    <div style={{fontSize:"0.72rem",color:"#475569",marginBottom:"6px"}}>
                      Only <strong style={{color:domainInfo?.color}}>{xpToNext} XP</strong> to reach Rank #{currentUser.rank-1} 🚀
                    </div>
                    <div style={s.xpBar}><div style={{...s.xpFill,width:`${Math.max(8,100-(xpToNext/300)*100)}%`,background:domainInfo?.color}}/></div>
                  </div>
                )}
                <button style={{...s.challengeBtn,borderColor:`${domainInfo?.color}30`,color:domainInfo?.color}} onClick={()=>alert("Challenge sent! ⚔️")}>
                  ⚔️ Challenge Rank #{(currentUser.rank||2)-1}
                </button>
              </div>
            )}

            {/* Streak rewards */}
            <div style={s.rewardsCard}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
                <div style={{fontSize:"0.88rem",fontWeight:700,color:"white"}}>🎁 Streak Rewards</div>
                <button style={s.claimSmallBtn} onClick={()=>setShowRewardModal(true)}>Claim →</button>
              </div>
              {STREAK_REWARDS.map((r,i)=>{
                const unlocked = (currentUser?.streak||18) >= r.days;
                return (
                  <div key={i} style={{...s.rewardRow,...(r.isSpecial?s.rewardRowSpecial:{}),background:unlocked?(r.isSpecial?"rgba(99,102,241,0.08)":"rgba(34,197,94,0.04)"):"transparent",borderColor:unlocked?(r.isSpecial?"rgba(99,102,241,0.25)":"rgba(34,197,94,0.15)"):"rgba(255,255,255,0.04)"}}>
                    <div style={{fontSize:"1rem",flexShrink:0}}>{r.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                        <span style={{fontSize:"0.68rem",fontWeight:800,color:unlocked?r.color:"#334155"}}>{r.days}d</span>
                        <span style={{fontSize:"0.72rem",fontWeight:700,color:unlocked?"white":"#475569"}}>{r.title}</span>
                        {r.isSpecial&&<span style={{fontSize:"0.55rem",padding:"1px 5px",borderRadius:"5px",background:"rgba(99,102,241,0.2)",color:"#818cf8",fontWeight:700}}>SPECIAL</span>}
                      </div>
                      <div style={{fontSize:"0.68rem",color:unlocked?"#64748b":"#334155",marginTop:"1px"}}>{r.desc}</div>
                    </div>
                    {unlocked?<Check size={13} style={{color:"#22c55e",flexShrink:0}}/>:<Lock size={11} style={{color:"#334155",flexShrink:0}}/>}
                  </div>
                );
              })}
            </div>

            {/* Monthly rank rewards */}
            <div style={s.monthlyCard}>
              <div style={{fontSize:"0.88rem",fontWeight:700,color:"white",marginBottom:"12px"}}>📅 Monthly Top Rewards</div>
              {[
                {rank:"#1",reward:"1 Year AI Subscription",sub:"User picks tool · + ₹10,000 cash", color:"#ffd700",icon:"👑"},
                {rank:"#2",reward:"6 Month AI Access",        sub:"+ ₹5,000 cash reward",            color:"#c0c0c0",icon:"🥈"},
                {rank:"#3",reward:"3 Month AI Access",        sub:"+ ₹2,000 cash reward",            color:"#cd7f32",icon:"🥉"},
                {rank:"4–10",reward:"AI Credits Bundle",      sub:"Premium trial + early access",     color:"#6366f1",icon:"⭐"},
                {rank:"11–20",reward:"XP Boost + Badge",     sub:"Visible on profile",               color:"#475569",icon:"🎯"},
              ].map((r,i)=>(
                <div key={i} style={s.monthlyRow}>
                  <span style={{fontSize:"1rem"}}>{r.icon}</span>
                  <span style={{fontSize:"0.72rem",fontWeight:700,color:r.color,minWidth:"36px"}}>{r.rank}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.75rem",fontWeight:600,color:"white"}}>{r.reward}</div>
                    <div style={{fontSize:"0.65rem",color:"#475569"}}>{r.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Tools preview */}
            <div style={s.aiToolsCard}>
              <div style={{fontSize:"0.88rem",fontWeight:700,color:"white",marginBottom:"4px"}}>🤖 Available AI Rewards</div>
              <div style={{fontSize:"0.7rem",color:"#475569",marginBottom:"12px"}}>50-day streak → Choose any one for 1 week free</div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {AI_TOOLS.map(tool=>(
                  <div key={tool.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",background:`${tool.color}08`,borderRadius:"8px",border:`1px solid ${tool.color}25`}}>
                    <span style={{fontSize:"1rem"}}>{tool.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"white"}}>{tool.name}</div>
                      <div style={{fontSize:"0.62rem",color:"#475569"}}>{tool.company}</div>
                    </div>
                    <div style={{fontSize:"0.6rem",fontWeight:700,color:tool.color,padding:"2px 6px",borderRadius:"6px",background:`${tool.color}15`,border:`1px solid ${tool.color}30`}}>1 WK</div>
                  </div>
                ))}
              </div>
              <button style={{...s.claimSmallBtn,width:"100%",marginTop:"10px",padding:"8px"}} onClick={()=>setShowRewardModal(true)}>
                View & Claim Reward →
              </button>
            </div>

            {/* League system */}
            <div style={s.leagueCard}>
              <div style={{fontSize:"0.88rem",fontWeight:700,color:"white",marginBottom:"10px"}}>🏅 League System</div>
              {LEAGUES.map(l=>{
                const isCurrentLeague = currentUser?.league===l.name;
                return(
                  <div key={l.name} style={{...s.leagueRow,...(isCurrentLeague?{background:`${l.color}10`,border:`1px solid ${l.color}30`}:{})}}>
                    <div style={{width:"8px",height:"8px",borderRadius:"50%",background:l.color,flexShrink:0}}/>
                    <span style={{fontSize:"0.78rem",fontWeight:700,color:l.color}}>{l.name}</span>
                    <span style={{fontSize:"0.65rem",color:"#334155",marginLeft:"auto"}}>{l.min.toLocaleString()}+ XP</span>
                    {isCurrentLeague&&<span style={{fontSize:"0.62rem",color:l.color,marginLeft:"4px"}}>← You</span>}
                  </div>
                );
              })}
            </div>

            {/* Elite locked */}
            <div style={s.eliteLocked} onClick={()=>setShowUpgradeModal(true)}>
              <Lock size={16} style={{color:"#ffd700"}}/>
              <div>
                <div style={{fontSize:"0.82rem",fontWeight:700,color:"#ffd700"}}>🔒 Elite League</div>
                <div style={{fontSize:"0.68rem",color:"#64748b"}}>Double XP, elite rewards, priority ranking</div>
              </div>
              <ChevronRight size={14} style={{color:"#475569",marginLeft:"auto"}}/>
            </div>
          </div>
        </div>
        <div style={{height:"40px"}}/>
      </main>

      <style>{`
        @keyframes xpFloat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-60px);opacity:0}}
        @keyframes notifIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.3}}
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
  root:{display:"flex",minHeight:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",position:"relative",overflow:"hidden"},
  bg:{position:"fixed",inset:0,background:"linear-gradient(135deg,#020818 0%,#060f22 50%,#02091a 100%)",zIndex:0},
  bgGrid:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px)",backgroundSize:"48px 48px",zIndex:0},
  glow1:{position:"fixed",top:"-20%",left:"-10%",width:"600px",height:"600px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},
  glow2:{position:"fixed",bottom:"-20%",right:"5%",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,215,0,0.05) 0%,transparent 70%)",zIndex:0,pointerEvents:"none"},
  xpPopsWrap:{position:"fixed",bottom:"120px",right:"24px",zIndex:200,display:"flex",flexDirection:"column",gap:"6px",pointerEvents:"none"},
  xpPop:{padding:"6px 12px",background:"rgba(6,15,34,0.95)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"20px",fontSize:"0.78rem",animation:"xpFloat 2.5s ease-out forwards",backdropFilter:"blur(10px)"},
  notifWrap:{position:"fixed",top:"80px",right:"24px",zIndex:200,display:"flex",flexDirection:"column",gap:"8px",pointerEvents:"none"},
  notif:{padding:"10px 16px",background:"rgba(6,15,34,0.95)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:"12px",fontSize:"0.78rem",color:"#94a3b8",maxWidth:"280px",animation:"notifIn 0.4s ease",backdropFilter:"blur(16px)",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"},
  modal:{position:"relative",background:"rgba(6,15,34,0.99)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:"20px",padding:"28px",maxWidth:"620px",width:"95%",maxHeight:"90vh",overflowY:"auto"},
  modalClose:{position:"absolute",top:"16px",right:"16px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"#64748b",cursor:"pointer",padding:"4px",display:"flex"},
  modalHead:{textAlign:"center" as const,marginBottom:"24px"},
  modalTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.5rem",fontWeight:700,color:"white",margin:"4px 0"},
  modalSub:{fontSize:"0.85rem",color:"#64748b",marginBottom:"4px"},
  modalSubSmall:{fontSize:"0.72rem",color:"#334155"},
  toolsGrid:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"16px"},
  toolCard:{position:"relative",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"4px",padding:"14px 8px 10px",borderRadius:"12px",cursor:"pointer",transition:"all .2s",textAlign:"center" as const},
  toolSelected:{position:"absolute",top:"8px",right:"8px",width:"18px",height:"18px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"white"},
  higherTierWrap:{padding:"12px 14px",background:"rgba(255,255,255,0.02)",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.06)",marginBottom:"16px"},
  higherTierTitle:{fontSize:"0.72rem",color:"#475569",fontWeight:600,marginBottom:"8px"},
  higherTierRow:{display:"flex",gap:"6px",flexWrap:"wrap" as const},
  tierPill:{padding:"4px 10px",borderRadius:"8px",border:"1px solid",background:"rgba(255,255,255,0.02)",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"2px"},
  claimBtn:{width:"100%",padding:"12px",background:"linear-gradient(135deg,rgba(99,102,241,0.3),rgba(59,130,246,0.2))",border:"1px solid rgba(99,102,241,0.4)",borderRadius:"12px",color:"#a5b4fc",fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:"4px"},
  claimedWrap:{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"12px",padding:"12px 0"},
  nextRewardCard:{padding:"12px 16px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"10px",textAlign:"center" as const,width:"100%"},
  upgradeFeature:{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:"rgba(99,102,241,0.05)",borderRadius:"10px",border:"1px solid rgba(99,102,241,0.12)"},
  sidebar:{position:"fixed",left:0,top:0,bottom:0,width:"220px",background:"rgba(6,15,34,0.95)",backdropFilter:"blur(20px)",borderRight:"1px solid rgba(255,255,255,0.05)",display:"flex",flexDirection:"column",zIndex:10,padding:"0 0 20px"},
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
  main:{marginLeft:"220px",flex:1,padding:"0 24px 0",position:"relative",zIndex:1,maxWidth:"calc(100vw - 220px)",overflowX:"hidden"},
  topbar:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 0 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",marginBottom:"16px"},
  backBtn:{display:"flex",alignItems:"center",gap:"5px",padding:"7px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",color:"#64748b",fontSize:"0.8rem",cursor:"pointer",fontFamily:"inherit"},
  pageTitle:{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.4rem",fontWeight:700,color:"white"},
  livePill:{display:"flex",alignItems:"center",gap:"5px",padding:"3px 10px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"20px",fontSize:"0.7rem",color:"#22c55e",fontWeight:600},
  liveDot:{width:"6px",height:"6px",borderRadius:"50%",background:"#22c55e",animation:"livePulse 1.5s ease-in-out infinite"},
  iconBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"7px",color:"#64748b",cursor:"pointer",display:"flex"},
  avatarMed:{width:"34px",height:"34px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#3b82f6)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"},
  domainRow:{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap" as const},
  domainBtn:{display:"flex",alignItems:"center",gap:"8px",padding:"8px 14px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.02)",color:"#475569",fontSize:"0.78rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"},
  domainBtnActive:{},
  domainHeader:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:"12px",border:"1px solid",marginBottom:"16px"},
  layout:{display:"flex",gap:"18px",alignItems:"flex-start"},
  leftCol:{flex:1,minWidth:0},
  rightCol:{width:"278px",flexShrink:0,display:"flex",flexDirection:"column",gap:"12px"},
  timeTabs:{display:"flex",gap:"4px",marginBottom:"16px",background:"rgba(255,255,255,0.02)",padding:"4px",borderRadius:"12px",border:"1px solid rgba(255,255,255,0.06)"},
  timeTab:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"5px",padding:"7px 8px",borderRadius:"8px",border:"none",background:"none",color:"#475569",fontSize:"0.72rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"},
  timeTabActive:{background:"rgba(99,102,241,0.15)",color:"white"},
  mainBadge:{fontSize:"0.52rem",padding:"1px 5px",borderRadius:"5px",background:"rgba(255,215,0,0.15)",color:"#ffd700",border:"1px solid rgba(255,215,0,0.25)",letterSpacing:"0.03em"},
  podiumWrap:{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:"10px",marginBottom:"20px",padding:"20px 12px 0"},
  podiumGoldCard:{position:"relative",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"5px",padding:"22px 12px 0",borderRadius:"16px",border:"1px solid rgba(255,215,0,0.2)",background:"rgba(255,215,0,0.03)",width:"148px",overflow:"hidden",transform:"translateY(-18px)"},
  podiumSilverCard:{position:"relative",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"5px",padding:"18px 12px 0",borderRadius:"16px",border:"1px solid rgba(192,192,192,0.15)",background:"rgba(192,192,192,0.02)",width:"132px",overflow:"hidden"},
  podiumBronzeCard:{position:"relative",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"5px",padding:"16px 12px 0",borderRadius:"16px",border:"1px solid rgba(205,127,50,0.15)",background:"rgba(205,127,50,0.02)",width:"128px",overflow:"hidden"},
  podiumGlow:{position:"absolute",top:"-10px",left:"50%",transform:"translateX(-50%)",width:"110px",height:"110px",borderRadius:"50%",filter:"blur(28px)",pointerEvents:"none"},
  podiumRankTag:{display:"flex",alignItems:"center",gap:"3px",fontSize:"0.8rem"},
  podiumAv:{width:"52px",height:"52px",borderRadius:"50%",background:"rgba(99,102,241,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.88rem",fontWeight:700,color:"white"},
  podiumName:{fontSize:"0.8rem",fontWeight:700,color:"white",textAlign:"center" as const,lineHeight:1.2},
  podiumScore:{fontSize:"0.95rem",fontWeight:800,textAlign:"center" as const},
  podiumStreak:{display:"flex",alignItems:"center",gap:"3px",fontSize:"0.7rem",color:"#94a3b8"},
  podiumBase:{width:"100%",marginTop:"8px",borderRadius:"0 0 14px 14px"},
  rankList:{display:"flex",flexDirection:"column" as const,gap:"4px"},
  rankRow:{display:"flex",alignItems:"center",gap:"8px",padding:"9px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"10px",transition:"all .2s"},
  rankRowUser:{background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.25)"},
  rankNum:{width:"24px",fontSize:"0.85rem",fontWeight:800,textAlign:"center" as const,flexShrink:0},
  listAv:{width:"30px",height:"30px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.68rem",fontWeight:700,color:"white",flexShrink:0},
  proBadge:{fontSize:"0.52rem",padding:"1px 4px",borderRadius:"4px",background:"rgba(255,215,0,0.15)",color:"#ffd700",border:"1px solid rgba(255,215,0,0.25)",fontWeight:700},
  youBadge:{fontSize:"0.52rem",padding:"1px 4px",borderRadius:"4px",background:"rgba(99,102,241,0.2)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.3)",fontWeight:700},
  streakCell:{display:"flex",alignItems:"center",gap:"3px",fontSize:"0.7rem",color:"#64748b",minWidth:"38px"},
  leaguePill:{fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:"7px",letterSpacing:"0.03em"},
  yourCard:{padding:"16px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"14px"},
  xpBar:{height:"4px",background:"rgba(255,255,255,0.06)",borderRadius:"2px",overflow:"hidden"},
  xpFill:{height:"100%",borderRadius:"2px",transition:"width 0.5s ease"},
  challengeBtn:{width:"100%",padding:"8px",background:"rgba(255,255,255,0.02)",border:"1px solid",borderRadius:"9px",fontSize:"0.78rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  rewardsCard:{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px"},
  claimSmallBtn:{padding:"4px 12px",background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:"8px",color:"#818cf8",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"},
  rewardRow:{display:"flex",alignItems:"center",gap:"8px",padding:"7px 8px",borderRadius:"8px",marginBottom:"4px",border:"1px solid transparent",transition:"all .2s"},
  rewardRowSpecial:{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)"},
  monthlyCard:{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px"},
  monthlyRow:{display:"flex",alignItems:"center",gap:"8px",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  aiToolsCard:{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px"},
  leagueCard:{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px"},
  leagueRow:{display:"flex",alignItems:"center",gap:"8px",padding:"6px 8px",borderRadius:"7px",marginBottom:"3px",border:"1px solid transparent",transition:"all .2s"},
  eliteLocked:{display:"flex",alignItems:"center",gap:"10px",padding:"12px 14px",background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"12px",cursor:"pointer",transition:"all .2s"},
};