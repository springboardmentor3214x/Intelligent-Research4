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

CORE_SEARCH_URL = "https://api.core.ac.uk/v3/search/works"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (academic-research)",
}


class CoreProvider(BaseResearchProvider):
    source_name = "CORE"

    def __init__(self):
        self.api_key = os.getenv("CORE_API_KEY", "").strip()

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def get_health_status(self) -> ProviderStatus:
        if not self.is_configured():
            return ProviderStatus.NOT_CONFIGURED
        return ProviderStatus.AVAILABLE

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
        if not self.is_configured():
            logger.info("CORE_API_KEY is not configured; skipping CORE search")
            return ProviderResult(
                source=self.source_name,
                results=[],
                total=0,
                status=ProviderStatus.NOT_CONFIGURED,
                error="CORE_API_KEY is not configured in .env",
            )

        if not query or not query.strip():
            return ProviderResult(source=self.source_name, results=[], total=0, status=ProviderStatus.AVAILABLE)

        cleaned_query = query.strip()
        results: list[NormalizedPaper] = []
        limit = min(page_size, target_count, 100)
        offset = (page - 1) * limit
        total_found = 0

        headers = dict(DEFAULT_HEADERS)
        headers["Authorization"] = f"Bearer {self.api_key}"

        # Construct CORE query syntax if year filters provided
        q_str = f'"{cleaned_query}"' if " " in cleaned_query and not any(c in cleaned_query for c in [':', 'AND', 'OR']) else cleaned_query
        if year_from and year_to:
            q_str = f"({q_str}) AND yearPublished>={year_from} AND yearPublished<={year_to}"
        elif year_from:
            q_str = f"({q_str}) AND yearPublished>={year_from}"
        elif year_to:
            q_str = f"({q_str}) AND yearPublished<={year_to}"

        try:
            with httpx.Client(headers=headers, timeout=15.0) as client:
                while len(results) < target_count:
                    params: dict[str, Any] = {
                        "q": q_str,
                        "limit": min(limit, target_count - len(results)),
                        "offset": offset,
                    }

                    resp = client.get(CORE_SEARCH_URL, params=params)
                    if resp.status_code == 401 or resp.status_code == 403:
                        logger.warning("CORE API key invalid or unauthorized")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.NOT_CONFIGURED,
                            error="Invalid CORE API key or unauthorized",
                        )
                    if resp.status_code == 429:
                        logger.warning("CORE rate limit reached (429)")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.RATE_LIMITED,
                            error="HTTP 429 Rate Limited",
                        )
                    if resp.status_code != 200:
                        logger.warning(f"CORE responded with status {resp.status_code}")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.ERROR if not results else ProviderStatus.AVAILABLE,
                            error=f"HTTP {resp.status_code}",
                        )

                    data = resp.json()
                    total_found = data.get("totalHits", len(results))
                    items = data.get("results", [])
                    if not items:
                        break

                    for item in items:
                        norm = self._normalize_item(item)
                        if norm:
                            results.append(norm)

                    offset += len(items)
                    if len(items) < params["limit"]:
                        break

            return ProviderResult(
                source=self.source_name,
                results=results,
                total=total_found or len(results),
                page=page,
                page_size=page_size,
                status=ProviderStatus.AVAILABLE,
            )
        except httpx.TimeoutException:
            logger.warning("CORE request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"CORE search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_item(self, item: dict) -> Optional[NormalizedPaper]:
        try:
            core_id = item.get("id")
            if not core_id:
                return None

            title = (item.get("title") or "").strip()
            if not title:
                return None

            authors_list = item.get("authors") or []
            author_names = []
            for a in authors_list:
                if isinstance(a, dict) and a.get("name"):
                    author_names.append(a["name"])
                elif isinstance(a, str) and a.strip():
                    author_names.append(a.strip())
            authors = ", ".join(author_names) if author_names else None

            pub_year = item.get("yearPublished")
            pub_date = None
            if item.get("publishedDate"):
                try:
                    pub_date = date.fromisoformat(item["publishedDate"][:10])
                except Exception:
                    pub_date = None

            doi = item.get("doi")
            doi_url = f"https://doi.org/{doi}" if doi else None

            download_url = item.get("downloadUrl")
            links = item.get("links") or []
            oa_url = download_url or (links[0].get("url") if links else None)

            journals = item.get("journals") or []
            journal = journals[0].get("title") if journals and isinstance(journals[0], dict) else None

            publisher = item.get("publisher")
            topics = item.get("topics") or []
            keywords = ", ".join(topics[:10]) if topics else None

            citation_count = item.get("citationCount") or 0

            return NormalizedPaper(
                source=self.source_name,
                source_id=str(core_id),
                title=title,
                abstract=item.get("abstract"),
                authors=authors,
                publication_date=pub_date,
                publication_year=pub_year,
                journal_or_conference=journal or (item.get("fieldOfStudy")),
                keywords=keywords,
                research_domain=topics[0] if topics else "Academic Research",
                doi=doi_url,
                citation_count=citation_count,
                publication_link=oa_url or doi_url or f"https://core.ac.uk/works/{core_id}",
                open_access_url=oa_url,
                is_open_access=bool(oa_url or download_url),
                publisher=publisher,
                source_metadata={"core_id": core_id, "dataProviders": item.get("dataProviders")},
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing CORE item: {e}")
            return None
