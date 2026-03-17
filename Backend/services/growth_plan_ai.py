"""
services/growth_plan_ai.py
Gemini AI functions specifically for the Growth Plan system.
Generates personalized 4-phase execution roadmaps based on onboarding profile.
Falls back to rich pre-built data if Gemini fails or times out.
"""

import json
import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
MODEL_NAME = "gemini-flash-latest"


def _get_model():
    return genai.GenerativeModel(MODEL_NAME)


def _safe_json_list(text: str) -> list:
    """Parse JSON array from Gemini response safely."""
    clean = text.strip()
    if "```" in clean:
        try:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        except IndexError:
            pass
    start = clean.find("[")
    end   = clean.rfind("]")
    if start != -1 and end != -1:
        clean = clean[start:end+1]
    return json.loads(clean.strip())


def _safe_json_obj(text: str) -> dict:
    """Parse JSON object from Gemini response safely."""
    clean = text.strip()
    if "```" in clean:
        try:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        except IndexError:
            pass
    start = clean.find("{")
    end   = clean.rfind("}")
    if start != -1 and end != -1:
        clean = clean[start:end+1]
    return json.loads(clean.strip())


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Generate full 4-phase plan structure from profile
# ─────────────────────────────────────────────────────────────────────────────

def generate_full_growth_plan(profile: dict) -> dict:
    """
    Generate a complete 4-phase growth plan tailored to the user's profile.
    Returns a dict with goal info + 4 phases, each with skills and tasks.

    Falls back to get_fallback_plan(profile) if Gemini fails.
    """
    user_type = profile.get("user_type", "student")
    goal      = profile.get("twelve_month_goal", "grow career")
    exam_type = profile.get("exam_type", "")

    # Build context lines for specific user types
    extra = _build_context(profile)

    prompt = f"""
You are GrowthOS AI — a world-class growth coach building a personal execution roadmap.

User Profile:
- Type: {user_type}
- 12-Month Goal: {goal}
- Primary Goal: {profile.get("primary_goal", "")}
- Daily Time: {profile.get("daily_time", "2-3hours")}
- Productivity Style: {profile.get("productivity_style", "deep_focus")}
- Country: {profile.get("country", "India")}
{extra}

Generate a complete 4-phase execution roadmap. Each phase has:
- 4 skills with realistic progress levels
- 4-5 specific actionable tasks with XP rewards
- A milestone and reward

Return ONLY a JSON object (no markdown, no explanation):
{{
  "goal": "Specific goal based on user profile e.g. Crack JEE 2026",
  "goal_icon": "single relevant emoji",
  "category": "Category e.g. Competitive Exam | Career | Business | Creator | Freelance",
  "timeline": "X months",
  "start_date": "Month Year",
  "target_date": "Month Year",
  "smart_message_type": "info",
  "smart_message_text": "One specific motivating AI coach message based on their goal",
  "phases": [
    {{
      "phase_number": 1,
      "label": "Phase 1",
      "theme": "Foundation",
      "status": "completed",
      "progress": 100,
      "xp_total": 260,
      "xp_earned": 260,
      "milestone": "Phase 1 milestone name",
      "milestone_reward": "emoji Badge name + XP amount",
      "skills": [
        {{"name": "Specific skill name", "level": "Beginner|Intermediate|Advanced", "progress": 100}}
      ],
      "tasks": [
        {{
          "title": "Specific actionable task title",
          "xp": 60,
          "difficulty": "easy|medium|hard",
          "task_type": "challenge|revision|build|mcq|reading",
          "completed": true
        }}
      ]
    }},
    {{
      "phase_number": 2,
      "label": "Phase 2",
      "theme": "Intermediate",
      "status": "active",
      "progress": 40,
      "xp_total": 500,
      "xp_earned": 180,
      "milestone": "Phase 2 milestone name",
      "milestone_reward": "emoji Badge name + XP + unlock benefit",
      "skills": [...],
      "tasks": [...]
    }},
    {{
      "phase_number": 3,
      "label": "Phase 3",
      "theme": "Advanced",
      "status": "locked",
      "progress": 0,
      "xp_total": 670,
      "xp_earned": 0,
      "milestone": "Phase 3 milestone name",
      "milestone_reward": "emoji Badge name + XP + major unlock",
      "skills": [...],
      "tasks": [...]
    }},
    {{
      "phase_number": 4,
      "label": "Phase 4",
      "theme": "Mastery",
      "status": "locked",
      "progress": 0,
      "xp_total": 850,
      "xp_earned": 0,
      "milestone": "Phase 4 milestone name — final goal",
      "milestone_reward": "👑 Champion Badge + 2000 XP + Priority Mentorship",
      "skills": [...],
      "tasks": [...]
    }}
  ]
}}

Rules:
- Be SPECIFIC to the user's exact goal. JEE → Physics/Maths/Chemistry tasks. UPSC → Polity/History/Current Affairs.
- Tasks must be real, actionable, not generic.
- Phase 1 should always be completed (status: "completed", progress: 100, all tasks completed: true).
- Phase 2 is active with ~40-50% progress (some tasks completed, some not).
- Phases 3 and 4 are locked with 0 progress.
- XP values: easy=40-60, medium=70-100, hard=100-150.
"""

    try:
        model = _get_model()
        response = model.generate_content(prompt, request_options={"timeout": 20})
        data = _safe_json_obj(response.text)
        print(f"✅ Gemini generated growth plan for {user_type}/{exam_type}")
        return data
    except Exception as e:
        print(f"⚠️  Gemini growth plan failed ({e}), using fallback")
        return get_fallback_plan(profile)


