from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    name: str
    email: str
    role: str
    phone_number: str | None = None
    organization: str | None = None
    designation: str | None = None
    country: str | None = None
    research_domain: str | None = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProfileDomainUpdate(BaseModel):
    research_domain: str


class ResearchAreaCreate(BaseModel):
    name: str


class ResearchAreaResponse(BaseModel):
    id: UUID
    name: str
    user_id: UUID

    model_config = ConfigDict(from_attributes=True)


class ResearchKeywordCreate(BaseModel):
    keyword: str


class ResearchKeywordResponse(BaseModel):
    id: UUID
    keyword: str
    user_id: UUID

    model_config = ConfigDict(from_attributes=True)