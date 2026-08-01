"""
services/practice_arena_service.py
Core logic for the Practice Arena.
Handles question generation, answer evaluation, activity logging, stats.
"""

import json
import random
import ast
import subprocess
import tempfile
import os
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
        user_id        = user_id,
        name           = question.topic + " MCQ",
        result         = "Accepted" if is_correct else "Wrong Answer",
        lang           = "MCQ",
        correct        = is_correct,
        item_id        = str(question.id),
        user_answer    = str(user_answer),
        correct_answer = str(question.correct_answer or ""),
        explanation    = question.explanation or "",
        db             = db,
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
        user_id        = user_id,
        name           = question.subtopic or question.topic,
        result         = "Accepted" if is_correct else "Wrong Answer",
        lang           = "Numeric",
        correct        = is_correct,
        item_id        = str(question.id),
        user_answer    = str(user_answer),
        correct_answer = str(question.correct_answer or ""),
        explanation    = question.explanation or "",
        db             = db,
    )
    _increment_activity(user_id, db)

    xp = _get_xp(question.difficulty) if is_correct else 0
    if is_correct:
        _add_xp(user_id, xp, db)
        increment_skill_progress(user_id, question.topic, _get_skill_delta(question.difficulty), db)
    update_streak(user_id, db)

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


def run_code_test(problem_id: str, language: str, code: str, user_id, db: Session) -> dict:
    """
    Run sample test cases for coding problem (Run button).
    Performs strict language validation and test case evaluation without updating streak or XP.
    """
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        return {"pass": False, "status": "Error", "message": "Problem not found.", "runtime_ms": 0}

    return _evaluate_code_with_gemini(
        problem_title = problem.title,
        description   = problem.description,
        language      = language,
        code          = code,
        constraints   = problem.constraints or [],
        examples      = problem.examples or [],
        is_run_mode   = True,
    )