def _build_context(profile: dict) -> str:
    """Build extra context lines for Gemini prompt based on user type."""
    user_type = profile.get("user_type", "student")
    lines = []

    if user_type == "exam_aspirant":
        lines += [
            f"- Exam: {profile.get('exam_type', '').upper()}",
            f"- Attempt Year: {profile.get('attempt_year', '2026')}",
            f"- Weak Subjects: {', '.join(profile.get('weak_subjects', []))}",
            f"- Study Hours: {profile.get('study_hours_daily', '6')} hours/day",
        ]
    elif user_type == "student":
        lines += [
            f"- Field of Study: {profile.get('field_of_study', '')}",
            f"- Career Goal: {profile.get('career_goal', '')}",
            f"- Education Level: {profile.get('education_level', '')}",
        ]
    elif user_type == "freelancer":
        lines += [
            f"- Primary Skill: {profile.get('primary_skill', '')}",
            f"- Experience: {profile.get('experience_level', '')}",
            f"- Services: {', '.join(profile.get('services_offered', []))}",
            f"- Income Goal: {profile.get('monthly_income_goal', '')}",
        ]
    elif user_type in ("entrepreneur", "business_owner"):
        lines += [
            f"- Business Type: {profile.get('business_type', '')}",
            f"- Revenue Stage: {profile.get('revenue_stage', '')}",
            f"- Business Goal: {profile.get('business_goal', '')}",
            f"- Team Size: {profile.get('team_size', '')}",
        ]
    elif user_type == "creator":
        lines += [
            f"- Platform: {profile.get('creator_platform', '')}",
            f"- Niche: {profile.get('content_niche', '')}",
            f"- Audience: {profile.get('audience_size', '')}",
        ]

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Generate smart AI coach message
# ─────────────────────────────────────────────────────────────────────────────

def generate_smart_message(profile: dict, plan_context: dict) -> dict:
    """
    Generate a contextual AI coach message based on user's current progress.
    Called when plan is loaded to check streak, missed tasks, etc.
    Falls back to a safe default.
    """
    streak         = plan_context.get("streak", 0)
    phase_progress = plan_context.get("phase_progress", 40)
    missed_yesterday = plan_context.get("missed_yesterday", False)

    prompt = f"""
You are GrowthOS AI coach. Write ONE short motivating message (1-2 sentences) for this user.

User: {profile.get("user_type", "student")} working towards {profile.get("twelve_month_goal", "their goal")}
Current streak: {streak} days
Current phase progress: {phase_progress}%
Missed yesterday: {missed_yesterday}

Rules:
- Be specific and direct. Reference their actual goal.
- If missed_yesterday=True, create urgency but stay supportive.
- If streak >= 7, celebrate the streak.
- If phase_progress >= 80, push them to finish the phase.
- Plain text only. No markdown. Max 2 sentences.
"""
    try:
        model = _get_model()
        response = model.generate_content(prompt, request_options={"timeout": 8})
        text = response.text.strip()
        msg_type = "warning" if missed_yesterday else ("success" if streak >= 7 else "info")
        return {"type": msg_type, "text": text}
    except Exception as e:
        print(f"Smart message generation failed: {e}")
        if missed_yesterday:
            return {"type": "warning", "text": "You missed yesterday's task. Get back on track today to protect your streak."}
        if streak >= 7:
            return {"type": "success", "text": f"Amazing! You're on a {streak}-day streak. Keep this momentum going."}
        return {"type": "info", "text": "Every task you complete today brings you closer to your goal. Stay focused."}


# ─────────────────────────────────────────────────────────────────────────────
# FALLBACK DATA — Rich, user-type specific
# Used when Gemini fails or times out
# ─────────────────────────────────────────────────────────────────────────────

def get_fallback_plan(profile: dict) -> dict:
    """
    Returns a complete, rich fallback plan based on user_type and exam_type.
    This should feel personalized even without AI.
    """
    user_type = profile.get("user_type", "student")
    exam_type = profile.get("exam_type", "").lower()

    if user_type == "exam_aspirant":
        if exam_type == "jee":
            return _fallback_jee(profile)
        elif exam_type == "neet":
            return _fallback_neet(profile)
        elif exam_type == "upsc":
            return _fallback_upsc(profile)
        else:
            return _fallback_exam_generic(profile)
    elif user_type == "student":
        return _fallback_student(profile)
    elif user_type == "freelancer":
        return _fallback_freelancer(profile)
    elif user_type in ("entrepreneur", "business_owner"):
        return _fallback_entrepreneur(profile)
    elif user_type == "creator":
        return _fallback_creator(profile)
    else:
        return _fallback_self_growth(profile)


