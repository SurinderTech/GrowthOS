"""
routers/practice_arena.py

Practice Arena API — powers the full dashboard/practice/page.tsx

Add to main.py:
    from Backend.routers.practice_arena import router as arena_router
    app.include_router(arena_router, prefix="/practice-arena", tags=["Practice Arena"])

Endpoints:
    GET  /practice-arena/stats                  → streak, xp, total solved
    GET  /practice-arena/mcq/questions          → get personalized MCQ questions
    POST /practice-arena/mcq/answer             → evaluate one MCQ answer
    GET  /practice-arena/numeric/questions      → get numeric questions
    POST /practice-arena/numeric/answer         → evaluate one numeric answer
    GET  /practice-arena/coding/problems        → get coding problems
    POST /practice-arena/coding/submit          → evaluate code submission
    GET  /practice-arena/exam/questions         → get exam-mode questions
    POST /practice-arena/exam/submit            → submit full exam
    GET  /practice-arena/activity               → 365 days activity graph
    GET  /practice-arena/submissions/recent     → recent submission feed
    POST /practice-arena/session/complete       → mark session done, update streak
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from Backend.db.session import get_db
from Backend.routers.auth import get_current_user
from Backend.services.practice_arena_service import (
    get_mcq_questions, evaluate_mcq_answer,
    get_numeric_questions, evaluate_numeric_answer,
    get_coding_problems, submit_code, run_code_test,
    get_exam_questions, submit_exam,
    get_activity_graph, get_recent_submissions,
    get_submission_detail,
    get_practice_stats,
)
from Backend.services.streak_service import update_streak

router = APIRouter()


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    id: str
    topic: str
    subtopic: Optional[str]
    difficulty: str
    q_type: str
    question_text: str
    options: Optional[List[str]]

    class Config:
        from_attributes = True


class MCQAnswerRequest(BaseModel):
    question_id: str
    user_answer: str   # "A", "B", "C", or "D"


class AnswerResultOut(BaseModel):
    is_correct: bool
    correct_answer: Optional[str]
    explanation: str
    xp_earned: int


class NumericAnswerRequest(BaseModel):
    question_id: str
    user_answer: str   # numeric value as string e.g. "20" or "9.8"


class CodingProblemOut(BaseModel):
    id: str
    title: str
    difficulty: str
    skill: Optional[str]
    description: str
    constraints: List[str]
    examples: List[dict]
    starter_python: Optional[str]
    starter_cpp: Optional[str]
    starter_javascript: Optional[str]

    class Config:
        from_attributes = True


class CodeRunRequest(BaseModel):
    problem_id: str
    language: str       # python | cpp | java | javascript
    code: str


class CodeSubmitRequest(BaseModel):
    problem_id: str
    language: str       # python | cpp | java | javascript
    code: str
    is_pasted: Optional[bool] = False
    time_spent_s: Optional[int] = 0


class ExamQuestionOut(BaseModel):
    id: str
    topic: str
    subtopic: Optional[str]
    difficulty: str
    q_type: str
    question_text: str
    options: Optional[List[str]]

    class Config:
        from_attributes = True


class ExamSubmitRequest(BaseModel):
    exam_type: str = "jee"
    answers: Dict[str, Any]    # {question_id: selected_option_index or null}
    time_taken_s: int = 0


class ExamResult(BaseModel):
    score: int
    correct_count: int
    wrong_count: int
    unattempted: int
    section_scores: dict
    streak: dict


class SessionCompleteRequest(BaseModel):
    mode: str   # mcq | numeric | coding | exam


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
def practice_stats(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns streak, max streak, total solved, today's XP.
    Called on page load to populate the 4 stat cards.
    """
    return get_practice_stats(current_user.id, db)


# ── MCQ ───────────────────────────────────────────────────────────────────────

