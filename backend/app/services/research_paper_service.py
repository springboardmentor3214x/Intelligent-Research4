from datetime import date

import httpx
from sqlalchemy.orm import Session

from backend.app.models.research_paper import ResearchPaper


OPENALEX_WORKS_URL = "https://api.openalex.org/works"


def reconstruct_abstract(
    abstract_inverted_index: dict | None,
) -> str | None:
    """
    Convert OpenAlex's abstract inverted index
    into normal text.
    """

    if not abstract_inverted_index:
        return None

    words = []

    for word, positions in abstract_inverted_index.items():
        for position in positions:
            words.append((position, word))

    words.sort(key=lambda item: item[0])

    return " ".join(word for _, word in words)


def normalize_openalex_work(work: dict) -> dict:
    """
    Convert one OpenAlex work into the
    ResearchPaper database structure.
    """

    authorships = work.get("authorships") or []

    author_names = []

    for authorship in authorships:
        author = authorship.get("author") or {}
        name = author.get("display_name")

        if name and name not in author_names:
            author_names.append(name)

    authors = ", ".join(author_names) if author_names else None

    primary_location = work.get("primary_location") or {}
    journal = primary_location.get("source") or {}

    journal_or_conference = journal.get("display_name")

    topics = work.get("topics") or []

    topic_names = []

    for topic in topics:
        topic_name = topic.get("display_name")

        if topic_name:
            topic_names.append(topic_name)

    keywords = ", ".join(topic_names) if topic_names else None

    abstract = reconstruct_abstract(
        work.get("abstract_inverted_index")
    )

    openalex_id = work.get("id")

    if not openalex_id:
        raise ValueError("OpenAlex work does not contain an ID")

    source_id = openalex_id.rstrip("/").split("/")[-1]

    publication_date = None

    if work.get("publication_date"):
        publication_date = date.fromisoformat(
            work["publication_date"]
        )

    return {
        "source": "OpenAlex",
        "source_id": source_id,
        "title": work.get("title") or "Untitled",
        "abstract": abstract,
        "authors": authors,
        "publication_date": publication_date,
        "publication_year": work.get("publication_year"),
        "journal_or_conference": journal_or_conference,
        "keywords": keywords,
        "research_domain": (
            topics[0]
            .get("field", {})
            .get("display_name")
            if topics
            else None
        ),
        "doi": work.get("doi"),
        "citation_count": work.get("cited_by_count") or 0,
        "publication_link": (
            primary_location.get("landing_page_url")
            or work.get("doi")
        ),
    }


def fetch_openalex_works(
    search: str,
    per_page: int = 10,
) -> list[dict]:
    """
    Search OpenAlex and return normalized research papers.
    """

    params = {
        "search": search,
        "per-page": per_page,
    }

    response = httpx.get(
        OPENALEX_WORKS_URL,
        params=params,
        timeout=20,
    )

    response.raise_for_status()

    data = response.json()

    return [
        normalize_openalex_work(work)
        for work in data.get("results", [])
    ]


def save_research_papers(
    db: Session,
    papers: list[dict],
) -> tuple[int, int]:
    """
    Save normalized research papers to PostgreSQL.

    Returns:
        (inserted_count, skipped_count)
    """

    inserted_count = 0
    skipped_count = 0

    for paper_data in papers:

        existing_paper = (
            db.query(ResearchPaper)
            .filter(
                ResearchPaper.source == paper_data["source"],
                ResearchPaper.source_id == paper_data["source_id"],
            )
            .first()
        )

        if existing_paper:
            skipped_count += 1
            continue

        db_paper = ResearchPaper(**paper_data)

        db.add(db_paper)

        inserted_count += 1

    db.commit()

    return inserted_count, skipped_count

SEMANTIC_SCHOLAR_SEARCH_URL = (
    "https://api.semanticscholar.org/graph/v1/paper/search"
)


def normalize_semantic_scholar_paper(paper: dict) -> dict:
    """
    Convert one Semantic Scholar paper into
    the ResearchPaper database structure.
    """

    authors = paper.get("authors") or []

    author_names = []

    for author in authors:
        name = author.get("name")

        if name and name not in author_names:
            author_names.append(name)

    author_text = (
        ", ".join(author_names)
        if author_names
        else None
    )

    publication_date = None

    if paper.get("publicationDate"):
        publication_date = date.fromisoformat(
            paper["publicationDate"]
        )

    external_ids = paper.get("externalIds") or {}

    doi = external_ids.get("DOI")

    return {
        "source": "Semantic Scholar",
        "source_id": paper.get("paperId"),
        "title": paper.get("title") or "Untitled",
        "abstract": paper.get("abstract"),
        "authors": author_text,
        "publication_date": publication_date,
        "publication_year": paper.get("year"),
        "journal_or_conference": (
            (paper.get("journal") or {}).get("name")
        ),
        "keywords": None,
        "research_domain": None,
        "doi": (
            f"https://doi.org/{doi}"
            if doi
            else None
        ),
        "citation_count": (
            paper.get("citationCount") or 0
        ),
        "publication_link": paper.get("url"),
    }


def fetch_semantic_scholar_papers(
    search: str,
    per_page: int = 10,
) -> list[dict]:
    """
    Search Semantic Scholar and return normalized
    research papers.
    """

    params = {
        "query": search,
        "limit": per_page,
        "fields": (
            "paperId,title,abstract,authors,"
            "year,publicationDate,journal,"
            "externalIds,citationCount,url"
        ),
    }

    response = httpx.get(
        SEMANTIC_SCHOLAR_SEARCH_URL,
        params=params,
        timeout=20,
    )

    if response.status_code == 429:
        return []

    response.raise_for_status()

    data = response.json()

    return [
        normalize_semantic_scholar_paper(paper)
        for paper in data.get("data", [])
        if paper.get("paperId")
    ]

CROSSREF_WORKS_URL = "https://api.crossref.org/v1/works"


def fetch_crossref_metadata(
    doi: str,
) -> dict | None:
    """
    Retrieve supporting metadata from Crossref
    using a DOI.
    """

    clean_doi = doi.replace(
        "https://doi.org/",
        ""
    ).strip()

    response = httpx.get(
        f"{CROSSREF_WORKS_URL}/{clean_doi}",
        params={
            "mailto": "research-platform@example.com"
        },
        timeout=20,
    )

    if response.status_code == 404:
        return None

    response.raise_for_status()

    return response.json().get("message")