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
)
from backend.app.services.research_analysis_service import (
    research_analysis_service,
)
from backend.app.services.research_paper_service import (
    fetch_openalex_works,
    save_research_papers,
)

router = APIRouter(
    prefix="/research-papers",
    tags=["Research Papers"],
)


class AnalyzePaperRequest(BaseModel):
    force_refresh: bool = False


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
) -> ResearchPaper:
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
    return db_paper


@router.post(
    "/import",
    status_code=status.HTTP_200_OK,
    summary="Import research papers from OpenAlex"
)
def import_research_papers(
    import_request: ResearchPaperImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Fetch research papers from OpenAlex, normalize them, and save new papers to PostgreSQL."""
    papers = fetch_openalex_works(
        search=import_request.search,
        per_page=import_request.per_page,
    )

    inserted, skipped = save_research_papers(
        db=db,
        papers=papers,
    )

    return {
        "source": "OpenAlex",
        "search": import_request.search,
        "fetched": len(papers),
        "inserted": inserted,
        "skipped": skipped,
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
    """
    Recommend papers matching researcher's domain, research areas,
    keywords, and research interests via semantic text similarity.
    """
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
    """Analyze actual available research papers over time, frequency of topics, and growth rates."""
    return research_analysis_service.compute_research_trends(db=db)


@router.get(
    "/insights-gaps",
    summary="Get synthesized research insights, repeated limitations, and gaps",
)
def get_research_insights_and_gaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Retrieve recurring research problems, limitations, and future research directions."""
    return research_analysis_service.compute_insights_and_gaps(db=db)


@router.get(
    "",
    response_model=ResearchPaperSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search and filter research papers"
)
def list_research_papers(
    search: str | None = Query(default=None, description="Search title, abstract, authors, or keywords"),
    year: int | None = Query(default=None, description="Filter by publication year"),
    research_domain: str | None = Query(default=None, description="Filter by research domain"),
    source: str | None = Query(default=None, description="Filter by data source"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    page: int | None = Query(default=None, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaperSearchResponse:
    # Support page/page_size or skip/limit
    actual_limit = page_size if page_size is not None else limit
    actual_skip = ((page - 1) * actual_limit) if (page is not None and page > 0) else skip
    current_page = page if page is not None else ((actual_skip // actual_limit) + 1)

    query = db.query(ResearchPaper)

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            ResearchPaper.title.ilike(search_pattern)
            | ResearchPaper.abstract.ilike(search_pattern)
            | ResearchPaper.authors.ilike(search_pattern)
            | ResearchPaper.keywords.ilike(search_pattern)
        )

    if year is not None:
        query = query.filter(ResearchPaper.publication_year == year)

    if research_domain and research_domain.strip():
        query = query.filter(ResearchPaper.research_domain.ilike(f"%{research_domain.strip()}%"))

    if source and source.strip():
        query = query.filter(ResearchPaper.source.ilike(f"%{source.strip()}%"))

    total = query.count()
    total_pages = max(1, math.ceil(total / actual_limit))

    # Sources breakdown counts
    all_sources = db.query(ResearchPaper.source).all()
    sources_count: dict[str, int] = {}
    for (s,) in all_sources:
        if s:
            sources_count[s] = sources_count.get(s, 0) + 1

    papers = (
        query
        .order_by(ResearchPaper.publication_date.desc().nullslast())
        .offset(actual_skip)
        .limit(actual_limit)
        .all()
    )

    return ResearchPaperSearchResponse(
        total=total,
        skip=actual_skip,
        limit=actual_limit,
        page=current_page,
        page_size=actual_limit,
        total_pages=total_pages,
        sources=sources_count,
        papers=papers,
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
    """Retrieve structured AI analysis of a specific research paper."""
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
    """Trigger structured AI analysis for a paper."""
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
) -> ResearchPaper:
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
    return paper


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