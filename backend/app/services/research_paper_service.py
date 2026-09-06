from datetime import date
import logging
import re
from typing import Any
import httpx
from sqlalchemy.orm import Session

from backend.app.models.research_paper import ResearchPaper

logger = logging.getLogger(__name__)

OPENALEX_WORKS_URL = "https://api.openalex.org/works"
SEMANTIC_SCHOLAR_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
CROSSREF_WORKS_URL = "https://api.crossref.org/v1/works"

DEFAULT_HTTP_TIMEOUT = 12.0


def reconstruct_abstract(
    abstract_inverted_index: dict | None,
) -> str | None:
    """Convert OpenAlex abstract inverted index into normal text."""
    if not abstract_inverted_index:
        return None

    words = []
    for word, positions in abstract_inverted_index.items():
        for position in positions:
            words.append((position, word))

    words.sort(key=lambda item: item[0])
    return " ".join(word for _, word in words)


def extract_clean_publisher_name(host_org: str | None, venue_name: str | None) -> str | None:
    """Clean and normalize academic publisher name."""
    if not host_org:
        # Infer from venue name if obvious
        if venue_name:
            v_lower = venue_name.lower()
            if "ieee" in v_lower:
                return "IEEE"
            if "springer" in v_lower or "nature" in v_lower:
                return "Springer Nature"
            if "elsevier" in v_lower or "sciencedirect" in v_lower:
                return "Elsevier"
            if "acm" in v_lower:
                return "ACM"
            if "wiley" in v_lower:
                return "Wiley"
        return None

    host_lower = host_org.lower()
    if "institute of electrical and electronics engineers" in host_lower or "ieee" in host_lower:
        return "IEEE"
    if "springer" in host_lower or "nature" in host_lower:
        return "Springer Nature"
    if "elsevier" in host_lower or "sciencedirect" in host_lower:
        return "Elsevier"
    if "association for computing machinery" in host_lower or "acm" in host_lower:
        return "ACM"
    if "wiley" in host_lower:
        return "Wiley"
    if "oxford university press" in host_lower:
        return "Oxford University Press"
    if "cambridge university press" in host_lower:
        return "Cambridge University Press"
    if "frontiers" in host_lower:
        return "Frontiers"
    if "mdpi" in host_lower:
        return "MDPI"
    if "plos" in host_lower or "public library of science" in host_lower:
        return "PLOS"
    if "peerj" in host_lower:
        return "PeerJ"

    return host_org


def normalize_openalex_work(work: dict) -> dict:
    """Convert OpenAlex work object into normalized dictionary."""
    authorships = work.get("authorships") or []
    author_names = []
    for authorship in authorships:
        author = authorship.get("author") or {}
        name = author.get("display_name")
        if name and name not in author_names:
            author_names.append(name)
    authors = ", ".join(author_names) if author_names else None

    primary_location = work.get("primary_location") or {}
    source_obj = primary_location.get("source") or {}
    journal_or_conference = source_obj.get("display_name")
    host_org = source_obj.get("host_organization_name")
    publisher = extract_clean_publisher_name(host_org, journal_or_conference)

    topics = work.get("topics") or []
    topic_names = [topic.get("display_name") for topic in topics if topic.get("display_name")]
    keywords = ", ".join(topic_names) if topic_names else None

    abstract = reconstruct_abstract(work.get("abstract_inverted_index"))

    openalex_id = work.get("id") or ""
    source_id = openalex_id.rstrip("/").split("/")[-1] if openalex_id else "unknown"

    publication_date = None
    if work.get("publication_date"):
        try:
            publication_date = date.fromisoformat(work["publication_date"])
        except Exception:
            publication_date = None

    open_access_obj = work.get("open_access") or {}
    is_oa = open_access_obj.get("is_oa", False)
    oa_url = open_access_obj.get("oa_url")
    pdf_url = (primary_location.get("pdf_url") or oa_url) if is_oa else None

    doi_val = work.get("doi")
    if doi_val and not doi_val.startswith("http"):
        doi_val = f"https://doi.org/{doi_val}"

    return {
        "source": "OpenAlex",
        "source_provider": "OpenAlex",
        "publisher": publisher,
        "source_id": source_id,
        "title": work.get("title") or "Untitled",
        "abstract": abstract,
        "authors": authors,
        "publication_date": publication_date,
        "publication_year": work.get("publication_year"),
        "journal_or_conference": journal_or_conference,
        "keywords": keywords,
        "research_domain": (
            topics[0].get("field", {}).get("display_name") if topics else None
        ),
        "doi": doi_val,
        "citation_count": work.get("cited_by_count") or 0,
        "publication_link": primary_location.get("landing_page_url") or doi_val,
        "pdf_url": pdf_url,
        "open_access": is_oa,
        "is_stored": False,
    }


