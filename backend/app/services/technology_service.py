from collections import defaultdict
from typing import List, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.technology import Technology
from backend.app.models.technology_activity import TechnologyActivity
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.patent import Patent
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.services.technology_analysis_service import (
    get_query_concept_terms,
    matches_concept,
    analyze_technology_intelligence,
)


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
    Check whether a record is related to a technology using concept expansion.
    """
    concept_terms = get_query_concept_terms(technology_name)
    searchable_text = " ".join(filter(None, text_values))
    return matches_concept(searchable_text, concept_terms)


def sync_technology_activity(
    db: Session,
    technology: Technology,
    papers: list[ResearchPaper],
    patents: list[Patent],
) -> None:
    """
    Build year-wise TechnologyActivity records from real research paper and patent data.
    """
    yearly_activity = defaultdict(
        lambda: {
            "research_papers": [],
            "patents": [],
        }
    )

    concept_terms = get_query_concept_terms(technology.technology_name)

    # Group research papers by publication year
    for paper in papers:
        if not paper.publication_year:
            continue
        text_corpus = " ".join(filter(None, [
            paper.title, paper.abstract, paper.authors, paper.keywords, paper.research_domain
        ]))
        if matches_concept(text_corpus, concept_terms):
            yearly_activity[int(paper.publication_year)]["research_papers"].append(paper)

    # Group patents by filing year
    for patent in patents:
        y = patent.filing_date.year if patent.filing_date else (patent.publication_date.year if patent.publication_date else None)
        if not y:
            continue
        text_corpus = " ".join(filter(None, [
            patent.title, patent.abstract, patent.assignee, patent.inventors,
            patent.classification, patent.technology_domain
        ]))
        if matches_concept(text_corpus, concept_terms):
            yearly_activity[y]["patents"].append(patent)

    # Upsert yearly records
    for year, activity in yearly_activity.items():
        related_papers = activity["research_papers"]
        related_patents = activity["patents"]

        research_citations = sum(p.citation_count or 0 for p in related_papers)
        patent_citations = sum(pt.citation_count or 0 for pt in related_patents)

        organizations = {
            pt.assignee.strip()
            for pt in related_patents
            if pt.assignee and pt.assignee.strip()
        }

        applications = set()
        for p in related_papers:
            if p.research_domain:
                applications.add(p.research_domain.strip().lower())
        for pt in related_patents:
            if pt.technology_domain:
                applications.add(pt.technology_domain.strip().lower())
            if pt.classification:
                for cl in pt.classification.split(","):
                    if cl.strip():
                        applications.add(cl.strip().lower())

        activity_record = (
            db.query(TechnologyActivity)
            .filter(
                TechnologyActivity.technology_id == technology.id,
                TechnologyActivity.year == year,
            )
            .first()
        )

        if not activity_record:
            activity_record = TechnologyActivity(
                technology_id=technology.id,
                year=year,
            )
            db.add(activity_record)

        activity_record.research_paper_count = len(related_papers)
        activity_record.patent_count = len(related_patents)
        activity_record.citation_count = research_citations + patent_citations
        activity_record.organization_count = len(organizations)
        activity_record.application_diversity = float(len(applications))


def sync_technologies(db: Session) -> List[Technology]:
    """
    Synchronize Technology Intelligence data from Research Papers, Patents, and Funding.
    Derives real multi-year statistics and updates technology models.
    """
    technology_candidates = {
        "Artificial Intelligence",
        "Machine Learning",
        "Deep Learning",
        "Medical Imaging AI",
        "Edge AI",
        "Quantum Computing",
        "Generative AI",
        "Computer Vision",
        "Natural Language Processing",
        "Robotics",
        "Cybersecurity",
        "Biotechnology",
        "Clean Energy",
    }

    # Ensure all candidate technologies exist
    for tech_name in technology_candidates:
        get_or_create_technology(db, tech_name)

    db.commit()

    papers = db.query(ResearchPaper).all()
    patents = db.query(Patent).all()
    funding_list = db.query(FundingOpportunity).all()
    technologies = db.query(Technology).all()

    for technology in technologies:
        concept_terms = get_query_concept_terms(technology.technology_name)

        # Related research papers
        related_papers = [
            p for p in papers
            if matches_concept(" ".join(filter(None, [p.title, p.abstract, p.authors, p.keywords, p.research_domain])), concept_terms)
        ]
        technology.research_paper_count = len(related_papers)
        technology.citation_count = sum(p.citation_count or 0 for p in related_papers)

        # Related patents
        related_patents = [
            pt for pt in patents
            if matches_concept(" ".join(filter(None, [pt.title, pt.abstract, pt.assignee, pt.inventors, pt.classification, pt.technology_domain])), concept_terms)
        ]
        technology.patent_count = len(related_patents)

        # Related funding
        related_funding = [
            f for f in funding_list
            if matches_concept(" ".join(filter(None, [f.title, f.description, f.funding_category, f.research_area, f.eligibility])), concept_terms)
        ]
        technology.funding_opportunity_count = len(related_funding)

        # Domains
        domains = set()
        for p in related_papers:
            if p.research_domain:
                domains.add(p.research_domain)
        for pt in related_patents:
            if pt.technology_domain:
                domains.add(pt.technology_domain)
        if domains:
            domain_str = ", ".join(sorted(domains))
            technology.technology_domain = domain_str[:250]

        # Sync activity
        sync_technology_activity(db, technology, papers, patents)

        # Compute full data-driven analysis to update emerging score and status
        analysis = analyze_technology_intelligence(db, technology.technology_name)
        technology.emerging_score = analysis.weighted_score.total
        technology.emerging_status = analysis.stage.classification
        technology.research_growth_rate = analysis.indicators["research_growth"].normalized_score
        technology.patent_growth_rate = analysis.indicators["patent_growth"].normalized_score
        technology.source = "Research Papers, Patents and Funding"

    db.commit()

    for technology in technologies:
        db.refresh(technology)

    return technologies