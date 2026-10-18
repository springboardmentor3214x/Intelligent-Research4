from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class SourceType(str, Enum):
    RESEARCH = "research"
    PATENT = "patent"
    FUNDING = "funding"


class SourceStatus(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    RATE_LIMITED = "rate_limited"
    AUTHENTICATION_REQUIRED = "authentication_required"
    NO_RESULTS = "no_results"
    DISABLED = "disabled"


class MatchingMethod(str, Enum):
    EXACT = "exact"
    KEYWORD = "keyword"
    ONTOLOGY = "ontology"
    SEMANTIC = "semantic"
    HYBRID = "hybrid"


class RawEvidenceRecord(BaseModel):
    """
    Normalized internal representation of an evidence item from any source.
    Preserves full provenance and traceability.
    """
    id: str = Field(..., description="Unique internal record ID or source compound ID")
    source: str = Field(..., description="Source name, e.g., 'OpenAlex', 'Crossref', 'PubMed', 'EPO OPS'")
    source_record_id: str = Field(..., description="Original record ID in the source system")
    source_type: SourceType = Field(..., description="Research, Patent, or Funding")
    title: str = Field(..., description="Title of the paper, patent, or grant")
    description: Optional[str] = Field(None, description="Abstract, summary, or description")
    year: Optional[int] = Field(None, description="Publication, filing, or award year")
    exact_date: Optional[str] = Field(None, description="ISO date string if available")
    organization: Optional[str] = Field(None, description="Affiliation, Assignee, or Funding Beneficiary")
    authors_or_inventors: Optional[str] = Field(None, description="Authors, Inventors, or Investigators")
    doi: Optional[str] = Field(None, description="Digital Object Identifier if applicable")
    patent_number: Optional[str] = Field(None, description="Patent/Publication number if applicable")
    pmid: Optional[str] = Field(None, description="PubMed ID if applicable")
    url: Optional[str] = Field(None, description="Direct URL to source record")
    domain_or_classification: Optional[str] = Field(None, description="Research field, IPC/CPC class, or grant category")
    citation_count: int = Field(0, description="Citation count if tracked by source")
    funding_amount: Optional[float] = Field(None, description="Grant funding amount if applicable")
    country: Optional[str] = Field("GLOBAL", description="Country / Jurisdiction (e.g., 'IN', 'US', 'EP', 'GLOBAL')")
    family_id: Optional[str] = Field(None, description="Patent or invention family ID")
    application_number: Optional[str] = Field(None, description="Application or filing number")
    relevance_score: float = Field(1.0, description="Computed relevance score (0.0 - 1.0)")
    matching_method: MatchingMethod = Field(MatchingMethod.HYBRID, description="How the record was matched")
    retrieved_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Raw source metadata")


class SourceStatusReport(BaseModel):
    source_name: str
    source_type: SourceType
    enabled: bool
    status: SourceStatus
    requires_credentials: bool
    credentials_configured: bool
    records_retrieved: int = 0
    error_message: Optional[str] = None
    rate_limit_info: Optional[str] = None


class BaseSourceAdapter:
    """
    Abstract base class for all external and local data source adapters.
    """
    source_name: str = "Base"
    source_type: SourceType = SourceType.RESEARCH
    requires_credentials: bool = False

    def is_configured(self) -> bool:
        """Return True if credentials or required config are present."""
        return True

    def get_status(self) -> SourceStatusReport:
        return SourceStatusReport(
            source_name=self.source_name,
            source_type=self.source_type,
            enabled=True,
            status=SourceStatus.AVAILABLE if self.is_configured() else SourceStatus.AUTHENTICATION_REQUIRED,
            requires_credentials=self.requires_credentials,
            credentials_configured=self.is_configured(),
        )

    def fetch_evidence(
        self,
        query: str,
        concept_terms: List[str],
        max_results: int = 50,
        **kwargs,
    ) -> List[RawEvidenceRecord]:
        """
        Fetch evidence records for the given query and expanded concept terms.
        Must handle all exceptions internally and return empty list rather than crashing.
        """
        raise NotImplementedError
