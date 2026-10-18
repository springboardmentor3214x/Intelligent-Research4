import logging
from typing import List, Optional
import httpx

from backend.app.services.sources.base_source import (
    BaseSourceAdapter,
    MatchingMethod,
    RawEvidenceRecord,
    SourceType,
)
from backend.app.services.sources.cache_manager import cache_manager

logger = logging.getLogger(__name__)

NIH_REPORTER_API_URL = "https://api.reporter.nih.gov/v2/projects/search"


class NIHReporterAdapter(BaseSourceAdapter):
    source_name = "NIH RePORTER"
    source_type = SourceType.FUNDING
    requires_credentials = False

    def fetch_evidence(
        self,
        query: str,
        concept_terms: List[str],
        max_results: int = 30,
        **kwargs,
    ) -> List[RawEvidenceRecord]:
        cached = cache_manager.get(self.source_name, query)
        if cached is not None:
            return cached

        records: List[RawEvidenceRecord] = []
        try:
            payload = {
                "criteria": {
                    "advanced_text_search": {
                        "operator": "advanced",
                        "search_field": "terms",
                        "search_text": query.strip(),
                    }
                },
                "offset": 0,
                "limit": min(max_results, 30),
                "sort_field": "fiscal_year",
                "sort_order": "desc",
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.post(NIH_REPORTER_API_URL, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("results") or []
                    for item in results:
                        appl_id = str(item.get("appl_id") or item.get("project_num") or "")
                        title = item.get("project_title") or "Untitled NIH Grant"
                        abstract = item.get("abstract_text")
                        fiscal_year = item.get("fiscal_year")
                        org_name = item.get("org_name")
                        funding_amount = item.get("award_amount")
                        pis = [p.get("first_name", "") + " " + p.get("last_name", "") for p in item.get("principal_investigators") or []]

                        record = RawEvidenceRecord(
                            id=f"nih_{appl_id}",
                            source=self.source_name,
                            source_record_id=appl_id,
                            source_type=self.source_type,
                            title=title,
                            description=abstract,
                            year=fiscal_year,
                            organization=org_name,
                            authors_or_inventors=", ".join(pis[:4]) if pis else None,
                            url=f"https://reporter.nih.gov/project-details/{appl_id}",
                            funding_amount=float(funding_amount) if funding_amount else None,
                            domain_or_classification=item.get("agency_ic_admin", {}).get("name") if isinstance(item.get("agency_ic_admin"), dict) else None,
                            matching_method=MatchingMethod.HYBRID,
                        )
                        records.append(record)

            cache_manager.set(self.source_name, query, records)
        except Exception as e:
            logger.warning(f"NIH RePORTER fetch failed gracefully: {e}")

        return records
