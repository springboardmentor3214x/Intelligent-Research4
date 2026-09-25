import logging
import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.schemas.innovation import (
    GrokChatRequest,
    GrokChatResponse,
    GrokInnovationBriefRequest,
    GrokInnovationBriefResponse,
    IdeaInnovationAnalysisRequest,
    IdeaInnovationAnalysisResponse,
    InnovationAssessmentRequest,
    InnovationScoreResponse,
    TechnologyComparisonRequest,
    TechnologyComparisonResponse,
)
from backend.app.services.innovation_scoring_service import (
    innovation_scoring_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/innovation", tags=["Innovation Scoring Engine (Module 7)"])


@router.post("/assess", response_model=InnovationScoreResponse)
def assess_technology_innovation(
    payload: InnovationAssessmentRequest,
    db: Session = Depends(get_db)
):
    """
    Module 7: Authoritative Innovation Scoring Endpoint.
    Calculates the explainable 5-factor Innovation Score (Research Novelty 30%,
    Patent Strength 20%, Technology Maturity 15%, Market Potential 20%, Funding Relevance 15%)
    from empirical multi-source evidence.
    """
    tech_query = payload.technology
    if not tech_query and payload.idea_text:
        tech_query = payload.idea_text[:60]
    elif not tech_query and payload.entity_id:
        tech_query = "Emerging Technology"
    elif not tech_query:
        tech_query = "Quantum Computing"

    try:
        return innovation_scoring_service.evaluate_innovation_score(
            db=db,
            technology=tech_query,
            idea_text=payload.idea_text
        )
    except Exception as e:
        logger.error(f"Innovation assessment failed for '{tech_query}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate innovation score: {str(e)}"
        )


@router.get("/technologies/{technology_name}", response_model=InnovationScoreResponse)
def get_technology_innovation_score(
    technology_name: str,
    idea_text: Optional[str] = Query(None, description="Optional contextual idea text"),
    db: Session = Depends(get_db)
):
    """
    GET endpoint for retrieving the real-time empirical Innovation Score for a specific technology.
    """
    try:
        return innovation_scoring_service.evaluate_innovation_score(
            db=db,
            technology=technology_name,
            idea_text=idea_text
        )
    except Exception as e:
        logger.error(f"Innovation query failed for '{technology_name}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve innovation score for '{technology_name}': {str(e)}"
        )


@router.post("/analyze-idea", response_model=IdeaInnovationAnalysisResponse)
def analyze_user_idea(
    payload: IdeaInnovationAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Module 7 Feature: Analyze My Idea.
    Extracts concepts, calculates research/patent/funding similarity, and returns
    an evidence-grounded Innovation Score with research gaps and differentiation ideas.
    """
    try:
        return innovation_scoring_service.analyze_idea(
            db=db,
            idea_text=payload.idea_text,
            target_domain=payload.target_domain
        )
    except Exception as e:
        logger.error(f"Idea analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze idea: {str(e)}"
        )


@router.post("/compare", response_model=TechnologyComparisonResponse)
def compare_technologies(
    payload: TechnologyComparisonRequest,
    db: Session = Depends(get_db)
):
    """
    Module 7 Feature: Compare Technologies Side-by-Side.
    Evaluates 2 to 5 technologies and presents transparent, factor-by-factor comparisons.
    """
    try:
        return innovation_scoring_service.compare_technologies(
            db=db,
            technologies=payload.technologies
        )
    except Exception as e:
        logger.error(f"Technology comparison failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compare technologies: {str(e)}"
        )


@router.post("/grok-brief", response_model=GrokInnovationBriefResponse)
def generate_ai_innovation_brief(
    payload: GrokInnovationBriefRequest,
    db: Session = Depends(get_db)
):
    """
    Module 7 Feature: AI Innovation Brief (Grok/Groq).
    Synthesizes structured strategic insights grounded strictly in platform evidence.
    """
    try:
        return innovation_scoring_service.generate_grok_brief(
            db=db,
            technology=payload.technology,
            include_web_search=payload.include_web_search
        )
    except Exception as e:
        logger.error(f"Grok brief generation failed for '{payload.technology}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate Grok Innovation Brief: {str(e)}"
        )


@router.post("/ask-analyst", response_model=GrokChatResponse)
def ask_innovation_analyst(
    payload: GrokChatRequest,
    db: Session = Depends(get_db)
):
    """
    Module 7 Feature: Ask Innovation Analyst (AI Q&A).
    Answers user questions grounded in the empirical evidence of the analyzed technology.
    """
    try:
        return innovation_scoring_service.answer_analyst_question(
            db=db,
            technology=payload.technology,
            question=payload.question,
            chat_history=payload.chat_history
        )
    except Exception as e:
        logger.error(f"Analyst chat failed for '{payload.technology}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process analyst question: {str(e)}"
        )
