import re
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.app.models.funding_opportunity import FundingOpportunity
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


class LocalDBFundingAdapter(BaseSourceAdapter):
    source_name = "Module 4 Funding DB"
    source_type = SourceType.FUNDING
    requires_credentials = False

    def fetch_evidence(
        self,
        query: str,
        concept_terms: List[str],
        max_results: int = 50,
        db: Optional[Session] = None,
        **kwargs,
    ) -> List[RawEvidenceRecord]:
        if not db:
            return []

        records: List[RawEvidenceRecord] = []
        try:
            funding_list = db.query(FundingOpportunity).all()
            for f in funding_list:
                text_corpus = " ".join(filter(None, [
                    f.title, f.description, f.funding_category,
                    f.research_area, f.eligibility, f.agency
                ]))
                if matches_concept(text_corpus, concept_terms):
                    open_year = f.open_date.year if f.open_date else None
                    record = RawEvidenceRecord(
                        id=f"local_funding_{f.id}",
                        source=f.source or self.source_name,
                        source_record_id=str(f.source_id or f.id),
                        source_type=self.source_type,
                        title=f.title or "Untitled Grant Opportunity",
                        description=f.description,
                        year=open_year,
                        exact_date=f.open_date.isoformat() if f.open_date else None,
                        organization=f.agency,
                        domain_or_classification=f.funding_category or f.research_area,
                        funding_amount=float(f.funding_amount) if f.funding_amount else None,
                        url=f.url,
                        matching_method=MatchingMethod.EXACT if query.lower() in (f.title or "").lower() else MatchingMethod.HYBRID,
                    )
                    records.append(record)
        except Exception:
            pass

        return records
