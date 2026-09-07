"""
Normalization utilities for converting varied external source formats into
standardized FundingOpportunity attributes.
"""

import re
from datetime import date, datetime
import logging

logger = logging.getLogger(__name__)


def parse_flexible_date(date_str: str | None) -> date | None:
    """
    Parses date strings across various standard Indian and international formats:
    - 15-Jul-2026 / 15-July-2026 / 15-07-2026
    - 2026-07-15
    - 15/07/2026 / 07/15/2026
    - 15th July 2026
    """
    if not date_str:
        return None

    cleaned = str(date_str).strip()
    cleaned = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", cleaned)

    formats = [
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d %B %Y",
        "%d %b %Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d.%m.%Y",
        "%Y.%m.%d",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue

    # Regex search for DD-Mon-YYYY inside longer string
    match = re.search(r"(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{4})", cleaned)
    if match:
        matched_str = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
        for fmt in ["%d-%b-%Y", "%d-%B-%Y"]:
            try:
                return datetime.strptime(matched_str, fmt).date()
            except ValueError:
                pass

    return None


def parse_flexible_amount(amt_str: str | int | float | None) -> float | None:
    """
    Parses currency strings into float values (INR Lakhs/Crores or absolute amounts).
    Examples:
    - "₹ 50,00,000" -> 5000000.0
    - "50 Lakhs" -> 5000000.0
    - "2.5 Crores" -> 25000000.0
    - "$500,000" -> 500000.0
    """
    if amt_str is None:
        return None

    if isinstance(amt_str, (int, float)):
        return float(amt_str)

    text = str(amt_str).strip()
    if not text:
        return None

    # Check for Lakhs / Crores
    crore_match = re.search(r"([\d\.]+)\s*(?:cr|crore|crores)", text, re.IGNORECASE)
    if crore_match:
        try:
            val = float(crore_match.group(1))
            return round(val * 10000000.0, 2)
        except ValueError:
            pass

    lakh_match = re.search(r"([\d\.]+)\s*(?:lakh|lakhs|lac|lacs)", text, re.IGNORECASE)
    if lakh_match:
        try:
            val = float(lakh_match.group(1))
            return round(val * 100000.0, 2)
        except ValueError:
            pass

    # Extract digits and decimal point
    digits_only = re.sub(r"[^\d.]", "", text)
    try:
        val = float(digits_only)
        return round(val, 2) if val > 0 else None
    except ValueError:
        return None


def normalize_opportunity_record(
    source: str,
    source_id: str,
    title: str,
    agency: str | None,
    description: str | None,
    funding_type: str | None = "Research Grant",
    funding_amount: float | None = None,
    open_date: date | None = None,
    close_date: date | None = None,
    eligibility: str | None = None,
    funding_category: str | None = None,
    research_area: str | None = None,
    country: str | None = "India",
    status: str | None = "open",
    official_link: str | None = None,
    opportunity_number: str | None = None,
) -> dict:
    """Builds a verified, clean dictionary ready for FundingOpportunity model persistence."""
    cleaned_title = re.sub(r"\s+", " ", title or "").strip()
    if not cleaned_title:
        cleaned_title = f"{source} Funding Opportunity ({source_id})"

    cleaned_desc = re.sub(r"\s+", " ", description or "").strip() if description else None

    return {
        "source": str(source).strip(),
        "source_id": str(source_id).strip(),
        "opportunity_number": opportunity_number or f"{source}-{source_id}",
        "title": cleaned_title,
        "agency": agency.strip() if agency else source,
        "description": cleaned_desc or f"Official funding call from {agency or source}.",
        "funding_type": funding_type or "Grant",
        "funding_amount": funding_amount,
        "open_date": open_date,
        "close_date": close_date,
        "eligibility": eligibility.strip() if eligibility else "Open to eligible Indian academic and R&D institutions.",
        "funding_category": funding_category or research_area or "Science & Technology",
        "research_area": research_area or funding_category or "Science & Technology",
        "country": country or "India",
        "status": status or "open",
        "official_link": official_link or "https://www.indiascienceandtechnology.gov.in/",
    }
