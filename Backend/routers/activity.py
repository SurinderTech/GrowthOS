# app/routers/activity.py
# Batch Activity Feed API
#
# GET /activity/feed?user_id=xxx&limit=10  → get cohort activity feed

from fastapi import APIRouter
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

    # ── 1. Get batch_id from batch_activity itself ────────────────────────
    # NOTE: We avoid querying `profiles` directly because RLS may block access.
    # Instead we look up a recent row for this user to extract their batch_id.
    own_row = (
        supabase.table("batch_activity")
        .select("batch_id")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    batch_id = None
    if own_row.data:
        batch_id = own_row.data[0].get("batch_id")

    if not batch_id:
        # Fallback: no activity yet → empty feed
        return BatchActivityResponse(activities=[])

    # ── 2. Fetch batch activity (no profiles join — avoid RLS) ─────────────
    activity_result = (
        supabase.table("batch_activity")
        .select("id, user_id, activity_type, activity_text, created_at")
        .eq("batch_id", batch_id)
        .neq("user_id", user_id)          # exclude own activity
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    items = []
    for row in (activity_result.data or []):
        # activity_text is pre-formatted as "<FirstName> completed: …"
        # Extract first word as display name; fall back to "Someone".
        activity_text = row.get("activity_text", "")
        first_name = activity_text.split()[0] if activity_text else "Someone"

        items.append(BatchActivityItem(
            id=row["id"],
            user_id=row["user_id"],
            user_name=first_name,
            avatar=first_name[0].upper() if first_name else "?",
            activity_type=row["activity_type"],
            activity_text=activity_text,
            created_at=row["created_at"],
        ))

    return BatchActivityResponse(activities=items)