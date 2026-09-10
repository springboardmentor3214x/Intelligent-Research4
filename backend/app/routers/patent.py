from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.patent import Patent
from backend.app.schemas.patent import (
    ClusteringRunRequest,
    PatentClusterResponse,
    PatentImportRequest,
    PatentResponse,
    SimilarPatentsResponse,
)
from backend.app.services.patent_clustering_service import (
    patent_clustering_service,
)
from backend.app.services.patent_service import import_patents


router = APIRouter(
    prefix="/patents",
    tags=["Patents"],
)


@router.get("", response_model=list[PatentResponse])
def get_patents(
    keyword: str | None = Query(default=None),
    limit: int = Query(default=20, le=200),
    db: Session = Depends(get_db),
):
    """Retrieve patents with optional keyword filtering."""
    query = select(Patent)

    if keyword:
        query = query.where(
            Patent.title.ilike(f"%{keyword}%")
            | Patent.abstract.ilike(f"%{keyword}%")
            | Patent.technology_domain.ilike(f"%{keyword}%")
            | Patent.assignee.ilike(f"%{keyword}%")
        )

    query = query.order_by(Patent.created_at.desc()).limit(limit)

    return db.scalars(query).all()


@router.get("/clusters", response_model=PatentClusterResponse)
def get_patent_clusters(
    n_clusters: int | None = Query(default=None, ge=2, le=20),
    max_patents: int = Query(default=500, ge=4, le=2000),
    db: Session = Depends(get_db),
):
    """
    Retrieve AI/ML patent clusters, automatic labels, representative patents,
    silhouette quality score, and 2D visualization coordinates.
    """
    return patent_clustering_service.cluster_patents(
        db=db,
        n_clusters=n_clusters,
        max_patents=max_patents,
    )


@router.post("/clusters/run", response_model=PatentClusterResponse)
def run_patent_clustering(
    request: ClusteringRunRequest,
    db: Session = Depends(get_db),
):
    """
    Trigger on-demand patent clustering with user-defined parameters.
    """
    return patent_clustering_service.cluster_patents(
        db=db,
        n_clusters=request.n_clusters,
        max_patents=request.max_patents,
    )


@router.post("/import")
def import_patent_data(
    request: PatentImportRequest,
    db: Session = Depends(get_db),
):
    """Import patents from EPO Linked Data API into PostgreSQL."""
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
    """Get single patent details by UUID."""
    patent = db.get(Patent, patent_id)

    if not patent:
        raise HTTPException(
            status_code=404,
            detail="Patent not found",
        )

    return patent


@router.get("/{patent_id}/similar", response_model=SimilarPatentsResponse)
def get_similar_patents(
    patent_id: UUID,
    top_k: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Find semantically similar patents using sentence embedding cosine similarity.
    Returns relevance scores and explainable shared technology terms.
    """
    return patent_clustering_service.find_similar_patents(
        db=db,
        source_patent_id=patent_id,
        top_k=top_k,
    )