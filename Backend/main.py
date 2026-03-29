from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
from dotenv import load_dotenv

# Load env
load_dotenv()

app = FastAPI(
    title="GrowthOS API",
    description="Authentication backend for GrowthOS",
    version="1.0.0",
)

# Middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "fallback-secret"),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://growth-os-vfso.vercel.app",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def root():
    return {
        "message": "GrowthOS API is running ✅",
        "docs": "/docs",
    }


# ===============================
# 🔥 ADD ROUTERS (STEP BY STEP)
# ===============================

try:
    from Backend.routers.auth import router as auth_router
    app.include_router(auth_router)
    print("✅ Auth router loaded")
except Exception as e:
    print("❌ Auth router error:", e)


# ===============================
# 🔥 DATABASE INIT (SAFE)
# ===============================

@app.on_event("startup")
def startup():
    print("🚀 Starting GrowthOS Backend...")

    try:
        from Backend.db.init_db import init_db

        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise Exception("DATABASE_URL missing ❌")

        init_db()
        print("✅ Database initialized")

    except Exception as e:
        print("❌ DB ERROR:", e)


# ===============================
# 🔥 SHUTDOWN SAFE
# ===============================

@app.on_event("shutdown")
def shutdown():
    try:
        from Backend.scheduler.task_scheduler import shutdown_scheduler
        shutdown_scheduler()
        print("🛑 Scheduler stopped")
    except:
        pass