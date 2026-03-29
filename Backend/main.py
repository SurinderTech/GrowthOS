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

# Root
@app.get("/")
def root():
    return {
        "message": "GrowthOS API is running ✅",
        "docs": "/docs",
    }