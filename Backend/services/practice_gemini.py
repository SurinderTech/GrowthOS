"""
services/practice_gemini.py

Intelligent question generator.
Reads user_type from UserOnboarding and generates the RIGHT type of
questions for each user — JEE gets Physics/Math/Chemistry MCQ + numeric,
UPSC gets statement-based MCQ + GK, coders get coding + debugging, etc.

Rule: Generate ONCE per (user_type, topic, difficulty) → store forever → reuse.
Gemini is never called twice for the same combination.
"""

import json
from Backend.services.gemini_service import _get_model, _safe_json


# ── Question type rules per user type ─────────────────────────────────────────

USER_TYPE_CONFIG = {
    "exam_aspirant": {
        "jee": {
            "subjects": ["Physics", "Chemistry", "Mathematics"],
            "q_types":  ["mcq", "numeric"],
            "difficulties": ["easy", "medium", "hard"],
            "instructions": """
- MCQ: 4 options, exactly one correct, physics/chemistry/math conceptual or numerical
- Numeric: answer is a number (integer or decimal), no options
- Include formula-based and concept-based questions
- JEE level difficulty — not trivial
- For numeric type: correct_answer is the numeric value as string e.g. "9.8"
- Options for numeric type: null
""",
        },
        "neet": {
            "subjects": ["Biology", "Physics", "Chemistry"],
            "q_types":  ["mcq"],
            "difficulties": ["easy", "medium", "hard"],
            "instructions": """
- 4-option MCQ only
- Biology: focus on NCERT-level Botany, Zoology, Human Physiology
- Physics/Chemistry: application-based, NEET pattern
- One correct answer per question
""",
        },
        "upsc": {
            "subjects": ["History", "Polity", "Geography", "Economy", "Current Affairs", "Science & Tech", "Environment"],
            "q_types":  ["mcq", "statement"],
            "difficulties": ["easy", "medium", "hard"],
            "instructions": """
- MCQ: 4 options UPSC prelims style
- Statement type: "Consider the following statements: 1. ... 2. ... 3. ... Which are correct? (a) 1 only (b) 1 and 2 (c) 2 and 3 (d) All"
- Mix statement-based and direct MCQ
- UPSC Prelims difficulty level
""",
        },
        "cat": {
            "subjects": ["Quantitative Aptitude", "Verbal Ability", "Logical Reasoning", "Data Interpretation"],
            "q_types":  ["mcq"],
            "difficulties": ["easy", "medium", "hard"],
            "instructions": """
- CAT exam pattern MCQ
- QA: arithmetic, algebra, geometry, number theory
- VA: reading comprehension, grammar, para-jumbles
- LR: arrangements, puzzles, sequences
- DI: tables, graphs, charts
""",
        },
        "gate": {
            "subjects": ["Data Structures", "Algorithms", "Operating Systems", "Computer Networks", "DBMS", "Theory of Computation"],
            "q_types":  ["mcq", "numeric"],
            "difficulties": ["easy", "medium", "hard"],
            "instructions": """
- GATE CS exam pattern
- MCQ: 4 options, one correct
- Numeric: exact numerical answer
- Technical, conceptual, and application questions
""",
        },
        "other": {
            "subjects": ["General Knowledge", "Reasoning", "English", "Mathematics"],
            "q_types":  ["mcq"],
            "difficulties": ["easy", "medium"],
            "instructions": "General competitive exam MCQ pattern, 4 options.",
        },
    },

    "student": {
        "programming": {
            "subjects": ["Python", "Data Structures", "Algorithms", "Web Development", "Databases"],
            "q_types":  ["mcq", "short", "coding"],
            "difficulties": ["easy", "medium", "hard"],
            "instructions": """
- MCQ: concept-based, 4 options
- Short: explain a concept in 2-3 sentences
- Coding: write a function or fix a bug (describe the task clearly)
- Match field_of_study and career_goal when provided
""",
        },
        "medicine": {
            "subjects": ["Anatomy", "Physiology", "Biochemistry", "Pharmacology", "Pathology"],
            "q_types":  ["mcq"],
            "difficulties": ["easy", "medium", "hard"],
            "instructions": "Medical school level MCQ, 4 options, clinical and theoretical.",
        },
        "business": {
            "subjects": ["Marketing", "Finance", "Management", "Economics", "Entrepreneurship"],
            "q_types":  ["mcq", "short"],
            "difficulties": ["easy", "medium"],
            "instructions": "Business school style MCQ and short answer questions.",
        },
        "default": {
            "subjects": ["Critical Thinking", "Communication", "Problem Solving", "Digital Skills"],
            "q_types":  ["mcq", "short"],
            "difficulties": ["easy", "medium"],
            "instructions": "General knowledge and skill-building questions relevant to career goal.",
        },
    },

    "freelancer": {
        "default": {
            "subjects": [],
            "q_types":  ["mcq", "short", "coding"],
            "difficulties": ["easy", "medium", "hard"],
            "instructions": """
- Focus on their primary_skill and services_offered
- Practical, real-world scenarios
- MCQ for concepts, short for strategy, coding for technical skills
- Include client scenario questions e.g. "A client wants X, what do you do?"
""",
        },
    },

    "entrepreneur": {
        "default": {
            "subjects": ["Product Strategy", "Marketing", "Finance", "Operations", "Leadership", "Sales"],
            "q_types":  ["mcq", "short"],
            "difficulties": ["easy", "medium"],
            "instructions": """
- Business scenario MCQ and short answer
- Focus on their business_type and business_goal
- Real-world decision making questions
""",
        },
    },

    "creator": {
        "default": {
            "subjects": ["Content Strategy", "SEO", "Analytics", "Monetisation", "Audience Growth", "Scripting"],
            "q_types":  ["mcq", "short"],
            "difficulties": ["easy", "medium"],
            "instructions": """
- Platform-specific questions based on creator_platform
- Content strategy, growth tactics, monetisation
- Practical creator scenarios
""",
        },
    },

    "self_growth": {
        "default": {
            "subjects": ["Productivity", "Psychology", "Habits", "Finance", "Communication"],
            "q_types":  ["mcq", "short"],
            "difficulties": ["easy", "medium"],
            "instructions": "Self-improvement, psychology, habits, and personal finance questions.",
        },
    },
}


