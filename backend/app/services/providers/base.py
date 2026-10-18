from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class ProviderStatus(str, Enum):
    AVAILABLE = "available"
    RATE_LIMITED = "rate_limited"
    TIMEOUT = "timeout"
    UNAVAILABLE = "unavailable"
    NOT_CONFIGURED = "not_configured"
    ERROR = "error"


@dataclass
class NormalizedPaper:
    """Normalized internal research paper representation across all 13 providers."""
    source: str
    source_id: str
    title: str
    abstract: Optional[str] = None
    authors: Optional[str] = None
    publication_date: Optional[date] = None
    publication_year: Optional[int] = None
    journal_or_conference: Optional[str] = None
    keywords: Optional[str] = None
    research_domain: Optional[str] = None
    doi: Optional[str] = None
    citation_count: int = 0
    publication_link: Optional[str] = None
    open_access_url: Optional[str] = None
    is_open_access: bool = False
    publisher: Optional[str] = None
    document_type: Optional[str] = "publication"
    is_preprint: bool = False
    source_metadata: dict[str, Any] = field(default_factory=dict)
    provenance_sources: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "source_id": self.source_id,
            "title": self.title,
            "abstract": self.abstract,
            "authors": self.authors,
            "publication_date": self.publication_date,
            "publication_year": self.publication_year,
            "journal_or_conference": self.journal_or_conference,
            "keywords": self.keywords,
            "research_domain": self.research_domain,
            "doi": self.doi,
            "citation_count": self.citation_count,
            "publication_link": self.publication_link,
            "open_access_url": self.open_access_url,
            "is_open_access": self.is_open_access,
            "publisher": self.publisher,
            "document_type": self.document_type or "publication",
            "is_preprint": self.is_preprint,
            "source_metadata": self.source_metadata,
            "provenance_sources": self.provenance_sources or [self.source],
        }


@dataclass
class ProviderResult:
    """Standardized result returned by every research provider search."""
    source: str
    results: list[NormalizedPaper] = field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 50
    status: ProviderStatus = ProviderStatus.AVAILABLE
    error: Optional[str] = None


class BaseResearchProvider:
    """
    Abstract base interface for all academic research providers.
    Providers must handle rate-limiting, timeouts, errors, and missing keys internally
    without ever throwing unhandled exceptions or halting application startup.
    """
    source_name: str = "Base"

    def is_configured(self) -> bool:
        """Returns True if provider has required configuration or does not require credentials."""
        return True

    def get_health_status(self) -> ProviderStatus:
        """Returns the current operational status of the provider."""
        if not self.is_configured():
            return ProviderStatus.NOT_CONFIGURED
        return ProviderStatus.AVAILABLE

    def search(
        self,
        query: str,
        target_count: int = 50,
        page: int = 1,
        page_size: int = 50,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        **kwargs: Any,
    ) -> ProviderResult:
        """
        Execute search against the provider API.
        Must never raise exceptions; must return a ProviderResult with appropriate status.
        """
        raise NotImplementedError