# ── JEE Fallback ──────────────────────────────────────────────────────────────
def _fallback_jee(profile: dict) -> dict:
    year = profile.get("attempt_year", "2026")
    return {
        "goal": f"Crack JEE {year}",
        "goal_icon": "🎯",
        "category": "Competitive Exam",
        "timeline": "6 months",
        "start_date": "Jan 2026",
        "target_date": "Jun 2026",
        "smart_message_type": "info",
        "smart_message_text": f"JEE {year} is your milestone. Consistent daily practice in Physics and Maths separates toppers from the rest.",
        "phases": [
            {
                "phase_number": 1, "label": "Phase 1", "theme": "Foundation",
                "status": "completed", "progress": 100,
                "xp_total": 280, "xp_earned": 280,
                "milestone": "Foundation Complete",
                "milestone_reward": "🏅 Foundation Badge + 200 XP",
                "skills": [
                    {"name": "Mathematics Basics", "level": "Intermediate", "progress": 100},
                    {"name": "Physics Fundamentals", "level": "Intermediate", "progress": 100},
                    {"name": "Chemistry Basics", "level": "Beginner", "progress": 90},
                    {"name": "NCERT Mastery", "level": "Intermediate", "progress": 100},
                ],
                "tasks": [
                    {"title": "Complete Class 11 Maths syllabus review", "xp": 60, "difficulty": "medium", "task_type": "revision", "completed": True},
                    {"title": "Finish Physics Chapters 1–8 (Kinematics to Gravitation)", "xp": 70, "difficulty": "medium", "task_type": "reading", "completed": True},
                    {"title": "Complete NCERT Chemistry Part 1 (Class 11)", "xp": 60, "difficulty": "easy", "task_type": "reading", "completed": True},
                    {"title": "Solve 100 foundation-level MCQs across all 3 subjects", "xp": 90, "difficulty": "easy", "task_type": "mcq", "completed": True},
                ],
            },
            {
                "phase_number": 2, "label": "Phase 2", "theme": "Intermediate",
                "status": "active", "progress": 45,
                "xp_total": 520, "xp_earned": 180,
                "milestone": "Intermediate Mastery",
                "milestone_reward": "⚡ Speed Badge + 500 XP + AI Analytics Unlock",
                "skills": [
                    {"name": "Calculus & Integration", "level": "Intermediate", "progress": 55},
                    {"name": "Electrostatics & Current", "level": "Beginner", "progress": 40},
                    {"name": "Organic Chemistry", "level": "Beginner", "progress": 30},
                    {"name": "Coordinate Geometry", "level": "Intermediate", "progress": 60},
                ],
                "tasks": [
                    {"title": "Master integration techniques — solve 20 problems", "xp": 100, "difficulty": "hard", "task_type": "challenge", "completed": True},
                    {"title": "Solve 50 Electrostatics MCQs (PW / Allen)", "xp": 80, "difficulty": "medium", "task_type": "mcq", "completed": True},
                    {"title": "Organic Chemistry — reaction mechanisms (Class 12 NCERT)", "xp": 90, "difficulty": "hard", "task_type": "revision", "completed": False},
                    {"title": "Complete coordinate geometry problem set (50 questions)", "xp": 85, "difficulty": "medium", "task_type": "challenge", "completed": False},
                    {"title": "Full-length JEE mock test (Paper 1 — 3 hours)", "xp": 165, "difficulty": "hard", "task_type": "challenge", "completed": False},
                ],
            },
            {
                "phase_number": 3, "label": "Phase 3", "theme": "Advanced",
                "status": "locked", "progress": 0,
                "xp_total": 680, "xp_earned": 0,
                "milestone": "Advanced Cleared",
                "milestone_reward": "🔥 Elite Badge + 1000 XP + Custom AI Roadmap",
                "skills": [
                    {"name": "Differential Equations", "level": "Advanced", "progress": 0},
                    {"name": "Nuclear & Modern Physics", "level": "Advanced", "progress": 0},
                    {"name": "Inorganic Chemistry", "level": "Intermediate", "progress": 0},
                    {"name": "3D Geometry & Vectors", "level": "Advanced", "progress": 0},
                ],
                "tasks": [
                    {"title": "Differential equations — 30 problems (JEE Advanced level)", "xp": 130, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "JEE Advanced 2024 paper analysis — topic mapping", "xp": 100, "difficulty": "hard", "task_type": "revision", "completed": False},
                    {"title": "Complete mock test series — 5 full-length papers", "xp": 300, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "Weak topic elimination sprint (your weak subjects)", "xp": 150, "difficulty": "hard", "task_type": "challenge", "completed": False},
                ],
            },
            {
                "phase_number": 4, "label": "Phase 4", "theme": "Mastery",
                "status": "locked", "progress": 0,
                "xp_total": 880, "xp_earned": 0,
                "milestone": f"JEE {year} Ready",
                "milestone_reward": "👑 Champion Badge + 2000 XP + Priority Mentorship",
                "skills": [
                    {"name": "Full Syllabus Revision", "level": "Advanced", "progress": 0},
                    {"name": "Speed & Accuracy Drills", "level": "Advanced", "progress": 0},
                    {"name": "Exam Strategy & Time Management", "level": "Advanced", "progress": 0},
                ],
                "tasks": [
                    {"title": "10 full-length JEE mock tests with error analysis", "xp": 400, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "Error log — identify top 10 recurring mistakes", "xp": 200, "difficulty": "hard", "task_type": "revision", "completed": False},
                    {"title": "Speed drills — 90 MCQs in 60 minutes", "xp": 280, "difficulty": "hard", "task_type": "mcq", "completed": False},
                ],
            },
        ],
    }


