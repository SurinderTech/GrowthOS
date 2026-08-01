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
    name = current_user.name or current_user.email.split("@")[0]
    return {
        "name": name,
        "career_goal": (ob.career_goal or ob.primary_goal or ob.field_of_study if ob else "Software Engineering"),
        "current_level": (ob.experience_level if ob else "Intermediate"),
        "daily_study_hours": 2,
        "preferred_time_blocks": (ob.productivity_style if ob else "evening"),
        "target_timeline": "6 months",
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
    committed = bool(plan and mem and mem.calibration_completed)
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
            "topic_titles": ["Core Foundations", "Hands-on Implementation"] if i <= 2 else ["Practice"],
        })

    return {
        "week_number": plan.current_week,
        "week_theme": plan.title or "Python Foundations",
        "objectives": [
            "Understand core data types and variables",
            "Get comfortable with lists and control flow",
            "Ship a small calculator project",
        ],
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
            "topic_id": t.topic_key or "variables",
        })

    if not items:
        items = [
            {"id": "m1", "type": "topic", "title": "Learn Variables & Memory Models", "estimated_minutes": 30, "completed": True, "topic_id": "variables"},
            {"id": "m2", "type": "topic", "title": "Practice Data Structures & Lists", "estimated_minutes": 30, "completed": False, "topic_id": "lists"},
            {"id": "m3", "type": "practice", "title": "Solve 5 Algorithmic Challenges", "estimated_minutes": 30, "completed": False},
            {"id": "m4", "type": "project", "title": "Build Mini Calculator Project", "estimated_minutes": 50, "completed": False},
        ]

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

    if topic:
        cs = topic.code_snippet
        code_text = cs.get("code") if isinstance(cs, dict) else (cs or "name = \"Surinder\"\nprint(f'Hello {name}')")
        code_lang = cs.get("language") if isinstance(cs, dict) else "python"
        return {
            "id": topic.topic_key,
            "title": topic.title,
            "week_number": 1,
            "explanation_md": topic.explanation or "A variable is a named reference to a value stored in memory.",
            "examples": [
                {"title": "Assigning variables", "body": "age = 24\nname = \"Surinder\""},
                {"title": "Reassigning variables", "body": "score = 10\nscore += 5"}
            ],
            "code_snippets": [
                {"language": code_lang, "code": code_text, "caption": "Code example"}
            ],
            "practice_questions": [
                {"id": "q1", "kind": "mcq", "prompt": "What will type(5.0) return in Python?", "options": ["int", "float", "str", "bool"]}
            ],
            "notes": note.note_text if note else "",
            "completed": topic.completed,
            "estimated_minutes": 30,
        }

    return {
        "id": topic_id,
        "title": topic_id.capitalize(),
        "week_number": 1,
        "explanation_md": "A variable is a named reference to a value stored in memory in Python.",
        "examples": [
            {"title": "Assigning variables", "body": "age = 24\nname = \"Surinder\""}
        ],
        "code_snippets": [
            {"language": "python", "code": "x = 10\ny = 20\nprint(x + y)", "caption": "Basic operation"}
        ],
        "practice_questions": [
            {"id": "q1", "kind": "mcq", "prompt": "What is the result of 10 + 20 in Python?", "options": ["30", "1020", "Error"]}
        ],
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

    v = next((r for r in res_list if r.type == "video"), None)
    a = next((r for r in res_list if r.type == "article"), None)
    d = next((r for r in res_list if r.type in ["doc", "documentation"]), None)

    return {
        "best_video": {"title": v.title if v else f"Python {topic_id.capitalize()} in 10 Minutes", "url": v.url if v else "https://youtube.com", "source": v.source if v else "YouTube", "duration": v.duration_or_time if v else "10:12"},
        "best_article": {"title": a.title if a else f"Practical Guide to {topic_id.capitalize()}", "url": a.url if a else "https://realpython.com", "source": a.source if a else "Real Python"},
        "official_docs": {"title": d.title if d else f"Python {topic_id.capitalize()} Documentation", "url": d.url if d else "https://docs.python.org", "source": d.source if d else "docs.python.org"},
        "project": {"title": f"Build a project using {topic_id.capitalize()}", "url": "https://github.com", "source": "GrowthOS Projects"},
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

