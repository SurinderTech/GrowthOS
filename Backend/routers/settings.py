"""
routers/settings.py

Settings API — powers app/dashboard/settings/page.tsx

Endpoints:
    PATCH  /settings/profile           → update name, bio, country, phone
    POST   /settings/change-password   → change password
    GET    /settings/sessions          → get active sessions
    DELETE /settings/sessions/{id}     → revoke a session
    PATCH  /settings/notifications     → save notification preferences
    PATCH  /settings/appearance        → save appearance preferences
    PATCH  /settings/privacy           → save privacy settings
    GET    /settings/export            → download all user data as JSON
    DELETE /settings/delete-account    → permanently delete account

Add to main.py:
    from routers.settings import router as settings_router
    app.include_router(settings_router, prefix="/settings", tags=["Settings"])
"""

import json
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from Backend.db.session import get_db
from Backend.auth import hash_password, verify_password, get_current_user, get_current_user_allow_unverified
from Backend.models.user import User
from Backend.models.onboarding import UserOnboarding

router = APIRouter()


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    name:       Optional[str] = None
    bio:        Optional[str] = None
    country:    Optional[str] = None
    phone:      Optional[str] = None
    avatar_url: Optional[str] = None
    image:      Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str

class NotificationSettings(BaseModel):
    email_missions:    bool = True
    email_streak:      bool = True
    email_weekly:      bool = False
    push_missions:     bool = True
    push_streak:       bool = True
    push_achievements: bool = True
    sms_critical:      bool = False

class AppearanceSettings(BaseModel):
    theme:        str  = "dark"
    accent_color: str  = "#6366f1"
    compact_mode: bool = False
    animations:   bool = True

class PrivacySettings(BaseModel):
    profile_public:   bool = True
    show_streak:      bool = True
    show_leaderboard: bool = True
    data_analytics:   bool = True

class DeleteAccountRequest(BaseModel):
    confirm: str   # must be "DELETE"


# ── GET /settings/profile ───────────────────────────────────────────────────

@router.get("/profile")
def get_profile(
    current_user: User = Depends(get_current_user_allow_unverified),
    db: Session = Depends(get_db),
):
    """
    Get aggregated user profile, appearance, notification, and privacy settings.
    """
    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    return {
        "profile": {
            "id": str(current_user.id),
            "name": current_user.name or "",
            "email": current_user.email or "",
            "bio": getattr(current_user, "bio", "") or "",
            "phone": getattr(current_user, "phone", "") or "",
            "country": (ob.country if ob else "") or "",
            "avatar_url": current_user.image or "",
            "provider": current_user.provider or "credentials",
        },
        "appearance": (ob.appearance_settings if (ob and ob.appearance_settings) else {
            "theme": "dark",
            "accent_color": "#6366f1",
            "compact_mode": False,
            "animations": True,
        }),
        "notifications": (ob.notification_settings if (ob and ob.notification_settings) else {
            "email_missions": True,
            "email_streak": True,
            "email_weekly": False,
            "push_missions": True,
            "push_streak": True,
            "push_achievements": True,
            "sms_critical": False,
        }),
        "privacy": (ob.privacy_settings if (ob and ob.privacy_settings) else {
            "profile_public": True,
            "show_streak": True,
            "show_leaderboard": True,
            "data_analytics": True,
        }),
    }


# ── PATCH /settings/profile ───────────────────────────────────────────────────

