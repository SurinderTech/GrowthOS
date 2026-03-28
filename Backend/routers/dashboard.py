"""
routers/dashboard.py
All dashboard API endpoints — growth plan, tasks, insights, skills, opportunities.
All routes protected by JWT auth.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from uuid import UUID
import uuid

from Backend.db.session import get_db
from Backend.models.dashboard import GrowthPlan, DailyTask, AIInsight
from Backend.models.onboarding import UserOnboarding
from Backend.services.smart_task_service import generate_smart_daily_tasks

from Backend.services.gemini_service import (
    generate_growth_plan,
    generate_daily_tasks,
    generate_ai_insight,
    generate_skill_recommendations,
    generate_opportunities,
    ask_ai,
    generate_career_graph,
    generate_career_jobs,
    generate_job_skills,
    generate_skill_subskills
)
from Backend.routers.auth import get_current_user


router = APIRouter(tags=["Dashboard"])

ai_cache = {}

def get_user_profile(user_id: UUID, db: Session) -> dict:
    """Build user profile dict from onboarding data for Gemini prompts."""
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
    if not ob:
        return {"user_type": "student", "primary_goal": "grow career", "interests": ["programming"]}
    
    profile = {
        "user_type": ob.user_type or "student",
        "primary_goal": ob.primary_goal or "grow career",
        "twelve_month_goal": ob.twelve_month_goal or "get a job",
        "interests": ob.interests or ["programming"],
        "daily_time": ob.daily_time or "2-3hours",
        "career_goal": ob.career_goal or "",
        "productivity_style": ob.productivity_style or "deep_focus",
        "country": ob.country or "India",
        "experience_level": ob.experience_level or "",
        "exam_type": ob.exam_type or "",
    }

    # Add user-type specific fields
    if ob.user_type == "student":
        profile.update({
            "education_level": ob.education_level or "",
            "field_of_study": ob.field_of_study or "",
        })
    elif ob.user_type == "freelancer":
        profile.update({
            "primary_skill": ob.primary_skill or "",
            "experience_level": ob.experience_level or "",
            "services_offered": ob.services_offered or [],
        })
    elif ob.user_type == "entrepreneur" or ob.user_type == "business_owner":
        profile.update({
            "business_type": ob.business_type or "",
            "revenue_stage": ob.revenue_stage or "",
            "business_goal": ob.business_goal or "",
        })
    elif ob.user_type == "creator":
        profile.update({
            "creator_platform": ob.creator_platform or "",
            "content_niche": ob.content_niche or "",
            "audience_size": ob.audience_size or "",
        })
    elif ob.user_type == "exam_aspirant":
        profile.update({
            "exam_type": ob.exam_type or "",
            "attempt_year": ob.attempt_year or "",
            "weak_subjects": ob.weak_subjects or [],
        })

    return profile


# ── GET /dashboard/ ───────────────────────────────────────────────────────────
@router.get("/")
def get_dashboard(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return basic dashboard meta for the hero section."""
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    plan = db.query(GrowthPlan).filter(
        GrowthPlan.user_id == current_user.id,
        GrowthPlan.is_active == True
    ).order_by(GrowthPlan.generated_at.desc()).first()

    return {
        "user_name": current_user.email.split("@")[0],
        "user_type": ob.user_type if ob else "student",
        "primary_goal": ob.primary_goal if ob else "",
        "twelve_month_goal": ob.twelve_month_goal if ob else "",
        "onboarding_completed": ob.onboarding_completed if ob else False,
        "growth_plan_generated": plan is not None,
    }


