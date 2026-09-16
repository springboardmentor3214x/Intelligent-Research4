from sqlalchemy.orm import Session

from backend.app.models.technology import Technology
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.patent import Patent
from backend.app.models.funding_opportunity import FundingOpportunity


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
    from Research Papers, Patents and Funding.
    """

    # =================================================
    # Technology candidates
    # =================================================

    technology_candidates = {
        "Artificial Intelligence",
        "Machine Learning",
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
    # Load source data
    # =================================================

    papers = (
        db.query(ResearchPaper)
        .all()
    )

    patents = (
        db.query(Patent)
        .all()
    )

    funding_list = (
        db.query(FundingOpportunity)
        .all()
    )

    # =================================================
    # Process each technology
    # =================================================

    technologies = (
        db.query(Technology)
        .all()
    )

    for technology in technologies:

        technology_name = (
            technology.technology_name
            .lower()
        )

        # -------------------------------------------------
        # Research Papers
        # -------------------------------------------------

        related_papers = []

        for paper in papers:

            searchable_text = " ".join(
                filter(
                    None,
                    [
                        paper.title,
                        paper.abstract,
                        paper.authors,
                        paper.keywords,
                        paper.research_domain,
                    ],
                )
            ).lower()

            if technology_name in searchable_text:

                related_papers.append(
                    paper
                )

        technology.research_paper_count = (
            len(related_papers)
        )

        technology.citation_count = sum(
            paper.citation_count or 0
            for paper in related_papers
        )

        # -------------------------------------------------
        # Patents
        # -------------------------------------------------

        related_patents = []

        for patent in patents:

            searchable_text = " ".join(
                filter(
                    None,
                    [
                        patent.title,
                        patent.abstract,
                        patent.assignee,
                        patent.inventors,
                        patent.classification,
                        patent.technology_domain,
                    ],
                )
            ).lower()

            if technology_name in searchable_text:

                related_patents.append(
                    patent
                )

        technology.patent_count = (
            len(related_patents)
        )

        # -------------------------------------------------
        # Funding Opportunities
        # -------------------------------------------------

        related_funding = []

        for funding in funding_list:

            searchable_text = " ".join(
                filter(
                    None,
                    [
                        funding.title,
                        funding.description,
                        funding.funding_category,
                        funding.research_area,
                        funding.eligibility,
                    ],
                )
            ).lower()

            if technology_name in searchable_text:

                related_funding.append(
                    funding
                )

        technology.funding_opportunity_count = (
            len(related_funding)
        )

        # -------------------------------------------------
        # Technology Domain
        # -------------------------------------------------

        domains = set()

        for paper in related_papers:

            if paper.research_domain:

                domains.add(
                    paper.research_domain
                )

        for patent in related_patents:

            if patent.technology_domain:

                domains.add(
                    patent.technology_domain
                )

        if domains:

            technology.technology_domain = (
                ", ".join(
                    sorted(domains)
                )
            )

        # -------------------------------------------------
        # Emerging Technology Score
        # -------------------------------------------------

        technology.emerging_score = (
            calculate_emerging_score(
                technology.research_paper_count,
                technology.patent_count,
                technology.funding_opportunity_count,
            )
        )

        # -------------------------------------------------
        # Emerging Status
        # -------------------------------------------------

        technology.emerging_status = (
            calculate_emerging_status(
                technology.emerging_score
            )
        )

        # -------------------------------------------------
        # Source
        # -------------------------------------------------

        technology.source = (
            "Research Papers, Patents and Funding"
        )

    # =================================================
    # Save changes
    # =================================================

    db.commit()

    # Refresh objects
    for technology in technologies:
        db.refresh(technology)

    return technologies