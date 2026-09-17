from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FundingOpportunityBase(BaseModel):
    source: str
    source_id: str
    opportunity_number: str | None = None
    title: str
    agency: str | None = None
    description: str | None = None
    funding_type: str | None = None
    funding_amount: float | None = None
    open_date: date | None = None
    close_date: date | None = None
    eligibility: str | None = None
    funding_category: str | None = None
    research_area: str | None = None
    country: str | None = None
    status: str | None = None
    official_link: str | None = None


class FundingOpportunityCreate(FundingOpportunityBase):
    pass


class FundingOpportunityResponse(FundingOpportunityBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FundingOpportunityListResponse(BaseModel):
    total: int
    opportunities: list[FundingOpportunityResponse]


class FundingImportRequest(BaseModel):
    search: str = Field(min_length=1)
    per_page: int = Field(default=10, ge=1, le=100)


class FundingSearchRequest(BaseModel):
    query: str = Field(default="", description="Search topic or research area")
    limit: int = Field(default=20, ge=1, le=100)
    min_score: float = Field(default=0.0, ge=0.0, le=100.0)
    funding_type: str | None = None
    research_area: str | None = None
    agency: str | None = None


class FundingRecommendationResponse(BaseModel):
    total: int
    recommendations: list[dict[str, Any]]
    profile_used: dict[str, Any] | None = None
    message: str | None = None


class IdeaAnalysisRequest(BaseModel):
    idea: str = Field(min_length=10, description="Startup or research idea description")
    funding_type_filter: str | None = None


class ResearchOverlapItem(BaseModel):
    id: str
    title: str
    authors: str | None = None
    publication_date: str | None = None
    journal_or_conference: str | None = None
    similarity_score: float
    similarity_percentage: float
    domain: str | None = None
    shared_concepts: list[str] = []
    doi: str | None = None


class PatentOverlapItem(BaseModel):
    id: str
    title: str
    patent_number: str | None = None
    assignee: str | None = None
    publication_date: str | None = None
    similarity_score: float
    similarity_percentage: float
    classification: str | None = None
    shared_concepts: list[str] = []


class ScoringFactor(BaseModel):
    name: str
    score: float
    max_score: float
    weight: float
    details: str


class FundingSuitability(BaseModel):
    suitability_score: float
    readiness_level: str
    factors: list[ScoringFactor]
    disclaimer: str


class IdeaAnalysisResponse(BaseModel):
    idea_summary: str
    domain: str
    research_areas: list[str]
    technologies: list[str]
    keywords: list[str]
    application_areas: list[str]
    potential_funding_categories: list[str]
    funding_suitability: FundingSuitability
    matching_funding: list[dict[str, Any]]
    research_landscape: dict[str, Any]
    patent_landscape: dict[str, Any]
    potential_risks: list[str]
    improvement_suggestions: list[str]
    recommended_next_steps: list[str]
    ai_provider: str