from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
import logging
import re
import time
from typing import Any, Optional
from sqlalchemy.orm import Session

from backend.app.models.research_paper import ResearchPaper
from backend.app.services.providers.base import (
    BaseResearchProvider,
    NormalizedPaper,
    ProviderResult,
    ProviderStatus,
)
from backend.app.services.providers.openalex import OpenAlexProvider
from backend.app.services.providers.crossref import CrossrefProvider
from backend.app.services.providers.semantic_scholar import SemanticScholarProvider
from backend.app.services.providers.core import CoreProvider
from backend.app.services.providers.arxiv import ArxivProvider
from backend.app.services.providers.europe_pmc import EuropePMCProvider
from backend.app.services.providers.pubmed import PubMedProvider
from backend.app.services.providers.doaj import DOAJProvider
from backend.app.services.providers.openaire import OpenAIREProvider
from backend.app.services.providers.zenodo import ZenodoProvider
from backend.app.services.providers.biorxiv import BioRxivProvider
from backend.app.services.providers.medrxiv import MedRxivProvider
from backend.app.services.providers.base_provider import BaseProvider

logger = logging.getLogger(__name__)

# Discovery Cache / Cooldown Tracker (query_normalized -> {timestamp, count})
_DISCOVERY_COOLDOWN_SECONDS = 1800  # 30 minutes cooldown for repeated live searches
_DISCOVERY_CACHE: dict[str, dict[str, Any]] = {}

# 13 Connected Academic & Pre-print Research Providers
PROVIDERS_MAP: dict[str, BaseResearchProvider] = {
    "OpenAlex": OpenAlexProvider(),
    "Crossref": CrossrefProvider(),
    "Semantic Scholar": SemanticScholarProvider(),
    "CORE": CoreProvider(),
    "arXiv": ArxivProvider(),
    "Europe PMC": EuropePMCProvider(),
    "PubMed": PubMedProvider(),
    "DOAJ": DOAJProvider(),
    "OpenAIRE": OpenAIREProvider(),
    "Zenodo": ZenodoProvider(),
    "bioRxiv": BioRxivProvider(),
    "medRxiv": MedRxivProvider(),
    "BASE": BaseProvider(),
}

ALL_PROVIDER_NAMES = [
    "OpenAlex",
    "Crossref",
    "Semantic Scholar",
    "CORE",
    "arXiv",
    "Europe PMC",
    "PubMed",
    "DOAJ",
    "OpenAIRE",
    "Zenodo",
    "bioRxiv",
    "medRxiv",
    "BASE",
]