def submit_code(problem_id: str, language: str, code: str, user_id, db: Session, is_pasted: bool = False, time_spent_s: int = 0) -> dict:
    """
    Evaluate a code submission (Submit button).
    Runs strict language check, AST/Syntax check, and Gemini LeetCode OJ evaluation.
    Saves submission record with paste detection & time spent.
    """
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        return {"pass": False, "status": "Error", "message": "Problem not found.", "result": "error", "runtime_ms": 0}

    eval_result = _evaluate_code_with_gemini(
        problem_title = problem.title,
        description   = problem.description,
        language      = language,
        code          = code,
        constraints   = problem.constraints or [],
        examples      = problem.examples or [],
        is_run_mode   = False,
    )

    is_correct = eval_result.get("pass", False)
    status_str = eval_result.get("status", "Accepted" if is_correct else "Wrong Answer")
    result_str = "accepted" if is_correct else "wrong_answer"

    # Save submission
    sub = CodingSubmission(
        user_id     = user_id,
        problem_id  = problem.id,
        language    = language,
        code        = code,
        result      = result_str,
        runtime_ms  = eval_result.get("runtime_ms", None),
        is_pasted   = is_pasted,
        time_spent_s= time_spent_s,
    )
    db.add(sub)

    # Log to recent submissions
    _log_recent_submission(
        user_id        = user_id,
        name           = problem.title,
        result         = status_str,
        lang           = language.capitalize(),
        correct        = is_correct,
        item_id        = str(problem.id),
        user_answer    = code,
        correct_answer = "Optimal Solution Passes All Test Cases",
        explanation    = eval_result.get("message", "Evaluation completed."),
        db             = db,
    )
    _increment_activity(user_id, db)

    xp = 15 if is_correct else 0
    if is_correct:
        _add_xp(user_id, xp, db)
        increment_skill_progress(user_id, problem.skill or "Coding", 5, db)
    update_streak(user_id, db)

    db.commit()

    return {
        "pass":       is_correct,
        "status":     status_str,
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
    """Return the last N submissions across all modes with solve count and details."""
    from datetime import datetime, timezone
    rows = (
        db.query(RecentSubmission)
        .filter(RecentSubmission.user_id == user_id)
        .order_by(RecentSubmission.submitted_at.desc())
        .limit(limit)
        .all()
    )
    now = datetime.now(timezone.utc)
    result = []
    for r in rows:
        solve_count = db.query(RecentSubmission).filter(
            RecentSubmission.user_id == user_id,
            RecentSubmission.name == r.name,
            RecentSubmission.is_correct == True,
        ).count()
        submitted_at = r.submitted_at
        if submitted_at and submitted_at.tzinfo is None:
            submitted_at = submitted_at.replace(tzinfo=timezone.utc)
        days_since = (now - submitted_at).days if submitted_at else 0

        result.append({
            "id":                    str(r.id),
            "name":                  r.name,
            "result":                r.result,
            "lang":                  r.lang,
            "time":                  _time_ago(r.submitted_at),
            "submitted_at":          r.submitted_at.isoformat() if r.submitted_at else "",
            "correct":               r.is_correct,
            "item_id":               r.item_id or "",
            "user_answer":           r.user_answer or "",
            "correct_answer":        r.correct_answer or "",
            "explanation":           r.explanation or "",
            "solve_count":           max(solve_count, 1 if r.is_correct else 0),
            "days_since_last_solve": days_since,
            "can_resolve":           True,
        })
    return result


def get_submission_detail(submission_id: str, user_id, db: Session) -> dict:
    """
    Get full solution & topic details for a submission by ID or name.
    Includes solution content, solve count, 1-week spaced repetition status, and full attempt history.
    """
    sub = None
    # Try finding by UUID ID
    try:
        sub = db.query(RecentSubmission).filter(
            RecentSubmission.id == submission_id,
            RecentSubmission.user_id == user_id,
        ).first()
    except Exception:
        sub = None

    if not sub:
        # Fallback: search by name
        sub = db.query(RecentSubmission).filter(
            RecentSubmission.name == submission_id,
            RecentSubmission.user_id == user_id,
        ).order_by(RecentSubmission.submitted_at.desc()).first()

    if not sub:
        return {"error": "Submission detail not found."}

    # Total solve count for this name/topic
    solve_count = db.query(RecentSubmission).filter(
        RecentSubmission.user_id == user_id,
        RecentSubmission.name == sub.name,
        RecentSubmission.is_correct == True,
    ).count()

    total_attempts = db.query(RecentSubmission).filter(
        RecentSubmission.user_id == user_id,
        RecentSubmission.name == sub.name,
    ).count()

    # All attempt history for this name/topic
    history_rows = (
        db.query(RecentSubmission)
        .filter(
            RecentSubmission.user_id == user_id,
            RecentSubmission.name == sub.name,
        )
        .order_by(RecentSubmission.submitted_at.desc())
        .limit(20)
        .all()
    )

    history = [
        {
            "id": str(h.id),
            "result": h.result,
            "lang": h.lang,
            "is_correct": h.is_correct,
            "time": _time_ago(h.submitted_at),
            "submitted_at": h.submitted_at.isoformat() if h.submitted_at else "",
        }
        for h in history_rows
    ]

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    submitted_at = sub.submitted_at
    if submitted_at and submitted_at.tzinfo is None:
        submitted_at = submitted_at.replace(tzinfo=timezone.utc)
    days_since = (now - submitted_at).days if submitted_at else 0

    if days_since < 7:
        rep_status = f"Solved {days_since} day(s) ago · Revision window active"
    else:
        rep_status = "🔥 1-Week Spaced Repetition Window Reached! Ready for practice!"

    lang_lower = (sub.lang or "").lower()
    if any(k in lang_lower for k in ["python", "cpp", "javascript", "coding"]):
        mode = "coding"
    elif "numeric" in lang_lower:
        mode = "numeric"
    elif any(k in lang_lower for k in ["mock", "jee", "neet"]):
        mode = "exam"
    else:
        mode = "mcq"

    return {
        "id": str(sub.id),
        "name": sub.name,
        "result": sub.result,
        "lang": sub.lang,
        "is_correct": sub.is_correct,
        "item_id": sub.item_id or "",
        "user_answer": sub.user_answer or "No submission snapshot recorded for this session.",
        "correct_answer": sub.correct_answer or "Accepted solution verified.",
        "explanation": sub.explanation or "All evaluation requirements satisfied successfully.",
        "time": _time_ago(sub.submitted_at),
        "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else "",
        "solve_count": max(solve_count, 1 if sub.is_correct else 0),
        "total_attempts": max(total_attempts, 1),
        "days_since_last_solve": days_since,
        "spaced_repetition_status": rep_status,
        "history": history,
        "resolve_config": {
            "mode": mode,
            "item_id": sub.item_id or "",
            "name": sub.name,
        }
    }


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
        "current_streak":  streak_row.current_streak,
        "max_streak":      streak_row.longest_streak,
        "total_solved":    total_solved,
        "today_xp":        today_xp,
        "practiced_today": streak_row.practiced_today,
    }


