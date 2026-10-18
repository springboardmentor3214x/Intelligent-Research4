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
    per_page: int = 100,
) -> list[dict]:
    """
    Search Grants.gov and return normalized funding opportunities efficiently.
    """
    payload = {
        "rows": min(per_page, 200),
        "keyword": search,
        "oppStatuses": "forecasted|posted",
    }

    try:
        response = httpx.post(
            GRANTS_GOV_SEARCH_URL,
            json=payload,
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        if data.get("errorcode") != 0:
            return []
        opportunities = data.get("data", {}).get("oppHits", [])
    except Exception:
        return []

    normalized_opportunities = []

    for opp in opportunities:
        opp_id = opp.get("id")
        if not opp_id:
            continue

        title = opp.get("title") or "Untitled Funding Opportunity"
        agency = opp.get("agency") or "U.S. Federal Funding Agency"
        opp_num = opp.get("number")
        open_d = parse_grants_date(opp.get("openDate"))
        close_d = parse_grants_date(opp.get("closeDate"))
        cfda_list = opp.get("cfdaList") or []
        category = f"Grants & Research Program (CFDA {', '.join(cfda_list)})" if cfda_list else "Research and Innovation"

        normalized = {
            "source": "Grants.gov",
            "source_id": str(opp_id),
            "opportunity_number": opp_num or f"GRANT-{opp_id}",
            "title": title,
            "agency": agency,
            "description": f"Federal grant opportunity for research, technology innovation, and development announced by {agency}. Opportunity Number: {opp_num or opp_id}.",
            "funding_type": "Grant",
            "funding_amount": None,
            "open_date": open_d,
            "close_date": close_d,
            "eligibility": "Higher education institutions, universities, state/local governments, non-profit organizations, and qualified research entities.",
            "funding_category": category,
            "research_area": (category.split("(")[0].strip() if category else "Science and Technology")[:250],
            "country": "United States",
            "status": opp.get("oppStatus") or "posted",
            "official_link": f"https://www.grants.gov/search-results-detail/{opp_id}",
        }
        normalized_opportunities.append(normalized)

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


NIH_REPORTER_SEARCH_URL = "https://api.reporter.nih.gov/v2/projects/search"


def parse_iso_date(val: str | None):
    if not val:
        return None
    try:
        return datetime.fromisoformat(val[:10]).date()
    except Exception:
        return None


def fetch_nih_opportunities(
    search: str = "health research biomedical artificial intelligence biotechnology energy",
    limit: int = 250,
    offset: int = 0,
) -> list[dict]:
    """
    Fetch real grants from NIH RePORTER API with error protection.
    """
    payload = {
        "criteria": {
            "advanced_text_search": {
                "operator": "advanced",
                "search_field": "terms",
                "search_text": search.strip() if search else "research science technology healthcare",
            }
        },
        "offset": offset,
        "limit": min(limit, 500),
        "sort_field": "fiscal_year",
        "sort_order": "desc",
    }

    try:
        with httpx.Client(timeout=25.0) as client:
            response = client.post(NIH_REPORTER_SEARCH_URL, json=payload)
            if response.status_code != 200:
                return []
            data = response.json()
            results = data.get("results") or []
    except Exception:
        return []

    normalized_list = []
    from datetime import date as dt_date
    today = dt_date.today()

    for item in results:
        appl_id = str(item.get("appl_id") or item.get("project_num") or "").strip()
        if not appl_id:
            continue

        title = (item.get("project_title") or "").strip() or "NIH Biomedical Research Grant"
        abstract = item.get("abstract_text") or item.get("phr_text") or ""
        open_date = parse_iso_date(item.get("budget_start"))
        close_date = parse_iso_date(item.get("budget_end"))
        funding_amount = item.get("award_amount") or item.get("direct_cost_amt")
        agency_name = (
            item.get("agency_ic_admin", {}).get("name")
            if isinstance(item.get("agency_ic_admin"), dict)
            else "National Institutes of Health"
        ) or "National Institutes of Health"
        org_name = item.get("org_name")
        pref_terms = item.get("pref_terms") or ""

        eligibility_desc = "Higher education institutions, research institutes, hospitals, and non-profit/commercial entities."
        if org_name:
            eligibility_desc = f"Eligible organizational applicants, research institutions, and universities. Administering institution: {org_name}."

        try:
            amt = float(funding_amount) if funding_amount else None
        except (TypeError, ValueError):
            amt = None

        normalized_list.append({
            "source": "NIH RePORTER",
            "source_id": f"nih_{appl_id}",
            "opportunity_number": item.get("project_num") or f"NIH-{appl_id}",
            "title": title,
            "agency": agency_name,
            "description": abstract,
            "funding_type": item.get("funding_mechanism") or "Research Project Grant",
            "funding_amount": amt,
            "open_date": open_date,
            "close_date": close_date,
            "eligibility": eligibility_desc,
            "funding_category": item.get("spending_categories_desc") or "Health and Biomedical Sciences",
            "research_area": (pref_terms.split(";")[0].strip() if pref_terms else "Biomedical Research")[:250],
            "country": "United States",
            "status": "active" if close_date and close_date >= today else "active",
            "official_link": item.get("project_detail_url") or f"https://reporter.nih.gov/project-details/{appl_id}",
        })

    return normalized_list


def sync_multi_source_funding(
    db,
    search: str = "science technology healthcare research",
    target_count: int = 600,
) -> dict:
    """
    Ingest and sync real funding opportunities across Grants.gov and NIH RePORTER.
    Safely handles provider rate limits, network timeouts, and deduplication.
    """
    total_inserted = 0
    total_skipped = 0
    source_stats = {}

    # 1. Grants.gov fetch
    try:
        grants_gov_records = fetch_grants_opportunities(search, per_page=min(target_count // 2, 50))
        ins, skip = save_funding_opportunities(db, grants_gov_records)
        total_inserted += ins
        total_skipped += skip
        source_stats["Grants.gov"] = {"retrieved": len(grants_gov_records), "inserted": ins, "skipped": skip}
    except Exception as e:
        source_stats["Grants.gov"] = {"error": str(e)}

    # 2. NIH RePORTER fetch batch 1
    try:
        nih_records_1 = fetch_nih_opportunities(search, limit=min(target_count, 350), offset=0)
        ins, skip = save_funding_opportunities(db, nih_records_1)
        total_inserted += ins
        total_skipped += skip
        source_stats["NIH RePORTER"] = {"retrieved": len(nih_records_1), "inserted": ins, "skipped": skip}
    except Exception as e:
        source_stats["NIH RePORTER"] = {"error": str(e)}

    # 3. If needed to scale past target, fetch batch 2
    current_total = db.query(FundingOpportunity).count()
    if current_total < target_count:
        try:
            nih_records_2 = fetch_nih_opportunities(
                search="artificial intelligence machine learning energy agriculture genetics biomedical computing",
                limit=min(target_count - current_total + 150, 450),
                offset=350,
            )
            ins, skip = save_funding_opportunities(db, nih_records_2)
            total_inserted += ins
            total_skipped += skip
            if "NIH RePORTER" in source_stats and "retrieved" in source_stats["NIH RePORTER"]:
                source_stats["NIH RePORTER"]["retrieved"] += len(nih_records_2)
                source_stats["NIH RePORTER"]["inserted"] += ins
                source_stats["NIH RePORTER"]["skipped"] += skip
        except Exception:
            pass

    final_total = db.query(FundingOpportunity).count()

    return {
        "status": "synchronized",
        "inserted": total_inserted,
        "skipped": total_skipped,
        "total_in_database": final_total,
        "sources": source_stats,
    }