def normalize_query_text(text: str | None) -> str:
    """Normalize user search query while preserving alphanumeric and essential hyphens."""
    if not text:
        return ""
    cleaned = re.sub(r"[^\w\s\-]", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def normalize_title_for_comparison(title: str | None) -> str:
    """Strip all punctuation and extra whitespace for robust title comparison."""
    if not title:
        return ""
    return re.sub(r"[^a-z0-9]", "", title.lower())


def generate_concept_expansions(query: str) -> list[str]:
    """
    Intelligently generate fallback search concepts when exact searches yield few results.
    E.g. 'Crowd Detection and Prediction System' -> ['Crowd Detection and Prediction System', 'Crowd Detection', 'Crowd Prediction', 'Crowd Analysis']
    """
    normalized = normalize_query_text(query)
    if not normalized:
        return []

    expansions = [normalized]
    words = normalized.split()

    if len(words) >= 3:
        stop_words = {
            "and", "or", "of", "in", "the", "a", "an", "for", "with",
            "system", "using", "based", "approach", "framework", "study",
        }
        filtered_words = [w for w in words if w.lower() not in stop_words]

        if len(filtered_words) >= 2:
            expansions.append(" ".join(filtered_words[:2]))
            expansions.append(" ".join(filtered_words[-2:]))
            if len(filtered_words) >= 3:
                expansions.append(" ".join(filtered_words[:3]))

        lower_q = normalized.lower()
        if "crowd" in lower_q and "detection" in lower_q:
            expansions.extend(["crowd detection", "crowd density estimation", "crowd counting", "crowd behavior analysis"])
        elif "brain" in lower_q and "tumor" in lower_q:
            expansions.extend(["brain tumor segmentation", "glioma segmentation", "MRI brain tumor", "medical image segmentation"])
        elif "u-net" in lower_q or "unet" in lower_q:
            expansions.extend(["3D U-Net", "U-Net architecture", "biomedical image segmentation U-Net"])
        elif "generative" in lower_q and "ai" in lower_q:
            expansions.extend(["generative artificial intelligence", "large language models", "diffusion models"])
        elif "computer" in lower_q and "vision" in lower_q:
            expansions.extend(["computer vision", "object detection", "semantic segmentation"])
        elif "natural" in lower_q and "language" in lower_q:
            expansions.extend(["natural language processing", "large language models", "transformer architectures"])

    seen = set()
    unique_expansions = []
    for exp in expansions:
        clean = exp.strip()
        if clean and clean.lower() not in seen:
            seen.add(clean.lower())
            unique_expansions.append(clean)

    return unique_expansions[:4]


def check_paper_relevance(paper: dict | NormalizedPaper, query: str) -> bool:
    """
    Verify that the paper is genuinely relevant to the query based on title,
    abstract, keywords, and domain.
    """
    if not query or not query.strip():
        return True

    q_words = [w.lower() for w in normalize_query_text(query).split() if len(w) > 2]
    if not q_words:
        return True

    if isinstance(paper, NormalizedPaper):
        title = (paper.title or "").lower()
        abstract = (paper.abstract or "").lower()
        keywords = (paper.keywords or "").lower()
        domain = (paper.research_domain or "").lower()
    else:
        title = (paper.get("title") or "").lower()
        abstract = (paper.get("abstract") or "").lower()
        keywords = (paper.get("keywords") or "").lower()
        domain = (paper.get("research_domain") or "").lower()

    combined_text = f"{title} {abstract} {keywords} {domain}"

    if len(q_words) == 1:
        return q_words[0] in combined_text

    matches = sum(1 for w in q_words if w in combined_text)
    title_matches = sum(1 for w in q_words if w in title)

    return matches >= max(1, len(q_words) // 2) or title_matches >= 1


def deduplicate_papers(papers: list[dict | NormalizedPaper]) -> list[dict]:
    """
    Robust multi-priority deduplication:
    Priority 1: DOI exact match (canonicalized)
    Priority 2: source + source_id compound key
    Priority 3: normalized title + publication year
    Priority 4: normalized title (for long unique titles > 18 chars)
    Preserves and merges multi-source provenance.
    """
    canonical_dict: dict[str, dict] = {}
    doi_to_key: dict[str, str] = {}
    title_year_to_key: dict[str, str] = {}
    title_to_key: dict[str, str] = {}

    for item in papers:
        p = item.to_dict() if isinstance(item, NormalizedPaper) else dict(item)

        doi = p.get("doi")
        canonical_doi = doi.lower().replace("https://doi.org/", "").replace("http://doi.org/", "").strip() if doi else None
        source = p.get("source") or "Unknown"
        source_id = str(p.get("source_id") or "")
        source_key = f"{source}:{source_id}"

        title = (p.get("title") or "").strip()
        norm_title = normalize_title_for_comparison(title)
        year = p.get("publication_year")
        title_year_key = f"{norm_title}:{year}" if norm_title else None

        existing_key = None
        if canonical_doi and canonical_doi in doi_to_key:
            existing_key = doi_to_key[canonical_doi]
        elif source_key in canonical_dict:
            existing_key = source_key
        elif title_year_key and title_year_key in title_year_to_key:
            existing_key = title_year_to_key[title_year_key]
        elif len(norm_title) > 20 and norm_title in title_to_key:
            existing_key = title_to_key[norm_title]

        if existing_key and existing_key in canonical_dict:
            # Merge provenance & preserve multi-source info
            target = canonical_dict[existing_key]
            prov = target.get("provenance_sources", [target.get("source")])
            if source not in prov:
                prov.append(source)
            target["provenance_sources"] = prov

            # Update abstract if existing is missing or shorter
            if not target.get("abstract") and p.get("abstract"):
                target["abstract"] = p["abstract"]
            elif target.get("abstract") and p.get("abstract") and len(p["abstract"]) > len(target["abstract"]):
                target["abstract"] = p["abstract"]

            # Update Open Access URL if available
            if not target.get("open_access_url") and p.get("open_access_url"):
                target["open_access_url"] = p["open_access_url"]
                target["is_open_access"] = True

            # Preserve preprint status & doc_type if richer
            if p.get("is_preprint") and not target.get("is_preprint"):
                target["is_preprint"] = True
            if p.get("document_type") and p.get("document_type") != "publication":
                target["document_type"] = p["document_type"]

            # Update citations if higher
            if (p.get("citation_count") or 0) > (target.get("citation_count") or 0):
                target["citation_count"] = p["citation_count"]
        else:
            primary_key = canonical_doi or source_key
            if not p.get("provenance_sources"):
                p["provenance_sources"] = [source]
            canonical_dict[primary_key] = p

            if canonical_doi:
                doi_to_key[canonical_doi] = primary_key
            if title_year_key:
                title_year_to_key[title_year_key] = primary_key
            if len(norm_title) > 20:
                title_to_key[norm_title] = primary_key

    return list(canonical_dict.values())


def query_single_provider(
    provider_name: str,
    query: str,
    target_count: int = 30,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
) -> ProviderResult:
    """Query a single provider safely with complete error isolation."""
    provider = PROVIDERS_MAP.get(provider_name)
    if not provider:
        return ProviderResult(
            source=provider_name,
            results=[],
            total=0,
            status=ProviderStatus.NOT_CONFIGURED,
            error="Provider not recognized",
        )

    try:
        return provider.search(
            query=query,
            target_count=target_count,
            year_from=year_from,
            year_to=year_to,
        )
    except Exception as e:
        logger.warning(f"Unexpected error querying provider {provider_name}: {e}")
        return ProviderResult(
            source=provider_name,
            results=[],
            total=0,
            status=ProviderStatus.ERROR,
            error=str(e),
        )


def aggregate_multi_source_search(
    query: str,
    target_count: int = 80,
    sources: Optional[list[str]] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    max_workers: int = 5,
) -> tuple[list[dict], dict[str, str]]:
    """
    Bounded parallel execution across all configured academic research providers.
    Returns (deduplicated_papers, provider_statuses).
    Never crashes on any individual provider failure or rate-limit.
    """
    if not sources:
        sources = list(ALL_PROVIDER_NAMES)

    cleaned_query = query.strip()
    expansions = generate_concept_expansions(cleaned_query)

    provider_statuses: dict[str, str] = {}
    for s in sources:
        p = PROVIDERS_MAP.get(s)
        provider_statuses[s] = p.get_health_status().value if p else "not_configured"

    all_fetched_papers: list[NormalizedPaper] = []
    per_provider_target = max(8, min(40, target_count // max(1, len(sources)) + 3))

    for q in expansions:
        if len(all_fetched_papers) >= target_count:
            break

        # Execute providers in bounded thread pool
        with ThreadPoolExecutor(max_workers=min(max_workers, len(sources))) as executor:
            future_to_provider = {
                executor.submit(
                    query_single_provider,
                    provider_name=src,
                    query=q,
                    target_count=per_provider_target,
                    year_from=year_from,
                    year_to=year_to,
                ): src
                for src in sources
            }

            for future in as_completed(future_to_provider):
                src_name = future_to_provider[future]
                try:
                    res: ProviderResult = future.result()
                    provider_statuses[src_name] = res.status.value
                    if res.results:
                        for p in res.results:
                            if check_paper_relevance(p, cleaned_query):
                                all_fetched_papers.append(p)
                except Exception as e:
                    logger.warning(f"Error handling provider result for {src_name}: {e}")
                    provider_statuses[src_name] = "error"

    deduplicated = deduplicate_papers(all_fetched_papers)
    return deduplicated, provider_statuses


def save_research_papers(db: Session, papers: list[dict]) -> tuple[int, int]:
    """
    Persist normalized research papers to database, checking both (source, source_id)
    and DOI uniqueness to avoid duplicates.
    Returns (inserted_count, skipped_count).
    """
    inserted_count = 0
    skipped_count = 0

    unique_batch = deduplicate_papers(papers)

    for paper_data in unique_batch:
        try:
            source = paper_data.get("source") or "Unknown"
            source_id = str(paper_data.get("source_id") or "")
            doi = paper_data.get("doi")

            existing = (
                db.query(ResearchPaper)
                .filter(
                    ResearchPaper.source == source,
                    ResearchPaper.source_id == source_id,
                )
                .first()
            )

            if not existing and doi:
                existing = (
                    db.query(ResearchPaper)
                    .filter(ResearchPaper.doi == doi)
                    .first()
                )

            if existing:
                meta = existing.source_metadata or {}
                prov = meta.get("provenance_sources", [existing.source])
                if source not in prov:
                    prov.append(source)
                    meta["provenance_sources"] = prov
                    existing.source_metadata = meta
                    db.add(existing)
                skipped_count += 1
                continue

            clean_insert_data = {
                "source": source,
                "source_id": source_id,
                "title": (paper_data.get("title") or "Untitled").strip(),
                "abstract": paper_data.get("abstract"),
                "authors": paper_data.get("authors"),
                "publication_date": paper_data.get("publication_date"),
                "publication_year": paper_data.get("publication_year"),
                "journal_or_conference": paper_data.get("journal_or_conference"),
                "keywords": paper_data.get("keywords"),
                "research_domain": paper_data.get("research_domain") or "Academic Research",
                "doi": doi,
                "citation_count": paper_data.get("citation_count") or 0,
                "publication_link": paper_data.get("publication_link"),
                "open_access_url": paper_data.get("open_access_url"),
                "is_open_access": bool(paper_data.get("is_open_access")),
                "publisher": paper_data.get("publisher"),
                "document_type": paper_data.get("document_type") or "publication",
                "is_preprint": bool(paper_data.get("is_preprint", False)),
                "source_metadata": {
                    **(paper_data.get("source_metadata") or {}),
                    "provenance_sources": paper_data.get("provenance_sources", [source]),
                },
            }

            db_paper = ResearchPaper(**clean_insert_data)
            db.add(db_paper)
            inserted_count += 1
        except Exception as e:
            logger.warning(f"Error staging paper insert: {e}")
            skipped_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database commit error in save_research_papers: {e}")

    return inserted_count, skipped_count


def should_trigger_discovery(query: str, current_count: int, min_threshold: int = 20) -> bool:
    """
    Determine if automatic external discovery should be triggered.
    Checks result count threshold and cooldown window.
    """
    if not query or not query.strip():
        return False
    if current_count >= min_threshold:
        return False

    q_norm = normalize_query_text(query).lower()
    now = time.time()
    cached = _DISCOVERY_CACHE.get(q_norm)
    if cached:
        last_time = cached.get("timestamp", 0)
        if (now - last_time) < _DISCOVERY_COOLDOWN_SECONDS:
            return False

    return True


def record_discovery_execution(query: str, count_found: int):
    """Update cooldown tracking for discovery search queries."""
    q_norm = normalize_query_text(query).lower()
    _DISCOVERY_CACHE[q_norm] = {
        "timestamp": time.time(),
        "count_found": count_found,
    }


def get_all_provider_health() -> dict[str, str]:
    """Return live status for all 13 providers."""
    return {
        name: p.get_health_status().value
        for name, p in PROVIDERS_MAP.items()
    }