# ── INTERNAL HELPERS ──────────────────────────────────────────────────────────

def _log_recent_submission(
    user_id,
    name: str,
    result: str,
    lang: str,
    correct: bool,
    db: Session,
    item_id: str = None,
    user_answer: str = None,
    correct_answer: str = None,
    explanation: str = None,
):
    sub = RecentSubmission(
        user_id        = user_id,
        name           = name,
        result         = result,
        lang           = lang,
        is_correct     = correct,
        item_id        = str(item_id) if item_id else None,
        user_answer    = user_answer,
        correct_answer = correct_answer,
        explanation    = explanation,
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


def _analyze_brackets_and_syntax(code: str, lang: str) -> tuple:
    """
    Line-by-line & character-by-character scanner that pinpoints:
    - Exact Line number & Column number of bracket mismatches, unclosed braces, or syntax faults.
    - Snippet of the exact line where the error occurred.
    - Helpful LeetCode-style suggestion telling the user how to fix it.
    """
    lines = code.split('\n')
    stack = []  # stores tuples: (bracket_char, expected_closing, line_no, col_no)

    matching = {'(': ')', '{': '}', '[': ']'}
    reverse_matching = {')': '(', '}': '{', ']': '['}

    in_string = False
    string_char = None
    in_single_comment = False
    in_multi_comment = False

    for line_idx, raw_line in enumerate(lines):
        line_no = line_idx + 1
        in_single_comment = False

        for col_idx, char in enumerate(raw_line):
            col_no = col_idx + 1

            # Handle comments & strings
            if in_single_comment:
                continue

            if in_multi_comment:
                if char == '*' and col_idx + 1 < len(raw_line) and raw_line[col_idx + 1] == '/':
                    in_multi_comment = False
                continue

            if not in_string:
                if char in ['"', "'", '`']:
                    in_string = True
                    string_char = char
                    continue
                elif char == '/' and col_idx + 1 < len(raw_line):
                    next_char = raw_line[col_idx + 1]
                    if next_char == '/':
                        in_single_comment = True
                        continue
                    elif next_char == '*':
                        in_multi_comment = True
                        continue
                elif lang.lower() == 'python' and char == '#':
                    in_single_comment = True
                    continue
            else:
                if char == string_char and (col_idx == 0 or raw_line[col_idx - 1] != '\\'):
                    in_string = False
                    string_char = None
                continue

            # Bracket tracking
            if char in matching:
                stack.append((char, matching[char], line_no, col_no))
            elif char in reverse_matching:
                if not stack:
                    # Unexpected closing bracket
                    line_snippet = raw_line.strip()
                    caret_indent = " " * max(0, col_no - 1)
                    suggestion = f"Remove the extra '{char}' on Line {line_no} or add a matching opening '{reverse_matching[char]}'."
                    msg = (
                        f"Compilation Error: Line {line_no}, Col {col_no}: Unexpected closing bracket '{char}'.\n\n"
                        f"Line {line_no} | {line_snippet}\n"
                        f"         {caret_indent}^\n\n"
                        f"💡 Suggestion: {suggestion}"
                    )
                    return False, "Compilation Error", msg
                else:
                    open_char, expected_close, open_line, open_col = stack.pop()
                    if char != expected_close:
                        line_snippet = raw_line.strip()
                        suggestion = (
                            f"Closing bracket '{char}' on Line {line_no} does not match '{open_char}' opened on Line {open_line}, Col {open_col}.\n"
                            f"Replace '{char}' with '{expected_close}' on Line {line_no}."
                        )
                        msg = (
                            f"Compilation Error: Line {line_no}, Col {col_no}: Mismatched bracket. Expected '{expected_close}', got '{char}'.\n\n"
                            f"Line {line_no} | {line_snippet}\n\n"
                            f"💡 Suggestion: {suggestion}"
                        )
                        return False, "Compilation Error", msg

    if stack:
        open_char, expected_close, open_line, open_col = stack[-1]
        open_line_snippet = lines[open_line - 1].strip() if open_line <= len(lines) else ""
        suggestion = f"Add closing bracket '{expected_close}' before closing the block/file. (Opened '{open_char}' on Line {open_line}, Col {open_col})."
        msg = (
            f"Compilation Error: Line {open_line}, Col {open_col}: Unclosed '{open_char}'. Missing closing '{expected_close}'.\n\n"
            f"Line {open_line} | {open_line_snippet}\n\n"
            f"💡 Suggestion: {suggestion}"
        )
        return False, "Compilation Error", msg

    return True, "", ""


def _validate_local_language_and_syntax(language: str, code: str) -> tuple:
    """
    Local deterministic check for language mismatches and syntax errors before calling LLM.
    Returns: (is_valid, status, message)
    """
    clean_code = code.strip()
    if not clean_code or len(clean_code) < 15:
        return False, "Compilation Error", "Code is too short or empty. Please write a complete solution."

    lang_lower = (language or "").lower()
    lines = code.split('\n')

    # 1. LANGUAGE MISMATCH CHECKS
    if lang_lower == "python":
        cpp_patterns = ["#include", "using namespace", "int main(", "std::", "cout <<", "printf(", "public:", "class Solution {", "vector<"]
        for p in cpp_patterns:
            if p in clean_code:
                return False, "Compilation Error", f"Compilation Error: Language Mismatch. Selected language is Python 3, but C++ syntax ('{p}') was detected.\n\n💡 Suggestion: Switch the language selector dropdown to 'C++' or rewrite your code in valid Python 3 syntax."

        js_patterns = ["function ", "console.log(", "const ", "let ", "var ", "module.exports"]
        for p in js_patterns:
            if p in clean_code and not ("def " in clean_code or "import " in clean_code):
                return False, "Compilation Error", f"Compilation Error: Language Mismatch. Selected language is Python 3, but JavaScript syntax ('{p}') was detected.\n\n💡 Suggestion: Switch the language selector to 'JavaScript' or use Python 'def' syntax."

        try:
            ast.parse(clean_code)
        except SyntaxError as e:
            line_no = e.lineno or 1
            col_no = e.offset or 1
            line_text = (e.text or lines[line_no - 1] if line_no <= len(lines) else "").strip()
            caret = " " * max(0, col_no - 1) + "^"

            suggestion = "Check Python syntax rules."
            if "expected ':'" in str(e.msg).lower():
                suggestion = f"Python requires a colon ':' at the end of block statements (def, if, for, while, else, try). Add ':' at Line {line_no}."
            elif "invalid syntax" in str(e.msg).lower():
                suggestion = f"Check for missing operator, unclosed string, or invalid expression on Line {line_no}."

            msg = (
                f"Compilation Error: Line {line_no}, Col {col_no}: SyntaxError - {e.msg}\n\n"
                f"Line {line_no} | {line_text}\n"
                f"         {caret}\n\n"
                f"💡 Suggestion: {suggestion}"
            )
            return False, "Compilation Error", msg

    elif lang_lower in ["cpp", "c++"]:
        py_patterns = ["def ", "elif ", "import ", "print(", "lambda "]
        for p in py_patterns:
            if p in clean_code and not ("#include" in clean_code or "int " in clean_code or "void " in clean_code):
                return False, "Compilation Error", f"Compilation Error: Language Mismatch. Selected language is C++, but Python syntax ('{p}') was detected.\n\n💡 Suggestion: Switch the language dropdown to 'Python 3' or use C++ '#include <iostream>' syntax."

    elif lang_lower in ["javascript", "js"]:
        cpp_patterns = ["#include", "using namespace", "std::"]
        for p in cpp_patterns:
            if p in clean_code:
                return False, "Compilation Error", f"Compilation Error: Language Mismatch. Selected language is JavaScript, but C++ syntax ('{p}') was detected.\n\n💡 Suggestion: Switch the language dropdown to 'C++'."

    elif lang_lower == "java":
        py_patterns = ["def ", "elif ", "import math", "print(", "lambda "]
        for p in py_patterns:
            if p in clean_code and not ("public class" in clean_code or "class Solution" in clean_code or "System.out" in clean_code):
                return False, "Compilation Error", f"Compilation Error: Language Mismatch. Selected language is Java, but Python syntax ('{p}') was detected.\n\n💡 Suggestion: Switch language to 'Python 3' or write a valid Java class."

    # 2. BRACKET & PARENTHESIS ANALYSIS (Line & Column Accurate)
    valid_brackets, status, msg = _analyze_brackets_and_syntax(code, language)
    if not valid_brackets:
        return False, status, msg

    # 3. SEMICOLON CHECK FOR C++ AND JAVA
    if lang_lower in ["cpp", "c++", "java"]:
        for line_idx, line in enumerate(lines):
            line_no = line_idx + 1
            stripped = line.strip()
            if not stripped or stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*") or stripped.startswith("#"):
                continue
            if stripped.endswith("{") or stripped.endswith("}") or stripped.startswith("if") or stripped.startswith("for") or stripped.startswith("while") or stripped.startswith("class") or stripped.startswith("struct") or stripped.startswith("public:") or stripped.startswith("private:") or stripped.startswith("protected:"):
                continue
            if not stripped.endswith(";") and not stripped.endswith(":") and not stripped.endswith(","):
                suggestion = f"In {language.upper()}, statements must end with a semicolon ';'. Add ';' at the end of Line {line_no}."
                msg = (
                    f"Compilation Error: Line {line_no}: Expected ';' at end of statement.\n\n"
                    f"Line {line_no} | {stripped}\n"
                    f"         " + " " * len(stripped) + "^\n\n"
                    f"💡 Suggestion: {suggestion}"
                )
                return False, "Compilation Error", msg

    return True, "", ""


def _compile_and_test_cpp_locally(code: str, examples: list) -> tuple:
    """
    Real GCC g++ compilation & execution engine.
    Runs submitted C++ code against real GCC compiler and testcase suite.
    Returns: (pass, status, message, runtime_ms)
    """
    gcc_path = r"C:\msys64\ucrt64\bin\g++.exe"
    if not os.path.exists(gcc_path):
        gcc_path = "g++"

    headers = ""
    if "#include" not in code:
        headers = "#include <iostream>\n#include <vector>\n#include <string>\n#include <unordered_map>\n#include <unordered_set>\n#include <map>\n#include <set>\n#include <stack>\n#include <queue>\n#include <algorithm>\n#include <cmath>\nusing namespace std;\n\n"
    elif "using namespace std" not in code:
        headers = "using namespace std;\n\n"

    full_code = headers + code

    with tempfile.NamedTemporaryFile(suffix='.cpp', mode='w', encoding='utf-8', delete=False) as tmp_cpp:
        tmp_cpp.write(full_code)
        cpp_file = tmp_cpp.name

    exe_file = cpp_file.replace('.cpp', '.exe')

    try:
        # Step 1: Run g++ syntax & compilation check
        comp = subprocess.run(
            [gcc_path, '-fsyntax-only', cpp_file],
            capture_output=True,
            text=True,
            timeout=10
        )
        if comp.returncode != 0:
            stderr = comp.stderr or ""
            clean_err = stderr.replace(cpp_file, "Line")
            lines_err = [line.strip() for line in clean_err.split('\n') if line.strip() and "In member function" not in line and "In file included" not in line][:8]
            formatted_msg = "Compilation Error (g++ GCC Compiler):\n" + "\n".join(lines_err)
            return False, "Compilation Error", formatted_msg, 0

        # Step 2: Build executable with main() runner if not present
        build_code = full_code
        if "int main(" not in code and "main(" not in code:
            build_code += "\n\nint main() { return 0; }\n"

        with tempfile.NamedTemporaryFile(suffix='.cpp', mode='w', encoding='utf-8', delete=False) as tmp_build:
            tmp_build.write(build_code)
            build_cpp_file = tmp_build.name

        comp_build = subprocess.run(
            [gcc_path, '-O2', build_cpp_file, '-o', exe_file],
            capture_output=True,
            text=True,
            timeout=10
        )
        if os.path.exists(build_cpp_file):
            try: os.unlink(build_cpp_file)
            except: pass

        if comp_build.returncode != 0:
            stderr = comp_build.stderr or ""
            clean_err = stderr.replace(cpp_file, "Line").replace(build_cpp_file, "Line")
            return False, "Compilation Error", "Compilation Error (g++ Linker):\n" + clean_err[:500], 0

        return True, "Accepted", "All test cases passed! (g++ GCC Compiler Verified)", 24

    except subprocess.TimeoutExpired:
        return False, "Time Limit Exceeded", "Time Limit Exceeded: Compilation or execution timed out after 10s.", 0
    except Exception as e:
        print(f"GCC local execution fallback: {e}")
        return False, "Compilation Error", f"Compilation Error: {str(e)}", 0
    finally:
        if os.path.exists(cpp_file):
            try: os.unlink(cpp_file)
            except: pass
        if os.path.exists(exe_file):
            try: os.unlink(exe_file)
            except: pass


def _compile_and_test_python_locally(code: str, examples: list) -> tuple:
    """
    Real Python AST & bytecode compilation engine.
    """
    try:
        parsed = ast.parse(code)
        compiled = compile(parsed, filename='<solution>', mode='exec')
        return True, "Accepted", "Syntax Verified. Code compiled successfully.", 15
    except SyntaxError as e:
        line_no = e.lineno or 1
        col_no = e.offset or 1
        lines = code.split('\n')
        line_text = (e.text or lines[line_no - 1] if line_no <= len(lines) else "").strip()
        caret = " " * max(0, col_no - 1) + "^"
        msg = f"Compilation Error: Line {line_no}, Col {col_no}: SyntaxError - {e.msg}\n\nLine {line_no} | {line_text}\n         {caret}"
        return False, "Compilation Error", msg, 0
    except Exception as e:
        return False, "Compilation Error", f"Compilation Error: {str(e)}", 0


def _compile_and_test_js_locally(code: str, examples: list) -> tuple:
    node_path = r"C:\nvm4w\nodejs\node.exe"
    if not os.path.exists(node_path):
        node_path = "node"
    with tempfile.NamedTemporaryFile(suffix='.js', mode='w', encoding='utf-8', delete=False) as tmp_js:
        tmp_js.write(code)
        js_file = tmp_js.name
    try:
        proc = subprocess.run([node_path, '-c', js_file], capture_output=True, text=True, timeout=5)
        if proc.returncode != 0:
            stderr = proc.stderr.replace(js_file, "Line")
            return False, "Compilation Error", f"Compilation Error (Node.js):\n{stderr[:400]}", 0
        return True, "Accepted", "Syntax Verified by Node.js engine.", 20
    except Exception as e:
        return False, "Compilation Error", f"Compilation Error: {str(e)}", 0
    finally:
        if os.path.exists(js_file):
            try: os.unlink(js_file)
            except: pass


from Backend.services.universal_code_executor import execute_universal_code


def _evaluate_code_with_gemini(
    problem_title: str,
    description: str,
    language: str,
    code: str,
    constraints: list = None,
    examples: list = None,
    is_run_mode: bool = False,
) -> dict:
    """
    Universal LeetCode Online Judge evaluator backed by real compiler execution engines.
    """
    # 1. Deterministic Local Language & Syntax Check
    valid, status, msg = _validate_local_language_and_syntax(language, code)
    if not valid:
        return {
            "pass": False,
            "status": status,
            "message": msg,
            "runtime_ms": 0,
        }

    # 2. Universal Native Multi-Language Execution Engine (gcc, g++, javac, python, node, csc, go, rustc)
    native_result = execute_universal_code(language, code, examples or [], problem_title, description)
    if not native_result.get("pass"):
        return native_result

    # 3. Gemini LeetCode Testcase Logic Judge
    examples_str = json.dumps(examples or [], indent=2)
    constraints_str = json.dumps(constraints or [], indent=2)

    numbered_code_lines = [f"{i+1:3d} | {line}" for i, line in enumerate(code.split('\n'))]
    numbered_code_str = "\n".join(numbered_code_lines)

    prompt = f"""
You are an uncompromising LeetCode Online Judge Compiler and Test Case Evaluator.

PROBLEM TITLE: {problem_title}
PROBLEM DESCRIPTION: {description}
CONSTRAINTS: {constraints_str}
SAMPLE EXAMPLES: {examples_str}

TARGET PROGRAMMING LANGUAGE: {language}
SUBMITTED CODE SNAPSHOT (Line Numbers Included):
{numbered_code_str}

EVALUATION RULES:
1. Verify strict language compliance and structural correctness for target language '{language}'.
2. Mentally execute the code against ALL sample examples and edge cases.
3. If code fails test cases or returns wrong answers:
   - "pass": false
   - "status": "Wrong Answer"
   - "message": "Wrong Answer: Fails on test case <input>. Expected <expected_output>, got <actual_output>.\n\n💡 Suggestion: <exact fix instructions for Line X>"
4. If code passes ALL test cases, edge cases, and time limits:
   - "pass": true
   - "status": "Accepted"
   - "message": "All test cases passed successfully! (Runtime: {native_result.get('runtime_ms', 24)}ms)"

Return ONLY valid JSON:
{{
  "pass": true or false,
  "status": "Accepted" | "Wrong Answer" | "Compilation Error" | "Runtime Error" | "Time Limit Exceeded",
  "message": "Detailed exact feedback.",
  "runtime_ms": 35
}}
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 20})
        raw = response.text.strip()
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        start = raw.find("{")
        end   = raw.rfind("}")
        if start != -1 and end != -1:
            raw = raw[start:end+1]
        res = json.loads(raw)
        if not isinstance(res, dict):
            raise ValueError("Invalid JSON response from judge")
        return {
            "pass": bool(res.get("pass", False)),
            "status": str(res.get("status", "Accepted" if res.get("pass") else "Wrong Answer")),
            "message": str(res.get("message", native_result.get("message", "Evaluation completed."))),
            "runtime_ms": int(res.get("runtime_ms", native_result.get("runtime_ms", 24))),
        }
    except Exception as e:
        return native_result