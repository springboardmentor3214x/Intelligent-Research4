import logging
import math
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.user import User
from backend.app.schemas.research_paper import (
    ResearchPaperCreate,
    ResearchPaperImportRequest,
    ResearchPaperResponse,
    ResearchPaperSearchResponse,
    ResearchBatchCorpusImportRequest,
)
from backend.app.services.research_analysis_service import (
    research_analysis_service,
)
from backend.app.services.research_paper_service import (
    ALL_PROVIDER_NAMES,
    aggregate_multi_source_search,
    get_all_provider_health,
    record_discovery_execution,
    save_research_papers,
    should_trigger_discovery,
)

from backend.app.services.citation_service import citation_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/research-papers",
    tags=["Research Papers"],
)


class AnalyzePaperRequest(BaseModel):
    force_refresh: bool = False


def _build_paper_response(paper: ResearchPaper) -> ResearchPaperResponse:
    """Helper to convert ResearchPaper ORM model to response schema with provenance and citation data."""
    meta = paper.source_metadata or {}
    prov = meta.get("provenance_sources") if isinstance(meta, dict) else None
    if not prov:
        prov = [paper.source]

    # Resolve accurate citation verification & source
    citation_info = meta.get("citation_info") if isinstance(meta, dict) else None
    if not citation_info:
        citation_info = citation_service.resolve_citation_data(
            doi=paper.doi,
            title=paper.title,
            existing_count=paper.citation_count,
            existing_source=paper.source,
        )

    return ResearchPaperResponse(
        id=paper.id,
        source=paper.source,
        source_id=paper.source_id,
        title=paper.title,
        abstract=paper.abstract,
        authors=paper.authors,
        publication_date=paper.publication_date,
        publication_year=paper.publication_year,
        journal_or_conference=paper.journal_or_conference,
        keywords=paper.keywords,
        research_domain=paper.research_domain,
        doi=paper.doi,
        citation_count=citation_info["citation_count"],
        is_citation_verified=citation_info["is_citation_verified"],
        citation_source=citation_info["citation_source"],
        publication_link=paper.publication_link,
        open_access_url=getattr(paper, "open_access_url", None),
        is_open_access=bool(getattr(paper, "is_open_access", False)),
        publisher=getattr(paper, "publisher", None),
        document_type=getattr(paper, "document_type", "publication") or "publication",
        is_preprint=bool(getattr(paper, "is_preprint", False)),
        source_metadata=paper.source_metadata,
        provenance_sources=prov,
        created_at=paper.created_at,
        updated_at=paper.updated_at,
    )


@router.post(
    "",
    response_model=ResearchPaperResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a research paper"
)
def create_research_paper(
    paper_in: ResearchPaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaperResponse:
    """Create a normalized research paper record."""
    existing_paper = (
        db.query(ResearchPaper)
        .filter(
            ResearchPaper.source == paper_in.source,
            ResearchPaper.source_id == paper_in.source_id,
        )
        .first()
    )

    if existing_paper:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Research paper already exists for this source and source ID",
        )

    db_paper = ResearchPaper(**paper_in.model_dump())
    db.add(db_paper)
    db.commit()
    db.refresh(db_paper)
    return _build_paper_response(db_paper)


