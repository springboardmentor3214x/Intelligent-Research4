from datetime import date
import logging
import re
import time
from typing import Any, Optional
import xml.etree.ElementTree as ET
import httpx

from backend.app.services.providers.base import (
    BaseResearchProvider,
    NormalizedPaper,
    ProviderResult,
    ProviderStatus,
)

logger = logging.getLogger(__name__)

ARXIV_API_URL = "https://export.arxiv.org/api/query"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


class ArxivProvider(BaseResearchProvider):
    source_name = "arXiv"
    _last_request_time: float = 0.0
    _min_request_interval: float = 3.0  # arXiv asks for 3 seconds between requests

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
        max_results = min(page_size, target_count, 100)
        start = (page - 1) * max_results
        total_found = 0

        # Build arXiv search query
        # Support title and abstract search across all categories (cs.AI, cs.LG, cs.CV, physics, math, etc.)
        formatted_q = cleaned_query.replace('"', '').strip()
        search_query = f'all:"{formatted_q}"'

        try:
            # Respect safe pacing for arXiv
            now = time.time()
            elapsed = now - self._last_request_time
            if elapsed < self._min_request_interval:
                time.sleep(self._min_request_interval - elapsed)

            params: dict[str, Any] = {
                "search_query": search_query,
                "start": start,
                "max_results": max_results,
                "sortBy": "relevance",
                "sortOrder": "descending",
            }

            with httpx.Client(headers=DEFAULT_HEADERS, timeout=20.0) as client:
                resp = client.get(ARXIV_API_URL, params=params)
                self.__class__._last_request_time = time.time()

                if resp.status_code == 429:
                    logger.warning("arXiv rate limit reached (429)")
                    return ProviderResult(
                        source=self.source_name,
                        results=[],
                        total=0,
                        status=ProviderStatus.RATE_LIMITED,
                        error="HTTP 429 Rate Limited",
                    )
                if resp.status_code != 200:
                    logger.warning(f"arXiv responded with status {resp.status_code}")
                    return ProviderResult(
                        source=self.source_name,
                        results=[],
                        total=0,
                        status=ProviderStatus.ERROR,
                        error=f"HTTP {resp.status_code}",
                    )

                results, total_found = self._parse_atom_feed(resp.text, year_from, year_to)

            return ProviderResult(
                source=self.source_name,
                results=results,
                total=total_found or len(results),
                page=page,
                page_size=page_size,
                status=ProviderStatus.AVAILABLE,
            )
        except httpx.TimeoutException:
            logger.warning("arXiv request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"arXiv search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _parse_atom_feed(
        self,
        xml_text: str,
        year_from: Optional[int],
        year_to: Optional[int],
    ) -> tuple[list[NormalizedPaper], int]:
        results: list[NormalizedPaper] = []
        total_results = 0

        try:
            root = ET.fromstring(xml_text)
            # Define namespace map for Atom and OpenSearch
            ns = {
                "atom": "http://www.w3.org/2005/Atom",
                "opensearch": "http://a9.com/-/spec/opensearch/1.1/",
                "arxiv": "http://arxiv.org/schemas/atom",
            }

            total_el = root.find("opensearch:totalResults", ns)
            if total_el is not None and total_el.text:
                try:
                    total_results = int(total_el.text.strip())
                except ValueError:
                    total_results = 0

            entries = root.findall("atom:entry", ns)
            for entry in entries:
                id_el = entry.find("atom:id", ns)
                if id_el is None or not id_el.text:
                    continue

                raw_id = id_el.text.strip()
                arxiv_id = raw_id.split("/abs/")[-1] if "/abs/" in raw_id else raw_id

                title_el = entry.find("atom:title", ns)
                raw_title = title_el.text if title_el is not None and title_el.text else "Untitled arXiv Pre-print"
                title = re.sub(r"\s+", " ", raw_title).strip()

                summary_el = entry.find("atom:summary", ns)
                abstract = re.sub(r"\s+", " ", summary_el.text).strip() if summary_el is not None and summary_el.text else None

                # Authors
                author_els = entry.findall("atom:author", ns)
                author_names = []
                for a in author_els:
                    name_el = a.find("atom:name", ns)
                    if name_el is not None and name_el.text:
                        author_names.append(name_el.text.strip())
                authors = ", ".join(author_names) if author_names else None

                # Published date & year
                pub_el = entry.find("atom:published", ns)
                pub_date = None
                pub_year = None
                if pub_el is not None and pub_el.text:
                    try:
                        pub_date = date.fromisoformat(pub_el.text[:10])
                        pub_year = pub_date.year
                    except Exception:
                        pass

                # Filter by year if specified
                if year_from and pub_year and pub_year < year_from:
                    continue
                if year_to and pub_year and pub_year > year_to:
                    continue

                # Categories
                categories = []
                primary_cat = entry.find("arxiv:primary_category", ns)
                if primary_cat is not None:
                    cat_term = primary_cat.attrib.get("term")
                    if cat_term:
                        categories.append(cat_term)

                for cat in entry.findall("atom:category", ns):
                    term = cat.attrib.get("term")
                    if term and term not in categories:
                        categories.append(term)

                keywords = ", ".join(categories) if categories else None
                domain = categories[0] if categories else "Computer Science"

                # Links
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                abs_url = f"https://arxiv.org/abs/{arxiv_id}"

                # DOI
                doi_el = entry.find("arxiv:doi", ns)
                doi = f"https://doi.org/{doi_el.text.strip()}" if doi_el is not None and doi_el.text else None

                paper = NormalizedPaper(
                    source=self.source_name,
                    source_id=arxiv_id,
                    title=title,
                    abstract=abstract,
                    authors=authors,
                    publication_date=pub_date,
                    publication_year=pub_year,
                    journal_or_conference=f"arXiv:{arxiv_id}",
                    keywords=keywords,
                    research_domain=domain,
                    doi=doi,
                    citation_count=0,
                    publication_link=abs_url,
                    open_access_url=pdf_url,
                    is_open_access=True,
                    publisher="arXiv",
                    source_metadata={"arxiv_id": arxiv_id, "categories": categories},
                    provenance_sources=[self.source_name],
                )
                results.append(paper)

        except Exception as e:
            logger.warning(f"Error parsing arXiv XML feed: {e}")

        return results, total_results