def fetch_openalex_works(
    search: str,
    per_page: int = 20,
    page: int = 1,
    year: int | None = None,
) -> tuple[list[dict], int]:
    """
    Search OpenAlex public API with pagination and optional year filter.
    Returns (papers_list, total_count).
    """
    params: dict[str, Any] = {
        "search": search,
        "per-page": min(per_page, 100),
        "page": max(page, 1),
    }

    if year:
        params["filter"] = f"publication_year:{year}"

    try:
        response = httpx.get(
            OPENALEX_WORKS_URL,
            params=params,
            timeout=DEFAULT_HTTP_TIMEOUT,
        )
        if response.status_code != 200:
            logger.warning(f"OpenAlex request returned status {response.status_code}")
            return [], 0

        data = response.json()
        meta = data.get("meta") or {}
        total = meta.get("count", 0)

        papers = [
            normalize_openalex_work(work)
            for work in data.get("results", [])
            if work.get("title")
        ]
        return papers, total
    except Exception as exc:
        logger.warning(f"Failed to fetch OpenAlex works: {exc}")
        return [], 0


def normalize_semantic_scholar_paper(paper: dict) -> dict:
    """Convert Semantic Scholar paper dict into normalized dictionary."""
    authors = paper.get("authors") or []
    author_names = [a.get("name") for a in authors if a.get("name")]
    author_text = ", ".join(author_names) if author_names else None

    publication_date = None
    if paper.get("publicationDate"):
        try:
            publication_date = date.fromisoformat(paper["publicationDate"])
        except Exception:
            publication_date = None

    external_ids = paper.get("externalIds") or {}
    doi = external_ids.get("DOI")
    doi_url = f"https://doi.org/{doi}" if doi else None

    journal_obj = paper.get("journal") or {}
    journal_name = journal_obj.get("name") or paper.get("venue")
    pub_venue = paper.get("publicationVenue") or {}
    publisher = extract_clean_publisher_name(pub_venue.get("name"), journal_name)

    open_access_pdf = paper.get("openAccessPdf") or {}
    pdf_url = open_access_pdf.get("url")
    is_oa = paper.get("isOpenAccess", False) or bool(pdf_url)

    return {
        "source": "Semantic Scholar",
        "source_provider": "Semantic Scholar",
        "publisher": publisher,
        "source_id": paper.get("paperId") or "unknown",
        "title": paper.get("title") or "Untitled",
        "abstract": paper.get("abstract"),
        "authors": author_text,
        "publication_date": publication_date,
        "publication_year": paper.get("year"),
        "journal_or_conference": journal_name,
        "keywords": None,
        "research_domain": None,
        "doi": doi_url,
        "citation_count": paper.get("citationCount") or 0,
        "publication_link": paper.get("url") or doi_url,
        "pdf_url": pdf_url,
        "open_access": is_oa,
        "is_stored": False,
    }


