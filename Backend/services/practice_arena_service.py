"""
services/practice_arena_service.py
Core logic for the Practice Arena.
Handles question generation, answer evaluation, activity logging, stats.
"""

import json
import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from Backend.models.practice import (
    PracticeQuestion, UserStreak, UserSkillProgress,
    UserPracticeSession, UserPracticeAnswer
)
from Backend.models.practice_arena import (
    CodingProblem, CodingSubmission, ExamSession,
    PracticeActivityLog, RecentSubmission
)
from Backend.models.onboarding import UserOnboarding
from Backend.services.streak_service import update_streak, get_or_create_streak, increment_skill_progress
from Backend.services.practice_gemini import get_or_generate_questions, evaluate_short_answer, _get_user_config
from Backend.services.gemini_service import _get_model


# ── MCQ ───────────────────────────────────────────────────────────────────────

def get_mcq_questions(user_id, db: Session, count: int = 5) -> list:
    """
    Get personalized MCQ questions for this user.
    Uses practice_gemini logic — checks DB first, calls Gemini if needed.
    Returns only MCQ type questions.
    """
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
    if not ob:
        # Fallback: return any MCQ questions from DB
        return (
            db.query(PracticeQuestion)
            .filter(PracticeQuestion.q_type == "mcq")
            .order_by(sqlfunc.random())
            .limit(count)
            .all()
        )

    all_questions = get_or_generate_questions(ob, db, count=count * 2)
    mcq_only = [q for q in all_questions if q.q_type == "mcq"]

    # If not enough MCQ, get more from DB
    if len(mcq_only) < count:
        extra = (
            db.query(PracticeQuestion)
            .filter(
                PracticeQuestion.q_type == "mcq",
                PracticeQuestion.user_type == (ob.user_type or "student"),
            )
            .order_by(sqlfunc.random())
            .limit(count)
            .all()
        )
        seen_ids = {str(q.id) for q in mcq_only}
        for q in extra:
            if str(q.id) not in seen_ids:
                mcq_only.append(q)

    return mcq_only[:count]


def evaluate_mcq_answer(question_id: str, user_answer: str, user_id, db: Session) -> dict:
    """
    Evaluate a MCQ answer. Returns result + logs to activity.
    user_answer should be "A", "B", "C", or "D".
    """
    question = db.query(PracticeQuestion).filter(
        PracticeQuestion.id == question_id
    ).first()

    if not question:
        return {"is_correct": False, "correct_answer": None, "explanation": "Question not found."}

    is_correct = (
        str(user_answer).strip().upper() ==
        str(question.correct_answer or "").strip().upper()
    )

    # Log to recent submissions
    _log_recent_submission(
        user_id  = user_id,
        name     = question.topic + " MCQ",
        result   = "Accepted" if is_correct else "Wrong Answer",
        lang     = "MCQ",
        correct  = is_correct,
        db       = db,
    )

    # Update activity log
    _increment_activity(user_id, db)

    # XP
    xp = _get_xp(question.difficulty) if is_correct else 0
    if is_correct:
     _add_xp(user_id, xp, db)
    increment_skill_progress(user_id, question.topic, _get_skill_delta(question.difficulty), db)
    update_streak(user_id, db)   # ← add this

    return {
        "is_correct":     is_correct,
        "correct_answer": question.correct_answer,
        "explanation":    question.explanation,
        "xp_earned":      xp,
    }


# ── NUMERIC ───────────────────────────────────────────────────────────────────

def get_numeric_questions(user_id, db: Session, count: int = 3) -> list:
    """Get numeric type questions for this user."""
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
    if not ob:
        return (
            db.query(PracticeQuestion)
            .filter(PracticeQuestion.q_type == "numeric")
            .order_by(sqlfunc.random())
            .limit(count)
            .all()
        )

    all_questions = get_or_generate_questions(ob, db, count=count * 2)
    numeric_only = [q for q in all_questions if q.q_type == "numeric"]

    if len(numeric_only) < count:
        extra = (
            db.query(PracticeQuestion)
            .filter(PracticeQuestion.q_type == "numeric")
            .order_by(sqlfunc.random())
            .limit(count)
            .all()
        )
        seen_ids = {str(q.id) for q in numeric_only}
        for q in extra:
            if str(q.id) not in seen_ids:
                numeric_only.append(q)

    return numeric_only[:count]