# ── NEET Fallback ─────────────────────────────────────────────────────────────
def _fallback_neet(profile: dict) -> dict:
    year = profile.get("attempt_year", "2026")
    return {
        "goal": f"Crack NEET {year}",
        "goal_icon": "🩺",
        "category": "Medical Entrance",
        "timeline": "6 months",
        "start_date": "Jan 2026",
        "target_date": "Jun 2026",
        "smart_message_type": "info",
        "smart_message_text": "NEET is 95% NCERT. Master your textbooks before anything else — that's your fastest path to 650+.",
        "phases": [
            {
                "phase_number": 1, "label": "Phase 1", "theme": "NCERT Foundation",
                "status": "completed", "progress": 100,
                "xp_total": 300, "xp_earned": 300,
                "milestone": "NCERT Foundation Complete",
                "milestone_reward": "🏅 NCERT Master Badge + 200 XP",
                "skills": [
                    {"name": "Biology NCERT (Class 11)", "level": "Intermediate", "progress": 100},
                    {"name": "Chemistry NCERT (Class 11)", "level": "Beginner", "progress": 100},
                    {"name": "Physics NCERT (Class 11)", "level": "Beginner", "progress": 90},
                ],
                "tasks": [
                    {"title": "Complete Biology NCERT Class 11 (all chapters)", "xp": 80, "difficulty": "medium", "task_type": "reading", "completed": True},
                    {"title": "Complete Chemistry NCERT Class 11 (all chapters)", "xp": 70, "difficulty": "easy", "task_type": "reading", "completed": True},
                    {"title": "Complete Physics NCERT Class 11 (all chapters)", "xp": 70, "difficulty": "medium", "task_type": "reading", "completed": True},
                    {"title": "Solve 150 NCERT-based MCQs (all 3 subjects)", "xp": 80, "difficulty": "easy", "task_type": "mcq", "completed": True},
                ],
            },
            {
                "phase_number": 2, "label": "Phase 2", "theme": "Class 12 + MCQ Practice",
                "status": "active", "progress": 40,
                "xp_total": 550, "xp_earned": 200,
                "milestone": "Class 12 Mastery",
                "milestone_reward": "⚡ Speed Badge + 500 XP + Mock Test Unlock",
                "skills": [
                    {"name": "Biology NCERT (Class 12)", "level": "Intermediate", "progress": 50},
                    {"name": "Organic Chemistry", "level": "Beginner", "progress": 35},
                    {"name": "Physics Numericals", "level": "Beginner", "progress": 40},
                    {"name": "Genetics & Evolution", "level": "Beginner", "progress": 55},
                ],
                "tasks": [
                    {"title": "Complete Biology NCERT Class 12 (Chapters 1–8)", "xp": 90, "difficulty": "medium", "task_type": "reading", "completed": True},
                    {"title": "Organic Chemistry reaction mechanisms (Class 12)", "xp": 100, "difficulty": "hard", "task_type": "revision", "completed": True},
                    {"title": "Biology Class 12 Chapters 9–16 (Ecology, Biotechnology)", "xp": 90, "difficulty": "medium", "task_type": "reading", "completed": False},
                    {"title": "Solve 200 Biology MCQs from PYQs (2018-2024)", "xp": 120, "difficulty": "medium", "task_type": "mcq", "completed": False},
                    {"title": "Full NEET mock test (180 questions — 200 minutes)", "xp": 150, "difficulty": "hard", "task_type": "challenge", "completed": False},
                ],
            },
            {
                "phase_number": 3, "label": "Phase 3", "theme": "PYQ Sprint",
                "status": "locked", "progress": 0,
                "xp_total": 700, "xp_earned": 0,
                "milestone": "PYQ Mastery",
                "milestone_reward": "🔥 Elite Badge + 1000 XP + Custom AI Study Plan",
                "skills": [
                    {"name": "NEET PYQ Analysis (10 years)", "level": "Advanced", "progress": 0},
                    {"name": "Weak Topic Mastery", "level": "Intermediate", "progress": 0},
                    {"name": "Speed Reading & Elimination", "level": "Advanced", "progress": 0},
                ],
                "tasks": [
                    {"title": "Solve NEET PYQs 2014-2024 (all subjects)", "xp": 300, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "5 full-length NEET mock tests with error analysis", "xp": 250, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "Weak subject sprint — 3 hours focused revision", "xp": 150, "difficulty": "hard", "task_type": "revision", "completed": False},
                ],
            },
            {
                "phase_number": 4, "label": "Phase 4", "theme": "Final Sprint",
                "status": "locked", "progress": 0,
                "xp_total": 900, "xp_earned": 0,
                "milestone": f"NEET {year} Ready — 650+ Score",
                "milestone_reward": "👑 Doctor's Badge + 2000 XP + Priority Mentorship",
                "skills": [
                    {"name": "Revision Strategy", "level": "Advanced", "progress": 0},
                    {"name": "Accuracy Under Pressure", "level": "Advanced", "progress": 0},
                ],
                "tasks": [
                    {"title": "Complete 3 revision cycles of full syllabus", "xp": 400, "difficulty": "hard", "task_type": "revision", "completed": False},
                    {"title": "10 full NEET mocks — target 650+ in each", "xp": 500, "difficulty": "hard", "task_type": "challenge", "completed": False},
                ],
            },
        ],
    }


