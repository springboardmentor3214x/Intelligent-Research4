import math
import re
from typing import Dict, List, Optional, Tuple, Set, Any
from uuid import UUID
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from backend.app.models.technology import Technology
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.patent import Patent
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.schemas.technology import (
    TechnologyMaturityResponse,
    MaturityEvidence,
    TechnologyReadinessResponse,
    ReadinessFactors,
    TechnologyAdoptionResponse,
    AdoptionYearMetric,
    TechnologyTrendResponse,
    TrendEvidence,
    TechnologyFullAnalysisResponse,
    TechnologyQueryAnalysisResponse,
    EvidenceBreakdown,
    EvidenceCoverage,
    EvidenceSourcesContainer,
    EvidencePaperItem,
    EvidencePatentItem,
    EvidenceFundingItem,
    OrganizationBreakdownItem,
)


STOP_WORDS = {
    "for", "in", "of", "and", "the", "based", "powered", "with", "to", "a", "an",
    "on", "using", "via", "from", "system", "systems", "method", "methods", "apparatus",
    "device", "devices", "application", "applications", "approach", "novel", "toward",
    "towards", "study", "studies", "review", "survey", "future", "challenges"
}

# Curated ontology of technology domain concept expansions
CONCEPT_EXPANSIONS: Dict[str, List[str]] = {
    "medical imaging": [
        "medical image", "medical imaging", "mri", "tumor segmentation", "radiology",
        "ct scan", "computed tomography", "ultrasound", "biomedical imaging",
        "clinical imaging", "histopathology", "medical image segmentation", "medical image analysis"
    ],
    "medical imaging ai": [
        "medical image", "medical imaging", "mri", "tumor segmentation", "radiology",
        "ct scan", "ultrasound", "biomedical imaging", "clinical imaging", "medical image segmentation",
        "deep learning in medicine", "medical diagnostics", "radiology ai", "brain tumor analysis"
    ],
    "brain tumor": [
        "brain tumor", "glioma", "glioblastoma", "tumor segmentation", "mri brain",
        "neuroimaging", "brain tumor analysis", "medical image"
    ],
    "mri": [
        "mri", "magnetic resonance", "medical imaging", "medical image", "neuroimaging", "brain"
    ],
    "segmentation": [
        "segmentation", "image segmentation", "medical image", "image analysis", "pattern recognition"
    ],
    "medical image segmentation": [
        "medical image segmentation", "image segmentation", "mri segmentation", "tumor segmentation",
        "deep learning segmentation", "medical image analysis"
    ],
    "edge ai": [
        "edge computing", "edge intelligence", "on-device ai", "distributed ai",
        "embedded ai", "iot ai", "tinyml", "edge machine learning", "low power ai",
        "edge devices", "edge compute"
    ],
    "generative ai": [
        "generative ai", "large language model", "llm", "diffusion model", "transformer",
        "deep generative", "generative adversarial", "foundation model", "gpt"
    ],
    "artificial intelligence": [
        "artificial intelligence", "machine learning", "deep learning", "neural network",
        "cognitive computing", "intelligent agent", "ai model", "ai systems"
    ],
    "machine learning": [
        "machine learning", "supervised learning", "unsupervised learning",
        "reinforcement learning", "deep learning", "neural network", "transfer learning"
    ],
    "deep learning": [
        "deep learning", "deep neural network", "convolutional neural", "transformer",
        "deep reinforcement", "neural network architecture"
    ],
    "quantum computing": [
        "quantum computing", "quantum computer", "qubit", "quantum algorithm",
        "quantum circuit", "quantum processor", "quantum simulation", "quantum error correction"
    ],
    "computer vision": [
        "computer vision", "object detection", "image recognition", "image segmentation",
        "visual perception", "feature extraction", "pattern recognition"
    ],
    "natural language processing": [
        "natural language processing", "nlp", "text mining", "language model",
        "sentiment analysis", "machine translation", "text classification"
    ],
    "robotics": [
        "robotics", "robotic", "autonomous robot", "manipulator", "humanoid",
        "robot control", "automation", "cyber-physical"
    ],
    "cybersecurity": [
        "cybersecurity", "cyber security", "network security", "threat detection",
        "intrusion detection", "cryptography", "malware", "secure communication"
    ],
    "biotechnology": [
        "biotechnology", "biotech", "genomics", "molecular biology", "bioinformatics",
        "bio-hydrogen", "biomass conversion", "biomedical"
    ],
    "clean energy": [
        "clean energy", "renewable energy", "solar energy", "photovoltaic", "wind energy",
        "green hydrogen", "energy storage", "battery", "biofuel"
    ],
}