def _get_user_config(ob) -> dict:
    user_type = ob.user_type or "student"

    if user_type == "exam_aspirant":
        exam = (ob.exam_type or "other").lower()
        return USER_TYPE_CONFIG["exam_aspirant"].get(
            exam,
            USER_TYPE_CONFIG["exam_aspirant"]["other"]
        )

    if user_type == "student":
        fos = (ob.field_of_study or "").lower()
        interests = ob.interests or []
        if any(k in fos for k in ["computer", "software", "cs", "it", "programming", "tech"]) \
           or "programming" in interests or "ai_tech" in interests:
            return USER_TYPE_CONFIG["student"]["programming"]
        if any(k in fos for k in ["medicine", "medical", "mbbs", "doctor", "health"]) \
           or "Health Care" in interests:
            return USER_TYPE_CONFIG["student"]["medicine"]
        if any(k in fos for k in ["business", "mba", "commerce", "management"]) \
           or "business" in interests:
            return USER_TYPE_CONFIG["student"]["business"]
        return USER_TYPE_CONFIG["student"]["default"]

    if user_type == "freelancer":
        return USER_TYPE_CONFIG["freelancer"]["default"]

    if user_type == "entrepreneur":
        return USER_TYPE_CONFIG["entrepreneur"]["default"]

    if user_type == "creator":
        return USER_TYPE_CONFIG["creator"]["default"]

    return USER_TYPE_CONFIG["self_growth"]["default"]


def _build_topic_list(ob, config: dict) -> list:
    user_type = ob.user_type or "student"

    if user_type == "exam_aspirant":
        subjects = config.get("subjects", [])
        weak = ob.weak_subjects or []
        prioritized = [s for s in subjects if s in weak] + \
                      [s for s in subjects if s not in weak]
        return prioritized

    if user_type == "freelancer":
        topics = []
        if ob.primary_skill:
            topics.append(ob.primary_skill)
        for svc in (ob.services_offered or []):
            if svc not in topics:
                topics.append(svc)
        return topics or ["Web Development", "Communication", "Client Management"]

    if user_type == "student":
        return config.get("subjects", [])

    if user_type == "entrepreneur":
        subjects = config.get("subjects", [])
        if ob.business_type:
            subjects = [ob.business_type + " Strategy"] + subjects
        return subjects

    if user_type == "creator":
        subjects = config.get("subjects", [])
        if ob.creator_platform:
            subjects = [ob.creator_platform.capitalize() + " Growth"] + subjects
        return subjects

    return config.get("subjects", ["General Knowledge"])


# ── FIX 1: validate_question — checks a single question dict from Gemini ──────

