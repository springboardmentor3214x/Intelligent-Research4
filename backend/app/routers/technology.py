from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.technology import Technology
from backend.app.services.technology_service import sync_technologies
from backend.app.services.technology_analysis_service import TechnologyAnalysisService
from backend.app.schemas.technology import (
    TechnologyResponse,
    TechnologyMaturityResponse,
    TechnologyReadinessResponse,
    TechnologyAdoptionResponse,
    TechnologyTrendResponse,
    TechnologyFullAnalysisResponse,
    TechnologyQueryAnalysisResponse,
)


router = APIRouter(
    prefix="/technologies",
    tags=["Technology Intelligence"],
)


@router.post("/sync")
def sync_technology_data(
    db: Session = Depends(get_db),
):
    """
    Build/update technology intelligence
    from Research Papers, Patents and Funding.
    """
    technologies = sync_technologies(db)
    return {
        "message": "Technology data synchronized successfully",
        "technologies_found": len(technologies),
    }


@router.get("", response_model=List[TechnologyResponse])
def get_technologies(
    db: Session = Depends(get_db),
):
    """
    Return all technology intelligence records.
    """
    technologies = (
        db.query(Technology)
        .order_by(
            Technology.emerging_score.desc().nullslast()
        )
        .all()
    )
    return technologies


@router.get("/emerging", response_model=List[TechnologyResponse])
def get_emerging_technologies(
    db: Session = Depends(get_db),
):
    technologies = (
        db.query(Technology)
        .filter(
            Technology.emerging_status.in_(
                ["Emerging", "Growing"]
            )
        )
        .order_by(
            Technology.emerging_score.desc()
        )
        .all()
    )
    return technologies


@router.get("/search", response_model=List[TechnologyResponse])
def search_technologies(
    keyword: str = Query(
        ...,
        min_length=2,
        description="Technology name or domain",
    ),
    db: Session = Depends(get_db),
):
    """
    Search technologies by name or domain.
    """
    search_pattern = f"%{keyword}%"
    technologies = (
        db.query(Technology)
        .filter(
            (
                Technology.technology_name.ilike(
                    search_pattern
                )
            )
            | (
                Technology.technology_domain.ilike(
                    search_pattern
                )
            )
        )
        .order_by(
            Technology.emerging_score.desc().nullslast()
        )
        .all()
    )
    return technologies


@router.get("/analytics/trends", response_model=List[TechnologyTrendResponse])
def get_all_technologies_trends(
    db: Session = Depends(get_db),
):
    """
    Return trend analysis across all tracked technologies.
    """
    return TechnologyAnalysisService.get_all_trends(db)


@router.get("/analytics/maturity", response_model=List[TechnologyMaturityResponse])
def get_all_technologies_maturity(
    db: Session = Depends(get_db),
):
    """
    Return maturity evaluations across all tracked technologies.
    """
    return TechnologyAnalysisService.get_all_maturities(db)


@router.get("/analytics/adoption", response_model=List[TechnologyAdoptionResponse])
def get_all_technologies_adoption(
    db: Session = Depends(get_db),
):
    """
    Return adoption metrics across all tracked technologies.
    """
    return TechnologyAnalysisService.get_all_adoptions(db)


@router.get("/analyze", response_model=TechnologyQueryAnalysisResponse)
def analyze_technology_query(
    query: str = Query(
        ...,
        min_length=1,
        max_length=120,
        description="Technology name or concept to analyze dynamically across research, patents, and funding",
    ),
    db: Session = Depends(get_db),
):
    """
    Analyze any user-specified technology concept.
    Synthesizes real empirical signals across research papers, patents, and funding records.
    Distinguishes direct match vs related technology evidence vs insufficient data.
    """
    return TechnologyAnalysisService.analyze_custom_query(db, query)



@router.get("/{technology_id}", response_model=TechnologyResponse)
def get_technology(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return details of one technology.
    """
    technology = (
        db.query(Technology)
        .filter(
            Technology.id == technology_id
        )
        .first()
    )
    if not technology:
        raise HTTPException(
            status_code=404,
            detail="Technology not found",
        )
    return technology


@router.get("/{technology_id}/analysis", response_model=TechnologyFullAnalysisResponse)
def get_technology_full_analysis(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return full analysis suite (maturity, readiness, adoption time-series, trend) for a technology.
    """
    analysis = TechnologyAnalysisService.get_full_analysis(db, technology_id)
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Technology not found",
        )
    return analysis


@router.get("/{technology_id}/maturity", response_model=TechnologyMaturityResponse)
def get_technology_maturity(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return explainable maturity stage and supporting evidence.
    """
    maturity = TechnologyAnalysisService.calculate_maturity(db, technology_id)
    if not maturity:
        raise HTTPException(
            status_code=404,
            detail="Technology not found",
        )
    return maturity


@router.get("/{technology_id}/readiness", response_model=TechnologyReadinessResponse)
def get_technology_readiness(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return system-generated analytical readiness estimate with factor breakdown.
    """
    readiness = TechnologyAnalysisService.calculate_readiness(db, technology_id)
    if not readiness:
        raise HTTPException(
            status_code=404,
            detail="Technology not found",
        )
    return readiness


@router.get("/{technology_id}/adoption", response_model=TechnologyAdoptionResponse)
def get_technology_adoption(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return historical adoption time series and year-over-year growth.
    """
    adoption = TechnologyAnalysisService.calculate_adoption(db, technology_id)
    if not adoption:
        raise HTTPException(
            status_code=404,
            detail="Technology not found",
        )
    return adoption


@router.get("/{technology_id}/trends", response_model=TechnologyTrendResponse)
def get_technology_trends(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return technology trend classification, momentum, and growth indicators.
    """
    trend = TechnologyAnalysisService.calculate_trends(db, technology_id)
    if not trend:
        raise HTTPException(
            status_code=404,
            detail="Technology not found",
        )
    return trend