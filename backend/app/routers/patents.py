from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.patent import Patent
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.user import User
from backend.app.schemas.research_profile import (
    PatentCreate,
    PatentResponse,
    PatentUpdate,
)

router = APIRouter(prefix="/profile/patents", tags=["Patents Management"])


def _get_or_create_profile(user: User, db: Session) -> ResearchProfile:
    profile = (
        db.query(ResearchProfile)
        .filter(ResearchProfile.user_id == user.id)
        .first()
    )
    if not profile:
        profile = ResearchProfile(
            user_id=user.id,
            research_domain=user.research_domain or "General Research",
            research_interests=None,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=list[PatentResponse], summary="List current user patents")
def list_patents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Patent]:
    profile = _get_or_create_profile(current_user, db)
    return (
        db.query(Patent)
        .filter(Patent.research_profile_id == profile.id)
        .order_by(Patent.created_at.desc())
        .all()
    )


@router.post("", response_model=PatentResponse, status_code=status.HTTP_201_CREATED, summary="Add patent to profile")
def create_patent(
    payload: PatentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Patent:
    profile = _get_or_create_profile(current_user, db)

    patent = Patent(
        research_profile_id=profile.id,
        patent_title=payload.patent_title.strip(),
        inventor=payload.inventor.strip(),
        patent_number=payload.patent_number.strip() if payload.patent_number else None,
        filing_date=payload.filing_date,
        publication_date=payload.publication_date,
        patent_status=payload.patent_status.strip() if payload.patent_status else None,
        patent_domain=payload.patent_domain.strip() if payload.patent_domain else None,
        patent_link=payload.patent_link.strip() if payload.patent_link else None,
    )

    db.add(patent)
    db.commit()
    db.refresh(patent)
    return patent


@router.get("/{patent_id}", response_model=PatentResponse, summary="Get single patent")
def get_patent(
    patent_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Patent:
    profile = _get_or_create_profile(current_user, db)
    pat = (
        db.query(Patent)
        .filter(
            Patent.id == patent_id,
            Patent.research_profile_id == profile.id,
        )
        .first()
    )
    if not pat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patent not found")
    return pat


@router.put("/{patent_id}", response_model=PatentResponse, summary="Update patent")
def update_patent(
    patent_id: UUID,
    payload: PatentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Patent:
    profile = _get_or_create_profile(current_user, db)
    pat = (
        db.query(Patent)
        .filter(
            Patent.id == patent_id,
            Patent.research_profile_id == profile.id,
        )
        .first()
    )
    if not pat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patent not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(pat, field, value)

    db.commit()
    db.refresh(pat)
    return pat


@router.delete("/{patent_id}", status_code=status.HTTP_200_OK, summary="Delete patent")
def delete_patent(
    patent_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_or_create_profile(current_user, db)
    pat = (
        db.query(Patent)
        .filter(
            Patent.id == patent_id,
            Patent.research_profile_id == profile.id,
        )
        .first()
    )
    if not pat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patent not found")

    db.delete(pat)
    db.commit()
    return {"message": "Patent deleted successfully"}
