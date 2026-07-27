"""
services/gemini_service.py
Shared AI integration for GrowthOS, now running on OpenRouter.

This module's prompts and output-parsing are left exactly as they were pre-
migration — only the model client underneath changed (Mesh → OpenRouter via
Backend/ai/legacy_adapter.py). See that module's docstring for why. New
agent-based capabilities live under Backend/ai/agents/ behind the Orchestrator.
"""

import json
from Backend.ai.legacy_adapter import create_legacy_model
from Backend.ai.model_router import TaskType

# ── Configure model client ───────────────────────────────────────────────────
print("GrowthOS AI: routed through OpenRouter (see Backend/ai/model_router.py)")

def print_models_safe():
    try:
        print("Active model:", _get_model().model_name)
    except Exception as e:
        print("Model client not available:", e)

MODEL_NAME = ""


def _get_model():
    # Most of these prompts ask for structured JSON back, so JSON is the
    # right default TaskType here. Swap per-call in the future if a specific
    # function benefits from a different task type (e.g. TaskType.CREATIVE).
    return create_legacy_model(TaskType.JSON)


def _safe_json(text: str) -> dict:
    """Strip markdown fences and parse JSON safely. Handles text around JSON."""
    clean = text.strip()

    # Remove markdown code blocks
    if "```" in clean:
        try:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        except IndexError:
            pass

    # Find the actual JSON object if there's surrounding text
    start = clean.find('{')
    end = clean.rfind('}')
    if start != -1 and end != -1:
        clean = clean[start:end+1]

    clean = clean.strip()
    return json.loads(clean)


# ── 1. Generate Full Growth Plan ──────────────────────────────────────────────
def generate_growth_plan(user_profile: dict) -> dict:
    """
    Generate a personalized 3-month growth roadmap based on onboarding data.
    """
    prompt = f"""
You are GrowthOS AI — a world-class growth coach. 
Based on this user profile, generate a highly personalized 3-month growth roadmap.

User Profile:
- Type: {user_profile.get('user_type', 'student')}
- Primary Goal: {user_profile.get('primary_goal', 'grow career')}
- 12-Month Goal: {user_profile.get('twelve_month_goal', 'get a job')}
- Interests: {', '.join(user_profile.get('interests', ['programming']))}
- Daily Time Available: {user_profile.get('daily_time', '2-3hours')}
- Career Goal: {user_profile.get('career_goal', 'Software Engineer')}
- Productivity Style: {user_profile.get('productivity_style', 'deep_focus')}
- Country: {user_profile.get('country', 'India')}

Return a JSON object ONLY (no markdown) with this exact structure:
{{
  "title": "Short motivating plan title",
  "summary": "One powerful sentence describing this plan",
  "months": [
    {{
      "month": 1,
      "label": "Month 1",
      "theme": "Foundation | Building | Launch | Mastery etc.",
      "milestones": [
        {{
          "id": "m1",
          "title": "Milestone title",
          "description": "One specific action line",
          "week": 1,
          "completed": false
        }}
      ],
      "progress": 0
    }}
  ]
}}

Generate exactly 3 months, each with exactly 4 milestones.
Be specific, actionable, and inspiring. No generic advice.
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 15})
        return _safe_json(response.text)
    except Exception as e:
        raise Exception(f"Gemini Error: {str(e)}")


# ── 2. Generate Daily Tasks ───────────────────────────────────────────────────
def generate_daily_tasks(user_profile: dict) -> list:
    user_type = user_profile.get("user_type", "student")

    context_lines = []
    if user_type == "student":
        context_lines.append(f"- Field of Study: {user_profile.get('field_of_study', '')}")
        context_lines.append(f"- Career Goal: {user_profile.get('career_goal', '')}")
    elif user_type == "freelancer":
        context_lines.append(f"- Primary Skill: {user_profile.get('primary_skill', '')}")
        context_lines.append(f"- Services: {', '.join(user_profile.get('services_offered', []))}")
    elif user_type == "entrepreneur":
        context_lines.append(f"- Business Type: {user_profile.get('business_type', '')}")
        context_lines.append(f"- Revenue Stage: {user_profile.get('revenue_stage', '')}")
    elif user_type == "creator":
        context_lines.append(f"- Platform: {user_profile.get('creator_platform', '')}")
        context_lines.append(f"- Niche: {user_profile.get('content_niche', '')}")
    elif user_type == "exam_aspirant":
        context_lines.append(f"- Exam: {user_profile.get('exam_type', '').upper()}")
        context_lines.append(f"- Weak Subjects: {', '.join(user_profile.get('weak_subjects', []))}")

    context = "\n".join(context_lines)

    prompt = f"""
You are GrowthOS AI. Generate exactly 3 tasks for TODAY with real resource links.

