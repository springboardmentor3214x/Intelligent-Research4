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


def fetch_patents_from_epo(
    keyword: str,
    limit: int = 5,
):
    """
    Search EPO Linked Open EP Data and retrieve
    complete patent metadata.
    """

    # Protect the SPARQL query from accidental quotes.
    safe_keyword = keyword.replace(
        '"',
        '\\"',
    )

    query = f"""
    PREFIX patent: <http://data.epo.org/linked-data/def/patent/>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX text: <http://jena.apache.org/text#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

    SELECT DISTINCT ?publn ?title WHERE {{
        ?publn
            text:query (
                dcterms:abstract "{safe_keyword}"
            ) ;
            rdf:type patent:Publication ;
            patent:titleOfInvention ?title .

        FILTER(langMatches(lang(?title), "en"))
    }}
    LIMIT {limit}
    """

    response = httpx.post(
        EPO_QUERY_URL,
        data={
            "query": query,
            "format": "json",
        },
        timeout=30,
    )

    response.raise_for_status()

    data = response.json()

    results = (
        data.get("results", {})
        .get("bindings", [])
    )

    patents = []
    seen = set()

    for result in results:
        try:
            # ---------------------------------
            # Publication URI
            # ---------------------------------

            uri = result["publn"]["value"]

            # Avoid duplicate EPO records.
            if uri in seen:
                continue

            seen.add(uri)

            # ---------------------------------
            # Title
            # ---------------------------------

            title = result["title"]["value"]

            # ---------------------------------
            # Retrieve complete patent record
            # ---------------------------------

            record_response = httpx.get(
                uri,
                headers={
                    "Accept": "application/json",
                },
                timeout=20,
            )

            if record_response.status_code != 200:
                continue

            record = record_response.json()

            patent_data = (
                record
                .get("result", {})
                .get("primaryTopic", {})
            )

            if not patent_data:
                continue

            # ---------------------------------
            # Application
            # ---------------------------------

            application = (
                patent_data.get("application")
                or {}
            )

            # ---------------------------------
            # Inventors
            # ---------------------------------

            inventors = clean_text(
                patent_data.get("inventorVC")
            )

            # ---------------------------------
            # Applicant / Assignee
            # ---------------------------------

            applicant = clean_text(
                patent_data.get("applicantVC")
            )

            # ---------------------------------
            # Classification
            # ---------------------------------

            classifications = (
                patent_data.get(
                    "classificationIPCInventive"
                )
                or []
            )

            classification_values = []

            for item in classifications:
                if isinstance(item, dict):
                    label = item.get("label")

                    if label:
                        classification_values.append(
                            label
                        )

            classification = (
                ", ".join(
                    dict.fromkeys(
                        classification_values
                    )
                )
                or None
            )

            # ---------------------------------
            # Citations
            # ---------------------------------

            citations = (
                patent_data.get(
                    "citesPatentPublication"
                )
                or []
            )

            citation_count = len(citations)

            # ---------------------------------
            # Publication information
            # ---------------------------------

            raw_publication_number = (
                patent_data.get(
                    "publicationNumber"
                )
            )

            raw_publication_authority = (
                patent_data.get(
                    "publicationAuthority"
                )
            )

            raw_publication_kind = (
                patent_data.get(
                    "publicationKind"
                )
            )

            publication_number = (
                build_publication_number(
                    raw_publication_number,
                    raw_publication_authority,
                    raw_publication_kind,
                )
            )

            # ---------------------------------
            # Safety check
            # ---------------------------------

            if not publication_number:
                continue

            # ---------------------------------
            # Official link
            # ---------------------------------

            official_link = uri

            # ---------------------------------
            # Normalized patent record
            # ---------------------------------

            patents.append(
                {
                    "source": "EPO",

                    "source_id": normalize_uri(
                        uri
                    ),

                    "publication_number": (
                        publication_number
                    ),

                    "title": title,

                    "abstract": clean_text(
                        patent_data.get("abstract")
                    ),

                    "assignee": applicant,

                    "inventors": inventors,

                    "filing_date": parse_epo_date(
                        application.get(
                            "filingDate"
                        )
                    ),

                    "publication_date": parse_epo_date(
                        patent_data.get(
                            "publicationDate"
                        )
                    ),

                    "classification": classification,

                    "technology_domain": keyword,

                    "citation_count": citation_count,

                    "status": None,

                    "official_link": official_link,
                }
            )

        except (
            httpx.HTTPError,
            KeyError,
            ValueError,
            TypeError,
        ):
            # Ignore one bad EPO record and continue.
            continue

    return patents


def import_patents(
    db: Session,
    keyword: str,
    limit: int = 5,
):
    """
    Import patents from EPO into PostgreSQL.

    Existing patents are skipped using:
        source + source_id
    """

    patents = fetch_patents_from_epo(
        keyword,
        limit,
    )

    inserted = 0
    skipped = 0

    for patent_data in patents:

        existing = db.scalar(
            select(Patent).where(
                Patent.source
                == patent_data["source"],
                Patent.source_id
                == patent_data["source_id"],
            )
        )

        if existing:
            skipped += 1
            continue

        db.add(
            Patent(
                **patent_data
            )
        )

        inserted += 1

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "inserted": inserted,
        "skipped": skipped,
        "total_found": len(patents),
    }