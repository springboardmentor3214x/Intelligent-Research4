from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
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


@router.get("", response_model=List[PatentResponse])
def get_patents(
    keyword: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=500),
    db: Session = Depends(get_db),
):
    query = select(Patent)

    if keyword:
        query = query.where(
            or_(
                Patent.title.ilike(f"%{keyword}%"),
                Patent.abstract.ilike(f"%{keyword}%"),
                Patent.technology_domain.ilike(f"%{keyword}%"),
                Patent.assignee.ilike(f"%{keyword}%"),
            )
        )

    query = query.limit(limit)
    return db.scalars(query).all()


@router.get("/search", response_model=List[PatentResponse])
def search_patents(
    q: Optional[str] = Query(default=None),
    keyword: Optional[str] = Query(default=None),
    domain: Optional[str] = Query(default=None),
    assignee: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=500),
    db: Session = Depends(get_db),
):
    search_term = q or keyword
    query = select(Patent)

    if search_term:
        query = query.where(
            or_(
                Patent.title.ilike(f"%{search_term}%"),
                Patent.abstract.ilike(f"%{search_term}%"),
                Patent.technology_domain.ilike(f"%{search_term}%"),
                Patent.assignee.ilike(f"%{search_term}%"),
                Patent.classification.ilike(f"%{search_term}%"),
            )
        )

    if domain:
        query = query.where(Patent.technology_domain.ilike(f"%{domain}%"))

    if assignee:
        query = query.where(Patent.assignee.ilike(f"%{assignee}%"))

    query = query.limit(limit)
    return db.scalars(query).all()


@router.get("/suggestions")
def get_patent_suggestions(
    q: Optional[str] = Query(default=""),
    limit: int = Query(default=8, le=20),
    db: Session = Depends(get_db),
):
    if not q or not q.strip():
        return {"query": "", "suggestions": []}

    search_term = q.strip()
    patents = (
        db.query(Patent.title, Patent.technology_domain, Patent.assignee)
        .filter(
            or_(
                Patent.title.ilike(f"%{search_term}%"),
                Patent.technology_domain.ilike(f"%{search_term}%"),
                Patent.assignee.ilike(f"%{search_term}%"),
            )
        )
        .limit(limit)
        .all()
    )

    suggestions = []
    for p in patents:
        if p.title and p.title not in suggestions:
            suggestions.append(p.title)
        if p.technology_domain and p.technology_domain not in suggestions:
            suggestions.append(p.technology_domain)

    return {"query": search_term, "suggestions": suggestions[:limit]}


@router.get("/clusters")
def get_patent_clusters(
    n_clusters: Optional[int] = Query(default=None),
    max_patents: int = Query(default=50, le=500),
    db: Session = Depends(get_db),
):
    patents = db.query(Patent).limit(max_patents).all()

    points = []
    for idx, p in enumerate(patents):
        # Derive cluster ID by domain or hash
        domain = p.technology_domain or "General Technology"
        cluster_id = abs(hash(domain)) % 5

        # Normalize year for x/y coordinate representation
        year = p.filing_date.year if p.filing_date else 2020
        x = (year - 2000) * 1.5 + ((idx % 7) - 3) * 0.8
        y = (p.citation_count or 0) * 0.5 + ((idx % 5) - 2) * 1.2
        z = cluster_id * 2.0 - 4.0

        points.append({
            "id": str(p.id),
            "title": p.title,
            "publication_number": p.publication_number,
            "assignee": p.assignee,
            "technology_domain": domain,
            "year": year,
            "citations": p.citation_count or 0,
            "cluster_id": cluster_id,
            "cluster_name": domain,
            "x": round(x, 2),
            "y": round(y, 2),
            "z": round(z, 2),
        })

    return {
        "total_patents": len(points),
        "clusters_count": len(set(p["cluster_id"] for p in points)),
        "points": points,
    }


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