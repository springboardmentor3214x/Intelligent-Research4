from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.keyword import Keyword
from backend.app.models.research_area import ResearchArea
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.technology_area import TechnologyArea
from backend.app.models.user import User
from backend.app.schemas.research_profile import (
    KeywordCreate,
    KeywordResponse,
    ResearchAreaCreate,
    ResearchAreaResponse,
    TechnologyAreaCreate,
    TechnologyAreaResponse,
)

router = APIRouter(prefix="/profile", tags=["Research Profile Details"])


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


# ==========================================
# 1. RESEARCH AREAS
# ==========================================
@router.get("/areas", response_model=list[ResearchAreaResponse], summary="List user research areas")
def get_user_research_areas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ResearchArea]:
    profile = _get_or_create_profile(current_user, db)
    return profile.research_areas


@router.post("/areas", response_model=ResearchAreaResponse, status_code=status.HTTP_201_CREATED, summary="Add research area to profile")
def add_user_research_area(
    payload: ResearchAreaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResearchArea:
    profile = _get_or_create_profile(current_user, db)
    cleaned_name = payload.name.strip()
    if not cleaned_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Area name cannot be blank")

    # Find or create area tag
    area = db.query(ResearchArea).filter(ResearchArea.name.ilike(cleaned_name)).first()
    if not area:
        area = ResearchArea(name=cleaned_name, description=payload.description)
        db.add(area)
        db.commit()
        db.refresh(area)

    if area not in profile.research_areas:
        profile.research_areas.append(area)
        db.commit()
        db.refresh(profile)

    return area


@router.delete("/areas/{area_id}", status_code=status.HTTP_200_OK, summary="Remove research area from profile")
def remove_user_research_area(
    area_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_or_create_profile(current_user, db)
    area = db.query(ResearchArea).filter(ResearchArea.id == area_id).first()
    if not area or area not in profile.research_areas:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research area not found or unauthorized")

    profile.research_areas.remove(area)
    db.commit()
    return {"message": "Research area removed successfully"}


# ==========================================
# 2. KEYWORDS
# ==========================================
@router.get("/keywords", response_model=list[KeywordResponse], summary="List user keywords")
def get_user_keywords(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Keyword]:
    profile = _get_or_create_profile(current_user, db)
    return profile.keywords


@router.post("/keywords", response_model=KeywordResponse, status_code=status.HTTP_201_CREATED, summary="Add keyword to profile")
def add_user_keyword(
    payload: KeywordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Keyword:
    profile = _get_or_create_profile(current_user, db)
    cleaned_name = payload.name.strip()
    if not cleaned_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Keyword cannot be blank")

    keyword = db.query(Keyword).filter(Keyword.name.ilike(cleaned_name)).first()
    if not keyword:
        keyword = Keyword(name=cleaned_name)
        db.add(keyword)
        db.commit()
        db.refresh(keyword)

    if keyword not in profile.keywords:
        profile.keywords.append(keyword)
        db.commit()
        db.refresh(profile)

    return keyword


@router.delete("/keywords/{keyword_id}", status_code=status.HTTP_200_OK, summary="Remove keyword from profile")
def remove_user_keyword(
    keyword_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_or_create_profile(current_user, db)
    keyword = db.query(Keyword).filter(Keyword.id == keyword_id).first()
    if not keyword or keyword not in profile.keywords:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found or unauthorized")

    profile.keywords.remove(keyword)
    db.commit()
    return {"message": "Keyword removed successfully"}


# ==========================================
# 3. TECHNOLOGY AREAS
# ==========================================
@router.get("/technology-areas", response_model=list[TechnologyAreaResponse], summary="List user technology areas")
def get_user_technology_areas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TechnologyArea]:
    profile = _get_or_create_profile(current_user, db)
    return profile.technology_areas


@router.post("/technology-areas", response_model=TechnologyAreaResponse, status_code=status.HTTP_201_CREATED, summary="Add technology area to profile")
def add_user_technology_area(
    payload: TechnologyAreaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TechnologyArea:
    profile = _get_or_create_profile(current_user, db)
    cleaned_name = payload.name.strip()
    if not cleaned_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Technology area name cannot be blank")

    tech = db.query(TechnologyArea).filter(TechnologyArea.name.ilike(cleaned_name)).first()
    if not tech:
        tech = TechnologyArea(name=cleaned_name)
        db.add(tech)
        db.commit()
        db.refresh(tech)

    if tech not in profile.technology_areas:
        profile.technology_areas.append(tech)
        db.commit()
        db.refresh(profile)

    return tech


@router.delete("/technology-areas/{tech_id}", status_code=status.HTTP_200_OK, summary="Remove technology area from profile")
def remove_user_technology_area(
    tech_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_or_create_profile(current_user, db)
    tech = db.query(TechnologyArea).filter(TechnologyArea.id == tech_id).first()
    if not tech or tech not in profile.technology_areas:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technology area not found or unauthorized")

    profile.technology_areas.remove(tech)
    db.commit()
    return {"message": "Technology area removed successfully"}
