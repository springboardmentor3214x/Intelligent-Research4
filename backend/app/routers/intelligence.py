from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from backend.app.database.connection import get_db
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/intelligence", tags=["Research Intelligence Analytics"])

# =====================================================================
# 1. DATA CONTRACTS (SCHEMAS)
# =====================================================================
class YearlyTrendPoint(BaseModel):
    year: int
    count: int

class TopicTrendResponse(BaseModel):
    topic: str
    timeline: List[YearlyTrendPoint]
    growth_rate: float

class ResearchGapInsight(BaseModel):
    id: int
    gap_title: str
    frequency_count: int
    impact_level: str
    suggested_pathway: str

# =====================================================================
# 2. ANALYTICS ALGORITHMS ENGINE
# =====================================================================
class AnalyticsEngine:
    @staticmethod
    def calculate_growth_rate(timeline: List[dict]) -> float:
        if len(timeline) < 2:
            return 0.0
        sorted_timeline = sorted(timeline, key=lambda x: x["year"])
        first_val = sorted_timeline[0]["count"]
        last_val = sorted_timeline[-1]["count"]
        
        if first_val == 0:
            return float(last_val * 100)
        return float(round(((last_val - first_val) / first_val) * 100, 2))

    @staticmethod
    def identify_semantic_gaps(limitations_list: List[str]) -> List[dict]:
        gap_matrix = [
            {
                "id": 1,
                "gap_title": "Scalability limitations in real-world clinical deployment",
                "frequency_count": sum(1 for text in limitations_list if any(w in text.lower() for w in ["scale", "clinical", "real-world"])),
                "impact_level": "High",
                "suggested_pathway": "Focus on high-throughput compression models and distributed clinical trials."
            },
            {
                "id": 2,
                "gap_title": "Lack of interpretability and white-box explainability criteria",
                "frequency_count": sum(1 for text in limitations_list if any(w in text.lower() for w in ["explain", "interpret", "black-box"])),
                "impact_level": "High",
                "suggested_pathway": "Develop layer-wise relevance propagation architectures explicitly for transparency."
            }
        ]
        return [gap for gap in gap_matrix if gap["frequency_count"] > 0]

# =====================================================================
# 3. ROUTER API ENDPOINTS
# =====================================================================
@router.get("/trends", response_model=TopicTrendResponse)
def read_trends(
    topic: str = "Generative AI", 
    db: Session = Depends(get_db), 
    current_user: str = Depends(get_current_user)
):
    """Calculates chronological research growth volume parameters over time."""
    mock_timeline = [
        {"year": 2024, "count": 12}, 
        {"year": 2025, "count": 19}, 
        {"year": 2026, "count": 34}
    ]
    growth = AnalyticsEngine.calculate_growth_rate(mock_timeline)
    
    return {
        "topic": topic,
        "timeline": mock_timeline,
        "growth_rate": growth
    }

@router.get("/gaps", response_model=List[ResearchGapInsight])
def read_gaps(
    db: Session = Depends(get_db), 
    current_user: str = Depends(get_current_user)
):
    """Aggregates multi-document text limitations to isolate critical research openings."""
    mock_limitations_pool = [
        "The model exhibits low explainability in real-world healthcare clinics.",
        "Requires deep scale computation structures which impacts real-world deployment parameters.",
        "Exhibits typical black-box algorithmic execution downfalls."
    ]
    return AnalyticsEngine.identify_semantic_gaps(mock_limitations_pool)
