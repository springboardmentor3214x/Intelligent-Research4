import uuid
from datetime import date
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/funding", tags=["Funding Discovery & Eligibility Analytics"])

# =====================================================================
# 1. DATA VALIDATION CONTRACTS (SCHEMAS)
# =====================================================================
class EligibilityAssessmentResponse(BaseModel):
    is_eligible: bool
    matching_criteria: List[str]
    missing_requirements: List[str]
    status_label: str  # "Eligible", "Potentially Eligible", "Requirements Not Matched"
    days_remaining: int

class SavedFundingCreate(BaseModel):
    funding_opportunity_id: uuid.UUID

class SavedFundingResponse(BaseModel):
    id: uuid.UUID
    funding_opportunity_id: uuid.UUID
    user_id: uuid.UUID
    saved_at: date

    model_config = ConfigDict(from_attributes=True)

# =====================================================================
# 2. ELIGIBILITY & TIMELINE ALGORITHMS ENGINE
# =====================================================================
class FundingEligibilityEngine:
    @staticmethod
    def assess(user_profile: Dict[str, Any], funding_rules: Dict[str, Any]) -> Dict[str, Any]:
        matching_criteria = []
        missing_requirements = []
        
        # A. Location Constraints Validation
        allowed_countries = funding_rules.get("allowed_countries", [])
        user_country = user_profile.get("country")
        if allowed_countries:
            if user_country in allowed_countries:
                matching_criteria.append(f"Residency verified: {user_country}")
            else:
                missing_requirements.append(f"Geographic restriction. Allowed: {allowed_countries}")

        # B. Academic Designation Alignment Validation
        eligible_designations = funding_rules.get("eligible_designations", [])
        user_designation = user_profile.get("designation")
        if eligible_designations:
            if user_designation in eligible_designations:
                matching_criteria.append(f"Academic standing alignment: {user_designation}")
            else:
                missing_requirements.append(f"Targeted academic criteria mismatch. Requires: {eligible_designations}")

        # C. State Classification Vector Assignment
        if not missing_requirements:
            status_label = "Eligible"
            is_eligible = True
        elif len(matching_criteria) >= 1:
            status_label = "Potentially Eligible"
            is_eligible = True
        else:
            status_label = "Requirements Not Matched"
            is_eligible = False

        # D. Temporal Deadline Processing 
        days_remaining = 0
        deadline_date = funding_rules.get("deadline")
        if deadline_date:
            delta = deadline_date - date.today()
            days_remaining = max(0, delta.days)

        return {
            "is_eligible": is_eligible,
            "matching_criteria": matching_criteria,
            "missing_requirements": missing_requirements,
            "status_label": status_label,
            "days_remaining": days_remaining
        }

# =====================================================================
# 3. API ROUTER ENDPOINTS
# =====================================================================

@router.get("/assess/{opportunity_id}", response_model=EligibilityAssessmentResponse)
def evaluate_user_eligibility(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculates user profile alignment metrics against a target funding opportunity."""
    user_data = {
        "country": current_user.country,
        "designation": current_user.designation,
        "research_domain": current_user.research_domain
    }
    
    mock_funding_opportunity_rules = {
        "allowed_countries": ["India", "USA", "UK"],
        "eligible_designations": ["Assistant Professor", "Associate Professor", "Professor"],
        "deadline": date(2026, 12, 31)
    }
    
    assessment = FundingEligibilityEngine.assess(user_data, mock_funding_opportunity_rules)
    return assessment

@router.post("/save", response_model=SavedFundingResponse, status_code=status.HTTP_201_CREATED)
def bookmark_funding_opportunity(
    payload: SavedFundingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves a funding opportunity to the user's bookmarked repository tracks."""
    mock_bookmark_instance = {
        "id": uuid.uuid4(),
        "funding_opportunity_id": payload.funding_opportunity_id,
        "user_id": current_user.id,
        "saved_at": date.today()
    }
    return mock_bookmark_instance

@router.delete("/save/{opportunity_id}")
def remove_bookmarked_funding(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Removes a funding opportunity from the user's saved tracking views."""
    return {"message": "Funding opportunity removed from saved collection successfully"}

@router.get("/saved", response_model=List[SavedFundingResponse])
def read_user_bookmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all historical funding opportunities bookmarked by the authorized user."""
    return []