User Profile:
- User Type: {user_type}
- 12-Month Goal: {user_profile.get('twelve_month_goal', '')}
- Daily Time Available: {user_profile.get('daily_time', '2-3hours')}
- Interests: {', '.join(user_profile.get('interests', [])[:3])}
{context}

For each task include a real URL to the exact resource they need.

URL guidelines:
- LeetCode practice → https://leetcode.com/problemset/
- System design learning → https://www.youtube.com/c/GauravSen
- GitHub → https://github.com
- JEE Physics → https://www.pw.live/study/jee
- JEE/NEET mock tests → https://www.pw.live
- UPSC reading → https://www.thehindu.com or https://www.insightsonindia.com
- Upwork proposals → https://www.upwork.com/nx/find-work/
- YouTube analytics → https://studio.youtube.com
- Instagram → https://www.instagram.com
- Coursera courses → https://www.coursera.org
- freeCodeCamp → https://www.freecodecamp.org/learn

Return JSON array ONLY (no markdown):
[
  {{
    "id": "t1",
    "title": "Specific actionable task title",
    "description": "Short context or tip",
    "completed": false,
    "priority": "high",
    "estimated_minutes": 45,
    "category": "Learning | Practice | Project | Networking | Health | Review",
    "resource_url": "https://exact-url.com",
    "action_type": "open_link | practice | create | review | connect"
  }}
]
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 12})
        raw = response.text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1:
            raw = raw[start:end+1]
        return json.loads(raw)
    except Exception as e:
        print(f"Daily task generation failed: {e}")
        return []

# ── 3. Generate AI Insight ────────────────────────────────────────────────────
def generate_ai_insight(user_profile: dict) -> str:
    """Generate a short, powerful AI growth insight for the user."""
    prompt = f"""
You are GrowthOS AI — a brilliant, motivating growth coach.
Write ONE short paragraph (3-4 sentences max) as a personal insight for this user.

User Profile:
- Type: {user_profile.get('user_type')}
- Interest: {', '.join(user_profile.get('interests', [])[:3])}
- Goal: {user_profile.get('twelve_month_goal')}
- Daily time: {user_profile.get('daily_time')}
- Productivity style: {user_profile.get('productivity_style')}

Rules:
- Be direct, confident, and specific (not generic)
- Plain text only, no markdown
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 10})
        return response.text.strip()
    except Exception as e:
        print(f"AI insight generation failed: {e}")
        return "Keep pushing towards your goals. Every small step counts towards your ultimate success."


# ── 4. Generate Skills ────────────────────────────────────────────────────────
def generate_skill_recommendations(user_profile: dict) -> list:
    user_type = user_profile.get("user_type", "student")

    context_lines = []
    if user_type == "student":
        context_lines.append(f"- Field of Study: {user_profile.get('field_of_study', '')}")
        context_lines.append(f"- Career Goal: {user_profile.get('career_goal', '')}")
        context_lines.append(f"- Education Level: {user_profile.get('education_level', '')}")
    elif user_type == "freelancer":
        context_lines.append(f"- Primary Skill: {user_profile.get('primary_skill', '')}")
        context_lines.append(f"- Experience Level: {user_profile.get('experience_level', '')}")
        context_lines.append(f"- Services Offered: {', '.join(user_profile.get('services_offered', []))}")
    elif user_type == "entrepreneur":
        context_lines.append(f"- Business Type: {user_profile.get('business_type', '')}")
        context_lines.append(f"- Revenue Stage: {user_profile.get('revenue_stage', '')}")
        context_lines.append(f"- Business Goal: {user_profile.get('business_goal', '')}")
    elif user_type == "creator":
        context_lines.append(f"- Platform: {user_profile.get('creator_platform', '')}")
        context_lines.append(f"- Content Niche: {user_profile.get('content_niche', '')}")
        context_lines.append(f"- Audience Size: {user_profile.get('audience_size', '')}")
    elif user_type == "exam_aspirant":
        context_lines.append(f"- Exam Type: {user_profile.get('exam_type', '').upper()}")
        context_lines.append(f"- Weak Subjects: {', '.join(user_profile.get('weak_subjects', []))}")

    context = "\n".join(context_lines)

    prompt = f"""
You are GrowthOS AI. Recommend exactly 4 skills this specific user MUST master.

User Profile:
- User Type: {user_type}
- 12-Month Goal: {user_profile.get('twelve_month_goal', '')}
- Interests: {', '.join(user_profile.get('interests', []))}
{context}

For each skill include:
- A real working URL where they can START learning this skill TODAY
- The best free platform for this skill
- A short 3-step learning path

