from datetime import date
import logging
import os
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

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"


class PubMedProvider(BaseResearchProvider):
    source_name = "PubMed"
    _last_request_time: float = 0.0

    def __init__(self):
        self.api_key = os.getenv("NCBI_API_KEY", "").strip()
        self.email = os.getenv("NCBI_EMAIL", "team@research-intel.org").strip()
        self.tool = os.getenv("NCBI_TOOL", "ResearchIntel").strip()
        # Rate limit: 3 requests/sec without key, 10 requests/sec with key
        self._min_interval = 0.12 if self.api_key else 0.38

    def _rate_pace(self):
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self.__class__._last_request_time = time.time()

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
        retmax = min(page_size, target_count, 100)
        retstart = (page - 1) * retmax
        total_found = 0

        # Build term query with dates
        term = cleaned_query
        if year_from and year_to:
            term = f"({term}) AND ({year_from}[pdat] : {year_to}[pdat])"
        elif year_from:
            term = f"({term}) AND ({year_from}[pdat] : 3000[pdat])"
        elif year_to:
            term = f"({term}) AND (1900[pdat] : {year_to}[pdat])"

        headers = {
            "User-Agent": f"{self.tool}/2.0 ({self.email})",
        }

        try:
            # 1. ESearch to retrieve list of PMIDs
            self._rate_pace()
            search_params: dict[str, Any] = {
                "db": "pubmed",
                "term": term,
                "retstart": retstart,
                "retmax": retmax,
                "retmode": "json",
                "sort": "pub_date",
                "email": self.email,
                "tool": self.tool,
            }
            if self.api_key:
                search_params["api_key"] = self.api_key

            with httpx.Client(headers=headers, timeout=18.0) as client:
                search_resp = client.get(ESEARCH_URL, params=search_params)
                if search_resp.status_code == 429:
                    logger.warning("PubMed rate-limited on ESearch (429)")
                    return ProviderResult(
                        source=self.source_name,
                        results=[],
                        total=0,
                        status=ProviderStatus.RATE_LIMITED,
                        error="HTTP 429 Rate Limited",
                    )
                if search_resp.status_code != 200:
                    logger.warning(f"PubMed ESearch responded with status {search_resp.status_code}")
                    return ProviderResult(
                        source=self.source_name,
                        results=[],
                        total=0,
                        status=ProviderStatus.ERROR,
                        error=f"HTTP {search_resp.status_code}",
                    )

                search_data = search_resp.json()
                esearchresult = search_data.get("esearchresult", {})
                total_found = int(esearchresult.get("count", 0))
                id_list = esearchresult.get("idlist", [])
                if not id_list:
                    return ProviderResult(
                        source=self.source_name,
                        results=[],
                        total=0,
                        page=page,
                        page_size=page_size,
                        status=ProviderStatus.AVAILABLE,
                    )

                # 2. Batch EFetch to retrieve structured metadata
                self._rate_pace()
                fetch_params: dict[str, Any] = {
                    "db": "pubmed",
                    "id": ",".join(id_list),
                    "retmode": "xml",
                    "email": self.email,
                    "tool": self.tool,
                }
                if self.api_key:
                    fetch_params["api_key"] = self.api_key

                fetch_resp = client.get(EFETCH_URL, params=fetch_params)
                if fetch_resp.status_code == 429:
                    logger.warning("PubMed rate-limited on EFetch (429)")
                    return ProviderResult(
                        source=self.source_name,
                        results=[],
                        total=total_found,
                        status=ProviderStatus.RATE_LIMITED,
                        error="HTTP 429 Rate Limited",
                    )
                if fetch_resp.status_code != 200:
                    logger.warning(f"PubMed EFetch responded with status {fetch_resp.status_code}")
                    return ProviderResult(
                        source=self.source_name,
                        results=[],
                        total=total_found,
                        status=ProviderStatus.ERROR,
                        error=f"HTTP {fetch_resp.status_code}",
                    )

                results = self._parse_pubmed_xml(fetch_resp.text)

            return ProviderResult(
                source=self.source_name,
                results=results,
                total=total_found or len(results),
                page=page,
                page_size=page_size,
                status=ProviderStatus.AVAILABLE,
            )
        except httpx.TimeoutException:
            logger.warning("PubMed request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"PubMed search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _parse_pubmed_xml(self, xml_text: str) -> list[NormalizedPaper]:
        results: list[NormalizedPaper] = []
        try:
            root = ET.fromstring(xml_text)
            for article in root.findall(".//PubmedArticle"):
                pmid_el = article.find(".//MedlineCitation/PMID")
                pmid = pmid_el.text.strip() if pmid_el is not None and pmid_el.text else None
                if not pmid:
                    continue

                article_el = article.find(".//MedlineCitation/Article")
                if article_el is None:
                    continue

                title_el = article_el.find("ArticleTitle")
                raw_title = title_el.text if title_el is not None and title_el.text else "Untitled PubMed Publication"
                title = re.sub(r"\s+", " ", raw_title).strip().rstrip(".")

                # Abstract
                abstract_parts = []
                abstract_el = article_el.find("Abstract")
                if abstract_el is not None:
                    for text_node in abstract_el.findall("AbstractText"):
                        label = text_node.attrib.get("Label")
                        content = text_node.text or ""
                        if label and content:
                            abstract_parts.append(f"{label}: {content}")
                        elif content:
                            abstract_parts.append(content)
                abstract = " ".join(abstract_parts).strip() if abstract_parts else None

                # Authors
                author_names = []
                author_list_el = article_el.find("AuthorList")
                if author_list_el is not None:
                    for a in author_list_el.findall("Author"):
                        last = a.find("LastName")
                        fore = a.find("ForeName")
                        last_str = last.text.strip() if last is not None and last.text else ""
                        fore_str = fore.text.strip() if fore is not None and fore.text else ""
                        full = f"{fore_str} {last_str}".strip()
                        if full:
                            author_names.append(full)
                authors = ", ".join(author_names) if author_names else None

                # Journal
                journal_el = article_el.find("Journal/Title")
                journal = journal_el.text.strip() if journal_el is not None and journal_el.text else None

                # Publication Date & Year
                pub_year = None
                pub_date = None
                pub_date_el = article_el.find("Journal/JournalIssue/PubDate")
                if pub_date_el is not None:
                    year_el = pub_date_el.find("Year")
                    month_el = pub_date_el.find("Month")
                    day_el = pub_date_el.find("Day")
                    if year_el is not None and year_el.text:
                        try:
                            pub_year = int(year_el.text.strip())
                            month = 1
                            day = 1
                            if month_el is not None and month_el.text and month_el.text.isdigit():
                                month = int(month_el.text.strip())
                            if day_el is not None and day_el.text and day_el.text.isdigit():
                                day = int(day_el.text.strip())
                            pub_date = date(pub_year, month, day)
                        except Exception:
                            pass

                # DOI and Article IDs
                doi = None
                for article_id in article.findall(".//PubmedData/ArticleIdList/ArticleId"):
                    id_type = article_id.attrib.get("IdType")
                    if id_type == "doi" and article_id.text:
                        doi = f"https://doi.org/{article_id.text.strip()}"
                        break

                # MeSH Headings / Keywords
                mesh_terms = []
                for mesh in article.findall(".//MedlineCitation/MeshHeadingList/MeshHeading/DescriptorName"):
                    if mesh.text:
                        mesh_terms.append(mesh.text.strip())
                keywords = ", ".join(mesh_terms[:10]) if mesh_terms else None

                pub_link = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"

                paper = NormalizedPaper(
                    source=self.source_name,
                    source_id=pmid,
                    title=title,
                    abstract=abstract,
                    authors=authors,
                    publication_date=pub_date,
                    publication_year=pub_year,
                    journal_or_conference=journal,
                    keywords=keywords,
                    research_domain=mesh_terms[0] if mesh_terms else "Biomedicine & Healthcare",
                    doi=doi,
                    citation_count=0,
                    publication_link=pub_link,
                    open_access_url=None,
                    is_open_access=False,
                    publisher=None,
                    source_metadata={"pmid": pmid},
                    provenance_sources=[self.source_name],
                )
                results.append(paper)
        except Exception as e:
            logger.warning(f"Error parsing PubMed XML: {e}")

        return results
