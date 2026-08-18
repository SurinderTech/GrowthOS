"""
Backend/routers/learning_agent.py
FastAPI router for Learning Agent Workspace, Calibration, Database Persistence, and AI Nova Tutor.
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime

from Backend.db.session import get_db
from Backend.routers.auth import get_current_user
from Backend.models.learning_agent import (
    UserLearningMemory, UserLearningPlan, LearningMission,
    LearningMissionTask, LearningTopic, LearningResource,
    LearningNote, LearningTutorMessage
)
from Backend.models.onboarding import UserOnboarding
from Backend.ai.agents.learning_coach import (
    generate_learning_curriculum, chat_with_nova_tutor
)

router = APIRouter(tags=["Learning Agent"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ToggleTaskRequest(BaseModel):
    task_id: str
    completed: Optional[bool] = None

class ToggleTopicRequest(BaseModel):
    topic_key: str
    completed: Optional[bool] = None

class SaveNoteRequest(BaseModel):
    topic_key: str
    note_text: str

class TutorChatRequest(BaseModel):
    message: str
    topic_key: Optional[str] = None


# ── Helper: Fetch Onboarding Profile Summary ──────────────────────────────────
def get_user_onboarding_profile(user_id: Any, current_user: Any, db: Session) -> Dict[str, Any]:
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
    name = (
        getattr(current_user, "full_name", None) or
        getattr(current_user, "name", None) or
        (getattr(current_user, "email", "User").split("@")[0] if getattr(current_user, "email", None) else "User")
    )

    GOAL_TITLE_MAP = {
        "get_job": "landing a job",
        "crack_exam": "cracking your target exam",
        "earn_online": "earning online",
        "build_startup": "building your startup",
        "grow_audience": "growing your audience",
        "become_disciplined": "building self-discipline",
        "grow_career": "career growth",
        "learn_skills": "mastering new skills",
        "build_projects": "building real-world projects",
        "prepare_exams": "exam preparation",
        "build_business": "building a business",
        "financial_independence": "financial independence",
        "improve_discipline": "improving discipline",
    }

    raw_goal = (
        getattr(ob, "career_goal", None) or
        getattr(ob, "primary_skill", None) or
        getattr(ob, "field_of_study", None) or
        (f"Clearing {ob.exam_type.upper()} Exam" if ob and getattr(ob, "exam_type", None) else None) or
        getattr(ob, "business_goal", None) or
        getattr(ob, "creator_growth_goal", None) or
        getattr(ob, "twelve_month_goal", None) or
        getattr(ob, "primary_goal", None) if ob else None
    )

    if raw_goal and str(raw_goal).strip() in GOAL_TITLE_MAP:
        career_goal = GOAL_TITLE_MAP[str(raw_goal).strip()]
    elif raw_goal and "_" in str(raw_goal):
        career_goal = str(raw_goal).replace("_", " ").title()
    else:
        career_goal = str(raw_goal) if raw_goal else "landing a job"

    STYLE_MAP = {
        "deep_focus": "deep focus session",
        "short_bursts": "short burst session",
        "structured": "structured schedule",
        "flexible": "flexible session",
        "evening": "evening session",
    }
    raw_style = getattr(ob, "productivity_style", None) if ob else None
    preferred_time_blocks = STYLE_MAP.get(raw_style, raw_style.replace("_", " ") if raw_style else "deep focus session")

    raw_hours = (
        getattr(ob, "study_hours_daily", None) or
        getattr(ob, "daily_commitment_hours", None) or
        getattr(ob, "daily_time", None) or 2
    ) if ob else 2

    raw_hours_str = str(raw_hours).strip()
    if raw_hours_str == "30min":
        daily_study_hours = "0.5"
    elif raw_hours_str == "1hour":
        daily_study_hours = "1"
    elif raw_hours_str == "2-3hours":
        daily_study_hours = "2 to 3"
    elif raw_hours_str == "4+hours":
        daily_study_hours = "4+"
    elif "hour" in raw_hours_str:
        daily_study_hours = raw_hours_str.replace("hours", "").replace("hour", "").strip()
    else:
        daily_study_hours = raw_hours_str

    LEVEL_MAP = {
        "beginner": "Beginner",
        "intermediate": "Intermediate",
        "expert": "Expert",
        "advanced": "Advanced",
        "school": "Student",
        "college": "College Student",
    }
    raw_level = (getattr(ob, "experience_level", None) or getattr(ob, "degree_level", None) or getattr(ob, "education_level", None)) if ob else None
    current_level = LEVEL_MAP.get(raw_level, raw_level.title() if raw_level else "Beginner")

    return {
        "name": name,
        "career_goal": career_goal,
        "current_level": current_level,
        "daily_study_hours": daily_study_hours,
        "preferred_time_blocks": preferred_time_blocks,
        "target_timeline": (getattr(ob, "target_timeline", None) if ob and getattr(ob, "target_timeline", None) else "6 months"),
        "timezone": "UTC"
    }


# ── Helper: Ensure AI Curriculum Exists for User ──────────────────────────────
def ensure_learning_plan_exists(user_id: Any, current_user: Any, memory: UserLearningMemory, db: Session) -> UserLearningPlan:
    plan = db.query(UserLearningPlan).filter(UserLearningPlan.user_id == user_id).first()
    if plan:
        return plan

    # Generate curriculum using Gemini AI
    user_profile = get_user_onboarding_profile(user_id, current_user, db)
    mem_dict = {
        "learning_style": memory.learning_style,
        "stuck_strategy": memory.stuck_strategy,
        "learning_priority": memory.learning_priority,
        "revision_preference": memory.revision_preference,
        "target_topic": memory.target_topic,
    }

    ai_data = generate_learning_curriculum(user_profile, mem_dict)

    # Save Plan
    plan_info = ai_data.get("plan", {})
    plan = UserLearningPlan(
        user_id=user_id,
        title=plan_info.get("title", "Personalized Mastery Plan"),
        target_role=plan_info.get("target_role", user_profile["career_goal"]),
        total_weeks=plan_info.get("total_weeks", 4),
        current_week=1,
        current_day=1,
        progress_percent=0,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    # Save Topics
    for t_data in ai_data.get("topics", []):
        topic = LearningTopic(
            plan_id=plan.id,
            user_id=user_id,
            topic_key=t_data.get("topic_key", "t1"),
            title=t_data.get("title", "Core Topic"),
            summary=t_data.get("summary", ""),
            explanation=t_data.get("explanation", ""),
            code_snippet=t_data.get("code_snippet"),
            practice_questions=t_data.get("practice_questions", []),
            completed=False,
        )
        db.add(topic)

    # Save Resources
    for r_data in ai_data.get("resources", []):
        resource = LearningResource(
            plan_id=plan.id,
            user_id=user_id,
            topic_key=r_data.get("topic_key", "t1"),
            type=r_data.get("type", "video"),
            title=r_data.get("title", "Learning Reference"),
            source=r_data.get("source", "GrowthOS Academy"),
            url=r_data.get("url", "https://youtube.com"),
            duration_or_time=r_data.get("duration_or_time", "15 min"),
        )
        db.add(resource)

    # Save Missions & Tasks
    for m_data in ai_data.get("missions", []):
        mission = LearningMission(
            plan_id=plan.id,
            user_id=user_id,
            week_number=m_data.get("week_number", 1),
            day_number=m_data.get("day_number", 1),
            week_title=m_data.get("week_title", "Foundations"),
            estimated_minutes=m_data.get("estimated_minutes", 45),
            completed=False,
        )
        db.add(mission)
        db.commit()
        db.refresh(mission)

        for task_data in m_data.get("tasks", []):
            task = LearningMissionTask(
                mission_id=mission.id,
                user_id=user_id,
                topic_key=task_data.get("topic_key", "t1"),
                text=task_data.get("text", "Complete daily study goal"),
                completed=False,
            )
            db.add(task)

    db.commit()
    db.refresh(plan)
    return plan


# ── GET /api/learning-agent/memory ───────────────────────────────────────────
@router.get("/memory")
def get_learning_memory(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve existing learning calibration memory for current user."""
    mem = db.query(UserLearningMemory).filter(UserLearningMemory.user_id == current_user.id).first()

    if not mem or not mem.calibration_completed:
        return {
            "requires_calibration": True,
            "memory": {
                "learning_style": mem.learning_style if mem else None,
                "stuck_strategy": mem.stuck_strategy if mem else None,
                "learning_priority": mem.learning_priority if mem else None,
                "revision_preference": mem.revision_preference if mem else None,
                "calibration_completed": False,
            }
        }

    return {
        "requires_calibration": False,
        "memory": {
            "learning_style": mem.learning_style,
            "stuck_strategy": mem.stuck_strategy,
            "learning_priority": mem.learning_priority,
            "revision_preference": mem.revision_preference,
            "calibration_completed": True,
        }
    }


