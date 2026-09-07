"""
ANRF Source Adapter (Anusandhan National Research Foundation / SERB)
Flagship national science and engineering research funding schemes.
"""

import logging
from backend.app.services.funding.base import FundingSourceAdapter
from backend.app.services.funding.normalizer import (
    parse_flexible_date,
    normalize_opportunity_record,
)

logger = logging.getLogger(__name__)


class ANRFAdapter(FundingSourceAdapter):
    source_key = "ANRF"

    OFFICIAL_CALLS = [
        {
            "id": "ANRF-ARG-2026-01",
            "title": "ANRF Advanced Research Grant (ARG) in Fundamental and Applied Sciences",
            "agency": "Anusandhan National Research Foundation (ANRF)",
            "description": "Flagship individual and collaborative research grant supporting disruptive basic and applied scientific research in AI, Quantum Computing, Condensed Matter Physics, and Clean Energy.",
            "funding_type": "Research Grant",
            "funding_amount": 7500000.0,  # 75 Lakhs
            "open_date": "2026-02-01",
            "close_date": "2026-09-30",
            "eligibility": "Regular faculty members and researchers in recognized Indian academic institutions and national laboratories.",
            "funding_category": "Fundamental & Applied Sciences",
            "research_area": "Artificial Intelligence & Computational Sciences",
            "official_link": "https://www.anrfonline.in/ANRF/arg_guidelines",
        },
        {
            "id": "ANRF-NPDF-2026-02",
            "title": "National Post Doctoral Fellowship (N-PDF) Scheme",
            "agency": "Anusandhan National Research Foundation (ANRF)",
            "description": "Supports talented young postdoctoral researchers under 35 years to work in frontier areas of science and engineering under established mentors.",
            "funding_type": "Fellowship",
            "funding_amount": 2400000.0,  # 24 Lakhs (Fellowship + Research Grant)
            "open_date": "2026-03-01",
            "close_date": "2026-10-31",
            "eligibility": "Indian citizens with a PhD in science or engineering from a recognized university.",
            "funding_category": "Fellowship & Career Development",
            "research_area": "Multidisciplinary Science & Engineering",
            "official_link": "https://www.anrfonline.in/ANRF/npdf_guidelines",
        },
        {
            "id": "ANRF-PMECRG-2026-03",
            "title": "Prime Minister Early Career Research Grant (PM-ECRG)",
            "agency": "Anusandhan National Research Foundation (ANRF)",
            "description": "Provides seed research grant to early-career researchers appointed as faculty within the last 2 years to launch independent laboratory facilities.",
            "funding_type": "Seed Grant",
            "funding_amount": 6000000.0,  # 60 Lakhs
            "open_date": "2026-01-15",
            "close_date": "2026-08-31",
            "eligibility": "Assistant Professors and early career scientists in Indian universities/IITs/NITs.",
            "funding_category": "Early Career Research",
            "research_area": "Engineering & Technology",
            "official_link": "https://www.anrfonline.in/ANRF/pmecrg",
        },
        {
            "id": "ANRF-PAIR-2026-04",
            "title": "Partnerships for Accelerated Innovation and Research (PAIR) - University Hub Model",
            "agency": "Anusandhan National Research Foundation (ANRF)",
            "description": "Hub-and-Spoke research partnership grant connecting premier institutions (IITs/IISc) with state universities to elevate regional research capabilities.",
            "funding_type": "Institutional Research Grant",
            "funding_amount": 50000000.0,  # 5 Cr
            "open_date": "2026-02-15",
            "close_date": "2026-11-15",
            "eligibility": "Consortium of central and state universities in India.",
            "funding_category": "Institutional Capacity Building",
            "research_area": "Higher Education & Interdisciplinary Research",
            "official_link": "https://www.anrfonline.in/ANRF/pair_hub",
        },
        {
            "id": "ANRF-RAMANUJAN-2026-05",
            "title": "Ramanujan Fellowship for Returning Indian Scientists",
            "agency": "Anusandhan National Research Foundation (ANRF)",
            "description": "Prestigious fellowship to attract brilliant Indian scientists and engineers working abroad back to Indian academic and research institutions.",
            "funding_type": "Fellowship & Research Grant",
            "funding_amount": 13500000.0,  # 1.35 Cr
            "open_date": "2026-01-01",
            "close_date": "2026-12-31",
            "eligibility": "Outstanding overseas Indian scientists seeking to return to India.",
            "funding_category": "International Talent Repatriation",
            "research_area": "Frontier Science & Mathematics",
            "official_link": "https://www.anrfonline.in/ANRF/ramanujan_fellowship",
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
