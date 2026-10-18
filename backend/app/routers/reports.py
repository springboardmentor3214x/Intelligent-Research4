import logging
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.schemas.report import ReportRequest
from backend.app.schemas.unified_report import UnifiedReportQuery
from backend.app.services.report_data_service import report_data_service
from backend.app.services.report_service import (
    generate_pdf_report,
    generate_excel_report,
)
from backend.app.services.unified_report_service import unified_report_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reports",
    tags=["Reports & Export (Module 11)"],
)


@router.get("/funding")
def get_funding_report_preview(
    research_domain: str | None = Query(default=None),
    funding_type: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve raw structured data for funding report preview."""
    return report_data_service.get_funding_report_data(
        db=db,
        research_domain=research_domain,
        funding_type=funding_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )


@router.get("/patents")
def get_patent_report_preview(
    technology_domain: str | None = Query(default=None),
    organization: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve raw structured data for patent landscape report preview."""
    return report_data_service.get_patent_report_data(
        db=db,
        technology_domain=technology_domain,
        organization=organization,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )


@router.get("/research-trends")
def get_research_trend_report_preview(
    research_domain: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve raw structured data for research trends report preview."""
    return report_data_service.get_research_trend_report_data(
        db=db,
        research_domain=research_domain,
    )


@router.get("/innovation")
def get_innovation_report_preview(
    technology: str = Query(default="Artificial Intelligence"),
    idea_text: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve raw structured data for innovation intelligence report preview."""
    return report_data_service.get_innovation_report_data(
        db=db,
        technology=technology,
        idea_text=idea_text,
    )


@router.get("/commercialization")
def get_commercialization_report_preview(
    technology: str = Query(default="Artificial Intelligence"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve raw structured data for commercialization report preview."""
    return report_data_service.get_commercialization_report_data(
        db=db,
        technology=technology,
    )


@router.post("/unified")
def generate_unified_report_endpoint(
    query: UnifiedReportQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Module 11: Unified Intelligence Report Generator.
    Aggregates Modules 3 (Research), 4 (Funding), 5 (Patents), 6 (Tech),
    7 (Innovation), and 8 (Commercialization) for any research idea.
    """
    return unified_report_service.generate_unified_report(
        db=db,
        current_user=current_user,
        query=query,
    )


@router.post("/pdf", response_class=Response)
@router.post("/export/pdf", response_class=Response)
def generate_report_pdf_endpoint(
    report: ReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and return a PDF report binary."""
    try:
        report.generated_by = current_user.name
        if not report.organization and current_user.organization:
            report.organization = current_user.organization

        pdf_bytes = generate_pdf_report(report)
        filename = f"{report.report_type}_report.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            },
        )
    except Exception as exc:
        logger.error(f"PDF export failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"PDF report generation failed: {type(exc).__name__}",
        ) from exc


@router.post("/excel", response_class=Response)
@router.post("/export/excel", response_class=Response)
def generate_report_excel_endpoint(
    report: ReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and return an Excel spreadsheet report binary."""
    try:
        report.generated_by = current_user.name
        if not report.organization and current_user.organization:
            report.organization = current_user.organization

        excel_bytes = generate_excel_report(report)
        filename = f"{report.report_type}_report.xlsx"

        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            },
        )
    except Exception as exc:
        logger.error(f"Excel export failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Excel report generation failed: {type(exc).__name__}",
        ) from exc