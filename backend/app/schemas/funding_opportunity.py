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