# ── UPSC Fallback ─────────────────────────────────────────────────────────────
def _fallback_upsc(profile: dict) -> dict:
    return {
        "goal": "Clear UPSC Civil Services",
        "goal_icon": "🏛️",
        "category": "Civil Services Exam",
        "timeline": "12 months",
        "start_date": "Jan 2026",
        "target_date": "Dec 2026",
        "smart_message_type": "info",
        "smart_message_text": "UPSC rewards consistent, deep reading over cramming. 4 hours of quality study daily beats 10 hours of passive reading.",
        "phases": [
            {
                "phase_number": 1, "label": "Phase 1", "theme": "Static GS Foundation",
                "status": "completed", "progress": 100,
                "xp_total": 320, "xp_earned": 320,
                "milestone": "Static GS Foundation Complete",
                "milestone_reward": "🏅 Scholar Badge + 200 XP",
                "skills": [
                    {"name": "Indian Polity (Laxmikanth)", "level": "Intermediate", "progress": 100},
                    {"name": "Modern History (Spectrum)", "level": "Intermediate", "progress": 100},
                    {"name": "Geography (NCERT 6–12)", "level": "Beginner", "progress": 90},
                    {"name": "Economics Basics", "level": "Beginner", "progress": 85},
                ],
                "tasks": [
                    {"title": "Complete Laxmikanth — Indian Polity (all chapters)", "xp": 90, "difficulty": "hard", "task_type": "reading", "completed": True},
                    {"title": "Complete Spectrum — Modern History", "xp": 80, "difficulty": "medium", "task_type": "reading", "completed": True},
                    {"title": "NCERT Geography 6–12 (all books)", "xp": 80, "difficulty": "medium", "task_type": "reading", "completed": True},
                    {"title": "Solve 200 Polity + History MCQs (Prelims level)", "xp": 70, "difficulty": "easy", "task_type": "mcq", "completed": True},
                ],
            },
            {
                "phase_number": 2, "label": "Phase 2", "theme": "Current Affairs + Mains",
                "status": "active", "progress": 35,
                "xp_total": 580, "xp_earned": 190,
                "milestone": "Mains Writing Ready",
                "milestone_reward": "⚡ Analyst Badge + 500 XP + Answer Writing Review",
                "skills": [
                    {"name": "Current Affairs (The Hindu)", "level": "Intermediate", "progress": 45},
                    {"name": "Answer Writing (GS Mains)", "level": "Beginner", "progress": 30},
                    {"name": "Ethics GS4 (Lexicon)", "level": "Beginner", "progress": 25},
                    {"name": "Environment & Ecology", "level": "Beginner", "progress": 40},
                ],
                "tasks": [
                    {"title": "Daily The Hindu reading — 1 hour (news + editorial)", "xp": 60, "difficulty": "medium", "task_type": "reading", "completed": True},
                    {"title": "Write 5 GS Mains answers (250 words each)", "xp": 120, "difficulty": "hard", "task_type": "challenge", "completed": True},
                    {"title": "Complete Environment & Ecology (Shankar IAS)", "xp": 80, "difficulty": "medium", "task_type": "reading", "completed": False},
                    {"title": "Practice 10 Ethics case studies (GS4)", "xp": 130, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "UPSC Prelims mock test — 100 questions (2 hours)", "xp": 190, "difficulty": "hard", "task_type": "challenge", "completed": False},
                ],
            },
            {
                "phase_number": 3, "label": "Phase 3", "theme": "Optional + Prelims Intensive",
                "status": "locked", "progress": 0,
                "xp_total": 750, "xp_earned": 0,
                "milestone": "Prelims Ready",
                "milestone_reward": "🔥 IAS Aspirant Badge + 1000 XP + Mentorship Session",
                "skills": [
                    {"name": "Optional Subject Mastery", "level": "Advanced", "progress": 0},
                    {"name": "Prelims Strategy (CSAT)", "level": "Intermediate", "progress": 0},
                    {"name": "Test Series Analysis", "level": "Advanced", "progress": 0},
                ],
                "tasks": [
                    {"title": "Complete optional subject — Paper 1 full syllabus", "xp": 300, "difficulty": "hard", "task_type": "reading", "completed": False},
                    {"title": "Enroll in test series — 15 mock Prelims papers", "xp": 250, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "Compile notes from 1 year of current affairs", "xp": 200, "difficulty": "hard", "task_type": "revision", "completed": False},
                ],
            },
            {
                "phase_number": 4, "label": "Phase 4", "theme": "Mains + Interview",
                "status": "locked", "progress": 0,
                "xp_total": 1000, "xp_earned": 0,
                "milestone": "UPSC Final Stage Ready",
                "milestone_reward": "👑 IAS Badge + 2000 XP + Priority Interview Prep",
                "skills": [
                    {"name": "Essay Writing (GS1)", "level": "Advanced", "progress": 0},
                    {"name": "Interview Personality Test", "level": "Advanced", "progress": 0},
                ],
                "tasks": [
                    {"title": "Write 20 full-length GS Mains answers for review", "xp": 500, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "3 mock interviews with senior aspirants / mentors", "xp": 500, "difficulty": "hard", "task_type": "challenge", "completed": False},
                ],
            },
        ],
    }


