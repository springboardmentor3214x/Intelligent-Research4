from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.user import User
from backend.app.schemas.research_profile import (
    KeywordResponse,
    PatentResponse,
    PublicationResponse,
    ResearchAreaResponse,
    ResearchProfileCreate,
    ResearchProfileResponse,
    ResearchProfileUpdate,
    TechnologyAreaResponse,
)

router = APIRouter(prefix="/profile", tags=["Research Profile"])


def _build_profile_response(profile: ResearchProfile, user: User) -> ResearchProfileResponse:
    """Helper to assemble combined ResearchProfile + User response model with relationships."""
    return ResearchProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=user.name,
        email=user.email,
        role=user.role,
        organization=user.organization,
        department=user.department,
        designation=user.designation,
        country=user.country,
        phone_number=user.phone_number,
        research_domain=profile.research_domain,
        research_interests=profile.research_interests,
        research_areas=[
            ResearchAreaResponse.model_validate(area)
            for area in (profile.research_areas or [])
        ],
        keywords=[
            KeywordResponse.model_validate(kw)
            for kw in (profile.keywords or [])
        ],
        technology_areas=[
            TechnologyAreaResponse.model_validate(tech)
            for tech in (profile.technology_areas or [])
        ],
        publications=[
            PublicationResponse.model_validate(pub)
            for pub in (profile.publications or [])
        ],
        patents=[
            PatentResponse.model_validate(pat)
            for pat in (profile.patents or [])
        ],
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.post(
    "",
    response_model=ResearchProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create research profile for current user",
)
def create_profile(
    profile_in: ResearchProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResearchProfileResponse:
    """
    Create a new research profile for the currently authenticated user.

    - Ensures 1:1 relationship (returns 409 Conflict if profile already exists).
    - Stores research domain and research interests in ResearchProfile.
    - Updates organization/designation/country/phone_number on the User model if provided.
    - Returns combined profile response.
    """
    existing_profile = (
        db.query(ResearchProfile)
        .filter(ResearchProfile.user_id == current_user.id)
        .first()
    )
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Research profile already exists for this user",
        )

    new_profile = ResearchProfile(
        user_id=current_user.id,
        research_domain=profile_in.research_domain.strip(),
        research_interests=profile_in.research_interests.strip() if profile_in.research_interests is not None else None,
    )
    db.add(new_profile)

    if profile_in.organization is not None:
        current_user.organization = profile_in.organization.strip()
    if profile_in.department is not None:
        current_user.department = profile_in.department.strip()
    if profile_in.designation is not None:
        current_user.designation = profile_in.designation.strip()
    if profile_in.country is not None:
        current_user.country = profile_in.country.strip()
    if profile_in.phone_number is not None:
        current_user.phone_number = profile_in.phone_number.strip()

    try:
        db.commit()
        db.refresh(new_profile)
        db.refresh(current_user)
    except Exception:
        db.rollback()
        raise

    return _build_profile_response(new_profile, current_user)


@router.get(
    "",
    response_model=ResearchProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user's research profile",
)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResearchProfileResponse:
    """
    Retrieve the combined User and ResearchProfile information for the authenticated user.
    """
    profile = (
        db.query(ResearchProfile)
        .filter(ResearchProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research profile not found",
        )

    return _build_profile_response(profile, current_user)


@router.put(
    "",
    response_model=ResearchProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user's research profile and organization info",
)
def update_profile(
    profile_in: ResearchProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResearchProfileResponse:
    """
    Partially update the authenticated user's research profile and organization information.
    """
    profile = (
        db.query(ResearchProfile)
        .filter(ResearchProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research profile not found",
        )

    update_data = profile_in.model_dump(exclude_unset=True)

    # ResearchProfile updates
    if "research_domain" in update_data and update_data["research_domain"] is not None:
        profile.research_domain = update_data["research_domain"].strip()
    if "research_interests" in update_data:
        profile.research_interests = (
            update_data["research_interests"].strip()
            if update_data["research_interests"] is not None
            else None
        )

    # User updates
    if "name" in update_data and update_data["name"] is not None:
        current_user.name = update_data["name"].strip()
    if "organization" in update_data:
        current_user.organization = (
            update_data["organization"].strip()
            if update_data["organization"] is not None
            else None
        )
    if "department" in update_data:
        current_user.department = (
            update_data["department"].strip()
            if update_data["department"] is not None
            else None
        )
    if "designation" in update_data:
        current_user.designation = (
            update_data["designation"].strip()
            if update_data["designation"] is not None
            else None
        )
    if "country" in update_data:
        current_user.country = (
            update_data["country"].strip()
            if update_data["country"] is not None
            else None
        )
    if "phone_number" in update_data:
        current_user.phone_number = (
            update_data["phone_number"].strip()
            if update_data["phone_number"] is not None
            else None
        )

    try:
        db.commit()
        db.refresh(profile)
        db.refresh(current_user)
    except Exception:
        db.rollback()
        raise

    return _build_profile_response(profile, current_user)
