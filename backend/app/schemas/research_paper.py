from datetime import date, datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field


def _str_coercer(v: Any) -> str:
    """Coerce None or non-string to clean string."""
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    return str(v)


CleanStr = Annotated[str, BeforeValidator(_str_coercer)]


# --- BASE & CORE RESEARCH PAPER SCHEMAS ---

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
    id: UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    publisher: str | None = None
    source_provider: str | None = None
    pdf_url: str | None = None
    open_access: bool = False
    is_stored: bool = True

    model_config = ConfigDict(from_attributes=True)


class ResearchPaperListResponse(BaseModel):
    total: int
    papers: list[ResearchPaperResponse]


class ResearchPaperImportRequest(BaseModel):
    search: str = Field(min_length=1)
    per_page: int = Field(default=20, ge=1, le=100)


class ResearchPaperSearchResponse(BaseModel):
    total: int
    skip: int = 0
    limit: int = 20
    page: int = 1
    page_size: int = 20
    total_pages: int = 1
    query: str | None = None
    sources: dict[str, int] = Field(default_factory=dict)
    papers: list[ResearchPaperResponse]


# --- 22-PART RICH AI ANALYSIS SCHEMAS ---

class PaperOverviewSection(BaseModel):
    title: CleanStr = ""
    authors: CleanStr = ""
    publication_year: str | int = "Not specified"
    venue: CleanStr = "Not specified"
    doi: CleanStr = "Not specified"
    research_area: CleanStr = "Not specified"
    keywords: list[str] = Field(default_factory=list)
    citation_count: int = 0
    open_access_status: CleanStr = "Unknown"
    source: CleanStr = ""
    paper_type: CleanStr = Field(
        default="Research Article",
        description="Classified type: Research Article, Survey / Review, Systematic Review, Conference Paper, Dataset Paper, Methodological Paper, Theoretical Paper, Case Study, or Other"
    )
    paper_type_rationale: CleanStr = Field(default="", description="Reasoning based on evidence for paper type classification")


class ExecutiveSummarySection(BaseModel):
    summary_text: CleanStr = Field(default="", description="1-3 comprehensive, technically accurate paragraphs")
    core_premise: CleanStr = Field(default="", description="What the paper is about")
    significance: CleanStr = Field(default="", description="Why the work matters")
    key_takeaways: list[str] = Field(default_factory=list)


class ResearchProblemSection(BaseModel):
    problem_statement: CleanStr = Field(default="", description="The specific problem addressed")
    existing_gap: CleanStr = Field(default="", description="The gap or shortcoming in existing knowledge/tools")
    motivation: CleanStr = Field(default="", description="Why solving this problem is important")
    objectives: list[str] = Field(default_factory=list, description="Primary research objectives")
    research_questions: list[str] = Field(default_factory=list, description="Explicit research questions if defined, else empty")


class BackgroundSection(BaseModel):
    overview: CleanStr = Field(default="", description="Theoretical or domain background needed to understand the paper")
    domain_context: CleanStr = Field(default="", description="Broader research landscape")
    key_concepts: list[dict[str, str]] = Field(default_factory=list, description="List of concept-definition pairs")


class ExistingApproachItem(BaseModel):
    name: CleanStr = ""
    purpose: CleanStr = ""
    strengths: CleanStr = ""
    weaknesses: CleanStr = ""
    relationship_to_paper: CleanStr = ""


class MethodologyStep(BaseModel):
    step_number: int = 1
    stage_name: CleanStr = ""
    description: CleanStr = ""


class MethodologySection(BaseModel):
    overview: CleanStr = Field(default="", description="Comprehensive description of the proposed methodology")
    workflow_stages: list[MethodologyStep] = Field(default_factory=list, description="Step-by-step pipeline stages")
    techniques_used: list[str] = Field(default_factory=list, description="Specific ML/DL/Stats/Algorithmic techniques used in this paper")
    algorithm_or_formulation: CleanStr = Field(default="", description="Details of the specific algorithm, equations, or logic used")


