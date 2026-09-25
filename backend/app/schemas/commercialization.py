from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ===========================================================================
# Evidence Item Models
# ===========================================================================

class EvidencePaperItem(BaseModel):
    id: Optional[str] = None
    title: str
    authors: Optional[str] = None
    year: Optional[int] = None
    domain: Optional[str] = None
    citation_count: int = 0
    relevance: str = "High"
    source: str = "Module 3 Research DB"


class EvidencePatentItem(BaseModel):
    id: Optional[str] = None
    title: str
    patent_number: Optional[str] = None
    assignee: Optional[str] = None
    year: Optional[int] = None
    technology_domain: Optional[str] = None
    classification: Optional[str] = None
    source: str = "Module 5 Patent DB"


class EvidenceFundingItem(BaseModel):
    id: Optional[str] = None
    title: str
    agency: Optional[str] = None
    funding_type: Optional[str] = None
    amount: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None
    relevance_score: float = 0.0
    why_matched: Optional[str] = None
    official_link: Optional[str] = None
    source: str = "Module 4 Funding DB"


class EvidenceTechnologyItem(BaseModel):
    stage: str
    maturity_score: float
    adoption_level: str
    application_domains: List[str] = Field(default_factory=list)
    top_organizations: List[str] = Field(default_factory=list)
    source: str = "Module 6 Technology Intelligence"


# ===========================================================================
# Step 8, 9, 10: Readiness, Gap Analysis, & Patent -> Product Mapping Models
# ===========================================================================

class CommercializationReadinessDimension(BaseModel):
    dimension_name: str = Field(..., description="e.g. Technology Maturity, Research Strength, Patent Activity, etc.")
    status: str = Field(..., description="e.g. Mature, High, Moderate, Developing, Insufficient Evidence")
    status_level: str = Field("high", description="'high' | 'moderate' | 'low' | 'insufficient'")
    evidence: str = Field(..., description="Concrete evidence description from empirical data")
    limitation: Optional[str] = Field(None, description="Identified limitation or data boundary if applicable")


class CommercializationGapAnalysis(BaseModel):
    available_evidence: List[str] = Field(default_factory=list, description="Verified available empirical signals")
    missing_evidence: List[str] = Field(default_factory=list, description="Evidence gaps before commercial scale")
    recommended_next_actions: List[str] = Field(default_factory=list, description="Concrete next steps")


class PatentProductMappingItem(BaseModel):
    patent_number: str = Field(..., description="Patent publication number")
    patent_title: str = Field(..., description="Patent title")
    assignee: str = Field(..., description="Patent owner or assignee")
    technology_capability: str = Field(..., description="Extracted core capability or technical claim")
    application_area: str = Field(..., description="Derived candidate application area")
    potential_product: str = Field(..., description="Derived potential product/service concept")
    target_industry: str = Field(..., description="Target industry sector")
    evidence_note: str = Field("Potential application derived from identified technology evidence.", description="Disclaimer")


class CommercializationEvidenceBundle(BaseModel):
    research_papers: List[EvidencePaperItem] = Field(default_factory=list)
    patents: List[EvidencePatentItem] = Field(default_factory=list)
    funding_opportunities: List[EvidenceFundingItem] = Field(default_factory=list)
    technology_evidence: Optional[EvidenceTechnologyItem] = None
    innovation_score_summary: Optional[Dict[str, Any]] = None
    organizations: List[str] = Field(default_factory=list)
    domains: List[str] = Field(default_factory=list)


# ===========================================================================
# Member 1: Research Commercialization Analysis (Application Areas)
# ===========================================================================

class ApplicationRecommendation(BaseModel):
    application_name: str = Field(..., description="Candidate application area name")
    relevance: str = Field(..., description="Relevance level: High / Medium / Low")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Semantic / empirical relevance score 0.0 to 1.0")
    why_relevant: str = Field(..., description="Evidence-grounded rationale for relevance")
    potential_industry: str = Field(..., description="Primary candidate industry domain")
    potential_users: str = Field(..., description="Target candidate user groups or teams")
    potential_use_case: str = Field(..., description="Specific operational or clinical use case")
    supporting_evidence: List[str] = Field(default_factory=list, description="Direct supporting evidence bullet points")
    evidence_coverage: str = Field(..., description="Coverage level: High / Medium / Low / Insufficient")
    suggested_next_step: str = Field(..., description="Actionable next step for validation")
    connected_papers: List[EvidencePaperItem] = Field(default_factory=list)
    connected_patents: List[EvidencePatentItem] = Field(default_factory=list)
    connected_organizations: List[str] = Field(default_factory=list)


class ResearchCommercializationResponse(BaseModel):
    technology: str
    total_applications: int
    applications: List[ApplicationRecommendation] = Field(default_factory=list)
    status: str = Field("success", description="'success' or 'insufficient_evidence'")
    message: Optional[str] = None
    evidence_coverage: str = "High"


# ===========================================================================
# Member 2: Productization Recommendations
# ===========================================================================

