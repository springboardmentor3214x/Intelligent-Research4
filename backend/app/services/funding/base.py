"""
Funding Source Base and Registry Metadata
Provides base adapter interface and capability discovery for all funding sources.
"""

from abc import ABC, abstractmethod
from typing import Any


FUNDING_SOURCES: dict[str, dict[str, Any]] = {
    "ANRF": {
        "full_name": "Anusandhan National Research Foundation (ANRF / SERB)",
        "type": "official_public_source",
        "api_available": False,
        "requires_api_key": False,
        "base_url": "https://www.anrfonline.in/",
        "domains": [
            "Advanced Scientific Research",
            "Engineering Sciences",
            "Physical Sciences",
            "Chemical Sciences",
            "Life Sciences",
            "Mathematical Sciences",
            "Earth & Atmospheric Sciences",
        ],
    },
    "BIRAC": {
        "full_name": "Biotechnology Industry Research Assistance Council (BIRAC)",
        "type": "official_public_source",
        "api_available": False,
        "requires_api_key": False,
        "base_url": "https://www.birac.nic.in/cfp.php",
        "domains": [
            "Biotechnology",
            "Healthcare & Diagnostics",
            "Biomanufacturing",
            "Agricultural Biotechnology",
            "Green Hydrogen & Clean Energy",
            "Startups & Commercialization",
        ],
    },
    "DST": {
        "full_name": "Department of Science and Technology (DST, Gov of India)",
        "type": "official_public_source",
        "api_available": False,
        "requires_api_key": False,
        "base_url": "https://dst.gov.in/call-for-proposals",
        "domains": [
            "Artificial Intelligence & Cyber Physical Systems",
            "Quantum Technologies",
            "Materials Science & Nanotechnology",
            "Clean Energy & Climate Solutions",
            "Technology Development & Transfer",
        ],
    },
    "ICMR": {
        "full_name": "Indian Council of Medical Research (ICMR)",
        "type": "official_public_source",
        "api_available": False,
        "requires_api_key": False,
        "base_url": "https://www.icmr.gov.in/call-for-proposals",
        "domains": [
            "Biomedical Research",
            "Clinical Medicine",
            "Medical Imaging & Diagnostics",
            "Epidemiology & Public Health",
            "Pharmaceuticals & Vaccines",
            "Digital Health & Medical AI",
        ],
    },
    "MeitY": {
        "full_name": "Ministry of Electronics and Information Technology (MeitY)",
        "type": "official_public_source",
        "api_available": False,
        "requires_api_key": False,
        "base_url": "https://upms.meity.gov.in/schemes",
        "domains": [
            "Artificial Intelligence & Generative AI",
            "Semiconductors & Microelectronics (Chips to Startup)",
            "Cybersecurity & Information Security",
            "Software & Digital Public Infrastructure",
            "Robotics & IoT",
        ],
    },
    "DRDO": {
        "full_name": "Defence Research and Development Organisation (DRDO / ER&IPR)",
        "type": "official_public_source",
        "api_available": False,
        "requires_api_key": False,
        "base_url": "https://www.drdo.gov.in/",
        "domains": [
            "Defence Technologies",
            "Aerospace & Propulsion",
            "Sensor Systems & Radar",
            "Advanced Materials & Ballistics",
            "Autonomous Systems & Robotics",
        ],
    },
    "ICAR": {
        "full_name": "Indian Council of Agricultural Research (ICAR / NASF)",
        "type": "official_public_source",
        "api_available": False,
        "requires_api_key": False,
        "base_url": "https://icar.org.in/",
        "domains": [
            "Agriculture & Agronomy",
            "Crop Genetics & Biotechnology",
            "Smart Farming & Agricultural IoT",
            "Livestock, Fisheries & Veterinary",
            "Food Technology & Post-Harvest",
        ],
    },
    "ISTI": {
        "full_name": "India Science, Technology and Innovation Portal (ISTI)",
        "type": "official_public_source",
        "api_available": False,
        "requires_api_key": False,
        "base_url": "https://www.indiascienceandtechnology.gov.in/funding-opportunities-institutional",
        "domains": [
            "Multidisciplinary S&T",
            "Institutional R&D",
            "National Research Missions",
            "Fellowships & International S&T Cooperation",
        ],
    },
    "Grants.gov": {
        "full_name": "Grants.gov (United States Federal Grants)",
        "type": "official_api",
        "api_available": True,
        "requires_api_key": False,
        "base_url": "https://api.grants.gov/v1/api/",
        "domains": [
            "International Research Collaborations",
            "Global Science & Technology Grants",
        ],
    },
}


class FundingSourceAdapter(ABC):
    """Abstract base adapter for ingestion from an external funding source."""

    source_key: str = ""

    @abstractmethod
    def fetch_opportunities(self) -> list[dict]:
        """
        Fetch, parse, and return raw normalized funding opportunity dicts.
        Must return list of dicts conforming to FundingOpportunity schema.
        """
        raise NotImplementedError
