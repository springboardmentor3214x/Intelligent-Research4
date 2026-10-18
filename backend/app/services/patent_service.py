from datetime import datetime
import re

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.patent import Patent


EPO_QUERY_URL = "https://data.epo.org/linked-data/query"


def clean_text(value):
    """Convert EPO text/list/dict values into clean text."""
    if not value:
        return None

    if isinstance(value, list):
        values = []

        for item in value:
            if isinstance(item, dict):
                text = (
                    item.get("value")
                    or item.get("label")
                    or item.get("fn")
                )

                if text:
                    values.append(str(text))
            else:
                values.append(str(item))

        return ", ".join(dict.fromkeys(values)) or None

    if isinstance(value, dict):
        return (
            value.get("value")
            or value.get("label")
            or value.get("fn")
        )

    return str(value)


def parse_epo_date(value):
    """Convert EPO date strings into Python date objects."""
    if not value:
        return None

    try:
        return datetime.strptime(
            value.replace(",", ""),
            "%a %d %b %Y",
        ).date()
    except (ValueError, TypeError, AttributeError):
        return None


def normalize_uri(uri):
    """Convert EPO publication URI into a compact source ID."""
    if not uri:
        return ""

    prefix = (
        "http://data.epo.org/"
        "linked-data/data/publication/"
    )

    return str(uri).replace(prefix, "")


def extract_publication_number(value):
    """
    Extract only the numeric publication number.

    Example:
        http://data.epo.org/linked-data/id/st3/EP 2690552
        -> 2690552
    """

    if not value:
        return None

    text = clean_text(value)

    if not text:
        return None

    # Look for EP followed by a 6+ digit number.
    match = re.search(
        r"\bEP\s*(\d{6,})\b",
        text,
        re.IGNORECASE,
    )

    if match:
        return match.group(1)

    # Fallback: find any 6+ digit number.
    match = re.search(
        r"\b(\d{6,})\b",
        text,
    )

    if match:
        return match.group(1)

    return text[:50]


def extract_publication_authority(value):
    """
    Normalize EPO publication authority.

    Always return a short value such as EP.
    """

    if not value:
        return "EP"

    text = clean_text(value)

    if not text:
        return "EP"

    # EPO authority is normally EP.
    if re.search(r"\bEP\b", text, re.IGNORECASE):
        return "EP"

    # If an authority code exists, use the first short code.
    match = re.search(
        r"\b([A-Z]{2})\b",
        text,
    )

    if match:
        return match.group(1)

    return "EP"


def extract_publication_kind(value):
    """
    Normalize EPO publication kind.

    Example:
        ...publicationKind_A1
        -> A1
    """

    if not value:
        return ""

    text = clean_text(value)

    if not text:
        return ""

    # Find common EPO kind codes such as A1, A2, A3, B1, etc.
    match = re.search(
        r"(?:publicationKind[_\s]*)?([A-Z]\d)\b",
        text,
        re.IGNORECASE,
    )

    if match:
        return match.group(1).upper()

    return ""


def build_publication_number(
    publication_number,
    publication_authority,
    publication_kind,
):
    """
    Build a short normalized publication number.

    Example:
        EP 2690552 A1
    """

    number = extract_publication_number(
        publication_number
    )

    authority = extract_publication_authority(
        publication_authority
    )

    kind = extract_publication_kind(
        publication_kind
    )

    if not number:
        return None

    if kind:
        result = f"{authority} {number} {kind}"
    else:
        result = f"{authority} {number}"

    # Database column is VARCHAR(100).
    return result[:100]


import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
import urllib.parse
from datetime import datetime
import re

import httpx
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from backend.app.models.patent import Patent

logger = logging.getLogger(__name__)

EPO_QUERY_URL = "https://data.epo.org/linked-data/query"
# EPO OPS Open API OAuth credentials (optional, when configured in .env)
EPO_OPS_CONSUMER_KEY = os.getenv("EPO_OPS_CONSUMER_KEY", "")
EPO_OPS_CONSUMER_SECRET = os.getenv("EPO_OPS_CONSUMER_SECRET", "")