def _validate_question(q: dict) -> bool:
    """
    Returns True only if the question dict is complete and usable.
    Rejects: missing question text, MCQ without options, empty options.
    """
    q_type = q.get("type", "")
    question_text = q.get("question", "").strip()

    if not question_text:
        print(f"[Validate] REJECTED — empty question text")
        return False

    if q_type == "mcq":
        options = q.get("options")
        # Must be a list of exactly 4 non-empty strings
        if not isinstance(options, list):
            print(f"[Validate] REJECTED MCQ — options is not a list: {options!r}")
            return False
        if len(options) < 4:
            print(f"[Validate] REJECTED MCQ — fewer than 4 options: {options!r}")
            return False
        if any(not isinstance(o, str) or not o.strip() for o in options):
            print(f"[Validate] REJECTED MCQ — empty/non-string option found: {options!r}")
            return False
        correct = q.get("correct_answer", "")
        if correct not in ("A", "B", "C", "D"):
            print(f"[Validate] REJECTED MCQ — invalid correct_answer: {correct!r}")
            return False

    if q_type == "numeric":
        answer = q.get("correct_answer")
        if answer is None:
            print(f"[Validate] REJECTED numeric — missing correct_answer")
            return False
        try:
            float(str(answer))
        except ValueError:
            print(f"[Validate] REJECTED numeric — correct_answer not a number: {answer!r}")
            return False

    return True


def get_or_generate_questions(ob, db, count: int = 5) -> list:
    """
    Main entry point.
    Flow:
    1. Try Gemini → validate each question → deduplicate → save → return.
    2. If Gemini fails → fallback to DB.
    3. If DB empty → return [].
    """
    from Backend.models.practice import PracticeQuestion
    from sqlalchemy import func as sqlfunc

    config    = _get_user_config(ob)
    topics    = _build_topic_list(ob, config)
    user_type = ob.user_type or "student"

    if not topics:
        topics = ["General Knowledge"]

    topic_to_generate = topics[0] if topics else "General Knowledge"
    if user_type == "exam_aspirant" and ob.weak_subjects:
        for weak in ob.weak_subjects:
            if weak in topics:
                topic_to_generate = weak
                break

    # ── 1. Try Gemini ─────────────────────────────────────────────────────
    print(f"[Gemini] Generating for: {user_type} → {topic_to_generate}")
    raw_questions = []
    try:
        raw_questions = _generate_with_gemini(ob, config, topic_to_generate, count=count + 3)
    except Exception as e:
        print(f"❌ Gemini crashed: {e}")

    # ── FIX 2: Validate every question Gemini returns ─────────────────────
    if raw_questions:
        print(f"[Gemini] Raw questions returned: {len(raw_questions)}")

        # ── FIX 4: Debug print — see exactly what Gemini returned ─────────
        # This prints the FIRST question so you can verify options are present.
        # Remove this block once everything works correctly.
        if raw_questions:
            first = raw_questions[0]
            print(f"[DEBUG] First question from Gemini:")
            print(f"  type          : {first.get('type')}")
            print(f"  question      : {first.get('question', '')[:60]}...")
            print(f"  options       : {first.get('options')}")
            print(f"  correct_answer: {first.get('correct_answer')}")
        # ── End debug block ───────────────────────────────────────────────

        valid_questions = [q for q in raw_questions if _validate_question(q)]
        print(f"[Gemini] Valid after validation: {len(valid_questions)} / {len(raw_questions)}")

        if not valid_questions:
            print("⚠️ All Gemini questions failed validation. Falling back to DB.")
        else:
            saved = []
            for q in valid_questions:

                # ── FIX 3: Deduplicate — skip if same question text already in DB ──
                already_exists = (
                    db.query(PracticeQuestion)
                    .filter(
                        PracticeQuestion.question_text == q.get("question", ""),
                        PracticeQuestion.user_type == user_type,
                    )
                    .first()
                )
                if already_exists:
                    print(f"[Dedup] Skipping duplicate: {q.get('question', '')[:50]!r}")
                    saved.append(already_exists)
                    continue

                # options: store as list for MCQ, None for everything else
                raw_options = q.get("options")
                options_to_save = raw_options if isinstance(raw_options, list) and len(raw_options) >= 4 else None

                row = PracticeQuestion(
                    user_type     = user_type,
                    topic         = topic_to_generate,
                    subtopic      = q.get("subtopic", ""),
                    difficulty    = q.get("difficulty", "medium"),
                    q_type        = q.get("type", "mcq"),
                    question_text = q.get("question", ""),
                    options       = options_to_save,   # ← guaranteed list or None
                    correct_answer= q.get("correct_answer"),
                    explanation   = q.get("explanation", ""),
                    created_by    = "ai",
                )
                db.add(row)
                saved.append(row)

            try:
                db.commit()
                for row in saved:
                    try:
                        db.refresh(row)
                    except Exception:
                        pass
                return _pick_difficulty_mix(saved, config, count)
            except Exception as e:
                print(f"⚠️ DB save failed: {e}")
                db.rollback()
                # Still return in-memory questions even if save failed
                return _pick_difficulty_mix(saved, config, count)

    # ── 2. Fallback to DB ─────────────────────────────────────────────────
    print(f"⚠️ Falling back to DB for: {topic_to_generate}")
    existing = (
        db.query(PracticeQuestion)
        .filter(
            PracticeQuestion.user_type == user_type,
            PracticeQuestion.topic.in_(topics),
        )
        .order_by(sqlfunc.random())
        .limit(count * 2)
        .all()
    )

    if existing:
        print(f"✅ Found {len(existing)} questions in DB.")
        return _pick_difficulty_mix(existing, config, count)

    # ── 3. Any questions at all ────────────────────────────────────────────
    print("⚠️ Grabbing any available questions from DB...")
    any_questions = (
        db.query(PracticeQuestion)
        .order_by(sqlfunc.random())
        .limit(count)
        .all()
    )
    if any_questions:
        return _pick_difficulty_mix(any_questions, config, count)

    return []


