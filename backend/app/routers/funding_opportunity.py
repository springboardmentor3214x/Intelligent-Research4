from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.saved_funding import SavedFunding
from backend.app.models.user import User
from backend.app.schemas.funding_opportunity import (
    FundingImportRequest,
    FundingImportResponse,
    FundingMatchRequest,
    FundingMatchResponse,
    FundingOpportunityListResponse,
    FundingOpportunityResponse,
    FundingRecommendationsResponse,
    FundingSyncRequest,
    FundingSyncResponse,
    SavedFundingItem,
    SavedFundingListResponse,
    SaveFundingActionResponse,
)
from backend.app.services.funding.source_registry import sync_funding_sources
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
    "/sync",
    response_model=FundingSyncResponse,
    summary="Synchronize and import opportunities from Indian (ANRF, BIRAC, DST, ICMR, MeitY, DRDO, ICAR, ISTI) and national sources",
)
def sync_funding(
    request: FundingSyncRequest | None = None,
    db: Session = Depends(get_db),
):
    """
    Executes synchronization across registered Indian funding sources with deterministic deduplication.
    Returns granular metrics per source.
    """
    source_keys = request.sources if request else None
    result = sync_funding_sources(db=db, source_keys=source_keys)
    return result


@router.post(
    "/save",
    response_model=SaveFundingActionResponse,
    summary="Save / Bookmark a funding opportunity for the authenticated user",
)
def save_funding_for_user(
    request: FundingMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save an opportunity to user's personalized saved funding list."""
    opp = db.query(FundingOpportunity).filter(FundingOpportunity.id == request.funding_opportunity_id).first()
    if not opp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding opportunity not found",
        )

    existing = (
        db.query(SavedFunding)
        .filter(
            SavedFunding.user_id == current_user.id,
            SavedFunding.funding_opportunity_id == request.funding_opportunity_id,
        )
        .first()
    )

    if existing:
        return {
            "message": "Funding opportunity already saved.",
            "saved": True,
            "funding_opportunity_id": request.funding_opportunity_id,
        }

    saved_rec = SavedFunding(
        user_id=current_user.id,
        funding_opportunity_id=request.funding_opportunity_id,
    )
    db.add(saved_rec)
    db.commit()

    return {
        "message": "Funding opportunity saved successfully.",
        "saved": True,
        "funding_opportunity_id": request.funding_opportunity_id,
    }


@router.get(
    "/saved",
    response_model=SavedFundingListResponse,
    summary="Get saved funding opportunities for current authenticated user",
)
def get_user_saved_funding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve list of saved opportunities for current user."""
    records = (
        db.query(SavedFunding)
        .filter(SavedFunding.user_id == current_user.id)
        .order_by(SavedFunding.created_at.desc())
        .all()
    )

    items = []
    for r in records:
        if r.funding_opportunity:
            items.append(
                SavedFundingItem(
                    id=r.id,
                    user_id=r.user_id,
                    funding_opportunity_id=r.funding_opportunity_id,
                    created_at=r.created_at,
                    funding_opportunity=FundingOpportunityResponse.model_validate(r.funding_opportunity),
                )
            )

    return {
        "total": len(items),
        "saved_opportunities": items,
    }


@router.delete(
    "/save/{opportunity_id}",
    response_model=SaveFundingActionResponse,
    summary="Remove a saved funding opportunity for current user",
)
def remove_user_saved_funding(
    opportunity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved grant record belonging to the authenticated user."""
    record = (
        db.query(SavedFunding)
        .filter(
            SavedFunding.user_id == current_user.id,
            SavedFunding.funding_opportunity_id == opportunity_id,
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved funding opportunity not found for current user",
        )

    db.delete(record)
    db.commit()

    return {
        "message": "Funding opportunity removed from saved list.",
        "saved": False,
        "funding_opportunity_id": opportunity_id,
    }



@router.post(
    "/import",
    response_model=FundingImportResponse,
    summary="Synchronize and import opportunities from Grants.gov",
)
def import_funding(
    request: FundingImportRequest,
):
    try:
        metrics = import_grants_opportunities(
            request.search,
            request.per_page,
        )
        msg = f"Fetched {metrics['fetched']} funding opportunities. Inserted {metrics['inserted']}. Skipped {metrics['skipped']} duplicates. Failed {metrics['failed']}."
        return {
            "source": "Grants.gov",
            "search": request.search,
            "fetched": metrics["fetched"],
            "normalized": metrics["normalized"],
            "inserted": metrics["inserted"],
            "skipped": metrics["skipped"],
            "failed": metrics["failed"],
            "message": msg,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Funding synchronization failed: {str(e)}",
        )



@router.get(
    "/recommendations/me",
    response_model=FundingRecommendationsResponse,
    summary="Get personalized AI funding recommendations for current user",
)
def get_my_funding_recommendations(
    limit: int = Query(default=20, ge=1, le=50),
    min_score: float = Query(default=0.0, ge=0.0, le=100.0),
    topic: str | None = Query(default=None),
    research_area: str | None = Query(default=None),
    funding_type: str | None = Query(default=None),
    agency: str | None = Query(default=None),
    focus_terms: list[str] | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate personalized funding recommendations based on the authenticated user's Module 2 profile and optional topic search.
    Calculates semantic similarity, domain and keyword overlaps, eligibility signals, and explains why each match was suggested.
    """
    return get_personalized_recommendations(
        user=current_user,
        db=db,
        limit=limit,
        min_score=min_score,
        topic_query=topic,
        research_area_filter=research_area,
        funding_type_filter=funding_type,
        agency_filter=agency,
        focus_terms=focus_terms,
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