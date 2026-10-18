from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class FactorDetail(BaseModel):
    name: str = Field(..., description="Factor name (e.g. 'Research Novelty')")
    key: str = Field(..., description="Factor key identifier")
    weight: float = Field(..., description="Mandatory factor weight (0.30, 0.20, 0.15, 0.20, 0.15)")
    raw_metric: Optional[str] = Field(None, description="Human readable description of underlying empirical metric")
    normalized_score: Optional[float] = Field(None, ge=0, le=100, description="Normalized score 0-100 or None if insufficient/unavailable")
    weighted_contribution: Optional[float] = Field(None, description="Score * Weight (or None if N/A)")
    status: str = Field(..., description="'available', 'true_zero', 'insufficient_evidence', 'source_unavailable', 'no_match_found'")
    confidence: str = Field("Moderate", description="'High', 'Moderate', 'Limited', 'Insufficient'")
    evidence_summary: str = Field(..., description="Factual summary of empirical evidence")
    data_source: str = Field(..., description="Contributing module or data sources (e.g. 'Module 3 Research Intelligence')")
    supporting_signals: List[str] = Field(default_factory=list)
    limiting_signals: List[str] = Field(default_factory=list)
    last_updated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class EvidencePaperRecord(BaseModel):
    id: str
    title: str
    authors: Optional[str] = None
    year: Optional[int] = None
    domain: Optional[str] = None
    citation_count: int = 0
    doi: Optional[str] = None
    source: str = "Module 3 Research DB"


class EvidencePatentRecord(BaseModel):
    id: str
    title: str
    patent_number: Optional[str] = None
    assignee: Optional[str] = None
    year: Optional[int] = None
    classification: Optional[str] = None
    country: str = "GLOBAL"
    source: str = "Module 5 Patent DB"


class EvidenceFundingRecord(BaseModel):
    id: str
    title: str
    agency: Optional[str] = None
    funding_type: Optional[str] = None
    amount: Optional[Union[float, str]] = None
    deadline: Optional[str] = None
    relevance_score: float = 0.0
    source: str = "Funding Intelligence"


class OpportunitySignal(BaseModel):
    type: str = Field(..., description="'Research Gap', 'Patent Whitespace', 'Funding Program', 'Industry Acceleration', 'Technology Convergence'")
    title: str
    description: str
    confidence: str = "Moderate"
    source_module: str


class IndianInnovationEvidence(BaseModel):
    has_indian_data: bool = False
    patent_count: int = 0
    research_count: int = 0
    funding_opportunity_count: int = 0
    premier_institutes_involved: List[str] = Field(default_factory=list)
    active_grants_summary: str = ""


class ScoreHistoryYear(BaseModel):
    year: int
    research_volume: int
    patent_volume: int
    estimated_score: float


class InnovationScoreResponse(BaseModel):
    technology: str = Field(..., description="Analyzed technology or concept name")
    overall_score: float = Field(..., ge=0, le=100, description="Composite Innovation Score (0-100)")
    adjusted_score: Optional[float] = Field(None, ge=0, le=100, description="Score re-normalized over available factors only")
    available_weight_sum: float = Field(default=1.0, description="Sum of weights of available indicators")
    evidence_coverage: str = Field(..., description="e.g. '5 / 5 factors available'")
    weighted_evidence_coverage: float = Field(100.0, description="Sum of available weights in percent, e.g. 100.0, 55.0")
    coverage_percentage: float = Field(100.0, description="Percentage of available factors (e.g. 100.0, 80.0)")
    strongest_factor: str = Field(..., description="Name of factor with highest relative contribution")
    weakest_factor: str = Field(..., description="Name of factor with lowest relative contribution")
    innovation_level: str = Field(..., description="'Pioneering Innovation', 'High Innovation Potential', 'Moderate Innovation', 'Early / Exploring', 'Provisional / Incomplete Evidence', 'Insufficient Evidence'")
    
    # 5 Mandatory Factors
    factors: Dict[str, FactorDetail] = Field(..., description="Map containing the 5 mandatory factor details")
    
    # Why This Score (Structured Signals)
    positive_signals: List[str] = Field(default_factory=list)
    limiting_signals: List[str] = Field(default_factory=list)
    conflicting_signals: List[str] = Field(default_factory=list)
    evidence_gaps: List[str] = Field(default_factory=list)
    opportunity_signals: List[OpportunitySignal] = Field(default_factory=list)

    # Granular Evidence Explorer
    evidence_papers: List[EvidencePaperRecord] = Field(default_factory=list)
    evidence_patents: List[EvidencePatentRecord] = Field(default_factory=list)
    evidence_funding: List[EvidenceFundingRecord] = Field(default_factory=list)

    # Indian Innovation Intelligence
    indian_intelligence: Optional[IndianInnovationEvidence] = None

    # Multi-Year Score History
    score_history: List[ScoreHistoryYear] = Field(default_factory=list)

    # Explainability & Transparency
    summary_explanation: str
    detailed_reasoning: List[str] = Field(default_factory=list)
    data_sources_used: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    methodology_version: str = Field(default="v1.0", description="Authoritative scoring methodology version")
    last_analyzed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class IdeaInnovationAnalysisRequest(BaseModel):
    idea_text: str = Field(..., min_length=5, description="Full research, technology, or startup concept description")
    target_domain: Optional[str] = None


class IdeaInnovationAnalysisResponse(BaseModel):
    idea_summary: str
    extracted_domain: str
    extracted_technologies: List[str]
    extracted_keywords: List[str]
    research_similarity_score: float
    patent_similarity_score: float
    funding_alignment_score: float
    innovation_score: InnovationScoreResponse
    research_gaps: List[str] = Field(default_factory=list)
    potential_differentiation_areas: List[str] = Field(default_factory=list)
    legal_disclaimer: str


class TechnologyComparisonRequest(BaseModel):
    technologies: List[str] = Field(..., min_length=2, max_length=5, description="List of technologies to compare")


class TechnologyComparisonResponse(BaseModel):
    comparison_items: List[InnovationScoreResponse]
    comparison_notes: str


class GrokInnovationBriefRequest(BaseModel):
    technology: str
    include_web_search: bool = False


class GrokInnovationBriefResponse(BaseModel):
    technology: str
    executive_summary: str
    strongest_signals: List[str]
    weakest_signals: List[str]
    research_insights: str
    patent_insights: str
    technology_insights: str
    market_insights: str
    funding_insights: str
    opportunity_signals: List[str]
    research_gaps: List[str]
    potential_differentiation: List[str]
    web_market_context: Optional[str] = None
    web_sources: List[str] = Field(default_factory=list)
    evidence_limitations: List[str]
    confidence: str
    provider: str


class GrokChatRequest(BaseModel):
    technology: str
    question: str
    chat_history: Optional[List[Dict[str, str]]] = Field(default_factory=list)


class GrokChatResponse(BaseModel):
    answer: str
    grounded_evidence_points: List[str]
    confidence: str
    provider: str


class InnovationAssessmentRequest(BaseModel):
    technology: Optional[str] = Field(None, description="Technology name to analyze (e.g. 'Quantum Computing')")
    idea_text: Optional[str] = Field(None, description="Optional research/startup idea text for contextual enrichment")
    entity_id: Optional[str] = Field(None, description="Legacy entity ID parameter for backward compatibility")