@router.get("/mcq/questions", response_model=List[QuestionOut])
def mcq_questions(
    count: int = Query(default=5, ge=1, le=20),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns personalized MCQ questions.
    Gemini generates if DB doesn't have enough for this user type.

    ── FIX: filters out any MCQ questions that somehow have null options ──
    This is a safety net on top of the validation in practice_gemini.py.
    """
    questions = get_mcq_questions(current_user.id, db, count=count)

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No MCQ questions available. Please try again in a moment."
        )

    result = []
    for q in questions:
        # For MCQ: skip any that have null/empty options (broken records)
        if q.q_type == "mcq" and (not q.options or len(q.options) < 4):
            print(f"[Router] Skipping MCQ with null/empty options: id={q.id}")
            continue
        result.append(
            QuestionOut(
                id            = str(q.id),
                topic         = q.topic,
                subtopic      = q.subtopic,
                difficulty    = q.difficulty,
                q_type        = q.q_type,
                question_text = q.question_text,
                options       = q.options,
            )
        )

    if not result:
        raise HTTPException(
            status_code=422,
            detail=(
                "Questions were generated but options are missing. "
                "Bad records have been skipped. Please try again — "
                "fresh questions will be generated."
            )
        )

    return result


@router.post("/mcq/answer", response_model=AnswerResultOut)
def mcq_answer(
    req: MCQAnswerRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Evaluate one MCQ answer.
    Called when user clicks 'Check Answer' on the MCQ tab.
    """
    result = evaluate_mcq_answer(
        question_id = req.question_id,
        user_answer = req.user_answer,
        user_id     = current_user.id,
        db          = db,
    )
    db.commit()
    return AnswerResultOut(**result)


# ── Numeric ───────────────────────────────────────────────────────────────────

@router.get("/numeric/questions", response_model=List[QuestionOut])
def numeric_questions(
    count: int = Query(default=3, ge=1, le=10),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns personalized numeric questions.
    Numeric questions never have options — that is expected and correct.
    """
    questions = get_numeric_questions(current_user.id, db, count=count)

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No numeric questions available. Please try again in a moment."
        )

    return [
        QuestionOut(
            id            = str(q.id),
            topic         = q.topic,
            subtopic      = q.subtopic,
            difficulty    = q.difficulty,
            q_type        = q.q_type,
            question_text = q.question_text,
            options       = None,   # numeric never has options — this is correct
        )
        for q in questions
    ]


@router.post("/numeric/answer", response_model=AnswerResultOut)
def numeric_answer(
    req: NumericAnswerRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Evaluate one numeric answer with tolerance.
    Called when user clicks 'Check Answer' on the Numeric tab.
    """
    result = evaluate_numeric_answer(
        question_id = req.question_id,
        user_answer = req.user_answer,
        user_id     = current_user.id,
        db          = db,
    )
    db.commit()
    return AnswerResultOut(**result)


# ── Coding ────────────────────────────────────────────────────────────────────

@router.get("/coding/problems", response_model=List[CodingProblemOut])
def coding_problems(
    count: int = Query(default=5, ge=1, le=10),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns coding problems.
    Gemini generates if DB is empty.
    """
    problems = get_coding_problems(current_user.id, db, count=count)

    if not problems:
        raise HTTPException(
            status_code=404,
            detail="No coding problems available. Please try again in a moment."
        )

    return [
        CodingProblemOut(
            id                 = str(p.id),
            title              = p.title,
            difficulty         = p.difficulty,
            skill              = p.skill,
            description        = p.description,
            constraints        = p.constraints or [],
            examples           = p.examples or [],
            starter_python     = p.starter_python,
            starter_cpp        = p.starter_cpp,
            starter_javascript = p.starter_javascript,
        )
        for p in problems
    ]


@router.post("/coding/run")
def coding_run(
    req: CodeRunRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Run sample test cases for coding problem (Run button).
    Performs language validation and test case evaluation without updating streak/XP.
    """
    result = run_code_test(
        problem_id = req.problem_id,
        language   = req.language,
        code       = req.code,
        user_id    = current_user.id,
        db         = db,
    )
    return result


@router.post("/coding/submit")
def coding_submit(
    req: CodeSubmitRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Evaluate a code submission using strict syntax validator and LeetCode OJ.
    Called when user clicks 'Submit' on the Coding tab.
    """
    result = submit_code(
        problem_id  = req.problem_id,
        language    = req.language,
        code        = req.code,
        user_id     = current_user.id,
        db          = db,
        is_pasted   = req.is_pasted or False,
        time_spent_s= req.time_spent_s or 0,
    )
    return {
        "pass":       result["pass"],
        "status":     result.get("status", "Accepted" if result["pass"] else "Wrong Answer"),
        "message":    result["message"],
        "result":     result.get("result", "accepted" if result["pass"] else "wrong_answer"),
        "xp_earned":  result.get("xp_earned", 0),
        "runtime_ms": result.get("runtime_ms"),
    }


# ── Exam ──────────────────────────────────────────────────────────────────────

@router.get("/exam/questions", response_model=List[ExamQuestionOut])
def exam_questions(
    exam_type: str = Query(default="jee"),
    count:     int = Query(default=30, ge=6, le=90),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns questions for Exam Mode, grouped by section.
    Defaults to JEE (Physics + Chemistry + Mathematics).

    ── FIX: skips any MCQ exam questions that have null options ──
    """
    questions = get_exam_questions(
        user_id   = current_user.id,
        db        = db,
        exam_type = exam_type,
        count     = count,
    )

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="Could not load exam questions. Please try again."
        )

    result = []
    for q in questions:
        # Skip broken MCQ records that have no options
        if q.q_type == "mcq" and (not q.options or len(q.options) < 4):
            print(f"[Router/Exam] Skipping MCQ with null options: id={q.id}")
            continue
        result.append(
            ExamQuestionOut(
                id            = str(q.id),
                topic         = q.topic,
                subtopic      = q.subtopic,
                difficulty    = q.difficulty,
                q_type        = q.q_type,
                question_text = q.question_text,
                options       = q.options,
            )
        )

    if not result:
        raise HTTPException(
            status_code=422,
            detail="All exam questions had missing options. Please try again."
        )

    return result


@router.post("/exam/submit", response_model=ExamResult)
def exam_submit(
    req: ExamSubmitRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a full exam. Calculates +4/-1 score with section breakdown.
    Called when user clicks 'Submit Exam' or timer runs out.
    """
    result = submit_exam(
        user_id      = current_user.id,
        exam_type    = req.exam_type,
        answers      = req.answers,
        time_taken_s = req.time_taken_s,
        db           = db,
    )
    return ExamResult(**result)


# ── Activity Graph ────────────────────────────────────────────────────────────

@router.get("/activity")
def activity_graph(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns 365 days of submission activity for the heatmap graph.
    Returns: [{date: "2025-03-01", submissions: 5}, ...]
    """
    return get_activity_graph(current_user.id, db)


# ── Recent Submissions ────────────────────────────────────────────────────────

@router.get("/submissions/recent")
def recent_submissions(
    limit: int = Query(default=10, ge=1, le=50),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns recent submission history for the activity tab feed.
    """
    return get_recent_submissions(current_user.id, db, limit=limit)


@router.get("/submissions/{submission_id}")
def submission_detail(
    submission_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns solution details, solve count, history, and 1-week spaced repetition status for a topic/submission.
    """
    res = get_submission_detail(submission_id, current_user.id, db)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


# ── Session Complete ──────────────────────────────────────────────────────────

@router.post("/session/complete")
def session_complete(
    req: SessionCompleteRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Call this when a full practice session ends (MCQ set done, numeric done etc).
    Updates the streak.
    """
    streak_data = update_streak(current_user.id, db)
    return {
        "success": True,
        "mode":    req.mode,
        "streak":  streak_data,
    }