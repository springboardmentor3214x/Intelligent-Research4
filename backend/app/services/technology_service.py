from sqlalchemy.orm import Session

from backend.app.models.technology import Technology
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.patent import Patent
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.services.technology_analysis_service import TechnologyAnalysisService


def calculate_emerging_score(
    paper_count: int,
    patent_count: int,
    funding_count: int,
) -> float:
    """
    Calculate an explainable emerging technology score.

    Weighting:
        Research Papers  -> 40%
        Patents          -> 30%
        Funding          -> 30%

    The counts are normalized against the highest
    activity count found for the technology.
    """

    max_count = max(
        paper_count,
        patent_count,
        funding_count,
        1,
    )

    paper_score = (
        paper_count / max_count
    ) * 100

    patent_score = (
        patent_count / max_count
    ) * 100

    funding_score = (
        funding_count / max_count
    ) * 100

    score = (
        paper_score * 0.40
        + patent_score * 0.30
        + funding_score * 0.30
    )

    return round(
        min(score, 100),
        2,
    )


def calculate_emerging_status(
    score: float,
) -> str:
    """
    Convert emerging score into a readable status.
    """

    if score >= 70:
        return "Emerging"

    if score >= 40:
        return "Growing"

    return "Early Stage"


def get_or_create_technology(
    db: Session,
    technology_name: str,
) -> Technology:
    """
    Get an existing technology or create a new one.
    """

    technology = (
        db.query(Technology)
        .filter(
            Technology.technology_name
            == technology_name
        )
        .first()
    )

    if technology:
        return technology

    technology = Technology(
        technology_name=technology_name,
        description=None,
        technology_domain=None,
        research_paper_count=0,
        citation_count=0,
        patent_count=0,
        funding_opportunity_count=0,
        research_growth_rate=0.0,
        patent_growth_rate=0.0,
        funding_growth_rate=0.0,
        emerging_score=0.0,
        emerging_status="Early Stage",
        source="Modules 3, 4 and 5",
    )

    db.add(technology)
    db.flush()

    return technology


def sync_technologies(db: Session):
    """
    Generate Technology Intelligence records
    from Research Papers, Patents and Funding using semantic concept matching.
    """

    # =================================================
    # Technology candidates
    # =================================================

    technology_candidates = {
        "Artificial Intelligence",
        "Machine Learning",
        "Medical Imaging AI",
        "Edge AI",
        "Quantum Computing",
        "Natural Language Processing",
        "Computer Vision",
        "Robotics",
        "Deep Learning",
        "Biotechnology",
        "Cybersecurity",
        "Clean Energy",
        "Generative AI",
    }

    # =================================================
    # Create technology records if they don't exist
    # =================================================

    for technology_name in technology_candidates:
        get_or_create_technology(
            db,
            technology_name,
        )

    db.commit()

    # =================================================
    # Process each technology with concept matching
    # =================================================

    technologies = (
        db.query(Technology)
        .all()
    )

    for technology in technologies:
        tech_name = technology.technology_name

        related_papers, related_patents, related_funding = TechnologyAnalysisService.fetch_related_entities_by_term(
            db, tech_name
        )

        technology.research_paper_count = len(related_papers)
        technology.citation_count = sum(
            paper.citation_count or 0
            for paper in related_papers
        )
        technology.patent_count = len(related_patents)
        technology.funding_opportunity_count = len(related_funding)

        # -------------------------------------------------
        # Technology Domain Discovery
        # -------------------------------------------------
        domains = set()
        for paper in related_papers:
            if paper.research_domain:
                domains.add(paper.research_domain)

        for patent in related_patents:
            if patent.technology_domain:
                domains.add(patent.technology_domain)

        for funding in related_funding:
            if funding.research_area:
                domains.add(funding.research_area)

        if domains:
            technology.technology_domain = ", ".join(sorted(domains)[:4])

        # -------------------------------------------------
        # Emerging Technology Score & Status
        # -------------------------------------------------
        technology.emerging_score = calculate_emerging_score(
            technology.research_paper_count,
            technology.patent_count,
            technology.funding_opportunity_count,
        )

        technology.emerging_status = calculate_emerging_status(
            technology.emerging_score
        )

        technology.source = "Research Papers, Patents and Funding"

    # =================================================
    # Save changes
    # =================================================
    db.commit()

    for technology in technologies:
        db.refresh(technology)

    return technologies