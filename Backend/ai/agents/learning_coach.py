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


def get_domain_fallback(career_goal: str) -> Dict[str, Any]:
    norm = career_goal.lower()

    # JEE / Engineering Entrance
    if "jee" in norm or "iit" in norm or "crack_exam" in norm or "physics" in norm or "chemistry" in norm:
        return {
            "plan": {
                "title": f"{career_goal} Accelerated Preparation",
                "target_role": career_goal,
                "total_weeks": 4,
            },
            "missions": [
                {
                    "week_number": 1,
                    "day_number": 1,
                    "week_title": "Physics Mechanics & NCERT Chemistry Core",
                    "estimated_minutes": 45,
                    "tasks": [
                        { "topic_key": "t1", "text": "Master Newton's Laws of Motion & Momentum Conservation" },
                        { "topic_key": "t1", "text": "Solve 15 NTA Previous Year Questions (PYQs)" },
                    ],
                }
            ],
            "topics": [
                {
                    "topic_key": "t1",
                    "title": "Mechanics & Laws of Motion (Physics)",
                    "summary": "Core principles of forces, friction, work-energy theorem, and momentum.",
                    "explanation": "Newton's laws govern mechanical motion. Mastery of free-body diagrams (FBD) and energy conservation is critical for solving JEE Advanced numerical problems.",
                    "code_snippet": {
                        "language": "formula",
                        "code": "// Key Physics Formulas:\nF_net = m * a\nWork = ∫ F · dx = ΔK (Work-Energy Theorem)\nImpulse = ∫ F dt = Δp"
                    },
                    "practice_questions": [
                        { "question": "What is the condition for a body to be in translational equilibrium?", "answer": "The vector sum of all external forces acting on the body must be zero (ΣF = 0)." }
                    ],
                }
            ],
            "resources": [
                {
                    "topic_key": "t1",
                    "type": "video",
                    "title": "JEE Physics Mechanics & PYQ Problem Solving Guide",
                    "source": "GrowthOS Academy",
                    "url": "https://youtube.com",
                    "duration_or_time": "25 min",
                }
            ],
        }

    # NEET / Medical / Doctor
    if "neet" in norm or "doctor" in norm or "medical" in norm or "biology" in norm or "mbbs" in norm:
        return {
            "plan": {
                "title": f"{career_goal} Mastery Plan",
                "target_role": career_goal,
                "total_weeks": 4,
            },
            "missions": [
                {
                    "week_number": 1,
                    "day_number": 1,
                    "week_title": "Human Physiology & Cell Biology",
                    "estimated_minutes": 45,
                    "tasks": [
                        { "topic_key": "t1", "text": "Study NCERT Human Digestion & Respiratory System line-by-line" },
                        { "topic_key": "t1", "text": "Practice 20 NEET Bio Diagram & Assertion-Reason Questions" },
                    ],
                }
            ],
            "topics": [
                {
                    "topic_key": "t1",
                    "title": "Human Physiology & Circulatory System",
                    "summary": "Structure and function of the human heart, blood composition, and cardiac cycle.",
                    "explanation": "Human physiology forms ~30% of NEET Biology. Focus on cardiac cycle timing, double circulation, and NCERT terminology.",
                    "code_snippet": {
                        "language": "concept",
                        "code": "// Cardiac Cycle:\nAtrial Systole: 0.1s\nVentricular Systole: 0.3s\nJoint Diastole: 0.4s\nTotal Cycle: 0.8s (72 beats/min)"
                    },
                    "practice_questions": [
                        { "question": "Which organelle is known as the powerhouse of the cell?", "answer": "Mitochondria, as it generates ATP through cellular respiration." }
                    ],
                }
            ],
            "resources": [
                {
                    "topic_key": "t1",
                    "type": "doc",
                    "title": "NCERT Biology Human Physiology Master Notes",
                    "source": "GrowthOS Medical",
                    "url": "https://docs.growthos.io",
                    "duration_or_time": "20 min read",
                }
            ],
        }

    # Business / Entrepreneur
    if "business" in norm or "startup" in norm or "entrepreneur" in norm:
        return {
            "plan": {
                "title": f"{career_goal} Launch & Scale Roadmap",
                "target_role": career_goal,
                "total_weeks": 4,
            },
            "missions": [
                {
                    "week_number": 1,
                    "day_number": 1,
                    "week_title": "Customer Problem Validation & Value Proposition",
                    "estimated_minutes": 45,
                    "tasks": [
                        { "topic_key": "t1", "text": "Conduct 5 customer discovery interviews to validate problem" },
                        { "topic_key": "t1", "text": "Write a 1-page lean Canvas Value Proposition" },
                    ],
                }
            ],
            "topics": [
                {
                    "topic_key": "t1",
                    "title": "Customer Discovery & Value Proposition Canvas",
                    "summary": "Validating real customer pain points before writing code or building products.",
                    "explanation": "90% of startups fail due to building products nobody wants. Customer interviews de-risk your business model before launch.",
                    "code_snippet": {
                        "language": "strategy",
                        "code": "// Lean Startup Loop:\nBuild MVP -> Measure Customer Feedback -> Learn & Pivot"
                    },
                    "practice_questions": [
                        { "question": "What is the main goal of a Minimum Viable Product (MVP)?", "answer": "To test core hypotheses with maximum validated learning and minimal effort." }
                    ],
                }
            ],
            "resources": [
                {
                    "topic_key": "t1",
                    "type": "video",
                    "title": "Zero to One Startup Validation Playbook",
                    "source": "GrowthOS Business",
                    "url": "https://youtube.com",
                    "duration_or_time": "18 min",
                }
            ],
        }

    # Default Tech / Software Engineer
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
                "week_title": "Core Foundations & Systems",
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
                "title": "Architecture & System Principles",
                "summary": "Essential design patterns, modular architecture, and robust execution.",
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


