"""
services/agents_ai_service.py

AI functions for the three new agent workspaces that need model calls:
Resume Agent (ATS analysis), Interview Agent (question generation +
answer feedback), and Networking Agent (outreach message drafting).

Uses the same OpenRouter-backed client as the rest of the app
(Backend.ai.legacy_adapter via Backend.ai.model_router.TaskType) so no
new API key or provider is introduced.
"""

import json
from Backend.ai.legacy_adapter import create_legacy_model
from Backend.ai.model_router import TaskType
from Backend.services.gemini_service import _safe_json


def _json_model():
    return create_legacy_model(TaskType.JSON)


def _creative_model():
    return create_legacy_model(TaskType.CREATIVE)


# ── Resume Agent ──────────────────────────────────────────────────────────────

def analyze_resume(resume_text: str, profile: dict) -> dict:
    """Score a resume like an ATS + give concrete improvements.
    Returns { ats_score, strengths[], improvements[], summary }.
    """
    prompt = f"""
You are an ATS (Applicant Tracking System) resume screener and career coach.

User profile: {json.dumps(profile, indent=2)}

Resume text:
---
{resume_text[:6000]}
---

Score this resume 0-100 the way an ATS + recruiter combo would (keyword match,
clarity, quantified impact, formatting for parsing). Then give 3 concrete
strengths and 3 concrete improvements specific to THIS resume's actual content
— never generic advice.

Return ONLY this JSON:
{{
  "ats_score": 72,
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "summary": "one or two sentence overall verdict"
}}
"""
    try:
        response = _json_model().generate_content(prompt, request_options={"timeout": 20})
        data = _safe_json(response.text)
        return {
            "ats_score": int(data.get("ats_score", 50)),
            "strengths": data.get("strengths", [])[:5],
            "improvements": data.get("improvements", [])[:5],
            "summary": data.get("summary", ""),
        }
    except Exception as e:
        return {
            "ats_score": 0,
            "strengths": [],
            "improvements": [],
            "summary": f"Analysis failed — try again in a moment. ({e})",
        }


# ── Interview Agent ───────────────────────────────────────────────────────────

def generate_interview_questions(role: str, profile: dict, count: int = 5) -> list:
    """Generate a mock-interview question set tailored to the target role."""
    prompt = f"""
You are a technical + behavioral interviewer preparing a candidate for the role: "{role}".

User profile: {json.dumps(profile, indent=2)}

Generate exactly {count} interview questions: a mix of behavioral and
role-specific technical/practical questions appropriate for someone at this
person's level. Order from easier to harder.

Return ONLY this JSON: {{"questions": ["...", "...", ...]}}
"""
    try:
        response = _json_model().generate_content(prompt, request_options={"timeout": 20})
        data = _safe_json(response.text)
        qs = data.get("questions", [])
        return qs[:count] if qs else _fallback_questions(role)
    except Exception:
        return _fallback_questions(role)


def _fallback_questions(role: str) -> list:
    return [
        f"Walk me through your background and why you're a fit for {role}.",
        "Tell me about a challenging problem you solved recently.",
        "How do you prioritize when you have multiple deadlines?",
        f"What's a project relevant to {role} that you're proud of?",
        "Where do you want to be in your career a year from now?",
    ]


def evaluate_interview_answer(question: str, answer: str, role: str, profile: dict) -> dict:
    """Score one interview answer and give specific feedback.
    Returns { feedback, score } where score is 0-100.
    """
    prompt = f"""
You are a strict but encouraging mock-interview coach for the role: "{role}".

Question asked: "{question}"
Candidate's answer: "{answer}"

Give a score 0-100 and 2-3 sentences of specific, actionable feedback
(what was strong, what to fix — structure like STAR if behavioral,
correctness/depth if technical).

Return ONLY this JSON: {{"score": 78, "feedback": "..."}}
"""
    try:
        response = _json_model().generate_content(prompt, request_options={"timeout": 15})
        data = _safe_json(response.text)
        return {"score": int(data.get("score", 60)), "feedback": data.get("feedback", "")}
    except Exception as e:
        return {"score": 0, "feedback": f"Couldn't evaluate that answer right now. ({e})"}


def summarize_interview_session(role: str, qa_pairs: list, profile: dict) -> dict:
    """Roll per-answer scores into an overall session verdict.
    qa_pairs: [{"question":..., "answer":..., "score":..., "feedback":...}, ...]
    """
    avg = round(sum(p.get("score", 0) for p in qa_pairs) / max(len(qa_pairs), 1))
    prompt = f"""
Role interviewed for: "{role}"
Per-question results: {json.dumps(qa_pairs, indent=2)}

Write a 2-3 sentence overall verdict on this mock interview performance —
be specific about the biggest pattern to fix next time.
Return ONLY this JSON: {{"overall_feedback": "..."}}
"""
    try:
        response = _json_model().generate_content(prompt, request_options={"timeout": 15})
        data = _safe_json(response.text)
        feedback = data.get("overall_feedback", "")
    except Exception:
        feedback = "Keep practicing — consistency across answers is what moves the needle most."
    return {"overall_score": avg, "overall_feedback": feedback}


# ── Networking Agent ───────────────────────────────────────────────────────────

def draft_outreach_message(contact: dict, profile: dict) -> str:
    """Draft a short, non-generic outreach/DM for a networking contact."""
    prompt = f"""
You are drafting a short outreach message on behalf of this user:
{json.dumps(profile, indent=2)}

To send to: {contact.get('name')}, {contact.get('role') or 'a professional'} at
{contact.get('company') or 'their company'}, via {contact.get('platform', 'LinkedIn')}.

Write a warm, specific, non-generic outreach message (3-5 sentences max).
No subject line. No placeholders like [Name] — use the real name given.
Plain text only, ready to paste and send.
"""
    try:
        response = _creative_model().generate_content(prompt, request_options={"timeout": 15})
        return response.text.strip()
    except Exception as e:
        return f"Hi {contact.get('name')}, I'd love to connect and learn more about your work — couldn't generate a fuller draft right now ({e}), but feel free to reach out!"
