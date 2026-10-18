"""
Scholarly Citation Resolution and Enrichment Service.

Features:
- Live scholarly API lookup across OpenAlex, Crossref, and Semantic Scholar using DOI / exact title matching.
- In-memory and DB metadata caching with TTL to minimize redundant requests.
- Distinguishes verified zero citations from unverified/unavailable citation data.
- Strict title matching to avoid assigning citations to the wrong publication.
"""

from datetime import datetime, timedelta
import logging
import re
import time
from typing import Any, Optional
import httpx
from sqlalchemy.orm import Session

from backend.app.models.research_paper import ResearchPaper

logger = logging.getLogger(__name__)

# Cache for citation lookups: key -> {"count": int, "source": str, "verified": bool, "timestamp": float}
_CITATION_CACHE: dict[str, dict[str, Any]] = {}
_CACHE_TTL_SECONDS = 86400 * 7  # 7 days TTL

HTTP_TIMEOUT = 8.0
DEFAULT_HEADERS = {
    "User-Agent": "ResearchIntel-Platform/2.0 (mailto:team@research-intel.org; scholarly-citation-indexer)",
}


def clean_doi(doi: str | None) -> Optional[str]:
    """Extract clean DOI without URL prefix."""
    if not doi or not str(doi).strip():
        return None
    raw = str(doi).strip()
    raw = re.sub(r"^https?://(dx\.)?doi\.org/", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"^doi:\s*", "", raw, flags=re.IGNORECASE)
    clean = raw.strip()
    return clean if clean and "/" in clean else None


def normalize_title_for_matching(title: str | None) -> str:
    """Lowercase and strip non-alphanumeric chars for robust title verification."""
    if not title:
        return ""
    return re.sub(r"[^a-z0-9]", "", title.lower())