# ── GET /dashboard/growth-plan ────────────────────────────────────────────────
@router.get("/growth-plan")
def get_growth_plan(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the user's active AI growth plan."""

    plan = db.query(GrowthPlan).filter(
        GrowthPlan.user_id == current_user.id,
        GrowthPlan.is_active == True
    ).order_by(GrowthPlan.generated_at.desc()).first()

    if not plan:
        return None

    return {
        "id": str(plan.id),
        "title": plan.title,
        "summary": plan.summary,
        "months": plan.months,
        "generated_at": plan.generated_at.isoformat() if plan.generated_at else None,
    }

# ── POST /dashboard/regenerate-plan ──────────────────────────────────────────
@router.post("/regenerate-plan")
def regenerate_plan(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Regenerate the growth plan using Gemini AI."""
    # Deactivate old plans
    db.query(GrowthPlan).filter(
        GrowthPlan.user_id == current_user.id
    ).update({"is_active": False})
    db.commit()

    profile = get_user_profile(current_user.id, db)
    try:
        plan_data = generate_growth_plan(profile)
        new_plan = GrowthPlan(
            user_id=current_user.id,
            title=plan_data.get("title", "Your Growth Plan"),
            summary=plan_data.get("summary", ""),
            months=plan_data.get("months", []),
            is_active=True,
        )
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)
        return {
            "id": str(new_plan.id),
            "title": new_plan.title,
            "summary": new_plan.summary,
            "months": new_plan.months,
            "generated_at": new_plan.generated_at.isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI regeneration failed: {str(e)}")


# ── GET /dashboard/tasks/today ────────────────────────────────────────────────
@router.get("/tasks/today")
def get_today_tasks(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return today's smart tasks (2 hard + 1 easy)."""
    from sqlalchemy import cast, Date as SADate

    today = datetime.now(timezone.utc).date()

    # ── Read from smart_daily_tasks table first ───────────────────────────────
    tasks = (
        db.query(SmartDailyTask)
          .filter(
              SmartDailyTask.user_id == current_user.id,
              cast(SmartDailyTask.task_date, SADate) == today,
          )
          .order_by(SmartDailyTask.difficulty.desc())  # hard tasks first
          .all()
    )

    if tasks:
        return [
            {
                "id"               : str(t.id),
                "title"            : t.title,
                "question"         : t.question,
                "description"      : t.description,
                "difficulty"       : t.difficulty,
                "completed"        : t.completed,
                "priority"         : t.priority,
                "estimated_minutes": t.estimated_minutes,
                "category"         : t.category,
                "skill_tag"        : t.skill_tag,
                "resource_url"     : t.resource_url,
                "xp_reward"        : t.xp_reward,
                "ai_feedback"      : t.ai_feedback,
            }
            for t in tasks
        ]

    # ── On-demand fallback — generates now if scheduler hasn't run yet ────────
    profile    = get_user_profile(current_user.id, db)
    tasks_data = generate_smart_daily_tasks(profile)

    if not tasks_data:
        return []

    saved = []
    for t in tasks_data:
        task = SmartDailyTask(
            user_id           = current_user.id,
            title             = t.get("title", "Today's Task"),
            question          = t.get("question", t.get("description", "")),
            description       = t.get("description", ""),
            difficulty        = t.get("difficulty", "hard"),
            category          = t.get("category", "Learning"),
            skill_tag         = t.get("skill_tag", ""),
            resource_url      = t.get("resource_url", ""),
            priority          = t.get("priority", "high"),
            estimated_minutes = t.get("estimated_minutes", 45),
            xp_reward         = t.get("xp_reward", 50),
            task_date         = datetime.now(timezone.utc),
        )
        db.add(task)
        saved.append(task)

    db.commit()
    for task in saved:
        db.refresh(task)

    return [
        {
            "id"               : str(t.id),
            "title"            : t.title,
            "question"         : t.question,
            "description"      : t.description,
            "difficulty"       : t.difficulty,
            "completed"        : t.completed,
            "priority"         : t.priority,
            "estimated_minutes": t.estimated_minutes,
            "category"         : t.category,
            "skill_tag"        : t.skill_tag,
            "resource_url"     : t.resource_url,
            "xp_reward"        : t.xp_reward,
            "ai_feedback"      : t.ai_feedback,
        }
        for t in saved
    ]

# ── POST /dashboard/tasks/{task_id}/complete ──────────────────────────────────
@router.post("/tasks/{task_id}/complete")
def complete_task(task_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(DailyTask).filter(DailyTask.id == task_id, DailyTask.user_id == current_user.id).first()
    if not task: raise HTTPException(404, "Task not found")
    task.completed = True
    task.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True}


# ── POST /dashboard/tasks/{task_id}/uncomplete ────────────────────────────────
@router.post("/tasks/{task_id}/uncomplete")
def uncomplete_task(task_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(DailyTask).filter(DailyTask.id == task_id, DailyTask.user_id == current_user.id).first()
    if not task: raise HTTPException(404, "Task not found")
    task.completed = False
    task.completed_at = None
    db.commit()
    return {"success": True}


# ── GET /dashboard/ai-insight ─────────────────────────────────────────────────
@router.get("/ai-insight")
def get_ai_insight(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the latest AI insight, generating if needed."""
    latest = db.query(AIInsight).filter(
        AIInsight.user_id == current_user.id
    ).order_by(AIInsight.generated_at.desc()).first()

    if not latest:
        profile = get_user_profile(current_user.id, db)
        try:
            text = generate_ai_insight(profile)
            latest = AIInsight(user_id=current_user.id, insight=text)
            db.add(latest)
            db.commit()
            db.refresh(latest)
        except Exception as e:
            raise HTTPException(500, f"Insight generation failed: {str(e)}")

    return {"insight": latest.insight, "generated_at": latest.generated_at.isoformat()}


# ── GET /dashboard/skills ─────────────────────────────────────────────────────
# ── GET /dashboard/skills ─────────────────────────────────────────────────────

def _get_fallback_skills(profile: dict) -> list:
    """Return relevant fallback skills when Gemini times out."""
    user_type = profile.get("user_type", "student")
    exam_type = profile.get("exam_type", "")

    if user_type == "exam_aspirant" and exam_type == "jee":
        return [
            {"id": "s1", "name": "Physics",         "emoji": "⚛️", "level": "Intermediate", "relevance_score": 98, "why_relevant": "Core JEE subject — highest weightage"},
            {"id": "s2", "name": "Mathematics",     "emoji": "📐", "level": "Intermediate", "relevance_score": 97, "why_relevant": "Essential for JEE — calculus and algebra"},
            {"id": "s3", "name": "Chemistry",       "emoji": "🧪", "level": "Beginner",     "relevance_score": 95, "why_relevant": "Third pillar of JEE — organic is key"},
            {"id": "s4", "name": "Problem Solving", "emoji": "🧠", "level": "Intermediate", "relevance_score": 90, "why_relevant": "Speed and accuracy define JEE rank"},
        ]
    if user_type == "exam_aspirant" and exam_type == "neet":
        return [
            {"id": "s1", "name": "Biology",       "emoji": "🧬", "level": "Intermediate", "relevance_score": 98, "why_relevant": "90 questions in NEET — highest weight"},
            {"id": "s2", "name": "Chemistry",     "emoji": "🧪", "level": "Beginner",     "relevance_score": 95, "why_relevant": "45 questions — organic and inorganic"},
            {"id": "s3", "name": "Physics",       "emoji": "⚛️", "level": "Beginner",     "relevance_score": 93, "why_relevant": "45 questions — numericals focused"},
            {"id": "s4", "name": "NCERT Mastery", "emoji": "📚", "level": "Beginner",     "relevance_score": 99, "why_relevant": "95% of NEET comes directly from NCERT"},
        ]
    if user_type == "exam_aspirant" and exam_type == "upsc":
        return [
            {"id": "s1", "name": "Polity",          "emoji": "🏛️", "level": "Beginner", "relevance_score": 97, "why_relevant": "High weightage in UPSC Prelims and Mains"},
            {"id": "s2", "name": "History",         "emoji": "📜", "level": "Beginner", "relevance_score": 95, "why_relevant": "Modern history is crucial for GS Paper 1"},
            {"id": "s3", "name": "Current Affairs", "emoji": "📰", "level": "Beginner", "relevance_score": 98, "why_relevant": "Daily reading separates toppers from others"},
            {"id": "s4", "name": "Answer Writing",  "emoji": "✍️", "level": "Beginner", "relevance_score": 96, "why_relevant": "Mains score depends entirely on answer quality"},
        ]
    if user_type == "student":
        return [
            {"id": "s1", "name": "Python",          "emoji": "🐍", "level": "Beginner",     "relevance_score": 95, "why_relevant": "Most in-demand language for your career goal"},
            {"id": "s2", "name": "Data Structures", "emoji": "🗂️", "level": "Beginner",     "relevance_score": 92, "why_relevant": "Core CS fundamental for all tech interviews"},
            {"id": "s3", "name": "Web Development", "emoji": "🌐", "level": "Beginner",     "relevance_score": 88, "why_relevant": "Build real projects to grow your portfolio"},
            {"id": "s4", "name": "SQL",             "emoji": "🗄️", "level": "Not started", "relevance_score": 85, "why_relevant": "Every tech role requires database knowledge"},
        ]
    if user_type == "freelancer":
        return [
            {"id": "s1", "name": "Client Communication", "emoji": "💬", "level": "Intermediate", "relevance_score": 97, "why_relevant": "Retaining clients is more valuable than finding new ones"},
            {"id": "s2", "name": "Portfolio Building",   "emoji": "🎨", "level": "Beginner",     "relevance_score": 95, "why_relevant": "Your portfolio is your most powerful sales tool"},
            {"id": "s3", "name": "Pricing Strategy",     "emoji": "💰", "level": "Beginner",     "relevance_score": 90, "why_relevant": "Most freelancers undercharge — fix this first"},
            {"id": "s4", "name": "Project Management",   "emoji": "📋", "level": "Beginner",     "relevance_score": 88, "why_relevant": "Deliver on time, every time to build reputation"},
        ]
    if user_type == "entrepreneur":
        return [
            {"id": "s1", "name": "Product Strategy", "emoji": "🚀", "level": "Beginner",     "relevance_score": 96, "why_relevant": "Building the right thing matters more than building it right"},
            {"id": "s2", "name": "Marketing",        "emoji": "📣", "level": "Beginner",     "relevance_score": 94, "why_relevant": "Distribution beats product in early stage startups"},
            {"id": "s3", "name": "Finance",          "emoji": "💰", "level": "Beginner",     "relevance_score": 91, "why_relevant": "Know your numbers or someone else will"},
            {"id": "s4", "name": "Sales",            "emoji": "🤝", "level": "Intermediate", "relevance_score": 93, "why_relevant": "Nothing happens until someone sells something"},
        ]
    if user_type == "creator":
        return [
            {"id": "s1", "name": "Content Strategy", "emoji": "🎯", "level": "Beginner",     "relevance_score": 97, "why_relevant": "Consistent strategy beats random viral posts"},
            {"id": "s2", "name": "SEO",              "emoji": "🔍", "level": "Beginner",     "relevance_score": 92, "why_relevant": "Organic reach compounds over time"},
            {"id": "s3", "name": "Video Editing",    "emoji": "🎬", "level": "Intermediate", "relevance_score": 89, "why_relevant": "Quality production increases watch time significantly"},
            {"id": "s4", "name": "Monetisation",     "emoji": "💰", "level": "Beginner",     "relevance_score": 94, "why_relevant": "Multiple revenue streams protect your income"},
        ]
    return [
        {"id": "s1", "name": "Critical Thinking", "emoji": "🧠", "level": "Intermediate", "relevance_score": 90, "why_relevant": "Foundation of all growth and decision making"},
        {"id": "s2", "name": "Communication",     "emoji": "🗣️", "level": "Intermediate", "relevance_score": 88, "why_relevant": "The #1 skill that accelerates every career"},
        {"id": "s3", "name": "Digital Skills",    "emoji": "💻", "level": "Beginner",     "relevance_score": 85, "why_relevant": "Essential in today's economy"},
        {"id": "s4", "name": "Personal Finance",  "emoji": "💰", "level": "Beginner",     "relevance_score": 82, "why_relevant": "Financial literacy compounds like interest"},
    ]


@router.get("/skills")
def get_skills(current_user=Depends(get_current_user), db: Session = Depends(get_db)):

    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    if ob and ob.generated_skills:
        return ob.generated_skills

    profile = get_user_profile(current_user.id, db)

    try:
        skills_data = generate_skill_recommendations(profile)
        if ob and skills_data:
            ob.generated_skills = skills_data
            db.commit()
        return skills_data
    except Exception as e:
        print(f"Skill generation failed: {e}")
        return _get_fallback_skills(profile)

# ── GET /dashboard/opportunities ─────────────────────────────────────────────
@router.get("/opportunities")
def get_opportunities(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return personalized opportunities. Generates fresh if not cached."""

    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    if ob and getattr(ob, "generated_opportunities", None):
        return getattr(ob, "generated_opportunities", [])

    profile = get_user_profile(current_user.id, db)
    try:
        opp = generate_opportunities(profile)
        if ob and opp:
            ob.generated_opportunities = opp
            db.commit()
        return opp
    except Exception as e:
        print(f"Opportunity generation failed: {e}")
        return []
# ── POST /dashboard/ask-ai ────────────────────────────────────────────────────
@router.post("/ask-ai")
def ask_ai_endpoint(body: dict, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Freeform AI chat for the user."""
    message = body.get("message", "").strip()
    if not message: raise HTTPException(400, "Message required")
    profile = get_user_profile(current_user.id, db)
    try:
        reply = ask_ai(message, profile)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(500, f"AI request failed: {str(e)}")

# ── POST /dashboard/generate-roadmap ─────────────────────────────────────────
@router.post("/generate-roadmap")
def generate_roadmap(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate AI roadmap for the user."""

    # Get onboarding profile
    profile = get_user_profile(current_user.id, db)

    if not profile:
        raise HTTPException(status_code=400, detail="Onboarding not completed")

    try:
        # Call Gemini AI
        plan_data = generate_growth_plan(profile)

        plan = GrowthPlan(
            user_id=current_user.id,
            title=plan_data.get("title", "Your Growth Plan"),
            summary=plan_data.get("summary", ""),
            months=plan_data.get("months", []),
            is_active=True,
        )

        db.add(plan)
        db.commit()
        db.refresh(plan)

        return {
            "id": str(plan.id),
            "title": plan.title,
            "summary": plan.summary,
            "months": plan.months,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# ── GET /dashboard/career-graph ─────────────────────────────────────────────
@router.get("/career-graph")
def get_career_graph(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    force_regenerate: bool = False
):

    # Get onboarding record
    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()

    # Build user profile
    profile = get_user_profile(current_user.id, db)

    # If graph already exists and not forcing regeneration → return cached graph
    if ob and ob.career_graph and not force_regenerate:
        print("Returning cached career graph")
        return ob.career_graph

    # Generate new graph from AI
    # This should be dynamic based on their profession/onboarding
    graph = generate_career_graph(profile)

    print("Generated career graph for profile:", profile.get("user_type"))

    # Save graph in onboarding record
    if ob:
        ob.career_graph = graph
        db.commit()

    return graph
# ── GET /dashboard/career-jobs ─────────────────────────────────────────────
@router.get("/career-jobs")
def get_career_jobs(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate career roles based on the user's onboarding profile."""

    profile = get_user_profile(current_user.id, db)

    jobs = generate_career_jobs(profile)

    return jobs
# ── GET /dashboard/career-skills/{job} ──────────────────────────────────────
@router.get("/career-skills/{job}")
def get_job_skills(job: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate required skills for a specific career role."""

    skills = generate_job_skills(job)

    return skills
# ── GET /dashboard/career-subskills/{skill} ─────────────────────────────────
@router.get("/career-subskills/{skill}")
def get_skill_subskills(skill: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate subskills for a specific skill."""

    subskills = generate_skill_subskills(skill)

    return subskills