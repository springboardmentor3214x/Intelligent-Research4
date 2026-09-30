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

PATENTSVIEW_API_URL = "https://search.patentsview.org/api/v1/patent/"


class PatentsViewAdapter(BaseSourceAdapter):
    source_name = "PatentsView"
    source_type = SourceType.PATENT
    requires_credentials = False

    def __init__(self):
        self.api_key = os.getenv("PATENTSVIEW_API_KEY", "").strip()

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
        headers = {}
        if self.api_key:
            headers["X-Api-Key"] = self.api_key

        try:
            # PatentsView Query: searching patent_title or patent_abstract
            query_payload = {
                "q": {
                    "_or": [
                        {"_text_any": {"patent_title": query.strip()}},
                        {"_text_any": {"patent_abstract": query.strip()}},
                    ]
                },
                "f": ["patent_id", "patent_title", "patent_abstract", "patent_date", "assignees", "inventors", "cpc_current"],
                "o": {"size": min(max_results, 30)},
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.post(PATENTSVIEW_API_URL, json=query_payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    patents = data.get("patents") or []
                    for p in patents:
                        pid = p.get("patent_id") or ""
                        title = p.get("patent_title") or "Untitled Patent"
                        abstract = p.get("patent_abstract")
                        p_date = p.get("patent_date")
                        pub_year = int(p_date[:4]) if p_date and len(p_date) >= 4 and p_date[:4].isdigit() else None

                        assignees = [a.get("assignee_organization") or f"{a.get('assignee_first_name', '')} {a.get('assignee_last_name', '')}".strip() for a in p.get("assignees") or []]
                        primary_org = assignees[0] if assignees and assignees[0] else None

                        inventors = [f"{i.get('inventor_first_name', '')} {i.get('inventor_last_name', '')}".strip() for i in p.get("inventors") or []]

                        cpc_list = [c.get("cpc_subclass_id") for c in p.get("cpc_current") or [] if c.get("cpc_subclass_id")]
                        cpc_class = ", ".join(list(dict.fromkeys(cpc_list))[:3]) if cpc_list else None

                        record = RawEvidenceRecord(
                            id=f"patentsview_{pid}",
                            source=self.source_name,
                            source_record_id=pid,
                            source_type=self.source_type,
                            title=title,
                            description=abstract,
                            year=pub_year,
                            exact_date=p_date,
                            organization=primary_org,
                            authors_or_inventors=", ".join(inventors[:6]) if inventors else None,
                            patent_number=f"US{pid}",
                            url=f"https://patents.google.com/patent/US{pid}/en",
                            domain_or_classification=cpc_class,
                            citation_count=0,
                            matching_method=MatchingMethod.HYBRID,
                        )
                        records.append(record)

            cache_manager.set(self.source_name, query, records)
        except Exception as e:
            # Cache empty records for this query so subsequent calls and related concepts don't retry and stall
            cache_manager.set(self.source_name, query, [])
            logger.debug(f"PatentsView endpoint unreachable ({e}). Relying on IP India, EPO, and local databases.")

        return records