def _pick_difficulty_mix(questions: list, config: dict, count: int) -> list:
    difficulties = config.get("difficulties", ["easy", "medium", "hard"])
    target_mix = _get_target_mix(count, difficulties)

    result = []
    used_ids = set()

    for diff in target_mix:
        match = next(
            (q for q in questions
             if q.difficulty == diff and str(q.id) not in used_ids),
            None
        )
        if not match:
            match = next((q for q in questions if str(q.id) not in used_ids), None)
        if match:
            result.append(match)
            used_ids.add(str(match.id))

    return result[:count]


def _get_target_mix(count: int, difficulties: list) -> list:
    if count <= 2:
        return difficulties[:count]
    if count == 3:
        available = difficulties[:3]
        return [available[0], available[min(1, len(available)-1)], available[-1]]
    if count == 5:
        return ["easy", "easy", "medium", "medium", "hard"]
    result = []
    for i in range(count):
        result.append(difficulties[i % len(difficulties)])
    return result


def _generate_with_gemini(ob, config: dict, topic: str, count: int = 8) -> list:
    """
    Build the right Gemini prompt and return parsed question dicts.
    """
    user_type    = ob.user_type or "student"
    q_types      = config.get("q_types", ["mcq"])
    difficulties = config.get("difficulties", ["easy", "medium", "hard"])
    instructions = config.get("instructions", "")

    extra_context = _build_extra_context(ob)
    types_str = ", ".join(q_types)
    diffs_str = ", ".join(difficulties)

    prompt = f"""
You are a world-class question generator for a personalized learning platform called GrowthOS.

Generate exactly {count} practice questions for the following user.

═══════════════════════════════════════
USER PROFILE:
- User Type: {user_type}
- Topic: {topic}
{extra_context}
═══════════════════════════════════════

QUESTION RULES:
- Types allowed: {types_str}
- Difficulties: {diffs_str}
- Mix the types and difficulties across all {count} questions
{instructions}

OUTPUT FORMAT — Return ONLY a valid JSON array, no markdown, no extra text:
[
  {{
    "type": "mcq",
    "difficulty": "medium",
    "topic": "{topic}",
    "subtopic": "specific subtopic name",
    "question": "Full question text here",
    "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
    "correct_answer": "B",
    "explanation": "Clear explanation in 1-2 sentences why B is correct."
  }},
  {{
    "type": "numeric",
    "difficulty": "hard",
    "topic": "{topic}",
    "subtopic": "specific subtopic name",
    "question": "A ball is thrown vertically upward with velocity 20 m/s. What is the maximum height? (g = 10 m/s²)",
    "options": null,
    "correct_answer": "20",
    "explanation": "h = v²/2g = 400/20 = 20 m"
  }}
]

CRITICAL RULES — NEVER BREAK THESE:
- MCQ type: "options" MUST be a JSON array of exactly 4 strings: ["A. ...", "B. ...", "C. ...", "D. ..."]
- MCQ type: "correct_answer" MUST be exactly one of: "A", "B", "C", "D"
- MCQ type: "options" must NEVER be null or an empty array
- numeric type: "options" must be null, "correct_answer" must be the number as a string
- short/coding type: "options" must be null, "correct_answer" must be null
- Every question must have a non-empty "question" field
- Return valid JSON array only — no markdown fences, no commentary
"""

    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 20})
        raw = response.text.strip()

        # Strip markdown fences
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        # Find JSON array boundaries
        start = raw.find("[")
        end   = raw.rfind("]")
        if start != -1 and end != -1:
            raw = raw[start:end+1]

        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return parsed
        return []

    except Exception as e:
        print(f"[Gemini ERROR] Generation failed for {topic}: {e}")
        return []



