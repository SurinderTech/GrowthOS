# app/routers/accountability.py
# AI Accountability System
# GET /accountability/message?user_id=xxx  → get Gemini-generated message

from fastapi import APIRouter
from Backend.models.schemas import AccountabilityRequest, AccountabilityResponse
from Backend.services.accountability_service import generate_accountability_message

router = APIRouter()


@router.get("/message", response_model=AccountabilityResponse)
async def get_accountability_message(user_id: str):
    """
    Frontend calls this once on load (after 5s delay).
    Gemini generates a personalized message based on:
    - Missions completed today
    - Streak status
    - Batch competition context

    Returns show=False if user already completed everything.
    """
    result = await generate_accountability_message(user_id)
    return AccountabilityResponse(**result)