def parse_single_epo_record(uri: str, title: str, keyword: str, client: httpx.Client | None = None) -> dict | None:
    """Fetch and parse a single EPO publication URI into a normalized patent dict."""
    try:
        if client is not None:
            record_response = client.get(
                uri,
                headers={"Accept": "application/json"},
                timeout=12,
            )
        else:
            record_response = httpx.get(
                uri,
                headers={"Accept": "application/json"},
                timeout=12,
            )

        if record_response.status_code != 200:
            return None

        record = record_response.json()
        if isinstance(record, dict):
            result_obj = record.get("result", {})
            if isinstance(result_obj, dict):
                patent_data = result_obj.get("primaryTopic", {})
            elif isinstance(result_obj, list) and len(result_obj) > 0 and isinstance(result_obj[0], dict):
                patent_data = result_obj[0].get("primaryTopic", {})
            else:
                patent_data = {}
        else:
            patent_data = {}

        if not isinstance(patent_data, dict) or not patent_data:
            return None

        application = patent_data.get("application") if isinstance(patent_data, dict) else {}
        if not isinstance(application, dict):
            application = {}

        inventors = clean_text(patent_data.get("inventorVC"))
        applicant = clean_text(patent_data.get("applicantVC"))

        classifications = patent_data.get("classificationIPCInventive") or []
        classification_values = []
        for item in classifications:
            if isinstance(item, dict):
                label = item.get("label")
                if label:
                    classification_values.append(label)

        classification = ", ".join(dict.fromkeys(classification_values)) or None
        citations = patent_data.get("citesPatentPublication") or []
        citation_count = len(citations)

        raw_publication_number = patent_data.get("publicationNumber")
        raw_publication_authority = patent_data.get("publicationAuthority")
        raw_publication_kind = patent_data.get("publicationKind")

        publication_number = build_publication_number(
            raw_publication_number,
            raw_publication_authority,
            raw_publication_kind,
        )

        if not publication_number:
            return None

        return {
            "source": "EPO",
            "source_id": normalize_uri(uri),
            "publication_number": publication_number,
            "title": title,
            "abstract": clean_text(patent_data.get("abstract")),
            "assignee": applicant,
            "inventors": inventors,
            "filing_date": parse_epo_date(application.get("filingDate")),
            "publication_date": parse_epo_date(patent_data.get("publicationDate")),
            "classification": classification,
            "technology_domain": keyword,
            "citation_count": citation_count,
            "status": None,
            "official_link": uri,
        }
    except Exception as exc:
        logger.debug("Error parsing single EPO record %s: %s", uri, exc)
        return None


def fetch_patents_from_epo(
    keyword: str,
    limit: int = 50,
) -> list[dict]:
    """
    Search EPO Linked Open EP Data and retrieve
    complete patent metadata using concurrent workers.
    Supports scaling up to 1,000 real records.
    """
    safe_keyword = keyword.replace('"', '\\"').strip()
    
    # Keyword concept expansion if needed
    search_terms = [safe_keyword]
    if " " in safe_keyword:
        words = [w for w in safe_keyword.split() if len(w) > 3]
        if words:
            search_terms.append(words[0])

    all_uris_and_titles: list[tuple[str, str]] = []
    seen_uris: set[str] = set()

    # Query SPARQL endpoint for candidates
    for term in search_terms:
        if len(all_uris_and_titles) >= limit:
            break

        query = f"""
        PREFIX patent: <http://data.epo.org/linked-data/def/patent/>
        PREFIX dcterms: <http://purl.org/dc/terms/>
        PREFIX text: <http://jena.apache.org/text#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        SELECT DISTINCT ?publn ?title WHERE {{
            ?publn
                text:query (
                    dcterms:abstract "{term}"
                ) ;
                rdf:type patent:Publication ;
                patent:titleOfInvention ?title .

            FILTER(langMatches(lang(?title), "en"))
        }}
        LIMIT {limit * 2}
        """

        try:
            response = httpx.post(
                EPO_QUERY_URL,
                data={
                    "query": query,
                    "format": "json",
                },
                timeout=35,
            )
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", {}).get("bindings", [])
                for res in results:
                    uri = res.get("publn", {}).get("value")
                    title = res.get("title", {}).get("value")
                    if uri and title and uri not in seen_uris:
                        seen_uris.add(uri)
                        all_uris_and_titles.append((uri, title))
                        if len(all_uris_and_titles) >= limit:
                            break
        except Exception as exc:
            logger.warning("SPARQL query failed for term '%s': %s", term, exc)

    if not all_uris_and_titles:
        return []

    # Target batch size to process
    targets = all_uris_and_titles[:limit]
    patents: list[dict] = []

    # Use thread pool for fast concurrent fetching
    max_workers = min(12, max(2, len(targets)))
    with httpx.Client(timeout=15) as client:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_target = {
                executor.submit(parse_single_epo_record, uri, title, keyword, client): (uri, title)
                for uri, title in targets
            }
            for future in as_completed(future_to_target):
                try:
                    record_dict = future.result()
                    if record_dict:
                        patents.append(record_dict)
                except Exception as exc:
                    logger.debug("Failed fetching record: %s", exc)

    return patents


def import_patents(
    db: Session,
    keyword: str,
    limit: int = 50,
) -> dict:
    """
    Import real patents from EPO Linked Data API into PostgreSQL/SQLite.
    Deduplicates against existing database records using (source, source_id)
    and publication_number.
    """
    patents = fetch_patents_from_epo(
        keyword=keyword,
        limit=limit,
    )

    inserted = 0
    skipped = 0

    for patent_data in patents:
        existing = db.scalar(
            select(Patent).where(
                (Patent.source == patent_data["source"])
                & (Patent.source_id == patent_data["source_id"])
            )
        )
        if not existing and patent_data.get("publication_number"):
            existing = db.scalar(
                select(Patent).where(
                    Patent.publication_number == patent_data["publication_number"]
                )
            )

        if existing:
            skipped += 1
            continue

        db.add(Patent(**patent_data))
        inserted += 1

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    total_in_db = db.scalar(select(func.count(Patent.id))) or 0

    return {
        "inserted": inserted,
        "skipped": skipped,
        "total_found": len(patents),
        "total_database_records": total_in_db,
    }