from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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


class PatentSearchItem(BaseModel):
    id: UUID
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
    relevance_score: float = 1.0
    matched_by: str = "keyword"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatentSearchResponse(BaseModel):
    query: str
    total_results: int
    patents: list[PatentSearchItem]


class PatentSuggestionItem(BaseModel):
    text: str
    category: str  # 'title' | 'domain' | 'assignee' | 'keyword'


class PatentSuggestionsResponse(BaseModel):
    query: str
    suggestions: list[PatentSuggestionItem]


class SimilarPatentItem(BaseModel):
    patent_id: UUID
    publication_number: str
    title: str
    abstract: str | None = None
    assignee: str | None = None
    technology_domain: str | None = None
    classification: str | None = None
    country: str | None = None
    filing_date: date | None = None
    publication_date: date | None = None
    citation_count: int | None = None
    source: str | None = None
    similarity_score: float
    similarity_percentage: float
    shared_terms: list[str] = []
    official_link: str | None = None


class SimilarPatentsResponse(BaseModel):
    source_patent_id: UUID
    source_patent_title: str
    source_patent_publication_number: str | None = None
    source_patent_abstract: str | None = None
    source_patent_assignee: str | None = None
    source_patent_domain: str | None = None
    source_patent_country: str | None = None
    source_patent_filing_date: date | None = None
    source_patent_classification: str | None = None
    source_patent_official_link: str | None = None
    total_compared: int
    similar_patents: list[SimilarPatentItem]


class ClusterRepresentativePatent(BaseModel):
    patent_id: UUID
    publication_number: str
    title: str
    assignee: str | None = None
    technology_domain: str | None = None
    centrality_score: float


class ClusterPatentPoint(BaseModel):
    patent_id: UUID
    publication_number: str
    title: str
    assignee: str | None = None
    technology_domain: str | None = None
    cluster_id: int
    x: float
    y: float
    x_3d: float | None = None
    y_3d: float | None = None
    z_3d: float | None = None
    country: str | None = None
    filing_date: date | None = None
    publication_date: date | None = None


class ClusterItem(BaseModel):
    cluster_id: int
    label: str
    patent_count: int
    percentage: float
    top_terms: list[str] = []
    representative_patents: list[ClusterRepresentativePatent] = []
    avg_intra_similarity: float = 0.0
    silhouette_contribution: float | None = None
    closest_cluster_label: str | None = None
    closest_cluster_distance: float | None = None


class LandscapeInsights(BaseModel):
    largest_cluster_label: str
    largest_cluster_count: int
    most_cohesive_cluster_label: str
    most_cohesive_cluster_similarity: float
    average_portfolio_similarity: float
    closest_cluster_pair: list[str] = []
    total_unique_assignees: int
    emerging_technology_areas: list[str] = []


class PatentClusterResponse(BaseModel):
    total_patents: int
    number_of_clusters: int
    optimal_k_selected: int
    silhouette_score: float | None = None
    embedding_model: str
    clustering_algorithm: str
    generated_at: datetime
    clusters: list[ClusterItem]
    visualization_points: list[ClusterPatentPoint] = []
    insights: LandscapeInsights | None = None
    pca_variance_explained: list[float] = []


class ClusteringRunRequest(BaseModel):
    n_clusters: int | None = Field(default=None, ge=2, le=20)
    max_patents: int = Field(default=500, ge=4, le=2000)


# ============================================================
# AI Innovation / Patent Idea Analyzer Schemas
# ============================================================

class PatentIdeaAnalysisRequest(BaseModel):
    idea: str = Field(min_length=10, description="User's research or startup idea text")
    focus_country: str | None = Field(default="all", description="'all' | 'india' | 'global'")
    min_similarity: float = Field(default=0.0, ge=0.0, le=100.0)
    limit: int = Field(default=20, ge=1, le=100)


class IdeaExtractedConcepts(BaseModel):
    domain: str
    problem: str
    objective: str
    technology: str
    input_type: str | None = None
    processing_method: str | None = None
    algorithms: list[str] = []
    output_type: str | None = None
    research_areas: list[str] = []
    technical_components: list[str] = []
    keywords: list[str] = []


class IdeaSearchSummary(BaseModel):
    total_matches: int
    india_matches: int
    global_matches: int
    high_similarity_matches: int
    moderate_similarity_matches: int
    connected_sources_scope: str


class PatentIdeaMatchItem(BaseModel):
    id: UUID
    publication_number: str
    title: str
    abstract: str | None = None
    assignee: str | None = None
    inventors: str | None = None
    country: str = "Global / International"
    filing_date: date | None = None
    publication_date: date | None = None
    status: str | None = None
    technology_domain: str | None = None
    similarity_score: float
    similarity_percentage: float
    match_level: str  # "High Similarity", "Moderate Similarity", "Broad Similarity"
    why_matched_reasons: list[str] = []
    overlapping_components: list[str] = []
    source: str = "EPO"
    official_link: str | None = None


class FeatureOverlapItem(BaseModel):
    component: str
    coverage_level: str  # "Strong Existing Coverage", "Moderate Coverage", "Potential Differentiation Area"
    badge_type: str  # "warning", "info", "success"
    closest_patents_count: int
    explanation: str


class InnovationGapItem(BaseModel):
    gap_title: str
    gap_type: str  # "Well Covered", "Partially Covered", "Unexplored / Differentiation Opportunity"
    description: str
    potential_approach: str


class DifferentiationSuggestionItem(BaseModel):
    strategy_title: str
    category: str
    suggestion: str
    technical_impact: str


class AlternativeDirectionItem(BaseModel):
    title: str
    summary: str
    distinctive_aspects: list[str] = []
    relevant_applications: list[str] = []


class Idea3DCoordinates(BaseModel):
    x: float
    y: float
    z: float
    nearest_cluster_id: int | None = None
    nearest_cluster_label: str | None = None
    nearest_patent_title: str | None = None
    nearest_patent_similarity: float | None = None


class PatentIdeaAnalysisResponse(BaseModel):
    idea_analysis: IdeaExtractedConcepts
    search_concepts: list[str] = []
    search_summary: IdeaSearchSummary
    similar_patents: list[PatentIdeaMatchItem] = []
    feature_overlap_analysis: list[FeatureOverlapItem] = []
    innovation_gaps: list[InnovationGapItem] = []
    differentiation_suggestions: list[DifferentiationSuggestionItem] = []
    alternative_directions: list[AlternativeDirectionItem] = []
    idea_3d_coordinates: Idea3DCoordinates | None = None
    disclaimer: str