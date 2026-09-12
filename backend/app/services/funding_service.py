from datetime import datetime

import httpx

from backend.app.models.funding_opportunity import FundingOpportunity


GRANTS_GOV_SEARCH_URL = (
    "https://api.grants.gov/v1/api/search2"
)

GRANTS_GOV_DETAIL_URL = (
    "https://api.grants.gov/v1/api/fetchOpportunity"
)


def parse_grants_date(value: str | None):
    """Convert Grants.gov MM/DD/YYYY date into a Python date."""

    if not value:
        return None

    return datetime.strptime(
        value,
        "%m/%d/%Y",
    ).date()


def fetch_grants_opportunity_details(
    opportunity_id: str,
) -> dict:
    """
    Fetch detailed information for one
    Grants.gov funding opportunity.
    """

    response = httpx.post(
        GRANTS_GOV_DETAIL_URL,
        json={
            "opportunityId": int(opportunity_id)
        },
        timeout=20,
    )

    response.raise_for_status()

    data = response.json()

    if data.get("errorcode") != 0:
        raise RuntimeError(
            data.get(
                "msg",
                "Grants.gov detail request failed",
            )
        )

    return data.get("data", {})


def normalize_grants_opportunity(
    opportunity: dict,
    details: dict | None = None,
) -> dict:
    """
    Convert Grants.gov search and detail data into
    the FundingOpportunity database structure.
    """

    details = details or {}

    opportunity_id = (
        opportunity.get("id")
        or details.get("id")
    )

    if not opportunity_id:
        raise ValueError(
            "Grants.gov opportunity does not contain an ID"
        )

    agency_details = (
        details.get("agencyDetails") or {}
    )

    forecast = details.get("forecast") or {}
    synopsis = details.get("synopsis") or {}

    detail_data = forecast or synopsis

    funding_instruments = (
        detail_data.get("fundingInstruments") or []
    )

    funding_categories = (
        detail_data.get("fundingActivityCategories") or []
    )

    funding_type = ", ".join(
        item.get("description")
        for item in funding_instruments
        if item.get("description")
    )

    funding_category = ", ".join(
        item.get("description")
        for item in funding_categories
        if item.get("description")
    )

    description = (
        detail_data.get("forecastDesc")
        or detail_data.get("synopsisDesc")
    )

    eligibility = (
        detail_data.get("applicantEligibilityDesc")
    )

    funding_amount = (
        detail_data.get("estimatedFunding")
        or detail_data.get("awardCeiling")
    )

    try:
        funding_amount = (
            float(funding_amount)
            if funding_amount
            else None
        )
    except (TypeError, ValueError):
        funding_amount = None

    agency = (
        agency_details.get("agencyName")
        or detail_data.get("agencyName")
        or opportunity.get("agency")
    )

    open_date = parse_grants_date(
        opportunity.get("openDate")
    )

    close_date = parse_grants_date(
        opportunity.get("closeDate")
    )

    if not open_date:
        open_date = parse_grants_date(
            detail_data.get("postingDateStr")
        )

    if not close_date:
        close_date = parse_grants_date(
            detail_data.get("responseDateStr")
        )

    if not close_date:
        closed_packages = (
            details.get("closedOpportunityPkgs") or []
        )

        if closed_packages:
            close_date = parse_grants_date(
                closed_packages[0].get("closingDateStr")
            )

    return {
        "source": "Grants.gov",
        "source_id": str(opportunity_id),
        "opportunity_number": (
            details.get("opportunityNumber")
            or opportunity.get("number")
        ),
        "title": (
            details.get("opportunityTitle")
            or opportunity.get("title")
            or "Untitled Funding Opportunity"
        ),
        "agency": agency,
        "description": description,
        "funding_type": funding_type or None,
        "funding_amount": funding_amount,
        "open_date": open_date,
        "close_date": close_date,
        "eligibility": eligibility,
        "funding_category": funding_category or None,
        "research_area": funding_category or None,
        "country": "United States",
        "status": (
            opportunity.get("oppStatus")
            or details.get("ost")
        ),
        "official_link": (
            "https://www.grants.gov/search-results-detail/"
            + str(opportunity_id)
        ),
    }

def fetch_grants_opportunities(
    search: str,
    per_page: int = 10,
) -> list[dict]:
    """
    Search Grants.gov, fetch detailed information,
    and return normalized funding opportunities.
    """

    payload = {
        "rows": per_page,
        "keyword": search,
        "oppStatuses": "forecasted|posted",
    }

    response = httpx.post(
        GRANTS_GOV_SEARCH_URL,
        json=payload,
        timeout=20,
    )

    response.raise_for_status()

    data = response.json()

    if data.get("errorcode") != 0:
        raise RuntimeError(
            data.get(
                "msg",
                "Grants.gov search request failed",
            )
        )

    opportunities = (
        data.get("data", {})
        .get("oppHits", [])
    )

    normalized_opportunities = []

    for opportunity in opportunities:
        opportunity_id = opportunity.get("id")

        if not opportunity_id:
            continue

        try:
            details = fetch_grants_opportunity_details(
                str(opportunity_id)
            )

            normalized = normalize_grants_opportunity(
                opportunity,
                details,
            )

            normalized_opportunities.append(
                normalized
            )

        except (
            httpx.HTTPError,
            ValueError,
            RuntimeError,
        ):
            continue

    return normalized_opportunities

def save_funding_opportunities(
    session,
    opportunities: list[dict],
) -> tuple[int, int]:
    """
    Save funding opportunities to the database.

    Returns:
        inserted_count, skipped_count
    """

    inserted_count = 0
    skipped_count = 0

    for opportunity_data in opportunities:
        existing = (
            session.query(FundingOpportunity)
            .filter(
                FundingOpportunity.source
                == opportunity_data["source"],
                FundingOpportunity.source_id
                == opportunity_data["source_id"],
            )
            .first()
        )

        if existing:
            skipped_count += 1
            continue

        opportunity = FundingOpportunity(
            **opportunity_data
        )

        session.add(opportunity)
        inserted_count += 1

    session.commit()

    return inserted_count, skipped_count

def import_grants_opportunities(
    search: str,
    per_page: int = 10,
) -> tuple[int, int]:
    """
    Fetch funding opportunities from Grants.gov
    and save them to PostgreSQL.

    Returns:
        inserted_count, skipped_count
    """

    from backend.app.database.connection import SessionLocal

    opportunities = fetch_grants_opportunities(
        search,
        per_page,
    )

    db = SessionLocal()

    try:
        inserted_count, skipped_count = (
            save_funding_opportunities(
                db,
                opportunities,
            )
        )

        return inserted_count, skipped_count

    finally:
        db.close()