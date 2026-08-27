from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ResearchProfileBase(BaseModel):
    research_domain: str = Field(..., min_length=1, max_length=150)
    research_interests: str | None = None


class ResearchProfileCreate(ResearchProfileBase):
    organization: str | None = Field(default=None, max_length=150)
    designation: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    phone_number: str | None = Field(default=None, max_length=20)


class ResearchProfileUpdate(BaseModel):
    research_domain: str | None = Field(default=None, min_length=1, max_length=150)
    research_interests: str | None = None
    name: str | None = Field(default=None, min_length=1, max_length=100)
    organization: str | None = Field(default=None, max_length=150)
    designation: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    phone_number: str | None = Field(default=None, max_length=20)


class ResearchProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    email: str
    role: str
    organization: str | None = None
    designation: str | None = None
    country: str | None = None
    phone_number: str | None = None
    research_domain: str
    research_interests: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
