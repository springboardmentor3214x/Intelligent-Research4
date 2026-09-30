import logging
from typing import List, Optional
import httpx

from backend.app.services.sources.base_source import (
    BaseSourceAdapter,
    MatchingMethod,
    RawEvidenceRecord,
    SourceType,
)
from backend.app.services.sources.cache_manager import cache_manager

logger = logging.getLogger(__name__)

CROSSREF_WORKS_URL = "https://api.crossref.org/works"


class CrossrefAdapter(BaseSourceAdapter):
    source_name = "Crossref"
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
        headers = {"User-Agent": "ResearchIntelligencePlatform/2.0 (mailto:team@research-intelligence.local)"}

        try:
            params = {
                "query": query.strip(),
                "rows": min(max_results, 50),
                "sort": "is-referenced-by-count",
                "order": "desc",
            }
            with httpx.Client(timeout=10.0) as client:
                response = client.get(CROSSREF_WORKS_URL, params=params, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    items = data.get("message", {}).get("items") or []
                    for item in items:
                        doi = item.get("DOI", "")
                        title_list = item.get("title") or []
                        title = title_list[0] if title_list else "Untitled Work"
                        abstract = item.get("abstract")

                        # Extract authors & affiliations
                        authors_raw = item.get("author") or []
                        author_names = []
                        affiliations = []
                        for a in authors_raw:
                            name = f"{a.get('given', '')} {a.get('family', '')}".strip()
                            if name:
                                author_names.append(name)
                            for aff in a.get("affiliation") or []:
                                if aff.get("name") and aff["name"] not in affiliations:
                                    affiliations.append(aff["name"])

                        primary_org = affiliations[0] if affiliations else None

                        # Publication year
                        pub_year = None
                        created = item.get("published-print") or item.get("published-online") or item.get("created")
                        if created and "date-parts" in created and created["date-parts"]:
                            parts = created["date-parts"][0]
                            if parts and len(parts) > 0:
                                pub_year = int(parts[0])

                        container = item.get("container-title") or []
                        journal = container[0] if container else None
                        citations = item.get("is-referenced-by-count") or 0

                        record = RawEvidenceRecord(
                            id=f"crossref_{doi.replace('/', '_')}" if doi else f"crossref_{hash(title)}",
                            source=self.source_name,
                            source_record_id=doi or str(hash(title)),
                            source_type=self.source_type,
                            title=title,
                            description=abstract,
                            year=pub_year,
                            organization=primary_org,
                            authors_or_inventors=", ".join(author_names[:8]) if author_names else None,
                            doi=doi,
                            url=f"https://doi.org/{doi}" if doi else item.get("URL"),
                            domain_or_classification=journal,
                            citation_count=citations,
                            matching_method=MatchingMethod.HYBRID,
                        )
                        records.append(record)

            cache_manager.set(self.source_name, query, records)
        except Exception as e:
            logger.warning(f"Crossref fetch failed gracefully: {e}")

        return records
