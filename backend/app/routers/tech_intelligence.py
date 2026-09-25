from typing import Any, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.services.technology_analysis_service import analyze_technology_intelligence

router = APIRouter(prefix="/tech-intelligence", tags=["Technology Intelligence Systems"])

class FactorBreakdown(BaseModel):
    research_activity: float
    research_growth: float
    patent_activity: float
    patent_growth: float
    organization_activity: float
    application_diversity: float

class TechMaturityResponse(BaseModel):
    technology_name: str
    technology_stage: str
    maturity_score: float
    adoption_level: str
    indicators: FactorBreakdown
    reason: str


@router.get("/maturity/{tech_query}", response_model=TechMaturityResponse)
def get_technology_maturity_analysis(
    tech_query: str,
    db: Session = Depends(get_db),
):
    """
    Module 6: Exposes 6-factor lifecycle classification layers and adoption velocities
    using real multi-source technology intelligence data.
    """
    analysis = analyze_technology_intelligence(db, tech_query)
    ind = analysis.indicators

    # Extract normalized scores (or 0.0 if not available for legacy response schema)
    res_act = ind["research_activity"].normalized_score or 0.0
    res_gro = ind["research_growth"].normalized_score or 0.0
    pat_act = ind["patent_activity"].normalized_score or 0.0
    pat_gro = ind["patent_growth"].normalized_score or 0.0
    org_act = ind["organization_participation"].normalized_score or 0.0
    app_div = ind["application_diversity"].normalized_score or 0.0

    score = analysis.weighted_score.adjusted_score if analysis.weighted_score.adjusted_score is not None else analysis.weighted_score.total

    return TechMaturityResponse(
        technology_name=analysis.technology,
        technology_stage=analysis.stage.classification,
        maturity_score=score,
        adoption_level=analysis.adoption.level,
        indicators=FactorBreakdown(
            research_activity=res_act,
            research_growth=res_gro,
            patent_activity=pat_act,
            patent_growth=pat_gro,
            organization_activity=org_act,
            application_diversity=app_div,
        ),
        reason=analysis.stage.reason,
    )