# ── Generic Exam Fallback ─────────────────────────────────────────────────────
def _fallback_exam_generic(profile: dict) -> dict:
    exam = profile.get("exam_type", "Exam").upper()
    year = profile.get("attempt_year", "2026")
    return {
        "goal": f"Clear {exam} {year}",
        "goal_icon": "📚",
        "category": "Competitive Exam",
        "timeline": "6 months",
        "start_date": "Jan 2026", "target_date": "Jun 2026",
        "smart_message_type": "info",
        "smart_message_text": f"Consistency beats intensity for {exam}. Build your daily habit first, then increase the depth.",
        "phases": _generic_4_phases("Exam Preparation", f"Clear {exam} {year}"),
    }


# ── Student Fallback (CS / Engineering) ─────────────────────────────────────
def _fallback_student(profile: dict) -> dict:
    goal = profile.get("career_goal", "Software Engineer")
    return {
        "goal": f"Become {goal}",
        "goal_icon": "💻",
        "category": "Career",
        "timeline": "6 months",
        "start_date": "Jan 2026", "target_date": "Jun 2026",
        "smart_message_type": "info",
        "smart_message_text": f"The fastest path to becoming a {goal} is building real projects daily. Code every day — even 30 minutes compounds.",
        "phases": [
            {
                "phase_number": 1, "label": "Phase 1", "theme": "CS Fundamentals",
                "status": "completed", "progress": 100,
                "xp_total": 260, "xp_earned": 260,
                "milestone": "Fundamentals Complete",
                "milestone_reward": "🏅 Coder Badge + 200 XP",
                "skills": [
                    {"name": "Python / JavaScript", "level": "Intermediate", "progress": 100},
                    {"name": "Data Structures", "level": "Beginner", "progress": 100},
                    {"name": "Git & GitHub", "level": "Beginner", "progress": 100},
                    {"name": "HTML/CSS Basics", "level": "Beginner", "progress": 90},
                ],
                "tasks": [
                    {"title": "Complete Python/JS fundamentals (freeCodeCamp / CS50)", "xp": 70, "difficulty": "easy", "task_type": "reading", "completed": True},
                    {"title": "Solve 30 LeetCode Easy problems", "xp": 80, "difficulty": "medium", "task_type": "challenge", "completed": True},
                    {"title": "Build first GitHub profile + push 3 projects", "xp": 60, "difficulty": "easy", "task_type": "build", "completed": True},
                    {"title": "Complete Data Structures module (arrays, linked lists, stacks)", "xp": 50, "difficulty": "medium", "task_type": "reading", "completed": True},
                ],
            },
            {
                "phase_number": 2, "label": "Phase 2", "theme": "Projects & DSA",
                "status": "active", "progress": 40,
                "xp_total": 520, "xp_earned": 180,
                "milestone": "Portfolio Ready",
                "milestone_reward": "⚡ Builder Badge + 500 XP + Profile Review",
                "skills": [
                    {"name": "React / Node.js", "level": "Beginner", "progress": 45},
                    {"name": "DSA (Trees, Graphs)", "level": "Beginner", "progress": 35},
                    {"name": "SQL & Databases", "level": "Beginner", "progress": 50},
                    {"name": "REST API Design", "level": "Beginner", "progress": 40},
                ],
                "tasks": [
                    {"title": "Build a full-stack CRUD app (React + Node + PostgreSQL)", "xp": 130, "difficulty": "hard", "task_type": "build", "completed": True},
                    {"title": "Solve 50 LeetCode Medium problems (Trees + Graphs)", "xp": 100, "difficulty": "hard", "task_type": "challenge", "completed": True},
                    {"title": "Build REST API with authentication (JWT)", "xp": 110, "difficulty": "hard", "task_type": "build", "completed": False},
                    {"title": "Complete SQL course + solve 20 query problems", "xp": 80, "difficulty": "medium", "task_type": "challenge", "completed": False},
                    {"title": "Apply to 10 internships on Internshala / LinkedIn", "xp": 100, "difficulty": "medium", "task_type": "challenge", "completed": False},
                ],
            },
            {
                "phase_number": 3, "label": "Phase 3", "theme": "Interview Prep",
                "status": "locked", "progress": 0,
                "xp_total": 680, "xp_earned": 0,
                "milestone": "Interview Ready",
                "milestone_reward": "🔥 Elite Dev Badge + 1000 XP + Mock Interview",
                "skills": [
                    {"name": "System Design Basics", "level": "Intermediate", "progress": 0},
                    {"name": "LeetCode Hard (50 problems)", "level": "Advanced", "progress": 0},
                    {"name": "Behavioural Interviews", "level": "Intermediate", "progress": 0},
                ],
                "tasks": [
                    {"title": "Complete System Design basics (Gaurav Sen — YouTube)", "xp": 150, "difficulty": "hard", "task_type": "reading", "completed": False},
                    {"title": "Solve 50 LeetCode Hard problems (company-tagged)", "xp": 300, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "Mock interview practice (5 sessions)", "xp": 230, "difficulty": "hard", "task_type": "challenge", "completed": False},
                ],
            },
            {
                "phase_number": 4, "label": "Phase 4", "theme": "Job Search",
                "status": "locked", "progress": 0,
                "xp_total": 850, "xp_earned": 0,
                "milestone": f"{goal} Role Secured",
                "milestone_reward": "👑 Hired Badge + 2000 XP",
                "skills": [
                    {"name": "Resume & LinkedIn", "level": "Advanced", "progress": 0},
                    {"name": "Company Research", "level": "Advanced", "progress": 0},
                ],
                "tasks": [
                    {"title": "Polish resume + LinkedIn profile (ATS-optimised)", "xp": 200, "difficulty": "medium", "task_type": "build", "completed": False},
                    {"title": "Apply to 50 companies (mix of startups + MNCs)", "xp": 300, "difficulty": "hard", "task_type": "challenge", "completed": False},
                    {"title": "Clear 3 technical interviews successfully", "xp": 350, "difficulty": "hard", "task_type": "challenge", "completed": False},
                ],
            },
        ],
    }