@router.patch("/profile")
def update_profile(
    req: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update the user's public profile fields.
    Only updates fields that are provided (non-None).
    """
    if req.name is not None:
        if len(req.name.strip()) < 1:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        current_user.name = req.name.strip()

    if req.bio is not None:
        current_user.bio = req.bio.strip()

    if req.phone is not None:
        current_user.phone = req.phone.strip()

    if req.avatar_url is not None:
        current_user.image = req.avatar_url.strip()
    elif req.image is not None:
        current_user.image = req.image.strip()

    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    if not ob:
        ob = UserOnboarding(user_id=current_user.id)
        db.add(ob)

    if req.country is not None:
        ob.country = req.country.strip()

    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "user": {
            "id":         str(current_user.id),
            "name":       current_user.name,
            "email":      current_user.email,
            "bio":        current_user.bio,
            "phone":      current_user.phone,
            "country":    ob.country if ob else "",
            "avatar_url": current_user.image,
        }
    }


# ── POST /settings/change-password ────────────────────────────────────────────

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change the user's password.
    Requires current password for verification.
    """
    # Social login users have no password
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="This account uses social login. Password cannot be changed."
        )

    # Verify current password
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Current password is incorrect"
        )

    # Validate new password
    if len(req.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters"
        )

    if req.current_password == req.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password"
        )

    # Hash and save
    current_user.hashed_password = hash_password(req.new_password)
    current_user.updated_at      = datetime.now(timezone.utc)
    db.commit()

    return {"success": True, "message": "Password changed successfully"}


# ── GET /settings/sessions ────────────────────────────────────────────────────

@router.get("/sessions")
def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return active sessions for this user.
    For now returns a structured response with the current session.
    Full session tracking would require a sessions table.
    """
    return {
        "sessions": [
            {
                "id":          "current",
                "device":      "Current Browser",
                "location":    "Active Session",
                "last_active": "Now",
                "current":     True,
            }
        ]
    }


# ── DELETE /settings/sessions/{session_id} ────────────────────────────────────

@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke a specific session.
    If full session management is needed, add a UserSessions table.
    """
    if session_id == "current":
        raise HTTPException(
            status_code=400,
            detail="Cannot revoke current session. Log out instead."
        )

    # With a sessions table you would:
    # session = db.query(UserSession).filter(UserSession.id == session_id, UserSession.user_id == current_user.id).first()
    # if not session: raise HTTPException(404, "Session not found")
    # db.delete(session); db.commit()

    return {"success": True, "message": "Session revoked"}


# ── PATCH /settings/notifications ─────────────────────────────────────────────

