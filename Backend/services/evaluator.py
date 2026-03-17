# app/services/evaluator.py
# Answer evaluation service
# MCQ → simple comparison
# Short answer → Gemini evaluates correctness

from config import supabase, gemini_model


async def evaluate_answer(
    question_id: str,
    user_answer: str,
    question_type: str,
) -> dict:
    """
    Returns: { is_correct: bool, explanation: str }
    """

    # ── Fetch question from DB ─────────────────────────────────────────────
    result = supabase.table("questions").select("*").eq("id", question_id).single().execute()
    if not result.data:
        return {"is_correct": False, "explanation": "Question not found."}

    question = result.data

    # ── MCQ: simple index comparison ──────────────────────────────────────
    if question_type == "mcq":
        is_correct = str(user_answer).strip() == str(question["answer"]).strip()
        return {
            "is_correct": is_correct,
            "explanation": question["explanation"],
        }

    # ── Short answer: Gemini evaluation ───────────────────────────────────
    if question_type == "short":
        return await _gemini_evaluate_text(
            question_text=question["question"],
            expected_explanation=question["explanation"],
            user_answer=user_answer,
        )

    return {"is_correct": False, "explanation": "Unknown question type."}


async def _gemini_evaluate_text(
    question_text: str,
    expected_explanation: str,
    user_answer: str,
) -> dict:
    """
    Ask Gemini: is the user's answer correct?
    Returns { is_correct: bool, explanation: str }
    """

    if not user_answer or len(user_answer.strip()) < 10:
        return {
            "is_correct": False,
            "explanation": "Answer too short. Please write at least a sentence.",
        }

    prompt = f"""
You are a strict but fair technical evaluator.

Question: {question_text}

Expected answer (reference): {expected_explanation}

Student's answer: {user_answer}

Evaluate if the student's answer captures the core concept.
Be lenient on wording but strict on correctness.

Reply ONLY in this exact JSON format:
{{
  "is_correct": true or false,
  "feedback": "One sentence explaining why correct or what was missing."
}}

No markdown, no extra text.
"""

    try:
        response = gemini_model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        import json
        parsed = json.loads(raw)
        return {
            "is_correct": bool(parsed.get("is_correct", False)),
            "explanation": parsed.get("feedback", ""),
        }

    except Exception as e:
        print(f"[Gemini ERROR] Evaluation failed: {e}")
        # Fallback: give benefit of doubt if answer is long enough
        is_correct = len(user_answer.strip()) > 50
        return {
            "is_correct": is_correct,
            "explanation": "AI evaluation unavailable. Answer accepted based on length.",
        }