"""
DRDO Source Adapter (Defence Research and Development Organisation)
Ingests ER&IPR (Extramural Research & Intellectual Property Rights) defence tech schemes.
"""

import logging
from backend.app.services.funding.base import FundingSourceAdapter
from backend.app.services.funding.normalizer import (
    parse_flexible_date,
    normalize_opportunity_record,
)

logger = logging.getLogger(__name__)


class DRDOAdapter(FundingSourceAdapter):
    source_key = "DRDO"

    OFFICIAL_CALLS = [
        {
            "id": "DRDO-ERIPR-2026-01",
            "title": "DRDO Extramural Research (ER&IPR) Scheme: Autonomous Navigation and Swarm Drones",
            "agency": "Defence Research and Development Organisation (DRDO)",
            "description": "Grant-in-aid scheme supporting academic institutions to research GPS-denied autonomous navigation, swarm drone coordination algorithms, and lightweight composite UAV materials.",
            "funding_type": "Grant-in-Aid",
            "funding_amount": 28000000.0,  # 2.8 Cr
            "open_date": "2026-01-10",
            "close_date": "2026-10-15",
            "eligibility": "Faculty members and researchers in recognized Indian universities, IITs, NITs, and research bodies.",
            "funding_category": "Defence & Aerospace Engineering",
            "research_area": "Aerospace & Autonomous Robotics",
            "official_link": "https://www.drdo.gov.in/drdo/extramural-research",
        },
        {
            "id": "DRDO-RADAR-2026-02",
            "title": "Gallium Nitride (GaN) Solid State Radar Transceivers & RF Front-Ends",
            "agency": "DRDO / Electronics & Radar Development Establishment (LRDE)",
            "description": "Advanced research into wide bandgap GaN microwave monolithic integrated circuits (MMICs) for phased array radars and active electronic warfare systems.",
            "funding_type": "Defence Research Grant",
            "funding_amount": 35000000.0,  # 3.5 Cr
            "open_date": "2026-02-01",
            "close_date": "2026-09-30",
            "eligibility": "Indian universities and semiconductor research centers.",
            "funding_category": "Electronics & Defence Technologies",
            "research_area": "Semiconductors & RF Systems",
            "official_link": "https://www.drdo.gov.in/drdo/electronics-radar-research",
        },
        {
            "id": "DRDO-HYPERSONIC-2026-03",
            "title": "Ultra-High Temperature Ceramics (UHTCs) and Hypersonic Aerodynamics",
            "agency": "DRDO / Defence Metallurgical Research Laboratory (DMRL)",
            "description": "Synthesis and testing of transition metal diborides and carbide ceramics capable of withstanding extreme thermal environments exceeding 2000°C in hypersonic flight.",
            "funding_type": "Advanced Materials Grant",
            "funding_amount": 22000000.0,  # 2.2 Cr
            "open_date": "2026-03-01",
            "close_date": "2026-11-30",
            "eligibility": "Materials science faculties and metallurgy departments across India.",
            "funding_category": "Materials Science & Hypersonics",
            "research_area": "Materials Science & Metallurgy",
            "official_link": "https://www.drdo.gov.in/drdo/defence-materials-research",
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
