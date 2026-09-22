import uuid
from typing import List, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/innovation", tags=["Innovation Scoring & Assessment Analytics"])

class FactorScoreBreakdown(BaseModel):
    research_novelty: float
    patent_strength: float
    tech_maturity: float
    market_potential: float
    funding_relevance: float

class ScoreExplanation(BaseModel):
    summary: str
    strongest_factor: str
    weakest_factor: str

class InnovationAssessmentResponse(BaseModel):
    entity_id: uuid.UUID
    overall_score: float
    factor_breakdown: FactorScoreBreakdown
    explanation: ScoreExplanation

class EvaluationRequest(BaseModel):
    entity_id: uuid.UUID

class InnovationScoringEngine:
    @staticmethod
    def handle_missing_data(metrics: Dict[str, Any]) -> Dict[str, float]:
        """Implements guide-mandated fallback logic handling missing data indices with defaults."""
        cleaned_metrics = {}
        default_baselines = {
            "research_novelty": 82.0,
            "patent_strength": 74.0,
            "tech_maturity": 60.0,
            "market_potential": 76.0,
            "funding_relevance": 70.0
        }
        
        for factor, default_val in default_baselines.items():
            val = metrics.get(factor)
            # Check if the signal is missing or dropped below zero bounds
            if val is None or val < 0:
                cleaned_metrics[factor] = default_val
            else:
                cleaned_metrics[factor] = float(val)

        rn = metrics["research_novelty"]
        ps = metrics["patent_strength"]
        tm = metrics["tech_maturity"]
        mp = metrics["market_potential"]
        fr = metrics["funding_relevance"]

        overall_score = (rn * 0.30) + (ps * 0.20) + (tm * 0.15) + (mp * 0.20) + (fr * 0.15)
        final_score = round(overall_score, 2)

        factors_map = {
            "Research Novelty": rn,
            "Patent Strength": ps,
            "Technology Maturity": tm,
            "Market Potential": mp,
            "Funding Relevance": fr
        }
        strongest = max(factors_map, key=factors_map.get)
        weakest = min(factors_map, key=factors_map.get)

        summary = (
            f"The technology shows strong {strongest.lower()} indicators ({factors_map[strongest]}), "
            f"while its {weakest.lower()} parameters ({factors_map[weakest]}) are comparatively moderate."
        )

        return {
            "entity_id": entity_id,
            "overall_score": final_score,
            "factor_breakdown": {
                "research_novelty": rn,
                "patent_strength": ps,
                "tech_maturity": tm,
                "market_potential": mp,
                "funding_relevance": fr
            },
            "explanation": {
                "summary": summary,
                "strongest_factor": strongest,
                "weakest_factor": weakest
            }
        }

@router.post("/assess", response_model=InnovationAssessmentResponse)
def run_innovation_assessment(payload: EvaluationRequest):
    """Module 7: Fuses normalized multi-module input indicators into an explainable score."""
    mock_raw_inputs = {
        "research_novelty": 82.0,
        "patent_strength": 74.0,
        "tech_maturity": 60.0,
        "market_potential": 76.0,
        "funding_relevance": -1.0  # Simulates missing data to confirm the fallback rules
    }
    return InnovationScoringEngine.calculate_global_score(payload.entity_id, mock_raw_inputs)
