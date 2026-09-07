"""
ISTI Source Adapter (India Science, Technology and Innovation Portal)
Ingests multi-agency institutional programs, international bilateral S&T cooperation, and women in STEM calls.
"""

import logging
from backend.app.services.funding.base import FundingSourceAdapter
from backend.app.services.funding.normalizer import (
    parse_flexible_date,
    normalize_opportunity_record,
)

logger = logging.getLogger(__name__)


class ISTIAdapter(FundingSourceAdapter):
    source_key = "ISTI"

    OFFICIAL_CALLS = [
        {
            "id": "ISTI-INST-2026-01",
            "title": "FIST (Fund for Improvement of S&T Infrastructure in Higher Educational Institutions)",
            "agency": "DST / India Science, Technology and Innovation (ISTI)",
            "description": "Flagship scheme providing modern scientific equipment, high-performance computing clusters, electron microscopes, and advanced laboratories to university departments.",
            "funding_type": "Infrastructure Grant",
            "funding_amount": 30000000.0,  # 3 Cr
            "open_date": "2026-01-01",
            "close_date": "2026-09-30",
            "eligibility": "Academic departments in public and private Indian universities and colleges offering post-graduate science degrees.",
            "funding_category": "Research Infrastructure",
            "research_area": "Higher Education & Research Infrastructure",
            "official_link": "https://www.indiascienceandtechnology.gov.in/funding-opportunities-institutional/fist-scheme",
        },
        {
            "id": "ISTI-WISE-2026-02",
            "title": "WISE-KIRAN Scheme: Women Scientists Fellowship for Societal R&D",
            "agency": "India Science, Technology and Innovation Portal (ISTI)",
            "description": "Fellowship and project grant designed to support women scientists and engineers to pursue research addressing grassroots societal challenges and technology adaptation.",
            "funding_type": "Fellowship & Project Grant",
            "funding_amount": 3500000.0,  # 35 Lakhs
            "open_date": "2026-02-15",
            "close_date": "2026-10-31",
            "eligibility": "Women scientists between 27 and 57 years with PhD or M.Tech degrees.",
            "funding_category": "Women in STEM & Societal R&D",
            "research_area": "Societal Applications & Applied Science",
            "official_link": "https://www.indiascienceandtechnology.gov.in/funding-opportunities-institutional/wise-kiran",
        },
        {
            "id": "ISTI-BILAT-2026-03",
            "title": "Indo-German / Indo-French Joint Scientific Research Cooperation Calls",
            "agency": "ISTI / International Bilateral S&T Cooperation",
            "description": "Bilateral collaborative research grants between Indian investigators and international partner institutes in Artificial Intelligence, Health Technologies, and Climate Modeling.",
            "funding_type": "International Bilateral Grant",
            "funding_amount": 15000000.0,  # 1.5 Cr
            "open_date": "2026-03-01",
            "close_date": "2026-11-30",
            "eligibility": "Joint proposals submitted by Indian and partner country principal investigators.",
            "funding_category": "International Cooperation",
            "research_area": "Multidisciplinary Science & Technology",
            "official_link": "https://www.indiascienceandtechnology.gov.in/funding-opportunities-institutional/bilateral-calls",
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
