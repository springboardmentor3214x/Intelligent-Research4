from datetime import date, datetime, timezone
import html
import logging
import re
from typing import Any
from uuid import UUID

from fastapi import HTTPException
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.patent import Patent
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.saved_funding import SavedFunding
from backend.app.models.user import User
from backend.app.services.grok_service import grok_service
from backend.app.services.patent_embedding_service import (
    patent_embedding_service,
)

logger = logging.getLogger(__name__)


def clean_html_text(text: str | None) -> str:
    """Unescape HTML entities like &ndash;, &nbsp;, &amp;, &#8211; into normal characters."""
    if not text:
        return ""
    val = html.unescape(str(text)).strip()
    if "&" in val:
        val = html.unescape(val).strip()
    return val


def build_funding_text(opportunity: FundingOpportunity) -> str:
    """Build rich normalized text representation from funding opportunity fields."""
    parts = []
    if opportunity.title:
        clean_title = re.sub(r"<[^>]+>", " ", clean_html_text(opportunity.title))
        parts.append(f"Title: {clean_title}")
    if opportunity.description:
        clean_desc = re.sub(r"<[^>]+>", " ", clean_html_text(opportunity.description))
        parts.append(f"Description: {clean_desc}")
    if opportunity.agency:
        clean_agency = re.sub(r"<[^>]+>", " ", clean_html_text(opportunity.agency))
        parts.append(f"Agency: {clean_agency}")
    if opportunity.research_area:
        parts.append(f"Research Area: {opportunity.research_area}")
    if opportunity.funding_category:
        parts.append(f"Category: {opportunity.funding_category}")
    if opportunity.funding_type:
        parts.append(f"Type: {opportunity.funding_type}")
    if opportunity.eligibility:
        clean_elig = re.sub(r"<[^>]+>", " ", clean_html_text(opportunity.eligibility))
        parts.append(f"Eligibility: {clean_elig}")
    return ". ".join(parts).strip()


def build_paper_text(paper: ResearchPaper) -> str:
    """Build normalized text representation from research paper."""
    parts = []
    if paper.title:
        parts.append(f"Title: {clean_html_text(paper.title)}")
    if paper.abstract:
        parts.append(f"Abstract: {clean_html_text(paper.abstract)}")
    if paper.research_domain:
        parts.append(f"Domain: {paper.research_domain}")
    if paper.keywords:
        parts.append(f"Keywords: {paper.keywords}")
    return ". ".join(parts).strip()


def build_patent_search_text(patent: Patent) -> str:
    """Build normalized text representation from patent."""
    parts = []
    if patent.title:
        parts.append(f"Patent: {clean_html_text(patent.title)}")
    if patent.abstract:
        parts.append(f"Abstract: {clean_html_text(patent.abstract)}")
    if patent.technology_domain:
        parts.append(f"Domain: {patent.technology_domain}")
    if patent.classification:
        parts.append(f"Classification: {patent.classification}")
    if patent.assignee:
        parts.append(f"Assignee: {patent.assignee}")
    return ". ".join(parts).strip()


def assess_automated_eligibility(
    opportunity: FundingOpportunity,
    user: User | None = None,
    profile: ResearchProfile | None = None,
) -> dict[str, str]:
    """
    Automated preliminary assessment of funding eligibility based on user profile and agency guidelines.
    Clearly identifies this as an automated assessment and not official legal eligibility confirmation.
    """
    eligibility_raw = clean_html_text(opportunity.eligibility)
    eligibility_text = re.sub(r"<[^>]+>", " ", eligibility_raw).lower()

    if not eligibility_text or len(eligibility_text.strip()) < 5:
        return {
            "status": "Insufficient Information",
            "badge": "warning",
            "rationale": "The funding source does not specify explicit applicant restrictions. Review official notice for full requirements.",
        }

    user_role = (user.role or "").lower() if user else "researcher"
    user_org = (user.organization or "").lower() if user else ""

    academic_keywords = [
        "higher education", "university", "academic", "institution of higher education",
        "public institution", "private institution", "nonprofit", "individuals", "institutes", "faculty"
    ]
    startup_keywords = [
        "small business", "for-profit", "commercial", "startup", "sbir", "sttr",
        "business enterprise", "entrepreneur", "msme", "incubate"
    ]

    if any(k in eligibility_text for k in ["unrestricted", "any type of applicant", "individuals", "open to all"]):
        return {
            "status": "Potentially Eligible",
            "badge": "success",
            "rationale": "Open opportunity: Application criteria appear unrestricted across institutional and individual applicants.",
        }

    if user_role == "researcher" or any(w in user_org for w in ["univ", "institute", "lab", "college", "iit", "iisc"]):
        if any(k in eligibility_text for k in academic_keywords):
            return {
                "status": "Potentially Eligible",
                "badge": "success",
                "rationale": f"Matched academic / higher education institution criteria based on your researcher profile ({user.organization if user and user.organization else 'Academic Researcher'}).",
            }

    if user_role == "startup_founder" or "startup" in user_org or "ltd" in user_org or "inc" in user_org:
        if any(k in eligibility_text for k in startup_keywords):
            return {
                "status": "Potentially Eligible",
                "badge": "success",
                "rationale": f"Matched small business / commercial innovation entity criteria for startup founders ({user.organization if user and user.organization else 'Startup'}).",
            }

    if any(k in eligibility_text for k in academic_keywords + startup_keywords):
        return {
            "status": "Potentially Eligible",
            "badge": "success",
            "rationale": "Opportunity accommodates standard research institutions, innovators, and eligible organizational applicants.",
        }

    return {
        "status": "Eligibility Requirements Not Matched",
        "badge": "neutral",
        "rationale": "Specific eligibility criteria may require specialized organizational status (e.g., state agency, registered trust). Please check official announcement.",
    }