class TechnologyAnalysisService:
    """
    Evidence-Driven Technology Intelligence Analytical Service:
    - Technology Normalization & Concept Expansion Layer
    - Multi-Field Cross-Module Evidence Retrieval (Research, Patents, Funding)
    - Organization & Assignee Extraction & Provenance Tracking
    - Dynamic Temporal Trajectory & Activity Intensity Computation
    - Deterministic Maturity, Trend, and Analytical Readiness Models
    - Transparent Evidence-Based Explanations & Dynamic Insights
    """

    @staticmethod
    def get_technology(db: Session, technology_id: UUID) -> Optional[Technology]:
        return db.query(Technology).filter(Technology.id == technology_id).first()

    @staticmethod
    def normalize_term(term: str) -> str:
        """Sanitize and normalize search query text."""
        if not term:
            return ""
        cleaned = re.sub(r"[^\w\s\-\.]", " ", term)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned[:120]

    @classmethod
    def expand_query_concepts(cls, raw_query: str) -> Tuple[List[str], List[str]]:
        """
        Normalize and expand technology search query into semantic concepts and significant keywords.
        Returns:
            - concepts: List of semantic phrase concepts to match
            - tokens: Significant non-stopword tokens
        """
        normalized = cls.normalize_term(raw_query).lower()
        if not normalized:
            return [], []

        concepts = {normalized}
        tokens = [w for w in re.findall(r"\b\w+\b", normalized) if w not in STOP_WORDS and len(w) > 2]

        # Check curated domain ontology for matches / partial matches
        for key, expansions in CONCEPT_EXPANSIONS.items():
            if key in normalized or normalized in key:
                for exp in expansions:
                    concepts.add(exp)
            else:
                # If majority of key tokens appear in query
                key_tokens = [w for w in key.split() if w not in STOP_WORDS]
                if key_tokens and sum(1 for kt in key_tokens if kt in normalized) >= len(key_tokens):
                    for exp in expansions:
                        concepts.add(exp)

        # Include token pairs / n-grams if multi-word
        if len(tokens) >= 2:
            for i in range(len(tokens) - 1):
                concepts.add(f"{tokens[i]} {tokens[i+1]}")

        return list(concepts), tokens

    @classmethod
    def _score_document(
        cls,
        query: str,
        concepts: List[str],
        tokens: List[str],
        title: Optional[str],
        body_text: Optional[str],
        domain_text: Optional[str] = None,
        keywords_text: Optional[str] = None,
    ) -> float:
        """
        Compute deterministic relevance score of a document against user query & expanded concepts.
        """
        t_clean = (title or "").lower()
        b_clean = (body_text or "").lower()
        d_clean = (domain_text or "").lower()
        k_clean = (keywords_text or "").lower()
        combined = f"{t_clean} {b_clean} {d_clean} {k_clean}"

        if not combined.strip():
            return 0.0

        q_lower = query.lower().strip()
        score = 0.0

        # 1. Exact query match in title (Highest relevance)
        if q_lower in t_clean:
            score += 30.0
        elif q_lower in combined:
            score += 18.0

        # 2. Semantic concept phrase match
        for concept in concepts:
            if concept == q_lower:
                continue
            if concept in t_clean:
                score += 15.0
                break
            elif concept in d_clean or concept in k_clean:
                score += 12.0
                break
            elif concept in b_clean:
                score += 8.0
                break

        # 3. Keyword token coverage
        if tokens:
            t_matches = sum(1 for tok in tokens if tok in combined)
            token_ratio = t_matches / len(tokens)
            if token_ratio == 1.0:
                score += 12.0
            elif token_ratio >= 0.5 and len(tokens) > 1:
                score += 6.0 * token_ratio

        return score

    @classmethod
    def fetch_related_entities_by_term(
        cls, db: Session, search_term: str
    ) -> Tuple[List[ResearchPaper], List[Patent], List[FundingOpportunity]]:
        """
        Fetch all matching research papers, patents, and funding opportunities matching a technology concept.
        Uses intelligent semantic concept expansion and relevance scoring.
        """
        clean_term = cls.normalize_term(search_term)
        if not clean_term or len(clean_term) < 2:
            return [], [], []

        concepts, tokens = cls.expand_query_concepts(clean_term)

        # 1. Research Papers
        all_papers = db.query(ResearchPaper).all()
        scored_papers: List[Tuple[float, ResearchPaper]] = []
        for paper in all_papers:
            s = cls._score_document(
                query=clean_term,
                concepts=concepts,
                tokens=tokens,
                title=paper.title,
                body_text=paper.abstract,
                domain_text=paper.research_domain,
                keywords_text=paper.keywords,
            )
            if s >= 8.0:
                scored_papers.append((s, paper))
        scored_papers.sort(key=lambda x: x[0], reverse=True)
        papers = [p for _, p in scored_papers]

        # 2. Patents
        all_patents = db.query(Patent).all()
        scored_patents: List[Tuple[float, Patent]] = []
        for pat in all_patents:
            s = cls._score_document(
                query=clean_term,
                concepts=concepts,
                tokens=tokens,
                title=pat.title,
                body_text=pat.abstract,
                domain_text=pat.technology_domain,
                keywords_text=f"{pat.classification or ''} {pat.assignee or ''}",
            )
            if s >= 8.0:
                scored_patents.append((s, pat))
        scored_patents.sort(key=lambda x: x[0], reverse=True)
        patents = [pat for _, pat in scored_patents]

        # 3. Funding Opportunities
        all_fundings = db.query(FundingOpportunity).all()
        scored_fundings: List[Tuple[float, FundingOpportunity]] = []
        for fund in all_fundings:
            s = cls._score_document(
                query=clean_term,
                concepts=concepts,
                tokens=tokens,
                title=fund.title,
                body_text=fund.description,
                domain_text=fund.research_area,
                keywords_text=f"{fund.funding_category or ''} {fund.agency or ''}",
            )
            if s >= 8.0:
                scored_fundings.append((s, fund))
        scored_fundings.sort(key=lambda x: x[0], reverse=True)
        fundings = [f for _, f in scored_fundings]

        return papers, patents, fundings

    @classmethod
    def fetch_related_entities(
        cls, db: Session, technology: Technology
    ) -> Tuple[List[ResearchPaper], List[Patent], List[FundingOpportunity]]:
        """Fetch matching entities for an existing Technology model instance."""
        return cls.fetch_related_entities_by_term(db, technology.technology_name)

    @classmethod
    def _extract_organization_breakdown(
        cls,
        papers: List[ResearchPaper],
        patents: List[Patent],
        fundings: List[FundingOpportunity],
    ) -> List[OrganizationBreakdownItem]:
        """
        Extract, normalize, and aggregate organization participation across Research, Patents, and Funding.
        """
        org_data = defaultdict(lambda: {
            "paper_count": 0,
            "patent_count": 0,
            "funding_count": 0,
            "years": set(),
            "domains": set(),
        })

        for p in papers:
            yr = p.publication_year or (p.publication_date.year if p.publication_date else None)
            name = (p.journal_or_conference or "").strip()
            if name and len(name) > 2 and name.lower() not in {"null", "none", "n/a", "undefined"}:
                org_data[name]["paper_count"] += 1
                if yr:
                    org_data[name]["years"].add(yr)
                if p.research_domain:
                    org_data[name]["domains"].add(p.research_domain)

        for pat in patents:
            yr = pat.filing_date.year if pat.filing_date else (pat.publication_date.year if pat.publication_date else None)
            if pat.assignee:
                for a in pat.assignee.split(";"):
                    clean_a = a.strip()
                    if clean_a and len(clean_a) > 2 and clean_a.lower() not in {"null", "none", "n/a", "undefined"}:
                        org_data[clean_a]["patent_count"] += 1
                        if yr:
                            org_data[clean_a]["years"].add(yr)
                        if pat.technology_domain:
                            org_data[clean_a]["domains"].add(pat.technology_domain)

        for f in fundings:
            yr = f.open_date.year if f.open_date else None
            name = (f.agency or "").strip()
            if name and len(name) > 2 and name.lower() not in {"null", "none", "n/a", "undefined"}:
                org_data[name]["funding_count"] += 1
                if yr:
                    org_data[name]["years"].add(yr)
                if f.research_area:
                    org_data[name]["domains"].add(f.research_area)

        results: List[OrganizationBreakdownItem] = []
        for name, d in org_data.items():
            total = d["paper_count"] + d["patent_count"] + d["funding_count"]
            results.append(
                OrganizationBreakdownItem(
                    name=name,
                    paper_count=d["paper_count"],
                    patent_count=d["patent_count"],
                    funding_count=d["funding_count"],
                    total_activity=total,
                    years_active=sorted(list(d["years"])),
                    domains=sorted(list(d["domains"])),
                )
            )

        results.sort(key=lambda x: x.total_activity, reverse=True)
        return results

    @classmethod
    def _compute_adoption_from_entities(
        cls,
        tech_id: Optional[UUID],
        tech_name: str,
        papers: List[ResearchPaper],
        patents: List[Patent],
        fundings: List[FundingOpportunity],
    ) -> TechnologyAdoptionResponse:
        """
        Pure deterministic computation of adoption time-series and activity intensity.
        """
        pub_by_year = defaultdict(int)
        patent_by_year = defaultdict(int)
        funding_by_year = defaultdict(int)
        orgs_by_year = defaultdict(set)
        all_orgs = set()

        for paper in papers:
            year = paper.publication_year or (paper.publication_date.year if paper.publication_date else None)
            if year and 1970 <= year <= 2035:
                pub_by_year[year] += 1
                if paper.journal_or_conference:
                    clean_j = paper.journal_or_conference.strip()
                    orgs_by_year[year].add(clean_j)
                    all_orgs.add(clean_j)

        for patent in patents:
            year = patent.filing_date.year if patent.filing_date else (patent.publication_date.year if patent.publication_date else None)
            if year and 1970 <= year <= 2035:
                patent_by_year[year] += 1
                if patent.assignee:
                    for a in patent.assignee.split(";"):
                        clean_a = a.strip()
                        if clean_a:
                            orgs_by_year[year].add(clean_a)
                            all_orgs.add(clean_a)

        for funding in fundings:
            year = funding.open_date.year if funding.open_date else None
            if year and 1970 <= year <= 2035:
                funding_by_year[year] += 1
                if funding.agency:
                    clean_ag = funding.agency.strip()
                    orgs_by_year[year].add(clean_ag)
                    all_orgs.add(clean_ag)

        all_years = sorted(
            set(pub_by_year.keys())
            | set(patent_by_year.keys())
            | set(funding_by_year.keys())
            | set(orgs_by_year.keys())
        )

        # Pre-compute peak activity to calculate intensity ribbon percentages
        peak_total_activity = 0
        raw_yearly_totals = {}
        for yr in all_years:
            tot = pub_by_year[yr] + patent_by_year[yr] + funding_by_year[yr]
            raw_yearly_totals[yr] = tot
            if tot > peak_total_activity:
                peak_total_activity = tot

        yearly_metrics: List[AdoptionYearMetric] = []
        prev_total = None

        for yr in all_years:
            pubs = pub_by_year[yr]
            pats = patent_by_year[yr]
            orgs_count = len(orgs_by_year[yr])
            funds = funding_by_year[yr]
            total_act = pubs + pats + funds

            yoy_growth = None
            if prev_total is not None:
                if prev_total > 0:
                    yoy_growth = round(((total_act - prev_total) / prev_total) * 100.0, 2)
                elif total_act > 0:
                    yoy_growth = 100.0
                else:
                    yoy_growth = 0.0

            intensity_pct = round((total_act / peak_total_activity) * 100.0, 1) if peak_total_activity > 0 else 0.0
            if intensity_pct >= 85.0:
                intensity_label = "Peak"
            elif intensity_pct >= 55.0:
                intensity_label = "High"
            elif intensity_pct >= 25.0:
                intensity_label = "Moderate"
            else:
                intensity_label = "Low"

            yearly_metrics.append(
                AdoptionYearMetric(
                    year=yr,
                    publications=pubs,
                    patents=pats,
                    organizations=orgs_count,
                    funding_opportunities=funds,
                    total_activity=total_act,
                    yoy_growth_percent=yoy_growth,
                    activity_intensity=intensity_label,
                    intensity_percentage=intensity_pct,
                )
            )
            prev_total = total_act

        # 3-year CAGR
        cagr = None
        if len(yearly_metrics) >= 3:
            y_start = yearly_metrics[-3]
            y_end = yearly_metrics[-1]
            if y_start.total_activity > 0 and y_end.total_activity > 0:
                try:
                    cagr = round(
                        ((y_end.total_activity / y_start.total_activity) ** (1 / 2) - 1.0) * 100.0,
                        2,
                    )
                except (ValueError, ZeroDivisionError):
                    cagr = None

        summary = (
            f"Tracked across {len(all_years)} active years ({all_years[0]}–{all_years[-1]}) with "
            f"{len(papers)} publications, {len(patents)} patents, {len(fundings)} funding programs, "
            f"and {len(all_orgs)} identified organizations/assignees."
            if all_years
            else "Insufficient activity data to establish historical adoption time-series."
        )

        return TechnologyAdoptionResponse(
            technology_id=tech_id or UUID("00000000-0000-0000-0000-000000000000"),
            technology_name=tech_name,
            years=all_years,
            total_publications=len(papers),
            total_patents=len(patents),
            total_organizations=len(all_orgs),
            yearly_metrics=yearly_metrics,
            cagr_3yr=cagr,
            summary=summary,
        )

    @classmethod
    def _compute_trends_from_adoption(
        cls,
        tech_id: Optional[UUID],
        tech_name: str,
        adoption: TechnologyAdoptionResponse,
    ) -> TechnologyTrendResponse:
        """
        Pure deterministic computation of trend indicators from adoption metrics.
        """
        if not adoption or len(adoption.yearly_metrics) < 2:
            return TechnologyTrendResponse(
                technology_id=tech_id or UUID("00000000-0000-0000-0000-000000000000"),
                technology_name=tech_name,
                trend="Insufficient Data",
                growth_rate=None,
                explanation="Fewer than 2 active years of empirical data are available to determine a historical trend.",
                evidence=TrendEvidence(
                    research_growth=None,
                    patent_growth=None,
                    organization_growth=None,
                    active_years_analyzed=len(adoption.yearly_metrics) if adoption else 0,
                    latest_year_activity=adoption.yearly_metrics[-1].total_activity if (adoption and adoption.yearly_metrics) else 0,
                    previous_year_activity=0,
                ),
            )

        metrics = adoption.yearly_metrics
        latest = metrics[-1]
        previous = metrics[-2]

        latest_total = latest.total_activity
        prev_total = previous.total_activity

        overall_growth = None
        if prev_total > 0:
            overall_growth = round(((latest_total - prev_total) / prev_total) * 100.0, 2)
        elif latest_total > 0:
            overall_growth = 100.0
        else:
            overall_growth = 0.0

        res_growth = None
        if previous.publications > 0:
            res_growth = round(((latest.publications - previous.publications) / previous.publications) * 100.0, 2)
        elif latest.publications > 0:
            res_growth = 100.0

        pat_growth = None
        if previous.patents > 0:
            pat_growth = round(((latest.patents - previous.patents) / previous.patents) * 100.0, 2)
        elif latest.patents > 0:
            pat_growth = 100.0

        org_growth = None
        if previous.organizations > 0:
            org_growth = round(((latest.organizations - previous.organizations) / previous.organizations) * 100.0, 2)
        elif latest.organizations > 0:
            org_growth = 100.0

        if overall_growth is not None:
            if overall_growth >= 10.0:
                trend_label = "Growing"
                explanation = (
                    f"Technology activity expanded from {prev_total} evidence points in {previous.year} "
                    f"to {latest_total} in {latest.year} ({overall_growth:+}% YoY), supported by {latest.publications} publications "
                    f"and {latest.patents} patent filings across {latest.organizations} participating organizations."
                )
            elif overall_growth <= -10.0:
                trend_label = "Declining"
                explanation = (
                    f"Technology activity contracted by {abs(overall_growth)}% between {previous.year} and {latest.year}."
                )
            else:
                trend_label = "Stable"
                explanation = (
                    f"Technology activity remained steady ({overall_growth:+.1f}%) between {previous.year} and {latest.year}."
                )
        else:
            trend_label = "Insufficient Data"
            explanation = "Insufficient baseline historical data."

        return TechnologyTrendResponse(
            technology_id=tech_id or UUID("00000000-0000-0000-0000-000000000000"),
            technology_name=tech_name,
            trend=trend_label,
            growth_rate=overall_growth,
            explanation=explanation,
            evidence=TrendEvidence(
                research_growth=res_growth,
                patent_growth=pat_growth,
                organization_growth=org_growth,
                active_years_analyzed=len(metrics),
                latest_year_activity=latest_total,
                previous_year_activity=prev_total,
            ),
        )

    @classmethod
    def _compute_maturity_from_entities(
        cls,
        tech_id: Optional[UUID],
        tech_name: str,
        papers: List[ResearchPaper],
        patents: List[Patent],
        adoption: TechnologyAdoptionResponse,
        trend_res: Optional[TechnologyTrendResponse],
    ) -> TechnologyMaturityResponse:
        """
        Pure deterministic maturity assessment based on observable multi-source evidence.
        Stages: INSUFFICIENT_DATA, EARLY, DEVELOPING, ESTABLISHED, MATURE.
        """
        paper_count = len(papers)
        patent_count = len(patents)
        total_citations = sum(p.citation_count or 0 for p in papers) + sum(pat.citation_count or 0 for pat in patents)
        total_orgs = adoption.total_organizations if adoption else 0

        earliest_yr = adoption.years[0] if (adoption and adoption.years) else None
        latest_yr = adoption.years[-1] if (adoption and adoption.years) else None
        span_years = (latest_yr - earliest_yr + 1) if (earliest_yr and latest_yr) else 0

        recent_trend = trend_res.trend if trend_res else "Insufficient Data"
        total_evidence_count = paper_count + patent_count

        if total_evidence_count < 2:
            stage = "INSUFFICIENT_DATA"
            coverage = "Insufficient"
            explanation = (
                "Insufficient records in the connected datasets to establish verifiable technology maturity. "
                "At least 2 validated research or patent records are required."
            )
        elif span_years >= 4 and patent_count >= 4 and total_orgs >= 3:
            stage = "MATURE"
            coverage = "Comprehensive"
            explanation = (
                f"Mature classification is supported by sustained research and patent activity across {span_years} years "
                f"({earliest_yr}–{latest_yr}), with {patent_count} patent filings, {paper_count} research publications, "
                f"and active participation from {total_orgs} organizations."
            )
        elif span_years >= 3 and (patent_count >= 2 or total_orgs >= 2) and paper_count >= 3:
            stage = "ESTABLISHED"
            coverage = "Moderate"
            explanation = (
                f"Established footprint with {span_years} years of multi-source activity ({earliest_yr}–{latest_yr}), "
                f"{paper_count} research publications, and {patent_count} patent filings from {total_orgs} organizations."
            )
        elif span_years >= 1 and total_evidence_count >= 2:
            stage = "DEVELOPING"
            coverage = "Moderate" if total_evidence_count >= 4 else "Sparse"
            explanation = (
                f"Developing technology trajectory with an active research foundation ({paper_count} publications), "
                f"{patent_count} commercial patents, and emerging multi-year adoption."
            )
        else:
            stage = "EARLY"
            coverage = "Sparse"
            explanation = (
                f"Early exploratory phase with initial publications ({paper_count} papers) and nascent commercial patenting ({patent_count} patents)."
            )

        evidence = MaturityEvidence(
            research_papers=paper_count,
            patents=patent_count,
            distinct_assignees_or_orgs=total_orgs,
            citations=total_citations,
            historical_span_years=span_years,
            earliest_year=earliest_yr,
            latest_year=latest_yr,
            recent_growth_trend=recent_trend,
        )

        return TechnologyMaturityResponse(
            technology_id=tech_id or UUID("00000000-0000-0000-0000-000000000000"),
            technology_name=tech_name,
            maturity_stage=stage,
            explanation=explanation,
            evidence=evidence,
            coverage_level=coverage,
        )

    @classmethod
    def _compute_readiness_from_entities(
        cls,
        tech_id: Optional[UUID],
        tech_name: str,
        papers: List[ResearchPaper],
        patents: List[Patent],
        adoption: TechnologyAdoptionResponse,
        trend_res: Optional[TechnologyTrendResponse],
    ) -> TechnologyReadinessResponse:
        """
        Pure deterministic analytical readiness estimate based on log-scaled contributions.
        Factor weights: Research 25%, Patent IP 35%, Org Diversity 25%, Momentum 15%.
        """
        paper_count = len(papers)
        patent_count = len(patents)
        total_orgs = adoption.total_organizations if adoption else 0
        total_evidence = paper_count + patent_count

        if total_evidence < 1:
            return TechnologyReadinessResponse(
                technology_id=tech_id or UUID("00000000-0000-0000-0000-000000000000"),
                technology_name=tech_name,
                readiness_score=None,
                score_label="Insufficient Evidence",
                confidence="Low",
                explanation="No research or patent records associated with this technology in the current platform database.",
                factors=None,
            )

        # 1. Research Activity Score (0-100)
        res_score = min(100.0, round((math.log(paper_count + 1) / math.log(20)) * 100.0, 2)) if paper_count > 0 else 0.0

        # 2. Patent & IP Protection Score (0-100)
        pat_score = min(100.0, round((math.log(patent_count + 1) / math.log(10)) * 100.0, 2)) if patent_count > 0 else 0.0

        # 3. Organization & Assignee Diversity Score (0-100)
        org_score = min(100.0, round((math.log(total_orgs + 1) / math.log(8)) * 100.0, 2)) if total_orgs > 0 else 0.0

        # 4. Adoption Momentum Score (0-100)
        mom_score = 50.0
        if trend_res:
            if trend_res.trend == "Growing":
                g = trend_res.growth_rate or 10.0
                mom_score = min(100.0, 60.0 + min(40.0, g))
            elif trend_res.trend == "Stable":
                mom_score = 55.0
            elif trend_res.trend == "Declining":
                mom_score = 30.0
            else:
                mom_score = 40.0

        composite_score = round(
            (res_score * 0.25) + (pat_score * 0.35) + (org_score * 0.25) + (mom_score * 0.15),
            2,
        )

        if composite_score >= 75.0:
            score_label = "High Commercial Readiness"
        elif composite_score >= 50.0:
            score_label = "Moderate Practical Readiness"
        elif composite_score >= 25.0:
            score_label = "Early Feasibility / Prototyping"
        else:
            score_label = "Conceptual / Basic Research"

        confidence = "High" if total_evidence >= 10 else "Medium" if total_evidence >= 3 else "Low"

        explanation = (
            f"Analytical readiness estimated at {composite_score}/100 ({score_label}, Confidence: {confidence}). "
            f"Derived from {patent_count} patent assets ({pat_score:.0f} pts), {paper_count} research publications ({res_score:.0f} pts), "
            f"and {total_orgs} active organizational entities ({org_score:.0f} pts)."
        )

        factors = ReadinessFactors(
            research_activity_score=res_score,
            patent_ip_score=pat_score,
            organization_diversity_score=org_score,
            adoption_momentum_score=mom_score,
        )

        return TechnologyReadinessResponse(
            technology_id=tech_id or UUID("00000000-0000-0000-0000-000000000000"),
            technology_name=tech_name,
            readiness_score=composite_score,
            score_label=score_label,
            confidence=confidence,
            explanation=explanation,
            factors=factors,
        )

    @classmethod
    def _compute_coverage_and_explanation(
        cls,
        query: str,
        paper_count: int,
        patent_count: int,
        funding_count: int,
        org_count: int,
        span_years: int,
    ) -> Tuple[EvidenceCoverage, EvidenceBreakdown]:
        """
        Build transparent, evidence-based coverage classification, provenance summary, and explanation.
        """
        sources_checked = [
            "Research Intelligence (Module 3)",
            "Patent Intelligence (Module 5)",
            "Funding Intelligence (Module 4)",
            "Organization Network",
        ]
        sources_with_data = []
        sources_missing = []

        if paper_count > 0:
            sources_with_data.append("Research Intelligence")
        else:
            sources_missing.append("Research Intelligence")

        if patent_count > 0:
            sources_with_data.append("Patent Intelligence")
        else:
            sources_missing.append("Patent Intelligence")

        if funding_count > 0:
            sources_with_data.append("Funding Intelligence")
        else:
            sources_missing.append("Funding Intelligence")

        if org_count > 0:
            sources_with_data.append("Organization Network")
        else:
            sources_missing.append("Organization Network")

        total_evidence = paper_count + patent_count + funding_count

        # Compute coverage status
        if (paper_count >= 3 and patent_count >= 2 and org_count >= 3 and span_years >= 2) or (paper_count >= 5 and patent_count >= 3):
            status = "STRONG"
            score = 90.0
            explanation = (
                f"{paper_count} research publications and {patent_count} patent records were identified across "
                f"multiple observation years, with participation from {org_count} organizations."
                + (f" {funding_count} related funding programs were also identified." if funding_count > 0 else "")
                + " Research and patent evidence provides strong, comprehensive cross-source coverage of this technology area."
            )
        elif total_evidence >= 3 or len(sources_with_data) >= 2 or (paper_count >= 2 or patent_count >= 2 or funding_count >= 2):
            status = "PARTIAL"
            score = 65.0
            explanation = (
                f"Identified {paper_count} research papers and {patent_count} patents across {org_count} organizations"
                + (f" alongside {funding_count} funding programs." if funding_count > 0 else ".")
                + f" Connected datasets provide viable partial coverage ({', '.join(sources_with_data)})."
            )
        elif total_evidence >= 1:
            status = "LIMITED"
            score = 35.0
            explanation = (
                f"Limited evidence found: {paper_count} research publications, {patent_count} patents, "
                f"and {funding_count} funding programs matching '{query}'. Data is currently concentrated in {', '.join(sources_with_data)}."
            )
        else:
            status = "INSUFFICIENT"
            score = 0.0
            explanation = (
                f"No relevant research papers, patents, funding opportunities, or organizations were identified in the connected datasets for query '{query}'. "
                "Checked Research Intelligence (0), Patent Intelligence (0), and Funding Intelligence (0). The concept may be too specific or not yet cataloged."
            )

        breakdown = EvidenceBreakdown(
            research_count=paper_count,
            patent_count=patent_count,
            funding_count=funding_count,
            organization_count=org_count,
            active_years_range=f"{span_years} years" if span_years > 0 else "None",
            sources_checked=sources_checked,
            sources_with_data=sources_with_data,
            sources_missing_data=sources_missing,
        )

        coverage = EvidenceCoverage(
            status=status,
            explanation=explanation,
            score=score,
        )

        return coverage, breakdown

    @classmethod
    def _generate_key_insights(
        cls,
        papers: List[ResearchPaper],
        patents: List[Patent],
        fundings: List[FundingOpportunity],
        adoption: TechnologyAdoptionResponse,
        trend: TechnologyTrendResponse,
        maturity: TechnologyMaturityResponse,
    ) -> List[str]:
        """
        Dynamically synthesize 4-6 evidence-grounded key insights from actual calculated data.
        """
        insights = []
        paper_count = len(papers)
        patent_count = len(patents)
        funding_count = len(fundings)
        org_count = adoption.total_organizations if adoption else 0
        years = adoption.years if adoption else []

        if not years or (paper_count + patent_count + funding_count == 0):
            return [
                "No empirical records currently linked in the database for this technology query.",
                "Cross-source dataset scan returned zero papers, patents, or funding opportunities.",
                "Historical trajectory and maturity classification remain unconfirmed due to absence of baseline signals.",
            ]

        # 1. Research Activity Insight
        if paper_count > 0:
            if paper_count >= 10:
                insights.append(f"Substantial scientific foundation with {paper_count} research publications cataloged across peer-reviewed sources.")
            else:
                insights.append(f"Academic research foundation established with {paper_count} published research papers.")
        else:
            insights.append("No academic research publications directly identified in the current repository.")

        # 2. Patent & IP Protection Insight
        if patent_count > 0:
            if patent_count >= 5:
                insights.append(f"Strong intellectual property activity with {patent_count} commercial patent filings identified.")
            else:
                insights.append(f"Emerging commercial protection observed with {patent_count} registered patent assets.")
        else:
            insights.append("Patent intelligence indicates limited commercial IP protection filed to date in the connected repository.")

        # 3. Trajectory & Growth Insight
        if trend.trend == "Growing":
            growth_val = trend.growth_rate or 0.0
            insights.append(f"Positive momentum: Total annual activity expanded by {growth_val:+}% in the latest observation period.")
        elif trend.trend == "Stable":
            insights.append("Technology activity exhibits sustained, stable volume across recent observation years.")
        elif trend.trend == "Declining":
            insights.append("Annual activity has softened from prior peak volume periods.")

        # 4. Organizational Participation
        if org_count >= 4:
            insights.append(f"Broad multi-institutional ecosystem with {org_count} distinct organizations/assignees actively participating.")
        elif org_count >= 1:
            insights.append(f"Active participation identified from {org_count} distinct commercial or academic entities.")

        # 5. Funding Programs
        if funding_count > 0:
            insights.append(f"Identified {funding_count} related public/institutional funding programs actively supporting this technology domain.")

        # 6. Peak Year Observation
        if adoption.yearly_metrics:
            peak_metric = max(adoption.yearly_metrics, key=lambda m: m.total_activity)
            if peak_metric.total_activity > 0:
                insights.append(f"Peak recorded activity occurred in {peak_metric.year} with {peak_metric.total_activity} total evidence points.")

        return insights

    @classmethod
    def _discover_related_technologies(
        cls,
        query: str,
        papers: List[ResearchPaper],
        patents: List[Patent],
        fundings: List[FundingOpportunity],
    ) -> List[str]:
        """
        Extract related technology concepts and co-occurring domain tags from retrieved records.
        """
        domain_counts = defaultdict(int)
        q_lower = query.lower()

        for p in papers:
            if p.research_domain and p.research_domain.lower() not in q_lower:
                for d in re.split(r"[,;|/]", p.research_domain):
                    clean = d.strip()
                    if clean and len(clean) > 2:
                        domain_counts[clean] += 2
            if p.keywords:
                for kw in re.split(r"[,;|]", p.keywords):
                    clean = kw.strip()
                    if clean and len(clean) > 2 and clean.lower() not in q_lower and clean.lower() not in STOP_WORDS:
                        domain_counts[clean] += 1

        for pat in patents:
            if pat.technology_domain and pat.technology_domain.lower() not in q_lower:
                for d in re.split(r"[,;|/]", pat.technology_domain):
                    clean = d.strip()
                    if clean and len(clean) > 2:
                        domain_counts[clean] += 2

        for f in fundings:
            if f.research_area and f.research_area.lower() not in q_lower:
                for d in re.split(r"[,;|/]", f.research_area):
                    clean = d.strip()
                    if clean and len(clean) > 2:
                        domain_counts[clean] += 1

        sorted_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)
        results = [d for d, _ in sorted_domains[:8]]

        # Fallback to standard related technologies if sparse
        if len(results) < 3:
            for key in ["Artificial Intelligence", "Deep Learning", "Computer Vision", "Machine Learning", "Healthcare AI"]:
                if key.lower() not in q_lower and key not in results:
                    results.append(key)
                if len(results) >= 5:
                    break

        return results[:8]

    # =========================================================================
    # Tracked Technology Calculations (By ID)
    # =========================================================================

    @classmethod
    def calculate_adoption(
        cls, db: Session, technology_id: UUID
    ) -> Optional[TechnologyAdoptionResponse]:
        technology = cls.get_technology(db, technology_id)
        if not technology:
            return None
        papers, patents, fundings = cls.fetch_related_entities(db, technology)
        return cls._compute_adoption_from_entities(
            technology.id, technology.technology_name, papers, patents, fundings
        )

    @classmethod
    def calculate_trends(
        cls, db: Session, technology_id: UUID
    ) -> Optional[TechnologyTrendResponse]:
        technology = cls.get_technology(db, technology_id)
        if not technology:
            return None
        adoption = cls.calculate_adoption(db, technology_id)
        return cls._compute_trends_from_adoption(
            technology.id, technology.technology_name, adoption
        )

    @classmethod
    def calculate_maturity(
        cls, db: Session, technology_id: UUID
    ) -> Optional[TechnologyMaturityResponse]:
        technology = cls.get_technology(db, technology_id)
        if not technology:
            return None
        papers, patents, _ = cls.fetch_related_entities(db, technology)
        adoption = cls.calculate_adoption(db, technology_id)
        trend_res = cls.calculate_trends(db, technology_id)
        return cls._compute_maturity_from_entities(
            technology.id, technology.technology_name, papers, patents, adoption, trend_res
        )

    @classmethod
    def calculate_readiness(
        cls, db: Session, technology_id: UUID
    ) -> Optional[TechnologyReadinessResponse]:
        technology = cls.get_technology(db, technology_id)
        if not technology:
            return None
        papers, patents, _ = cls.fetch_related_entities(db, technology)
        adoption = cls.calculate_adoption(db, technology_id)
        trend_res = cls.calculate_trends(db, technology_id)
        return cls._compute_readiness_from_entities(
            technology.id, technology.technology_name, papers, patents, adoption, trend_res
        )

    @classmethod
    def get_full_analysis(
        cls, db: Session, technology_id: UUID
    ) -> Optional[TechnologyFullAnalysisResponse]:
        technology = cls.get_technology(db, technology_id)
        if not technology:
            return None

        papers, patents, fundings = cls.fetch_related_entities(db, technology)
        adoption = cls._compute_adoption_from_entities(
            technology.id, technology.technology_name, papers, patents, fundings
        )
        trend = cls._compute_trends_from_adoption(
            technology.id, technology.technology_name, adoption
        )
        maturity = cls._compute_maturity_from_entities(
            technology.id, technology.technology_name, papers, patents, adoption, trend
        )
        readiness = cls._compute_readiness_from_entities(
            technology.id, technology.technology_name, papers, patents, adoption, trend
        )

        span_years = (adoption.years[-1] - adoption.years[0] + 1) if adoption.years else 0
        coverage, breakdown = cls._compute_coverage_and_explanation(
            technology.technology_name,
            len(papers),
            len(patents),
            len(fundings),
            adoption.total_organizations,
            span_years,
        )

        org_breakdown = cls._extract_organization_breakdown(papers, patents, fundings)
        insights = cls._generate_key_insights(papers, patents, fundings, adoption, trend, maturity)
        related_techs = cls._discover_related_technologies(technology.technology_name, papers, patents, fundings)
        concepts, _ = cls.expand_query_concepts(technology.technology_name)

        sources_container = EvidenceSourcesContainer(
            research=[
                EvidencePaperItem(
                    id=p.id,
                    title=p.title,
                    authors=p.authors,
                    publication_year=p.publication_year,
                    journal_or_conference=p.journal_or_conference,
                    citation_count=p.citation_count or 0,
                    research_domain=p.research_domain,
                    source=p.source or "Research Intelligence",
                    source_id=p.source_id,
                )
                for p in papers
            ],
            patents=[
                EvidencePatentItem(
                    id=pat.id,
                    title=pat.title,
                    assignee=pat.assignee,
                    filing_date=pat.filing_date,
                    publication_date=pat.publication_date,
                    publication_number=pat.publication_number,
                    classification=pat.classification,
                    technology_domain=pat.technology_domain,
                    citation_count=pat.citation_count or 0,
                    source=pat.source or "Patent Intelligence",
                    source_id=pat.source_id,
                )
                for pat in patents
            ],
            funding=[
                EvidenceFundingItem(
                    id=f.id,
                    title=f.title,
                    agency=f.agency,
                    open_date=f.open_date,
                    close_date=f.close_date,
                    funding_category=f.funding_category,
                    research_area=f.research_area,
                    funding_amount=float(f.funding_amount) if f.funding_amount is not None else None,
                    funding_type=f.funding_type,
                    official_link=f.official_link,
                    source=f.source or "Funding Intelligence",
                    source_id=f.source_id,
                )
                for f in fundings
            ],
        )

        return TechnologyFullAnalysisResponse(
            technology_id=technology.id,
            technology_name=technology.technology_name,
            technology_domain=technology.technology_domain,
            description=technology.description,
            maturity=maturity,
            readiness=readiness,
            adoption=adoption,
            trend=trend,
            evidence=breakdown,
            coverage=coverage,
            sources=sources_container,
            organizations=org_breakdown,
            key_insights=insights,
            related_technologies=related_techs,
            expanded_concepts=concepts,
        )

    # =========================================================================
    # Dynamic Custom Technology Query Analysis Pipeline
    # =========================================================================

    @classmethod
    def analyze_custom_query(
        cls, db: Session, query_text: str
    ) -> TechnologyQueryAnalysisResponse:
        """
        Analyze ANY user-entered technology concept using real cross-module evidence.
        Applies concept normalization, related term expansion, and transparent scoring.
        """
        normalized_q = cls.normalize_term(query_text)
        if not normalized_q:
            empty_adoption = cls._compute_adoption_from_entities(None, "Empty Query", [], [], [])
            empty_trend = cls._compute_trends_from_adoption(None, "Empty Query", empty_adoption)
            empty_maturity = cls._compute_maturity_from_entities(None, "Empty Query", [], [], empty_adoption, empty_trend)
            empty_readiness = cls._compute_readiness_from_entities(None, "Empty Query", [], [], empty_adoption, empty_trend)
            empty_cov, empty_breakdown = cls._compute_coverage_and_explanation("Empty", 0, 0, 0, 0, 0)

            return TechnologyQueryAnalysisResponse(
                query="",
                matched_technology=None,
                technology_id=None,
                match_type="insufficient",
                match_confidence_note="No search query provided.",
                data_coverage="Insufficient",
                technology_domain=None,
                description=None,
                maturity=empty_maturity,
                readiness=empty_readiness,
                adoption=empty_adoption,
                trend=empty_trend,
                evidence=empty_breakdown,
                coverage=empty_cov,
                sources=EvidenceSourcesContainer(),
                organizations=[],
                key_insights=["Please enter a technology query to initiate analytical discovery."],
                related_technologies=[],
                expanded_concepts=[],
            )

        # 1. Check exact or canonical match in Technology table
        exact_tech = (
            db.query(Technology)
            .filter(func.lower(Technology.technology_name) == normalized_q.lower())
            .first()
        )

        if exact_tech:
            full = cls.get_full_analysis(db, exact_tech.id)
            if full:
                return TechnologyQueryAnalysisResponse(
                    query=normalized_q,
                    matched_technology=exact_tech.technology_name,
                    technology_id=exact_tech.id,
                    match_type="direct",
                    match_confidence_note="Direct verified match with canonical technology in database.",
                    data_coverage=full.coverage.status if full.coverage else "Available",
                    technology_domain=exact_tech.technology_domain,
                    description=exact_tech.description,
                    maturity=full.maturity,
                    readiness=full.readiness,
                    adoption=full.adoption,
                    trend=full.trend,
                    evidence=full.evidence,
                    coverage=full.coverage,
                    sources=full.sources,
                    organizations=full.organizations,
                    key_insights=full.key_insights,
                    related_technologies=full.related_technologies,
                    expanded_concepts=full.expanded_concepts,
                )

        # 2. Check for partial substring match in existing technologies
        partial_tech = (
            db.query(Technology)
            .filter(
                or_(
                    Technology.technology_name.ilike(f"%{normalized_q}%"),
                    Technology.technology_domain.ilike(f"%{normalized_q}%"),
                )
            )
            .first()
        )

        # 3. Retrieve all related empirical entities using concept expansion
        papers, patents, fundings = cls.fetch_related_entities_by_term(db, normalized_q)
        total_records = len(papers) + len(patents) + len(fundings)
        concepts, _ = cls.expand_query_concepts(normalized_q)

        # Discovered domain tags
        discovered_domains = set()
        for p in papers:
            if p.research_domain:
                discovered_domains.add(p.research_domain)
        for pat in patents:
            if pat.technology_domain:
                discovered_domains.add(pat.technology_domain)
        for f in fundings:
            if f.research_area:
                discovered_domains.add(f.research_area)

        tech_domain = ", ".join(sorted(discovered_domains)) if discovered_domains else (
            partial_tech.technology_domain if partial_tech else "Emerging Concept"
        )

        display_name = partial_tech.technology_name if (partial_tech and total_records == 0) else normalized_q

        # Run analytical calculations on real gathered evidence
        adoption = cls._compute_adoption_from_entities(
            partial_tech.id if partial_tech else None,
            display_name,
            papers,
            patents,
            fundings,
        )
        trend = cls._compute_trends_from_adoption(
            partial_tech.id if partial_tech else None,
            display_name,
            adoption,
        )
        maturity = cls._compute_maturity_from_entities(
            partial_tech.id if partial_tech else None,
            display_name,
            papers,
            patents,
            adoption,
            trend,
        )
        readiness = cls._compute_readiness_from_entities(
            partial_tech.id if partial_tech else None,
            display_name,
            papers,
            patents,
            adoption,
            trend,
        )

        span_years = (adoption.years[-1] - adoption.years[0] + 1) if adoption.years else 0
        coverage, breakdown = cls._compute_coverage_and_explanation(
            normalized_q,
            len(papers),
            len(patents),
            len(fundings),
            adoption.total_organizations,
            span_years,
        )

        org_breakdown = cls._extract_organization_breakdown(papers, patents, fundings)
        insights = cls._generate_key_insights(papers, patents, fundings, adoption, trend, maturity)
        related_techs = cls._discover_related_technologies(normalized_q, papers, patents, fundings)

        if total_records >= 2:
            match_type = "related"
            match_note = (
                f"Analysis synthesized from {len(papers)} research papers, {len(patents)} patents, "
                f"and {len(fundings)} funding opportunities matching '{normalized_q}' across {adoption.total_organizations} organizations."
            )
            data_cov = coverage.status
        elif total_records == 1:
            match_type = "related"
            match_note = f"Limited evidence found: 1 record matching '{normalized_q}'."
            data_cov = "LIMITED"
        else:
            match_type = "insufficient"
            match_note = f"No relevant research papers, patents, funding opportunities, or organizations were identified in the connected datasets for query '{normalized_q}'."
            data_cov = "INSUFFICIENT"

        sources_container = EvidenceSourcesContainer(
            research=[
                EvidencePaperItem(
                    id=p.id,
                    title=p.title,
                    authors=p.authors,
                    publication_year=p.publication_year,
                    journal_or_conference=p.journal_or_conference,
                    citation_count=p.citation_count or 0,
                    research_domain=p.research_domain,
                    source=p.source or "Research Intelligence",
                    source_id=p.source_id,
                )
                for p in papers
            ],
            patents=[
                EvidencePatentItem(
                    id=pat.id,
                    title=pat.title,
                    assignee=pat.assignee,
                    filing_date=pat.filing_date,
                    publication_date=pat.publication_date,
                    publication_number=pat.publication_number,
                    classification=pat.classification,
                    technology_domain=pat.technology_domain,
                    citation_count=pat.citation_count or 0,
                    source=pat.source or "Patent Intelligence",
                    source_id=pat.source_id,
                )
                for pat in patents
            ],
            funding=[
                EvidenceFundingItem(
                    id=f.id,
                    title=f.title,
                    agency=f.agency,
                    open_date=f.open_date,
                    close_date=f.close_date,
                    funding_category=f.funding_category,
                    research_area=f.research_area,
                    funding_amount=float(f.funding_amount) if f.funding_amount is not None else None,
                    funding_type=f.funding_type,
                    official_link=f.official_link,
                    source=f.source or "Funding Intelligence",
                    source_id=f.source_id,
                )
                for f in fundings
            ],
        )

        return TechnologyQueryAnalysisResponse(
            query=normalized_q,
            matched_technology=display_name if total_records > 0 else None,
            technology_id=partial_tech.id if partial_tech else None,
            match_type=match_type,
            match_confidence_note=match_note,
            data_coverage=data_cov,
            technology_domain=tech_domain if total_records > 0 else None,
            description=f"Analytical breakdown for concept '{normalized_q}'." if total_records > 0 else None,
            maturity=maturity,
            readiness=readiness,
            adoption=adoption,
            trend=trend,
            evidence=breakdown,
            coverage=coverage,
            sources=sources_container,
            organizations=org_breakdown,
            key_insights=insights,
            related_technologies=related_techs,
            expanded_concepts=concepts,
        )

    # =========================================================================
    # Bulk Aggregate Endpoints
    # =========================================================================

    @classmethod
    def get_all_trends(cls, db: Session) -> List[TechnologyTrendResponse]:
        technologies = db.query(Technology).order_by(Technology.technology_name).all()
        results = []
        for tech in technologies:
            trend = cls.calculate_trends(db, tech.id)
            if trend:
                results.append(trend)
        return results

    @classmethod
    def get_all_maturities(cls, db: Session) -> List[TechnologyMaturityResponse]:
        technologies = db.query(Technology).order_by(Technology.technology_name).all()
        results = []
        for tech in technologies:
            mat = cls.calculate_maturity(db, tech.id)
            if mat:
                results.append(mat)
        return results

    @classmethod
    def get_all_adoptions(cls, db: Session) -> List[TechnologyAdoptionResponse]:
        technologies = db.query(Technology).order_by(Technology.technology_name).all()
        results = []
        for tech in technologies:
            adp = cls.calculate_adoption(db, tech.id)
            if adp:
                results.append(adp)
        return results