def fetch_semantic_scholar_papers(
    search: str,
    per_page: int = 15,
    year: int | None = None,
) -> list[dict]:
    """Search Semantic Scholar Graph API."""
    params: dict[str, Any] = {
        "query": search,
        "limit": min(per_page, 50),
        "fields": (
            "paperId,title,abstract,authors,year,publicationDate,"
            "journal,venue,publicationVenue,externalIds,citationCount,url,isOpenAccess,openAccessPdf"
        ),
    }
    if year:
        params["year"] = f"{year}-{year}"

    try:
        response = httpx.get(
            SEMANTIC_SCHOLAR_SEARCH_URL,
            params=params,
            timeout=DEFAULT_HTTP_TIMEOUT,
        )
        if response.status_code == 429:
            logger.info("Semantic Scholar API 429 rate-limited, skipping gracefully.")
            return []
        if response.status_code != 200:
            return []

        data = response.json()
        return [
            normalize_semantic_scholar_paper(paper)
            for paper in data.get("data", [])
            if paper.get("paperId") and paper.get("title")
        ]
    except Exception as exc:
        logger.warning(f"Semantic Scholar lookup error: {exc}")
        return []


def normalize_crossref_item(item: dict) -> dict:
    """Convert Crossref work item into normalized dictionary."""
    titles = item.get("title") or []
    title = titles[0] if titles else "Untitled"

    authors = item.get("author") or []
    author_names = []
    for a in authors:
        given = a.get("given", "")
        family = a.get("family", "")
        full = f"{given} {family}".strip()
        if full:
            author_names.append(full)
    author_text = ", ".join(author_names) if author_names else None

    pub_year = None
    pub_date = None
    created = item.get("published-print") or item.get("published-online") or item.get("created") or {}
    date_parts = created.get("date-parts", [[]])[0]
    if date_parts:
        pub_year = date_parts[0]
        if len(date_parts) >= 3:
            try:
                pub_date = date(date_parts[0], date_parts[1], date_parts[2])
            except Exception:
                pass

    container_titles = item.get("container-title") or []
    journal_or_conference = container_titles[0] if container_titles else None
    publisher = extract_clean_publisher_name(item.get("publisher"), journal_or_conference)

    doi = item.get("DOI")
    doi_url = f"https://doi.org/{doi}" if doi else None

    subjects = item.get("subject") or []
    keywords = ", ".join(subjects) if subjects else None

    return {
        "source": "Crossref",
        "source_provider": "Crossref",
        "publisher": publisher,
        "source_id": doi or title,
        "title": title,
        "abstract": item.get("abstract"),
        "authors": author_text,
        "publication_date": pub_date,
        "publication_year": pub_year,
        "journal_or_conference": journal_or_conference,
        "keywords": keywords,
        "research_domain": subjects[0] if subjects else None,
        "doi": doi_url,
        "citation_count": item.get("is-referenced-by-count") or 0,
        "publication_link": doi_url or (item.get("URL")),
        "pdf_url": None,
        "open_access": False,
        "is_stored": False,
    }


def fetch_crossref_metadata(doi: str) -> dict | None:
    """Fetch metadata for a single DOI from Crossref REST API."""
    if not doi:
        return None
    clean_doi = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
    url = f"{CROSSREF_WORKS_URL}/{clean_doi}"
    try:
        response = httpx.get(
            url,
            params={"mailto": "research-platform@example.com"},
            timeout=DEFAULT_HTTP_TIMEOUT,
        )
        if response.status_code != 200:
            return None
        item = response.json().get("message", {})
        return normalize_crossref_item(item)
    except Exception as exc:
        logger.warning(f"Crossref DOI lookup error for {doi}: {exc}")
        return None


def fetch_crossref_papers(
    search: str,
    per_page: int = 10,
    year: int | None = None,
) -> list[dict]:
    """Search Crossref public works REST API."""
    params: dict[str, Any] = {
        "query": search,
        "rows": min(per_page, 30),
        "mailto": "research-platform@example.com",
    }
    if year:
        params["filter"] = f"from-pub-date:{year}-01-01,until-pub-date:{year}-12-31"

    try:
        response = httpx.get(
            CROSSREF_WORKS_URL,
            params=params,
            timeout=DEFAULT_HTTP_TIMEOUT,
        )
        if response.status_code != 200:
            return []

        items = response.json().get("message", {}).get("items", [])
        return [
            normalize_crossref_item(it)
            for it in items
            if it.get("title") and (it.get("DOI") or it.get("abstract"))
        ]
    except Exception as exc:
        logger.warning(f"Crossref lookup error: {exc}")
        return []


