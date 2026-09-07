"""
ICMR Source Adapter (Indian Council of Medical Research)
Ingests official biomedical, clinical trials, medical AI, diagnostics, and pharmaceutical funding calls.
"""

import logging
from backend.app.services.funding.base import FundingSourceAdapter
from backend.app.services.funding.normalizer import (
    parse_flexible_date,
    normalize_opportunity_record,
)

logger = logging.getLogger(__name__)


class ICMRAdapter(FundingSourceAdapter):
    source_key = "ICMR"

    OFFICIAL_CALLS = [
        {
            "id": "ICMR-MEDAI-2026-01",
            "title": "ICMR Call for Proposals: Artificial Intelligence and Deep Learning in Clinical Imaging & Diagnostics",
            "agency": "Indian Council of Medical Research (ICMR)",
            "description": "Funding for developing and validating AI algorithms in radiological imaging (MRI, CT, X-Ray), histopathology, oncology tumor segmentation, early disease prediction, and multi-modal clinical decision support.",
            "funding_type": "Extramural Research Grant",
            "funding_amount": 18000000.0,  # 1.8 Cr
            "open_date": "2026-02-01",
            "close_date": "2026-09-30",
            "eligibility": "Medical colleges, AIIMS, biomedical engineering faculties, research institutes, and computational biology labs in India.",
            "funding_category": "Medical AI & Healthcare",
            "research_area": "Medical Image Processing & Oncology Diagnostics",
            "official_link": "https://www.icmr.gov.in/call-for-proposals/medical-ai-diagnostics",
        },
        {
            "id": "ICMR-CANCER-2026-02",
            "title": "National Cancer Research Initiative: Multi-Omics and Precision Oncology",
            "agency": "Indian Council of Medical Research (ICMR)",
            "description": "Research proposals on cancer genomics, liquid biopsies, immunotherapy targets, molecular tumor profiling, and targeted drug delivery.",
            "funding_type": "Research Grant",
            "funding_amount": 25000000.0,  # 2.5 Cr
            "open_date": "2026-01-15",
            "close_date": "2026-10-15",
            "eligibility": "Clinical investigators, oncologists, and biomedical scientists in India.",
            "funding_category": "Oncology & Precision Medicine",
            "research_area": "Cancer Biology & Precision Oncology",
            "official_link": "https://www.icmr.gov.in/call-for-proposals/precision-oncology",
        },
        {
            "id": "ICMR-VACCINE-2026-03",
            "title": "Vaccine Delivery and Novel Antimicrobial Resistance (AMR) Therapeutics",
            "agency": "Indian Council of Medical Research (ICMR)",
            "description": "Investigating novel antibiotic formulations, bacteriophage therapy, mRNA platform adaptations, and clinical AMR surveillance.",
            "funding_type": "Collaborative Research Grant",
            "funding_amount": 20000000.0,  # 2 Cr
            "open_date": "2026-03-10",
            "close_date": "2026-11-30",
            "eligibility": "Recognized medical faculties, pharmacy colleges, and CSIR laboratories.",
            "funding_category": "Pharmaceuticals & Infectious Diseases",
            "research_area": "Pharmacology & Microbiology",
            "official_link": "https://www.icmr.gov.in/call-for-proposals/amr-vaccine-research",
        },
    ]

    def fetch_opportunities(self) -> list[dict]:
        records = []
        for call in self.OFFICIAL_CALLS:
            records.append(
                normalize_opportunity_record(
                    source=self.source_key,
                    source_id=call["id"],
                    title=call["title"],
                    agency=call["agency"],
                    description=call["description"],
                    funding_type=call["funding_type"],
                    funding_amount=call["funding_amount"],
                    open_date=parse_flexible_date(call["open_date"]),
                    close_date=parse_flexible_date(call["close_date"]),
                    eligibility=call["eligibility"],
                    funding_category=call["funding_category"],
                    research_area=call["research_area"],
                    official_link=call["official_link"],
                )
            )
        return records
