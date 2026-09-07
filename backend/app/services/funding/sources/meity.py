"""
MeitY Source Adapter (Ministry of Electronics and Information Technology)
Ingests schemes for Semiconductors (Chips to Startup), AI Mission, Cyber Security, and Deep Tech.
"""

import logging
from backend.app.services.funding.base import FundingSourceAdapter
from backend.app.services.funding.normalizer import (
    parse_flexible_date,
    normalize_opportunity_record,
)

logger = logging.getLogger(__name__)


class MeitYAdapter(FundingSourceAdapter):
    source_key = "MeitY"

    OFFICIAL_CALLS = [
        {
            "id": "MEITY-C2S-2026-01",
            "title": "Chips to Startup (C2S) Programme: VLSI and Embedded Semiconductor Design",
            "agency": "Ministry of Electronics and Information Technology (MeitY)",
            "description": "Financial and EDA tool assistance to develop Application Specific Integrated Circuits (ASICs), RISC-V processor IP cores, and System-on-Chip (SoC) architectures for startups and academic institutions.",
            "funding_type": "Capacity & R&D Grant",
            "funding_amount": 35000000.0,  # 3.5 Cr
            "open_date": "2026-01-05",
            "close_date": "2026-09-15",
            "eligibility": "Engineering colleges, IITs, NITs, and fabless semiconductor startups.",
            "funding_category": "Semiconductors & Electronics",
            "research_area": "Semiconductors & VLSI Design",
            "official_link": "https://upms.meity.gov.in/schemes/c2s-programme",
        },
        {
            "id": "MEITY-INDIAAI-2026-02",
            "title": "IndiaAI Mission: Foundational AI Models, NLP for Indian Languages, and Edge AI",
            "agency": "IndiaAI / MeitY",
            "description": "Funding under the IndiaAI Mission for building open-source multilingual foundation models, sovereign AI compute infrastructure, and trustworthy AI governance tools.",
            "funding_type": "National Mission Grant",
            "funding_amount": 50000000.0,  # 5 Cr
            "open_date": "2026-02-15",
            "close_date": "2026-10-31",
            "eligibility": "Academic institutions, AI research labs, and Indian deep-tech enterprises.",
            "funding_category": "Artificial Intelligence",
            "research_area": "Artificial Intelligence & Natural Language Processing",
            "official_link": "https://indiaai.gov.in/grants/foundation-models-2026",
        },
        {
            "id": "MEITY-CYBER-2026-03",
            "title": "Cyber Security R&D Scheme: Cryptography, Post-Quantum Security & Threat Intelligence",
            "agency": "Ministry of Electronics and Information Technology (MeitY)",
            "description": "R&D projects in lattice-based cryptography, secure multi-party computation, automated malware reverse engineering, and SCADA defense systems.",
            "funding_type": "Research Grant",
            "funding_amount": 15000000.0,  # 1.5 Cr
            "open_date": "2026-02-01",
            "close_date": "2026-08-31",
            "eligibility": "Indian academic institutions, Cert-In partners, and recognized research centers.",
            "funding_category": "Cybersecurity & Cryptography",
            "research_area": "Cybersecurity & Information Security",
            "official_link": "https://upms.meity.gov.in/schemes/cyber-security-rnd",
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