Platform guidelines by skill type:
- Programming/CS skills → use freeCodeCamp, CS50 Harvard, LeetCode, The Odin Project, roadmap.sh
- Data/ML skills → use Kaggle Learn, fast.ai, Google ML Crash Course
- Design skills → use Figma tutorials, Canva Design School, YouTube
- Business/Marketing → use HubSpot Academy, Google Digital Garage, Coursera
- Exam preparation → use PW (PhysicsWallah) for JEE/NEET, Unacademy, BYJU's
- Creator skills → use YouTube Creator Academy, HubSpot Blog, Skillshare
- General → use Coursera, YouTube, Udemy

ONLY use URLs that definitely exist. Prefer free resources.

Return JSON array ONLY (no markdown):
[
  {{
    "id": "s1",
    "name": "Exact Skill Name",
    "emoji": "single emoji",
    "level": "Not started | Beginner | Intermediate | Advanced",
    "relevance_score": 97,
    "why_relevant": "One specific sentence linking this skill to their exact goal",
    "resource_url": "https://exact-working-url.com/course-or-path",
    "platform": "Platform name e.g. freeCodeCamp",
    "learn_path": ["Step 1 specific action", "Step 2 specific action", "Step 3 specific action"]
  }}
]
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 12})
        raw = response.text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1:
            raw = raw[start:end+1]
        return json.loads(raw)
    except Exception as e:
        print(f"Skill recommendation failed: {e}")
        raise e

# ── 5. Generate Opportunities ─────────────────────────────────────────────────
def generate_opportunities(user_profile: dict) -> list:
    user_type = user_profile.get("user_type", "student")

    context_lines = []
    if user_type == "student":
        context_lines.append(f"- Field of Study: {user_profile.get('field_of_study', '')}")
        context_lines.append(f"- Career Goal: {user_profile.get('career_goal', '')}")
    elif user_type == "freelancer":
        context_lines.append(f"- Primary Skill: {user_profile.get('primary_skill', '')}")
        context_lines.append(f"- Services: {', '.join(user_profile.get('services_offered', []))}")
    elif user_type == "entrepreneur":
        context_lines.append(f"- Business Type: {user_profile.get('business_type', '')}")
        context_lines.append(f"- Revenue Stage: {user_profile.get('revenue_stage', '')}")
        context_lines.append(f"- Business Goal: {user_profile.get('business_goal', '')}")
    elif user_type == "creator":
        context_lines.append(f"- Platform: {user_profile.get('creator_platform', '')}")
        context_lines.append(f"- Niche: {user_profile.get('content_niche', '')}")
        context_lines.append(f"- Audience: {user_profile.get('audience_size', '')}")
    elif user_type == "exam_aspirant":
        context_lines.append(f"- Exam: {user_profile.get('exam_type', '').upper()}")
        context_lines.append(f"- Attempt Year: {user_profile.get('attempt_year', '')}")

    context = "\n".join(context_lines)

    prompt = f"""
You are GrowthOS AI. Generate exactly 3 specific opportunities for this user with real actionable links.

User Profile:
- User Type: {user_type}
- 12-Month Goal: {user_profile.get('twelve_month_goal', '')}
- Primary Goal: {user_profile.get('primary_goal', '')}
- Country: {user_profile.get('country', 'India')}
{context}

For each opportunity include a REAL working URL where they can take action immediately.

URL guidelines by user type:
- CS student internship → https://internshala.com or https://linkedin.com/jobs
- CS student projects → https://github.com or https://www.frontendmentor.io
- CS student hackathon → https://devfolio.co or https://unstop.com
- JEE aspirant mock test → https://www.pw.live or https://www.allen.ac.in
- NEET aspirant mock test → https://www.pw.live/neet or https://www.aakash.ac.in
- UPSC aspirant → https://www.insightsonindia.com or https://forumias.com
- CAT aspirant → https://www.2iim.com or https://testfunda.com
- Freelancer Upwork → https://www.upwork.com/nx/find-work/
- Freelancer Fiverr → https://www.fiverr.com/seller_onboarding
- Freelancer portfolio → https://www.behance.net or https://dribbble.com
- Entrepreneur landing page → https://carrd.co or https://webflow.com
- Entrepreneur ads → https://www.facebook.com/business/ads
- Creator YouTube → https://studio.youtube.com
- Creator Instagram → https://www.instagram.com/creator
- Creator products → https://gumroad.com or https://stan.store

Return JSON array ONLY (no markdown):
[
  {{
    "id": "o1",
    "title": "Specific opportunity title",
    "description": "2 sentences why this is perfect for them right now",
    "type": "event | project | income | network | learning",
    "emoji": "single emoji",
    "action_label": "CTA max 3 words",
    "urgency": "now | this_week | this_month",
    "action_url": "https://real-working-url.com",
    "platform": "Platform name",
    "steps": ["First thing to do", "Second thing", "Third thing"]
  }}
]
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 12})
        raw = response.text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1:
            raw = raw[start:end+1]
        return json.loads(raw)
    except Exception as e:
        print(f"Opportunity generation failed: {e}")
        return []
# ── 6. Ask AI (freeform chat) ─────────────────────────────────────────────────
def ask_ai(message: str, user_profile: dict) -> str:
    """Let the user ask the AI anything about their growth."""
    prompt = f"""
