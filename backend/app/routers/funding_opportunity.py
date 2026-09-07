from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.user import User
from backend.app.schemas.funding_opportunity import (
    FundingImportRequest,
    FundingMatchRequest,
    FundingMatchResponse,
    FundingOpportunityListResponse,
    FundingOpportunityResponse,
    FundingRecommendationsResponse,
)
from backend.app.services.funding_matching_service import (
    get_personalized_recommendations,
    match_single_funding_opportunity,
)
from backend.app.services.funding_service import (
    import_grants_opportunities,
)

router = APIRouter(
    prefix="/funding",
    tags=["Funding Opportunities"],
)


@router.post(
    "/import",
)
def import_funding(
    request: FundingImportRequest,
):
    inserted, skipped = import_grants_opportunities(
        request.search,
        request.per_page,
    )

    return {
        "source": "Grants.gov",
        "search": request.search,
        "inserted": inserted,
        "skipped": skipped,
    }


@router.get(
    "/recommendations/me",
    response_model=FundingRecommendationsResponse,
    summary="Get personalized AI funding recommendations for current user",
)
def get_my_funding_recommendations(
    limit: int = Query(default=10, ge=1, le=50),
    min_score: float = Query(default=0.0, ge=0.0, le=100.0),
    research_area: str | None = Query(default=None),
    funding_type: str | None = Query(default=None),
    agency: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate personalized funding recommendations based on the authenticated user's Module 2 profile.
    Calculates semantic similarity, domain and keyword overlaps, eligibility signals, and explains why each match was suggested.
    """
    return get_personalized_recommendations(
        user=current_user,
        db=db,
        limit=limit,
        min_score=min_score,
        research_area_filter=research_area,
        funding_type_filter=funding_type,
        agency_filter=agency,
    )


@router.post(
    "/match",
    response_model=FundingMatchResponse,
    summary="Match a specific funding opportunity with the authenticated user profile",
)
def match_funding_opportunity(
    request: FundingMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Computes real-time relevance score, semantic breakdown, and explainability signals for a specific grant.
    """
    try:
        opp, match_breakdown, profile_summary = match_single_funding_opportunity(
            user=current_user,
            opportunity_id=request.funding_opportunity_id,
            db=db,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding opportunity not found",
        )

    return FundingMatchResponse(
        funding_opportunity=FundingOpportunityResponse.model_validate(opp),
        match=match_breakdown,
        profile_used=profile_summary,
    )


@router.get(
    "",
    response_model=FundingOpportunityListResponse,
)
def get_funding_opportunities(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    opportunities = (
        db.query(FundingOpportunity)
        .order_by(
            FundingOpportunity.close_date.asc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    total = db.query(FundingOpportunity).count()

    return {
        "total": total,
        "opportunities": opportunities,
    }


@router.get(
    "/{opportunity_id}",
    response_model=FundingOpportunityResponse,
)
def get_funding_opportunity(
    opportunity_id: str,
    db: Session = Depends(get_db),
):
    opportunity = (
        db.query(FundingOpportunity)
        .filter(
            FundingOpportunity.id == opportunity_id
        )
        .first()
    )

    if not opportunity:
        raise HTTPException(
            status_code=404,
            detail="Funding opportunity not found",
        )

    return opportunity