# ── PATCH /api/learning-agent/memory ──────────────────────────────────────────
@router.patch("/memory")
def update_learning_memory(
    payload: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upsert preference fields into user's learning agent memory."""
    mem = db.query(UserLearningMemory).filter(UserLearningMemory.user_id == current_user.id).first()

    if not mem:
        mem = UserLearningMemory(user_id=current_user.id)
        db.add(mem)

    for field in ["learning_style", "stuck_strategy", "learning_priority", "revision_preference", "target_topic"]:
        if field in payload:
            setattr(mem, field, payload[field])

    if payload.get("calibration_completed") is not None:
        mem.calibration_completed = payload["calibration_completed"]
    elif mem.learning_style and mem.stuck_strategy and mem.learning_priority and mem.revision_preference:
        mem.calibration_completed = True

    mem.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(mem)

    # Ensure plan is created if calibration completes
    if mem.calibration_completed:
        ensure_learning_plan_exists(current_user.id, current_user, mem, db)

    return {
        "status": "success",
        "memory": {
            "learning_style": mem.learning_style,
            "stuck_strategy": mem.stuck_strategy,
            "learning_priority": mem.learning_priority,
            "revision_preference": mem.revision_preference,
            "calibration_completed": mem.calibration_completed,
        }
    }


# ── GET /api/learning-agent/workspace ───────────────────────────────────────
@router.get("/workspace")
def get_learning_workspace(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch complete real-time workspace payload for LearningAgent UI."""
    mem = db.query(UserLearningMemory).filter(UserLearningMemory.user_id == current_user.id).first()
    if not mem or not mem.calibration_completed:
        return {
            "requires_calibration": True,
            "profile": get_user_onboarding_profile(current_user.id, current_user, db),
        }

    plan = ensure_learning_plan_exists(current_user.id, current_user, mem, db)

    # Fetch active mission
    mission = db.query(LearningMission).filter(
        LearningMission.plan_id == plan.id,
        LearningMission.day_number == plan.current_day
    ).first()

    if not mission:
        mission = db.query(LearningMission).filter(LearningMission.plan_id == plan.id).first()

    mission_tasks = []
    if mission:
        tasks = db.query(LearningMissionTask).filter(LearningMissionTask.mission_id == mission.id).all()
        mission_tasks = [
            {
                "id": str(t.id),
                "text": t.text,
                "done": t.completed,
                "topicId": t.topic_key or "t1"
            }
            for t in tasks
        ]

    # Build 7-day Journey view
    all_missions = db.query(LearningMission).filter(LearningMission.plan_id == plan.id).order_by(LearningMission.day_number).all()
    journey = []
    for day_i in range(1, 8):
        m = next((x for x in all_missions if x.day_number == day_i), None)
        status = "done" if (m and m.completed) else ("today" if day_i == plan.current_day else "upcoming")
        journey.append({
            "dayNumber": day_i,
            "label": f"Day {day_i}",
            "status": status,
        })

    # Fetch Topics
    topics_db = db.query(LearningTopic).filter(LearningTopic.plan_id == plan.id).all()
    topics = [
        {
          "id": t.topic_key,
          "title": t.title,
          "summary": t.summary,
          "explanation": t.explanation,
          "codeSnippet": t.code_snippet,
          "practiceQuestions": t.practice_questions or [],
          "completed": t.completed,
        }
        for t in topics_db
    ]

    # Fetch Resources
    resources_db = db.query(LearningResource).filter(LearningResource.plan_id == plan.id).all()
    resources = [
        {
            "type": r.type,
            "title": r.title,
            "source": r.source,
            "url": r.url,
            "durationOrTime": r.duration_or_time,
        }
        for r in resources_db
    ]

    # Fetch Notes
    notes_db = db.query(LearningNote).filter(LearningNote.user_id == current_user.id).all()
    notes = { n.topic_key: n.note_text for n in notes_db }

    # Fetch Tutor Messages
    msgs_db = db.query(LearningTutorMessage).filter(LearningTutorMessage.user_id == current_user.id).order_by(LearningTutorMessage.created_at.asc()).limit(50).all()
    tutor_messages = [
        {
            "id": str(m.id),
            "sender": m.sender,
            "text": m.text,
            "timestamp": m.created_at.strftime("%I:%M %p"),
        }
        for m in msgs_db
    ]

    return {
        "requires_calibration": False,
        "profile": get_user_onboarding_profile(current_user.id, current_user, db),
        "plan": {
            "id": str(plan.id),
            "title": plan.title,
            "target_role": plan.target_role,
            "current_week": plan.current_week,
            "current_day": plan.current_day,
            "progress_percent": plan.progress_percent,
        },
        "mission": {
            "weekNumber": mission.week_number if mission else 1,
            "dayNumber": mission.day_number if mission else 1,
            "weekTitle": mission.week_title if mission else "Foundations",
            "estimatedMinutes": mission.estimated_minutes if mission else 45,
            "tasks": mission_tasks,
        },
        "journey": journey,
        "topics": topics,
        "resources": resources,
        "notes": notes,
        "tutorMessages": tutor_messages,
    }


# ── POST /api/learning-agent/task/toggle ─────────────────────────────────────
@router.post("/task/toggle")
def toggle_task(
    req: ToggleTaskRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Real-time task completion toggle."""
    task = db.query(LearningMissionTask).filter(
        LearningMissionTask.id == req.task_id,
        LearningMissionTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.completed = not task.completed if req.completed is None else req.completed
    db.commit()

    # Recalculate plan progress %
    total_tasks = db.query(LearningMissionTask).filter(LearningMissionTask.user_id == current_user.id).count()
    done_tasks = db.query(LearningMissionTask).filter(LearningMissionTask.user_id == current_user.id, LearningMissionTask.completed == True).count()

    progress = int((done_tasks / total_tasks * 100)) if total_tasks > 0 else 0
    plan = db.query(UserLearningPlan).filter(UserLearningPlan.user_id == current_user.id).first()
    if plan:
        plan.progress_percent = progress
        db.commit()

    return {
        "status": "success",
        "task_id": str(task.id),
        "completed": task.completed,
        "progress_percent": progress
    }


# ── POST /api/learning-agent/topic/toggle ────────────────────────────────────
@router.post("/topic/toggle")
def toggle_topic(
    req: ToggleTopicRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Real-time study topic completion toggle."""
    topic = db.query(LearningTopic).filter(
        LearningTopic.topic_key == req.topic_key,
        LearningTopic.user_id == current_user.id
    ).first()

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    topic.completed = not topic.completed if req.completed is None else req.completed
    db.commit()

    return {
        "status": "success",
        "topic_key": topic.topic_key,
        "completed": topic.completed
    }


# ── GET & POST /api/learning-agent/notes ─────────────────────────────────────
@router.get("/notes")
def get_notes(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notes = db.query(LearningNote).filter(LearningNote.user_id == current_user.id).all()
    return { n.topic_key: n.note_text for n in notes }


@router.post("/notes")
def save_note(
    req: SaveNoteRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(LearningNote).filter(
        LearningNote.topic_key == req.topic_key,
        LearningNote.user_id == current_user.id
    ).first()

    if not note:
        note = LearningNote(
            user_id=current_user.id,
            topic_key=req.topic_key,
            note_text=req.note_text
        )
        db.add(note)
    else:
        note.note_text = req.note_text
        note.updated_at = datetime.utcnow()

    db.commit()
    return {"status": "success", "topic_key": req.topic_key}


# ── POST /api/learning-agent/tutor/chat ──────────────────────────────────────
@router.post("/tutor/chat")
def tutor_chat(
    req: TutorChatRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Real-time Nova AI Tutor conversation endpoint."""
    user_msg_str = req.message.strip()
    if not user_msg_str:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # 1. Save user message
    user_msg = LearningTutorMessage(
        user_id=current_user.id,
        sender="user",
        text=user_msg_str
    )
    db.add(user_msg)
    db.commit()

    # 2. Get history
    history_db = db.query(LearningTutorMessage).filter(
        LearningTutorMessage.user_id == current_user.id
    ).order_by(LearningTutorMessage.created_at.asc()).all()

    history = [{"sender": m.sender, "text": m.text} for m in history_db]

    # 3. Topic context
    topic_ctx = None
    if req.topic_key:
        top = db.query(LearningTopic).filter(
            LearningTopic.topic_key == req.topic_key,
            LearningTopic.user_id == current_user.id
        ).first()
        if top:
            topic_ctx = {"title": top.title, "summary": top.summary}

    user_profile = get_user_onboarding_profile(current_user.id, current_user, db)

    # 4. Generate AI response
    nova_reply_text = chat_with_nova_tutor(user_msg_str, history, topic_ctx, user_profile)

    # 5. Save Nova reply
    nova_msg = LearningTutorMessage(
        user_id=current_user.id,
        sender="nova",
        text=nova_reply_text
    )
    db.add(nova_msg)
    db.commit()
    db.refresh(nova_msg)

    return {
        "id": str(nova_msg.id),
        "sender": "nova",
        "text": nova_reply_text,
        "timestamp": nova_msg.created_at.strftime("%I:%M %p")
    }


# ── POST /api/learning-agent/recalibrate ──────────────────────────────────────
@router.post("/recalibrate")
def recalibrate_learning_agent(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resets memory & curriculum to trigger a fresh calibration onboarding."""
    mem = db.query(UserLearningMemory).filter(UserLearningMemory.user_id == current_user.id).first()
    if mem:
        mem.calibration_completed = False
        mem.target_topic = None
        db.commit()

    # Delete existing plan so a new curriculum can be generated
    db.query(UserLearningPlan).filter(UserLearningPlan.user_id == current_user.id).delete()
    db.commit()

    return {"status": "success", "message": "Learning Agent ready for recalibration"}


# ── GET /api/learning-agent/goal-board ───────────────────────────────────────
@router.get("/goal-board")
def get_goal_board_endpoint(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = get_user_onboarding_profile(current_user.id, current_user, db)
    plan = db.query(UserLearningPlan).filter(UserLearningPlan.user_id == current_user.id).first()
    return {
        "name": profile.get("name", "Learner"),
        "career_goal": profile.get("career_goal", "Software Engineer"),
        "current_level": profile.get("current_level", "Intermediate"),
        "target_timeline": profile.get("target_timeline", "6 months"),
        "daily_study_hours": profile.get("daily_study_hours", 2),
        "current_week": plan.current_week if plan else 1,
        "today_completion_pct": plan.progress_percent if plan else 25,
        "estimated_journey_weeks": plan.total_weeks * 7 if plan else 28,
    }


# ── GET /api/learning-agent/roadmap/status ───────────────────────────────────
@router.get("/roadmap/status")
def get_roadmap_status_endpoint(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mem = db.query(UserLearningMemory).filter(UserLearningMemory.user_id == current_user.id).first()
    plan = db.query(UserLearningPlan).filter(UserLearningPlan.user_id == current_user.id).first()
    profile = get_user_onboarding_profile(current_user.id, current_user, db)
    committed = bool(plan and mem and mem.calibration_completed and mem.target_topic)
    return {
        "week1_committed": committed,
        "destination": profile.get("career_goal", "Software Engineer"),
        "estimated_journey_weeks": (plan.total_weeks * 7) if plan else 28,
    }


# ── POST /api/learning-agent/roadmap/commit ──────────────────────────────────
@router.post("/roadmap/commit")
def commit_roadmap_endpoint(
    payload: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mem = db.query(UserLearningMemory).filter(UserLearningMemory.user_id == current_user.id).first()
    if not mem:
        mem = UserLearningMemory(user_id=current_user.id)
        db.add(mem)
    mem.target_topic = payload.get("chosen_path_id", "full_stack")
    mem.calibration_completed = True
    mem.updated_at = datetime.utcnow()
    db.commit()

    ensure_learning_plan_exists(current_user.id, current_user, mem, db)
    return {"status": "success", "message": "Week 1 committed successfully"}


def get_domain_default_content(career_goal: str) -> Dict[str, Any]:
    norm = (career_goal or "").lower()

    # JEE / Engineering Entrance
    if "jee" in norm or "iit" in norm or "crack_exam" in norm or "physics" in norm or "chemistry" in norm:
        return {
            "week_theme": f"{career_goal} Foundations & PYQ Drills",
            "objectives": [
                "Master Mechanics & Newton's Laws of Motion in Physics",
                "Solve Organic Reaction Mechanisms & NCERT Chemistry Drills",
                "Practice NTA Previous Year Questions (PYQs) & Speed Tests",
            ],
            "default_tasks": [
                {"id": "m1", "type": "topic", "title": "Mechanics & Laws of Motion (Physics)", "estimated_minutes": 45, "completed": True, "topic_id": "physics_mechanics"},
                {"id": "m2", "type": "topic", "title": "Organic Reaction Mechanisms (Chemistry)", "estimated_minutes": 45, "completed": False, "topic_id": "organic_chem"},
                {"id": "m3", "type": "practice", "title": "Solve 15 NTA JEE Previous Year Questions (PYQs)", "estimated_minutes": 30, "completed": False},
                {"id": "m4", "type": "project", "title": "Full 3-Hour NTA Mock Test Drill", "estimated_minutes": 60, "completed": False},
            ],
            "topic_explanation": "Newton's laws govern mechanical motion. Master free-body diagrams (FBD), work-energy theorem, and momentum conservation for numerical problem solving.",
            "code_snippet": {"language": "formula", "code": "// Key Physics Formulas:\nF_net = m * a\nWork = ∫ F · dx = ΔK (Work-Energy Theorem)\nImpulse = ∫ F dt = Δp"},
            "practice_questions": [
                {"id": "q1", "kind": "mcq", "prompt": "What is the condition for a body to be in translational equilibrium?", "options": ["ΣF = 0", "ΣF = m*a", "Work = 0", "Impulse = 0"]}
            ],
            "resource_video": {"title": "JEE Physics Mechanics & PYQ Problem Solving Guide", "url": "https://youtube.com", "source": "GrowthOS Academy", "duration": "25 min"},
            "resource_article": {"title": "NCERT Chemistry Organic Reactions Formula Sheet", "url": "https://docs.growthos.io", "source": "GrowthOS Notes"},
            "resource_docs": {"title": "Official NTA JEE Syllabus & PYQ Archive", "url": "https://nta.ac.in", "source": "NTA Official"},
        }

    # NEET / Medical / Doctor
    if "neet" in norm or "doctor" in norm or "medical" in norm or "biology" in norm or "mbbs" in norm:
        return {
            "week_theme": f"{career_goal} Human Physiology & Bio Mastery",
            "objectives": [
                "Master NCERT Human Physiology & Circulatory Systems",
                "Understand Cell Structure & Biomolecules for NEET Biology",
                "Practice 50 High-Yield NEET Diagram & Assertion-Reason Questions",
            ],
            "default_tasks": [
                {"id": "m1", "type": "topic", "title": "Human Physiology & Circulatory System", "estimated_minutes": 45, "completed": True, "topic_id": "human_physio"},
                {"id": "m2", "type": "topic", "title": "Cell Biology & Biomolecules", "estimated_minutes": 45, "completed": False, "topic_id": "cell_bio"},
                {"id": "m3", "type": "practice", "title": "Practice 30 NEET Bio Assertion-Reason Questions", "estimated_minutes": 30, "completed": False},
                {"id": "m4", "type": "project", "title": "NEET 700+ Score Mock Drill", "estimated_minutes": 60, "completed": False},
            ],
            "topic_explanation": "Human physiology forms ~30% of NEET Biology. Master cardiac cycle timing, blood circulation pathways, and NCERT terminology line-by-line.",
            "code_snippet": {"language": "concept", "code": "// Cardiac Cycle Breakdown:\nAtrial Systole: 0.1s\nVentricular Systole: 0.3s\nJoint Diastole: 0.4s\nTotal Cycle Duration: 0.8s (72 beats/min)"},
            "practice_questions": [
                {"id": "q1", "kind": "mcq", "prompt": "Which organelle is known as the powerhouse of the cell?", "options": ["Mitochondria", "Ribosome", "Golgi Apparatus", "Nucleus"]}
            ],
            "resource_video": {"title": "NEET Human Physiology Line-by-Line NCERT Guide", "url": "https://youtube.com", "source": "GrowthOS Medical", "duration": "30 min"},
            "resource_article": {"title": "NCERT Biology Master Revision Notes", "url": "https://docs.growthos.io", "source": "GrowthOS Medical"},
            "resource_docs": {"title": "Official NTA NEET Medical Syllabus", "url": "https://neet.nta.nic.in", "source": "NTA Official"},
        }

    # UPSC / Civil Services
    if "upsc" in norm or "civil" in norm or "ias" in norm or "governance" in norm:
        return {
            "week_theme": f"{career_goal} Indian Polity & Mains Preparation",
            "objectives": [
                "Master Fundamental Rights, Preamble & Constitutional Framework",
                "Understand Modern Indian History & Freedom Struggle",
                "Practice Mains Answer Writing & CSAT Quantitative Reasoning",
            ],
            "default_tasks": [
                {"id": "m1", "type": "topic", "title": "Indian Constitution & Fundamental Rights", "estimated_minutes": 45, "completed": True, "topic_id": "indian_polity"},
                {"id": "m2", "type": "topic", "title": "Modern History & Freedom Movement", "estimated_minutes": 45, "completed": False, "topic_id": "modern_history"},
                {"id": "m3", "type": "practice", "title": "Write 2 GS Mains Answer Writing Drafts", "estimated_minutes": 30, "completed": False},
                {"id": "m4", "type": "project", "title": "UPSC Prelims Mock Paper 1", "estimated_minutes": 60, "completed": False},
            ],
            "topic_explanation": "The Indian Constitution is the bedrock of GS Paper 2. Focus on Fundamental Rights (Articles 12-35), Directive Principles, and Landmark Supreme Court judgments.",
            "code_snippet": {"language": "concept", "code": "// Key Constitutional Articles:\nArticle 14: Equality before law\nArticle 19: Freedom of Speech & Expression\nArticle 21: Right to Life & Personal Liberty\nArticle 32: Constitutional Remedies (Writs)"},
            "practice_questions": [
                {"id": "q1", "kind": "mcq", "prompt": "Which Article of the Indian Constitution provides the Right to Constitutional Remedies?", "options": ["Article 32", "Article 21", "Article 14", "Article 370"]}
            ],
            "resource_video": {"title": "UPSC Indian Polity & Constitution Masterclass", "url": "https://youtube.com", "source": "GrowthOS UPSC", "duration": "25 min"},
            "resource_article": {"title": "Laxmikanth Polity Mind Maps & Notes", "url": "https://docs.growthos.io", "source": "GrowthOS Academy"},
            "resource_docs": {"title": "Official UPSC Civil Services Examination Syllabus", "url": "https://upsc.gov.in", "source": "UPSC Official"},
        }

    # Business / Entrepreneur
    if "business" in norm or "startup" in norm or "entrepreneur" in norm:
        return {
            "week_theme": f"{career_goal} Validation & MVP Launch",
            "objectives": [
                "Validate Customer Pain Points & Value Proposition",
                "Build & Launch a Minimum Viable Product (MVP)",
                "Establish Customer Acquisition & Unit Economics",
            ],
            "default_tasks": [
                {"id": "m1", "type": "topic", "title": "Customer Problem Validation & Lean Canvas", "estimated_minutes": 45, "completed": True, "topic_id": "customer_validation"},
                {"id": "m2", "type": "topic", "title": "MVP Launch & Product Architecture", "estimated_minutes": 45, "completed": False, "topic_id": "mvp_launch"},
                {"id": "m3", "type": "practice", "title": "Conduct 5 Customer Discovery Interviews", "estimated_minutes": 30, "completed": False},
                {"id": "m4", "type": "project", "title": "Launch Landing Page & Early Access Waitlist", "estimated_minutes": 60, "completed": False},
            ],
            "topic_explanation": "90% of startups fail due to building products nobody wants. Customer interviews and Lean Canvas validation de-risk your business model before scaling.",
            "code_snippet": {"language": "strategy", "code": "// Lean Startup Loop:\nBuild MVP -> Measure Customer Feedback -> Learn & Pivot\nUnit Economics: CAC < LTV / 3"},
            "practice_questions": [
                {"id": "q1", "kind": "mcq", "prompt": "What is the primary objective of a Minimum Viable Product (MVP)?", "options": ["Test core hypotheses with minimal effort", "Generate maximum revenue", "Hire a large team", "File patents"]}
            ],
            "resource_video": {"title": "Zero to One Startup Validation Playbook", "url": "https://youtube.com", "source": "GrowthOS Business", "duration": "20 min"},
            "resource_article": {"title": "Lean Canvas 1-Page Business Model Template", "url": "https://docs.growthos.io", "source": "GrowthOS Business"},
            "resource_docs": {"title": "Official GrowthOS Entrepreneurship Guide", "url": "https://docs.growthos.io", "source": "GrowthOS Docs"},
        }

    # Default Software Engineering / Tech
    return {
        "week_theme": f"{career_goal} Architecture & Engineering",
        "objectives": [
            "Master core system architecture and execution models",
            "Build robust modular component systems",
            "Deploy and test production-ready applications",
        ],
        "default_tasks": [
            {"id": "m1", "type": "topic", "title": "System Architecture & Execution Flow", "estimated_minutes": 45, "completed": True, "topic_id": "arch_flow"},
            {"id": "m2", "type": "topic", "title": "Modular Component Design", "estimated_minutes": 45, "completed": False, "topic_id": "modular_design"},
            {"id": "m3", "type": "practice", "title": "Solve 5 Algorithmic Challenges", "estimated_minutes": 30, "completed": False},
            {"id": "m4", "type": "project", "title": "Build Modular Production App", "estimated_minutes": 60, "completed": False},
        ],
        "topic_explanation": "Clean architecture decouples core logic from external dependencies, ensuring maintainable, testable, and scalable software systems.",
        "code_snippet": {"language": "typescript", "code": "// Clean Architecture Pattern Example\nexport class ModuleService {\n  async process(): Promise<boolean> {\n    return true;\n  }\n}"},
        "practice_questions": [
            {"id": "q1", "kind": "mcq", "prompt": "Why is separation of concerns important in system design?", "options": ["Reduces complexity & improves testability", "Makes code run 100x faster", "Removes need for databases", "Prevents all bugs"]}
        ],
        "resource_video": {"title": "System Architecture & Engineering Guide", "url": "https://youtube.com", "source": "GrowthOS Academy", "duration": "20 min"},
        "resource_article": {"title": "Clean Code Architecture Patterns", "url": "https://docs.growthos.io", "source": "GrowthOS Docs"},
        "resource_docs": {"title": "Official GrowthOS Engineering Docs", "url": "https://docs.growthos.io", "source": "GrowthOS Docs"},
    }


# ── GET /api/learning-agent/roadmap/current-week ─────────────────────────────
@router.get("/roadmap/current-week")
def get_current_week_roadmap_endpoint(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mem = db.query(UserLearningMemory).filter(UserLearningMemory.user_id == current_user.id).first()
    if not mem:
        mem = UserLearningMemory(user_id=current_user.id, calibration_completed=True)
        db.add(mem)
        db.commit()
    plan = ensure_learning_plan_exists(current_user.id, current_user, mem, db)
    profile = get_user_onboarding_profile(current_user.id, current_user, db)
    domain_defaults = get_domain_default_content(profile["career_goal"])
    missions = db.query(LearningMission).filter(LearningMission.plan_id == plan.id).order_by(LearningMission.day_number).all()

    days = []
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i, day_name in enumerate(day_names, start=1):
        m = next((x for x in missions if x.day_number == i), None)
        days.append({
            "day_label": day_name,
            "date": "",
            "theme": m.week_title if m else "Core Practice",
            "is_today": i == plan.current_day,
            "is_locked": i > plan.current_day,
            "mission_item_ids": [f"m{i}"],
            "topic_titles": ["Core Foundations", "Hands-on Practice"] if i <= 2 else ["Practice"],
        })

    return {
        "week_number": plan.current_week,
        "week_theme": plan.title or domain_defaults["week_theme"],
        "objectives": domain_defaults["objectives"],
        "days": days,
        "next_week_locked": True,
    }


# ── GET /api/learning-agent/missions/today ───────────────────────────────────
@router.get("/missions/today")
def get_today_mission_endpoint(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mem = db.query(UserLearningMemory).filter(UserLearningMemory.user_id == current_user.id).first()
    if not mem:
        mem = UserLearningMemory(user_id=current_user.id, calibration_completed=True)
        db.add(mem)
        db.commit()
    plan = ensure_learning_plan_exists(current_user.id, current_user, mem, db)
    profile = get_user_onboarding_profile(current_user.id, current_user, db)
    domain_defaults = get_domain_default_content(profile["career_goal"])

    mission = db.query(LearningMission).filter(LearningMission.plan_id == plan.id, LearningMission.day_number == plan.current_day).first()
    if not mission:
        mission = db.query(LearningMission).filter(LearningMission.plan_id == plan.id).first()

    tasks = db.query(LearningMissionTask).filter(LearningMissionTask.mission_id == mission.id).all() if mission else []

    items = []
    types = ["topic", "practice", "project"]
    for i, t in enumerate(tasks):
        items.append({
            "id": str(t.id),
            "type": types[i % 3],
            "title": t.text,
            "estimated_minutes": 30,
            "completed": t.completed,
            "topic_id": t.topic_key or "t1",
        })

    if not items:
        items = domain_defaults["default_tasks"]

    return {
        "date": datetime.utcnow().isoformat(),
        "estimated_minutes_total": sum(x["estimated_minutes"] for x in items),
        "items": items,
    }

    return {
        "date": datetime.utcnow().isoformat(),
        "estimated_minutes_total": sum(x["estimated_minutes"] for x in items),
        "items": items,
    }


# ── PATCH /api/learning-agent/missions/today/{item_id} ───────────────────────
@router.patch("/missions/today/{item_id}")
def update_today_mission_item(
    item_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(LearningMissionTask).filter(LearningMissionTask.id == item_id, LearningMissionTask.user_id == current_user.id).first()
    if task:
        if "completed" in payload:
            task.completed = payload["completed"]
            db.commit()
    return {"status": "success", "id": item_id}


# ── GET /api/learning-agent/topics/{topic_id} ─────────────────────────────────
@router.get("/topics/{topic_id}")
def get_topic_detail_endpoint(
    topic_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic = db.query(LearningTopic).filter(LearningTopic.topic_key == topic_id, LearningTopic.user_id == current_user.id).first()
    note = db.query(LearningNote).filter(LearningNote.topic_key == topic_id, LearningNote.user_id == current_user.id).first()
    profile = get_user_onboarding_profile(current_user.id, current_user, db)
    domain_defaults = get_domain_default_content(profile["career_goal"])

    if topic:
        cs = topic.code_snippet
        code_text = cs.get("code") if isinstance(cs, dict) else (cs or domain_defaults["code_snippet"]["code"])
        code_lang = cs.get("language") if isinstance(cs, dict) else domain_defaults["code_snippet"]["language"]
        return {
            "id": topic.topic_key,
            "title": topic.title,
            "week_number": 1,
            "explanation_md": topic.explanation or domain_defaults["topic_explanation"],
            "examples": [
                {"title": f"Mastering {topic.title}", "body": topic.summary or domain_defaults["topic_explanation"]}
            ],
            "code_snippets": [
                {"language": code_lang, "code": code_text, "caption": "Key Reference / Practice Formula"}
            ],
            "practice_questions": topic.practice_questions or domain_defaults["practice_questions"],
            "notes": note.note_text if note else "",
            "completed": topic.completed,
            "estimated_minutes": 30,
        }

    formatted_title = topic_id.replace("_", " ").title()
    return {
        "id": topic_id,
        "title": formatted_title,
        "week_number": 1,
        "explanation_md": domain_defaults["topic_explanation"],
        "examples": [
            {"title": f"Key Guide for {formatted_title}", "body": domain_defaults["topic_explanation"]}
        ],
        "code_snippets": [
            domain_defaults["code_snippet"]
        ],
        "practice_questions": domain_defaults["practice_questions"],
        "notes": note.note_text if note else "",
        "completed": False,
        "estimated_minutes": 30,
    }


# ── PATCH /api/learning-agent/topics/{topic_id} ───────────────────────────────
@router.patch("/topics/{topic_id}")
def patch_topic_endpoint(
    topic_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if "notes" in payload:
        n = db.query(LearningNote).filter(LearningNote.topic_key == topic_id, LearningNote.user_id == current_user.id).first()
        if not n:
            n = LearningNote(user_id=current_user.id, topic_key=topic_id, note_text=payload["notes"])
            db.add(n)
        else:
            n.note_text = payload["notes"]
        db.commit()

    if "completed" in payload:
        t = db.query(LearningTopic).filter(LearningTopic.topic_key == topic_id, LearningTopic.user_id == current_user.id).first()
        if t:
            t.completed = payload["completed"]
            db.commit()

    return {"status": "success", "topic_id": topic_id}


# ── GET /api/learning-agent/topics/{topic_id}/resources ───────────────────────
@router.get("/topics/{topic_id}/resources")
def get_topic_resources_endpoint(
    topic_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    res_list = db.query(LearningResource).filter(LearningResource.user_id == current_user.id, LearningResource.topic_key == topic_id).all()
    profile = get_user_onboarding_profile(current_user.id, current_user, db)
    domain_defaults = get_domain_default_content(profile["career_goal"])

    v = next((r for r in res_list if r.type == "video"), None)
    a = next((r for r in res_list if r.type == "article"), None)
    d = next((r for r in res_list if r.type in ["doc", "documentation"]), None)

    return {
        "best_video": {"title": v.title if v else domain_defaults["resource_video"]["title"], "url": v.url if v else domain_defaults["resource_video"]["url"], "source": v.source if v else domain_defaults["resource_video"]["source"], "duration": v.duration_or_time if v else domain_defaults["resource_video"]["duration"]},
        "best_article": {"title": a.title if a else domain_defaults["resource_article"]["title"], "url": a.url if a else domain_defaults["resource_article"]["url"], "source": a.source if a else domain_defaults["resource_article"]["source"]},
        "official_docs": {"title": d.title if d else domain_defaults["resource_docs"]["title"], "url": d.url if d else domain_defaults["resource_docs"]["url"], "source": d.source if d else domain_defaults["resource_docs"]["source"]},
        "project": {"title": f"Hands-on Drill for {topic_id.replace('_', ' ').title()}", "url": "https://github.com", "source": "GrowthOS Practice"},
        "more": [],
    }


# ── GET /api/learning-agent/progress/summary ─────────────────────────────────
@router.get("/progress/summary")
def get_progress_summary_endpoint(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    done_topics = db.query(LearningTopic).filter(LearningTopic.user_id == current_user.id, LearningTopic.completed == True).count()
    total_topics = db.query(LearningTopic).filter(LearningTopic.user_id == current_user.id).count() or 5
    done_tasks = db.query(LearningMissionTask).filter(LearningMissionTask.user_id == current_user.id, LearningMissionTask.completed == True).count()
    total_tasks = db.query(LearningMissionTask).filter(LearningMissionTask.user_id == current_user.id).count() or 4

    return {
        "topics_completed": done_topics,
        "topics_total": total_topics,
        "missions_completed": done_tasks,
        "missions_total": total_tasks,
        "practice_completion_pct": int((done_tasks / total_tasks * 100)) if total_tasks else 20,
        "study_minutes_today": 35,
        "study_minutes_goal": 180,
    }


# ── POST /api/learning-agent/tutor/message ────────────────────────────────────
@router.post("/tutor/message")
def tutor_message_endpoint(
    payload: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg_str = payload.get("message", "").strip()
    topic_ctx = payload.get("context", {})
    topic_key = topic_ctx.get("topic_id")

    req = TutorChatRequest(message=msg_str, topic_key=topic_key)
    res = tutor_chat(req, current_user, db)
    return {"reply": res["text"]}

