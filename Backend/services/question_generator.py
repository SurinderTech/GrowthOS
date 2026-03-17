# app/services/question_generator.py
# Gemini AI question generator
# Rule: Generate ONCE, store in Supabase forever, reuse always
# Gemini is called ONLY when DB has fewer than 3 questions for a skill

import json
import uuid
from config import supabase, gemini_model


DIFFICULTY_MAP = {
    "beginner":     ["easy", "easy", "medium"],
    "intermediate": ["easy", "medium", "practical"],
    "advanced":     ["medium", "practical", "practical"],
}


async def get_or_generate_questions(
    profession: str,
    skill: str,
    user_level: str = "beginner",
    count: int = 3,
) -> list[dict]:
    """
    1. Check Supabase for existing questions for this skill
    2. If enough exist → return them (no Gemini call)
    3. If not enough → call Gemini, store results, return them
    """

    # ── Step 1: Check database ─────────────────────────────────────────────
    existing = (
        supabase.table("questions")
        .select("*")
        .eq("skill", skill)
        .eq("profession", profession)
        .limit(count)
        .execute()
    )

    if existing.data and len(existing.data) >= count:
        # We have enough — pick a varied difficulty mix
        return _pick_difficulty_mix(existing.data, user_level, count)

    # ── Step 2: Not enough — call Gemini ──────────────────────────────────
    print(f"[Gemini] Generating questions for: {profession} → {skill} ({user_level})")
    generated = await _generate_with_gemini(profession, skill, user_level, count=5)

    if not generated:
        # Gemini failed — return whatever we have from DB as fallback
        return existing.data[:count] if existing.data else []

    # ── Step 3: Store generated questions in Supabase ─────────────────────
    rows = []
    for q in generated:
        row = {
            "id":           str(uuid.uuid4()),
            "profession":   profession,
            "skill":        skill,
            "difficulty":   q.get("difficulty", "easy"),
            "type":         q.get("type", "mcq"),
            "question":     q.get("question", ""),
            "options":      q.get("options"),       # null for short/coding
            "answer":       str(q.get("answer", "")),
            "explanation":  q.get("explanation", ""),
            "created_by":   "ai",
        }
        rows.append(row)

    supabase.table("questions").insert(rows).execute()
    print(f"[Gemini] Stored {len(rows)} new questions for {skill}")

    return _pick_difficulty_mix(rows, user_level, count)


async def _generate_with_gemini(
    profession: str,
    skill: str,
    level: str,
    count: int = 5,
) -> list[dict]:
    """
    Call Gemini with a structured prompt.
    Returns parsed list of question dicts.
    """
    prompt = f"""
You are a technical question generator for a learning platform.

Generate {count} practice questions for:
- Profession: {profession}
- Skill: {skill}
- Level: {level}

Rules:
- Mix question types: include at least 2 MCQ and 1 short answer
- MCQ must have exactly 4 options
- answer field for MCQ = index as string ("0", "1", "2", "3")
- answer field for short = null
- explanation must be clear, under 50 words
- difficulty: "easy", "medium", or "practical"
- type: "mcq" or "short"

Return ONLY valid JSON array. No markdown, no backticks, no explanation outside JSON.

Example format:
[
  {{
    "difficulty": "easy",
    "type": "mcq",
    "question": "What does REST stand for?",
    "options": ["Remote Execution", "Representational State Transfer", "Resource Endpoint", "Request State Token"],
    "answer": "1",
    "explanation": "REST = Representational State Transfer, an architectural style for APIs using HTTP."
  }},
  {{
    "difficulty": "medium",
    "type": "short",
    "question": "Explain what a FastAPI dependency is and why it's useful.",
    "options": null,
    "answer": null,
    "explanation": "Dependencies in FastAPI allow injecting reusable logic (auth, DB sessions) into routes cleanly."
  }}
]
"""
    try:
        response = gemini_model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown code fences if Gemini adds them
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return parsed
        return []

    except Exception as e:
        print(f"[Gemini ERROR] Question generation failed: {e}")
        return []


def _pick_difficulty_mix(questions: list[dict], level: str, count: int) -> list[dict]:
    """
    Pick a balanced difficulty mix from available questions.
    Target mix based on user level.
    """
    target_diffs = DIFFICULTY_MAP.get(level, ["easy", "medium", "practical"])[:count]

    result = []
    used_ids = set()

    for target_diff in target_diffs:
        # Try to find a question matching target difficulty
        match = next(
            (q for q in questions if q.get("difficulty") == target_diff and q.get("id") not in used_ids),
            None
        )
        if not match:
            # Fallback: any unused question
            match = next((q for q in questions if q.get("id") not in used_ids), None)
        if match:
            result.append(match)
            used_ids.add(match.get("id"))

    return result