You are GrowthOS AI — a focused, intelligent growth coach.

User Profile: {json.dumps(user_profile, indent=2)}

User Question: {message}

Answer in 2-4 sentences. Be direct, specific, and actionable.
Plain text only.
"""
    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 15})
        return response.text.strip()
    except Exception as e:
        return f"I'm sorry, I'm having trouble connecting right now. Please try again in a moment. (Error: {e})"


      #career graph
def generate_career_graph(profile: dict):
    """
    Generate the INITIAL level of the career graph (Root + Roles).
    This is kept light to ensure fast response times.
    """
    prompt = f"""
Create a career path starting point for the following user:
{json.dumps(profile, indent=2)}

Generate exactly 5 career roles (job titles) that align with their goals and interests.

Return ONLY a JSON object with this exact structure:
{{
 "nodes": [
   {{"id": "careers", "label": "Careers", "type": "root"}},
   {{"id": "job_1", "label": "Job Title 1", "type": "job"}},
   {{"id": "job_2", "label": "Job Title 2", "type": "job"}},
   {{"id": "job_3", "label": "Job Title 3", "type": "job"}},
   {{"id": "job_4", "label": "Job Title 4", "type": "job"}},
   {{"id": "job_5", "label": "Job Title 5", "type": "job"}}
 ],
 "edges": [
   {{"source": "careers", "target": "job_1"}},
   {{"source": "careers", "target": "job_2"}},
   {{"source": "careers", "target": "job_3"}},
   {{"source": "careers", "target": "job_4"}},
   {{"source": "careers", "target": "job_5"}}
 ]
}}

Rules:
- ids must be lowercase_with_underscores.
- type for jobs MUST be "job".
- Return ONLY JSON.
"""

    model = _get_model()
    try:
        response = model.generate_content(prompt, request_options={"timeout": 15})
        return _safe_json(response.text)
    except Exception as e:
        print(f"Error generating initial career graph: {e}")
        # Fallback to a very basic graph if AI fails
        return {
            "nodes": [{"id": "careers", "label": "Careers", "type": "root"}],
            "edges": []
        }

# ── 8. Generate_career_jobs ─────────────────────────────────────────────────
def generate_career_jobs(profile):

    prompt = f"""
Based on the following user profile, generate 5 career roles that are most relevant to their background and goals.

User Profile:
{json.dumps(profile, indent=2)}

Return JSON in EXACT format:
{{
 "nodes":[
   {{"id":"job_id","label":"Job Title","type":"job"}}
 ],
 "edges":[
   {{"source":"careers","target":"job_id"}}
 ]
}}
"""

    model = _get_model()
    try:
        res = model.generate_content(prompt, request_options={"timeout": 12})
        return _safe_json(res.text)
    except Exception as e:
        print(f"Job generation failed: {e}")
        return {"nodes":[], "edges":[]}

# ── 9. Generate_job_skills ─────────────────────────────────────────────────
def generate_job_skills(job):

    prompt = f"""
Identify 5 essential skills required to become a successful "{job}".
Consider the current market trends of 2026.

Return JSON in EXACT format:
{{
 "nodes":[
   {{"id":"skill_id","label":"Skill Name","type":"skill"}}
 ],
 "edges":[
   {{"source":"{job}","target":"skill_id"}}
 ]
}}
"""

    model = _get_model()
    try:
        res = model.generate_content(prompt, request_options={"timeout": 12})
        return _safe_json(res.text)
    except Exception as e:
        print(f"Skill generation failed: {e}")
        return {"nodes":[], "edges":[]}

# ── 10. Generate_skill_subskills ───────────────────────────────────────────
def generate_skill_subskills(skill):

    prompt = f"""
Break down the skill "{skill}" into 4 specific, actionable subskills or topics that a learner should focus on.

Return JSON in EXACT format:
{{
 "nodes":[
   {{"id":"subskill_id","label":"Subskill Name","type":"subskill"}}
 ],
 "edges":[
   {{"source":"{skill}","target":"subskill_id"}}
 ]
}}
"""

    model = _get_model()
    try:
        res = model.generate_content(prompt, request_options={"timeout": 12})
        return _safe_json(res.text)
    except Exception as e:
        print(f"Subskill generation failed: {e}")
        return {"nodes":[], "edges":[]}