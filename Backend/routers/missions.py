# app/routers/missions.py
# Mission Control API
#
# GET  /missions/today?user_id=xxx       → get today's missions + greeting
# POST /missions/complete                 → mark a mission complete
# POST /missions/generate                 → AI generates today's missions (call once daily)

from fastapi import APIRouter, HTTPException
from datetime import date
from models.schemas import Mission, MissionCompleteRequest, MissionControlResponse
from config import supabase, gemini_model
import json
import uuid

router = APIRouter()

MISSION_TYPES = {
    "practice":  "Solve today's practice questions",
    "review":    "Review yesterday's mistakes",
    "project":   "Work on your current project for 30 minutes",
    "learning":  "Watch one tutorial and take notes",
}


# ── GET /missions/today ───────────────────────────────────────────────────────

@router.get("/today", response_model=MissionControlResponse)
async def get_today_missions(user_id: str):
    """
    Returns today's missions + greeting + streak.
    If no missions exist for today → auto-generates them.
    """
    today = date.today()

    # Check if missions exist for today
    result = (
        supabase.table("user_missions")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", today.isoformat())
        .execute()
    )

    missions = result.data or []

    # Auto-generate if none exist
    if not missions:
        missions = await _generate_missions(user_id, today)

    completed_count = sum(1 for m in missions if m.get("completed"))

    # Get streak
    streak_result = (
        supabase.table("user_streaks")
        .select("current_streak")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    streak = streak_result.data.get("current_streak", 0) if streak_result.data else 0

    # Build greeting
    from datetime import datetime
    hour = datetime.now().hour
    if hour < 12:
        greeting = "Good Morning"
    elif hour < 17:
        greeting = "Good Afternoon"
    else:
        greeting = "Good Evening"

    return MissionControlResponse(
        greeting=greeting,
        missions=[Mission(**m) for m in missions],
        completed_count=completed_count,
        total_count=len(missions),
        streak=streak,
        deadline="11:59 PM",
    )


# ── POST /missions/complete ───────────────────────────────────────────────────

@router.post("/complete")
async def complete_mission(req: MissionCompleteRequest):
    """
    Marks a mission as completed.
    Logs to batch_activity feed.
    """
    result = (
        supabase.table("user_missions")
        .update({"completed": True})
        .eq("id", req.mission_id)
        .eq("user_id", req.user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Mission not found.")

    # Log to batch feed
    profile = (
        supabase.table("profiles")
        .select("full_name, batch_id")
        .eq("id", req.user_id)
        .single()
        .execute()
    )
    user_name = "Someone"
    batch_id = None
    if profile.data:
        user_name = profile.data.get("full_name", "Someone").split()[0]
        batch_id = profile.data.get("batch_id")

    mission = result.data[0]
    supabase.table("batch_activity").insert({
        "user_id":       req.user_id,
        "batch_id":      batch_id,
        "activity_type": "mission_completed",
        "activity_text": f"{user_name} completed: {mission.get('title', 'a mission')}",
    }).execute()

    return {"success": True, "mission_id": req.mission_id}


# ── Internal: Generate missions with Gemini ───────────────────────────────────

async def _generate_missions(user_id: str, today: date) -> list[dict]:
    """
    Ask Gemini to generate 3 personalized missions.
    Falls back to default missions if Gemini fails.
    """
    # Get user profile
    profile_result = (
        supabase.table("profiles")
        .select("full_name, profession, current_skill")
        .eq("id", user_id)
        .single()
        .execute()
    )

    profession = "Software Engineer"
    skill = "Python"
    name = "User"
    if profile_result.data:
        profession = profile_result.data.get("profession", profession)
        skill = profile_result.data.get("current_skill", skill)
        name = profile_result.data.get("full_name", "").split()[0] or name

    prompt = f"""
Generate exactly 3 daily missions for a student on a learning platform.

Student profile:
- Name: {name}
- Profession goal: {profession}
- Current skill: {skill}
- Date: {today.strftime("%A, %B %d")}

Rules:
- Each mission must be specific and actionable
- Mix types: one practice, one review/learning, one project/build task
- Keep each title under 10 words
- type must be one of: "practice", "review", "project", "learning"

Return ONLY this exact JSON array. No markdown, no extra text:
[
  {{"title": "Solve the FastAPI authentication challenge", "type": "practice"}},
  {{"title": "Review yesterday's mistake patterns", "type": "review"}},
  {{"title": "Build one CRUD endpoint from scratch", "type": "project"}}
]
"""

    missions = []

    try:
        response = gemini_model.generate_content(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        generated = json.loads(raw)

        for item in generated:
            row = {
                "id":        str(uuid.uuid4()),
                "user_id":   user_id,
                "title":     item["title"],
                "type":      item.get("type", "practice"),
                "completed": False,
                "deadline":  "11:59 PM",
                "date":      today.isoformat(),
            }
            missions.append(row)

    except Exception as e:
        print(f"[Gemini ERROR] Mission generation failed: {e}")
        # Fallback missions
        missions = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "title": f"Solve the {skill} challenge", "type": "practice", "completed": False, "deadline": "11:59 PM", "date": today.isoformat()},
            {"id": str(uuid.uuid4()), "user_id": user_id, "title": "Review yesterday's mistakes", "type": "review", "completed": False, "deadline": "11:59 PM", "date": today.isoformat()},
            {"id": str(uuid.uuid4()), "user_id": user_id, "title": "Complete one system design task", "type": "project", "completed": False, "deadline": "11:59 PM", "date": today.isoformat()},
        ]

    # Store in Supabase
    if missions:
        supabase.table("user_missions").insert(missions).execute()

    return missions