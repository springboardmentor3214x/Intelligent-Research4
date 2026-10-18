from typing import Any
from backend.app.services.sources.base_source import (
    BaseSourceAdapter,
    MatchingMethod,
    RawEvidenceRecord,
    SourceStatus,
    SourceStatusReport,
    SourceType,
)
from backend.app.services.sources.cache_manager import EvidenceCacheManager, cache_manager
from backend.app.services.sources.deduplication import DeduplicationResult, deduplicate_evidence_records
from backend.app.services.sources.source_registry import SourceRegistry, source_registry

__all__ = [
    "BaseSourceAdapter",
    "SourceType",
    "SourceStatus",
    "MatchingMethod",
    "RawEvidenceRecord",
    "SourceStatusReport",
    "EvidenceCacheManager",
    "cache_manager",
    "DeduplicationResult",
    "deduplicate_evidence_records",
    "SourceRegistry",
    "source_registry",
]
