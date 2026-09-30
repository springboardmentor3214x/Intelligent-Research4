import logging
import xml.etree.ElementTree as ET
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

PUBMED_ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

# Domain terms where PubMed query is relevant and prioritised
BIOMEDICAL_KEYWORDS = {
    "medical", "medicine", "health", "clinical", "imaging", "mri", "ct", "radiology",
    "cancer", "tumor", "bio", "biotechnology", "genomics", "drug", "disease",
    "pathology", "biomedical", "segmentation", "surgery", "patient", "cellular"
}


def is_biomedical_concept(query: str, concept_terms: List[str]) -> bool:
    all_tokens = " ".join([query] + concept_terms).lower()
    return any(w in all_tokens for w in BIOMEDICAL_KEYWORDS)


class PubMedAdapter(BaseSourceAdapter):
    source_name = "PubMed"
    source_type = SourceType.RESEARCH
    requires_credentials = False

    def fetch_evidence(
        self,
        query: str,
        concept_terms: List[str],
        max_results: int = 40,
        **kwargs,
    ) -> List[RawEvidenceRecord]:
        # Only query PubMed if technology is biomedical/health related
        if not is_biomedical_concept(query, concept_terms):
            return []

        cached = cache_manager.get(self.source_name, query)
        if cached is not None:
            return cached

        records: List[RawEvidenceRecord] = []
        try:
            # 1. Search for PMIDs
            search_params = {
                "db": "pubmed",
                "term": query.strip(),
                "retmax": min(max_results, 40),
                "retmode": "json",
                "sort": "pub_date",
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.get(PUBMED_ESEARCH_URL, params=search_params)
                if res.status_code != 200:
                    return []
                id_list = res.json().get("esearchresult", {}).get("idlist") or []
                if not id_list:
                    cache_manager.set(self.source_name, query, [])
                    return []

                # 2. Fetch summaries for PMIDs
                sum_params = {
                    "db": "pubmed",
                    "id": ",".join(id_list),
                    "retmode": "json",
                }
                sum_res = client.get(PUBMED_ESUMMARY_URL, params=sum_params)
                if sum_res.status_code == 200:
                    results = sum_res.json().get("result", {})
                    for pmid in id_list:
                        item = results.get(pmid)
                        if not item:
                            continue

                        title = item.get("title") or "Untitled Work"
                        pub_date = item.get("pubdate") or ""
                        pub_year = None
                        if pub_date:
                            parts = pub_date.split()
                            if parts and parts[0].isdigit():
                                pub_year = int(parts[0])

                        authors = [a.get("name") for a in item.get("authors") or [] if a.get("name")]
                        doi = None
                        for article_id in item.get("articleids") or []:
                            if article_id.get("idtype") == "doi":
                                doi = article_id.get("value")

                        source_journal = item.get("source")

                        record = RawEvidenceRecord(
                            id=f"pubmed_{pmid}",
                            source=self.source_name,
                            source_record_id=pmid,
                            source_type=self.source_type,
                            title=title,
                            description=None,
                            year=pub_year,
                            exact_date=pub_date,
                            organization=None,
                            authors_or_inventors=", ".join(authors[:8]) if authors else None,
                            doi=doi,
                            pmid=pmid,
                            url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                            domain_or_classification=source_journal,
                            citation_count=0,
                            matching_method=MatchingMethod.HYBRID,
                        )
                        records.append(record)

            cache_manager.set(self.source_name, query, records)
        except Exception as e:
            logger.warning(f"PubMed fetch failed gracefully: {e}")

        return records
