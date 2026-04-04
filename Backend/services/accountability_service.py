# app/services/accountability_service.py
# AI Accountability System
# Gemini generates personalized motivational/warning messages
# based on user's current state

from Backend.config import supabase, gemini_model
from Backend.services.streak_service import get_streak
from datetime import date


async def generate_accountability_message(user_id: str) -> dict:
    """
    Generates a personalized Gemini message based on:
    - How many missions completed today
    - Current streak
    - Batch activity (who else has completed)
    - Time left in day

    Returns: { message, type, show }
    """

    # ── Gather context ─────────────────────────────────────────────────────
    streak_data = get_streak(user_id)
    current_streak = streak_data.get("current_streak", 0)
    practiced_today = streak_data.get("practiced_today", False)

    # Missions completed today
    missions_result = (
        supabase.table("user_missions")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", date.today().isoformat())
        .execute()
    )
    missions = missions_result.data or []
    completed = [m for m in missions if m.get("completed")]
    total_missions = len(missions)
    completed_count = len(completed)

    # If all missions done — no need to show warning
    if total_missions > 0 and completed_count == total_missions and practiced_today:
        return {
            "message": "",
            "type": "none",
            "show": False,
        }

    # Recent batch activity — who completed today
    batch_result = (
        supabase.table("batch_activity")
        .select("user_id, activity_text, activity_type")
        .eq("activity_type", "mission_completed")
        .order("created_at", desc=True)
        .limit(3)
        .execute()
    )
    batch_completions = batch_result.data or []
    batch_names = []
    for item in batch_completions:
        # Get user name from profiles
        profile = (
            supabase.table("profiles")
            .select("full_name")
            .eq("id", item["user_id"])
            .single()
            .execute()
        )
        if profile.data:
            name = profile.data.get("full_name", "").split()[0]
            if name:
                batch_names.append(name)

    batch_context = (
        f"{', '.join(batch_names)} already completed their missions today."
        if batch_names
        else "Your batch is progressing."
    )

    # ── Build Gemini prompt ────────────────────────────────────────────────
    if completed_count == 0:
        tone = "urgent warning — user has done nothing today"
    elif completed_count < total_missions:
        tone = "encouraging — user has made some progress but not finished"
    elif not practiced_today:
        tone = "reminder — user completed missions but skipped practice"
    else:
        tone = "positive — user is doing well, keep the streak going"

    prompt = f"""
You are an AI mentor inside a learning platform called GrowthOS.

Write a SHORT, punchy motivational message for a student.

Context:
- Missions completed today: {completed_count} out of {total_missions}
- Current streak: {current_streak} days
- Practiced today: {practiced_today}
- Batch status: {batch_context}
- Tone needed: {tone}

Rules:
- Maximum 3 sentences
- Be direct, not fluffy
- Mention streak and batch pressure if relevant
- No emojis
- Sound like a tough but caring mentor, not a chatbot

Reply ONLY with the message text. No JSON, no labels.
"""

    try:
        response = gemini_model.generate_content(prompt)
        message = response.text.strip()

        msg_type = "warning" if completed_count == 0 else "motivational"
        if current_streak > 5 and practiced_today:
            msg_type = "celebration"

        return {
            "message": message,
            "type": msg_type,
            "show": True,
        }

    except Exception as e:
        print(f"[Gemini ERROR] Accountability message failed: {e}")
        return {
            "message": "You haven't started today's missions. Your batch is moving. Don't fall behind.",
            "type": "warning",
            "show": True,
        }