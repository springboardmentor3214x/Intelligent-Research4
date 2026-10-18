from datetime import date
import logging
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

CROSSREF_WORKS_URL = "https://api.crossref.org/v1/works"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


class CrossrefProvider(BaseResearchProvider):
    source_name = "Crossref"

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
        rows = min(page_size, target_count, 100)
        offset = (page - 1) * rows
        total_found = 0

        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=15.0) as client:
                while len(results) < target_count:
                    params: dict[str, Any] = {
                        "query": cleaned_query,
                        "rows": min(rows, target_count - len(results)),
                        "offset": offset,
                        "mailto": "team@research-intel.org",
                    }
                    filters = []
                    if year_from and year_to:
                        filters.append(f"from-pub-date:{year_from}-01-01,until-pub-date:{year_to}-12-31")
                    elif year_from:
                        filters.append(f"from-pub-date:{year_from}-01-01")
                    elif year_to:
                        filters.append(f"until-pub-date:{year_to}-12-31")

                    if filters:
                        params["filter"] = ",".join(filters)

                    resp = client.get(CROSSREF_WORKS_URL, params=params)
                    if resp.status_code == 429:
                        logger.warning("Crossref rate limited (429)")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.RATE_LIMITED,
                            error="HTTP 429 Rate Limited",
                        )
                    if resp.status_code != 200:
                        logger.warning(f"Crossref responded with HTTP {resp.status_code}")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.ERROR if not results else ProviderStatus.AVAILABLE,
                            error=f"HTTP {resp.status_code}",
                        )

                    data = resp.json()
                    message = data.get("message", {})
                    total_found = message.get("total-results", len(results))
                    items = message.get("items", [])
                    if not items:
                        break

                    for it in items:
                        norm = self._normalize_work(it)
                        if norm:
                            results.append(norm)

                    offset += len(items)
                    if len(items) < params["rows"]:
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
            logger.warning("Crossref request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"Crossref search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_work(self, item: dict) -> Optional[NormalizedPaper]:
        try:
            doi = item.get("DOI")
            title_list = item.get("title") or []
            title = title_list[0] if title_list else None
            if not title:
                return None

            author_entries = item.get("author") or []
            author_names = []
            for a in author_entries:
                given = a.get("given", "")
                family = a.get("family", "")
                full = f"{given} {family}".strip()
                if full:
                    author_names.append(full)
            authors = ", ".join(author_names) if author_names else None

            pub_year = None
            issued = item.get("issued", {}).get("date-parts", [[]])[0]
            if issued and len(issued) >= 1:
                pub_year = issued[0]

            pub_date = None
            if issued and len(issued) >= 3:
                try:
                    pub_date = date(issued[0], issued[1], issued[2])
                except Exception:
                    pub_date = None

            container = item.get("container-title") or []
            journal = container[0] if container else None
            publisher = item.get("publisher")

            abstract = item.get("abstract")
            if abstract:
                abstract = re.sub(r"<[^>]+>", "", abstract).strip()

            subjects = item.get("subject") or []
            keywords = ", ".join(subjects) if subjects else None

            doi_url = f"https://doi.org/{doi}" if doi else None
            source_id = doi or f"crossref-{hash(title)}"

            # Open Access link parsing
            link_entries = item.get("link") or []
            oa_url = None
            for lk in link_entries:
                if lk.get("content-type") == "application/pdf":
                    oa_url = lk.get("URL")
                    break

            return NormalizedPaper(
                source=self.source_name,
                source_id=source_id,
                title=title.strip(),
                abstract=abstract,
                authors=authors,
                publication_date=pub_date,
                publication_year=pub_year,
                journal_or_conference=journal,
                keywords=keywords,
                research_domain=subjects[0] if subjects else "Academic Research",
                doi=doi_url,
                citation_count=item.get("is-referenced-by-count") or 0,
                publication_link=doi_url or item.get("URL"),
                open_access_url=oa_url,
                is_open_access=bool(oa_url or (item.get("license"))),
                publisher=publisher,
                source_metadata={"type": item.get("type")},
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing Crossref item: {e}")
            return None
