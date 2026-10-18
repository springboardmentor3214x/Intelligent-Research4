from datetime import date, datetime
from typing import Any
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
    is_citation_verified: bool = False
    citation_source: str | None = None
    publication_link: str | None = None
    open_access_url: str | None = None
    is_open_access: bool = False
    publisher: str | None = None
    document_type: str | None = "publication"
    is_preprint: bool = False
    source_metadata: dict[str, Any] | None = None


class ResearchPaperCreate(ResearchPaperBase):
    pass


class ResearchPaperResponse(ResearchPaperBase):
    id: UUID
    provenance_sources: list[str] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResearchPaperListResponse(BaseModel):
    total: int
    papers: list[ResearchPaperResponse]


class ResearchPaperImportRequest(BaseModel):
    search: str = Field(min_length=1)
    target_count: int = Field(default=50, ge=1, le=1000)
    per_page: int = Field(default=50, ge=1, le=100)
    sources: list[str] | None = Field(
        default=[
            "OpenAlex",
            "Crossref",
            "Semantic Scholar",
            "CORE",
            "arXiv",
            "Europe PMC",
            "PubMed",
            "DOAJ",
            "OpenAIRE",
            "Zenodo",
            "bioRxiv",
            "medRxiv",
            "BASE",
        ]
    )
    year_from: int | None = None
    year_to: int | None = None
    research_domain: str | None = None


class ResearchBatchCorpusImportRequest(BaseModel):
    topics: list[str] | None = None
    target_per_topic: int = Field(default=100, ge=10, le=500)
    sources: list[str] | None = Field(
        default=[
            "OpenAlex",
            "Crossref",
            "Semantic Scholar",
            "CORE",
            "arXiv",
            "Europe PMC",
            "PubMed",
            "DOAJ",
            "OpenAIRE",
            "Zenodo",
            "bioRxiv",
            "medRxiv",
            "BASE",
        ]
    )


class ResearchPaperSearchResponse(BaseModel):
    total: int
    skip: int = 0
    limit: int = 50
    page: int = 1
    page_size: int = 50
    total_pages: int = 1
    sources: dict[str, int] = {}
    sources_status: dict[str, str] = {
        "OpenAlex": "available",
        "Crossref": "available",
        "Semantic Scholar": "available",
        "CORE": "available",
        "arXiv": "available",
        "Europe PMC": "available",
        "PubMed": "available",
        "DOAJ": "available",
        "OpenAIRE": "available",
        "Zenodo": "available",
        "bioRxiv": "available",
        "medRxiv": "available",
        "BASE": "available",
    }
    is_live_augmented: bool = False
    discovery_triggered: bool = False
    discovery_status: str | None = None
    papers: list[ResearchPaperResponse]