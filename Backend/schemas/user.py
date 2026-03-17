from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID



class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str | None
    image: str | None
    onboarding_completed: bool = False

    model_config = {
        "from_attributes": True
    }

    # ── ADD THIS so id serializes as string not UUID object ──
    def model_post_init(self, __context):
        object.__setattr__(self, 'id', str(self.id))