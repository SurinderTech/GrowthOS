<h1 align="center">
  <br>
  <img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExb3M3ajBwZ3F4ZTY0aXBlc3pwMW5zbnhiYjM2a2w1ZjNmeHIxYnBmMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dBZU8FAGD5R2gFWB2L/giphy.gif" alt="GrowthOS Header Banner" width="80%">
  <br>
  GrowthOS
  <br>
</h1>

<h4 align="center">The World's First AI-Driven Personal Execution Operating System</h4>

<p align="center">
  <i>"This is not an app you open. This is an environment you live in."</i>
</p>

<p align="center">
  <a href="#-tech-stack-matrix"><img src="https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js" alt="Next.js 16"></a>
  <a href="#-tech-stack-matrix"><img src="https://img.shields.io/badge/FastAPI-0.111.0-009688?style=for-the-badge&logo=fastapi" alt="FastAPI"></a>
  <a href="#-the-nova-ai-engine--multi-agent-architecture"><img src="https://img.shields.io/badge/LangGraph-Engine-FF6F61?style=for-the-badge&logo=chainlink" alt="LangGraph"></a>
  <a href="#-the-nova-ai-engine--multi-agent-architecture"><img src="https://img.shields.io/badge/OpenRouter-AI Router-7C3AED?style=for-the-badge" alt="OpenRouter AI"></a>
  <a href="#-tech-stack-matrix"><img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL"></a>
  <a href="#-tech-stack-matrix"><img src="https://img.shields.io/badge/WebSockets-Realtime Battles-000000?style=for-the-badge" alt="WebSockets"></a>
</p>

<p align="center">
  <a href="#-what-is-growthos">Overview</a> •
  <a href="#-community--investor-validation-callout">Feedback Poll</a> •
  <a href="#-the-nova-ai-engine--multi-agent-architecture">NOVA AI Engine</a> •
  <a href="#-ai-orchestration-layer">Agent Orchestrator</a> •
  <a href="#-core-product-features">Features</a> •
  <a href="#-visual-showcase--ui-gallery">UI Gallery</a> •
  <a href="#-local-development-setup">Setup</a> •
  <a href="#-api-reference">API Docs</a>
</p>

---

> [!IMPORTANT]
> ### 📢 COMMUNITY & INVESTOR VALIDATION CALLOUT
> **"Is Passive Learning & Distraction Killing Personal Execution?"**
> 
> We built **GrowthOS** because we believe **talent is everywhere, but execution environments are rare**. Most developers, engineers, and students do not fail because of a lack of learning resources—they fail because of **tutorial hell, decision fatigue, zero real-time accountability, and digital distraction**.
> 
> #### 💬 We Want Your Feedback (Help Us Validate & Shape GrowthOS):
> 1. **The Core Problem**: Do you agree that passive video watching (Coursera/YouTube/Udemy) creates a false illusion of productivity without actual skill building?
> 2. **Problem Authenticity Rate**: How genuine is this problem in your experience? **What percentage (1% to 100%) would you give this issue?**
> 3. **The Solution**: Is an **AI-Enforced Operating System** (where human sets vision, AI orchestrates execution, and peers hold you accountable) the future of personal growth?
> 
> 💬 **[Click Here to Submit Feedback & Join the Discussion](../../issues)** | 🌟 **Star this repository if you believe execution environments matter!**

---

## 📋 Table of Contents

