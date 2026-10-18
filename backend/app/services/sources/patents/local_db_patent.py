import re
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.app.models.patent import Patent
from backend.app.services.sources.base_source import (
    BaseSourceAdapter,
    MatchingMethod,
    RawEvidenceRecord,
    SourceType,
)


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


class LocalDBPatentAdapter(BaseSourceAdapter):
    source_name = "Module 5 Patent DB"
    source_type = SourceType.PATENT
    requires_credentials = False

    def fetch_evidence(
        self,
        query: str,
        concept_terms: List[str],
        max_results: int = 100,
        db: Optional[Session] = None,
        **kwargs,
    ) -> List[RawEvidenceRecord]:
        if not db:
            return []

        records: List[RawEvidenceRecord] = []
        try:
            patents = db.query(Patent).all()
            for pt in patents:
                text_corpus = " ".join(filter(None, [
                    pt.title, pt.abstract, pt.assignee, pt.inventors,
                    pt.classification, pt.technology_domain
                ]))
                if matches_concept(text_corpus, concept_terms):
                    filing_year = pt.filing_date.year if pt.filing_date else (pt.publication_date.year if pt.publication_date else None)
                    record = RawEvidenceRecord(
                        id=f"local_patent_{pt.id}",
                        source=pt.source or self.source_name,
                        source_record_id=str(pt.publication_number or pt.id),
                        source_type=self.source_type,
                        title=pt.title or "Untitled Patent",
                        description=pt.abstract,
                        year=filing_year,
                        exact_date=pt.filing_date.isoformat() if pt.filing_date else (pt.publication_date.isoformat() if pt.publication_date else None),
                        organization=pt.assignee,
                        authors_or_inventors=pt.inventors,
                        patent_number=pt.publication_number,
                        domain_or_classification=pt.technology_domain or pt.classification,
                        citation_count=pt.citation_count or 0,
                        matching_method=MatchingMethod.EXACT if query.lower() in (pt.title or "").lower() else MatchingMethod.HYBRID,
                    )
                    records.append(record)
        except Exception:
            pass

        return records
