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

DOAJ_SEARCH_URL = "https://doaj.org/api/v3/search/articles"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


class DOAJProvider(BaseResearchProvider):
    source_name = "DOAJ"

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
        page_size_actual = min(page_size, target_count, 100)
        current_page = page
        total_found = 0

        # Construct query with year filtering if provided
        q_str = cleaned_query
        if year_from and year_to:
            q_str = f"({q_str}) AND bibjson.year:[{year_from} TO {year_to}]"
        elif year_from:
            q_str = f"({q_str}) AND bibjson.year:[{year_from} TO 2030]"
        elif year_to:
            q_str = f"({q_str}) AND bibjson.year:[1900 TO {year_to}]"

        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=15.0) as client:
                while len(results) < target_count:
                    url = f"{DOAJ_SEARCH_URL}/{q_str}"
                    params: dict[str, Any] = {
                        "page": current_page,
                        "pageSize": min(page_size_actual, target_count - len(results)),
                    }

                    resp = client.get(url, params=params)
                    if resp.status_code == 429:
                        logger.warning("DOAJ rate limited (429)")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.RATE_LIMITED,
                            error="HTTP 429 Rate Limited",
                        )
                    if resp.status_code != 200:
                        logger.warning(f"DOAJ responded with status {resp.status_code}")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.ERROR if not results else ProviderStatus.AVAILABLE,
                            error=f"HTTP {resp.status_code}",
                        )

                    data = resp.json()
                    total_found = data.get("total", len(results))
                    items = data.get("results", [])
                    if not items:
                        break

                    for item in items:
                        norm = self._normalize_item(item)
                        if norm:
                            results.append(norm)

                    if len(items) < params["pageSize"]:
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
            logger.warning("DOAJ request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"DOAJ search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_item(self, item: dict) -> Optional[NormalizedPaper]:
        try:
            doaj_id = item.get("id")
            bibjson = item.get("bibjson", {})
            title = (bibjson.get("title") or "").strip()
            if not title or not doaj_id:
                return None

            # Authors
            authors_list = bibjson.get("author") or []
            author_names = []
            for a in authors_list:
                if isinstance(a, dict) and a.get("name"):
                    author_names.append(a["name"])
            authors = ", ".join(author_names) if author_names else None

            # Year and date
            pub_year = None
            if bibjson.get("year"):
                try:
                    pub_year = int(bibjson["year"])
                except ValueError:
                    pass

            pub_date = None
            if bibjson.get("month") and pub_year:
                try:
                    pub_date = date(pub_year, int(bibjson["month"]), 1)
                except Exception:
                    pub_date = None

            # Journal and publisher
            journal_info = bibjson.get("journal", {})
            journal = journal_info.get("title")
            publisher = journal_info.get("publisher") or bibjson.get("publisher")

            # Identifiers
            doi = None
            for ident in bibjson.get("identifier", []):
                if ident.get("type") == "doi":
                    raw_doi = ident.get("id")
                    if raw_doi:
                        doi = f"https://doi.org/{raw_doi.replace('https://doi.org/', '').strip()}"
                    break

            # Links & Open Access URL
            links = bibjson.get("link", [])
            oa_url = None
            for lk in links:
                if lk.get("type") == "fulltext":
                    oa_url = lk.get("url")
                    break
            if not oa_url and links:
                oa_url = links[0].get("url")

            # Keywords & Subjects
            keywords_list = bibjson.get("keywords") or []
            subject_list = [s.get("term") for s in bibjson.get("subject", []) if s.get("term")]
            all_topics = keywords_list + subject_list
            keywords = ", ".join(all_topics[:10]) if all_topics else None

            domain = subject_list[0] if subject_list else (keywords_list[0] if keywords_list else "Open Access Research")

            return NormalizedPaper(
                source=self.source_name,
                source_id=str(doaj_id),
                title=title,
                abstract=bibjson.get("abstract"),
                authors=authors,
                publication_date=pub_date,
                publication_year=pub_year,
                journal_or_conference=journal,
                keywords=keywords,
                research_domain=domain,
                doi=doi,
                citation_count=0,
                publication_link=oa_url or doi or f"https://doaj.org/article/{doaj_id}",
                open_access_url=oa_url,
                is_open_access=True,  # All DOAJ papers are open access
                publisher=publisher,
                source_metadata={"doaj_id": doaj_id, "journal": journal_info},
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing DOAJ item: {e}")
            return None