def generate_learning_curriculum(user_profile: Dict[str, Any], memory: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a structured 4-week learning curriculum (plan, missions, topics, code snippets/formulas, resources).
    Falls back gracefully to a domain-tailored default plan if AI rate limits or fails.
    """
    career_goal = user_profile.get("career_goal") or memory.get("target_topic") or "Software Engineering & AI Development"
    current_level = user_profile.get("current_level") or "Intermediate"
    learning_style = memory.get("learning_style") or "mixed"
    learning_priority = memory.get("learning_priority") or "deep_understanding"

    prompt = f"""
You are Nova, an expert AI Curriculum Architect on GrowthOS.
Generate a structured 4-week learning curriculum tailored specifically for this student's domain and goal:
- Student Goal / Target: {career_goal}
- Current Skill Level: {current_level}
- Learning Style: {learning_style}
- Learning Priority: {learning_priority}

CRITICAL:
- If the goal is JEE, NEET, Medical, UPSC, Business, Creator, or Freelance, generate REAL domain-specific topics, questions, and formulas/summaries for THAT exact domain. Do NOT generate software developer topics for medical/exam students.
- If software engineering, generate code snippets and tech architecture topics.

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
      "week_title": "Foundations & Core Domain Mastery",
      "estimated_minutes": 45,
      "tasks": [
        {{ "topic_key": "t1", "text": "Master core domain fundamentals" }},
        {{ "topic_key": "t1", "text": "Complete practice drills and problem solving" }}
      ]
    }}
  ],
  "topics": [
    {{
      "topic_key": "t1",
      "title": "{career_goal} Key Concepts",
      "summary": "Core concepts and principles for {career_goal}.",
      "explanation": "Detailed step-by-step breakdown of fundamental concepts.",
      "code_snippet": {{
        "language": "concept",
        "code": "// Key Reference / Formula / Strategy\nConcept = Core Domain Pattern"
      }},
      "practice_questions": [
        {{ "question": "Key domain practice question?", "answer": "Direct concise explanation." }}
      ]
    }}
  ],
  "resources": [
    {{
      "topic_key": "t1",
      "type": "video",
      "title": "{career_goal} In-Depth Guide",
      "source": "GrowthOS Academy",
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

    return get_domain_fallback(career_goal)


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
        "You are Nova, the intelligent AI Learning Coach on GrowthOS.\n\n"
        "CORE DYNAMIC BEHAVIOR:\n"
        "1. INTELLIGENT CONTEXT EVALUATION: If the user's message is ambiguous, lacks context, or you don't know what topic/code/problem they are referring to, DO NOT guess or give generic canned text. Instead, ask targeted, helpful diagnostic questions (e.g. 'What specific topic or code snippet are you working on?', 'Where are you getting stuck?', 'What concept can I break down for you?').\n"
        "2. IDENTITY & ROLE QUERIES: If the user's intent is to ask about who you are, what you can do, your capabilities, or your role (expressed in ANY natural phrasing like 'Who are you?', 'Describe yourself', 'What can you help me with?', etc.), respond warmly and articulately as NOVA, tailoring your response dynamically to their learning journey.\n"
        "3. REGULAR QUESTIONS & RE-EXPLANATIONS: For all regular questions, study topics, or requests to reframe ('explain differently', 'show visually'), answer the target subject directly and clearly using step-by-step logic, analogies, and code/formula snippets. NEVER append or prepend self-introduction boilerplate when explaining study concepts."
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
