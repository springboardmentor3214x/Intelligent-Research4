from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PatentBase(BaseModel):
    source: str
    source_id: str
    publication_number: str
    title: str
    abstract: str | None = None
    assignee: str | None = None
    inventors: str | None = None
    filing_date: date | None = None
    publication_date: date | None = None
    classification: str | None = None
    technology_domain: str | None = None
    citation_count: int = 0
    status: str | None = None
    official_link: str | None = None


class PatentCreate(PatentBase):
    pass


class PatentResponse(PatentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatentImportRequest(BaseModel):
    keyword: str
    limit: int = 5