class ArchitectureSection(BaseModel):
    has_architecture: bool = False
    description: CleanStr = Field(default="", description="System or model architecture description")
    components: list[dict[str, str]] = Field(default_factory=list, description="Name and role of components")
    data_flow: CleanStr = Field(default="", description="How data flows through the system")
    textual_pipeline: list[str] = Field(default_factory=list, description="Textual representation of the pipeline (e.g. Input -> Stage -> Output)")


class DatasetInfoItem(BaseModel):
    name: CleanStr = ""
    source: CleanStr = "Not reported"
    purpose: CleanStr = ""
    samples_count: CleanStr = "Not reported"
    classes_or_features: CleanStr = "Not reported"
    data_characteristics: CleanStr = ""
    train_val_test_split: CleanStr = "Not reported"
    preprocessing_and_augmentation: CleanStr = ""
    data_quality_and_limitations: CleanStr = ""


class DatasetAnalysisSection(BaseModel):
    is_applicable: bool = True
    non_applicable_reason: str | None = None
    datasets: list[DatasetInfoItem] = Field(default_factory=list)
    dataset_summary: CleanStr = ""


class ExperimentalSetupSection(BaseModel):
    is_applicable: bool = True
    non_applicable_reason: str | None = None
    hardware_and_environment: CleanStr = "Not reported"
    software_and_frameworks: CleanStr = "Not reported"
    hyperparameters_and_training: CleanStr = "Not reported"
    baseline_models: list[str] = Field(default_factory=list)
    experimental_scenarios: CleanStr = ""


class EvaluationMetricItem(BaseModel):
    name: CleanStr = ""
    reported_value: CleanStr = "Not reported"
    what_it_measures: CleanStr = ""
    why_relevant: CleanStr = ""


class ResultItem(BaseModel):
    metric: CleanStr = ""
    proposed_method_value: CleanStr = ""
    baseline_value: CleanStr = "N/A"
    improvement_or_difference: CleanStr = ""
    is_source_reported: bool = True


class ResultsSection(BaseModel):
    is_applicable: bool = True
    non_applicable_reason: str | None = None
    structured_results_table: list[ResultItem] = Field(default_factory=list)
    reported_results_narrative: list[str] = Field(default_factory=list)
    ai_interpretation_of_results: list[str] = Field(default_factory=list)


class FindingsSection(BaseModel):
    what_worked: list[str] = Field(default_factory=list)
    key_observations: list[str] = Field(default_factory=list)
    unexpected_or_notable_results: list[str] = Field(default_factory=list)


class ContributionItem(BaseModel):
    category: CleanStr = "Technical"
    description: CleanStr = ""


class NoveltySection(BaseModel):
    novelty_summary: CleanStr = Field(default="", description="Careful framing of what appears new or novel")
    novelty_categories: list[str] = Field(default_factory=list, description="E.g. New algorithm, New architecture, New framework, New application")
    apparent_novelty_details: CleanStr = ""


class ComparisonItem(BaseModel):
    baseline_method: CleanStr = ""
    comparison_summary: CleanStr = ""
    advantages_of_proposed: CleanStr = ""
    tradeoffs_or_disadvantages: CleanStr = ""


class LimitationsSection(BaseModel):
    author_stated_limitations: list[str] = Field(default_factory=list, description="Limitations explicitly acknowledged by authors")
    ai_identified_limitations: list[str] = Field(default_factory=list, description="Potential constraints or limitations identified by AI")


class FutureResearchSection(BaseModel):
    author_suggested_future_work: list[str] = Field(default_factory=list, description="Direct future work suggested in the paper")
    ai_suggested_directions: list[str] = Field(default_factory=list, description="AI-inferred future research opportunities")


class ApplicationItem(BaseModel):
    domain_or_use_case: CleanStr = ""
    practical_impact: CleanStr = ""
    is_source_supported: bool = True


class KeyTermItem(BaseModel):
    term: CleanStr = ""
    definition_in_context: CleanStr = ""


class StrengthItem(BaseModel):
    strength_type: CleanStr = "Methodological"  # Methodological, Experimental, Practical, Theoretical, Architectural
    description: CleanStr = ""


class ResearchGapItem(BaseModel):
    gap_type: CleanStr = "Potential Gap"  # Missing evaluation, Scalability, Generalization, Dataset constraint
    description: CleanStr = ""


