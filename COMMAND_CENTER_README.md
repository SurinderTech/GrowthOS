# GrowthOS Command Center — What Changed

This document covers everything added or modified to turn the dashboard into
the cinematic "AI Operating System" command center from the design brief:
what's new in the frontend, what's new in the backend, and exactly which
files to look at.

**Nothing here needs a new API key.** Every new feature reuses the
OpenRouter-backed model client your app already has configured
(`OPENROUTER_API_KEY` in `Backend/.env`). Voice uses the browser's built-in
Speech APIs, not a paid TTS service — see the Voice section for why, and
what to do if you want ElevenLabs later.

---

## 1. Frontend — `app/dashboard/page.tsx`

This file was fully rewritten. All the original data-fetching logic
(missions, smart tasks, skills, opportunities, growth plan, streak) is
untouched — only the visual layer and a few new hooks were added.

### New: the orbit hero
Replaced the old boxy "Mission Control" header with a **living AI Core**
surrounded by 7 orbiting agent nodes, matching the reference image:

- The whole ring rotates slowly via CSS (`.orbit-ring { animation: coreSwirl 90s linear infinite }`).
- Each node sits in a wrapper that **counter-rotates** at the same speed
  (`.orbit-counter { animation: coreSwirlRev 90s linear infinite }`) so icons
  and labels stay upright while still circling the core — the standard
  "orbit" CSS trick, no JS animation loop needed, cheap on the GPU.
- The central orb breathes (`@keyframes breathe`, scale + brightness pulse),
  has two counter-rotating glow rings, and blinking SVG "eyes."
- `prefers-reduced-motion` disables the rotation for accessibility.

**Every node is wired to something real** — clicking it either scrolls to a
working section below or opens a real agent workspace modal:

| Node | Data source | Click action |
|---|---|---|
| Learning Agent | `getSkills()` | scrolls to Execution Lab |
| Opportunity Agent | `getOpportunities()` | scrolls to Opportunities |
| Productivity Agent | `/missions/today` | scrolls to Today's Action Plan |
| Resume Agent | new `/agents/resume` | opens `ResumeAgentPanel` |
| Interview Agent | new `/agents/interview` | opens `InterviewAgentPanel` |
| Project Agent | new `/agents/projects` | opens `ProjectAgentPanel` |
| Networking Agent | new `/agents/networking` | opens `NetworkingAgentPanel` |

The Growth Path Timeline (career graph), Practice streak, and Batch Activity
feed are still fully present as sections further down the page (reachable
from the sidebar), exactly as before — they just aren't orbit nodes, since
the reference image's 7 "Core Agents" list didn't include them as such.

### New: Nova, the AI companion panel
Right-hand panel in the hero, `s.novaPanel` in the styles:

