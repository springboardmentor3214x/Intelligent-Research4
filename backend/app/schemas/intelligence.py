from pydantic import BaseModel, ConfigDict
from typing import List

# --- Research Trends Schemas ---
class YearlyTrendPoint(BaseModel):
    year: int
    count: int

class TopicTrendResponse(BaseModel):
    topic: str
    timeline: List[YearlyTrendPoint]
    growth_rate: float  # Percentage change over available timelines

# --- Research Gaps & Insights Schemas ---
class ResearchGapInsight(BaseModel):
    id: int
    gap_title: str          # e.g., "Lack of explainability in neural medical imaging"
    frequency_count: int    # Number of papers reporting this limitation
    impact_level: str       # "High", "Medium", "Low" based on repetition metrics
    suggested_pathway: str  # Actionable future research direction guidance
