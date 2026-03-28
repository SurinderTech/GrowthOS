from pydantic import BaseModel, EmailStr, field_validator
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

    @field_validator("id", mode="before")
    @classmethod
    def coerce_uuid(cls, v):
        if isinstance(v, str):
            return UUID(v)
        return v