@router.patch("/notifications")
def update_notifications(
    req: NotificationSettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save notification preferences.
    Stored in user_onboarding as JSON (no separate table needed).
    """
    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    if not ob:
        # Create onboarding record if it doesn't exist
        ob = UserOnboarding(user_id=current_user.id)
        db.add(ob)

    # Store in notification_settings JSON column on user_onboarding
    settings_data = req.model_dump()

    # ── CHANGE 1: now actually saves to database ──────────────────────────
    ob.notification_settings = settings_data
    db.commit()

    return {
        "success":  True,
        "message":  "Notification preferences saved",
        "settings": settings_data,
    }


# ── GET /settings/appearance ────────────────────────────────────────────────

@router.get("/appearance")
def get_appearance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get saved appearance preferences.
    """
    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    settings_data = ob.appearance_settings if (ob and ob.appearance_settings) else {
        "theme": "dark",
        "accent_color": "#6366f1",
        "compact_mode": False,
        "animations": True,
    }

    return {
        "success": True,
        "settings": settings_data,
    }


# ── PATCH /settings/appearance ────────────────────────────────────────────────

@router.patch("/appearance")
def update_appearance(
    req: AppearanceSettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save appearance preferences.
    These are primarily frontend preferences stored in localStorage,
    but we also persist them server-side for cross-device sync.
    """
    settings_data = req.model_dump()

    # ── CHANGE 2: now actually saves to database ──────────────────────────
    # Store in onboarding appearance_settings JSON column
    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    if not ob:
        ob = UserOnboarding(user_id=current_user.id)
        db.add(ob)

    ob.appearance_settings = settings_data
    db.commit()

    return {
        "success":  True,
        "message":  "Appearance settings saved",
        "settings": settings_data,
    }


# ── PATCH /settings/privacy ───────────────────────────────────────────────────

@router.patch("/privacy")
def update_privacy(
    req: PrivacySettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save privacy settings.
    """
    settings_data = req.model_dump()

    # ── CHANGE 3: now actually saves to database ──────────────────────────
    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    if not ob:
        ob = UserOnboarding(user_id=current_user.id)
        db.add(ob)

    ob.privacy_settings = settings_data
    db.commit()

    return {
        "success":  True,
        "message":  "Privacy settings updated",
        "settings": settings_data,
    }


# ── GET /settings/export ──────────────────────────────────────────────────────

@router.get("/export")
def export_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export all user data as a downloadable JSON file.
    Includes profile, onboarding, growth plans, tasks, insights.
    """
    from Backend.models.dashboard import GrowthPlan, DailyTask, AIInsight

    # Build complete data export
    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    plans = db.query(GrowthPlan).filter(
        GrowthPlan.user_id == current_user.id
    ).all()

    tasks = db.query(DailyTask).filter(
        DailyTask.user_id == current_user.id
    ).order_by(DailyTask.task_date.desc()).limit(100).all()

    insights = db.query(AIInsight).filter(
        AIInsight.user_id == current_user.id
    ).order_by(AIInsight.generated_at.desc()).limit(20).all()

    export = {
        "export_date":      datetime.now(timezone.utc).isoformat(),
        "growthos_version": "1.0",
        "profile": {
            "id":         str(current_user.id),
            "name":       current_user.name,
            "email":      current_user.email,
            "bio":        getattr(current_user, "bio",   None),
            "phone":      getattr(current_user, "phone", None),
            "provider":   current_user.provider,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "onboarding": {
            "user_type":             ob.user_type             if ob else None,
            "primary_goal":          ob.primary_goal          if ob else None,
            "twelve_month_goal":     ob.twelve_month_goal     if ob else None,
            "interests":             ob.interests             if ob else [],
            "daily_time":            ob.daily_time            if ob else None,
            "country":               ob.country               if ob else None,
            "exam_type":             ob.exam_type             if ob else None,
            "field_of_study":        ob.field_of_study        if ob else None,
            "career_goal":           ob.career_goal           if ob else None,
            "notification_settings": ob.notification_settings if ob else None,
            "appearance_settings":   ob.appearance_settings   if ob else None,
            "privacy_settings":      ob.privacy_settings      if ob else None,
        } if ob else {},
        "growth_plans": [
            {
                "id":           str(p.id),
                "title":        p.title,
                "summary":      p.summary,
                "months":       p.months,
                "generated_at": p.generated_at.isoformat() if p.generated_at else None,
            }
            for p in plans
        ],
        "tasks": [
            {
                "id":          str(t.id),
                "title":       t.title,
                "completed":   t.completed,
                "category":    t.category,
                "task_date":   t.task_date.isoformat() if t.task_date else None,
            }
            for t in tasks
        ],
        "ai_insights": [
            {
                "insight":      i.insight,
                "generated_at": i.generated_at.isoformat() if i.generated_at else None,
            }
            for i in insights
        ],
    }

    # Return as downloadable JSON file
    json_bytes = json.dumps(export, indent=2, ensure_ascii=False).encode("utf-8")

    return Response(
        content     = json_bytes,
        media_type  = "application/json",
        headers     = {
            "Content-Disposition": f'attachment; filename="growthos_export_{current_user.id}.json"'
        }
    )


# ── DELETE /settings/delete-account ──────────────────────────────────────────

@router.delete("/delete-account")
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete the user's account and all associated data.
    Cascades to onboarding, growth plans, tasks, insights, practice data.
    """
    user_email = current_user.email
    user_id    = current_user.id

    # SQLAlchemy cascade="all, delete-orphan" on User model handles
    # deleting related records automatically.
    # The relationships in User model cover:
    # - onboarding, growth_plans, tasks, insights
    # - practice_sessions, streak, skill_progress

    try:
        db.delete(current_user)
        db.commit()
        print(f"[Settings] Account deleted: {user_email} ({user_id})")
        return {"success": True, "message": "Account permanently deleted"}
    except Exception as e:
        db.rollback()
        print(f"[Settings] Delete failed for {user_email}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete account. Please contact support."
        )