import logging
from typing import List, Optional
import httpx

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

OPENALEX_WORKS_URL = "https://api.openalex.org/works"


def reconstruct_abstract(abstract_inverted_index: dict | None) -> Optional[str]:
    if not abstract_inverted_index:
        return None
    words = []
    for word, positions in abstract_inverted_index.items():
        for position in positions:
            words.append((position, word))
    words.sort(key=lambda item: item[0])
    return " ".join(word for _, word in words)


class OpenAlexAdapter(BaseSourceAdapter):
    source_name = "OpenAlex"
    source_type = SourceType.RESEARCH
    requires_credentials = False

    def fetch_evidence(
        self,
        query: str,
        concept_terms: List[str],
        max_results: int = 50,
        **kwargs,
    ) -> List[RawEvidenceRecord]:
        cached = cache_manager.get(self.source_name, query)
        if cached is not None:
            return cached

        records: List[RawEvidenceRecord] = []
        search_query = query.strip()
        headers = {"User-Agent": "ResearchIntelligencePlatform/2.0 (mailto:team@research-intelligence.local)"}

        try:
            params = {
                "search": search_query,
                "per-page": min(max_results, 50),
                "sort": "cited_by_count:desc",
            }
            with httpx.Client(timeout=10.0) as client:
                response = client.get(OPENALEX_WORKS_URL, params=params, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results") or []
                    for item in results:
                        openalex_id = item.get("id", "")
                        source_id = openalex_id.rstrip("/").split("/")[-1] if openalex_id else ""
                        title = item.get("title") or "Untitled Work"
                        abstract = reconstruct_abstract(item.get("abstract_inverted_index"))

                        # Extract authors & institutions
                        authorships = item.get("authorships") or []
                        author_names = []
                        institutions = []
                        for a in authorships:
                            author_obj = a.get("author") or {}
                            if author_obj.get("display_name"):
                                author_names.append(author_obj["display_name"])
                            for inst in a.get("institutions") or []:
                                if inst.get("display_name") and inst["display_name"] not in institutions:
                                    institutions.append(inst["display_name"])

                        primary_org = institutions[0] if institutions else None
                        topics = item.get("topics") or []
                        topic_name = topics[0].get("display_name") if topics else None
                        doi = item.get("doi")
                        if doi and doi.startswith("https://doi.org/"):
                            doi = doi.replace("https://doi.org/", "")

                        pub_year = item.get("publication_year")
                        citations = item.get("cited_by_count") or 0

                        record = RawEvidenceRecord(
                            id=f"openalex_{source_id}",
                            source=self.source_name,
                            source_record_id=source_id,
                            source_type=self.source_type,
                            title=title,
                            description=abstract,
                            year=pub_year,
                            exact_date=item.get("publication_date"),
                            organization=primary_org,
                            authors_or_inventors=", ".join(author_names[:8]) if author_names else None,
                            doi=doi,
                            url=item.get("doi") or openalex_id,
                            domain_or_classification=topic_name,
                            citation_count=citations,
                            matching_method=MatchingMethod.HYBRID,
                        )
                        records.append(record)

            cache_manager.set(self.source_name, query, records)
        except Exception as e:
            logger.warning(f"OpenAlex fetch failed gracefully: {e}")

        return records
