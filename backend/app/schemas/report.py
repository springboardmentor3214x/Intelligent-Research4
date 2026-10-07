from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ReportSection(BaseModel):
    title: str
    paragraphs: List[str] = Field(default_factory=list)
    table_headers: Optional[List[str]] = None
    table_rows: Optional[List[List[Any]]] = None


class ReportRequest(BaseModel):
    report_type: str
    title: Optional[str] = None
    organization: Optional[str] = None
    generated_by: Optional[str] = None
    executive_summary: Optional[str] = None
    filters: Optional[dict[str, Any]] = Field(default_factory=dict)
    sections: List[ReportSection] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
