from datetime import date
import logging
import os
import re
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

OPENAIRE_API_URL = "https://api.openaire.eu/search/researchProducts"
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; academic-research)",
}


class OpenAIREProvider(BaseResearchProvider):
    source_name = "OpenAIRE"

    def __init__(self):
        self.api_key = os.getenv("OPENAIRE_API_KEY", "").strip()

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
        size = min(page_size, target_count, 50)
        current_page = page
        total_found = 0

        headers = dict(DEFAULT_HEADERS)
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            with httpx.Client(headers=headers, timeout=15.0) as client:
                while len(results) < target_count:
                    params: dict[str, Any] = {
                        "keywords": cleaned_query,
                        "size": min(size, target_count - len(results)),
                        "page": current_page,
                        "format": "json",
                        "type": "publications",
                    }
                    if year_from and year_to:
                        params["fromDateAccepted"] = f"{year_from}-01-01"
                        params["toDateAccepted"] = f"{year_to}-12-31"
                    elif year_from:
                        params["fromDateAccepted"] = f"{year_from}-01-01"
                    elif year_to:
                        params["toDateAccepted"] = f"{year_to}-12-31"

                    resp = client.get(OPENAIRE_API_URL, params=params)
                    if resp.status_code == 429:
                        logger.warning("OpenAIRE rate limited (429)")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.RATE_LIMITED,
                            error="HTTP 429 Rate Limited",
                        )
                    if resp.status_code != 200:
                        logger.warning(f"OpenAIRE responded with HTTP {resp.status_code}")
                        return ProviderResult(
                            source=self.source_name,
                            results=results,
                            total=total_found,
                            status=ProviderStatus.ERROR if not results else ProviderStatus.AVAILABLE,
                            error=f"HTTP {resp.status_code}",
                        )

                    data = resp.json()
                    response_obj = data.get("response", {})
                    header_obj = response_obj.get("header", {})
                    total_info = header_obj.get("total", {})
                    total_found = int(total_info.get("$", len(results))) if isinstance(total_info, dict) else len(results)

                    results_data = response_obj.get("results", {}).get("result") or []
                    if isinstance(results_data, dict):
                        results_data = [results_data]

                    if not results_data:
                        break

                    for res in results_data:
                        norm = self._normalize_item(res)
                        if norm:
                            results.append(norm)

                    if len(results_data) < params["size"]:
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
            logger.warning("OpenAIRE request timed out")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.TIMEOUT,
                error="Request timed out",
            )
        except Exception as e:
            logger.warning(f"OpenAIRE search error: {e}")
            return ProviderResult(
                source=self.source_name,
                results=results,
                total=len(results),
                status=ProviderStatus.ERROR,
                error=str(e),
            )

    def _normalize_item(self, res: dict) -> Optional[NormalizedPaper]:
        try:
            meta = res.get("metadata", {}).get("oaf:entity", {}).get("oaf:result", {})
            if not meta:
                return None

            title_obj = meta.get("title")
            title = ""
            if isinstance(title_obj, dict):
                title = title_obj.get("$", "")
            elif isinstance(title_obj, list) and title_obj:
                title = title_obj[0].get("$", "") if isinstance(title_obj[0], dict) else str(title_obj[0])
            elif isinstance(title_obj, str):
                title = title_obj

            if not title:
                return None

            # DOI & PIDs
            pid_obj = meta.get("pid") or []
            if isinstance(pid_obj, dict):
                pid_obj = [pid_obj]
            doi = None
            for p in pid_obj:
                if isinstance(p, dict) and p.get("@classid") == "doi":
                    raw_doi = p.get("$")
                    if raw_doi:
                        doi = f"https://doi.org/{raw_doi.replace('https://doi.org/', '').strip()}"

            # Publication Date & Year
            pub_year = None
            pub_date = None
            date_str = meta.get("dateofacceptance", {})
            if isinstance(date_str, dict):
                date_val = date_str.get("$", "")
                if len(date_val) >= 4 and date_val[:4].isdigit():
                    try:
                        pub_year = int(date_val[:4])
                        if len(date_val) >= 10:
                            pub_date = date.fromisoformat(date_val[:10])
                    except Exception:
                        pass

            # Authors
            author_names = []
            creator_obj = meta.get("creator") or []
            if isinstance(creator_obj, dict):
                creator_obj = [creator_obj]
            for c in creator_obj:
                if isinstance(c, dict) and c.get("$"):
                    author_names.append(c.get("$"))
            authors = ", ".join(author_names[:10]) if author_names else None

            # Abstract / Description
            desc_obj = meta.get("description") or []
            abstract = None
            if isinstance(desc_obj, dict):
                abstract = desc_obj.get("$")
            elif isinstance(desc_obj, list) and desc_obj:
                abstract = desc_obj[0].get("$") if isinstance(desc_obj[0], dict) else str(desc_obj[0])
            elif isinstance(desc_obj, str):
                abstract = desc_obj
            if abstract:
                abstract = re.sub(r"<[^>]+>", "", abstract).strip()

            # Journal / Venue & Publisher
            journal_obj = meta.get("journal", {})
            journal = journal_obj.get("$") if isinstance(journal_obj, dict) else (str(journal_obj) if journal_obj else None)
            pub_obj = meta.get("publisher", {})
            publisher = pub_obj.get("$") if isinstance(pub_obj, dict) else (str(pub_obj) if pub_obj else None)

            # Open Access & Links
            best_access = meta.get("bestaccessright", {})
            is_oa = False
            if isinstance(best_access, dict):
                is_oa = "open" in best_access.get("@classid", "").lower()

            header = res.get("header", {})
            obj_id = header.get("dri:objIdentifier", {}).get("$") or str(hash(title))
            pub_link = f"https://explore.openaire.eu/search/publication?pid={doi}" if doi else f"https://explore.openaire.eu/search/publication?id={obj_id}"

            # Keywords & Subjects
            subjects = []
            subj_obj = meta.get("subject") or []
            if isinstance(subj_obj, dict):
                subj_obj = [subj_obj]
            for s in subj_obj:
                if isinstance(s, dict) and s.get("$"):
                    subjects.append(s.get("$"))
            keywords = ", ".join(subjects[:10]) if subjects else None

            result_type = meta.get("resulttype", {}).get("@classid", "publication")

            return NormalizedPaper(
                source=self.source_name,
                source_id=str(obj_id),
                title=title.strip(),
                abstract=abstract,
                authors=authors,
                publication_date=pub_date,
                publication_year=pub_year,
                journal_or_conference=journal,
                keywords=keywords,
                research_domain=subjects[0] if subjects else "European Research",
                doi=doi,
                citation_count=0,
                publication_link=pub_link,
                open_access_url=doi if is_oa else None,
                is_open_access=is_oa,
                publisher=publisher,
                document_type=result_type or "publication",
                is_preprint=False,
                source_metadata={"openaire_id": obj_id, "type": result_type},
                provenance_sources=[self.source_name],
            )
        except Exception as e:
            logger.warning(f"Error normalizing OpenAIRE item: {e}")
            return None
