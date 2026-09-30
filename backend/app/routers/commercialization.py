import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.schemas.commercialization import (
    CommercializationAnalysisResponse,
    ProductizationResponse,
    ResearchCommercializationResponse,
    StartupResponse,
)
from backend.app.services.commercialization_service import commercialization_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/commercialization",
    tags=["Commercialization Recommendation (Module 8)"]
)


@router.get("/analyze/{technology:path}", response_model=CommercializationAnalysisResponse)
def get_full_commercialization_analysis(
    technology: str,
    db: Session = Depends(get_db)
):
    """
    Module 8 Main Endpoint: Unified Commercialization Intelligence Analysis.
    Combines Member 1 (Research Commercialization Analysis) and Member 2 (Productization + Startup Recommendations)
    strictly grounded in empirical evidence from Modules 3, 4, 5, 6, and 7.
    """
    try:
        return commercialization_service.perform_full_commercialization_analysis(
            db=db,
            technology=technology
        )
    except Exception as e:
        logger.error(f"Commercialization analysis failed for '{technology}': {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to perform commercialization analysis: {str(e)}"
        )


@router.get("/applications/{technology:path}", response_model=ResearchCommercializationResponse)
def get_commercial_applications(
    technology: str,
    db: Session = Depends(get_db)
):
    """
    Member 1: Research Commercialization Analysis.
    Identifies candidate application areas based on research, patents, technology intelligence, and organizations.
    """
    try:
        return commercialization_service.analyze_commercial_applications(
            db=db,
            technology=technology
        )
    except Exception as e:
        logger.error(f"Application analysis failed for '{technology}': {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve commercial application areas: {str(e)}"
        )


@router.get("/products/{technology:path}", response_model=ProductizationResponse)
def get_productization_recommendations(
    technology: str,
    db: Session = Depends(get_db)
):
    """
    Member 2: Productization Recommendations.
    Synthesizes concrete product/service opportunities, technical components, delivery models, and next steps.
    """
    try:
        return commercialization_service.generate_productization_recommendations(
            db=db,
            technology=technology
        )
    except Exception as e:
        logger.error(f"Productization recommendations failed for '{technology}': {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve productization recommendations: {str(e)}"
        )


@router.get("/startups/{technology:path}", response_model=StartupResponse)
def get_startup_recommendations(
    technology: str,
    db: Session = Depends(get_db)
):
    """
    Member 2: Startup Creation Recommendations.
    Synthesizes candidate startup ventures, business models, funding support, competitive context, and first steps.
    """
    try:
        return commercialization_service.generate_startup_recommendations(
            db=db,
            technology=technology
        )
    except Exception as e:
        logger.error(f"Startup recommendations failed for '{technology}': {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve startup recommendations: {str(e)}"
        )