def deduplicate_and_merge_papers(papers_lists: list[list[dict]]) -> list[dict]:
    """
    Merge papers from PostgreSQL, OpenAlex, Semantic Scholar, and Crossref.
    Deduplicates by:
    1. DOI (normalized)
    2. Normalized Title + Publication Year
    3. Source ID for same source
    """
    merged_map: dict[str, dict] = {}
    seen_titles: dict[str, str] = {}  # norm_title_key -> master_key

    for paper_list in papers_lists:
        for paper in paper_list:
            # 1. Determine deduplication key
            doi_val = (paper.get("doi") or "").strip().lower()
            clean_doi = doi_val.replace("https://doi.org/", "").replace("http://doi.org/", "")
            
            raw_title = (paper.get("title") or "").strip().lower()
            norm_title = re.sub(r"[^\w\s]", "", raw_title)
            title_key = f"{norm_title}_{paper.get('publication_year') or ''}"

            master_key = None
            if clean_doi:
                master_key = f"doi:{clean_doi}"
            elif title_key in seen_titles:
                master_key = seen_titles[title_key]
            else:
                master_key = f"{paper.get('source', 'paper')}:{paper.get('source_id', uuid_fallback(raw_title))}"

            seen_titles[title_key] = master_key

            if master_key not in merged_map:
                merged_map[master_key] = dict(paper)
            else:
                # Merge richer metadata into existing record
                existing = merged_map[master_key]
                if not existing.get("abstract") and paper.get("abstract"):
                    existing["abstract"] = paper["abstract"]
                if not existing.get("authors") and paper.get("authors"):
                    existing["authors"] = paper["authors"]
                if not existing.get("publisher") and paper.get("publisher"):
                    existing["publisher"] = paper["publisher"]
                if not existing.get("journal_or_conference") and paper.get("journal_or_conference"):
                    existing["journal_or_conference"] = paper["journal_or_conference"]
                if not existing.get("doi") and paper.get("doi"):
                    existing["doi"] = paper["doi"]
                if not existing.get("pdf_url") and paper.get("pdf_url"):
                    existing["pdf_url"] = paper["pdf_url"]
                    existing["open_access"] = True
                if (paper.get("citation_count") or 0) > (existing.get("citation_count") or 0):
                    existing["citation_count"] = paper["citation_count"]
                if paper.get("is_stored"):
                    existing["is_stored"] = True
                    existing["id"] = paper.get("id")

    return list(merged_map.values())


def uuid_fallback(title: str) -> str:
    """Deterministic hash string from title."""
    import hashlib
    return hashlib.md5(title.encode("utf-8")).hexdigest()[:12]


def save_research_papers(
    db: Session,
    papers: list[dict],
) -> tuple[int, int]:
    """Save normalized research papers to PostgreSQL."""
    inserted_count = 0
    skipped_count = 0

    for paper_data in papers:
        existing_paper = (
            db.query(ResearchPaper)
            .filter(
                ResearchPaper.source == paper_data["source"],
                ResearchPaper.source_id == str(paper_data["source_id"]),
            )
            .first()
        )

        if existing_paper:
            skipped_count += 1
            continue

        # Strip non-model fields before saving
        db_fields = {
            "source": paper_data.get("source", "OpenAlex"),
            "source_id": str(paper_data.get("source_id")),
            "title": paper_data.get("title", "Untitled"),
            "abstract": paper_data.get("abstract"),
            "authors": paper_data.get("authors"),
            "publication_date": paper_data.get("publication_date"),
            "publication_year": paper_data.get("publication_year"),
            "journal_or_conference": paper_data.get("journal_or_conference"),
            "keywords": paper_data.get("keywords"),
            "research_domain": paper_data.get("research_domain"),
            "doi": paper_data.get("doi"),
            "citation_count": paper_data.get("citation_count") or 0,
            "publication_link": paper_data.get("publication_link"),
        }

        db_paper = ResearchPaper(**db_fields)
        db.add(db_paper)
        inserted_count += 1

    db.commit()
    return inserted_count, skipped_count