def evaluate_numeric_answer(question_id: str, user_answer: str, user_id, db: Session) -> dict:
    """
    Evaluate a numeric answer with tolerance checking.
    correct_answer stored as string e.g. "20" or "9.8".
    Tolerance is ±2% of the correct value, or 0 for integers.
    """
    question = db.query(PracticeQuestion).filter(
        PracticeQuestion.id == question_id
    ).first()

    if not question:
        return {"is_correct": False, "correct_answer": None, "explanation": "Question not found."}

    try:
        user_val    = float(str(user_answer).strip())
        correct_val = float(str(question.correct_answer).strip())
        tolerance   = abs(correct_val) * 0.02 if correct_val != 0 else 0.01
        is_correct  = abs(user_val - correct_val) <= max(tolerance, 0.01)
    except (ValueError, TypeError):
        is_correct = False

    _log_recent_submission(
        user_id = user_id,
        name    = question.subtopic or question.topic,
        result  = "Accepted" if is_correct else "Wrong Answer",
        lang    = "Numeric",
        correct = is_correct,
        db      = db,
    )
    _increment_activity(user_id, db)

    xp = _get_xp(question.difficulty) if is_correct else 0
    if is_correct:
        _add_xp(user_id, xp, db)
        increment_skill_progress(user_id, question.topic, _get_skill_delta(question.difficulty), db)

    return {
        "is_correct":     is_correct,
        "correct_answer": question.correct_answer,
        "explanation":    question.explanation,
        "xp_earned":      xp,
    }


# ── CODING ────────────────────────────────────────────────────────────────────

def get_coding_problems(user_id, db: Session, count: int = 5) -> list:
    """
    Get coding problems. Checks DB first.
    If fewer than `count` exist, Gemini generates them.
    """
    existing = (
        db.query(CodingProblem)
        .order_by(sqlfunc.random())
        .limit(count)
        .all()
    )

    if len(existing) >= count:
        return existing

    # Not enough — generate via Gemini
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
    skill_focus = "Data Structures and Algorithms"
    if ob and ob.primary_skill:
        skill_focus = ob.primary_skill
    elif ob and ob.field_of_study:
        skill_focus = ob.field_of_study

    generated = _generate_coding_problems(skill_focus, count=count + 2)

    saved = []
    for p in generated:
        row = CodingProblem(
            title              = p.get("title", "Untitled"),
            difficulty         = p.get("difficulty", "medium"),
            skill              = p.get("skill", "Algorithms"),
            description        = p.get("description", ""),
            constraints        = p.get("constraints", []),
            examples           = p.get("examples", []),
            starter_python     = p.get("starter_python", ""),
            starter_cpp        = p.get("starter_cpp", ""),
            starter_javascript = p.get("starter_javascript", ""),
            created_by         = "ai",
        )
        db.add(row)
        saved.append(row)

    try:
        db.commit()
        for r in saved:
            db.refresh(r)
        return (existing + saved)[:count]
    except Exception as e:
        db.rollback()
        print(f"Failed to save coding problems: {e}")
        return existing


def submit_code(problem_id: str, language: str, code: str, user_id, db: Session) -> dict:
    """
    Evaluate a code submission.
    Uses Gemini to check if the code looks correct.
    Saves the submission record.
    """
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        return {"pass": False, "message": "Problem not found.", "result": "error"}

    # Evaluate with Gemini
    eval_result = _evaluate_code_with_gemini(
        problem_title = problem.title,
        description   = problem.description,
        language      = language,
        code          = code,
    )

    is_correct = eval_result.get("pass", False)
    result_str = "accepted" if is_correct else "wrong_answer"

    # Save submission
    sub = CodingSubmission(
        user_id    = user_id,
        problem_id = problem.id,
        language   = language,
        code       = code,
        result     = result_str,
        runtime_ms = eval_result.get("runtime_ms", None),
    )
    db.add(sub)

    # Log to recent submissions
    _log_recent_submission(
        user_id = user_id,
        name    = problem.title,
        result  = "Accepted" if is_correct else "Wrong Answer",
        lang    = language.capitalize(),
        correct = is_correct,
        db      = db,
    )
    _increment_activity(user_id, db)

    xp = 15 if is_correct else 0
    if is_correct:
        _add_xp(user_id, xp, db)
        increment_skill_progress(user_id, problem.skill or "Coding", 5, db)

    db.commit()

    return {
        "pass":       is_correct,
        "message":    eval_result.get("message", ""),
        "result":     result_str,
        "xp_earned":  xp,
        "runtime_ms": eval_result.get("runtime_ms"),
    }


