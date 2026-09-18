from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.technology import Technology
from backend.app.models.technology_activity import TechnologyActivity
from backend.app.services.technology_service import sync_technologies


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


@router.get("")
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


@router.get("/emerging")
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


@router.get("/search")
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

@router.get("/activity/summary")
def get_activity_summary(
    db: Session = Depends(get_db),
):
    """
    Return year-wise activity for all technologies.
    """

    technologies = (
        db.query(Technology)
        .order_by(Technology.technology_name.asc())
        .all()
    )

    result = []

    for technology in technologies:

        activity = (
            db.query(TechnologyActivity)
            .filter(
                TechnologyActivity.technology_id
                == technology.id
            )
            .order_by(
                TechnologyActivity.year.asc()
            )
            .all()
        )

        result.append(
            {
                "technology_id": technology.id,
                "technology_name": technology.technology_name,
                "activity": activity,
            }
        )

    return {
        "technologies": result,
        "technology_count": len(result),
    }

@router.get("/{technology_id}/activity")
def get_technology_activity(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return year-wise technology activity data.

    Provides historical research, patent,
    citation, organization and application
    diversity indicators.
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

    activity = (
        db.query(TechnologyActivity)
        .filter(
            TechnologyActivity.technology_id
            == technology_id
        )
        .order_by(
            TechnologyActivity.year.asc()
        )
        .all()
    )

    return {
        "technology_id": technology.id,
        "technology_name": technology.technology_name,
        "activity": activity,
    }

@router.get("/{technology_id}")
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