- [💡 Executive Summary \& Product Vision](#-executive-summary--product-vision)
- [🎯 Target Audience \& User Personas](#-target-audience--user-personas)
- [🥊 Problem Statement \& Competitive Landscape](#-problem-statement--competitive-landscape)
- [🌌 The NOVA AI Engine \& Multi-Agent Architecture](#-the-nova-ai-engine--multi-agent-architecture)
  - [1. NOVA Engine (LangGraph State Machine)](#1-nova-engine-langgraph-state-machine)
  - [2. Dual-Layered Memory Architecture](#2-dual-layered-memory-architecture)
  - [3. Knowledge Base, RAG \& Web Research Fallback](#3-knowledge-base-rag--web-research-fallback)
- [🤖 AI Orchestration Layer \& Specialized Agents](#-ai-orchestration-layer--specialized-agents)
  - [The 8 Autonomous AI Agents](#the-8-autonomous-ai-agents)
- [⚔️ Core Product Features](#️-core-product-features)
  - [1. Practice Arena (The Execution Battlefield)](#1-practice-arena-the-execution-battlefield)
  - [2. Living Orbit AI Command Center](#2-living-orbit-ai-command-center)
  - [3. Execution Lab \& Focus Mode](#3-execution-lab--focus-mode)
  - [4. Streak \& Consistency Heatmap 🔥](#4-streak--consistency-heatmap-)
  - [5. Leaderboard \& WebSocket Coding Battles ⚔️](#5-leaderboard--websocket-coding-battles-️)
  - [6. Live Opportunities Engine ](#6-live-opportunities-engine-)
- [ Visual Showcase \& UI Gallery](#️-visual-showcase--ui-gallery)
- [🧬 End-to-End System Topology](#-end-to-end-system-topology)
- [🛠 Tech Stack Matrix](#-tech-stack-matrix)
- [💻 Local Development Setup](#-local-development-setup)
- [📡 API Reference](#-api-reference)
- [ SaaS Scalability Roadmap](#-saas-scalability-roadmap)
- [📬 Contact \& Creator](#-contact--creator)

---

##  Executive Summary & Product Vision

**GrowthOS** is a zero-to-one, SaaS-grade **AI-Driven Personal Execution Operating System**. 

Unlike standard productivity tools or learning platforms, GrowthOS does not sit idle waiting for you to organize your life. It turns the internet into a structured, high-stakes battlefield inspired by competitive tech ecosystems like Silicon Valley. 

```
                                  THE GROWTHOS PARADIGM
  ┌───────────────────┐        ┌───────────────────────────┐        ┌───────────────────────────┐
  │   HUMAN USER      │ ─────► │   GROWTHOS SYSTEM         │ ─────► │   NOVA & AGENT ENGINE     │
  │   Sets Vision     │        │   Enforces Accountability │        │   Orchestrates Execution  │
  └───────────────────┘        └───────────────────────────┘        └───────────────────────────┘
```

In GrowthOS:
- **Human** = Vision, Goal Setting, and Higher-Level Intent.
- **AI Engine (NOVA + Agents)** = Execution Engine, Task Decomposition, Weakness Identification, and Adaptive Mentorship.
- **GrowthOS** = The Operating System connecting vision to daily execution with real-time pressure, peer challenges, and automated consistency tracking.

---

## 🎯 Target Audience & User Personas

GrowthOS is custom-engineered for high-output individuals who need structure over motivation:

| Persona | Core Needs | GrowthOS Solution |
| :--- | :--- | :--- |
| **💻 Software Engineers & CS Students** | DSA problem solving, multi-language coding, system design, resume ATS optimization, mock interviews. | **Practice Arena** with built-in Monaco compiler (C++, Python, Java), **Interview Agent**, **Resume Agent**, and 1v1 WebSocket coding battles. |
| **🎓 Competitive Exam Aspirants (JEE/NEET/UPSC/SSC)** | Time-boxed problem solving, numerical/objective practice, distraction elimination, subject-specific revision. | **Exam Simulation Mode** (30 Qs timed sprints), step-based Math/Physics/Chemistry solvers, automated study target generation. |
| **🚀 SaaS Founders & Tech Builders** | Sprint planning, habit formation, outreach CRM, project execution, deep work focus. | **Task Planning Agent**, **Networking Agent** (outreach CRM), **Project Agent**, and **Execution Lab** focus timer. |

---

## 🥊 Problem Statement & Competitive Landscape

### The Genuine Problem: The Passive Learning Trap
1. **Tutorial Hell & Consumption Addiction**: Users spend hundreds of hours watching video courses, bookmarking articles, and hoarding tabs—yet struggle to write clean code or solve unseen exam problems.
2. **Decision Fatigue**: Every morning, users ask *"What should I study today?"*, leading to procrastination and lost momentum.
3. **Zero Post-Course Accountability**: Once a video or goal is set, there is no system tracking daily effort or applying consequences when momentum drops.

### 0-to-1 Innovation: Why No Competitor Exists
GrowthOS is **the first unified system** combining automated goal decomposition, multi-agent AI mentoring, real-time code/exam sandboxing, and peer battle leagues into a single command center.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                COMPETITIVE MATRIX                                      │
├───────────────────┬──────────────┬───────────────┬────────────────┬────────────────────┤
│ Feature           │ LeetCode/GFG │ Udemy/Coursera│ Notion/Todoist │ GrowthOS           │
├───────────────────┼──────────────┼───────────────┼────────────────┼────────────────────┤
│ Focus Area        │ Coding Only  │ Video Content │ Manual Notes   │ Full Execution OS  │
│ AI Orchestration  │ ❌ None      │ ❌ Basic Q&A  │ ❌ Static Text │ ✅ NOVA State Machine│
│ Autonomous Agents │ ❌ None      │ ❌ None       │ ❌ None        │ ✅ 8 Multi-Agents  │
│ Daily Action Plan │ ❌ Manual    │ ❌ Passive    │ ❌ Manual      │ ✅ Auto-Generated  │
│ Exam Simulation   │ ❌ No        │ ❌ No         │ ❌ No          │ ✅ Timed Mode      │
│ Realtime Battles  │ ⚠️ Limited   │ ❌ No         │ ❌ No          │ ✅ WebSocket Arena │
│ Multi-Layer Memory│ ❌ No        │ ❌ No         │ ❌ No          │ ✅ Dual Postgres RAG│
└───────────────────┴──────────────┴───────────────┴────────────────┴────────────────────┘
```

---

## 🌌 The NOVA AI Engine & Multi-Agent Architecture

At the core of GrowthOS lies **NOVA** (Next-gen Orchestrated Virtual Assistant), a state-machine driven AI engine powered by **LangGraph**, combined with an **AI Orchestrator** managing specialized autonomous agents.

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (Next.js 16)"]
        UI["Orbit Command Center / Practice Arena"]
    end

    subgraph FastAPILayer ["FastAPI Routing Layer"]
        Router["/api/nova/chat | /agents/*"]
    end

    subgraph OrchestratorLayer ["AI Orchestrator Engine (Backend/ai/orchestrator.py)"]
        Orch["Orchestrator Registry & Context Builder"]
        ModelRouter["ModelRouter (TaskType ➔ OpenRouter Client)"]
    end

    subgraph NovaEngine ["NOVA LangGraph State Machine (Backend/nova/graph/)"]
        START([START]) --> LoadContext["load_context_node"]
        LoadContext --> Reason["reason_node"]
        
        Reason --> Route{route_decision}
        
        Route -->|"knowledge"| ExecKnowledge["execute_knowledge"]
        Route -->|"plan"| ExecPlan["execute_plan"]
        Route -->|"progress"| ExecProgress["execute_progress"]
        Route -->|"adaptive"| ExecAdapt["execute_adaptive"]
        Route -->|"research"| ExecResearch["execute_research"]
        Route -->|"direct"| GenResponse["generate_response"]

        ExecKnowledge --> GenResponse
        ExecPlan --> GenResponse
        ExecProgress --> GenResponse
        ExecAdapt --> GenResponse
        ExecResearch --> GenResponse

        GenResponse --> Critic["critic_node (Quality Control)"]
        
        Critic -->|Pass / Clarify| UpdateMem["update_memory_node"]
        Critic -->|Revise / Re-plan| Reason
        
        UpdateMem --> END([END])
    end

    subgraph MemoryStore ["Database & Persistence"]
        DB[(PostgreSQL Database)]
        VecStore[(Vector / Semantic Store)]
    end

    UI <--> Router
    Router <--> Orch
    Orch <--> NovaEngine
    NovaEngine <--> MemoryStore
```

### 1. NOVA Engine (LangGraph State Machine)
Located in [`Backend/nova/graph/builder.py`](file:///c:/Users/surin/GrowthOS-1/Backend/nova/graph/builder.py), the NOVA engine executes every conversation turn through a cyclic state machine:
- **`load_context_node`**: Fetches user profile, active streaks, pending missions, and active memories.
- **`reason_node`**: Analyzes user input and determines intent (planning, study retrieval, progress review, or web research).
- **`critic_node`**: Verifies response quality, accuracy, and alignment with user goals before displaying the output.
- **`update_memory_node`**: Extracts key user facts and persist them automatically.

### 2. Dual-Layered Memory Architecture
Defined in [`Backend/nova/memory/manager.py`](file:///c:/Users/surin/GrowthOS-1/Backend/nova/memory/manager.py):
- **Episodic Memory**: Tracks short-term user activities, session logs, and daily execution events.
- **Semantic Memory**: Stores persistent facts (e.g., target role, weak subjects, preferred programming language, exam date).
- **Deduplication & Decay**: Automatically scores memory confidence, applies temporal decay, and prevents redundant memory writes.

### 3. Knowledge Base, RAG & Web Research Fallback
Located in [`Backend/nova/knowledge/manager.py`](file:///c:/Users/surin/GrowthOS-1/Backend/nova/knowledge/manager.py) and [`Backend/nova/research/engine.py`](file:///c:/Users/surin/GrowthOS-1/Backend/nova/research/engine.py):
- Allows users to ingest study notes and documentation into a PostgreSQL vector store.
- Performs vector similarity search with automated web search fallback if internal knowledge confidence is low.

---

## 🤖 AI Orchestration Layer & Specialized Agents

The system orchestrator located at [`Backend/ai/orchestrator.py`](file:///c:/Users/surin/GrowthOS-1/Backend/ai/orchestrator.py) acts as the single entry point for multi-agent dispatching.

```mermaid
graph LR
    UserRequest[User Action / Trigger] --> Orchestrator[AI Orchestrator]
    
    Orchestrator --> Context[Shared Memory Context]
    
    Context --> Agent1[🎯 Task Planning Agent]
    Context --> Agent2[🛡️ Accountability Coach]
    Context --> Agent3[📊 Progress Analytics]
    Context --> Agent4[🧠 Learning Coach]
    Context --> Agent5[📄 Resume Agent]
    Context --> Agent6[🎙️ Interview Agent]
    Context --> Agent7[🌐 Networking Agent]
    Context --> Agent8[🚀 Project Agent]
    
    Agent1 & Agent2 & Agent3 --> DailyBriefing[Merged Payload: Daily Briefing]
```

### The 8 Autonomous AI Agents

1. 🎯 **Task Planning Agent** ([`task_planning.py`](file:///c:/Users/surin/GrowthOS-1/Backend/ai/agents/task_planning.py)): Deconstructs high-level quarterly goals into actionable daily sprints.
2. 🛡️ **Accountability Coach Agent** ([`accountability_coach.py`](file:///c:/Users/surin/GrowthOS-1/Backend/ai/agents/accountability_coach.py)): Detects procrastination patterns, tracks streak health, and triggers intervention alerts.
3. 📊 **Progress & Analytics Agent** ([`progress_tracking.py`](file:///c:/Users/surin/GrowthOS-1/Backend/ai/agents/progress_tracking.py)): Analyzes daily velocity, completion rates, and visual growth heatmaps.
4. 🧠 **Learning Coach Agent** ([`learning_coach.py`](file:///c:/Users/surin/GrowthOS-1/Backend/ai/agents/learning_coach.py)): Dynamically generates adaptive coding problems and exam test cases based on past weaknesses.
5. 📄 **Resume Agent** ([`resume_agent.py`](file:///c:/Users/surin/GrowthOS-1/Backend/routers/resume_agent.py)): Calculates ATS alignment scores, extracts keyword gaps, and maintains scoring history.
6. 🎙️ **Interview Agent** ([`interview_agent.py`](file:///c:/Users/surin/GrowthOS-1/Backend/routers/interview_agent.py)): Simulates role-specific technical/behavioral interviews with question-by-question AI grading.
7. 🌐 **Networking Agent** ([`networking_agent.py`](file:///c:/Users/surin/GrowthOS-1/Backend/routers/networking_agent.py)): Manages outreach CRM pipelines and auto-generates personalized LinkedIn/Cold Email messages.
8. 🚀 **Project Agent** ([`project_agent.py`](file:///c:/Users/surin/GrowthOS-1/Backend/routers/project_agent.py)): Tracks project building milestones from initial idea stage to GitHub deployment.

---

## ⚔️ Core Product Features

### 1. Practice Arena (The Execution Battlefield)
- **Built-in Browser Compiler**: Write, test, and execute C++, Python, and Java code directly in the browser via Judge0 sandbox integration.
- **Problem Library**: DSA Easy/Medium/Hard curated sets, topic-wise practice (Trees, Graphs, DP).
- **Exam Simulation Mode**: Dedicated examination environment for JEE, NEET, UPSC, and SSC aspirants with 30-question timed tests, objective MCQs, and step-based numerical input.

### 2. Living Orbit AI Command Center
- **Interactive Living Core**: A 3D-styled AI Orb surrounded by 7 counter-rotating agent nodes.
- **Zero-JS GPU Animation**: Built using pure CSS counter-rotation animations for buttery-smooth 60 FPS rendering.
- **Voice Integration**: Built-in speech synthesis and voice recognition for hands-free command input.

### 3. Execution Lab & Focus Mode
- Distraction-free deep work session timer.
- Live active task tracking with real-time performance logging.

### 4. Streak & Consistency Heatmap 🔥
- 365-day GitHub/LeetCode-style activity grid tracking daily execution.
- Visible loss metrics: Miss a day, break your streak, and lose rank visibility.

### 5. Leaderboard & WebSocket Coding Battles ⚔️
- **Global, Batch & Daily Rankings**: Compete with peers across batches and skill levels.
- **1v1 Realtime Arena**: Powered by FastAPI WebSockets ([`arena_ws.py`](file:///c:/Users/surin/GrowthOS-1/Backend/routers/arena_ws.py)) and Battle Engine ([`battle_engine.py`](file:///c:/Users/surin/GrowthOS-1/Backend/services/battle_engine.py)).

### 6. Live Opportunities Engine 🔔
- Automated crawler providing real-time alerts for tech jobs, internships, competitive exam registrations (UPSC, SSC, JEE).

---

## 🖼️ Visual Showcase & UI Gallery

<table>
  <tr>
    <td align="center" width="50%">
      <b>🌌 Living AI Command Center (Orbit Hero)</b><br><br>
      <img src="Screenshot (524).png" width="100%" alt="Command Center Landing">
    </td>
    <td align="center" width="50%">
      <b>⚡ Unified Personal Execution System</b><br><br>
      <img src="Screenshot (525).png" width="100%" alt="Execution System">
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <b>📊 Visual Progress & Tracking Dashboard</b><br><br>
      <img src="Screenshot (529).png" width="100%" alt="Progress Dashboard">
    </td>
    <td align="center" width="50%">
      <b>🔐 Auth & Personalization Onboarding</b><br><br>
      <img src="Screenshot (51).png" width="100%" alt="Auth Onboarding">
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <b>🥊 Problem Validation - Consumption Trap</b><br><br>
      <img src="Screenshot_19-4-2026_21221_.jpeg" width="100%" alt="Problem Infographic 1">
    </td>
    <td align="center" width="50%">
      <b>🎯 Execution vs Excuse Matrix</b><br><br>
      <img src="Screenshot_19-4-2026_21626_.jpeg" width="100%" alt="Problem Infographic 2">
    </td>
  </tr>
</table>

---

## 🧬 End-to-End System Topology

```mermaid
graph TD
    subgraph Client ["Frontend Architecture (Next.js 16 App Router)"]
        Page["app/dashboard/page.tsx (Orbit UI & Nova Panel)"]
        AgentModals["app/dashboard/AgentPanels.tsx (Agent Workspaces)"]
        PracticeUI["app/dashboard/practice/page.tsx (Monaco Editor)"]
    end

    subgraph Backend ["Backend Architecture (FastAPI Python)"]
        Main["Backend/main.py (App Entrypoint & CORS)"]
        
        subgraph Routers ["API Routers"]
            rNova["/api/nova (NOVA Router)"]
            rAgents["/agents (Agents Router)"]
            rPractice["/practice-arena (Compiler & Questions)"]
            rWS["/ws (WebSocket Arena Battles)"]
        end
        
        subgraph CoreAI ["AI Engine Services"]
            Orchestrator["Backend/ai/orchestrator.py"]
            LangGraphEngine["Backend/nova/graph/builder.py"]
            OpenRouter["Backend/ai/openrouter_client.py"]
        end
        
        subgraph Services ["Domain Services"]
            GrowthPlanService["growth_plan_ai.py"]
            PracticeService["practice_arena_service.py"]
            BattleEngine["battle_engine.py"]
        end
        
        subgraph Persistence ["Data & Storage Layer"]
            SQLAlchemy["SQLAlchemy ORM + Alembic"]
            DB[(PostgreSQL Database)]
        end
    end

    Page --> rNova
    Page --> rAgents
    PracticeUI --> rPractice
    AgentModals --> rAgents
    
    rNova --> LangGraphEngine
    rAgents --> Orchestrator
    rWS --> BattleEngine
    
    Orchestrator --> OpenRouter
    LangGraphEngine --> OpenRouter
    
    rPractice --> PracticeService
    rAgents --> Services
    Services --> SQLAlchemy
    SQLAlchemy --> DB
```

---

## 🛠 Tech Stack Matrix

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js | `16.1.6` | App Router, Server Components, Client State Management |
| **UI & Styling** | Tailwind CSS / Framer Motion | `4.2.1` / `12.38` | Cinematic glassmorphism, animations, responsive design |
| **Code Editor** | Monaco Editor | `^4.7.0` | Browser-based code editing (C++, Python, Java) |
| **Backend Framework** | FastAPI | `0.111.0` | High-performance Python async REST API & WebSockets |
| **AI State Engine** | LangGraph | Latest | StateGraph machine for NOVA reasoning, research, & memory |
| **AI LLM Gateway** | OpenRouter Client | Custom | Multi-model routing (Claude 3.5, GPT-4o, Llama 3) |
| **Database & ORM** | PostgreSQL + SQLAlchemy | `2.0+` | User state, memory storage, streaks, and analytics |
| **Schema Migrations** | Alembic | `1.13+` | DB schema migration management |
| **Realtime Engine** | WebSockets | Standard | 1v1 live coding battle sync & active room events |
| **Code Execution** | Judge0 Sandbox API | REST | Multi-language code execution & test case runner |

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Python**: `v3.10` or higher
- **PostgreSQL**: Running instance or local DB string
- **OpenRouter API Key**: For AI LLM orchestrator access

### 1. Repository Clone
```bash
git clone https://github.com/YourUsername/GrowthOS-1.git
cd GrowthOS-1
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start Next.js development server
npm run dev
# ➔ Frontend running at http://localhost:3000
```

### 3. Backend Setup
```bash
# Navigate to Backend
cd Backend

# Create & activate virtual environment (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Start FastAPI server via Uvicorn
python -m uvicorn Backend.main:app --reload --port 8000
# ➔ Backend running at http://localhost:8000
# ➔ Swagger Interactive Docs: http://localhost:8000/docs
```

### 4. Environment Configuration
Create a `.env` file in root and inside `Backend/`:

```env
# Frontend .env
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend/ .env
DATABASE_URL=postgresql://user:password@localhost:5432/growthos_db
OPENROUTER_API_KEY=your_openrouter_api_key_here
DEFAULT_MODEL=anthropic/claude-3.5-sonnet
SECRET_KEY=your_super_secret_jwt_key
```

---

## 📡 API Reference

Below is a summary of primary FastAPI endpoints mounted in `Backend/main.py`:

```
┌────────┬──────────────────────────┬────────────────────────────────────────────────────────┐
│ Method │ Endpoint                 │ Description                                            │
├────────┼──────────────────────────┼────────────────────────────────────────────────────────┤
│ POST   │ /api/nova/chat           │ Execute full turn in NOVA LangGraph engine             │
│ POST   │ /api/nova/build-state    │ Build complete NovaState payload for a user            │
│ POST   │ /api/nova/memory         │ Store explicit user memory with confidence scoring     │
│ GET    │ /api/nova/memory/{id}    │ Retrieve active semantic/episodic user memories        │
│ POST   │ /agents/resume/analyze   │ Analyze resume text & compute ATS alignment score      │
│ POST   │ /agents/interview/start  │ Start AI-simulated technical interview session         │
│ POST   │ /agents/networking       │ Manage outreach contact CRM & draft AI outreach messages│
│ POST   │ /growth-plan/generate    │ Generate personalized 90-day AI growth roadmap         │
│ GET    │ /missions/today          │ Fetch auto-generated daily execution missions          │
│ POST   │ /practice-arena/submit   │ Submit code to execution sandbox & run test cases      │
│ WS     │ /ws/arena/{room_id}      │ Live WebSocket connection for 1v1 coding battles       │
└────────┴──────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 🚀 SaaS Scalability Roadmap

- [x] **Phase 1: Core OS Foundation**: Command Center, Practice Arena, basic AI agents, streaks.
- [x] **Phase 2: NOVA Engine & LangGraph State Machine**: Dual memory store, RAG knowledge base, web fallback.
- [x] **Phase 3: Realtime Battle Engine**: WebSocket 1v1 peer coding battles & batch leaderboards.
- [ ] **Phase 4: Multi-Tenant Enterprise Tier**: Workspace isolation for universities, coding bootcamps, and prep schools.
- [ ] **Phase 5: High-Fidelity Voice Agent**: Streaming ElevenLabs integration for realtime spoken interview coaching.
- [ ] **Phase 6: Isolated Microservice Sandbox**: Self-hosted Docker code compiler cluster for zero-latency execution.

---

## 📬 Contact & Creator

- **Developer / Creator**: Surinder Kumar
- **Email**: surinderkumar3182@gmail.com
- **WhatsApp / Call**: +91 97974 86509
- **Location**: Punjab, India
- **Project Repo**: [GrowthOS-1 on GitHub](https://github.com/SurinderTech/GrowthOS)

<p align="center">
  <b>GrowthOS — Built for builders who demand execution over excuses.</b>
</p>
