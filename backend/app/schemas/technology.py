from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Core Yearly Evidence & Provenance
# ---------------------------------------------------------------------------

class YearlyEvidenceItem(BaseModel):
    year: int
    research_count: int = 0
    patent_count: int = 0
    organization_count: int = 0
    application_count: int = 0
    total_activity: int = 0
    yoy_research_growth: Optional[float] = None
    yoy_patent_growth: Optional[float] = None
    yoy_growth_notes: Optional[str] = None


class EvidencePaperItem(BaseModel):
    id: str
    title: str
    source: Optional[str] = "OpenAlex"
    source_record_id: Optional[str] = None
    publication_year: Optional[int] = None
    citation_count: int = 0
    authors: Optional[str] = None
    organization: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    research_domain: Optional[str] = None
    keywords: Optional[str] = None
    matching_method: Optional[str] = "hybrid"


class EvidencePatentItem(BaseModel):
    id: str
    source: Optional[str] = "EPO"
    source_record_id: Optional[str] = None
    publication_number: Optional[str] = None
    patent_number: Optional[str] = None
    title: str
    filing_year: Optional[int] = None
    filing_date: Optional[str] = None
    assignee: Optional[str] = None
    organization: Optional[str] = None
    classification: Optional[str] = None
    technology_domain: Optional[str] = None
    country: Optional[str] = "GLOBAL"
    family_id: Optional[str] = None
    application_number: Optional[str] = None
    url: Optional[str] = None
    citation_count: int = 0
    relevance_score: float = 1.0
    matching_method: Optional[str] = "hybrid"


class EvidenceFundingItem(BaseModel):
    id: str
    source: Optional[str] = "Grants.gov"
    source_record_id: Optional[str] = None
    title: str
    agency: Optional[str] = None
    organization: Optional[str] = None
    funding_category: Optional[str] = None
    open_year: Optional[int] = None
    total_funding: Optional[float] = None
    url: Optional[str] = None
    matching_method: Optional[str] = "hybrid"


class OrganizationBreakdownItem(BaseModel):
    name: str
    patent_count: int = 0
    research_count: int = 0
    funding_count: int = 0
    first_seen_year: Optional[int] = None
    last_seen_year: Optional[int] = None


# ---------------------------------------------------------------------------
# 6 Core Maturity Indicators
# ---------------------------------------------------------------------------

class IndicatorMetric(BaseModel):
    name: str
    weight: float = Field(..., description="Indicator weight between 0.0 and 1.0 (e.g. 0.25)")
    weight_percentage: str = Field(..., description="Formatted weight (e.g. '25%')")
    raw_value: float
    raw_unit: str
    normalized_score: float = Field(..., ge=0, le=100, description="Normalized score 0-100")
    weighted_score: float = Field(..., description="Score contribution = normalized_score * weight")
    level: str = Field(..., description="'High', 'Medium', 'Low', 'Increasing', 'Stable', 'Declining', or 'Insufficient Data'")
    trend_direction: str = Field(..., description="'Increasing', 'Stable', 'Declining', or 'Insufficient Data'")
    interpretation: str
    provenance_note: Optional[str] = None


class WeightedScoreBreakdown(BaseModel):
    research_growth: float = Field(default=0.0, description="Weighted points (max 25.0)")
    patent_growth: float = Field(default=0.0, description="Weighted points (max 25.0)")
    research_activity: float = Field(default=0.0, description="Weighted points (max 15.0)")
    patent_activity: float = Field(default=0.0, description="Weighted points (max 15.0)")
    organization_participation: float = Field(default=0.0, description="Weighted points (max 10.0)")
    application_diversity: float = Field(default=0.0, description="Weighted points (max 10.0)")
    total: float = Field(default=0.0, ge=0, le=100, description="Sum of all weighted scores (0-100)")


# ---------------------------------------------------------------------------
# Stage Classification & Explainability
# ---------------------------------------------------------------------------

class StageClassification(BaseModel):
    classification: str = Field(..., description="'Emerging', 'Developing', 'Mature', 'Declining', or 'Insufficient Evidence'")
    confidence: str = Field(..., description="'High', 'Moderate', 'Limited', or 'Insufficient'")
    reason: str
    supporting_signals: List[str] = Field(default_factory=list)
    limiting_signals: List[str] = Field(default_factory=list)
    conflicting_signals: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Independent Adoption Analysis
# ---------------------------------------------------------------------------

class AdoptionAnalysis(BaseModel):
    level: str = Field(..., description="'High', 'Moderate', 'Low', or 'Insufficient Evidence'")
    trend: str = Field(..., description="'Increasing', 'Stable', 'Nascent', or 'Insufficient Evidence'")
    status_summary: str
    active_commercial_organizations: List[str] = Field(default_factory=list)
    identified_applications: List[str] = Field(default_factory=list)
    commercial_funding_count: int = 0
    evidence_notes: str


# ---------------------------------------------------------------------------
# Multi-Source Coverage & Provenance Summary
# ---------------------------------------------------------------------------

