from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    role: str = Field(default="researcher", min_length=3, max_length=30)
    phone_number: str | None = Field(default=None, max_length=20)
    organization: str | None = Field(default=None, max_length=150)
    department: str | None = Field(default=None, max_length=150)
    designation: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    research_domain: str | None = Field(default=None, max_length=150)

    @field_validator("name", "role", "phone_number", "organization", "department", "designation", "country", "research_domain", mode="before")
    @classmethod
    def reject_blank_values(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
        return value


class UserCreate(UserBase):
    password: str = Field(min_length=12, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_strong_password(cls, value: str) -> str:
        required = (any(char.islower() for char in value), any(char.isupper() for char in value), any(char.isdigit() for char in value), any(not char.isalnum() for char in value))
        if not all(required):
            raise ValueError("Password must include uppercase, lowercase, number, and special character")
        return value


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    phone_number: str | None = Field(default=None, min_length=7, max_length=20)
    organization: str | None = Field(default=None, min_length=2, max_length=150)
    department: str | None = Field(default=None, min_length=2, max_length=150)
    designation: str | None = Field(default=None, min_length=2, max_length=100)
    country: str | None = Field(default=None, min_length=2, max_length=100)
    research_domain: str | None = Field(default=None, min_length=2, max_length=150)

    @field_validator("name", "phone_number", "organization", "department", "designation", "country", "research_domain", mode="before")
    @classmethod
    def reject_blank_updates(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip() if isinstance(value, str) else value
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class UserResponse(UserBase):
    # OAuth-created accounts complete these fields later in the profile screen.
    phone_number: str | None = None
    organization: str | None = None
    department: str | None = None
    designation: str | None = None
    country: str | None = None
    research_domain: str | None = None
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
