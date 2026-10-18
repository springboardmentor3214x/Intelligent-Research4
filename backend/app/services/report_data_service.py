from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.patent import Patent
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.technology import Technology
from backend.app.services.research_analysis_service import (
    research_analysis_service,
)
from backend.app.services.innovation_scoring_service import (
    innovation_scoring_service,
)
from backend.app.services.commercialization_service import (
    commercialization_service,
)


class ReportDataService:
    """
    Provides structured and aggregated data for Module 11 reports.

    This service only prepares report data.
    PDF/Excel generation and frontend presentation
    are handled by other team members.
    """

    def _apply_date_filter(
        self,
        query,
        column,
        start_date: date | None = None,
        end_date: date | None = None,
    ):
        if start_date:
            query = query.filter(column >= start_date)

        if end_date:
            query = query.filter(column <= end_date)

        return query

    def get_funding_report_data(
        self,
        db: Session,
        research_domain: str | None = None,
        funding_type: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:

        query = db.query(FundingOpportunity)

        if research_domain:
            query = query.filter(
                FundingOpportunity.research_area.ilike(
                    f"%{research_domain}%"
                )
            )

        if funding_type:
            query = query.filter(
                FundingOpportunity.funding_type.ilike(
                    f"%{funding_type}%"
                )
            )

        query = self._apply_date_filter(
            query,
            FundingOpportunity.close_date,
            start_date,
            end_date,
        )

        opportunities = (
            query
            .order_by(FundingOpportunity.close_date.asc())
            .limit(limit)
            .all()
        )

        records = [
            {
                "id": str(item.id),
                "title": item.title,
                "agency": item.agency,
                "funding_type": item.funding_type,
                "funding_amount": (
                    float(item.funding_amount)
                    if item.funding_amount is not None
                    else None
                ),
                "research_area": item.research_area,
                "eligibility": item.eligibility,
                "open_date": (
                    item.open_date.isoformat()
                    if item.open_date
                    else None
                ),
                "close_date": (
                    item.close_date.isoformat()
                    if item.close_date
                    else None
                ),
                "status": item.status,
                "official_link": item.official_link,
            }
            for item in opportunities
        ]

        return {
            "report_type": "funding",
            "total_records": len(records),
            "records": records,
        }

    def get_patent_report_data(
        self,
        db: Session,
        technology_domain: str | None = None,
        organization: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:

        query = db.query(Patent)

        if technology_domain:
            query = query.filter(
                Patent.technology_domain.ilike(
                    f"%{technology_domain}%"
                )
            )

        if organization:
            query = query.filter(
                Patent.assignee.ilike(
                    f"%{organization}%"
                )
            )

        query = self._apply_date_filter(
            query,
            Patent.filing_date,
            start_date,
            end_date,
        )

        patents = (
            query
            .order_by(Patent.filing_date.desc())
            .limit(limit)
            .all()
        )

        records = [
            {
                "id": str(item.id),
                "publication_number": item.publication_number,
                "title": item.title,
                "assignee": item.assignee,
                "inventors": item.inventors,
                "filing_date": (
                    item.filing_date.isoformat()
                    if item.filing_date
                    else None
                ),
                "publication_date": (
                    item.publication_date.isoformat()
                    if item.publication_date
                    else None
                ),
                "classification": item.classification,
                "technology_domain": item.technology_domain,
                "citation_count": item.citation_count,
                "status": item.status,
                "official_link": item.official_link,
            }
            for item in patents
        ]

        total_citations = sum(
            item["citation_count"] or 0
            for item in records
        )

        return {
            "report_type": "patent",
            "total_records": len(records),
            "total_citations": total_citations,
            "records": records,
        }

    def get_research_trend_report_data(
        self,
        db: Session,
        research_domain: str | None = None,
    ) -> dict[str, Any]:

        trends = research_analysis_service.compute_research_trends(
            db=db
        )

        if research_domain:
            papers = (
                db.query(ResearchPaper)
                .filter(
                    ResearchPaper.research_domain.ilike(
                        f"%{research_domain}%"
                    )
                )
                .all()
            )

            filtered_paper_ids = {
                paper.id
                for paper in papers
            }

            trends["filtered_domain"] = research_domain
            trends["filtered_paper_count"] = len(
                filtered_paper_ids
            )

        return {
            "report_type": "research_trends",
            **trends,
        }

    def get_innovation_report_data(
        self,
        db: Session,
        technology: str,
        idea_text: str | None = None,
    ) -> dict[str, Any]:

        score = (
            innovation_scoring_service.evaluate_innovation_score(
                db=db,
                technology=technology,
                idea_text=idea_text,
            )
        )

        return {
            "report_type": "innovation",
            "technology": technology,
            "innovation_analysis": score.model_dump(
                mode="json"
            ),
        }

    def get_commercialization_report_data(
        self,
        db: Session,
        technology: str,
    ) -> dict[str, Any]:

        analysis = (
            commercialization_service
            .perform_full_commercialization_analysis(
                db=db,
                technology=technology,
            )
        )

        return {
            "report_type": "commercialization",
            "technology": technology,
            "commercialization_analysis": analysis.model_dump(
                mode="json"
            ),
        }


report_data_service = ReportDataService()