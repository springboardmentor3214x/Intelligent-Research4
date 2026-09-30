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

OPENAIRE_PRODUCTS_URL = "https://api.openaire.eu/search/researchProducts"


class OpenAIREAdapter(BaseSourceAdapter):
    source_name = "OpenAIRE"
    source_type = SourceType.RESEARCH
    requires_credentials = False

    def fetch_evidence(
        self,
        query: str,
        concept_terms: List[str],
        max_results: int = 40,
        **kwargs,
    ) -> List[RawEvidenceRecord]:
        cached = cache_manager.get(self.source_name, query)
        if cached is not None:
            return cached

        records: List[RawEvidenceRecord] = []
        try:
            params = {
                "keywords": query.strip(),
                "size": min(max_results, 40),
                "format": "json",
            }
            with httpx.Client(timeout=10.0) as client:
                response = client.get(OPENAIRE_PRODUCTS_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    response_obj = data.get("response", {})
                    results = response_obj.get("results", {}).get("result") or []
                    if isinstance(results, dict):
                        results = [results]

                    for res in results:
                        meta = res.get("metadata", {}).get("oaf:entity", {}).get("oaf:result", {})
                        if not meta:
                            continue

                        title_obj = meta.get("title")
                        title = ""
                        if isinstance(title_obj, dict):
                            title = title_obj.get("$", "")
                        elif isinstance(title_obj, list) and title_obj:
                            title = title_obj[0].get("$", "") if isinstance(title_obj[0], dict) else str(title_obj[0])
                        elif isinstance(title_obj, str):
                            title = title_obj

                        if not title:
                            continue

                        # Extract DOI & PID
                        pid_obj = meta.get("pid")
                        doi = None
                        if isinstance(pid_obj, list):
                            for p in pid_obj:
                                if isinstance(p, dict) and p.get("@classid") == "doi":
                                    doi = p.get("$")
                        elif isinstance(pid_obj, dict) and pid_obj.get("@classid") == "doi":
                            doi = pid_obj.get("$")

                        # Extract Date
                        pub_year = None
                        date_str = meta.get("dateofacceptance", {})
                        if isinstance(date_str, dict):
                            date_val = date_str.get("$", "")
                            if len(date_val) >= 4 and date_val[:4].isdigit():
                                pub_year = int(date_val[:4])

                        # Extract Authors & Orgs
                        author_names = []
                        creator_obj = meta.get("creator") or []
                        if isinstance(creator_obj, dict):
                            creator_obj = [creator_obj]
                        for c in creator_obj:
                            if isinstance(c, dict) and c.get("$"):
                                author_names.append(c.get("$"))

                        header = res.get("header", {})
                        obj_id = header.get("dri:objIdentifier", {}).get("$") or str(hash(title))

                        record = RawEvidenceRecord(
                            id=f"openaire_{obj_id.replace('/', '_')}",
                            source=self.source_name,
                            source_record_id=obj_id,
                            source_type=self.source_type,
                            title=title,
                            description=None,
                            year=pub_year,
                            organization=None,
                            authors_or_inventors=", ".join(author_names[:8]) if author_names else None,
                            doi=doi,
                            url=f"https://explore.openaire.eu/search/publication?pid={doi}" if doi else None,
                            domain_or_classification=None,
                            citation_count=0,
                            matching_method=MatchingMethod.HYBRID,
                        )
                        records.append(record)

            cache_manager.set(self.source_name, query, records)
        except Exception as e:
            logger.warning(f"OpenAIRE fetch failed gracefully: {e}")

        return records
