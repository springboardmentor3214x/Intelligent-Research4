import uuid
from typing import List, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel

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
    technology_stage: str  # "Emerging", "Developing", "Mature", "Declining"
    maturity_score: float
    adoption_level: str  # "Low", "Medium", "High"
    indicators: FactorBreakdown
    reason: str

# --- ISOLATED SANDBOX ENGINE ---
class TechnologyIntelligenceEngine:
    @staticmethod
    def evaluate_technology_maturity(tech_name: str) -> Dict[str, Any]:
        """Calculates Module 6 true 6-factor technology maturity metrics using guide criteria."""
        # 1. Guide-compliant hardcoded mock indicators out of 100 for isolated testing
        res_act_score = 80.0
        res_gro_score = 85.0
        pat_act_score = 70.0
        pat_gro_score = 90.0
        org_score = 75.0
        div_score = 80.0
        
        # 2. Apply explicit project weights: 25%, 25%, 15%, 15%, 10%, 10%
        maturity_score = (
            (res_gro_score * 0.25) + (pat_gro_score * 0.25) +
            (res_act_score * 0.15) + (pat_act_score * 0.15) +
            (org_score * 0.10) + (div_score * 0.10)
        )
        final_score = round(maturity_score, 2)
        
        # Suggested Classification brackets
        if final_score > 75:
            stage = "Developing/Emerging"
            reason = "Research and patent activity have increased significantly over the analysed period, while adoption remains relatively low."
        elif final_score > 50:
            stage = "Developing"
            reason = "Strong research and patent growth across active technology indices."
        else:
            stage = "Emerging"
            reason = "Recent technological activity growth signs observed following low historical baselines."

        return {
            "technology_name": tech_name,
            "technology_stage": stage,
            "maturity_score": final_score,
            "adoption_level": "Low",
            "indicators": {
                "research_activity": res_act_score,
                "research_growth": res_gro_score,
                "patent_activity": pat_act_score,
                "patent_growth": pat_gro_score,
                "organization_activity": org_score,
                "application_diversity": div_score
            },
            "reason": f"Technology Stage: {stage}. Research & Patent Activity: High. Adoption: Low. Reason: {reason}"
        }

@router.get("/maturity/{tech_query}", response_model=TechMaturityResponse)
def get_technology_maturity_analysis(tech_query: str):
    """Module 6: Exposes 6-factor lifecycle classification layers and adoption velocities."""
    return TechnologyIntelligenceEngine.evaluate_technology_maturity(tech_query)
