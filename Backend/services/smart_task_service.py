# services/smart_task_service.py
# Generates 3 daily tasks: 2 hard + 1 easy, tailored per career/exam type
# Plugs into the shared Mesh-backed AI model

import json
from Backend.services.gemini_service import _get_model as get_mesh_model


def _get_model():
  return get_mesh_model()


def _safe_list(text: str) -> list:
    """Strip markdown fences and parse JSON list safely."""
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
        clean = clean[start : end + 1]
    return json.loads(clean.strip())


# ── Career-type → task generation strategy ───────────────────────────────────

def _build_prompt(profile: dict) -> str:
    user_type  = profile.get("user_type", "student")
    goal       = profile.get("twelve_month_goal") or profile.get("primary_goal") or "grow in my career"
    daily_time = profile.get("daily_time", "2-3hours")
    interests  = ", ".join(profile.get("interests", [])[:4]) or "technology"

    # ── Career-specific context block ────────────────────────────────────────
    if user_type == "student":
        career_goal  = profile.get("career_goal", "Software Engineer")
        field        = profile.get("field_of_study", "Computer Science")
        edu_level    = profile.get("education_level", "undergraduate")
        context = f"""
Career Target    : {career_goal}
Field of Study   : {field}
Education Level  : {edu_level}

TASK RULES FOR SOFTWARE/TECH STUDENTS:
- Hard Task 1: A real LeetCode-style coding problem (arrays, DP, graphs, strings).
  The user MUST write the actual solution. State the problem clearly with example input/output.
- Hard Task 2: One core concept deep-dive (System Design, OS, DBMS, OOP, Networking etc.)
  Make them implement or explain it, not just read about it.
- Easy Task : One portfolio/project action OR a GitHub commit task they can finish in 20 min.
"""

    elif user_type == "exam_aspirant":
        exam_type     = (profile.get("exam_type") or "JEE").upper()
        weak_subjects = ", ".join(profile.get("weak_subjects", [])) or "Physics"
        attempt_year  = profile.get("attempt_year", "next year")
        context = f"""
Exam             : {exam_type}
Weak Subjects    : {weak_subjects}
Target Year      : {attempt_year}

TASK RULES FOR EXAM ASPIRANTS:
- Hard Task 1: A specific numerical problem from their WEAK subject (show full problem, expected answer, formula hint).
- Hard Task 2: A concept + MCQ bundle — explain one key theorem/formula, then give 3 MCQs to test it.
- Easy Task : Revise yesterday's topics using spaced repetition flashcards or a quick 10-question mock.

For {exam_type}:
  JEE  → Physics (Mechanics, Electricity), Math (Calculus, Vectors), Chemistry (Organic reactions)
  NEET → Biology (Genetics, Cell biology), Physics (Optics), Chemistry (Biomolecules)
  UPSC → Current affairs + Polity/Economy concept + Answer-writing practice
  CAT  → Quant/VARC/DILR mini-set (5-6 questions timed)
  SSC  → English + Reasoning + GK short quiz
"""

    elif user_type == "freelancer":
        skill  = profile.get("primary_skill", "Web Development")
        services = ", ".join(profile.get("services_offered", [])) or skill
        income_goal = profile.get("monthly_income_goal", "grow income")
        context = f"""
Primary Skill    : {skill}
Services         : {services}
Income Goal      : {income_goal}

TASK RULES FOR FREELANCERS:
- Hard Task 1: A real client-deliverable skill task (write a specific component, fix a type of bug, design a page section).
- Hard Task 2: Outreach / proposal task — write one custom Upwork/Fiverr proposal for a real type of project.
- Easy Task : Update portfolio OR respond to 3 existing leads/inquiries OR add one testimonial request email.
"""

    elif user_type in ("entrepreneur", "business_owner"):
        biz_type     = profile.get("business_type", "SaaS")
        biz_goal     = profile.get("business_goal", "grow revenue")
        revenue_stage = profile.get("revenue_stage", "early")
        context = f"""
Business Type    : {biz_type}
Business Goal    : {biz_goal}
Revenue Stage    : {revenue_stage}

TASK RULES FOR ENTREPRENEURS:
- Hard Task 1: A growth experiment task — write a landing page copy variant, build a funnel step, or create an ad creative brief.
- Hard Task 2: A business operation task — write an SOP, review a metric dashboard, or create a customer segment analysis.
- Easy Task : Reply to 5 leads/customers OR post one social proof piece OR update pricing page.
"""

    elif user_type == "creator":
        platform   = profile.get("creator_platform", "YouTube")
        niche      = profile.get("content_niche", "technology")
        audience   = profile.get("audience_size", "growing")
        creator_goal = profile.get("creator_growth_goal", "grow audience")
        context = f"""
Platform         : {platform}
Niche            : {niche}
Audience Size    : {audience}
Growth Goal      : {creator_goal}

TASK RULES FOR CREATORS:
- Hard Task 1: Script or outline ONE full video/post with hook, body, CTA. Must be 300+ words.
- Hard Task 2: SEO/analytics task — research 5 trending keywords in their niche, or analyse one top competitor video.
- Easy Task : Reply to 10 comments OR post one Story/Reel/Short OR schedule the week's content calendar.
"""

    else:  # self_growth / general
        context = f"""
TASK RULES FOR SELF-GROWTH:
- Hard Task 1: Deep learning task — read one chapter + take structured notes using the Cornell method.
- Hard Task 2: Skill application — implement what was learned (write a summary essay, build a mini-project, or solve a problem).
- Easy Task : Journaling or reflection — write 3 wins + 1 area to improve today.
"""

    return f"""
You are GrowthOS AI — a world-class growth coach generating today's focused action plan.

USER PROFILE:
- User Type     : {user_type}
- 12-Month Goal : {goal}
- Daily Time    : {daily_time}
- Interests     : {interests}

{context}

STRICT RULES:
1. Generate EXACTLY 3 tasks: task 1 = hard, task 2 = hard, task 3 = easy.
2. The 2 hard tasks must require focused thinking and take 30-50 minutes each.
3. The easy task must be completable in 15-20 minutes.
4. Each task must be SPECIFIC — name the exact topic, problem type, or action.
   BAD: "Study Python"  GOOD: "Implement a binary search tree with insert + inorder traversal in Python"
5. Include a direct resource_url that opens the exact place to do the task.
6. The "question" field is the actual problem/challenge the user MUST solve.

Return JSON array ONLY — no markdown, no explanation:
[
  {{
    "id": "t1",
    "title": "Short task title (max 8 words)",
    "question": "The actual problem or challenge to solve. Be specific and detailed. For coding: give the problem statement + example. For exam: give the actual question. For creators: give the exact brief.",
    "description": "One-line context or hint",
    "difficulty": "hard",
    "completed": false,
    "priority": "high",
    "estimated_minutes": 45,
    "category": "Coding | Exam Prep | System Design | Portfolio | Outreach | Content | Business | Review | Concept",
    "resource_url": "https://actual-resource.com",
    "skill_tag": "e.g. Python / Physics / Sales / SEO",
    "xp_reward": 50
  }},
  {{
    "id": "t2",
    "title": "...",
    "question": "...",
    "description": "...",
    "difficulty": "hard",
    "completed": false,
    "priority": "high",
    "estimated_minutes": 40,
    "category": "...",
    "resource_url": "...",
    "skill_tag": "...",
    "xp_reward": 50
  }},
  {{
    "id": "t3",
    "title": "...",
    "question": "...",
    "description": "...",
    "difficulty": "easy",
    "completed": false,
    "priority": "medium",
    "estimated_minutes": 20,
    "category": "...",
    "resource_url": "...",
    "skill_tag": "...",
    "xp_reward": 20
  }}
]
"""


def generate_smart_daily_tasks(profile: dict) -> list:
    """
    Main entry point — called by scheduler + dashboard endpoint.
    Returns a list of 3 tasks: 2 hard + 1 easy, career-personalised.
    Falls back to empty list on AI failure (caller handles fallback display).
    """
    prompt = _build_prompt(profile)
    model  = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 15})
        tasks = _safe_list(response.text)
        # Enforce exactly 3 tasks
        return tasks[:3] if len(tasks) >= 3 else tasks
    except Exception as e:
        print(f"[SmartTask] Gemini generation failed: {e}")
        return []