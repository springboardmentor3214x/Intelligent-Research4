from collections import defaultdict

from sqlalchemy.orm import Session

from backend.app.models.technology import Technology
from backend.app.models.technology_activity import TechnologyActivity
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.patent import Patent
from backend.app.models.funding_opportunity import FundingOpportunity


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
            Technology.technology_name == technology_name
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
        source="Research Papers, Patents and Funding",
    )

    db.add(technology)
    db.flush()

    return technology


def matches_technology(
    technology_name: str,
    text_values: list[str | None],
) -> bool:
    """
    Check whether a record is related to a technology.

    Matching is performed against title, abstract,
    keywords, domains and other available source fields.
    """

    technology_name = technology_name.lower()

    searchable_text = " ".join(
        filter(
            None,
            text_values,
        )
    ).lower()

    return technology_name in searchable_text


def sync_technology_activity(
    db: Session,
    technology: Technology,
    papers: list[ResearchPaper],
    patents: list[Patent],
) -> None:
    """
    Build year-wise TechnologyActivity records
    from real research paper and patent data.
    """

    yearly_activity = defaultdict(
        lambda: {
            "research_papers": [],
            "patents": [],
        }
    )

    # -------------------------------------------------
    # Research papers by publication year
    # -------------------------------------------------

    for paper in papers:

        if not paper.publication_year:
            continue

        if matches_technology(
            technology.technology_name,
            [
                paper.title,
                paper.abstract,
                paper.authors,
                paper.keywords,
                paper.research_domain,
            ],
        ):
            yearly_activity[
                paper.publication_year
            ]["research_papers"].append(paper)

    # -------------------------------------------------
    # Patents by filing year
    # -------------------------------------------------

    for patent in patents:

        if not patent.filing_date:
            continue

        if matches_technology(
            technology.technology_name,
            [
                patent.title,
                patent.abstract,
                patent.assignee,
                patent.inventors,
                patent.classification,
                patent.technology_domain,
            ],
        ):
            yearly_activity[
                patent.filing_date.year
            ]["patents"].append(patent)

    # -------------------------------------------------
    # Create / update yearly records
    # -------------------------------------------------

    for year, activity in yearly_activity.items():

        related_papers = activity[
            "research_papers"
        ]

        related_patents = activity[
            "patents"
        ]

        research_citations = sum(
            paper.citation_count or 0
            for paper in related_papers
        )

        patent_citations = sum(
            patent.citation_count or 0
            for patent in related_patents
        )

        # Unique organizations from patent assignees
        organizations = {
            patent.assignee.strip()
            for patent in related_patents
            if patent.assignee
            and patent.assignee.strip()
        }

        # Application diversity is represented by the
        # number of unique research domains and patent
        # classifications available for that year.
        applications = set()

        for paper in related_papers:

            if paper.research_domain:
                applications.add(
                    paper.research_domain.strip().lower()
                )

        for patent in related_patents:

            if patent.classification:

                classifications = (
                    patent.classification.split(",")
                )

                for classification in classifications:

                    classification = (
                        classification.strip().lower()
                    )

                    if classification:
                        applications.add(
                            classification
                        )

        activity_record = (
            db.query(TechnologyActivity)
            .filter(
                TechnologyActivity.technology_id
                == technology.id,
                TechnologyActivity.year
                == year,
            )
            .first()
        )

        if not activity_record:

            activity_record = TechnologyActivity(
                technology_id=technology.id,
                year=year,
            )

            db.add(activity_record)

        activity_record.research_paper_count = (
            len(related_papers)
        )

        activity_record.patent_count = (
            len(related_patents)
        )

        activity_record.citation_count = (
            research_citations
            + patent_citations
        )

        activity_record.organization_count = (
            len(organizations)
        )

        activity_record.application_diversity = (
            float(len(applications))
        )


def sync_technologies(db: Session):
    """
    Synchronize Technology Intelligence data
    from Research Papers, Patents and Funding.

    This function provides the raw historical
    activity data required for Technology
    Intelligence and Maturity Analysis.
    """

    # =================================================
    # Technology candidates
    # =================================================

    technology_candidates = {
        "Artificial Intelligence",
        "Machine Learning",
    }

    # =================================================
    # Create technology records
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

    technologies = (
        db.query(Technology)
        .all()
    )

    # =================================================
    # Process each technology
    # =================================================

    for technology in technologies:

        technology_name = (
            technology.technology_name
            .lower()
        )

        # -------------------------------------------------
        # Research papers
        # -------------------------------------------------

        related_papers = [
            paper
            for paper in papers
            if matches_technology(
                technology_name,
                [
                    paper.title,
                    paper.abstract,
                    paper.authors,
                    paper.keywords,
                    paper.research_domain,
                ],
            )
        ]

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

        related_patents = [
            patent
            for patent in patents
            if matches_technology(
                technology_name,
                [
                    patent.title,
                    patent.abstract,
                    patent.assignee,
                    patent.inventors,
                    patent.classification,
                    patent.technology_domain,
                ],
            )
        ]

        technology.patent_count = (
            len(related_patents)
        )

        # -------------------------------------------------
        # Funding opportunities
        # -------------------------------------------------

        related_funding = [
            funding
            for funding in funding_list
            if matches_technology(
                technology_name,
                [
                    funding.title,
                    funding.description,
                    funding.funding_category,
                    funding.research_area,
                    funding.eligibility,
                ],
            )
        ]

        technology.funding_opportunity_count = (
            len(related_funding)
        )

        # -------------------------------------------------
        # Technology domains
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
        # Historical activity
        # -------------------------------------------------

        sync_technology_activity(
            db,
            technology,
            papers,
            patents,
        )

        # -------------------------------------------------
        # Source
        # -------------------------------------------------

        technology.source = (
            "Research Papers, Patents and Funding"
        )

    # =================================================
    # Save everything
    # =================================================

    db.commit()

    # Refresh objects
    for technology in technologies:
        db.refresh(technology)

    return technologies