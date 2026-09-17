from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.user import User
from backend.app.schemas.funding_opportunity import (
    FundingImportRequest,
    FundingOpportunityListResponse,
    FundingOpportunityResponse,
    FundingRecommendationResponse,
    FundingSearchRequest,
    IdeaAnalysisRequest,
    IdeaAnalysisResponse,
)
from backend.app.services.funding_matching_service import (
    funding_matching_service,
)
from backend.app.services.funding_service import (
    import_grants_opportunities,
)

router = APIRouter(
    prefix="/funding",
    tags=["Funding Opportunities"],
)


class MatchFundingRequest(BaseModel):
    funding_opportunity_id: UUID


class SaveFundingRequest(BaseModel):
    funding_opportunity_id: UUID


class SyncFundingRequest(BaseModel):
    sources: list[str] | None = None


@router.post(
    "/import",
    summary="Import funding opportunities from Grants.gov",
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


@router.post(
    "/sync",
    summary="Trigger source synchronization for funding opportunities",
)
def sync_funding(
    request: SyncFundingRequest | None = None,
    current_user: User = Depends(get_current_user),
):
    """Sync latest opportunities from active sources."""
    inserted, skipped = import_grants_opportunities("science technology research", 15)
    return {
        "status": "synchronized",
        "message": "Successfully synchronized live funding opportunities.",
        "inserted": inserted,
        "skipped": skipped,
    }


@router.get(
    "/recommendations/me",
    response_model=FundingRecommendationResponse,
    summary="Get personalized funding recommendations for current user",
)
def get_user_funding_recommendations(
    limit: int = Query(default=20, ge=1, le=100),
    min_score: float = Query(default=0.0, ge=0.0, le=100.0),
    topic: str = Query(default=""),
    research_area: str = Query(default=""),
    funding_type: str = Query(default=""),
    agency: str = Query(default=""),
    focus_terms: list[str] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    AI/ML Semantic Matching pairing Researcher Profile with real Funding Opportunities.
    Returns cosine relevance scores, explainable matched concepts, and automated eligibility assessments.
    """
    return funding_matching_service.get_recommendations_for_user(
        db=db,
        current_user=current_user,
        limit=limit,
        min_score=min_score,
        topic=topic,
        research_area=research_area,
        funding_type=funding_type,
        agency=agency,
        focus_terms=focus_terms,
    )


@router.post(
    "/search",
    summary="Semantic search for funding opportunities",
)
def search_funding(
    payload: FundingSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Search funding opportunities using natural language semantic matching and filters."""
    return funding_matching_service.search_funding_opportunities(
        db=db,
        query=payload.query,
        limit=payload.limit,
        min_score=payload.min_score,
        funding_type=payload.funding_type,
        research_area=payload.research_area,
        agency=payload.agency,
        current_user=current_user,
    )


@router.post(
    "/analyze-idea",
    response_model=IdeaAnalysisResponse,
    summary="Startup and research idea funding intelligence analyzer",
)
def analyze_startup_idea(
    payload: IdeaAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Analyzes startup / research ideas:
    - Concept & technology extraction
    - Prior art research paper overlap in local database
    - Prior art patent overlap in local database
    - Recommended real funding opportunities
    - Estimated funding readiness & suitability score (0-100%)
    - Explainable matching and potential risk factors
    - Actionable next steps
    """
    return funding_matching_service.analyze_startup_idea(
        db=db,
        idea_text=payload.idea,
        current_user=current_user,
        funding_type_filter=payload.funding_type_filter,
    )


@router.post(
    "/startup-analysis",
    response_model=IdeaAnalysisResponse,
    summary="Alias for analyze-idea endpoint",
)
def analyze_startup_idea_alias(
    payload: IdeaAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Alias for /funding/analyze-idea."""
    return funding_matching_service.analyze_startup_idea(
        db=db,
        idea_text=payload.idea,
        current_user=current_user,
        funding_type_filter=payload.funding_type_filter,
    )


@router.post(
    "/match",
    summary="On-demand single funding opportunity matching score",
)
def match_opportunity(
    payload: MatchFundingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Calculate semantic relevance score and automated eligibility breakdown for a specific opportunity."""
    return funding_matching_service.match_single_opportunity(
        db=db,
        opportunity_id=payload.funding_opportunity_id,
        current_user=current_user,
    )


@router.post(
    "/save",
    summary="Save a funding opportunity to user's saved list",
)
def save_opportunity(
    payload: SaveFundingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Bookmark/save a funding opportunity."""
    return funding_matching_service.save_funding(
        db=db,
        opportunity_id=payload.funding_opportunity_id,
        current_user=current_user,
    )


@router.get(
    "/saved",
    summary="List saved funding opportunities for current user",
)
def get_saved_opportunities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Retrieve saved funding opportunities for authenticated user."""
    saved_items = funding_matching_service.get_saved_funding(
        db=db,
        current_user=current_user,
    )
    return {
        "total": len(saved_items),
        "saved_opportunities": saved_items,
    }


@router.delete(
    "/save/{opportunity_id}",
    summary="Remove a funding opportunity from saved list",
)
def remove_saved_opportunity(
    opportunity_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Unsave a funding opportunity."""
    return funding_matching_service.remove_saved_funding(
        db=db,
        opportunity_id=opportunity_id,
        current_user=current_user,
    )


@router.get(
    "",
    response_model=FundingOpportunityListResponse,
    summary="List and filter funding opportunities",
)
def get_funding_opportunities(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    research_area: str | None = Query(default=None),
    funding_type: str | None = Query(default=None),
    agency: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(FundingOpportunity)

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            FundingOpportunity.title.ilike(search_pattern)
            | FundingOpportunity.description.ilike(search_pattern)
            | FundingOpportunity.agency.ilike(search_pattern)
        )

    if research_area and research_area.strip():
        query = query.filter(
            FundingOpportunity.research_area.ilike(f"%{research_area.strip()}%")
            | FundingOpportunity.funding_category.ilike(f"%{research_area.strip()}%")
        )

    if funding_type and funding_type.strip():
        query = query.filter(FundingOpportunity.funding_type.ilike(f"%{funding_type.strip()}%"))

    if agency and agency.strip():
        query = query.filter(FundingOpportunity.agency.ilike(f"%{agency.strip()}%"))

    total = query.count()
    opportunities = (
        query
        .order_by(FundingOpportunity.close_date.asc().nullslast())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "opportunities": opportunities,
    }


@router.get(
    "/{opportunity_id}",
    response_model=FundingOpportunityResponse,
    summary="Get single funding opportunity by ID",
)
def get_funding_opportunity(
    opportunity_id: UUID,
    db: Session = Depends(get_db),
):
    opportunity = db.get(FundingOpportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(
            status_code=404,
            detail="Funding opportunity not found",
        )
    return opportunity