from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.publication import Publication
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.user import User
from backend.app.schemas.research_profile import (
    PublicationCreate,
    PublicationResponse,
    PublicationUpdate,
)

router = APIRouter(prefix="/profile/publications", tags=["Publications Management"])


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


@router.get("", response_model=list[PublicationResponse], summary="List current user publications")
def list_publications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Publication]:
    profile = _get_or_create_profile(current_user, db)
    return (
        db.query(Publication)
        .filter(Publication.research_profile_id == profile.id)
        .order_by(Publication.created_at.desc())
        .all()
    )


@router.post("", response_model=PublicationResponse, status_code=status.HTTP_201_CREATED, summary="Add publication to profile")
def create_publication(
    payload: PublicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Publication:
    profile = _get_or_create_profile(current_user, db)

    publication = Publication(
        research_profile_id=profile.id,
        title=payload.title.strip(),
        authors=payload.authors.strip(),
        publication_date=payload.publication_date,
        journal_or_conference=payload.journal_or_conference.strip() if payload.journal_or_conference else None,
        publication_type=payload.publication_type.strip() if payload.publication_type else None,
        research_domain=payload.research_domain.strip() if payload.research_domain else None,
        keywords=payload.keywords.strip() if payload.keywords else None,
        doi=payload.doi.strip() if payload.doi else None,
        publication_link=payload.publication_link.strip() if payload.publication_link else None,
    )

    db.add(publication)
    db.commit()
    db.refresh(publication)
    return publication


@router.get("/{publication_id}", response_model=PublicationResponse, summary="Get single publication")
def get_publication(
    publication_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Publication:
    profile = _get_or_create_profile(current_user, db)
    pub = (
        db.query(Publication)
        .filter(
            Publication.id == publication_id,
            Publication.research_profile_id == profile.id,
        )
        .first()
    )
    if not pub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publication not found")
    return pub


@router.put("/{publication_id}", response_model=PublicationResponse, summary="Update publication")
def update_publication(
    publication_id: UUID,
    payload: PublicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Publication:
    profile = _get_or_create_profile(current_user, db)
    pub = (
        db.query(Publication)
        .filter(
            Publication.id == publication_id,
            Publication.research_profile_id == profile.id,
        )
        .first()
    )
    if not pub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publication not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(pub, field, value)

    db.commit()
    db.refresh(pub)
    return pub


@router.delete("/{publication_id}", status_code=status.HTTP_200_OK, summary="Delete publication")
def delete_publication(
    publication_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_or_create_profile(current_user, db)
    pub = (
        db.query(Publication)
        .filter(
            Publication.id == publication_id,
            Publication.research_profile_id == profile.id,
        )
        .first()
    )
    if not pub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publication not found")

    db.delete(pub)
    db.commit()
    return {"message": "Publication deleted successfully"}
