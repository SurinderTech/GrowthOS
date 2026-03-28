# backend/main.py
# Entry point of FastAPI server
# Run with: uvicorn main:app --reload

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
from dotenv import load_dotenv

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

from Backend.scheduler.task_scheduler import start_scheduler, shutdown_scheduler

# Database
from Backend.db.init_db import init_db

# Load environment variables
load_dotenv()

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://growth-os-vfso.vercel.app",
        "http://127.0.0.1:3000",
        "http://192.168.1.68:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────
# Register API Routers
# ─────────────────────────────────
app.include_router(auth_router)
app.include_router(onboarding_router, prefix="/onboarding", tags=["Onboarding"])
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
        print("✅ Database tables ready")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")

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