from datetime import date
import logging
import os
from typing import Any, Optional
import httpx

from backend.app.services.providers.base import (
    BaseResearchProvider,
    NormalizedPaper,
    ProviderResult,
    ProviderStatus,
)

logger = logging.getLogger(__name__)

SEMANTIC_SCHOLAR_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


class SemanticScholarProvider(BaseResearchProvider):
    source_name = "Semantic Scholar"

    def __init__(self):
        self.api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "").strip()

    def is_configured(self) -> bool:
        return True  # Works without key, but with stricter rate limits

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
        limit = min(page_size, target_count, 100)
        offset = (page - 1) * limit
        total_found = 0

        headers = dict(DEFAULT_HEADERS)
        if self.api_key:
            headers["x-api-key"] = self.api_key

        try:
            with httpx.Client(headers=headers, timeout=12.0) as client:
                while len(results) < target_count:
                    params: dict[str, Any] = {
                        "query": cleaned_query,
                        "limit": min(limit, target_count - len(results)),
                        "offset": offset,
                        "fields": "paperId,title,abstract,authors,year,publicationDate,journal,venue,externalIds,citationCount,url,fieldsOfStudy,isOpenAccess,openAccessPdf",
                    }
                    if year_from and year_to:
                        params["year"] = f"{year_from}-{year_to}"
                    elif year_from:
                        params["year"] = f"{year_from}-"
                    elif year_to:
                        params["year"] = f"-{year_to}"

                    resp = client.get(SEMANTIC_SCHOLAR_SEARCH_URL, params=params)
                    if resp.status_code in (429, 403):
                        logger.warning(f"Semantic Scholar rate-limited ({resp.status_code})")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found or len(results),
                            status=ProviderStatus.RATE_LIMITED,
                            error=f"HTTP {resp.status_code} Rate Limited",
                        )
                    if resp.status_code != 200:
                        logger.warning(f"Semantic Scholar responded with status {resp.status_code}")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found or len(results),
                            status=ProviderStatus.ERROR if not results else ProviderStatus.AVAILABLE,
                            error=f"HTTP {resp.status_code}",
                        )

                    data = resp.json()
                    total_found = data.get("total", len(results))
                    papers = data.get("data", [])
                    if not papers:
                        break

                    for p in papers:
                        norm = self._normalize_paper(p)
                        if norm:
                            results.append(norm)

                    offset += len(papers)
                    if len(papers) < params["limit"]:
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
            logger.warning("Semantic Scholar request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"Semantic Scholar search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_paper(self, paper: dict) -> Optional[NormalizedPaper]:
        try:
            paper_id = paper.get("paperId")
            if not paper_id:
                return None

            title = (paper.get("title") or "").strip()
            if not title:
                return None

            authors = paper.get("authors") or []
            author_names = [a.get("name") for a in authors if a.get("name")]
            author_text = ", ".join(author_names) if author_names else None

            pub_date = None
            if paper.get("publicationDate"):
                try:
                    pub_date = date.fromisoformat(paper["publicationDate"])
                except Exception:
                    pub_date = None

            external_ids = paper.get("externalIds") or {}
            raw_doi = external_ids.get("DOI")
            doi_url = f"https://doi.org/{raw_doi}" if raw_doi else None

            fields_of_study = paper.get("fieldsOfStudy") or []
            research_domain = fields_of_study[0] if fields_of_study else "Computer Science"

            oa_pdf = paper.get("openAccessPdf") or {}
            oa_url = oa_pdf.get("url")
            is_oa = bool(paper.get("isOpenAccess") or oa_url)

            return NormalizedPaper(
                source=self.source_name,
                source_id=paper_id,
                title=title,
                abstract=paper.get("abstract"),
                authors=author_text,
                publication_date=pub_date,
                publication_year=paper.get("year"),
                journal_or_conference=(paper.get("journal") or {}).get("name") or paper.get("venue"),
                keywords=", ".join(fields_of_study) if fields_of_study else None,
                research_domain=research_domain,
                doi=doi_url,
                citation_count=paper.get("citationCount") or 0,
                publication_link=paper.get("url") or doi_url or f"https://www.semanticscholar.org/paper/{paper_id}",
                open_access_url=oa_url,
                is_open_access=is_oa,
                publisher=(paper.get("journal") or {}).get("name"),
                source_metadata={"paperId": paper_id, "externalIds": external_ids},
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing Semantic Scholar item: {e}")
            return None