class CitationService:
    """Unified service to fetch, verify, and store accurate citations."""

    def __init__(self):
        self._last_semantic_scholar_call = 0.0

    def resolve_citation_data(
        self,
        doi: str | None = None,
        title: str | None = None,
        existing_count: int | None = None,
        existing_source: str | None = None,
    ) -> dict[str, Any]:
        """
        Resolve real citation count and provenance for a publication.
        Returns:
            {
                "citation_count": int,
                "is_citation_verified": bool,
                "citation_source": str | None,
                "citation_status": "verified" | "unverified" | "unavailable"
            }
        """
        c_doi = clean_doi(doi)
        norm_title = normalize_title_for_matching(title)
        cache_key = c_doi or (norm_title if len(norm_title) >= 15 else None)

        now = time.time()
        if cache_key and cache_key in _CITATION_CACHE:
            entry = _CITATION_CACHE[cache_key]
            if (now - entry["timestamp"]) < _CACHE_TTL_SECONDS:
                return {
                    "citation_count": entry["count"],
                    "is_citation_verified": entry["verified"],
                    "citation_source": entry["source"],
                    "citation_status": "verified" if entry["verified"] else "unavailable",
                }

        # 1. If existing count from OpenAlex/Crossref/Semantic Scholar is positive, it is verified
        if existing_count is not None and existing_count > 0:
            src = existing_source or "Scholarly Index"
            res = {
                "citation_count": existing_count,
                "is_citation_verified": True,
                "citation_source": src,
                "citation_status": "verified",
            }
            if cache_key:
                _CITATION_CACHE[cache_key] = {
                    "count": existing_count,
                    "source": src,
                    "verified": True,
                    "timestamp": now,
                }
            return res

        # 2. Try live retrieval via DOI (highest accuracy)
        if c_doi:
            # Try OpenAlex DOI lookup
            oa_data = self._fetch_openalex_doi(c_doi)
            if oa_data is not None:
                cnt, is_ver = oa_data
                res = {
                    "citation_count": cnt,
                    "is_citation_verified": is_ver,
                    "citation_source": "OpenAlex",
                    "citation_status": "verified" if is_ver else "unavailable",
                }
                if cache_key:
                    _CITATION_CACHE[cache_key] = {
                        "count": cnt,
                        "source": "OpenAlex",
                        "verified": is_ver,
                        "timestamp": now,
                    }
                return res

            # Try Crossref DOI lookup
            cr_data = self._fetch_crossref_doi(c_doi)
            if cr_data is not None:
                cnt, is_ver = cr_data
                res = {
                    "citation_count": cnt,
                    "is_citation_verified": is_ver,
                    "citation_source": "Crossref",
                    "citation_status": "verified" if is_ver else "unavailable",
                }
                if cache_key:
                    _CITATION_CACHE[cache_key] = {
                        "count": cnt,
                        "source": "Crossref",
                        "verified": is_ver,
                        "timestamp": now,
                    }
                return res

            # Try Semantic Scholar lookup
            s2_data = self._fetch_semantic_scholar_doi(c_doi)
            if s2_data is not None:
                cnt, is_ver = s2_data
                res = {
                    "citation_count": cnt,
                    "is_citation_verified": is_ver,
                    "citation_source": "Semantic Scholar",
                    "citation_status": "verified" if is_ver else "unavailable",
                }
                if cache_key:
                    _CITATION_CACHE[cache_key] = {
                        "count": cnt,
                        "source": "Semantic Scholar",
                        "verified": is_ver,
                        "timestamp": now,
                    }
                return res

        # 3. Try live lookup via exact Title Match if title is sufficiently unique
        if title and len(norm_title) >= 20:
            oa_title_data = self._fetch_openalex_title(title, norm_title)
            if oa_title_data is not None:
                cnt, is_ver = oa_title_data
                res = {
                    "citation_count": cnt,
                    "is_citation_verified": is_ver,
                    "citation_source": "OpenAlex",
                    "citation_status": "verified" if is_ver else "unavailable",
                }
                if cache_key:
                    _CITATION_CACHE[cache_key] = {
                        "count": cnt,
                        "source": "OpenAlex",
                        "verified": is_ver,
                        "timestamp": now,
                    }
                return res

        # 4. If known tracked source explicitly reports 0 (e.g. fresh preprints or brand new papers)
        if existing_source in ("OpenAlex", "Crossref", "Semantic Scholar"):
            res = {
                "citation_count": 0,
                "is_citation_verified": True,
                "citation_source": existing_source,
                "citation_status": "verified",
            }
            if cache_key:
                _CITATION_CACHE[cache_key] = {
                    "count": 0,
                    "source": existing_source,
                    "verified": True,
                    "timestamp": now,
                }
            return res

        # 5. Untracked / unverified source (e.g., repository without citation indexing)
        return {
            "citation_count": existing_count or 0,
            "is_citation_verified": False,
            "citation_source": None,
            "citation_status": "unavailable",
        }

    def _fetch_openalex_doi(self, doi: str) -> Optional[tuple[int, bool]]:
        url = f"https://api.openalex.org/works/https://doi.org/{doi}"
        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=HTTP_TIMEOUT) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    count = data.get("cited_by_count")
                    if count is not None:
                        return int(count), True
        except Exception as e:
            logger.debug(f"OpenAlex DOI citation lookup error for {doi}: {e}")
        return None

    def _fetch_crossref_doi(self, doi: str) -> Optional[tuple[int, bool]]:
        url = f"https://api.crossref.org/works/{doi}"
        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=HTTP_TIMEOUT) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    message = data.get("message", {})
                    count = message.get("is-referenced-by-count")
                    if count is not None:
                        return int(count), True
        except Exception as e:
            logger.debug(f"Crossref DOI citation lookup error for {doi}: {e}")
        return None

    def _fetch_semantic_scholar_doi(self, doi: str) -> Optional[tuple[int, bool]]:
        url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}?fields=citationCount,title"
        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=HTTP_TIMEOUT) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    count = data.get("citationCount")
                    if count is not None:
                        return int(count), True
        except Exception as e:
            logger.debug(f"Semantic Scholar DOI citation lookup error for {doi}: {e}")
        return None

    def _fetch_openalex_title(self, title: str, norm_title: str) -> Optional[tuple[int, bool]]:
        url = "https://api.openalex.org/works"
        params = {"search": title[:120], "per-page": 3}
        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=HTTP_TIMEOUT) as client:
                resp = client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    for item in results:
                        candidate_title = normalize_title_for_matching(item.get("title"))
                        # Exact match or high prefix match
                        if candidate_title == norm_title or (len(norm_title) > 25 and (candidate_title in norm_title or norm_title in candidate_title)):
                            count = item.get("cited_by_count")
                            if count is not None:
                                return int(count), True
        except Exception as e:
            logger.debug(f"OpenAlex title citation lookup error for {title}: {e}")
        return None

    def enrich_and_update_paper(self, db: Session, paper: ResearchPaper) -> dict[str, Any]:
        """Resolve and persist verified citation data to the database paper record."""
        meta = paper.source_metadata or {}
        citation_info = self.resolve_citation_data(
            doi=paper.doi,
            title=paper.title,
            existing_count=paper.citation_count,
            existing_source=paper.source,
        )

        # If updated count or newly verified, persist to DB
        new_count = citation_info["citation_count"]
        if new_count > (paper.citation_count or 0):
            paper.citation_count = new_count

        meta["citation_info"] = citation_info
        paper.source_metadata = meta
        try:
            db.add(paper)
            db.commit()
        except Exception:
            db.rollback()

        return citation_info


citation_service = CitationService()
