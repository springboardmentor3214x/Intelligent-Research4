import os
import logging
from typing import List, Optional
import httpx

from backend.app.services.sources.base_source import (
    BaseSourceAdapter,
    MatchingMethod,
    RawEvidenceRecord,
    SourceStatus,
    SourceStatusReport,
    SourceType,
)
from backend.app.services.sources.cache_manager import cache_manager

logger = logging.getLogger(__name__)

CORDIS_SEARCH_URL = "https://cordis.europa.eu/api/projects/search"


class CORDISAdapter(BaseSourceAdapter):
    source_name = "CORDIS"
    source_type = SourceType.FUNDING
    requires_credentials = False

    def fetch_evidence(
        self,
        query: str,
        concept_terms: List[str],
        max_results: int = 20,
        **kwargs,
    ) -> List[RawEvidenceRecord]:
        cached = cache_manager.get(self.source_name, query)
        if cached is not None:
            return cached

        records: List[RawEvidenceRecord] = []
        try:
            params = {
                "q": f"contenttype='project' AND '{query.strip()}'",
                "format": "json",
                "p": 1,
                "num": min(max_results, 20),
            }
            with httpx.Client(timeout=8.0) as client:
                res = client.get(CORDIS_SEARCH_URL, params=params)
                if res.status_code == 200:
                    data = res.json()
                    projects = data.get("payload", {}).get("results") or []
                    for proj in projects:
                        rcn = str(proj.get("rcn") or proj.get("id") or "")
                        title = proj.get("title") or "Untitled CORDIS Project"
                        teaser = proj.get("teaser") or proj.get("objective")
                        start_date = proj.get("startDate")
                        start_year = int(start_date[:4]) if start_date and len(start_date) >= 4 and start_date[:4].isdigit() else None
                        org = proj.get("coordinatorCountry")

                        record = RawEvidenceRecord(
                            id=f"cordis_{rcn}",
                            source=self.source_name,
                            source_record_id=rcn,
                            source_type=self.source_type,
                            title=title,
                            description=teaser,
                            year=start_year,
                            organization=org,
                            url=f"https://cordis.europa.eu/project/id/{rcn}",
                            matching_method=MatchingMethod.HYBRID,
                        )
                        records.append(record)

            cache_manager.set(self.source_name, query, records)
        except Exception as e:
            logger.warning(f"CORDIS fetch failed gracefully: {e}")

        return records
