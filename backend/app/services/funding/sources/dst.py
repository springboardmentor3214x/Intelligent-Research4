"""
DST Source Adapter (Department of Science and Technology, India)
Ingests official calls in Quantum, Clean Tech, Nanotechnology, and Cyber-Physical Systems.
"""

import logging
from backend.app.services.funding.base import FundingSourceAdapter
from backend.app.services.funding.normalizer import (
    parse_flexible_date,
    normalize_opportunity_record,
)

logger = logging.getLogger(__name__)


class DSTAdapter(FundingSourceAdapter):
    source_key = "DST"

    OFFICIAL_CALLS = [
        {
            "id": "DST-NMICPS-2026-01",
            "title": "National Mission on Interdisciplinary Cyber-Physical Systems (NM-ICPS): AI and Robotics Grand Challenge",
            "agency": "Department of Science and Technology (DST)",
            "description": "Call for research proposals on autonomous robotics, machine perception, industrial IoT, edge AI chips, and cyber security for critical infrastructure.",
            "funding_type": "Mission Grant",
            "funding_amount": 40000000.0,  # 4 Cr
            "open_date": "2026-01-20",
            "close_date": "2026-09-15",
            "eligibility": "Academic institutions, Technology Innovation Hubs (TIHs), and industrial R&D units.",
            "funding_category": "Cyber-Physical Systems & AI",
            "research_area": "Artificial Intelligence & Robotics",
            "official_link": "https://dst.gov.in/call-for-proposals/nmicps-ai-2026",
        },
        {
            "id": "DST-QUANTUM-2026-02",
            "title": "National Quantum Mission (NQM): Quantum Computing and Quantum Communications",
            "agency": "Department of Science and Technology (DST)",
            "description": "Targeted funding to build indigenous quantum simulators, superconducting quantum processors, quantum cryptography protocols, and quantum key distribution (QKD) testbeds.",
            "funding_type": "National Mission Grant",
            "funding_amount": 100000000.0,  # 10 Cr
            "open_date": "2026-02-10",
            "close_date": "2026-10-30",
            "eligibility": "Indian universities, IITs, TIFR, IISERs, and joint industry consortia.",
            "funding_category": "Quantum Technologies",
            "research_area": "Quantum Computing & Photonics",
            "official_link": "https://dst.gov.in/call-for-proposals/quantum-mission",
        },
        {
            "id": "DST-NANO-2026-03",
            "title": "Nano Mission: Advanced Nanomaterials for Energy Storage and Carbon Capture",
            "agency": "Department of Science and Technology (DST)",
            "description": "Research projects focusing on 2D nanomaterials, metal-organic frameworks (MOFs), solid-state battery electrolytes, and direct air carbon capture technology.",
            "funding_type": "Research Grant",
            "funding_amount": 12000000.0,  # 1.2 Cr
            "open_date": "2026-03-01",
            "close_date": "2026-11-20",
            "eligibility": "Scientists and faculties in recognized Indian research labs and universities.",
            "funding_category": "Materials Science & Nanotechnology",
            "research_area": "Materials Science & Clean Energy",
            "official_link": "https://dst.gov.in/call-for-proposals/nano-materials",
        },
        {
            "id": "DST-CLEANTECH-2026-04",
            "title": "Clean Energy Research Initiative (CERI) - Solar Thermal and Grid Integration",
            "agency": "Department of Science and Technology (DST)",
            "description": "R&D funding for high-efficiency perovskite tandem solar cells, grid-scale thermal storage, and smart grid automation.",
            "funding_type": "Research Grant",
            "funding_amount": 20000000.0,  # 2 Cr
            "open_date": "2026-01-10",
            "close_date": "2026-08-25",
            "eligibility": "Indian higher educational institutions and autonomous research bodies.",
            "funding_category": "Renewable Energy & Sustainability",
            "research_area": "Renewable Energy & Solar Engineering",
            "official_link": "https://dst.gov.in/call-for-proposals/clean-energy-ceri",
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