def extract_matched_concepts(text_a: str, text_b: str, max_concepts: int = 5) -> list[str]:
    """Extract intersection of meaningful tokens between two documents."""
    clean_a = re.sub(r"<[^>]+>", " ", clean_html_text(text_a))
    clean_b = re.sub(r"<[^>]+>", " ", clean_html_text(text_b))
    stopwords = {
        "the", "and", "for", "with", "from", "that", "this", "title", "abstract",
        "system", "method", "using", "based", "data", "model", "project", "research",
        "grant", "proposal", "development", "funding", "program", "opportunity", "study"
    }
    tokens_a = {w for w in re.findall(r"\b[a-zA-Z]{3,20}\b", clean_a.lower()) if w not in stopwords}
    tokens_b = {w for w in re.findall(r"\b[a-zA-Z]{3,20}\b", clean_b.lower()) if w not in stopwords}
    intersection = sorted(tokens_a.intersection(tokens_b), key=lambda x: (-len(x), x))
    return [w.capitalize() for w in intersection[:max_concepts]]


def generate_opportunity_intelligence(opp: FundingOpportunity) -> dict[str, Any]:
    """
    Generates an easy-to-understand, structured intelligence breakdown for a funding opportunity:
    - Plain-English Overview (What it's actually about in simple language)
    - What the Funding Agency Expects From You (Key Deliverables & Milestones)
    - Grant Evaluation & Award Criteria (How You Win Funding)
    - Target Applicants & Prerequisites
    - Strategic Proposal Playbook (Tips to Succeed)
    - Technology Readiness Level (TRL)
    """
    title = clean_html_text(opp.title or "")
    agency = clean_html_text(opp.agency or "")
    desc = clean_html_text(opp.description or "")
    elig = clean_html_text(opp.eligibility or "")
    category = (opp.funding_category or opp.research_area or "").lower()
    combined_text = f"{title} {desc} {category} {agency}".lower()

    # 1. Plain English Summary Synthesis
    is_health = any(k in combined_text for k in ["health", "clinic", "cancer", "imag", "med", "diseas", "bio", "icmr", "nih", "patient", "diagno", "pharma"])
    is_ai_tech = any(k in combined_text for k in ["ai", "artificial intelligence", "deep learning", "machine learning", "algorithm", "comput", "software", "meity", "sensor", "cyber"])
    is_energy_climate = any(k in combined_text for k in ["energy", "solar", "battery", "climate", "carbon", "environment", "clean", "water", "green", "dst"])
    is_biotech_agri = any(k in combined_text for k in ["biotech", "birac", "dbt", "agri", "crop", "gene", "protein", "plant"])
    is_defense_aero = any(k in combined_text for k in ["drdo", "defense", "aerospace", "radar", "uav", "propulsion", "security"])

    clean_agency_name = agency if agency else "The funding organization"

    if is_health and is_ai_tech:
        plain_summary = (
            f"{clean_agency_name} is offering this grant to support researchers, clinicians, and innovators "
            f"developing artificial intelligence and computational models for clinical healthcare (such as diagnostic imaging, "
            f"early disease detection, or clinical decision support). The core mission is to fund technologies that reduce diagnostic errors, "
            f"speed up triage, and improve patient health outcomes across Indian healthcare centers."
        )
    elif is_health:
        plain_summary = (
            f"{clean_agency_name} is funding targeted healthcare and biomedical research. The primary objective is to develop, "
            f"test, and validate clinical interventions, disease prevention methods, or medical technologies that address critical "
            f"public health priorities and improve healthcare delivery."
        )
    elif is_biotech_agri:
        plain_summary = (
            f"{clean_agency_name} provides non-dilutive financial grants to advance biotechnology, life sciences, and agri-tech innovations. "
            f"The funding is intended to bridge the gap between laboratory discovery and scalable commercial or clinical translation."
        )
    elif is_energy_climate:
        plain_summary = (
            f"{clean_agency_name} is offering funding to accelerate the development and pilot validation of clean energy, sustainable technologies, "
            f"and climate resilience solutions with measurable resource efficiency."
        )
    elif is_defense_aero:
        plain_summary = (
            f"{clean_agency_name} is soliciting high-reliability R&D proposals to develop strategic indigenous technologies, defense systems, "
            f"and advanced aerospace engineering capabilities."
        )
    elif is_ai_tech:
        plain_summary = (
            f"{clean_agency_name} is funding cutting-edge computing, digital technologies, and AI architectures. The focus is on building "
            f"novel algorithms, scalable software/hardware systems, and practical tools that demonstrate superior technical performance."
        )
    else:
        plain_summary = (
            f"{clean_agency_name} has announced this research grant to support high-impact scientific investigation, technological innovation, "
            f"and interdisciplinary problem-solving in {opp.research_area or 'the relevant domain'}."
        )

    # 2. Key Deliverables & Expectations (What They Expect From You)
    deliverables = []
    if is_health:
        deliverables.append({
            "title": "Clinical & Algorithmic Validation",
            "detail": "Rigorous benchmarking on diverse clinical/imaging datasets with documented sensitivity, specificity, and diagnostic accuracy metrics."
        })
        deliverables.append({
            "title": "Ethical & Regulatory Compliance",
            "detail": "IRB/Institutional Ethics Committee clearances, compliant patient data handling, and preparation for clinical decision support guidelines."
        })
    elif is_ai_tech:
        deliverables.append({
            "title": "Benchmarked Software / Model Architecture",
            "detail": "Reproducible code, trained model weights, evaluation benchmarks against standard baselines, and scalable API/interface."
        })
    elif is_energy_climate:
        deliverables.append({
            "title": "Pilot-Scale Demonstration",
            "detail": "Operational testing under realistic environmental conditions with verified efficiency, lifecycle, and cost metrics."
        })
    else:
        deliverables.append({
            "title": "Proof-of-Concept / Prototype",
            "detail": "Demonstration of functional technology or validated experimental model meeting initial target specifications."
        })

    deliverables.append({
        "title": "Milestone-Based Progress Reports",
        "detail": "Periodic submission of technical progress milestones, financial utilization statements, and KPI deliverables."
    })
    deliverables.append({
        "title": "Publications & Intellectual Property",
        "detail": "Dissemination through high-impact peer-reviewed journals, conferences, and patent/IP protection where applicable."
    })
    deliverables.append({
        "title": "Translation & Adoption Roadmap",
        "detail": "A viable plan for real-world deployment, technology transfer, or commercialization beyond the grant duration."
    })

    # 3. Grant Evaluation Criteria (How They Judge Your Proposal)
    evaluation_criteria = [
        {
            "criterion": "Scientific Novelty & Innovation",
            "weight": "30%",
            "description": "How distinct, modern, and groundbreaking is your approach compared to existing methods and prior art?"
        },
        {
            "criterion": "Technical Feasibility & Work Plan",
            "weight": "25%",
            "description": "Is your methodology rigorous, milestone-driven, and practically achievable within the proposed timeline and budget?"
        },
        {
            "criterion": "Team Track Record & Infrastructure",
            "weight": "20%",
            "description": "Demonstrated expertise of the PI and collaborating team, along with access to requisite lab facilities and compute resources."
        },
        {
            "criterion": "Societal & Translational Impact",
            "weight": "15%",
            "description": "The tangible public health, economic, environmental, or industrial benefits resulting from successful execution."
        },
        {
            "criterion": "Budget Realism & Cost-Effectiveness",
            "weight": "10%",
            "description": "Clear justification of fund allocation across personnel, equipment, consumables, and travel."
        }
    ]

    # 4. Strategic Proposal Playbook (Tips to Win)
    playbook_tips = []
    if is_health:
        playbook_tips.append("Partner with a practicing clinical Co-PI / medical college to ensure real patient workflow integration.")
        playbook_tips.append("Explicitly state cohort demographics, dataset sample sizes, and data harmonization protocols.")
    elif is_ai_tech:
        playbook_tips.append("Highlight explainability (XAI), latency benchmarks, and edge/cloud deployment feasibility.")
        playbook_tips.append("Specify how you will handle noisy real-world data and prevent algorithmic overfitting.")
    else:
        playbook_tips.append("Define 3-5 quantifiable Key Performance Indicators (KPIs) with exact baseline vs. target milestones.")
        playbook_tips.append("Include a risk mitigation matrix addressing potential technical bottlenecks.")

    playbook_tips.append("Provide a clear 12-to-36 month Gantt chart breaking down quarterly milestones.")
    playbook_tips.append("Align directly with the agency's stated national priorities and strategic roadmap.")

    # 5. Technology Readiness Level (TRL)
    if "extramural" in (opp.funding_type or "").lower() or "basic" in (opp.funding_category or "").lower():
        trl_stage = "TRL 2 - 4 (Formulation to Laboratory Proof-of-Concept)"
    elif any(k in combined_text for k in ["sbir", "sttr", "startup", "commercial", "translation"]):
        trl_stage = "TRL 4 - 7 (Lab Validation to Prototype Pilot in Operating Environment)"
    else:
        trl_stage = "TRL 3 - 6 (Proof of Concept to Relevant Environment Demonstration)"

    return {
        "plain_summary": plain_summary,
        "deliverables": deliverables,
        "evaluation_criteria": evaluation_criteria,
        "playbook_tips": playbook_tips,
        "trl_stage": trl_stage,
        "target_audience": elig if elig and len(elig) > 20 else "Universities, research institutes, clinical centers, and qualified innovators.",
    }


