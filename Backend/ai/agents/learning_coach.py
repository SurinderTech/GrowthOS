"""
Backend/ai/agents/learning_coach.py
AI Learning Coach & Nova AI Tutor service powering LearningAgent workspace.
"""

from __future__ import annotations
import json
import logging
from typing import Any, Dict, List, Optional

from Backend.ai.openrouter_client import get_openrouter_client
from Backend.ai.base_agent import BaseAgent, safe_parse_json
from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import TaskType

logger = logging.getLogger("growthos.ai.learning_coach")


class LearningCoachAgent(BaseAgent):
    """Builds learning plans and tracks skill growth for a topic."""

    name = "learning_coach"
    description = "Builds a sequenced learning plan for a given topic/skill."
    prompt_file = "learning_coach.md"
    task_type = TaskType.PLANNING
    expects_json = True
    temperature = 0.6
    timeout = 20.0

    def run(self, context: MemoryContext, *, topic: str = "", **kwargs: Any) -> Any:
        return super().run(context, topic=topic, **kwargs)


def generate_learning_curriculum(user_profile: Dict[str, Any], memory: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a structured 4-week learning curriculum (plan, missions, topics, code snippets, resources).
    Falls back gracefully to a robust default plan if AI rate limits or fails.
    """
    career_goal = user_profile.get("career_goal") or memory.get("target_topic") or "Software Engineering & AI Development"
    current_level = user_profile.get("current_level") or "Intermediate"
    learning_style = memory.get("learning_style") or "mixed"
    learning_priority = memory.get("learning_priority") or "deep_understanding"

    prompt = f"""
You are Nova, an expert AI Curriculum Architect on GrowthOS.
Generate a structured 4-week learning curriculum for a student with:
- Career Goal / Topic: {career_goal}
- Current Skill Level: {current_level}
- Learning Style: {learning_style}
- Learning Priority: {learning_priority}

Return ONLY valid JSON matching this structure exactly:
{{
  "plan": {{
    "title": "{career_goal} Mastery Roadmap",
    "target_role": "{career_goal}",
    "total_weeks": 4
  }},
  "missions": [
    {{
      "week_number": 1,
      "day_number": 1,
      "week_title": "Foundations & System Architecture",
      "estimated_minutes": 45,
      "tasks": [
        {{ "topic_key": "t1", "text": "Master core async control flow and state management" }},
        {{ "topic_key": "t1", "text": "Implement error boundaries and exception propagation" }}
      ]
    }}
  ],
  "topics": [
    {{
      "topic_key": "t1",
      "title": "System Fundamentals & Async Control",
      "summary": "Core execution model, event loops, and non-blocking I/O.",
      "explanation": "Understanding how modern asynchronous systems handle concurrent operations efficiently without blocking the main event thread.",
      "code_snippet": {{
        "language": "typescript",
        "code": "async function executeTask(id: string): Promise<void> {{\n  const result = await processJob(id);\n  console.log('Task finished:', result);\n}}"
      }},
      "practice_questions": [
        {{ "question": "What happens when an unhandled rejection occurs in an async function?", "answer": "The promise rejects, and unless caught with a try/catch or .catch(), it triggers an unhandled rejection error." }}
      ]
    }}
  ],
  "resources": [
    {{
      "topic_key": "t1",
      "type": "video",
      "title": "{career_goal} In-Depth Technical Guide",
      "source": "GrowthOS Tech Academy",
      "url": "https://youtube.com",
      "duration_or_time": "20 min"
    }}
  ]
}}
"""
    client = get_openrouter_client()
    try:
        from Backend.ai.model_router import get_model_router
        model = get_model_router().model_for(TaskType.PLANNING)
        res = client.chat(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            temperature=0.6,
            json_mode=True,
            timeout=25.0
        )
        data = safe_parse_json(res.text)
        if isinstance(data, dict) and "plan" in data and "missions" in data:
            return data
    except Exception as exc:
        logger.warning(f"AI curriculum generation failed, using fallback: {exc}")

    # Fallback default curriculum
    return {
        "plan": {
            "title": f"{career_goal} Accelerated Journey",
            "target_role": career_goal,
            "total_weeks": 4,
        },
        "missions": [
            {
                "week_number": 1,
                "day_number": 1,
                "week_title": "Core Foundations & Architecture",
                "estimated_minutes": 45,
                "tasks": [
                    { "topic_key": "t1", "text": "Understand core execution pipeline & state synchronization" },
                    { "topic_key": "t1", "text": "Build a clean modular component module" },
                ],
            }
        ],
        "topics": [
            {
                "topic_key": "t1",
                "title": "Architecture & Clean Code Principles",
                "summary": "Essential design patterns, modular architecture, and robust error isolation.",
                "explanation": "Clean architecture decouples core logic from external dependencies, ensuring maintainable and scalable code.",
                "code_snippet": {
                    "language": "typescript",
                    "code": "// Clean Architecture Pattern Example\nexport class ModuleService {\n  async process(): Promise<boolean> {\n    return true;\n  }\n}"
                },
                "practice_questions": [
                    { "question": "Why is separation of concerns important in system design?", "answer": "It reduces complexity, makes code easier to test, and allows components to evolve independently." }
                ],
            }
        ],
        "resources": [
            {
                "topic_key": "t1",
                "type": "doc",
                "title": "Official Architecture & Best Practices Guide",
                "source": "GrowthOS Docs",
                "url": "https://docs.growthos.io",
                "duration_or_time": "15 min read",
            }
        ],
    }


def chat_with_nova_tutor(
    user_message: str,
    history: List[Dict[str, str]],
    topic_context: Optional[Dict[str, Any]] = None,
    user_profile: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generates a helpful, encouraging AI tutor response from Nova.
    """
    system_prompt = (
        "You are Nova, an empathetic, highly intelligent AI Learning Coach on GrowthOS. "
        "Your goal is to guide students step-by-step, explain complex concepts clearly with analogies, "
        "and provide code snippets when helpful. Keep answers concise, inspiring, and direct."
    )

    if topic_context:
        system_prompt += f"\n\nCurrent Active Topic: {topic_context.get('title', '')} - {topic_context.get('summary', '')}"

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-6:]:  # include last 6 messages
        messages.append({"role": msg["sender"], "content": msg["text"]})

    messages.append({"role": "user", "content": user_message})

    client = get_openrouter_client()
    try:
        from Backend.ai.model_router import get_model_router
        model = get_model_router().model_for(TaskType.CHAT)
        res = client.chat(
            messages=messages,
            model=model,
            temperature=0.7,
            timeout=20.0,
        )
        return res.text.strip()
    except Exception as exc:
        logger.error(f"Nova tutor AI chat failed: {exc}")
        return f"I'm keeping track of your progress on '{topic_context.get('title', 'this topic') if topic_context else 'your goal'}'! Let's solve this step by step together."
