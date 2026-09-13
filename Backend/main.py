# backend/main.py
# Entry point of FastAPI server
# Run with: uvicorn main:app --reload

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables before importing modules that depend on them
backend_env = Path(__file__).resolve().parent / ".env"
root_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(backend_env)
load_dotenv(root_env)
load_dotenv()

# Routers
from Backend.routers import practice, streaks, missions, activity, accountability

from Backend.routers.practice import router as practice_router
from Backend.routers.auth import router as auth_router
from Backend.routers.dashboard import router as dashboard_router
from Backend.routers.onboarding import router as onboarding_router
from Backend.routers.practice_arena import router as arena_router
from Backend.routers.smart_tasks import router as smart_tasks_router
from Backend.routers.growth_plan import router as growth_plan_router
from Backend.routers.settings import router as settings_router
from Backend.routers.agents import router as agents_router
from Backend.routers.resume_agent import router as resume_agent_router
from Backend.routers.interview_agent import router as interview_agent_router
from Backend.routers.project_agent import router as project_agent_router
from Backend.routers.networking_agent import router as networking_agent_router
from Backend.routers.learning_agent import router as learning_agent_router
from Backend.nova import nova_router
from Backend.routers.leaderboard import router as leaderboard_router
from Backend.routers.challenges import router as challenges_router
from Backend.routers.community import router as community_router
from Backend.routers.arena import router as arena_router_new
from Backend.routers.arena_ws import router as arena_ws_router

from Backend.scheduler.task_scheduler import start_scheduler, shutdown_scheduler

# Database
from Backend.db.init_db import init_db

app = FastAPI(
    title="GrowthOS API",
    description="Authentication backend for GrowthOS",
    version="1.0.0",
)

# ─────────────────────────────────
# MIDDLEWARE ORDER MATTERS!
# In Starlette, middleware runs in REVERSE order of registration.
# Last added = outermost = runs FIRST on incoming requests.
# So CORSMiddleware must be added LAST to handle OPTIONS preflight first.
# ─────────────────────────────────

# Step 1: Add SessionMiddleware FIRST (will run AFTER CORS)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "fallback-secret"),
)

# Step 2: Add CORSMiddleware LAST (will run FIRST, handles OPTIONS preflight)
allowed_origins = list({
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://growthosai.tech",
    "https://www.growthosai.tech",
    os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?|https://.*\.growthosai\.tech",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────
# Register API Routers
# ─────────────────────────────────
app.include_router(auth_router)
app.include_router(onboarding_router, prefix="/onboarding", tags=["Onboarding"])
app.include_router(onboarding_router, prefix="/api/onboarding", tags=["Onboarding"])
app.include_router(smart_tasks_router, prefix="/api/tasks", tags=["smart-tasks"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(practice.router,       prefix="/practice",       tags=["Practice"])
app.include_router(streaks.router,        prefix="/streaks",        tags=["Streaks"])
app.include_router(missions.router,       prefix="/missions",       tags=["Missions"])
app.include_router(activity.router,       prefix="/activity",       tags=["Activity"])
app.include_router(accountability.router, prefix="/accountability", tags=["Accountability"])
app.include_router(settings_router, prefix="/settings", tags=["Settings"])
app.include_router(growth_plan_router, prefix="/growth-plan", tags=["Growth Plan"])
app.include_router(arena_router, prefix="/practice-arena", tags=["Practice Arena"])
app.include_router(agents_router, prefix="/agents", tags=["Agents"])
app.include_router(resume_agent_router,     prefix="/agents/resume",     tags=["Resume Agent"])
app.include_router(interview_agent_router,  prefix="/agents/interview",  tags=["Interview Agent"])
app.include_router(project_agent_router,    prefix="/agents/projects",   tags=["Project Agent"])
app.include_router(networking_agent_router, prefix="/agents/networking", tags=["Networking Agent"])
app.include_router(learning_agent_router, prefix="/api/learning-agent", tags=["Learning Agent"])
app.include_router(nova_router, prefix="/api/nova", tags=["NOVA"])
app.include_router(leaderboard_router, prefix="/leaderboard", tags=["Leaderboard"])
app.include_router(challenges_router, prefix="/challenges", tags=["Challenges"])
app.include_router(community_router, prefix="/community", tags=["Community"])
app.include_router(arena_router_new, prefix="/arena", tags=["Arena"])
app.include_router(arena_ws_router, prefix="/ws", tags=["Arena WebSocket"])

# ─────────────────────────────────
# Root Endpoint
# ─────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "GrowthOS API is running ✅",
        "docs": "/docs",
        "redoc": "/redoc",
    }


# ─────────────────────────────────
# Startup Event
# ─────────────────────────────────
@app.on_event("startup")
def startup():
    print("🚀 Starting GrowthOS Backend...")

    # Initialize database tables
    try:
        init_db()
        print("[OK] Database tables ready")
    except Exception as e:
        print("[ERROR] DB error:", str(e))
        pass

    # Seed Arena data (idempotent)
    try:
        from Backend.db.session import SessionLocal
        from Backend.services.arena_seed import seed_arena
        _db = SessionLocal()
        try:
            seed_arena(_db)
            print("[OK] Arena seed complete")
        finally:
            _db.close()
    except Exception as e:
        print(f"[ERROR] Arena seed failed: {e}")

    # Start APScheduler for smart daily tasks
    try:
        #start_scheduler()
        print("✅ Task scheduler started (runs at 00:05 UTC daily)")
    except Exception as e:
        print(f"❌ Scheduler failed to start: {e}")

    print("🤖 AI task scheduler ready")
    print("🚀 GrowthOS API running at http://localhost:8000")
    print("📚 API docs at http://localhost:8000/docs")


@app.on_event("shutdown")
def shutdown():
    try:
        shutdown_scheduler()
        print("🛑 Scheduler stopped")
    except:
        pass  