class FundingMatchingService:
    """
    AI/ML Semantic Matching service pairing Researcher Profiles and Startup Ideas with Funding Opportunities.
    """

    def normalize_min_score(self, min_score: float) -> float:
        """Converts percentage (0-100) or decimal (0.0-1.0) into normalized 0.0-1.0 float."""
        if min_score is None or min_score < 0:
            return 0.0
        if min_score > 1.0:
            return min(1.0, min_score / 100.0)
        return min_score

    def get_recommendations_for_user(
        self,
        db: Session,
        current_user: User,
        limit: int = 20,
        min_score: float = 0.0,
        topic: str = "",
        research_area: str = "",
        funding_type: str = "",
        agency: str = "",
        focus_terms: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Produce ranked personalized funding opportunities matching user's researcher profile.
        Returns structured dictionary with total, recommendations list, profile_used metadata, and status message.
        """
        norm_min_score = self.normalize_min_score(min_score)

        profile = db.query(ResearchProfile).filter(ResearchProfile.user_id == current_user.id).first()

        # Build profile summary
        profile_parts = []
        profile_metadata: dict[str, Any] = {
            "has_profile": profile is not None,
            "user_name": current_user.name,
            "research_domain": None,
            "research_areas": [],
            "keywords": [],
            "technology_areas": [],
            "organization": current_user.organization,
        }

        if profile:
            if profile.research_domain:
                profile_parts.append(profile.research_domain)
                profile_metadata["research_domain"] = profile.research_domain
            if profile.research_interests:
                profile_parts.append(profile.research_interests)
            for area in (profile.research_areas or []):
                profile_parts.append(area.name)
                profile_metadata["research_areas"].append(area.name)
            for kw in (profile.keywords or []):
                profile_parts.append(kw.name)
                profile_metadata["keywords"].append(kw.name)
            for tech in (profile.technology_areas or []):
                profile_parts.append(tech.name)
                profile_metadata["technology_areas"].append(tech.name)

        if current_user.research_domain:
            profile_parts.append(current_user.research_domain)
            if not profile_metadata["research_domain"]:
                profile_metadata["research_domain"] = current_user.research_domain

        if topic and topic.strip():
            profile_parts.append(topic.strip())
        if focus_terms:
            profile_parts.extend([t.strip() for t in focus_terms if t.strip()])

        profile_text = ". ".join(profile_parts).strip()
        if not profile_text:
            profile_text = "Scientific Research, Technology Innovation, Applied Healthcare, Artificial Intelligence, Sustainable Energy"

        # Query candidates from DB with basic structural filters
        query = db.query(FundingOpportunity)
        if research_area and research_area.strip():
            clean_ra = research_area.strip()
            query = query.filter(
                FundingOpportunity.research_area.ilike(f"%{clean_ra}%")
                | FundingOpportunity.funding_category.ilike(f"%{clean_ra}%")
            )
        if funding_type and funding_type.strip():
            query = query.filter(FundingOpportunity.funding_type.ilike(f"%{funding_type.strip()}%"))
        if agency and agency.strip():
            query = query.filter(FundingOpportunity.agency.ilike(f"%{agency.strip()}%"))

        opportunities = query.all()
        if not opportunities:
            return {
                "total": 0,
                "recommendations": [],
                "profile_used": profile_metadata,
                "message": "No funding opportunities found matching the specified filters.",
            }

        # Generate semantic embeddings
        profile_vec = patent_embedding_service.generate_text_embeddings([profile_text])[0]
        opp_texts = [build_funding_text(opp) for opp in opportunities]
        opp_embeddings = patent_embedding_service.generate_text_embeddings(opp_texts)

        # Cosine similarities
        similarities = np.dot(opp_embeddings, profile_vec)
        ranked_indices = np.argsort(similarities)[::-1]

        # Get saved opportunity IDs for user
        saved_opp_ids = set(
            db.scalars(
                select(SavedFunding.funding_opportunity_id).where(SavedFunding.user_id == current_user.id)
            ).all()
        )

        results = []
        today = date.today()

        for idx in ranked_indices:
            opp = opportunities[idx]
            raw_score = float(similarities[idx])
            score = max(0.0, min(1.0, raw_score))

            if score < norm_min_score:
                continue

            matched_terms = extract_matched_concepts(profile_text, opp_texts[idx], max_concepts=5)
            eligibility_info = assess_automated_eligibility(opp, current_user, profile)

            # Deadline calculations
            deadline_str = opp.close_date.isoformat() if opp.close_date else None
            days_remaining = (opp.close_date - today).days if opp.close_date else None

            if days_remaining is not None:
                if days_remaining < 0:
                    deadline_status = "Expired"
                elif days_remaining <= 14:
                    deadline_status = f"Closing Soon ({days_remaining}d)"
                else:
                    deadline_status = f"Active ({days_remaining}d left)"
            else:
                deadline_status = "Rolling / Open"

            # Match Level badge
            match_pct = round(score * 100.0, 1)
            if match_pct >= 75.0:
                match_level = "Excellent Match"
            elif match_pct >= 55.0:
                match_level = "Strong Match"
            elif match_pct >= 35.0:
                match_level = "Good Match"
            elif match_pct >= 20.0:
                match_level = "Moderate Match"
            else:
                match_level = "Broad Match"

            results.append({
                "id": str(opp.id),
                "opportunity_number": opp.opportunity_number,
                "title": clean_html_text(opp.title),
                "agency": clean_html_text(opp.agency),
                "description": clean_html_text(opp.description),
                "funding_amount": opp.funding_amount,
                "funding_type": opp.funding_type,
                "research_area": opp.research_area or opp.funding_category,
                "funding_category": opp.funding_category,
                "open_date": opp.open_date.isoformat() if opp.open_date else None,
                "close_date": deadline_str,
                "days_remaining": days_remaining,
                "deadline_status": deadline_status,
                "eligibility": clean_html_text(opp.eligibility),
                "eligibility_assessment": eligibility_info,
                "official_link": opp.official_link,
                "source": opp.source,
                "country": opp.country or "India",
                "relevance_score": round(score, 4),
                "relevance_percentage": match_pct,
                "match_level": match_level,
                "matched_concepts": matched_terms,
                "is_saved": opp.id in saved_opp_ids,
                "structured_intelligence": generate_opportunity_intelligence(opp),
            })

            if len(results) >= limit:
                break

        return {
            "total": len(results),
            "recommendations": results,
            "profile_used": profile_metadata,
            "message": f"Successfully matched {len(results)} opportunities using AI semantic ranking.",
        }

    def search_funding_opportunities(
        self,
        db: Session,
        query: str,
        limit: int = 20,
        min_score: float = 0.0,
        funding_type: str | None = None,
        research_area: str | None = None,
        agency: str | None = None,
        current_user: User | None = None,
    ) -> dict[str, Any]:
        """Perform semantic search across funding opportunities."""
        norm_min_score = self.normalize_min_score(min_score)
        db_query = db.query(FundingOpportunity)

        if funding_type and funding_type.strip():
            db_query = db_query.filter(FundingOpportunity.funding_type.ilike(f"%{funding_type.strip()}%"))
        if research_area and research_area.strip():
            db_query = db_query.filter(
                FundingOpportunity.research_area.ilike(f"%{research_area.strip()}%")
                | FundingOpportunity.funding_category.ilike(f"%{research_area.strip()}%")
            )
        if agency and agency.strip():
            db_query = db_query.filter(FundingOpportunity.agency.ilike(f"%{agency.strip()}%"))

        opportunities = db_query.all()
        if not opportunities:
            return {"total": 0, "opportunities": []}

        search_text = query.strip() if query else "Scientific Innovation Research Grants"
        query_vec = patent_embedding_service.generate_text_embeddings([search_text])[0]
        opp_texts = [build_funding_text(opp) for opp in opportunities]
        opp_embeddings = patent_embedding_service.generate_text_embeddings(opp_texts)

        similarities = np.dot(opp_embeddings, query_vec)
        ranked_indices = np.argsort(similarities)[::-1]

        results = []
        today = date.today()

        for idx in ranked_indices:
            opp = opportunities[idx]
            raw_score = float(similarities[idx])
            score = max(0.0, min(1.0, raw_score))

            if score < norm_min_score:
                continue

            matched_terms = extract_matched_concepts(search_text, opp_texts[idx], max_concepts=5)
            eligibility_info = assess_automated_eligibility(opp, current_user)

            deadline_str = opp.close_date.isoformat() if opp.close_date else None
            days_remaining = (opp.close_date - today).days if opp.close_date else None
            if days_remaining is not None:
                if days_remaining < 0:
                    deadline_status = "Expired"
                elif days_remaining <= 14:
                    deadline_status = f"Closing Soon ({days_remaining}d)"
                else:
                    deadline_status = f"Active ({days_remaining}d left)"
            else:
                deadline_status = "Rolling / Open"

            results.append({
                "id": str(opp.id),
                "title": clean_html_text(opp.title),
                "agency": clean_html_text(opp.agency),
                "description": clean_html_text(opp.description),
                "funding_amount": opp.funding_amount,
                "funding_type": opp.funding_type,
                "research_area": opp.research_area or opp.funding_category,
                "close_date": deadline_str,
                "deadline_status": deadline_status,
                "eligibility": clean_html_text(opp.eligibility),
                "eligibility_assessment": eligibility_info,
                "official_link": opp.official_link,
                "source": opp.source,
                "country": opp.country or "India",
                "relevance_score": round(score, 4),
                "relevance_percentage": round(score * 100.0, 1),
                "matched_concepts": matched_terms,
                "structured_intelligence": generate_opportunity_intelligence(opp),
            })

            if len(results) >= limit:
                break

        return {"total": len(results), "opportunities": results}

    def analyze_startup_idea(
        self,
        db: Session,
        idea_text: str,
        current_user: User | None = None,
        funding_type_filter: str | None = None,
    ) -> dict[str, Any]:
        """
        Comprehensive Startup / Research Idea Funding Intelligence Analyzer:
        1. Extract domain, technologies, research areas, keywords, applications.
        2. Semantic search against Research Papers in DB -> Research Overlap.
        3. Semantic search against Patents in DB -> Patent Overlap.
        4. Semantic search against Funding Opportunities in DB -> Top Matching Grants.
        5. Calculate reproducible Funding Suitability Score (0-100%).
        6. Identify potential risks & actionable next steps.
        """
        if not idea_text or len(idea_text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Idea description must be at least 10 characters long.")

        # Step 1: AI / Heuristic Concept Extraction
        metadata = grok_service.extract_idea_metadata(idea_text)
        ai_provider = grok_service.get_provider_name()

        # Step 2: Generate Dense Embedding for Idea
        idea_vec = patent_embedding_service.generate_text_embeddings([idea_text])[0]

        # Step 3: Research Landscape Overlap
        papers = db.query(ResearchPaper).all()
        research_matches = []
        research_overlap_score = 0.0

        if papers:
            paper_texts = [build_paper_text(p) for p in papers]
            paper_embeddings = patent_embedding_service.generate_text_embeddings(paper_texts)
            paper_sims = np.dot(paper_embeddings, idea_vec)
            top_paper_indices = np.argsort(paper_sims)[::-1]

            if len(top_paper_indices) > 0:
                research_overlap_score = float(max(0.0, min(1.0, paper_sims[top_paper_indices[0]])))

            for idx in top_paper_indices[:5]:
                p = papers[idx]
                sim = float(max(0.0, min(1.0, paper_sims[idx])))
                if sim < 0.15:
                    continue
                shared = extract_matched_concepts(idea_text, paper_texts[idx], max_concepts=4)
                research_matches.append({
                    "id": str(p.id),
                    "title": clean_html_text(p.title),
                    "authors": p.authors,
                    "publication_date": p.publication_date.isoformat() if p.publication_date else None,
                    "journal_or_conference": p.journal_or_conference,
                    "similarity_score": round(sim, 4),
                    "similarity_percentage": round(sim * 100.0, 1),
                    "domain": p.research_domain,
                    "shared_concepts": shared,
                    "doi": p.doi,
                })

        if research_overlap_score >= 0.70:
            research_overlap_level = "High Overlap"
        elif research_overlap_score >= 0.45:
            research_overlap_level = "Medium Overlap"
        else:
            research_overlap_level = "Low Overlap"

        # Step 4: Patent Landscape Overlap
        patents = db.query(Patent).all()
        patent_matches = []
        patent_overlap_score = 0.0

        if patents:
            patent_texts = [build_patent_search_text(p) for p in patents]
            patent_embeddings = patent_embedding_service.generate_text_embeddings(patent_texts)
            patent_sims = np.dot(patent_embeddings, idea_vec)
            top_patent_indices = np.argsort(patent_sims)[::-1]

            if len(top_patent_indices) > 0:
                patent_overlap_score = float(max(0.0, min(1.0, patent_sims[top_patent_indices[0]])))

            for idx in top_patent_indices[:5]:
                pt = patents[idx]
                sim = float(max(0.0, min(1.0, patent_sims[idx])))
                if sim < 0.15:
                    continue
                shared = extract_matched_concepts(idea_text, patent_texts[idx], max_concepts=4)
                patent_matches.append({
                    "id": str(pt.id),
                    "title": clean_html_text(pt.title),
                    "patent_number": pt.publication_number,
                    "assignee": pt.assignee,
                    "publication_date": pt.publication_date.isoformat() if pt.publication_date else None,
                    "similarity_score": round(sim, 4),
                    "similarity_percentage": round(sim * 100.0, 1),
                    "classification": pt.classification,
                    "shared_concepts": shared,
                })

        if patent_overlap_score >= 0.70:
            patent_overlap_level = "High Overlap"
        elif patent_overlap_score >= 0.45:
            patent_overlap_level = "Medium Overlap"
        else:
            patent_overlap_level = "Low Overlap"

        # Step 5: Funding Opportunity Matching
        funding_query = db.query(FundingOpportunity)
        if funding_type_filter and funding_type_filter.strip():
            funding_query = funding_query.filter(FundingOpportunity.funding_type.ilike(f"%{funding_type_filter.strip()}%"))

        opportunities = funding_query.all()
        matching_funding = []
        today = date.today()

        if opportunities:
            opp_texts = [build_funding_text(opp) for opp in opportunities]
            opp_embeddings = patent_embedding_service.generate_text_embeddings(opp_texts)
            opp_sims = np.dot(opp_embeddings, idea_vec)
            top_opp_indices = np.argsort(opp_sims)[::-1]

            for idx in top_opp_indices[:8]:
                opp = opportunities[idx]
                sim = float(max(0.0, min(1.0, opp_sims[idx])))
                matched_terms = extract_matched_concepts(idea_text, opp_texts[idx], max_concepts=5)
                eligibility_info = assess_automated_eligibility(opp, current_user)

                deadline_str = opp.close_date.isoformat() if opp.close_date else None
                days_remaining = (opp.close_date - today).days if opp.close_date else None
                if days_remaining is not None:
                    if days_remaining < 0:
                        deadline_status = "Expired"
                    elif days_remaining <= 14:
                        deadline_status = f"Closing Soon ({days_remaining}d)"
                    else:
                        deadline_status = f"Active ({days_remaining}d left)"
                else:
                    deadline_status = "Rolling / Open"

                match_pct = round(sim * 100.0, 1)
                matching_funding.append({
                    "id": str(opp.id),
                    "title": clean_html_text(opp.title),
                    "agency": clean_html_text(opp.agency),
                    "description": clean_html_text(opp.description),
                    "funding_amount": opp.funding_amount,
                    "funding_type": opp.funding_type,
                    "research_area": opp.research_area or opp.funding_category,
                    "close_date": deadline_str,
                    "days_remaining": days_remaining,
                    "deadline_status": deadline_status,
                    "eligibility": clean_html_text(opp.eligibility),
                    "eligibility_assessment": eligibility_info,
                    "official_link": opp.official_link,
                    "source": opp.source,
                    "country": opp.country or "India",
                    "relevance_score": round(sim, 4),
                    "relevance_percentage": match_pct,
                    "matched_concepts": matched_terms,
                    "structured_intelligence": generate_opportunity_intelligence(opp),
                })

        # Step 6: Transparent & Reproducible Funding Suitability Score Formula
        top_3_scores = [f["relevance_score"] for f in matching_funding[:3]]
        semantic_factor = (sum(top_3_scores) / len(top_3_scores)) if top_3_scores else 0.4
        semantic_score = round(semantic_factor * 100.0, 1)

        # Keyword alignment
        total_kws = len(metadata["keywords"]) or 1
        kw_matched_count = sum(1 for kw in metadata["keywords"] if any(kw.lower() in (f["title"] + " " + (f["description"] or "")).lower() for f in matching_funding[:5]))
        keyword_score = round(min(100.0, (kw_matched_count / total_kws) * 100.0 + 20.0), 1)

        # Eligibility alignment
        eligible_count = sum(1 for f in matching_funding[:5] if f["eligibility_assessment"]["status"] == "Potentially Eligible")
        eligibility_score = round((eligible_count / max(1, len(matching_funding[:5]))) * 100.0, 1)

        # Tech clarity score
        tech_score = round(min(100.0, len(metadata["technologies"]) * 20.0 + (10.0 if len(metadata["application_areas"]) > 0 else 0.0)), 1)

        # Deadline active score
        active_count = sum(1 for f in matching_funding[:5] if f["deadline_status"] != "Expired")
        deadline_score = round((active_count / max(1, len(matching_funding[:5]))) * 100.0, 1)

        final_suitability = round(
            (semantic_score * 0.35)
            + (keyword_score * 0.20)
            + (eligibility_score * 0.20)
            + (tech_score * 0.15)
            + (deadline_score * 0.10),
            1
        )
        final_suitability = max(10.0, min(95.0, final_suitability))

        if final_suitability >= 75.0:
            readiness_level = "High Funding Readiness"
        elif final_suitability >= 55.0:
            readiness_level = "Moderate Funding Readiness"
        else:
            readiness_level = "Early Stage / Exploratory Readiness"

        factors = [
            {
                "name": "Semantic Grant Alignment",
                "score": semantic_score,
                "max_score": 100.0,
                "weight": 0.35,
                "details": f"Evaluates mathematical vector similarity against top active grant calls ({semantic_score}%).",
            },
            {
                "name": "Research Area & Keyword Overlap",
                "score": keyword_score,
                "max_score": 100.0,
                "weight": 0.20,
                "details": f"Checks alignment of target technologies and concepts across priority thematic areas ({keyword_score}%).",
            },
            {
                "name": "Applicant Eligibility Compatibility",
                "score": eligibility_score,
                "max_score": 100.0,
                "weight": 0.20,
                "details": f"Estimates institutional or startup applicant eligibility against funding notice guidelines ({eligibility_score}%).",
            },
            {
                "name": "Technology & Application Maturity",
                "score": tech_score,
                "max_score": 100.0,
                "weight": 0.15,
                "details": f"Assesses specificity of underlying methods, algorithms, and defined use cases ({tech_score}%).",
            },
            {
                "name": "Active Call Availability & Timing",
                "score": deadline_score,
                "max_score": 100.0,
                "weight": 0.10,
                "details": f"Considers availability of open and rolling submission windows ({deadline_score}%).",
            },
        ]

        # Step 7: Risk assessment and next steps
        synthesis = grok_service.generate_synthesis_and_risks(
            idea_text=idea_text,
            research_overlap_score=research_overlap_score,
            patent_overlap_score=patent_overlap_score,
            top_funding_count=len(matching_funding),
        )

        return {
            "idea_summary": metadata["idea_summary"],
            "domain": metadata["domain"],
            "research_areas": metadata["research_areas"],
            "technologies": metadata["technologies"],
            "keywords": metadata["keywords"],
            "application_areas": metadata["application_areas"],
            "potential_funding_categories": metadata["potential_funding_categories"],
            "funding_suitability": {
                "suitability_score": final_suitability,
                "readiness_level": readiness_level,
                "factors": factors,
                "disclaimer": "This is an AI-based suitability estimate based on available funding requirements, research alignment, eligibility information, innovation signals, and available profile information. It is not a prediction or guarantee of funding approval.",
            },
            "matching_funding": matching_funding,
            "research_landscape": {
                "overlap_level": research_overlap_level,
                "top_similarity": round(research_overlap_score * 100.0, 1),
                "total_matches": len(research_matches),
                "top_matches": research_matches,
                "note": (
                    "Potentially similar prior academic work was identified."
                    if research_overlap_score >= 0.50
                    else "No strong matching academic publications were found in the current dataset."
                ),
            },
            "patent_landscape": {
                "overlap_level": patent_overlap_level,
                "top_similarity": round(patent_overlap_score * 100.0, 1),
                "total_matches": len(patent_matches),
                "top_matches": patent_matches,
                "note": (
                    "Potentially similar prior patent art was identified."
                    if patent_overlap_score >= 0.50
                    else "No strong matching patent records were found in the current dataset."
                ),
            },
            "potential_risks": synthesis["potential_risks"],
            "improvement_suggestions": synthesis["improvement_suggestions"],
            "recommended_next_steps": synthesis["recommended_next_steps"],
            "ai_provider": ai_provider,
        }

    def match_single_opportunity(
        self,
        db: Session,
        opportunity_id: UUID,
        current_user: User,
    ) -> dict[str, Any]:
        """Deep match breakdown for a single funding opportunity."""
        opp = db.get(FundingOpportunity, opportunity_id)
        if not opp:
            raise HTTPException(status_code=404, detail="Funding opportunity not found")

        recs_data = self.get_recommendations_for_user(
            db=db,
            current_user=current_user,
            limit=500,
            min_score=0.0,
        )
        recs = recs_data.get("recommendations", [])
        match_item = next((r for r in recs if r["id"] == str(opp.id)), None)
        if not match_item:
            profile = db.query(ResearchProfile).filter(ResearchProfile.user_id == current_user.id).first()
            eligibility_info = assess_automated_eligibility(opp, current_user, profile)
            return {
                "id": str(opp.id),
                "title": clean_html_text(opp.title),
                "agency": clean_html_text(opp.agency),
                "relevance_score": 0.5,
                "relevance_percentage": 50.0,
                "matched_concepts": [],
                "eligibility_assessment": eligibility_info,
                "official_link": opp.official_link,
            }
        return match_item

    def save_funding(
        self,
        db: Session,
        opportunity_id: UUID,
        current_user: User,
    ) -> dict[str, Any]:
        """Save a funding opportunity for the user."""
        opp = db.get(FundingOpportunity, opportunity_id)
        if not opp:
            raise HTTPException(status_code=404, detail="Funding opportunity not found")

        existing = db.query(SavedFunding).filter(
            SavedFunding.user_id == current_user.id,
            SavedFunding.funding_opportunity_id == opportunity_id,
        ).first()
        if existing:
            return {"message": "Opportunity already saved", "saved_id": str(existing.id)}

        saved = SavedFunding(
            user_id=current_user.id,
            funding_opportunity_id=opportunity_id,
        )
        db.add(saved)
        db.commit()
        db.refresh(saved)
        return {"message": "Opportunity saved successfully", "saved_id": str(saved.id)}

    def get_saved_funding(
        self,
        db: Session,
        current_user: User,
    ) -> list[dict[str, Any]]:
        """List all saved funding opportunities for the user."""
        saved_records = (
            db.query(SavedFunding)
            .filter(SavedFunding.user_id == current_user.id)
            .order_by(SavedFunding.created_at.desc())
            .all()
        )
        results = []
        for s in saved_records:
            opp = s.funding_opportunity
            if opp:
                results.append({
                    "saved_id": str(s.id),
                    "saved_at": s.created_at.isoformat(),
                    "funding_opportunity_id": str(opp.id),
                    "funding_opportunity": {
                        "id": str(opp.id),
                        "title": clean_html_text(opp.title),
                        "agency": clean_html_text(opp.agency),
                        "description": clean_html_text(opp.description),
                        "funding_amount": opp.funding_amount,
                        "country": opp.country or "India",
                        "close_date": opp.close_date.isoformat() if opp.close_date else None,
                        "research_area": opp.research_area or opp.funding_category,
                        "funding_type": opp.funding_type,
                        "source": opp.source,
                        "official_link": opp.official_link,
                    }
                })
        return results

    def remove_saved_funding(
        self,
        db: Session,
        opportunity_id: UUID,
        current_user: User,
    ) -> dict[str, str]:
        """Remove a saved funding opportunity by opportunity ID."""
        saved = db.query(SavedFunding).filter(
            SavedFunding.user_id == current_user.id,
            SavedFunding.funding_opportunity_id == opportunity_id,
        ).first()
        if not saved:
            raise HTTPException(status_code=404, detail="Saved funding opportunity not found")
        db.delete(saved)
        db.commit()
        return {"message": "Opportunity removed from saved list"}


funding_matching_service = FundingMatchingService()
