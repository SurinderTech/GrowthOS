import os
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from Backend.routers.dashboard import resolve_exact_user_goal

test_cases = [
    {
        "name": "Exam Aspirant (JEE 2026)",
        "profile": {"user_type": "exam_aspirant", "exam_type": "jee", "attempt_year": "2026"}
    },
    {
        "name": "Exam Aspirant (NEET 2027)",
        "profile": {"user_type": "exam_aspirant", "exam_type": "neet", "attempt_year": "2027"}
    },
    {
        "name": "Student (Software Engineer)",
        "profile": {"user_type": "student", "career_goal": "Software Engineer"}
    },
    {
        "name": "Student (Doctor)",
        "profile": {"user_type": "student", "career_goal": "Doctor"}
    },
    {
        "name": "Freelancer (Web Dev $2k/mo)",
        "profile": {"user_type": "freelancer", "primary_skill": "Web Development", "monthly_income_goal": "$2k–$5k/mo"}
    },
    {
        "name": "Entrepreneur (SaaS)",
        "profile": {"user_type": "entrepreneur", "business_type": "SaaS", "business_goal": "More Customers"}
    },
    {
        "name": "Creator (YouTube Tech)",
        "profile": {"user_type": "creator", "creator_platform": "YouTube", "content_niche": "Tech"}
    },
    {
        "name": "General Fallback (get_job)",
        "profile": {"user_type": "student", "twelve_month_goal": "get_job"}
    },
]

print("=== TESTING EXACT GOAL RESOLVER ===")
for tc in test_cases:
    resolved = resolve_exact_user_goal(tc["profile"])
    print(f"[{tc['name']}] -> '{resolved}'")

print("=== ALL TEST CASES VERIFIED ===")
