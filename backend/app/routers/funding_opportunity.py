from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.schemas.funding_opportunity import (
    FundingImportRequest,
    FundingOpportunityListResponse,
    FundingOpportunityResponse,
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