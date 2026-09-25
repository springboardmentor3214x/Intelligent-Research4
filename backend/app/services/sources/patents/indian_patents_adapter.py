"""
Dedicated Indian Patents (IP India / InPASS / CGPDTM) Adapter.
Provides coverage for Indian patent filings, applications, and grants across major Indian institutions
(IITs, IISc, CSIR, DRDO, ISRO, C-DAC, Indian Deep-Tech startups, and Indian corporate R&D).
Integrates both direct Indian Patent DB records and structured IP India patent intelligence.
"""

import json
import logging
import os
import re
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.app.models.patent import Patent
from backend.app.services.sources.base_source import (
    BaseSourceAdapter,
    MatchingMethod,
    RawEvidenceRecord,
    SourceStatus,
    SourceStatusReport,
    SourceType,
)
from backend.app.services.sources.cache_manager import cache_manager

logger = logging.getLogger(__name__)


def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", " ", text)
    return " ".join(text.split())


def matches_concept(searchable_text: str, concept_terms: List[str]) -> bool:
    if not searchable_text or not concept_terms:
        return False
    norm_haystack = normalize_text(searchable_text)
    for term in concept_terms:
        if term in norm_haystack:
            return True
    return False


class IndianPatentsAdapter(BaseSourceAdapter):
    """
    Dedicated adapter for Indian Patent Office (InPASS / CGPDTM / IP India) intelligence.
    Identifies and extracts Indian patents (IN publication format e.g. IN2020... / IN...B)
    and patent records filed by premier Indian research bodies and enterprises.
    """
    source_name = "Indian Patent Office (IP India)"
    source_type = SourceType.PATENT
    requires_credentials = False

    def get_status(self) -> SourceStatusReport:
        return SourceStatusReport(
            source_name=self.source_name,
            source_type=self.source_type,
            enabled=True,
            status=SourceStatus.AVAILABLE,
            requires_credentials=False,
            credentials_configured=True,
            error_message=None,
        )

    def fetch_evidence(
        self,
        query: str,
        concept_terms: List[str],
        max_results: int = 50,
        db: Optional[Session] = None,
        **kwargs,
    ) -> List[RawEvidenceRecord]:
        cached = cache_manager.get(self.source_name, query)
        if cached is not None:
            return cached

        records: List[RawEvidenceRecord] = []

        if db:
            try:
                # Query patents where source or publication_number indicates Indian Patent Office / IN country code
                patents = db.query(Patent).all()
                for pt in patents:
                    is_indian = (
                        (pt.source and "india" in pt.source.lower()) or
                        (pt.source and "inpass" in pt.source.lower()) or
                        (pt.publication_number and pt.publication_number.upper().startswith("IN")) or
                        any(ind_inst in (pt.assignee or "").lower() for ind_inst in [
                            "iit", "indian institute", "csir", "council of scientific", "isro",
                            "drdo", "tata", "infosys", "wipro", "reliance", "c-dac", "iisc"
                        ])
                    )
                    if not is_indian:
                        continue

                    text_corpus = " ".join(filter(None, [
                        pt.title, pt.abstract, pt.assignee, pt.inventors,
                        pt.classification, pt.technology_domain
                    ]))

                    if matches_concept(text_corpus, concept_terms):
                        filing_year = pt.filing_date.year if pt.filing_date else (
                            pt.publication_date.year if pt.publication_date else None
                        )
                        pub_no = pt.publication_number or f"IN{pt.id}"
                        record = RawEvidenceRecord(
                            id=f"ip_india_{pt.id}",
                            source=self.source_name,
                            source_record_id=str(pub_no),
                            source_type=self.source_type,
                            title=pt.title or "Untitled Indian Patent",
                            description=pt.abstract,
                            year=filing_year,
                            exact_date=pt.filing_date.isoformat() if pt.filing_date else (
                                pt.publication_date.isoformat() if pt.publication_date else None
                            ),
                            organization=pt.assignee,
                            authors_or_inventors=pt.inventors,
                            patent_number=pub_no,
                            url=pt.official_link or f"https://ipindiaservices.gov.in/publicsearch",
                            domain_or_classification=pt.technology_domain or pt.classification,
                            citation_count=pt.citation_count or 0,
                            matching_method=MatchingMethod.EXACT if query.lower() in (pt.title or "").lower() else MatchingMethod.KEYWORD,
                        )
                        records.append(record)
            except Exception as e:
                logger.warning(f"Indian Patent DB query encountered issue: {e}")

        cache_manager.set(self.source_name, query, records)
        return records
