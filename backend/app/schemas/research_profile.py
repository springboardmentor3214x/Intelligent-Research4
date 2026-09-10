from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# --- Profile Base Schemas ---
class ResearchProfileBase(BaseModel):
    research_domain: str = Field(..., min_length=1, max_length=150)
    research_interests: str | None = None


class ResearchProfileCreate(ResearchProfileBase):
    organization: str | None = Field(default=None, max_length=150)
    department: str | None = Field(default=None, max_length=150)
    designation: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    phone_number: str | None = Field(default=None, max_length=20)


class ResearchProfileUpdate(BaseModel):
    research_domain: str | None = Field(default=None, min_length=1, max_length=150)
    research_interests: str | None = None
    name: str | None = Field(default=None, min_length=1, max_length=100)
    organization: str | None = Field(default=None, max_length=150)
    department: str | None = Field(default=None, max_length=150)
    designation: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    phone_number: str | None = Field(default=None, max_length=20)


# --- Tag / Reference Schemas (Areas, Keywords, Technology Areas) ---
class ResearchAreaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: str | None = None


class ResearchAreaResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class KeywordCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class KeywordResponse(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class TechnologyAreaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)


class TechnologyAreaResponse(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


# --- Publication Schemas ---
class PublicationBase(BaseModel):
    title: str = Field(..., min_length=1)
    authors: str = Field(..., min_length=1)
    publication_date: date | None = None
    journal_or_conference: str | None = Field(default=None, max_length=255)
    publication_type: str | None = Field(default=None, max_length=100)
    research_domain: str | None = Field(default=None, max_length=150)
    keywords: str | None = None
    doi: str | None = Field(default=None, max_length=255)
    publication_link: str | None = None


class PublicationCreate(PublicationBase):
    pass


class PublicationUpdate(BaseModel):
    title: str | None = None
    authors: str | None = None
    publication_date: date | None = None
    journal_or_conference: str | None = None
    publication_type: str | None = None
    research_domain: str | None = None
    keywords: str | None = None
    doi: str | None = None
    publication_link: str | None = None


class PublicationResponse(PublicationBase):
    id: UUID
    research_profile_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Patent Schemas ---
class PatentBase(BaseModel):
    patent_title: str = Field(..., min_length=1)
    patent_number: str | None = Field(default=None, max_length=100)
    inventor: str = Field(..., min_length=1)
    filing_date: date | None = None
    publication_date: date | None = None
    patent_status: str | None = Field(default=None, max_length=100)
    patent_domain: str | None = Field(default=None, max_length=150)
    patent_link: str | None = None


class PatentCreate(PatentBase):
    pass


class PatentUpdate(BaseModel):
    patent_title: str | None = None
    patent_number: str | None = None
    inventor: str | None = None
    filing_date: date | None = None
    publication_date: date | None = None
    patent_status: str | None = None
    patent_domain: str | None = None
    patent_link: str | None = None


class PatentResponse(PatentBase):
    id: UUID
    research_profile_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Combined Profile Response ---
class ResearchProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    email: str
    role: str
    organization: str | None = None
    department: str | None = None
    designation: str | None = None
    country: str | None = None
    phone_number: str | None = None
    research_domain: str
    research_interests: str | None = None
    research_areas: list[ResearchAreaResponse] = []
    keywords: list[KeywordResponse] = []
    technology_areas: list[TechnologyAreaResponse] = []
    publications: list[PublicationResponse] = []
    patents: list[PatentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
