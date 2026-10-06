from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.schemas.report import ReportRequest
from backend.app.services.report_service import generate_pdf_report


router = APIRouter(
    prefix="/reports",
    tags=["Reports & Export (Module 11)"],
)


@router.post(
    "/pdf",
    response_class=Response,
)
def generate_report_pdf(
    report: ReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a PDF report.

    The current authenticated user is used as the report owner.
    Business calculations should be performed by the relevant
    intelligence modules before calling this PDF layer.
    """

    try:
        # Prefer authenticated user information over values
        # supplied by the frontend.
        report.generated_by = current_user.name

        if not report.organization:
            report.organization = current_user.organization

        pdf_bytes = generate_pdf_report(report)

        filename = (
            f"{report.report_type}_report.pdf"
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{filename}"'
                )
            },
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"PDF report generation failed: {type(exc).__name__}",
        ) from exc