- **Proactive message** — generated from real state already in memory
  (streak about to lapse → pending missions → pending smart tasks → "all
  clear"), never fabricated copy. See the `useEffect` guarded by
  `novaGreetedRef`.
- **Chat** — hits your existing `/dashboard/ask-ai` endpoint via
  `askAI()` from `lib/dashboard-api.ts`. Nothing new on the backend for
  this part; it was already there.
- **Live Feed** — calls the existing `/activity/feed` endpoint via
  `getBatchActivity()`. If your `profiles.batch_id` isn't set up for a user
  (this endpoint is Supabase-backed and may not be fully migrated — see
  `Backend/routers/activity.py`), the panel shows an honest empty state
  instead of fake names.

### Voice — browser-native, not ElevenLabs
Clicking the orb speaks a short greeting using the browser's
`SpeechSynthesis` API. The mic button next to Nova's chat uses
`SpeechRecognition`/`webkitSpeechRecognition` for voice input. Both are
free, built into Chrome/Edge/Safari, and need zero backend or API key.

**Why not ElevenLabs** (as the design brief mentions): that needs a paid key
plus a server endpoint that streams synthesized audio back to the client —
a real backend feature, not something to fake. If you want it, tell me and
I'll add:
- `ELEVENLABS_API_KEY` to `Backend/.env`
- A `POST /agents/voice/speak` endpoint that calls ElevenLabs and streams
  audio back
- Swap `speak()` in `page.tsx` to fetch + play that audio instead of
  `SpeechSynthesisUtterance`

### New file: `app/dashboard/AgentPanels.tsx`
Four modal workspace components, each full CRUD + one AI action, all wired
to the new backend endpoints below:

- `ResumeAgentPanel` — paste resume text → AI ATS score + strengths/improvements, with score history.
- `InterviewAgentPanel` — enter a target role → AI-generated question set → answer each → per-answer AI feedback/score → AI overall verdict.
- `ProjectAgentPanel` — add/track projects (idea → in progress → completed), GitHub links, delete.
- `NetworkingAgentPanel` — add contacts, cycle pipeline status (to reach → contacted → replied → connected), AI-drafted outreach messages per contact.

### New file: `lib/agents-api.ts`
Frontend API wrapper for the four new agents, following the same
`fetchWithTimeout` / `authHeaders` pattern as `lib/dashboard-api.ts`.

---

## 2. Backend — new agent workspaces

Four new capabilities, each with its own model, schema, router, and (where
it needs one) an AI service function. All follow the exact conventions
already in this codebase (`models/dashboard.py`'s UUID + CASCADE pattern,
`routers/dashboard.py`'s `get_current_user` + `get_user_profile` pattern,
`services/gemini_service.py`'s OpenRouter model client).

### New files

```
Backend/models/agents_data.py          → ResumeAnalysis, InterviewSession, Project, Contact
Backend/schemas/agents_data.py         → Pydantic request/response models for all four
Backend/services/agents_ai_service.py  → AI functions (resume scoring, interview Qs/feedback, outreach drafts)
Backend/routers/resume_agent.py        → /agents/resume
Backend/routers/interview_agent.py     → /agents/interview
Backend/routers/project_agent.py       → /agents/projects
Backend/routers/networking_agent.py    → /agents/networking
Backend/alembic/versions/c1a9e2f3b4d5_add_agent_workspaces.py  → migration for the 4 new tables
```

### Modified files
- `Backend/main.py` — imports + registers the 4 new routers.
- `Backend/db/init_db.py` — imports `agents_data` models so
  `Base.metadata.create_all()` creates their tables on startup (this repo's
  primary schema-creation path — see below).
- `Backend/alembic/env.py` — imports the new models into Alembic's metadata.

### API reference

**Resume Agent** — `/agents/resume`
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/` | – | `{ latest, history[], total_analyses }` |
| POST | `/analyze` | `{ resume_text }` | `{ id, ats_score, strengths[], improvements[], summary, created_at }` |

**Interview Agent** — `/agents/interview`
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/` | – | `{ latest, history[], total_sessions }` |
| POST | `/start` | `{ role, question_count? }` | full session with `questions[]` |
| POST | `/{id}/answer` | `{ question_index, answer }` | `{ feedback, score }` |
| POST | `/{id}/complete` | – | session with `overall_score`, `overall_feedback` |

**Project Agent** — `/agents/projects`
| Method | Path | Body |
|---|---|---|
| GET | `/` | – |
| POST | `/` | `{ title, description?, status?, github_url? }` |
| PATCH | `/{id}` | any subset of the above |
| DELETE | `/{id}` | – |

**Networking Agent** — `/agents/networking`
| Method | Path | Body |
|---|---|---|
| GET | `/` | – |
| POST | `/` | `{ name, role?, company?, platform?, notes? }` |
| PATCH | `/{id}` | any subset, including `status` |
| DELETE | `/{id}` | – |
| POST | `/{id}/draft-message` | – → `{ message }` |

All routes are JWT-protected via the existing `get_current_user` dependency,
same as every other router in this app.

### Database migrations — important note
This repo creates tables two ways: `Base.metadata.create_all()` on every
app startup (`Backend/db/init_db.py`, called from `main.py`'s `@app.on_event("startup")`)
**and** Alembic migrations. The new tables will be created automatically the
first time you boot the backend after pulling these changes — you don't
strictly need to run the migration.

If you do manage schema via Alembic in production: this repo's existing
migration history has more than one head (`alembic heads` will show you).
I chained the new migration off `a520815fe1f8` (the newest-looking one), but
you should run `alembic heads` yourself and adjust `down_revision` in
`c1a9e2f3b4d5_add_agent_workspaces.py` if that's not actually your tip, or
run `alembic merge heads` first.

### Why Gemini-style calls instead of the new Orchestrator
This app has two AI code paths: `services/gemini_service.py` (used live by
`routers/dashboard.py` for everything — growth plans, tasks, skills,
opportunities, ask-ai) and a newer `ai/orchestrator.py` multi-agent system
(used only by the generic `routers/agents.py` routes like
`/agents/career-coach`). The new Resume/Interview/Networking AI functions in
`services/agents_ai_service.py` use the same low-level client as
`gemini_service.py` (`Backend.ai.legacy_adapter.create_legacy_model`, which
is already OpenRouter-backed) — I matched the pattern that's actually proven
in production rather than the newer orchestrator that isn't fully wired
into live routes yet. If you'd rather have these four agents go through the
Orchestrator instead (so they show up in `agents.available_agents()`, get
memory-context, etc.), that's a bigger refactor — say the word and I'll do it.

---

## 3. What I did **not** fabricate

- No fake XP/Level bar — the reference image shows one, but there's no XP
  system in this backend. I used real roadmap `%` instead.
- No fake cohort names in the activity feed — if `/activity/feed` returns
  nothing (or errors, which it may since it's Supabase-backed and this repo
  is mid-migration to Postgres/SQLAlemy), the UI says so honestly instead of
  showing invented people.
- No ElevenLabs voice without the key — used the free browser Speech API
  instead, documented above.

---

## 4. Quick start

```bash
# Backend
cd Backend
pip install -r requirements.txt   # if you have one; otherwise your existing venv
uvicorn Backend.main:app --reload

# Frontend
npm install
npm run dev
```

Nothing new to add to `.env` — the new agents reuse `OPENROUTER_API_KEY` /
`DEFAULT_MODEL` that should already be set from your existing setup.

Open `/dashboard`, click any of the 7 orbit nodes around the AI Core to try
each agent, and click the orb itself to hear Nova's greeting.
