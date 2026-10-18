from datetime import date
import logging
import os
import re
from typing import Any, Optional
import httpx

from backend.app.services.providers.base import (
    BaseResearchProvider,
    NormalizedPaper,
    ProviderResult,
    ProviderStatus,
)

logger = logging.getLogger(__name__)

ZENODO_API_URL = "https://zenodo.org/api/records"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


class ZenodoProvider(BaseResearchProvider):
    source_name = "Zenodo"

    def __init__(self):
        self.access_token = os.getenv("ZENODO_API_TOKEN", "").strip()

    def search(
        self,
        query: str,
        target_count: int = 50,
        page: int = 1,
        page_size: int = 50,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        **kwargs: Any,
    ) -> ProviderResult:
        if not query or not query.strip():
            return ProviderResult(source=self.source_name, results=[], total=0, status=ProviderStatus.AVAILABLE)

        cleaned_query = query.strip()
        results: list[NormalizedPaper] = []
        size = min(page_size, target_count, 50)
        current_page = page
        total_found = 0

        # Construct Zenodo Elasticsearch query syntax
        q_str = f'"{cleaned_query}"' if " " in cleaned_query and not any(c in cleaned_query for c in [':', 'AND', 'OR']) else cleaned_query
        if year_from and year_to:
            q_str = f"({q_str}) AND publication_date:[{year_from}-01-01 TO {year_to}-12-31]"
        elif year_from:
            q_str = f"({q_str}) AND publication_date:[{year_from}-01-01 TO 2030-12-31]"
        elif year_to:
            q_str = f"({q_str}) AND publication_date:[1900-01-01 TO {year_to}-12-31]"

        headers = dict(DEFAULT_HEADERS)
        params: dict[str, Any] = {
            "q": q_str,
            "size": size,
            "page": current_page,
            "sort": "bestmatch",
        }
        if self.access_token:
            params["access_token"] = self.access_token

        try:
            with httpx.Client(headers=headers, timeout=15.0) as client:
                while len(results) < target_count:
                    params["page"] = current_page
                    params["size"] = min(size, target_count - len(results))

                    resp = client.get(ZENODO_API_URL, params=params)
                    if resp.status_code == 429:
                        logger.warning("Zenodo rate limited (429)")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.RATE_LIMITED,
                            error="HTTP 429 Rate Limited",
                        )
                    if resp.status_code != 200:
                        logger.warning(f"Zenodo responded with status {resp.status_code}")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.ERROR if not results else ProviderStatus.AVAILABLE,
                            error=f"HTTP {resp.status_code}",
                        )

                    data = resp.json()
                    hits_obj = data.get("hits", {})
                    total_found = hits_obj.get("total", len(results))
                    items = hits_obj.get("hits", [])
                    if not items:
                        break

                    for item in items:
                        norm = self._normalize_item(item)
                        if norm:
                            results.append(norm)

                    if len(items) < params["size"]:
                        break
                    current_page += 1

            return ProviderResult(
                source=self.source_name,
                results=results,
                total=total_found or len(results),
                page=page,
                page_size=page_size,
                status=ProviderStatus.AVAILABLE,
            )
        except httpx.TimeoutException:
            logger.warning("Zenodo request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"Zenodo search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_item(self, item: dict) -> Optional[NormalizedPaper]:
        try:
            zenodo_id = item.get("id") or item.get("record_id")
            if not zenodo_id:
                return None

            metadata = item.get("metadata", {})
            title = (metadata.get("title") or "").strip()
            if not title:
                return None

            # Authors / Creators
            creators = metadata.get("creators", [])
            author_names = [c.get("name") for c in creators if c.get("name")]
            authors = ", ".join(author_names[:10]) if author_names else None

            # Description / Abstract
            description = metadata.get("description")
            if description:
                description = re.sub(r"<[^>]+>", "", description).strip()

            # Publication Date & Year
            pub_date = None
            pub_year = None
            pub_date_str = metadata.get("publication_date")
            if pub_date_str:
                try:
                    if len(pub_date_str) >= 4 and pub_date_str[:4].isdigit():
                        pub_year = int(pub_date_str[:4])
                    if len(pub_date_str) >= 10:
                        pub_date = date.fromisoformat(pub_date_str[:10])
                except Exception:
                    pass

            doi = metadata.get("doi")
            doi_url = f"https://doi.org/{doi}" if doi else None

            resource_type = metadata.get("resource_type", {})
            raw_type = resource_type.get("type", "publication")
            doc_type = "publication"
            if raw_type in {"dataset", "software", "poster", "presentation", "lesson", "video", "other"}:
                doc_type = raw_type

            # Open Access & Files
            access_right = metadata.get("access_right", "open")
            is_oa = access_right == "open"
            files = item.get("files", [])
            oa_url = files[0].get("links", {}).get("self") if files and is_oa else None

            keywords_list = metadata.get("keywords") or []
            keywords = ", ".join(keywords_list[:10]) if keywords_list else None

            journal_title = metadata.get("journal", {}).get("title")
            publisher = metadata.get("publisher") or "CERN / Zenodo"

            return NormalizedPaper(
                source=self.source_name,
                source_id=str(zenodo_id),
                title=title,
                abstract=description,
                authors=authors,
                publication_date=pub_date,
                publication_year=pub_year,
                journal_or_conference=journal_title or f"Zenodo {doc_type.title()}",
                keywords=keywords,
                research_domain=keywords_list[0] if keywords_list else "Open Science",
                doi=doi_url,
                citation_count=0,
                publication_link=item.get("links", {}).get("html") or doi_url or f"https://zenodo.org/records/{zenodo_id}",
                open_access_url=oa_url,
                is_open_access=is_oa,
                publisher=publisher,
                document_type=doc_type,
                is_preprint=False,
                source_metadata={"zenodo_id": zenodo_id, "resource_type": resource_type, "access_right": access_right},
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing Zenodo item: {e}")
            return None
