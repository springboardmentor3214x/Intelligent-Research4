from typing import List, Optional
from pydantic import BaseModel, Field


class UnifiedReportQuery(BaseModel):
    idea: str = Field(min_length=1, max_length=500)
    research_domain: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    technology_area: Optional[str] = None
    region: Optional[str] = "global"
    date_range: Optional[str] = "all"
    report_depth: Optional[str] = "standard"  # quick | standard | deep
    include_research: bool = True
    include_funding: bool = True
    include_patents: bool = True
    include_technology: bool = True
    include_innovation: bool = True
    include_commercialization: bool = True
