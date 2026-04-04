# app/routers/activity.py
# Batch Activity Feed API
#
# GET /activity/feed?user_id=xxx&limit=10  → get cohort activity feed

from fastapi import APIRouter, HTTPException
from Backend.models.schemas import BatchActivityResponse, BatchActivityItem
from Backend.config import supabase

router = APIRouter()


@router.get("/feed", response_model=BatchActivityResponse)
def get_activity_feed(user_id: str, limit: int = 10):
    """
    Returns recent activity from the user's batch (cohort).
    Frontend polls this every 30 seconds.

    Steps:
    1. Get user's batch_id
    2. Fetch latest activity for that batch
    3. Join with profiles to get display names
    """

    # ── 1. Get batch_id ────────────────────────────────────────────────────
    profile_result = (
        supabase.table("profiles")
        .select("batch_id")
        .eq("id", user_id)
        .single()
        .execute()
    )

    if not profile_result.data:
        raise HTTPException(status_code=404, detail="User profile not found.")

    batch_id = profile_result.data.get("batch_id")
    if not batch_id:
        return BatchActivityResponse(activities=[])

    # ── 2. Fetch batch activity ────────────────────────────────────────────
    activity_result = (
        supabase.table("batch_activity")
        .select("*, profiles(full_name)")
        .eq("batch_id", batch_id)
        .neq("user_id", user_id)          # exclude own activity
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    items = []
    for row in (activity_result.data or []):
        profile = row.get("profiles") or {}
        full_name = profile.get("full_name", "Someone")
        first_name = full_name.split()[0] if full_name else "Someone"

        items.append(BatchActivityItem(
            id=row["id"],
            user_id=row["user_id"],
            user_name=first_name,
            avatar=first_name[0].upper() if first_name else "?",
            activity_type=row["activity_type"],
            activity_text=row["activity_text"],
            created_at=row["created_at"],
        ))

    return BatchActivityResponse(activities=items)