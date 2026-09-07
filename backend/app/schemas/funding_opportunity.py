from datetime import date, datetime
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


class FundingImportResponse(BaseModel):
    source: str
    search: str
    fetched: int
    normalized: int
    inserted: int
    skipped: int
    failed: int
    message: str


class ProfileSummaryContext(BaseModel):
    user_id: UUID
    user_name: str
    organization: str | None = None
    country: str | None = None
    department: str | None = None
    research_domain: str | None = None
    research_areas: list[str] = []
    keywords: list[str] = []
    technology_areas: list[str] = []
    has_profile: bool = True


class FundingMatchBreakdown(BaseModel):
    semantic_similarity: float
    semantic_score: float
    keyword_score: float
    domain_score: float
    eligibility_score: float
    relevance_score: float
    match_level: str
    match_type: str = "Semantic / Profile Match"
    matched_research_areas: list[str] = []
    matched_keywords: list[str] = []
    matched_technology_areas: list[str] = []
    matched_concepts: list[str] = []
    eligibility_status: str
    explanation: str
    explanation_points: list[str] = []


class FundingRecommendationItem(BaseModel):
    funding_opportunity: FundingOpportunityResponse
    match: FundingMatchBreakdown


class FundingRecommendationsResponse(BaseModel):
    total: int
    count: int
    recommendations: list[FundingRecommendationItem]
    profile_used: ProfileSummaryContext | None = None
    message: str | None = None
    search_query: str | None = None


class FundingMatchRequest(BaseModel):
    funding_opportunity_id: UUID


class FundingMatchResponse(BaseModel):
    funding_opportunity: FundingOpportunityResponse
    match: FundingMatchBreakdown
    profile_used: ProfileSummaryContext | None = None


class SourceSyncMetric(BaseModel):
    status: str
    fetched: int = 0
    created: int = 0
    updated: int = 0
    skipped: int = 0
    error: str | None = None


class FundingSyncRequest(BaseModel):
    sources: list[str] | None = None


class FundingSyncResponse(BaseModel):
    sources_processed: int
    records_fetched: int
    records_created: int
    records_updated: int
    duplicates_skipped: int
    source_results: dict[str, SourceSyncMetric]
    errors: list[str] = []
    message: str


class SavedFundingItem(BaseModel):
    id: UUID
    user_id: UUID
    funding_opportunity_id: UUID
    created_at: datetime
    funding_opportunity: FundingOpportunityResponse

    model_config = ConfigDict(from_attributes=True)


class SavedFundingListResponse(BaseModel):
    total: int
    saved_opportunities: list[SavedFundingItem]


class SaveFundingActionResponse(BaseModel):
    message: str
    saved: bool
    funding_opportunity_id: UUID