import uuid
import pandas as pd
from datetime import date
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/patent-intelligence", tags=["Patent Landscape Analytics"])

# =====================================================================
# 1. DATA CONTRACTS (SCHEMAS)
# =====================================================================
class CompetitorProfile(BaseModel):
    company_name: str
    total_patents: int
    primary_focus_sector: str
    market_share_percentage: float

class YearlyFilingPoint(BaseModel):
    year: int
    patent_count: int

class PatentTrendResponse(BaseModel):
    timeline: List[YearlyFilingPoint]
    velocity_label: str  # "Accelerating Growth", "Steady Growth", etc.

# =====================================================================
# 2. PANDAS DATA SCIENCE ANALYTICS ENGINE
# =====================================================================
class PatentAnalyticsEngine:
    @staticmethod
    def process_competitors(patents_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not patents_list:
            return []
            
        df = pd.DataFrame(patents_list)
        company_counts = df['assignee'].value_counts()
        
        profiles = []
        for company, count in company_counts.items():
            company_df = df[df['assignee'] == company]
            top_sector = company_df['tech_sector'].mode()[0] if not company_df['tech_sector'].empty else "General Tech"
            
            profiles.append({
                "company_name": str(company),
                "total_patents": int(count),
                "primary_focus_sector": str(top_sector),
                "market_share_percentage": float(round((count / len(df)) * 100, 2))
            })
        return profiles

    @staticmethod
    def process_time_trends(patents_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not patents_list:
            return {"timeline": [], "velocity_label": "Insufficient Historical Data"}
            
        df = pd.DataFrame(patents_list)
        yearly_series = df.groupby('filing_year').size().sort_index()
        
        timeline_points = [
            {"year": int(year), "patent_count": int(count)} 
            for year, count in yearly_series.items()
        ]
        
        if len(timeline_points) >= 2:
            growth = ((timeline_points[-1]["patent_count"] - timeline_points[0]["patent_count"]) / timeline_points[0]["patent_count"]) * 100
            velocity = "Accelerating Growth" if growth > 20 else "Steady Growth" if growth >= 0 else "Slowing / Maturing"
        else:
            velocity = "Steady Growth"
            
        return {"timeline": timeline_points, "velocity_label": velocity}

# =====================================================================
# 3. ROUTER API ENDPOINTS
# =====================================================================
@router.get("/competitors", response_model=List[CompetitorProfile])
def read_competitor_landscape(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Aggregates active patent datasets by owner to model competitive market distribution share."""
    # Simulation pool placeholder matching Member 1 database fields
    mock_patent_corpus = [
        {"assignee": "Google LLC", "tech_sector": "AI/ML", "filing_year": 2024},
        {"assignee": "Google LLC", "tech_sector": "AI/ML", "filing_year": 2025},
        {"assignee": "Tesla Inc", "tech_sector": "Robotics", "filing_year": 2024},
        {"assignee": "Tesla Inc", "tech_sector": "Robotics", "filing_year": 2025},
        {"assignee": "Google LLC", "tech_sector": "Computer Vision", "filing_year": 2026},
        {"assignee": "Apple Inc", "tech_sector": "Consumer AI", "filing_year": 2026}
    ]
    return PatentAnalyticsEngine.process_competitors(mock_patent_corpus)

@router.get("/trends", response_model=PatentTrendResponse)
def read_patent_trajectories(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Extracts chronological patent filing volumes to calculate macroeconomic technology velocities."""
    mock_patent_corpus = [
        {"assignee": "Google LLC", "tech_sector": "AI/ML", "filing_year": 2024},
        {"assignee": "Google LLC", "tech_sector": "AI/ML", "filing_year": 2025},
        {"assignee": "Tesla Inc", "tech_sector": "Robotics", "filing_year": 2024},
        {"assignee": "Tesla Inc", "tech_sector": "Robotics", "filing_year": 2025},
        {"assignee": "Google LLC", "tech_sector": "Computer Vision", "filing_year": 2026},
        {"assignee": "Apple Inc", "tech_sector": "Consumer AI", "filing_year": 2026}
    ]
    return PatentAnalyticsEngine.process_time_trends(mock_patent_corpus)
