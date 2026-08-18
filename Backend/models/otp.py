# Backend/models/otp.py

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timedelta
import uuid
import random

from Backend.db.base import Base


class UserOTP(Base):
    __tablename__ = "user_otps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, index=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    otp_code = Column(String(10), nullable=False)
    purpose = Column(String(50), default="password_reset")  # "password_reset", "2fa_login"
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    @classmethod
    def generate_otp_code(cls, length: int = 6) -> str:
        return "".join([str(random.randint(0, 9)) for _ in range(length)])

    def is_valid(self) -> bool:
        return not self.is_used and datetime.utcnow() <= self.expires_at
