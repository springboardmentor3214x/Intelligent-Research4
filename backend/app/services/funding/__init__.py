"""
Funding Package Initialization
Exposes registry, synchronization, and adapters for Module 4.
"""

from backend.app.services.funding.base import FUNDING_SOURCES, FundingSourceAdapter
from backend.app.services.funding.source_registry import (
    sync_funding_sources,
    get_available_sources,
    deduplicate_and_upsert_opportunities,
)

__all__ = [
    "FUNDING_SOURCES",
    "FundingSourceAdapter",
    "sync_funding_sources",
    "get_available_sources",
    "deduplicate_and_upsert_opportunities",
]
