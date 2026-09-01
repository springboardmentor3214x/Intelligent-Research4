from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from uuid import UUID

from backend.app.auth.dependencies import require_roles
from backend.app.database.connection import get_db
from backend.app.models.technology_area import TechnologyArea
from backend.app.models.user import User
from backend.app.schemas.technology_area import TechnologyAreaCreate, TechnologyAreaResponse


router = APIRouter(prefix="/technology-areas", tags=["Technology Areas"])


@router.get("", response_model=list[TechnologyAreaResponse])
def list_technology_areas(
    current_user: User = Depends(require_roles("researcher")), db: Session = Depends(get_db)
) -> list[TechnologyArea]:
    """Return only the technology areas belonging to the signed-in researcher."""
    return (
        db.query(TechnologyArea)
        .filter(TechnologyArea.user_id == current_user.id)
        .order_by(TechnologyArea.name.asc())
        .all()
    )


@router.post("", response_model=TechnologyAreaResponse, status_code=status.HTTP_201_CREATED)
def create_technology_area(
    payload: TechnologyAreaCreate,
    current_user: User = Depends(require_roles("researcher")),
    db: Session = Depends(get_db),
) -> TechnologyArea:
    area = TechnologyArea(user_id=current_user.id, name=payload.name)
    db.add(area)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This technology area is already in your profile")
    db.refresh(area)
    return area


@router.delete("/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_technology_area(
    area_id: UUID,
    current_user: User = Depends(require_roles("researcher")),
    db: Session = Depends(get_db),
) -> None:
    area = (
        db.query(TechnologyArea)
        .filter(TechnologyArea.id == area_id, TechnologyArea.user_id == current_user.id)
        .first()
    )
    if not area:
        # Returning the same response for another user's identifier prevents discovery of their data.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technology area not found")
    db.delete(area)
    db.commit()
