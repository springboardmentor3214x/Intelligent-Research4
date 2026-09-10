from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.patent import Patent
from backend.app.schemas.patent import (
    PatentImportRequest,
    PatentResponse,
)
from backend.app.services.patent_service import import_patents


router = APIRouter(
    prefix="/patents",
    tags=["Patents"],
)


@router.get("", response_model=list[PatentResponse])
def get_patents(
    keyword: str | None = Query(default=None),
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    query = select(Patent)

    if keyword:
        query = query.where(
            Patent.title.ilike(f"%{keyword}%")
            | Patent.abstract.ilike(f"%{keyword}%")
        )

    query = query.limit(limit)

    return db.scalars(query).all()


@router.get("/{patent_id}", response_model=PatentResponse)
def get_patent(
    patent_id: UUID,
    db: Session = Depends(get_db),
):
    patent = db.get(Patent, patent_id)

    if not patent:
        raise HTTPException(
            status_code=404,
            detail="Patent not found",
        )

    return patent


@router.post("/import")
def import_patent_data(
    request: PatentImportRequest,
    db: Session = Depends(get_db),
):
    if request.limit < 1 or request.limit > 50:
        raise HTTPException(
            status_code=400,
            detail="limit must be between 1 and 50",
        )

    return import_patents(
        db,
        request.keyword,
        request.limit,
    )