# ── Freelancer Fallback ───────────────────────────────────────────────────────
def _fallback_freelancer(profile: dict) -> dict:
    skill = profile.get("primary_skill", "your skill")
    goal  = profile.get("monthly_income_goal", "₹50,000/month")
    return {
        "goal": f"Earn {goal} as Freelance {skill.title()} Specialist",
        "goal_icon": "💼",
        "category": "Freelance",
        "timeline": "4 months",
        "start_date": "Jan 2026", "target_date": "May 2026",
        "smart_message_type": "info",
        "smart_message_text": f"Your first ₹10,000 month as a freelancer is the hardest. Focus on 2 clients, over-deliver, and referrals will follow.",
        "phases": _generic_4_phases("Freelance Income", f"Earn {goal}/month"),
    }


# ── Entrepreneur Fallback ─────────────────────────────────────────────────────
def _fallback_entrepreneur(profile: dict) -> dict:
    return {
        "goal": "Build a Profitable Business",
        "goal_icon": "🚀",
        "category": "Entrepreneurship",
        "timeline": "6 months",
        "start_date": "Jan 2026", "target_date": "Jun 2026",
        "smart_message_type": "info",
        "smart_message_text": "Revenue is oxygen for your startup. Talk to 5 potential customers before writing a single line of code.",
        "phases": _generic_4_phases("Startup Growth", "Build Profitable Business"),
    }


# ── Creator Fallback ──────────────────────────────────────────────────────────
def _fallback_creator(profile: dict) -> dict:
    platform = profile.get("creator_platform", "YouTube")
    return {
        "goal": f"Grow to 10K Subscribers on {platform.title()}",
        "goal_icon": "🎬",
        "category": "Content Creator",
        "timeline": "6 months",
        "start_date": "Jan 2026", "target_date": "Jun 2026",
        "smart_message_type": "info",
        "smart_message_text": f"On {platform}, consistency + thumbnail quality determines 80% of your growth. Post 3x/week for 90 days — no exceptions.",
        "phases": _generic_4_phases("Creator Growth", f"10K on {platform}"),
    }


