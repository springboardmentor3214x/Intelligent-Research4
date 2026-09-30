import re
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.app.models.research_paper import ResearchPaper
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


class LocalDBResearchAdapter(BaseSourceAdapter):
    source_name = "Module 3 Research DB"
    source_type = SourceType.RESEARCH
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
            papers = db.query(ResearchPaper).all()
            for p in papers:
                text_corpus = " ".join(filter(None, [
                    p.title, p.abstract, p.authors, p.keywords, p.research_domain, p.journal_or_conference
                ]))
                if matches_concept(text_corpus, concept_terms):
                    record = RawEvidenceRecord(
                        id=f"local_paper_{p.id}",
                        source=p.source or self.source_name,
                        source_record_id=str(p.source_id or p.id),
                        source_type=self.source_type,
                        title=p.title or "Untitled Research",
                        description=p.abstract,
                        year=p.publication_year,
                        exact_date=p.publication_date.isoformat() if p.publication_date else None,
                        organization=None,
                        authors_or_inventors=p.authors,
                        domain_or_classification=p.research_domain,
                        citation_count=p.citation_count or 0,
                        matching_method=MatchingMethod.EXACT if query.lower() in (p.title or "").lower() else MatchingMethod.HYBRID,
                    )
                    records.append(record)
        except Exception:
            pass

        return records
