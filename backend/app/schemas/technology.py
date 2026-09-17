from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field


class TechnologyBase(BaseModel):
    technology_name: str
    description: Optional[str] = None
    technology_domain: Optional[str] = None


class TechnologyResponse(TechnologyBase):
    id: UUID
    research_paper_count: int = 0
    citation_count: int = 0
    patent_count: int = 0
    funding_opportunity_count: int = 0
    research_growth_rate: float = 0.0
    patent_growth_rate: float = 0.0
    funding_growth_rate: float = 0.0
    emerging_score: Optional[float] = None
    emerging_status: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Evidence & Provenance Data Models
# =============================================================================

class EvidencePaperItem(BaseModel):
    id: UUID
    title: str
    authors: Optional[str] = None
    publication_year: Optional[int] = None
    journal_or_conference: Optional[str] = None
    citation_count: Optional[int] = 0
    research_domain: Optional[str] = None
    source: Optional[str] = "Research Intelligence"
    source_id: Optional[str] = None
    match_relevance: Optional[str] = "High"


class EvidencePatentItem(BaseModel):
    id: UUID
    title: str
    assignee: Optional[str] = None
    filing_date: Optional[date] = None
    publication_date: Optional[date] = None
    publication_number: Optional[str] = None
    classification: Optional[str] = None
    technology_domain: Optional[str] = None
    citation_count: Optional[int] = 0
    source: Optional[str] = "Patent Intelligence"
    source_id: Optional[str] = None
    match_relevance: Optional[str] = "High"


class EvidenceFundingItem(BaseModel):
    id: UUID
    title: str
    agency: Optional[str] = None
    open_date: Optional[date] = None
    close_date: Optional[date] = None
    funding_category: Optional[str] = None
    research_area: Optional[str] = None
    funding_amount: Optional[float] = None
    funding_type: Optional[str] = None
    official_link: Optional[str] = None
    source: Optional[str] = "Funding Intelligence"
    source_id: Optional[str] = None
    match_relevance: Optional[str] = "High"


class OrganizationBreakdownItem(BaseModel):
    name: str
    paper_count: int = 0
    patent_count: int = 0
    funding_count: int = 0
    total_activity: int = 0
    years_active: List[int] = []
    domains: List[str] = []


class EvidenceBreakdown(BaseModel):
    research_count: int = 0
    patent_count: int = 0
    funding_count: int = 0
    organization_count: int = 0
    active_years_range: Optional[str] = None
    sources_checked: List[str] = [
        "Research Intelligence (Module 3)",
        "Patent Intelligence (Module 5)",
        "Funding Intelligence (Module 4)",
        "Organization Network",
    ]
    sources_with_data: List[str] = []
    sources_missing_data: List[str] = []


class EvidenceCoverage(BaseModel):
    status: str  # STRONG, PARTIAL, LIMITED, INSUFFICIENT
    explanation: str
    score: float = 0.0  # 0 to 100


class EvidenceSourcesContainer(BaseModel):
    research: List[EvidencePaperItem] = []
    patents: List[EvidencePatentItem] = []
    funding: List[EvidenceFundingItem] = []


# =============================================================================
# Analytical Response Schemas
# =============================================================================

class MaturityEvidence(BaseModel):
    research_papers: int
    patents: int
    distinct_assignees_or_orgs: int
    citations: int
    historical_span_years: int
    earliest_year: Optional[int] = None
    latest_year: Optional[int] = None
    recent_growth_trend: str


class TechnologyMaturityResponse(BaseModel):
    technology_id: UUID
    technology_name: str
    maturity_stage: str  # EARLY, DEVELOPING, ESTABLISHED, MATURE, INSUFFICIENT_DATA
    explanation: str
    evidence: MaturityEvidence
    coverage_level: str  # Comprehensive, Moderate, Sparse, Insufficient


class ReadinessFactors(BaseModel):
    research_activity_score: float = Field(..., ge=0, le=100)
    patent_ip_score: float = Field(..., ge=0, le=100)
    organization_diversity_score: float = Field(..., ge=0, le=100)
    adoption_momentum_score: float = Field(..., ge=0, le=100)


class TechnologyReadinessResponse(BaseModel):
    technology_id: UUID
    technology_name: str
    readiness_score: Optional[float] = None  # None if insufficient data
    score_label: str  # e.g., "High Commercial Readiness", "Moderate Practical Readiness", "Early Exploration", "Insufficient Evidence"
    confidence: str  # High, Medium, Low
    explanation: str
    disclaimer: str = "System-generated analytical readiness estimate based on publication, patent, and organizational indicators, not an official Technology Readiness Level (TRL) certification."
    factors: Optional[ReadinessFactors] = None


class AdoptionYearMetric(BaseModel):
    year: int
    publications: int = 0
    patents: int = 0
    organizations: int = 0
    funding_opportunities: int = 0
    total_activity: int = 0
    yoy_growth_percent: Optional[float] = None
    activity_intensity: Optional[str] = "Low"  # Low, Moderate, High, Peak
    intensity_percentage: Optional[float] = 0.0


class TechnologyAdoptionResponse(BaseModel):
    technology_id: UUID
    technology_name: str
    years: List[int]
    total_publications: int
    total_patents: int
    total_organizations: int
    yearly_metrics: List[AdoptionYearMetric]
    cagr_3yr: Optional[float] = None
    summary: str


class TrendEvidence(BaseModel):
    research_growth: Optional[float] = None
    patent_growth: Optional[float] = None
    organization_growth: Optional[float] = None
    active_years_analyzed: int
    latest_year_activity: int
    previous_year_activity: int


class TechnologyTrendResponse(BaseModel):
    technology_id: UUID
    technology_name: str
    trend: str  # Growing, Stable, Declining, Insufficient Data
    growth_rate: Optional[float] = None
    explanation: str
    evidence: TrendEvidence


class TechnologyFullAnalysisResponse(BaseModel):
    technology_id: Optional[UUID] = None
    technology_name: str
    technology_domain: Optional[str] = None
    description: Optional[str] = None
    maturity: TechnologyMaturityResponse
    readiness: TechnologyReadinessResponse
    adoption: TechnologyAdoptionResponse
    trend: TechnologyTrendResponse
    # Enriched Evidence & Deep Analysis
    evidence: Optional[EvidenceBreakdown] = None
    coverage: Optional[EvidenceCoverage] = None
    sources: Optional[EvidenceSourcesContainer] = None
    organizations: Optional[List[OrganizationBreakdownItem]] = []
    key_insights: Optional[List[str]] = []
    related_technologies: Optional[List[str]] = []
    expanded_concepts: Optional[List[str]] = []


class TechnologyQueryAnalysisResponse(BaseModel):
    query: str
    matched_technology: Optional[str] = None
    technology_id: Optional[UUID] = None
    match_type: str  # "direct", "related", "insufficient"
    match_confidence_note: str
    data_coverage: str  # "Available", "Partial", "Insufficient"
    technology_domain: Optional[str] = None
    description: Optional[str] = None
    maturity: TechnologyMaturityResponse
    readiness: TechnologyReadinessResponse
    adoption: TechnologyAdoptionResponse
    trend: TechnologyTrendResponse
    # Enriched Evidence & Deep Analysis
    evidence: Optional[EvidenceBreakdown] = None
    coverage: Optional[EvidenceCoverage] = None
    sources: Optional[EvidenceSourcesContainer] = None
    organizations: Optional[List[OrganizationBreakdownItem]] = []
    key_insights: Optional[List[str]] = []
    related_technologies: Optional[List[str]] = []
    expanded_concepts: Optional[List[str]] = []