@router.post(
    "/import",
    status_code=status.HTTP_200_OK,
    summary="Import research papers from academic sources"
)
def import_research_papers(
    import_request: ResearchPaperImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Fetch papers across specified academic sources (OpenAlex, Crossref, Semantic Scholar, CORE, arXiv, Europe PMC, PubMed, DOAJ),
    normalize, deduplicate, and persist to database.
    """
    target = import_request.target_count or 50
    sources = import_request.sources or ALL_PROVIDER_NAMES

    papers, provider_statuses = aggregate_multi_source_search(
        query=import_request.search,
        target_count=target,
        sources=sources,
        year_from=import_request.year_from,
        year_to=import_request.year_to,
    )

    inserted, skipped = save_research_papers(
        db=db,
        papers=papers,
    )

    total_in_db = db.query(ResearchPaper).count()

    return {
        "search": import_request.search,
        "sources": sources,
        "discovered": len(papers),
        "inserted": inserted,
        "skipped": skipped,
        "total_in_collection": total_in_db,
        "provider_statuses": provider_statuses,
    }


@router.post(
    "/batch-corpus-ingest",
    status_code=status.HTTP_200_OK,
    summary="Ingest large research corpus across multiple domains and topics"
)
def batch_corpus_ingest(
    request: ResearchBatchCorpusImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Batch ingester to build a large research corpus across diverse academic topics and sources.
    """
    default_topics = [
        "Artificial Intelligence",
        "Machine Learning",
        "Deep Learning",
        "Computer Vision",
        "Natural Language Processing",
        "Brain Tumor Segmentation",
        "3D U-Net",
        "Generative AI",
        "Large Language Models",
        "Federated Learning",
        "Medical Image Analysis",
        "Crowd Detection",
        "Cybersecurity",
        "Renewable Energy",
        "Quantum Computing",
        "Robotics",
        "Biomedical Engineering",
        "Drug Discovery",
    ]

    topics = request.topics or default_topics
    target_per_topic = request.target_per_topic or 100
    sources = request.sources or ALL_PROVIDER_NAMES

    total_inserted = 0
    total_skipped = 0
    topic_summaries = []

    for t in topics:
        try:
            papers, _ = aggregate_multi_source_search(
                query=t,
                target_count=target_per_topic,
                sources=sources,
            )
            inserted, skipped = save_research_papers(db=db, papers=papers)
            total_inserted += inserted
            total_skipped += skipped
            topic_summaries.append({
                "topic": t,
                "fetched": len(papers),
                "inserted": inserted,
                "skipped": skipped,
            })
        except Exception as e:
            logger.warning(f"Error ingesting topic '{t}': {e}")
            topic_summaries.append({
                "topic": t,
                "error": str(e),
            })

    total_in_db = db.query(ResearchPaper).count()

    return {
        "status": "completed",
        "topics_processed": len(topics),
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "current_corpus_total": total_in_db,
        "details": topic_summaries,
    }


@router.get(
    "/corpus-stats",
    summary="Get corpus growth statistics for Admin and platform overview",
)
def get_corpus_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Retrieve corpus statistics, source distributions, and progress toward targets."""
    total_papers = db.query(ResearchPaper).count()

    all_sources = db.query(ResearchPaper.source).all()
    sources_count: dict[str, int] = {}
    for (s,) in all_sources:
        if s:
            sources_count[s] = sources_count.get(s, 0) + 1

    all_domains = db.query(ResearchPaper.research_domain).all()
    domains_count: dict[str, int] = {}
    for (d,) in all_domains:
        if d:
            domains_count[d] = domains_count.get(d, 0) + 1

    target_corpus = 10000
    progress_pct = round((total_papers / target_corpus) * 100, 2)

    return {
        "total_papers": total_papers,
        "target_corpus": target_corpus,
        "progress_percentage": min(100.0, progress_pct),
        "sources": sources_count,
        "by_source": sources_count,
        "domains": dict(sorted(domains_count.items(), key=lambda x: x[1], reverse=True)[:10]),
        "sources_status": get_all_provider_health(),
    }


@router.get(
    "/recommendations/me",
    summary="Get personalized research paper recommendations for current user",
)
def get_user_recommendations(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return research_analysis_service.get_recommendations_for_user(
        db=db,
        current_user=current_user,
        limit=limit,
    )


@router.get(
    "/trends",
    summary="Get temporal research trends and topic activity analytics",
)
def get_research_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return research_analysis_service.compute_research_trends(db=db)


@router.get(
    "/insights-gaps",
    summary="Get synthesized research insights, repeated limitations, and gaps",
)
def get_research_insights_and_gaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return research_analysis_service.compute_insights_and_gaps(db=db)


@router.get(
    "",
    response_model=ResearchPaperSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search and filter research papers with automatic live scholarly discovery"
)
def list_research_papers(
    search: str | None = Query(default=None, description="Search title, abstract, authors, or keywords"),
    year: int | None = Query(default=None, description="Filter by publication year"),
    research_domain: str | None = Query(default=None, description="Filter by research domain"),
    source: str | None = Query(default=None, description="Filter by data source"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    page: int | None = Query(default=None, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaperSearchResponse:
    actual_limit = page_size if page_size is not None else limit
    actual_skip = ((page - 1) * actual_limit) if (page is not None and page > 0) else skip
    current_page = page if page is not None else ((actual_skip // actual_limit) + 1)

    is_live_augmented = False
    discovery_triggered = False
    discovery_status = "idle"
    provider_health_map = get_all_provider_health()

    # 1. Build local database query
    def build_local_query():
        q = db.query(ResearchPaper)
        if search and search.strip():
            search_pattern = f"%{search.strip()}%"
            q = q.filter(
                ResearchPaper.title.ilike(search_pattern)
                | ResearchPaper.abstract.ilike(search_pattern)
                | ResearchPaper.authors.ilike(search_pattern)
                | ResearchPaper.keywords.ilike(search_pattern)
            )
        if year is not None:
            q = q.filter(ResearchPaper.publication_year == year)
        if research_domain and research_domain.strip():
            q = q.filter(ResearchPaper.research_domain.ilike(f"%{research_domain.strip()}%"))
        if source and source.strip():
            q = q.filter(ResearchPaper.source.ilike(f"%{source.strip()}%"))
        return q

    local_query = build_local_query()
    local_count = local_query.count()

    # 2. Automated Scholarly Discovery Trigger:
    # If topic search has fewer than 20 results in local index, search external providers automatically
    if search and search.strip() and should_trigger_discovery(search.strip(), local_count, min_threshold=20):
        discovery_triggered = True
        discovery_status = "discovering"
        try:
            sources_to_query = [source.strip()] if (source and source.strip() and source.strip() in PROVIDERS_MAP) else ALL_PROVIDER_NAMES
            live_fetched, updated_statuses = aggregate_multi_source_search(
                query=search.strip(),
                target_count=35,
                sources=sources_to_query,
                year_from=year,
                year_to=year,
            )
            provider_health_map.update(updated_statuses)

            if live_fetched:
                inserted, _ = save_research_papers(db=db, papers=live_fetched)
                record_discovery_execution(search.strip(), len(live_fetched))
                if inserted > 0:
                    is_live_augmented = True
                    local_query = build_local_query()
                    local_count = local_query.count()
            discovery_status = "completed"
        except Exception as e:
            logger.warning(f"Automatic scholarly discovery encountered exception: {e}")
            discovery_status = "error"

    total = local_count
    total_pages = max(1, math.ceil(total / actual_limit))

    # Sources breakdown counts
    all_sources = db.query(ResearchPaper.source).all()
    sources_count: dict[str, int] = {}
    for (s,) in all_sources:
        if s:
            sources_count[s] = sources_count.get(s, 0) + 1

    raw_papers = (
        local_query
        .order_by(ResearchPaper.publication_date.desc().nullslast(), ResearchPaper.citation_count.desc())
        .offset(actual_skip)
        .limit(actual_limit)
        .all()
    )

    schema_papers = [_build_paper_response(p) for p in raw_papers]

    return ResearchPaperSearchResponse(
        total=total,
        skip=actual_skip,
        limit=actual_limit,
        page=current_page,
        page_size=actual_limit,
        total_pages=total_pages,
        sources=sources_count,
        sources_status=provider_health_map,
        is_live_augmented=is_live_augmented,
        discovery_triggered=discovery_triggered,
        discovery_status=discovery_status,
        papers=schema_papers,
    )


@router.get(
    "/{paper_id}/analysis",
    summary="Get structured AI paper analysis",
)
def get_paper_analysis(
    paper_id: UUID,
    auto_generate: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return research_analysis_service.analyze_paper(db=db, paper_id=paper_id)


@router.post(
    "/{paper_id}/analyze",
    summary="Trigger on-demand AI paper analysis",
)
def trigger_paper_analysis(
    paper_id: UUID,
    payload: AnalyzePaperRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return research_analysis_service.analyze_paper(db=db, paper_id=paper_id)


@router.get(
    "/{paper_id}",
    response_model=ResearchPaperResponse,
    status_code=status.HTTP_200_OK,
    summary="Get research paper by ID"
)
def get_research_paper(
    paper_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaperResponse:
    paper = (
        db.query(ResearchPaper)
        .filter(ResearchPaper.id == paper_id)
        .first()
    )
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research paper not found",
        )
    return _build_paper_response(paper)


@router.delete(
    "/{paper_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a research paper"
)
def delete_research_paper(
    paper_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    paper = (
        db.query(ResearchPaper)
        .filter(ResearchPaper.id == paper_id)
        .first()
    )
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research paper not found",
        )
    db.delete(paper)
    db.commit()