"""
models/onboarding.py
SQLAlchemy ORM model for user onboarding data.
"""

from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import Column, JSON
from sqlalchemy.sql import func
from db.base import Base
import uuid



class UserOnboarding(Base):
    __tablename__ = "user_onboarding"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    # Step 1 — User type
    user_type = Column(String(50), nullable=True)
    # student | freelancer | entrepreneur | creator | exam_aspirant | self_growth

    # Step 2 — Basic profile
    full_name = Column(String(200), nullable=True)
    age_group = Column(String(20), nullable=True)
    # 13-17 | 18-24 | 25-34 | 35-44 | 45+
    country = Column(String(100), nullable=True)
    primary_goal = Column(String(100), nullable=True)
    # improve_discipline | learn_skills | build_projects | grow_career |
    # prepare_exams | build_business | financial_independence

    # Step 3 — Time commitment
    daily_time = Column(String(20), nullable=True)
    # 30min | 1hour | 2-3hours | 4+hours

    # Step 4 — Interests (multi-select stored as JSON array)
    interests = Column(JSON, default=list)
    # ["programming", "ai_tech", "business", "marketing", "design",
    #  "personal_growth", "productivity", "finance", "content_creation", "competitive_exams"]

    # Step 5 — Category-specific fields
    # Student
    education_level = Column(String(50), nullable=True)       # school | college
    field_of_study = Column(String(100), nullable=True)
    career_goal = Column(String(100), nullable=True)
    career_graph = Column(JSON, nullable=True)

    # Freelancer
    primary_skill = Column(String(100), nullable=True)
    experience_level = Column(String(50), nullable=True)      # beginner | intermediate | expert
    monthly_income_goal = Column(String(50), nullable=True)
    freelance_platforms = Column(JSON, default=list)          # ["upwork","fiverr","toptal",...]
    services_offered = Column(JSON, default=list)

    # Business Owner
    business_type = Column(String(100), nullable=True)
    team_size = Column(String(50), nullable=True)             # solo | 2-5 | 6-20 | 20+
    revenue_stage = Column(String(50), nullable=True)         # pre_revenue | early | growing | scaling
    business_challenge = Column(String(100), nullable=True)
    business_goal = Column(String(100), nullable=True)

    # Creator
    creator_platform = Column(String(50), nullable=True)      # youtube | instagram | twitter | linkedin | multiple
    content_niche = Column(String(100), nullable=True)
    audience_size = Column(String(50), nullable=True)         # 0-1k | 1k-10k | 10k-100k | 100k+
    creator_growth_goal = Column(String(100), nullable=True)

    # Exam Aspirant
    exam_type = Column(String(50), nullable=True)             # jee | neet | upsc | other
    attempt_year = Column(String(10), nullable=True)
    study_hours_daily = Column(String(20), nullable=True)
    weak_subjects = Column(JSON, default=list)

    # Step 6 — Productivity style
    productivity_style = Column(String(50), nullable=True)
    # deep_focus | short_bursts | structured | flexible

    # Step 7 — 12-month goal
    twelve_month_goal = Column(String(100), nullable=True)
    # get_job | crack_exam | earn_online | build_startup | grow_audience | become_disciplined

    # Meta
    onboarding_completed = Column(Boolean, default=False)
    current_step = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship back to user
    user = relationship("User", back_populates="onboarding")

    generated_skills = Column(JSON, nullable=True)
    generated_opportunities = Column(JSON, nullable=True)
    notification_settings = Column(JSON, nullable=True)
    appearance_settings   = Column(JSON, nullable=True)
    privacy_settings      = Column(JSON, nullable=True)