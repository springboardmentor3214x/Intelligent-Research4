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

BASE_API_URL = "https://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


class BaseProvider(BaseResearchProvider):
    source_name = "BASE"

    def __init__(self):
        self.api_key = os.getenv("BASE_API_KEY", "").strip()

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
        hits = min(page_size, target_count, 50)
        offset = (page - 1) * hits
        total_found = 0

        # Construct query with year filtering
        q_str = cleaned_query
        if year_from and year_to:
            q_str = f"({q_str}) AND dcyear:[{year_from} TO {year_to}]"
        elif year_from:
            q_str = f"({q_str}) AND dcyear:[{year_from} TO 2030]"
        elif year_to:
            q_str = f"({q_str}) AND dcyear:[1900 TO {year_to}]"

        params: dict[str, Any] = {
            "func": "PerformSearch",
            "query": q_str,
            "format": "json",
            "hits": hits,
            "offset": offset,
        }
        if self.api_key:
            params["apikey"] = self.api_key

        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=15.0) as client:
                while len(results) < target_count:
                    params["offset"] = offset
                    params["hits"] = min(hits, target_count - len(results))

                    resp = client.get(BASE_API_URL, params=params)
                    if resp.status_code == 429:
                        logger.warning("BASE rate limited (429)")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.RATE_LIMITED,
                            error="HTTP 429 Rate Limited",
                        )
                    if resp.status_code != 200:
                        logger.warning(f"BASE responded with status {resp.status_code}")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.ERROR if not results else ProviderStatus.AVAILABLE,
                            error=f"HTTP {resp.status_code}",
                        )

                    data = resp.json()
                    response_obj = data.get("response", {})
                    total_found = response_obj.get("numFound", len(results))
                    docs = response_obj.get("docs", [])
                    if not docs:
                        break

                    for doc in docs:
                        norm = self._normalize_doc(doc)
                        if norm:
                            results.append(norm)

                    offset += len(docs)
                    if len(docs) < params["hits"]:
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
            logger.warning("BASE request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"BASE search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_doc(self, doc: dict) -> Optional[NormalizedPaper]:
        try:
            base_id = doc.get("dcid") or doc.get("id")
            title_val = doc.get("dctitle")
            title = title_val[0] if isinstance(title_val, list) else title_val
            if not title or not base_id:
                return None

            title = str(title).strip()

            # Authors
            authors_list = doc.get("dccreator") or []
            if isinstance(authors_list, str):
                authors_list = [authors_list]
            authors = ", ".join(authors_list[:10]) if authors_list else None

            # Abstract / Description
            desc_val = doc.get("dcdescription")
            abstract = desc_val[0] if isinstance(desc_val, list) else desc_val
            if abstract:
                abstract = re.sub(r"<[^>]+>", "", str(abstract)).strip()

            # Year & Date
            pub_year = None
            pub_date = None
            year_val = doc.get("dcyear")
            if year_val:
                try:
                    pub_year = int(year_val[0] if isinstance(year_val, list) else year_val)
                except ValueError:
                    pass

            date_val = doc.get("dcdate")
            if date_val:
                try:
                    d_str = str(date_val[0] if isinstance(date_val, list) else date_val)[:10]
                    pub_date = date.fromisoformat(d_str)
                except Exception:
                    pass

            # DOI
            doi = None
            doi_val = doc.get("dcdoi")
            if doi_val:
                raw_doi = doi_val[0] if isinstance(doi_val, list) else doi_val
                doi = f"https://doi.org/{str(raw_doi).replace('https://doi.org/', '').strip()}"

            # Open Access & URLs
            link_val = doc.get("dclink")
            pub_link = link_val[0] if isinstance(link_val, list) else (str(link_val) if link_val else None)
            
            oa_val = doc.get("dcoa")
            is_oa = bool(oa_val == 1 or oa_val == "1" or oa_val == [1])

            # Repository / Publisher
            repo_val = doc.get("dccollection") or doc.get("dcrepository")
            repo = repo_val[0] if isinstance(repo_val, list) else (str(repo_val) if repo_val else None)

            publisher_val = doc.get("dcpublisher")
            publisher = publisher_val[0] if isinstance(publisher_val, list) else (str(publisher_val) if publisher_val else repo)

            # Subjects & Keywords
            subj_val = doc.get("dcsubject") or []
            if isinstance(subj_val, str):
                subj_val = [subj_val]
            keywords = ", ".join(subj_val[:10]) if subj_val else None

            doc_type_val = doc.get("dctype")
            raw_type = doc_type_val[0] if isinstance(doc_type_val, list) else (str(doc_type_val) if doc_type_val else "publication")

            return NormalizedPaper(
                source=self.source_name,
                source_id=str(base_id),
                title=title,
                abstract=abstract,
                authors=authors,
                publication_date=pub_date,
                publication_year=pub_year,
                journal_or_conference=repo or "Institutional Repository",
                keywords=keywords,
                research_domain=subj_val[0] if subj_val else "Academic Repositories",
                doi=doi,
                citation_count=0,
                publication_link=pub_link or doi or f"https://www.base-search.net/Record/{base_id}",
                open_access_url=pub_link if is_oa else None,
                is_open_access=is_oa,
                publisher=publisher,
                document_type=raw_type or "publication",
                is_preprint=False,
                source_metadata={"base_id": base_id, "repository": repo, "dctype": raw_type},
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing BASE item: {e}")
            return None