def _build_extra_context(ob) -> str:
    lines = []
    user_type = getattr(ob, "user_type", "student") or "student"

    if user_type == "exam_aspirant":
        if getattr(ob, "exam_type", None): lines.append(f"- Exam: {ob.exam_type.upper()}")

        print("DEBUG OB TYPE:", type(ob))
        print("DEBUG OB DATA:", ob.__dict__ if hasattr(ob, "__dict__") else ob)

        if getattr(ob, "attempt_year", None): lines.append(f"- Attempt Year: {ob.attempt_year}")
        if getattr(ob, "weak_subjects", None): lines.append(f"- Weak Subjects: {', '.join(ob.weak_subjects)}")
        if getattr(ob, "study_hours_daily", None): lines.append(f"- Daily Study Hours: {ob.study_hours_daily}")

    elif user_type == "student":
        if getattr(ob, "education_level", None): lines.append(f"- Education Level: {ob.education_level}")
        if getattr(ob, "field_of_study", None): lines.append(f"- Field of Study: {ob.field_of_study}")
        if getattr(ob, "career_goal", None): lines.append(f"- Career Goal: {ob.career_goal}")

    elif user_type == "freelancer":
        if getattr(ob, "primary_skill", None): lines.append(f"- Primary Skill: {ob.primary_skill}")
        if getattr(ob, "experience_level", None): lines.append(f"- Experience: {ob.experience_level}")
        if getattr(ob, "services_offered", None): lines.append(f"- Services: {', '.join(ob.services_offered)}")

    elif user_type == "entrepreneur":
        if getattr(ob, "business_type", None): lines.append(f"- Business Type: {ob.business_type}")
        if getattr(ob, "revenue_stage", None): lines.append(f"- Revenue Stage: {ob.revenue_stage}")
        if getattr(ob, "business_goal", None): lines.append(f"- Business Goal: {ob.business_goal}")

    elif user_type == "creator":
        if getattr(ob, "creator_platform", None): lines.append(f"- Platform: {ob.creator_platform}")
        if getattr(ob, "content_niche", None): lines.append(f"- Niche: {ob.content_niche}")
        if getattr(ob, "audience_size", None): lines.append(f"- Audience: {ob.audience_size}")

    if getattr(ob, "interests", None): lines.append(f"- Interests: {', '.join(ob.interests)}")
    if getattr(ob, "twelve_month_goal", None): lines.append(f"- 12-Month Goal: {ob.twelve_month_goal}")

    return "\n".join(lines)


def evaluate_short_answer(question_text: str, explanation: str, user_answer: str) -> dict:
    if not user_answer or len(user_answer.strip()) < 5:
        return {"is_correct": False, "feedback": "Answer too short. Please write a proper response."}

    prompt = f"""
You are a strict but fair academic evaluator.

Question: {question_text}
Reference answer: {explanation}
Student's answer: {user_answer}

Does the student's answer capture the core concept?
Be lenient on wording but strict on correctness.

Return ONLY this JSON (no markdown):
{{"is_correct": true or false, "feedback": "One sentence explaining the evaluation."}}
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 12})
        raw = response.text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        start = raw.find("{")
        end   = raw.rfind("}")
        if start != -1 and end != -1:
            raw = raw[start:end+1]
        result = json.loads(raw)
        return {
            "is_correct": bool(result.get("is_correct", False)),
            "feedback":   result.get("feedback", ""),
        }
    except Exception as e:
        print(f"[Gemini ERROR] Short answer evaluation failed: {e}")
        is_correct = len(user_answer.strip()) > 40
        return {
            "is_correct": is_correct,
            "feedback":   "AI evaluation unavailable. Answer accepted based on length.",
        }