from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


ReportType = Literal[
    "funding",
    "patent",
    "research_trend",
    "innovation_intelligence",
    "commercialization",
]


class ReportSection(BaseModel):
    title: str
    paragraphs: list[str] = Field(default_factory=list)
    table_headers: list[str] = Field(default_factory=list)
    table_rows: list[list[Any]] = Field(default_factory=list)


class ReportRequest(BaseModel):
    report_type: ReportType
    title: str
    organization: str | None = None
    generated_by: str | None = None
    generated_at: datetime | None = None

    executive_summary: str | None = None

    filters: dict[str, Any] = Field(
        default_factory=dict
    )

    sections: list[ReportSection] = Field(
        default_factory=list
    )

    recommendations: list[str] = Field(
        default_factory=list
    )