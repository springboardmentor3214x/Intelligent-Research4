from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
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

from backend.app.services.research_paper_service import (
    fetch_openalex_works,
    save_research_papers,
)

router = APIRouter(
    prefix="/research-papers",
    tags=["Research Papers"],
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
) -> ResearchPaper:
    """
    Create a normalized research paper record.

    Authentication is required because research-paper
    data is part of the Research Intelligence platform.
    """

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
    """
    Fetch research papers from OpenAlex, normalize them,
    and save new papers to PostgreSQL.
    """

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
    "",
    response_model=ResearchPaperSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search and filter research papers"
)
def list_research_papers(
    search: str | None = Query(
        default=None,
        description="Search title, abstract, authors, or keywords"
    ),
    year: int | None = Query(
        default=None,
        description="Filter by publication year"
    ),
    research_domain: str | None = Query(
        default=None,
        description="Filter by research domain"
    ),
    skip: int = Query(
        default=0,
        ge=0,
        description="Number of records to skip"
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Maximum number of records to return"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaperSearchResponse:

    query = db.query(ResearchPaper)

    if search:
        search_pattern = f"%{search}%"

        query = query.filter(
            ResearchPaper.title.ilike(search_pattern)
            | ResearchPaper.abstract.ilike(search_pattern)
            | ResearchPaper.authors.ilike(search_pattern)
            | ResearchPaper.keywords.ilike(search_pattern)
        )

    if year is not None:
        query = query.filter(
            ResearchPaper.publication_year == year
        )

    if research_domain:
        query = query.filter(
            ResearchPaper.research_domain.ilike(
                f"%{research_domain}%"
            )
        )

    total = query.count()

    papers = (
        query
        .order_by(
            ResearchPaper.publication_date.desc().nullslast()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return ResearchPaperSearchResponse(
        total=total,
        skip=skip,
        limit=limit,
        papers=papers,
    )


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