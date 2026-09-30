from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.services.sources.base_source import (
    BaseSourceAdapter,
    RawEvidenceRecord,
    SourceStatusReport,
    SourceType,
)
from backend.app.services.sources.research.openalex_adapter import OpenAlexAdapter
from backend.app.services.sources.research.crossref_adapter import CrossrefAdapter
from backend.app.services.sources.research.openaire_adapter import OpenAIREAdapter
from backend.app.services.sources.research.pubmed_adapter import PubMedAdapter
from backend.app.services.sources.research.local_db_research import LocalDBResearchAdapter

from backend.app.services.sources.patents.epo_ops_adapter import EPOOPSAdapter
from backend.app.services.sources.patents.patentsview_adapter import PatentsViewAdapter
from backend.app.services.sources.patents.local_db_patent import LocalDBPatentAdapter
from backend.app.services.sources.patents.indian_patents_adapter import IndianPatentsAdapter

from backend.app.services.sources.funding.cordis_adapter import CORDISAdapter
from backend.app.services.sources.funding.nih_reporter_adapter import NIHReporterAdapter
from backend.app.services.sources.funding.local_db_funding import LocalDBFundingAdapter

from backend.app.services.sources.deduplication import deduplicate_evidence_records, DeduplicationResult


class SourceRegistry:
    """
    Central orchestrator for multi-source evidence acquisition.
    Dispatches queries in parallel/sequentially to enabled adapters with timeout and error protection.
    """
    def __init__(self):
        self.research_adapters: List[BaseSourceAdapter] = [
            LocalDBResearchAdapter(),
            OpenAlexAdapter(),
            CrossrefAdapter(),
            OpenAIREAdapter(),
            PubMedAdapter(),
        ]
        self.patent_adapters: List[BaseSourceAdapter] = [
            IndianPatentsAdapter(),
            LocalDBPatentAdapter(),
            PatentsViewAdapter(),
            EPOOPSAdapter(),
        ]
        self.funding_adapters: List[BaseSourceAdapter] = [
            LocalDBFundingAdapter(),
            NIHReporterAdapter(),
            CORDISAdapter(),
        ]

    def get_all_adapters(self) -> List[BaseSourceAdapter]:
        return self.research_adapters + self.patent_adapters + self.funding_adapters

    def get_status_reports(self) -> List[SourceStatusReport]:
        return [adapter.get_status() for adapter in self.get_all_adapters()]

    def fetch_all_evidence(
        self,
        query: str,
        concept_terms: List[str],
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Executes query against all available adapters and returns raw records,
        deduplicated records, and source coverage metrics.
        """
        raw_research: List[RawEvidenceRecord] = []
        raw_patents: List[RawEvidenceRecord] = []
        raw_funding: List[RawEvidenceRecord] = []

        # 1. Collect Research Records
        for adapter in self.research_adapters:
            try:
                recs = adapter.fetch_evidence(query=query, concept_terms=concept_terms, db=db)
                raw_research.extend(recs)
            except Exception:
                pass

        # 2. Collect Patent Records
        for adapter in self.patent_adapters:
            try:
                recs = adapter.fetch_evidence(query=query, concept_terms=concept_terms, db=db)
                raw_patents.extend(recs)
            except Exception:
                pass

        # 3. Collect Funding Records
        for adapter in self.funding_adapters:
            try:
                recs = adapter.fetch_evidence(query=query, concept_terms=concept_terms, db=db)
                raw_funding.extend(recs)
            except Exception:
                pass

        # 4. Deduplicate across sources
        research_dedup = deduplicate_evidence_records(raw_research)
        patents_dedup = deduplicate_evidence_records(raw_patents)
        funding_dedup = deduplicate_evidence_records(raw_funding)

        # Source Status Reports
        status_reports = self.get_status_reports()
        for r in status_reports:
            if r.source_name in research_dedup.source_counts:
                r.records_retrieved = research_dedup.source_counts[r.source_name]
            elif r.source_name in patents_dedup.source_counts:
                r.records_retrieved = patents_dedup.source_counts[r.source_name]
            elif r.source_name in funding_dedup.source_counts:
                r.records_retrieved = funding_dedup.source_counts[r.source_name]

        return {
            "research": research_dedup,
            "patents": patents_dedup,
            "funding": funding_dedup,
            "source_status": [s.model_dump() for s in status_reports],
            "total_raw_evidence": len(raw_research) + len(raw_patents) + len(raw_funding),
            "total_unique_evidence": research_dedup.unique_count + patents_dedup.unique_count + funding_dedup.unique_count,
        }


source_registry = SourceRegistry()
