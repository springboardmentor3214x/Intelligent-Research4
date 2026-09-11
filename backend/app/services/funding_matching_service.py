from datetime import date, datetime, timezone
import logging
import re
from typing import Any
from uuid import UUID

from fastapi import HTTPException
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.saved_funding import SavedFunding
from backend.app.models.user import User
from backend.app.services.patent_embedding_service import (
    patent_embedding_service,
)

logger = logging.getLogger(__name__)


def build_funding_text(opportunity: FundingOpportunity) -> str:
    """Build rich normalized text representation from funding opportunity fields."""
    parts = []
    if opportunity.title:
        parts.append(f"Title: {opportunity.title}")
    if opportunity.description:
        parts.append(f"Description: {opportunity.description}")
    if opportunity.agency:
        parts.append(f"Agency: {opportunity.agency}")
    if opportunity.research_area:
        parts.append(f"Research Area: {opportunity.research_area}")
    if opportunity.funding_category:
        parts.append(f"Category: {opportunity.funding_category}")
    if opportunity.funding_type:
        parts.append(f"Type: {opportunity.funding_type}")
    if opportunity.eligibility:
        parts.append(f"Eligibility: {opportunity.eligibility}")
    return ". ".join(parts).strip()


def assess_automated_eligibility(
    opportunity: FundingOpportunity,
    user: User,
    profile: ResearchProfile | None = None,
) -> dict[str, str]:
    """
    Automated preliminary assessment of funding eligibility based on user profile and agency guidelines.
    Clearly identifies this as an automated assessment and not official legal eligibility confirmation.
    """
    eligibility_text = (opportunity.eligibility or "").lower()
    
    if not eligibility_text or len(eligibility_text.strip()) < 5:
        return {
            "status": "Insufficient Information",
            "badge": "warning",
            "rationale": "The funding source does not specify explicit applicant restrictions. Review official notice for full requirements.",
        }

    user_role = (user.role or "").lower()
    user_org = (user.organization or "").lower()

    # Positive match keywords
    academic_keywords = ["higher education", "university", "academic", "institution of higher education", "public institution", "private institution", "nonprofit", "individuals"]
    startup_keywords = ["small business", "for-profit", "commercial", "startup", "sbir", "sttr", "business enterprise"]

    if any(k in eligibility_text for k in ["unrestricted", "any type of applicant", "individuals", "open to all"]):
        return {
            "status": "Potentially Eligible",
            "badge": "success",
            "rationale": "Open opportunity: Application criteria appear unrestricted across institutional and individual applicants.",
        }

    if user_role == "researcher" or "univ" in user_org or "institute" in user_org or "lab" in user_org:
        if any(k in eligibility_text for k in academic_keywords):
            return {
                "status": "Potentially Eligible",
                "badge": "success",
                "rationale": f"Matched academic / higher education institution criteria based on your researcher profile ({user.organization or 'Academic Researcher'}).",
            }

    if user_role == "startup_founder" or "startup" in user_org:
        if any(k in eligibility_text for k in startup_keywords):
            return {
                "status": "Potentially Eligible",
                "badge": "success",
                "rationale": f"Matched small business / commercial innovation entity criteria for startup founders ({user.organization or 'Startup'}).",
            }

    if any(k in eligibility_text for k in academic_keywords + startup_keywords):
        return {
            "status": "Potentially Eligible",
            "badge": "success",
            "rationale": "Opportunity accommodates standard research institution and eligible organizational applicants.",
        }

    return {
        "status": "Eligibility Requirements Not Matched",
        "badge": "neutral",
        "rationale": "Specific eligibility criteria may require specialized organizational status (e.g., state agency, tribal government). Please check official announcement.",
    }


