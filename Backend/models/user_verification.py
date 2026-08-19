from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import secrets

from Backend.db.base import Base

class UserVerificationToken(Base):
    __tablename__ = "user_verification_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(128), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)

    @classmethod
    def generate_token(cls) -> str:
        return secrets.token_urlsafe(32)

    def is_valid(self) -> bool:
        return not self.is_used and self.expires_at > datetime.utcnow()
