from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ResearchPaperBase(BaseModel):
    source: str
    source_id: str
    title: str
    abstract: str | None = None
    authors: str | None = None
    publication_date: date | None = None
    publication_year: int | None = None
    journal_or_conference: str | None = None
    keywords: str | None = None
    research_domain: str | None = None
    doi: str | None = None
    citation_count: int = 0
    publication_link: str | None = None


class ResearchPaperCreate(ResearchPaperBase):
    pass


class ResearchPaperResponse(ResearchPaperBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResearchPaperListResponse(BaseModel):
    total: int
    papers: list[ResearchPaperResponse]

from pydantic import BaseModel, ConfigDict, Field

class ResearchPaperImportRequest(BaseModel):
    search: str = Field(min_length=1)
    per_page: int = Field(default=10, ge=1, le=100)

class ResearchPaperSearchResponse(BaseModel):
    total: int
    skip: int = 0
    limit: int = 20
    page: int = 1
    page_size: int = 20
    total_pages: int = 1
    sources: dict[str, int] = {}
    papers: list[ResearchPaperResponse]