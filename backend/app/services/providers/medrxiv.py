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

MEDRXIV_API_BASE = "https://api.biorxiv.org/details/medrxiv"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


class MedRxivProvider(BaseResearchProvider):
    source_name = "medRxiv"

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

        cleaned_query = query.strip().lower()
        q_words = [w for w in re.sub(r"[^\w\s]", "", cleaned_query).split() if len(w) > 2]
        results: list[NormalizedPaper] = []
        cursor = (page - 1) * page_size
        total_found = 0

        start_date = f"{year_from}-01-01" if year_from else "2020-01-01"
        end_date = f"{year_to}-12-31" if year_to else date.today().isoformat()

        url = f"{MEDRXIV_API_BASE}/{start_date}/{end_date}/{cursor}"

        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=18.0) as client:
                resp = client.get(url)
                if resp.status_code == 429:
                    logger.warning("medRxiv rate limited (429)")
                    return ProviderResult(
                        source=self.source_name,
                        results=[],
                        total=0,
                        status=ProviderStatus.RATE_LIMITED,
                        error="HTTP 429 Rate Limited",
                    )
                if resp.status_code != 200:
                    logger.warning(f"medRxiv responded with status {resp.status_code}")
                    return ProviderResult(
                        source=self.source_name,
                        results=[],
                        total=0,
                        status=ProviderStatus.ERROR,
                        error=f"HTTP {resp.status_code}",
                    )

                data = resp.json()
                messages = data.get("messages", [])
                if messages and isinstance(messages, list):
                    total_info = messages[0].get("total")
                    if total_info:
                        try:
                            total_found = int(total_info)
                        except ValueError:
                            total_found = 0

                collection = data.get("collection", [])
                for item in collection:
                    if len(results) >= target_count:
                        break

                    title = (item.get("title") or "").lower()
                    abstract = (item.get("abstract") or "").lower()
                    category = (item.get("category") or "").lower()
                    text_blob = f"{title} {abstract} {category}"

                    if q_words and not any(w in text_blob for w in q_words):
                        continue

                    norm = self._normalize_item(item)
                    if norm:
                        results.append(norm)

            return ProviderResult(
                source=self.source_name,
                results=results,
                total=total_found or len(results),
                page=page,
                page_size=page_size,
                status=ProviderStatus.AVAILABLE,
            )
        except httpx.TimeoutException:
            logger.warning("medRxiv request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"medRxiv search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_item(self, item: dict) -> Optional[NormalizedPaper]:
        try:
            doi = item.get("doi")
            title = (item.get("title") or "").strip()
            if not title:
                return None

            source_id = doi or f"medrxiv-{hash(title)}"
            doi_url = f"https://doi.org/{doi}" if doi else None

            authors = item.get("authors")
            abstract = item.get("abstract")
            if abstract:
                abstract = re.sub(r"<[^>]+>", "", abstract).strip()

            pub_date_str = item.get("date")
            pub_date = None
            pub_year = None
            if pub_date_str:
                try:
                    pub_date = date.fromisoformat(pub_date_str[:10])
                    pub_year = pub_date.year
                except Exception:
                    pass

            category = item.get("category") or "Health & Medical Sciences"
            version = item.get("version", "1")
            pub_link = doi_url or f"https://www.medrxiv.org/content/{doi}v{version}"
            published_doi = item.get("published")

            return NormalizedPaper(
                source=self.source_name,
                source_id=source_id,
                title=title,
                abstract=abstract,
                authors=authors,
                publication_date=pub_date,
                publication_year=pub_year,
                journal_or_conference=f"medRxiv Preprint ({category})",
                keywords=category,
                research_domain=category,
                doi=doi_url,
                citation_count=0,
                publication_link=pub_link,
                open_access_url=f"https://www.medrxiv.org/content/{doi}v{version}.full.pdf" if doi else None,
                is_open_access=True,  # medRxiv preprints are open access
                publisher="Cold Spring Harbor Laboratory / BMJ / Yale",
                document_type="preprint",
                is_preprint=True,  # Explicitly labeled as medical preprint
                source_metadata={
                    "category": category,
                    "version": version,
                    "published_doi": published_doi,
                },
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing medRxiv item: {e}")
            return None