class ProductRecommendation(BaseModel):
    product_name: str = Field(..., description="Candidate Product / Service Name")
    problem: str = Field(..., description="Real-world problem being addressed")
    proposed_solution: str = Field(..., description="Proposed technical solution/product offering")
    target_users: str = Field(..., description="Target end-users and personas")
    target_industry: str = Field(..., description="Primary target industry")
    main_use_case: str = Field(..., description="Main operational use case")
    core_technology: str = Field(..., description="Core underlying technology stack/methods")
    required_technical_components: List[str] = Field(default_factory=list, description="Architecture / component requirements")
    possible_delivery_model: str = Field(..., description="e.g. Enterprise Software, Cloud SaaS, Embedded API, On-Premises Industrial Appliance")
    why_identified: str = Field(..., description="Why this product was identified from available research/patent/tech signals")
    supporting_evidence: List[str] = Field(default_factory=list)
    development_requirements: List[str] = Field(default_factory=list)
    suggested_next_steps: List[str] = Field(default_factory=list)
    connected_evidence: Optional[CommercializationEvidenceBundle] = None


class ProductizationResponse(BaseModel):
    technology: str
    total_products: int
    products: List[ProductRecommendation] = Field(default_factory=list)
    status: str = Field("success", description="'success' or 'insufficient_evidence'")
    message: Optional[str] = None
    evidence_coverage: str = "High"


# ===========================================================================
# Member 2: Startup Creation Recommendations
# ===========================================================================

class StartupRecommendation(BaseModel):
    startup_concept: str = Field(..., description="Startup Concept Name")
    problem: str = Field(..., description="Target market pain point")
    proposed_solution: str = Field(..., description="Unique value proposition & tech solution")
    target_customers: str = Field(..., description="Initial customer segments / buyers")
    target_industry: str = Field(..., description="Target vertical industry")
    technology_used: str = Field(..., description="Underlying technology stack from evidence")
    why_identified: str = Field(..., description="Signal rationale from novelty, maturity, patents & funding")
    competitive_context: str = Field(..., description="Landscape context based on existing organizations and patents")
    possible_business_model: str = Field(..., description="Monetization model (e.g. B2B Subscription, Usage-based API, License + Support)")
    relevant_funding_opportunities: List[EvidenceFundingItem] = Field(default_factory=list)
    required_development: List[str] = Field(default_factory=list)
    suggested_first_step: str = Field(..., description="Actionable first step (e.g., prototype validation, pilot)")
    supporting_evidence: List[str] = Field(default_factory=list)
    evidence_coverage: str = Field("High", description="High / Medium / Low / Insufficient")
    opportunity_signal: str = Field("Potential Startup Opportunity", description="Opportunity signal description")


class StartupResponse(BaseModel):
    technology: str
    total_startups: int
    startups: List[StartupRecommendation] = Field(default_factory=list)
    status: str = Field("success", description="'success' or 'insufficient_evidence'")
    message: Optional[str] = None
    evidence_coverage: str = "High"


# ===========================================================================
# Licensing & Industry Partnership Opportunities
# ===========================================================================

class LicensingOpportunity(BaseModel):
    organization: str = Field(..., description="Organization / Assignee Name")
    relevance: str = Field(..., description="High / Medium / Low relevance")
    industry_domain: str = Field(..., description="Primary industry domain")
    related_patents: List[str] = Field(default_factory=list, description="Related patent titles or numbers")
    why_relevant: str = Field(..., description="Why this organization is a potential licensing candidate")
    potential_pathway: str = Field(..., description="e.g. Non-exclusive IP licensing, Joint research agreement, Technology transfer")
    suggested_action: str = Field(..., description="Actionable first step")
    candidate_type: str = Field("Potential licensing candidate", description="Candidate type label")


class IndustryPartnership(BaseModel):
    organization: str = Field(..., description="Partner organization name")
    partnership_type: str = Field(..., description="e.g. Co-development, Clinical validation, Pilot testing, Supply chain integration")
    target_sector: str = Field(..., description="Target sector or industry")
    synergy_reason: str = Field(..., description="Why partnership is relevant based on empirical data")
    supporting_evidence: List[str] = Field(default_factory=list)
    suggested_engagement: str = Field(..., description="Actionable engagement pathway")
    opportunity_label: str = Field("Potential industry partner", description="Opportunity label")


# ===========================================================================
# Complete Commercialization Analysis (Combined Response for Module 8)
# ===========================================================================

class CommercializationAnalysisResponse(BaseModel):
    technology: str
    innovation_score: Optional[float] = None
    innovation_level: Optional[str] = None
    technology_stage: str = "Unknown"
    adoption_level: str = "Unknown"
    evidence_coverage: str = "Insufficient"
    coverage_percentage: float = 0.0
    status: str = "success"  # 'success' | 'insufficient_evidence'
    message: Optional[str] = None
    
    # Member 1 Output
    applications: List[ApplicationRecommendation] = Field(default_factory=list)
    
    # Member 2 Output
    products: List[ProductRecommendation] = Field(default_factory=list)
    startups: List[StartupRecommendation] = Field(default_factory=list)

    # Licensing & Industry Partnerships
    licensing_opportunities: List[LicensingOpportunity] = Field(default_factory=list)
    industry_partnerships: List[IndustryPartnership] = Field(default_factory=list)

    # Advanced Commercialization Intelligence (Steps 8, 9, 10)
    readiness_dimensions: List[CommercializationReadinessDimension] = Field(default_factory=list)
    gap_analysis: Optional[CommercializationGapAnalysis] = None
    patent_product_mappings: List[PatentProductMappingItem] = Field(default_factory=list)
    
    # Connected Evidence Bundle
    evidence: CommercializationEvidenceBundle = Field(default_factory=CommercializationEvidenceBundle)

