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

OPENALEX_WORKS_URL = "https://api.openalex.org/works"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


def reconstruct_abstract(abstract_inverted_index: dict | None) -> Optional[str]:
    """Convert OpenAlex inverted index into plain-text abstract."""
    if not abstract_inverted_index:
        return None
    try:
        words: list[tuple[int, str]] = []
        for word, positions in abstract_inverted_index.items():
            for pos in positions:
                words.append((pos, word))
        words.sort(key=lambda x: x[0])
        return " ".join(w for _, w in words)
    except Exception:
        return None


class OpenAlexProvider(BaseResearchProvider):
    source_name = "OpenAlex"

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
        current_page = page
        per_page = min(page_size, target_count, 100)
        total_found = 0

        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=15.0) as client:
                while len(results) < target_count:
                    params: dict[str, Any] = {
                        "search": cleaned_query,
                        "per-page": min(per_page, target_count - len(results)),
                        "page": current_page,
                    }
                    filters = []
                    if year_from and year_to:
                        filters.append(f"publication_year:{year_from}-{year_to}")
                    elif year_from:
                        filters.append(f"publication_year:>{year_from - 1}")
                    elif year_to:
                        filters.append(f"publication_year:<{year_to + 1}")

                    if filters:
                        params["filter"] = ",".join(filters)

                    resp = client.get(OPENALEX_WORKS_URL, params=params)
                    if resp.status_code == 429:
                        logger.warning("OpenAlex returned 429 Rate Limited")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.RATE_LIMITED,
                            error="HTTP 429 Rate Limited",
                        )
                    if resp.status_code != 200:
                        logger.warning(f"OpenAlex responded with HTTP {resp.status_code}")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.ERROR if not results else ProviderStatus.AVAILABLE,
                            error=f"HTTP {resp.status_code}",
                        )

                    data = resp.json()
                    meta = data.get("meta", {})
                    total_found = meta.get("count", len(results))
                    works = data.get("results", [])
                    if not works:
                        break

                    for w in works:
                        norm = self._normalize_work(w)
                        if norm:
                            results.append(norm)

                    if len(works) < params["per-page"]:
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
            logger.warning("OpenAlex request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"OpenAlex search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_work(self, work: dict) -> Optional[NormalizedPaper]:
        try:
            openalex_id = work.get("id")
            if not openalex_id:
                return None
            source_id = openalex_id.rstrip("/").split("/")[-1]

            authorships = work.get("authorships") or []
            author_names = []
            for authorship in authorships:
                author = authorship.get("author") or {}
                name = author.get("display_name")
                if name and name not in author_names:
                    author_names.append(name)
            authors = ", ".join(author_names) if author_names else None

            primary_loc = work.get("primary_location") or {}
            source_info = primary_loc.get("source") or {}
            journal = source_info.get("display_name")
            publisher = source_info.get("host_organization_name")

            topics = work.get("topics") or []
            topic_names = [t.get("display_name") for t in topics if t.get("display_name")]
            keywords = ", ".join(topic_names[:10]) if topic_names else None

            domain = None
            if topics:
                domain = (
                    topics[0].get("field", {}).get("display_name")
                    or topics[0].get("domain", {}).get("display_name")
                )

            abstract = reconstruct_abstract(work.get("abstract_inverted_index"))

            pub_date = None
            if work.get("publication_date"):
                try:
                    pub_date = date.fromisoformat(work["publication_date"])
                except Exception:
                    pub_date = None

            raw_doi = work.get("doi")
            doi = f"https://doi.org/{raw_doi.replace('https://doi.org/', '').strip()}" if raw_doi else None

            open_access_info = work.get("open_access") or {}
            is_oa = bool(open_access_info.get("is_oa"))
            oa_url = open_access_info.get("oa_url") or (primary_loc.get("pdf_url") if is_oa else None)

            return NormalizedPaper(
                source=self.source_name,
                source_id=source_id,
                title=(work.get("title") or "Untitled Publication").strip(),
                abstract=abstract,
                authors=authors,
                publication_date=pub_date,
                publication_year=work.get("publication_year"),
                journal_or_conference=journal,
                keywords=keywords,
                research_domain=domain or "Academic Research",
                doi=doi,
                citation_count=work.get("cited_by_count") or 0,
                publication_link=primary_loc.get("landing_page_url") or doi or f"https://openalex.org/{source_id}",
                open_access_url=oa_url,
                is_open_access=is_oa,
                publisher=publisher,
                source_metadata={"openalex_id": openalex_id, "type": work.get("type")},
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing OpenAlex item: {e}")
            return None
