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

EUROPE_PMC_SEARCH_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


class EuropePMCProvider(BaseResearchProvider):
    source_name = "Europe PMC"

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

        # Construct Europe PMC query string
        q_parts = [cleaned_query]
        if year_from and year_to:
            q_parts.append(f"PUB_YEAR:[{year_from} TO {year_to}]")
        elif year_from:
            q_parts.append(f"PUB_YEAR:[{year_from} TO 2030]")
        elif year_to:
            q_parts.append(f"PUB_YEAR:[1900 TO {year_to}]")

        full_query = " AND ".join(q_parts)

        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=15.0) as client:
                while len(results) < target_count:
                    params: dict[str, Any] = {
                        "query": full_query,
                        "format": "json",
                        "pageSize": min(page_size_actual, target_count - len(results)),
                        "page": current_page,
                        "resultType": "core",
                    }

                    resp = client.get(EUROPE_PMC_SEARCH_URL, params=params)
                    if resp.status_code == 429:
                        logger.warning("Europe PMC rate limited (429)")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.RATE_LIMITED,
                            error="HTTP 429 Rate Limited",
                        )
                    if resp.status_code != 200:
                        logger.warning(f"Europe PMC responded with status {resp.status_code}")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.ERROR if not results else ProviderStatus.AVAILABLE,
                            error=f"HTTP {resp.status_code}",
                        )

                    data = resp.json()
                    total_found = data.get("hitCount", len(results))
                    result_list = data.get("resultList", {}).get("result", [])
                    if not result_list:
                        break

                    for item in result_list:
                        norm = self._normalize_item(item)
                        if norm:
                            results.append(norm)

                    if len(result_list) < params["pageSize"]:
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
            logger.warning("Europe PMC request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"Europe PMC search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_item(self, item: dict) -> Optional[NormalizedPaper]:
        try:
            item_id = item.get("id") or item.get("pmid") or item.get("pmcid")
            if not item_id:
                return None

            raw_title = item.get("title") or ""
            title = re.sub(r"<[^>]+>", "", raw_title).strip()
            if not title:
                return None

            abstract = item.get("abstractText")
            if abstract:
                abstract = re.sub(r"<[^>]+>", "", abstract).strip()

            authors = item.get("authorString")

            pub_year = None
            if item.get("pubYear"):
                try:
                    pub_year = int(item["pubYear"])
                except ValueError:
                    pass

            pub_date = None
            if item.get("firstPublicationDate"):
                try:
                    pub_date = date.fromisoformat(item["firstPublicationDate"][:10])
                except Exception:
                    pub_date = None

            journal_info = item.get("journalInfo") or {}
            journal = (journal_info.get("journal") or {}).get("title") or item.get("journalTitle")

            doi = item.get("doi")
            doi_url = f"https://doi.org/{doi}" if doi else None

            is_oa = item.get("isOpenAccess") == "Y" or item.get("inEPMC") == "Y"
            pmcid = item.get("pmcid")
            pmid = item.get("pmid")

            oa_url = None
            if pmcid:
                oa_url = f"https://europepmc.org/articles/{pmcid}"
            elif is_oa and doi:
                oa_url = f"https://doi.org/{doi}"

            citation_count = item.get("citedByCount") or 0
            pub_link = f"https://europepmc.org/article/{item.get('source', 'MED')}/{item_id}"

            # Keywords & mesh headings
            keywords_list = []
            mesh_headings = item.get("meshHeadingList", {}).get("meshHeading", [])
            for mh in mesh_headings:
                if isinstance(mh, dict) and mh.get("descriptorName"):
                    keywords_list.append(mh["descriptorName"])
                elif isinstance(mh, str):
                    keywords_list.append(mh)

            keywords = ", ".join(keywords_list[:10]) if keywords_list else None

            return NormalizedPaper(
                source=self.source_name,
                source_id=str(item_id),
                title=title,
                abstract=abstract,
                authors=authors,
                publication_date=pub_date,
                publication_year=pub_year,
                journal_or_conference=journal,
                keywords=keywords,
                research_domain=keywords_list[0] if keywords_list else "Life Sciences & Biomedicine",
                doi=doi_url,
                citation_count=citation_count,
                publication_link=pub_link,
                open_access_url=oa_url,
                is_open_access=is_oa,
                publisher=journal_info.get("publisher"),
                source_metadata={"pmid": pmid, "pmcid": pmcid, "source": item.get("source")},
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing Europe PMC item: {e}")
            return None