class TakeawaySection(BaseModel):
    core_idea: CleanStr = ""
    most_useful_contribution: CleanStr = ""
    most_important_limitation: CleanStr = ""
    follow_up_opportunity: CleanStr = ""
    why_researchers_should_care: CleanStr = ""


class SourceCoverageInfo(BaseModel):
    coverage_level: CleanStr = "medium"  # "high" (full text), "medium" (abstract + metadata), "low" (metadata only)
    coverage_label: CleanStr = "Abstract & Metadata"
    content_analyzed: CleanStr = "Available abstract and repository metadata"
    full_text_available: bool = False
    full_text_url: str | None = None
    extraction_notes: str | None = None


# --- COMPLETE ENRICHED AI ANALYSIS CONTAINER ---

class RichAIAnalysisContent(BaseModel):
    paper_overview: PaperOverviewSection = Field(default_factory=PaperOverviewSection)
    executive_summary: ExecutiveSummarySection = Field(default_factory=ExecutiveSummarySection)
    research_problem: ResearchProblemSection = Field(default_factory=ResearchProblemSection)
    background: BackgroundSection = Field(default_factory=BackgroundSection)
    existing_approaches: list[ExistingApproachItem] = Field(default_factory=list)
    methodology: MethodologySection = Field(default_factory=MethodologySection)
    architecture: ArchitectureSection = Field(default_factory=ArchitectureSection)
    dataset_analysis: DatasetAnalysisSection = Field(default_factory=DatasetAnalysisSection)
    experimental_setup: ExperimentalSetupSection = Field(default_factory=ExperimentalSetupSection)
    evaluation_metrics: list[EvaluationMetricItem] = Field(default_factory=list)
    results: ResultsSection = Field(default_factory=ResultsSection)
    findings: FindingsSection = Field(default_factory=FindingsSection)
    contributions: list[ContributionItem] = Field(default_factory=list)
    novelty: NoveltySection = Field(default_factory=NoveltySection)
    comparison_with_existing: list[ComparisonItem] = Field(default_factory=list)
    limitations: LimitationsSection = Field(default_factory=LimitationsSection)
    future_research: FutureResearchSection = Field(default_factory=FutureResearchSection)
    practical_applications: list[ApplicationItem] = Field(default_factory=list)
    key_terms: list[KeyTermItem] = Field(default_factory=list)
    paper_strengths: list[StrengthItem] = Field(default_factory=list)
    research_gaps: list[ResearchGapItem] = Field(default_factory=list)
    researcher_takeaway: TakeawaySection = Field(default_factory=TakeawaySection)
    source_coverage: SourceCoverageInfo = Field(default_factory=SourceCoverageInfo)


# --- LEGACY COMPATIBILITY SCHEMA ---

class AIAnalysisContent(BaseModel):
    summary: str = Field(description="Comprehensive summary of the paper")
    research_problem: str = Field(description="Core research problem or question addressed")
    methodology: str = Field(description="Methodology or approach utilized")
    key_findings: list[str] = Field(default_factory=list, description="List of key findings")
    limitations: list[str] = Field(default_factory=list, description="Limitations identified")
    future_directions: list[str] = Field(default_factory=list, description="Potential future research directions")


class AnalysisMetadata(BaseModel):
    generated_by_ai: bool = True
    content_scope: str = "abstract_and_metadata"
    coverage_level: str = "medium"
    model_used: str | None = None
    is_cached: bool = False
    analyzed_at: datetime


class PaperSourceInfo(BaseModel):
    id: UUID
    title: str
    authors: str | None = None
    publication_year: int | None = None
    publication_date: date | None = None
    journal_or_conference: str | None = None
    keywords: str | None = None
    research_domain: str | None = None
    doi: str | None = None
    citation_count: int = 0
    publication_link: str | None = None
    source: str
    source_id: str

    model_config = ConfigDict(from_attributes=True)


class ResearchPaperAnalysisResponse(BaseModel):
    paper_id: UUID
    source: PaperSourceInfo
    ai_analysis: AIAnalysisContent
    rich_analysis: RichAIAnalysisContent | None = None
    analysis_metadata: AnalysisMetadata

    model_config = ConfigDict(from_attributes=True)


class PaperAnalyzeRequest(BaseModel):
    force_refresh: bool = False