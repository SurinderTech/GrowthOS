from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from Backend.db.base import Base
from sqlalchemy.orm import relationship
from Backend.models.growth_plan import UserGrowthPlan


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    provider = Column(String, default="credentials")
    provider_id = Column(String, nullable=True)
    image = Column(String, nullable=True)

    is_active = Column(Boolean, default=True)
    is_2fa_enabled = Column(Boolean, default=False)
    two_factor_method = Column(String(20), default="email")  # "email", "phone"

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    bio   = Column(String(500), nullable=True)
    phone = Column(String(50),  nullable=True)
    phone_verified = Column(Boolean, default=False, nullable=False)
    phone_verified_at = Column(DateTime, nullable=True)

    onboarding = relationship("UserOnboarding", back_populates="user", uselist=False)


    growth_plans = relationship(
        "GrowthPlan", back_populates="user", cascade="all, delete-orphan"
    )

    tasks = relationship(
        "DailyTask", back_populates="user", cascade="all, delete-orphan"
    )

    insights = relationship(
        "AIInsight", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def onboarding_completed(self) -> bool:
        return self.onboarding.onboarding_completed if self.onboarding else False
# Practice Arena
    practice_sessions = relationship("UserPracticeSession", back_populates="user", cascade="all, delete-orphan")
    streak            = relationship("UserStreak",          back_populates="user", uselist=False, cascade="all, delete-orphan")
    skill_progress    = relationship("UserSkillProgress",   back_populates="user", cascade="all, delete-orphan")
    user_growth_plans = relationship(
        "UserGrowthPlan",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    