# ── Self Growth Fallback ──────────────────────────────────────────────────────
def _fallback_self_growth(profile: dict) -> dict:
    return {
        "goal": "Become the Best Version of Yourself",
        "goal_icon": "⚡",
        "category": "Personal Development",
        "timeline": "6 months",
        "start_date": "Jan 2026", "target_date": "Jun 2026",
        "smart_message_type": "info",
        "smart_message_text": "Real growth happens in the first 30 minutes after you wake up. Build your morning routine before anything else.",
        "phases": _generic_4_phases("Personal Mastery", "Become Best Version"),
    }


# ── Generic 4 phases builder ──────────────────────────────────────────────────
def _generic_4_phases(theme_base: str, goal: str) -> list:
    """Generic 4-phase structure when we don't have a specific fallback."""
    return [
        {
            "phase_number": 1, "label": "Phase 1", "theme": "Foundation",
            "status": "completed", "progress": 100,
            "xp_total": 260, "xp_earned": 260,
            "milestone": "Foundation Complete",
            "milestone_reward": "🏅 Foundation Badge + 200 XP",
            "skills": [
                {"name": "Core Knowledge", "level": "Beginner", "progress": 100},
                {"name": "Daily Habits", "level": "Intermediate", "progress": 100},
                {"name": "Goal Clarity", "level": "Intermediate", "progress": 100},
            ],
            "tasks": [
                {"title": "Define your exact 90-day target with measurable outcomes", "xp": 50, "difficulty": "easy", "task_type": "challenge", "completed": True},
                {"title": "Build your daily study/work routine (time-blocked)", "xp": 60, "difficulty": "medium", "task_type": "build", "completed": True},
                {"title": "Complete foundation reading for your core subject", "xp": 80, "difficulty": "medium", "task_type": "reading", "completed": True},
                {"title": "Take your first baseline assessment", "xp": 70, "difficulty": "easy", "task_type": "mcq", "completed": True},
            ],
        },
        {
            "phase_number": 2, "label": "Phase 2", "theme": "Building",
            "status": "active", "progress": 40,
            "xp_total": 500, "xp_earned": 180,
            "milestone": "Core Skills Built",
            "milestone_reward": "⚡ Builder Badge + 500 XP",
            "skills": [
                {"name": "Applied Practice", "level": "Intermediate", "progress": 45},
                {"name": "Consistency", "level": "Intermediate", "progress": 60},
                {"name": "Problem Solving", "level": "Beginner", "progress": 35},
            ],
            "tasks": [
                {"title": "Complete 30 days of daily practice sessions", "xp": 100, "difficulty": "medium", "task_type": "challenge", "completed": True},
                {"title": "Build/create your first real output (project/content/plan)", "xp": 120, "difficulty": "hard", "task_type": "build", "completed": True},
                {"title": "Review weak areas and create targeted improvement plan", "xp": 90, "difficulty": "medium", "task_type": "revision", "completed": False},
                {"title": "Complete mid-point self-assessment", "xp": 80, "difficulty": "medium", "task_type": "challenge", "completed": False},
                {"title": "Reach out for feedback from mentor/peer", "xp": 110, "difficulty": "hard", "task_type": "challenge", "completed": False},
            ],
        },
        {
            "phase_number": 3, "label": "Phase 3", "theme": "Advanced",
            "status": "locked", "progress": 0,
            "xp_total": 680, "xp_earned": 0,
            "milestone": "Advanced Level Reached",
            "milestone_reward": "🔥 Elite Badge + 1000 XP",
            "skills": [
                {"name": "Advanced Application", "level": "Advanced", "progress": 0},
                {"name": "Speed & Efficiency", "level": "Advanced", "progress": 0},
            ],
            "tasks": [
                {"title": "Complete advanced-level challenge (stretch goal)", "xp": 200, "difficulty": "hard", "task_type": "challenge", "completed": False},
                {"title": "Full simulation / practice run of final goal", "xp": 250, "difficulty": "hard", "task_type": "challenge", "completed": False},
                {"title": "Eliminate top 3 weak areas completely", "xp": 230, "difficulty": "hard", "task_type": "revision", "completed": False},
            ],
        },
        {
            "phase_number": 4, "label": "Phase 4", "theme": "Mastery",
            "status": "locked", "progress": 0,
            "xp_total": 850, "xp_earned": 0,
            "milestone": f"Goal Achieved: {goal}",
            "milestone_reward": "👑 Champion Badge + 2000 XP",
            "skills": [
                {"name": "Mastery & Execution", "level": "Advanced", "progress": 0},
            ],
            "tasks": [
                {"title": "Final push — complete your goal milestone", "xp": 500, "difficulty": "hard", "task_type": "challenge", "completed": False},
                {"title": "Document learnings and plan next 6 months", "xp": 350, "difficulty": "medium", "task_type": "build", "completed": False},
            ],
        },
    ]