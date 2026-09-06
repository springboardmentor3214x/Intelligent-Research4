from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.user import User
from backend.app.schemas.research_paper import (
    ResearchPaperCreate,
    ResearchPaperListResponse,
    ResearchPaperResponse,
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


@router.get(
    "",
    response_model=ResearchPaperListResponse,
    status_code=status.HTTP_200_OK,
    summary="List research papers"
)
def list_research_papers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaperListResponse:

    papers = (
        db.query(ResearchPaper)
        .order_by(ResearchPaper.publication_date.desc().nullslast())
        .all()
    )

    return ResearchPaperListResponse(
        total=len(papers),
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