class FundingMatchingService:
    """
    AI/ML Semantic Matching service pairing Researcher Profiles with Funding Opportunities.
    """

    def get_recommendations_for_user(
        self,
        db: Session,
        current_user: User,
        limit: int = 20,
        min_score: float = 0.0,
        topic: str = "",
        research_area: str = "",
        funding_type: str = "",
        agency: str = "",
        focus_terms: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Produce ranked personalized funding opportunities matching user's researcher profile.
        """
        profile = db.query(ResearchProfile).filter(ResearchProfile.user_id == current_user.id).first()

        # Construct researcher profile query representation
        profile_parts = []
        if profile:
            if profile.research_domain:
                profile_parts.append(profile.research_domain)
            if profile.research_interests:
                profile_parts.append(profile.research_interests)
            for area in (profile.research_areas or []):
                profile_parts.append(area.name)
            for kw in (profile.keywords or []):
                profile_parts.append(kw.name)
            for tech in (profile.technology_areas or []):
                profile_parts.append(tech.name)

        if current_user.research_domain:
            profile_parts.append(current_user.research_domain)
        if current_user.organization:
            profile_parts.append(current_user.organization)
        if current_user.department:
            profile_parts.append(current_user.department)

        if topic and topic.strip():
            profile_parts.append(topic.strip())
        if focus_terms:
            profile_parts.extend([t.strip() for t in focus_terms if t.strip()])

        profile_text = ". ".join(profile_parts).strip()
        if not profile_text:
            profile_text = "Scientific Research, Technology Innovation, Applied Development"

        # Query candidates from DB with basic structural filters
        query = db.query(FundingOpportunity)
        if research_area and research_area.strip():
            query = query.filter(
                FundingOpportunity.research_area.ilike(f"%{research_area.strip()}%")
                | FundingOpportunity.funding_category.ilike(f"%{research_area.strip()}%")
            )
        if funding_type and funding_type.strip():
            query = query.filter(FundingOpportunity.funding_type.ilike(f"%{funding_type.strip()}%"))
        if agency and agency.strip():
            query = query.filter(FundingOpportunity.agency.ilike(f"%{agency.strip()}%"))

        opportunities = query.all()
        if not opportunities:
            return []

        # Generate semantic embeddings
        profile_vec = patent_embedding_service.generate_text_embeddings([profile_text])[0]
        opp_texts = [build_funding_text(opp) for opp in opportunities]
        opp_embeddings = patent_embedding_service.generate_text_embeddings(opp_texts)

        # Cosine similarities
        similarities = np.dot(opp_embeddings, profile_vec)
        ranked_indices = np.argsort(similarities)[::-1]

        # Get saved opportunity IDs for user
        saved_opp_ids = set(
            db.scalars(
                select(SavedFunding.funding_opportunity_id).where(SavedFunding.user_id == current_user.id)
            ).all()
        )

        results = []
        for idx in ranked_indices:
            opp = opportunities[idx]
            raw_score = float(similarities[idx])
            score = max(0.0, min(1.0, raw_score))

            if score < min_score:
                continue

            # Extract matched concepts
            opp_tokens = set(re.findall(r"\b[a-zA-Z]{3,20}\b", opp_texts[idx].lower()))
            prof_tokens = set(re.findall(r"\b[a-zA-Z]{3,20}\b", profile_text.lower()))
            matched_terms = [w.capitalize() for w in prof_tokens.intersection(opp_tokens) if len(w) > 3][:5]

            eligibility_info = assess_automated_eligibility(opp, current_user, profile)

            # Deadline calculations
            today = date.today()
            deadline_str = opp.close_date.isoformat() if opp.close_date else None
            days_remaining = (opp.close_date - today).days if opp.close_date else None
            
            if days_remaining is not None:
                if days_remaining < 0:
                    deadline_status = "Expired"
                elif days_remaining <= 14:
                    deadline_status = f"Closing Soon ({days_remaining}d)"
                else:
                    deadline_status = f"Active ({days_remaining}d left)"
            else:
                deadline_status = "Rolling / Open"

            results.append({
                "id": str(opp.id),
                "opportunity_number": opp.opportunity_number,
                "title": opp.title,
                "agency": opp.agency,
                "description": opp.description,
                "funding_amount": opp.funding_amount,
                "funding_type": opp.funding_type,
                "research_area": opp.research_area or opp.funding_category,
                "funding_category": opp.funding_category,
                "open_date": opp.open_date.isoformat() if opp.open_date else None,
                "close_date": deadline_str,
                "days_remaining": days_remaining,
                "deadline_status": deadline_status,
                "eligibility": opp.eligibility,
                "eligibility_assessment": eligibility_info,
                "official_link": opp.official_link,
                "source": opp.source,
                "relevance_score": round(score, 4),
                "relevance_percentage": round(score * 100.0, 1),
                "matched_concepts": matched_terms,
                "is_saved": opp.id in saved_opp_ids,
            })

            if len(results) >= limit:
                break

        return results

    def match_single_opportunity(
        self,
        db: Session,
        opportunity_id: UUID,
        current_user: User,
    ) -> dict[str, Any]:
        """Deep match breakdown for a single funding opportunity."""
        opp = db.get(FundingOpportunity, opportunity_id)
        if not opp:
            raise HTTPException(status_code=404, detail="Funding opportunity not found")

        recs = self.get_recommendations_for_user(
            db=db,
            current_user=current_user,
            limit=500,
            min_score=0.0,
        )
        match_item = next((r for r in recs if r["id"] == str(opp.id)), None)
        if not match_item:
            profile = db.query(ResearchProfile).filter(ResearchProfile.user_id == current_user.id).first()
            eligibility_info = assess_automated_eligibility(opp, current_user, profile)
            return {
                "id": str(opp.id),
                "title": opp.title,
                "agency": opp.agency,
                "relevance_score": 0.5,
                "relevance_percentage": 50.0,
                "matched_concepts": [],
                "eligibility_assessment": eligibility_info,
                "official_link": opp.official_link,
            }
        return match_item

    def save_funding(
        self,
        db: Session,
        opportunity_id: UUID,
        current_user: User,
    ) -> dict[str, Any]:
        """Save a funding opportunity for the user."""
        opp = db.get(FundingOpportunity, opportunity_id)
        if not opp:
            raise HTTPException(status_code=404, detail="Funding opportunity not found")

        existing = db.query(SavedFunding).filter(
            SavedFunding.user_id == current_user.id,
            SavedFunding.funding_opportunity_id == opportunity_id,
        ).first()
        if existing:
            return {"message": "Opportunity already saved", "saved_id": str(existing.id)}

        saved = SavedFunding(
            user_id=current_user.id,
            funding_opportunity_id=opportunity_id,
        )
        db.add(saved)
        db.commit()
        db.refresh(saved)
        return {"message": "Opportunity saved successfully", "saved_id": str(saved.id)}

    def get_saved_funding(
        self,
        db: Session,
        current_user: User,
    ) -> list[dict[str, Any]]:
        """List all saved funding opportunities for the user."""
        saved_records = (
            db.query(SavedFunding)
            .filter(SavedFunding.user_id == current_user.id)
            .order_by(SavedFunding.created_at.desc())
            .all()
        )
        results = []
        for s in saved_records:
            opp = s.funding_opportunity
            if opp:
                results.append({
                    "saved_id": str(s.id),
                    "saved_at": s.created_at.isoformat(),
                    "opportunity": {
                        "id": str(opp.id),
                        "title": opp.title,
                        "agency": opp.agency,
                        "funding_amount": opp.funding_amount,
                        "close_date": opp.close_date.isoformat() if opp.close_date else None,
                        "research_area": opp.research_area or opp.funding_category,
                        "funding_type": opp.funding_type,
                        "official_link": opp.official_link,
                    }
                })
        return results

    def remove_saved_funding(
        self,
        db: Session,
        opportunity_id: UUID,
        current_user: User,
    ) -> dict[str, str]:
        """Remove a saved funding opportunity by opportunity ID."""
        saved = db.query(SavedFunding).filter(
            SavedFunding.user_id == current_user.id,
            SavedFunding.funding_opportunity_id == opportunity_id,
        ).first()
        if not saved:
            raise HTTPException(status_code=404, detail="Saved funding opportunity not found")
        db.delete(saved)
        db.commit()
        return {"message": "Opportunity removed from saved list"}


funding_matching_service = FundingMatchingService()
