from sqlalchemy.orm import Session

from backend.app.models.technology import Technology


def get_innovation_manager_dashboard(db: Session) -> dict:
    """
    Build the Innovation Manager dashboard from existing
    Technology Intelligence data.

    This service does not recalculate technology intelligence.
    It only aggregates data already stored by existing modules.
    """

    technologies = (
        db.query(Technology)
        .order_by(Technology.emerging_score.desc().nullslast())
        .all()
    )

    total_technologies = len(technologies)

    total_research_papers = sum(
        technology.research_paper_count or 0
        for technology in technologies
    )

    total_patents = sum(
        technology.patent_count or 0
        for technology in technologies
    )

    total_funding_opportunities = sum(
        technology.funding_opportunity_count or 0
        for technology in technologies
    )

    emerging_technologies = [
        {
            "technology_name": technology.technology_name,
            "technology_domain": technology.technology_domain,
            "emerging_score": technology.emerging_score,
            "emerging_status": technology.emerging_status,
            "research_growth_rate": technology.research_growth_rate,
            "patent_growth_rate": technology.patent_growth_rate,
            "funding_growth_rate": technology.funding_growth_rate,
        }
        for technology in technologies
        if technology.emerging_status
        in {"Emerging", "Growing", "Developing"}
    ]

    technology_trends = [
        {
            "technology_name": technology.technology_name,
            "technology_domain": technology.technology_domain,
            "research_paper_count": technology.research_paper_count,
            "patent_count": technology.patent_count,
            "funding_opportunity_count": technology.funding_opportunity_count,
            "research_growth_rate": technology.research_growth_rate,
            "patent_growth_rate": technology.patent_growth_rate,
            "funding_growth_rate": technology.funding_growth_rate,
            "emerging_score": technology.emerging_score,
            "emerging_status": technology.emerging_status,
        }
        for technology in technologies
    ]

    return {
        "overview": {
            "total_technologies": total_technologies,
            "total_research_papers": total_research_papers,
            "total_patents": total_patents,
            "total_funding_opportunities": total_funding_opportunities,
        },
        "technology_trends": technology_trends,
        "emerging_technologies": emerging_technologies,
    }