class SourceBreakdownMetric(BaseModel):
    source_name: str
    source_type: str
    status: str
    records_count: int = 0
    requires_credentials: bool = False
    credentials_configured: bool = True
    error_message: Optional[str] = None


class EvidenceCoverage(BaseModel):
    status: str = Field(..., description="'Strong', 'Partial', 'Limited', or 'Insufficient'")
    historical_span: str = Field(..., description="e.g. '2018–2026' or 'No historical span'")
    total_active_years: int = 0
    total_papers: int = 0
    total_patents: int = 0
    total_organizations: int = 0
    total_applications: int = 0
    total_funding: int = 0
    unique_research_count: int = 0
    unique_patent_count: int = 0
    unique_funding_count: int = 0
    indian_patent_count: int = 0
    global_patent_count: int = 0
    unique_patent_families: int = 0
    duplicates_removed: int = 0
    source_coverage: Dict[str, int] = Field(default_factory=dict)
    source_statuses: List[SourceBreakdownMetric] = Field(default_factory=list)
    explanation: str


# ---------------------------------------------------------------------------
# Full Technology Analysis Response
# ---------------------------------------------------------------------------

class TechnologyAnalysisResponse(BaseModel):
    technology: str
    normalized_query: str
    technology_id: Optional[str] = None
    description: Optional[str] = None
    technology_domain: Optional[str] = None

    # Multi-Year Trajectory
    yearly_evidence: List[YearlyEvidenceItem] = Field(default_factory=list)

    # Domain Breakdown
    research: Dict[str, Any] = Field(default_factory=dict)
    patents: Dict[str, Any] = Field(default_factory=dict)
    funding: Dict[str, Any] = Field(default_factory=dict)
    organizations: Dict[str, Any] = Field(default_factory=dict)
    applications: Dict[str, Any] = Field(default_factory=dict)

    # Independent Adoption
    adoption: AdoptionAnalysis

    # 6 Core Indicators
    indicators: Dict[str, IndicatorMetric] = Field(default_factory=dict)

    # Weighted Score
    weighted_score: WeightedScoreBreakdown

    # Stage Classification
    stage: StageClassification

    # Evidence Coverage & Source Provenance
    coverage: EvidenceCoverage

    # Raw Provenance Records
    evidence_records: Dict[str, List[Any]] = Field(default_factory=dict)



# ---------------------------------------------------------------------------
# Backward Compatible Schemas for Existing API Routes
# ---------------------------------------------------------------------------

class TechnologyResponse(BaseModel):
    id: UUID
    technology_name: str
    description: Optional[str] = None
    technology_domain: Optional[str] = None
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

    model_config = ConfigDict(from_attributes=True)


class TechnologyActivityItem(BaseModel):
    year: int
    research_paper_count: int = 0
    patent_count: int = 0
    citation_count: int = 0
    organization_count: int = 0
    application_diversity: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class TechnologyActivityResponse(BaseModel):
    technology_id: UUID
    technology_name: str
    activity: List[TechnologyActivityItem] = Field(default_factory=list)


class TechnologySummaryItem(BaseModel):
    technology_id: UUID
    technology_name: str
    activity: List[TechnologyActivityItem] = Field(default_factory=list)


class TechnologyActivitySummaryResponse(BaseModel):
    technologies: List[TechnologySummaryItem] = Field(default_factory=list)
    technology_count: int = 0


# ---------------------------------------------------------------------------
# 3D Technology Landscape Schemas
# ---------------------------------------------------------------------------

class TechnologyLandscapeNode(BaseModel):
    id: str
    technology: str
    domain: Optional[str] = None
    research_activity: int = 0
    patent_activity: int = 0
    organization_participation: int = 0
    citation_count: int = 0
    maturity_stage: str
    trend: str
    emerging_score: float = 0.0
    evidence_count: int = 0
    cluster_id: str
    cluster_name: str
    cluster_color: str
    normalized_coordinates: Dict[str, float] = Field(default_factory=dict)
    related_technologies: List[str] = Field(default_factory=list)
    active_commercial_organizations: List[str] = Field(default_factory=list)
    adoption_level: str = "Insufficient Evidence"


class TechnologyLandscapeCluster(BaseModel):
    cluster_id: str
    cluster_name: str
    color: str
    technology_count: int = 0
    technologies: List[str] = Field(default_factory=list)


class TechnologyLandscapeResponse(BaseModel):
    total_technologies: int
    dimensions: Dict[str, str] = Field(
        default_factory=lambda: {
            "x": "Research Activity",
            "y": "Patent Activity",
            "z": "Organization Participation",
        }
    )
    max_bounds: Dict[str, float] = Field(default_factory=dict)
    nodes: List[TechnologyLandscapeNode] = Field(default_factory=list)
    clusters: List[TechnologyLandscapeCluster] = Field(default_factory=list)
    all_domains: List[str] = Field(default_factory=list)
    all_stages: List[str] = Field(default_factory=list)