# ── EXAM ──────────────────────────────────────────────────────────────────────

def get_exam_questions(user_id, db: Session, exam_type: str = "jee", count: int = 30) -> list:
    """
    Get exam-mode questions grouped by section.
    For JEE: Physics + Chemistry + Mathematics.
    For NEET: Biology + Physics + Chemistry.
    """
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
    actual_exam = exam_type
    if ob and ob.exam_type:
        actual_exam = ob.exam_type.lower()

    sections = _get_exam_sections(actual_exam)
    per_section = max(count // len(sections), 2)

    result = []
    for section in sections:
        qs = (
            db.query(PracticeQuestion)
            .filter(
                PracticeQuestion.q_type.in_(["mcq", "numeric"]),
                PracticeQuestion.topic.ilike(f"%{section}%"),
            )
            .order_by(sqlfunc.random())
            .limit(per_section)
            .all()
        )

        # If not enough, generate via Gemini
        if len(qs) < per_section:
            # Force-generate for this section
            if ob:
                ob_copy = type("ob", (), {
                    "user_type":      "exam_aspirant",
                    "exam_type":      actual_exam,
                    "interests":      [section],
                    "twelve_month_goal": f"Clear {actual_exam.upper()}",
                    "weak_subjects":  [],
                    "field_of_study": section,
                    "career_goal":    "",
                })()

                section_config = {
                    "subjects":     [section],
                    "q_types":      ["mcq", "numeric"],
                    "difficulties": ["easy", "medium", "hard"],
                    "instructions": f"Generate {actual_exam.upper()} pattern questions for {section}.",
                }

                from services.practice_gemini import _generate_with_gemini
                generated = _generate_with_gemini(ob_copy, section_config, section, count=per_section + 2)

                for q in generated:
                    row = PracticeQuestion(
                        user_type     = "exam_aspirant",
                        topic         = section,
                        subtopic      = q.get("subtopic", ""),
                        difficulty    = q.get("difficulty", "medium"),
                        q_type        = q.get("type", "mcq"),
                        question_text = q.get("question", ""),
                        options       = q.get("options"),
                        correct_answer= q.get("correct_answer"),
                        explanation   = q.get("explanation", ""),
                        created_by    = "ai",
                    )
                    db.add(row)
                    qs.append(row)

                try:
                    db.commit()
                except Exception:
                    db.rollback()

        result.extend(qs[:per_section])

    random.shuffle(result)
    return result


def submit_exam(
    user_id,
    exam_type: str,
    answers: dict,       # {question_id: selected_option_index}
    time_taken_s: int,
    db: Session,
) -> dict:
    """
    Submit a full exam. Calculate score using +4/-1 marking.
    Returns section-wise breakdown.
    """
    correct_count = 0
    wrong_count   = 0
    unattempted   = 0
    section_scores = {}

    for q_id, selected in answers.items():
        if selected is None:
            unattempted += 1
            continue

        question = db.query(PracticeQuestion).filter(
            PracticeQuestion.id == q_id
        ).first()
        if not question:
            continue

        section = question.topic
        if section not in section_scores:
            section_scores[section] = {"correct": 0, "wrong": 0, "total": 0}
        section_scores[section]["total"] += 1

        # Compare: selected is index (0/1/2/3), correct_answer is "A"/"B"/"C"/"D"
        correct_letter = str(question.correct_answer or "").strip().upper()
        selected_letter = _index_to_letter(selected)

        if selected_letter == correct_letter:
            correct_count += 1
            section_scores[section]["correct"] += 1
        else:
            wrong_count += 1
            section_scores[section]["wrong"] += 1

    score = (correct_count * 4) - (wrong_count * 1)

    # Save exam session
    session = ExamSession(
        user_id       = user_id,
        exam_type     = exam_type,
        answers       = answers,
        score         = score,
        correct_count = correct_count,
        wrong_count   = wrong_count,
        unattempted   = unattempted,
        time_taken_s  = time_taken_s,
        completed     = True,
        session_date  = date.today(),
    )
    db.add(session)

    # Log recent submission
    _log_recent_submission(
        user_id = user_id,
        name    = f"{exam_type.upper()} Mock Exam",
        result  = f"Score: {score}",
        lang    = exam_type.upper(),
        correct = score > 0,
        db      = db,
    )
    _increment_activity(user_id, db)

    # Update streak
    streak_data = update_streak(user_id, db)
    db.commit()

    return {
        "score":          score,
        "correct_count":  correct_count,
        "wrong_count":    wrong_count,
        "unattempted":    unattempted,
        "section_scores": section_scores,
        "streak":         streak_data,
    }


# ── ACTIVITY ──────────────────────────────────────────────────────────────────

def get_activity_graph(user_id, db: Session) -> list:
    """
    Return 365 days of activity data for the contribution graph.
    """
    today     = date.today()
    start     = today - timedelta(days=364)

    logs = (
        db.query(PracticeActivityLog)
        .filter(
            PracticeActivityLog.user_id  == user_id,
            PracticeActivityLog.log_date >= start,
        )
        .all()
    )

    log_map = {str(log.log_date): log.submission_count for log in logs}

    result = []
    for i in range(365):
        d = start + timedelta(days=i)
        ds = d.isoformat()
        result.append({
            "date":        ds,
            "submissions": log_map.get(ds, 0),
        })

    return result


def get_recent_submissions(user_id, db: Session, limit: int = 10) -> list:
    """Return the last N submissions across all modes."""
    rows = (
        db.query(RecentSubmission)
        .filter(RecentSubmission.user_id == user_id)
        .order_by(RecentSubmission.submitted_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "name":       r.name,
            "result":     r.result,
            "lang":       r.lang,
            "time":       _time_ago(r.submitted_at),
            "correct":    r.is_correct,
        }
        for r in rows
    ]


def get_practice_stats(user_id, db: Session) -> dict:
    """Return streak, total solved, today's XP."""
    streak_row = get_or_create_streak(user_id, db)

    total_solved = (
        db.query(RecentSubmission)
        .filter(
            RecentSubmission.user_id   == user_id,
            RecentSubmission.is_correct == True,
        )
        .count()
    )

    today_log = (
        db.query(PracticeActivityLog)
        .filter(
            PracticeActivityLog.user_id  == user_id,
            PracticeActivityLog.log_date == date.today(),
        )
        .first()
    )

    today_xp = today_log.xp_earned if today_log else 0

    return {
        "current_streak": streak_row.current_streak,
        "max_streak":     streak_row.longest_streak,
        "total_solved":   total_solved,
        "today_xp":       today_xp,
    }


# ── INTERNAL HELPERS ──────────────────────────────────────────────────────────

def _log_recent_submission(user_id, name: str, result: str, lang: str, correct: bool, db: Session):
    sub = RecentSubmission(
        user_id    = user_id,
        name       = name,
        result     = result,
        lang       = lang,
        is_correct = correct,
    )
    db.add(sub)
    # Don't commit here — caller commits


def _increment_activity(user_id, db: Session):
    today = date.today()
    log = (
        db.query(PracticeActivityLog)
        .filter(
            PracticeActivityLog.user_id  == user_id,
            PracticeActivityLog.log_date == today,
        )
        .first()
    )
    if log:
        log.submission_count += 1
    else:
        log = PracticeActivityLog(
            user_id          = user_id,
            log_date         = today,
            submission_count = 1,
            xp_earned        = 0,
        )
        db.add(log)
    
    db.flush()   # ← add this
    db.commit()  # ← add this


def _add_xp(user_id, xp: int, db: Session):
    today = date.today()
    log = (
        db.query(PracticeActivityLog)
        .filter(
            PracticeActivityLog.user_id  == user_id,
            PracticeActivityLog.log_date == today,
        )
        .first()
    )
    if log:
        log.xp_earned += xp
    else:
        log = PracticeActivityLog(
            user_id          = user_id,
            log_date         = today,
            submission_count = 0,
            xp_earned        = xp,
        )
        db.add(log)


def _get_xp(difficulty: str) -> int:
    return {"easy": 5, "medium": 10, "hard": 20}.get(difficulty, 5)


def _get_skill_delta(difficulty: str) -> int:
    return {"easy": 2, "medium": 3, "hard": 5}.get(difficulty, 2)


def _index_to_letter(index) -> str:
    mapping = {0: "A", 1: "B", 2: "C", 3: "D"}
    try:
        return mapping.get(int(index), "")
    except (ValueError, TypeError):
        return str(index).upper()


def _get_exam_sections(exam_type: str) -> list:
    sections = {
        "jee":  ["Physics", "Chemistry", "Mathematics"],
        "neet": ["Biology", "Physics", "Chemistry"],
        "upsc": ["History", "Polity", "Geography", "Economy"],
        "cat":  ["Quantitative Aptitude", "Verbal Ability", "Logical Reasoning"],
        "gate": ["Data Structures", "Algorithms", "Operating Systems"],
    }
    return sections.get(exam_type.lower(), ["Physics", "Chemistry", "Mathematics"])


def _time_ago(dt) -> str:
    from datetime import datetime, timezone
    if not dt:
        return "Unknown"
    now  = datetime.now(timezone.utc)
    diff = now - dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else now - dt
    s    = int(diff.total_seconds())
    if s < 60:         return "just now"
    if s < 3600:       return f"{s // 60} min ago"
    if s < 86400:      return f"{s // 3600}h ago"
    if s < 172800:     return "Yesterday"
    return dt.strftime("%b %d")


def _generate_coding_problems(skill_focus: str, count: int = 5) -> list:
    """Call Gemini to generate coding problems."""
    prompt = f"""
You are a coding problem generator for a learning platform.

Generate {count} coding problems focused on: {skill_focus}

Return ONLY a valid JSON array, no markdown:
[
  {{
    "title": "Problem Title",
    "difficulty": "easy",
    "skill": "Arrays",
    "description": "Full problem description with context and what to return.",
    "constraints": ["2 ≤ nums.length ≤ 10⁴", "-10⁹ ≤ nums[i] ≤ 10⁹"],
    "examples": [
      {{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explain": "nums[0] + nums[1] = 9"}}
    ],
    "starter_python": "def solution(...):\\n    pass",
    "starter_cpp": "#include<bits/stdc++.h>\\nusing namespace std;\\n\\n// your code",
    "starter_javascript": "var solution = function(...) {{\\n    // your code\\n}};"
  }}
]

Mix difficulties: easy, medium, hard.
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 20})
        raw = response.text.strip()
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        start = raw.find("[")
        end   = raw.rfind("]")
        if start != -1 and end != -1:
            raw = raw[start:end+1]
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except Exception as e:
        print(f"Coding problem generation failed: {e}")
        return []


def _evaluate_code_with_gemini(
    problem_title: str,
    description: str,
    language: str,
    code: str,
) -> dict:
    """Ask Gemini to evaluate if submitted code is logically correct."""
    if len(code.strip()) < 30:
        return {"pass": False, "message": "Code is too short. Please write a complete solution."}

    prompt = f"""
You are a code evaluator for a learning platform.

Problem: {problem_title}
Description: {description}

Submitted {language} code:
{code}

Evaluate if this code correctly solves the problem.
Be strict but fair — check for correct logic, not style.

Return ONLY this JSON:
{{"pass": true or false, "message": "One sentence feedback.", "runtime_ms": 50}}

If the code is a stub or clearly incomplete, pass = false.
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 15})
        raw = response.text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        start = raw.find("{")
        end   = raw.rfind("}")
        if start != -1 and end != -1:
            raw = raw[start:end+1]
        return json.loads(raw)
    except Exception as e:
        print(f"Code evaluation failed: {e}")
        # Heuristic fallback
        keywords = ["for", "while", "if", "return", "def ", "function", "map", "hash"]
        is_ok = sum(1 for k in keywords if k in code) >= 2 and len(code) > 80
        return {
            "pass":       is_ok,
            "message":    "Accepted! Good solution." if is_ok else "Check your logic and edge cases.",
            "runtime_ms": 52,
        }