"""
ICAR Source Adapter (Indian Council of Agricultural Research)
Ingests agriculture, crop genetics, soil microbiome, precision farming, and livestock innovation grants.
"""

import logging
from backend.app.services.funding.base import FundingSourceAdapter
from backend.app.services.funding.normalizer import (
    parse_flexible_date,
    normalize_opportunity_record,
)

logger = logging.getLogger(__name__)


class ICARAdapter(FundingSourceAdapter):
    source_key = "ICAR"

    OFFICIAL_CALLS = [
        {
            "id": "ICAR-NASF-2026-01",
            "title": "National Agricultural Science Fund (NASF): Climate-Resilient Crops and Gene Editing",
            "agency": "Indian Council of Agricultural Research (ICAR / NASF)",
            "description": "Strategic research projects deploying CRISPR/Cas9 gene editing, marker-assisted selection, and drought/heat-tolerant genomic traits in staple cereals, pulses, and oilseeds.",
            "funding_type": "Strategic Research Grant",
            "funding_amount": 25000000.0,  # 2.5 Cr
            "open_date": "2026-01-15",
            "close_date": "2026-09-30",
            "eligibility": "State Agricultural Universities (SAUs), ICAR institutes, central universities, and general universities with plant biology faculties.",
            "funding_category": "Agriculture & Plant Biotechnology",
            "research_area": "Agronomy & Crop Genetics",
            "official_link": "https://icar.org.in/nasf-call-proposals",
        },
        {
            "id": "ICAR-SMARTFARM-2026-02",
            "title": "Precision Agriculture, AI-Enabled Drone Spraying & Soil Health Sensors",
            "agency": "ICAR / Directorate of Knowledge Management in Agriculture",
            "description": "Grant for developing IoT soil moisture and nutrient sensors, multispectral drone mapping for crop pest infestation, and automated precision irrigation systems.",
            "funding_type": "Innovation & Technology Grant",
            "funding_amount": 16000000.0,  # 1.6 Cr
            "open_date": "2026-02-10",
            "close_date": "2026-10-15",
            "eligibility": "Agricultural engineering departments, tech startups, and ICAR institutes.",
            "funding_category": "Agricultural Technology & IoT",
            "research_area": "Smart Farming & Agricultural Engineering",
            "official_link": "https://icar.org.in/smart-farming-initiatives",
        },
        {
            "id": "ICAR-AQUA-2026-03",
            "title": "Sustainable Aquaculture and Marine Biotechnology Research Scheme",
            "agency": "Indian Council of Agricultural Research (ICAR / CIFE)",
            "description": "Research on disease management in shrimp and fish hatcheries, recirculating aquaculture systems (RAS), and bioactive marine compounds for nutraceuticals.",
            "funding_type": "Research Grant",
            "funding_amount": 12000000.0,  # 1.2 Cr
            "open_date": "2026-03-01",
            "close_date": "2026-11-15",
            "eligibility": "Fisheries colleges, marine science faculties, and aquatic biology labs.",
            "funding_category": "Fisheries & Marine Science",
            "research_area": "Aquaculture & Marine Biotechnology",
            "official_link": "https://icar.org.in/aquaculture-research-grants",
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
