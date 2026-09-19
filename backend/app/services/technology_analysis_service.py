import math
import re
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple
from uuid import UUID

from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.patent import Patent
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.technology import Technology
from backend.app.models.technology_activity import TechnologyActivity
from backend.app.schemas.technology import (
    AdoptionAnalysis,
    EvidenceCoverage,
    EvidenceFundingItem,
    EvidencePaperItem,
    EvidencePatentItem,
    IndicatorMetric,
    OrganizationBreakdownItem,
    StageClassification,
    TechnologyAnalysisResponse,
    WeightedScoreBreakdown,
    YearlyEvidenceItem,
)


# ---------------------------------------------------------------------------
# Stop words and Domain Concept Ontology
# ---------------------------------------------------------------------------

STOP_WORDS: Set[str] = {
    "for", "in", "of", "and", "the", "based", "powered", "with", "to", "a", "an",
    "on", "using", "via", "from", "system", "systems", "method", "methods", "apparatus",
    "device", "devices", "application", "applications", "approach", "novel", "toward",
    "towards", "study", "studies", "review", "survey", "future", "challenges"
}

CONCEPT_EXPANSIONS: Dict[str, List[str]] = {
    "medical imaging ai": [
        "medical image", "medical imaging", "mri", "tumor segmentation", "radiology",
        "ct scan", "computed tomography", "ultrasound", "biomedical imaging",
        "clinical imaging", "medical image segmentation", "deep learning in medicine",
        "medical diagnostics", "radiology ai", "brain tumor analysis", "histopathology"
    ],
    "medical imaging": [
        "medical image", "medical imaging", "mri", "tumor segmentation", "radiology",
        "ct scan", "computed tomography", "ultrasound", "biomedical imaging",
        "clinical imaging", "medical image segmentation", "medical image analysis"
    ],
    "edge ai": [
        "edge computing", "edge intelligence", "on-device ai", "distributed ai",
        "embedded ai", "iot ai", "tinyml", "edge machine learning", "low power ai",
        "edge devices", "edge compute"
    ],
    "artificial intelligence": [
        "artificial intelligence", "machine learning", "deep learning", "neural network",
        "cognitive computing", "intelligent agent", "ai model", "ai systems", "ai applications"
    ],
    "machine learning": [
        "machine learning", "supervised learning", "unsupervised learning",
        "reinforcement learning", "deep learning", "neural network", "transfer learning",
        "predictive modeling"
    ],
    "deep learning": [
        "deep learning", "deep neural network", "convolutional neural", "transformer",
        "deep reinforcement", "neural network architecture"
    ],
    "quantum computing": [
        "quantum computing", "quantum computer", "qubit", "quantum algorithm",
        "quantum circuit", "quantum processor", "quantum simulation", "quantum error correction"
    ],
    "generative ai": [
        "generative ai", "large language model", "llm", "diffusion model", "transformer",
        "deep generative", "generative adversarial", "foundation model", "gpt"
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
        "robotics", "autonomous robot", "robotic system", "manipulator", "humanoid",
        "mobile robot", "swarm robotics"
    ],
    "cybersecurity": [
        "cybersecurity", "information security", "intrusion detection", "cryptography",
        "malware detection", "network security", "vulnerability analysis"
    ],
    "biotechnology": [
        "biotechnology", "genomics", "bioinformatics", "gene therapy", "molecular biology",
        "synthetic biology", "proteomics"
    ],
    "synthetic biology": [
        "synthetic biology", "synthetic biology engineering", "engineered organisms",
        "genetic engineering", "biological engineering", "metabolic engineering",
        "engineered microorganisms", "engineered cells", "programmable biology",
        "synthetic genomics", "bioengineering", "cell-free synthesis", "crispr genome editing",
        "metabolic pathway", "biosensing"
    ],
    "space tech": [
        "space tech", "space technology", "satellite technology", "small satellites",
        "smallsat", "cubesat", "satellite miniaturization", "reusable launch vehicle",
        "reusable rocket", "launch vehicle", "orbital technology", "space propulsion",
        "asteroid mining", "in-space manufacturing", "space robotics", "hall effect thruster",
        "space debris remediation", "satellite constellation"
    ],
    "space technology": [
        "space tech", "space technology", "satellite technology", "small satellites",
        "smallsat", "cubesat", "satellite miniaturization", "reusable launch vehicle",
        "reusable rocket", "launch vehicle", "orbital technology", "space propulsion",
        "asteroid mining", "in-space manufacturing", "space robotics"
    ],
    "brain-computer interfaces": [
        "brain-computer interfaces", "brain computer interface", "brain-computer interface",
        "bci", "brain machine interface", "brain machine interfaces", "neural interface",
        "neural signal processing", "neuroprosthetics", "neural prosthesis", "neural control",
        "brain signal interface", "eeg interface", "neural decoding", "neurotechnology",
        "neural microelectrode array", "neuromodulation"
    ],
    "brain computer interface": [
        "brain-computer interfaces", "brain computer interface", "brain-computer interface",
        "bci", "brain machine interface", "brain machine interfaces", "neural interface",
        "neural signal processing", "neuroprosthetics", "neural prosthesis", "neural control",
        "brain signal interface", "eeg interface", "neural decoding", "neurotechnology"
    ],
    "smart materials": [
        "smart materials", "smart material", "intelligent materials", "functional materials",
        "stimuli responsive materials", "stimuli-responsive", "shape memory materials",
        "shape memory alloy", "self healing materials", "self-healing materials",
        "self healing", "piezoelectric materials", "electroactive materials",
        "magnetostrictive materials", "responsive materials", "multiferroic composite",
        "responsive nanocomposite"
    ],
    "clean energy": [
        "clean energy", "renewable energy", "solar cell", "photovoltaic", "wind turbine",
        "battery storage", "fuel cell", "energy harvesting", "green hydrogen", "electrolyzer",
        "sodium-ion battery", "solid-state battery"
    ],
    "green hydrogen": [
        "green hydrogen", "water electrolyzer", "water electrolysis", "anion exchange membrane",
        "hydrogen production", "electrocatalytic water splitting", "hydrogen fuel",
        "clean energy"
    ],
    "advanced battery technology": [
        "advanced battery technology", "battery storage", "sodium-ion battery",
        "solid-state battery", "lithium-ion battery", "silicon-carbon anode",
        "energy storage", "fast-charging battery", "battery cell"
    ],
    "3d printing": [
        "3d printing", "additive manufacturing", "selective laser melting", "directed energy deposition",
        "melt-pool temperature", "3d printing of metal", "in-situ defect correction"
    ],
    "autonomous vehicles": [
        "autonomous vehicles", "autonomous vehicle", "self-driving", "driverless",
        "sensor fusion", "4d imaging radar", "lidar perception", "unstructured road navigation",
        "autonomous driving"
    ],
}


# ---------------------------------------------------------------------------
# Concept Normalization and Matching
# ---------------------------------------------------------------------------

def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", " ", text)
    return " ".join(text.split())


def get_query_concept_terms(query: str) -> List[str]:
    norm_query = normalize_text(query)
    if not norm_query:
        return []

    # Check direct ontology match or partial match
    expanded_terms: List[str] = [norm_query]

    for concept, terms in CONCEPT_EXPANSIONS.items():
        if concept in norm_query or norm_query in concept:
            for t in terms:
                if t not in expanded_terms:
                    expanded_terms.append(t)

    # Filter stop words from individual query tokens
    tokens = [tok for tok in norm_query.split() if tok not in STOP_WORDS and len(tok) >= 2]
    if tokens and " ".join(tokens) not in expanded_terms:
        expanded_terms.append(" ".join(tokens))

    return expanded_terms


def matches_concept(searchable_text: str, concept_terms: List[str]) -> bool:
    if not searchable_text or not concept_terms:
        return False
    norm_haystack = normalize_text(searchable_text)

    for term in concept_terms:
        if term in norm_haystack:
            return True

    return False


# ---------------------------------------------------------------------------
# Multi-Year Trend & Regression Math
# ---------------------------------------------------------------------------

def calculate_linear_slope(yearly_series: List[Tuple[int, float]]) -> float:
    """
    Computes linear regression slope: beta = (n*sum(t*y) - sum(t)*sum(y)) / (n*sum(t^2) - (sum(t))^2)
    """
    n = len(yearly_series)
    if n < 2:
        return 0.0

    sum_t = sum(t for t, _ in yearly_series)
    sum_y = sum(y for _, y in yearly_series)
    sum_ty = sum(t * y for t, y in yearly_series)
    sum_t2 = sum(t * t for t, _ in yearly_series)

    denominator = (n * sum_t2) - (sum_t * sum_t)
    if denominator == 0:
        return 0.0

    slope = ((n * sum_ty) - (sum_t * sum_y)) / denominator
    return float(slope)


def calculate_cagr(start_val: float, end_val: float, start_year: int, end_year: int) -> Optional[float]:
    span = end_year - start_year
    if span < 2 or start_val <= 0 or end_val <= 0:
        return None
    try:
        cagr = (math.pow(end_val / start_val, 1.0 / span) - 1.0) * 100.0
        return round(float(cagr), 2)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Corpus Calibration Statistics
# ---------------------------------------------------------------------------

def get_corpus_statistics(db: Session) -> Dict[str, float]:
    """
    Derives maximums and reference distributions directly from the connected dataset
    to enable data-relative normalization instead of arbitrary fixed cutoffs.
    """
    total_papers = db.query(ResearchPaper).count()
    total_patents = db.query(Patent).count()
    total_orgs = db.query(Patent.assignee).filter(Patent.assignee.isnot(None)).distinct().count()

    # Get max counts for any single pre-existing technology record
    max_tech_papers = db.query(func.max(Technology.research_paper_count)).scalar() or 35
    max_tech_patents = db.query(func.max(Technology.patent_count)).scalar() or 40

    return {
        "max_papers": max(float(max_tech_papers), 10.0),
        "max_patents": max(float(max_tech_patents), 10.0),
        "max_orgs": max(float(total_orgs), 5.0),
        "max_domains": 15.0,
        "max_span_years": 10.0,
    }


# ---------------------------------------------------------------------------
# Core Analytical Engine — Multi-Source Technology Intelligence
# ---------------------------------------------------------------------------

from backend.app.services.sources.source_registry import source_registry
from backend.app.services.sources.base_source import RawEvidenceRecord, SourceType
from backend.app.schemas.technology import SourceBreakdownMetric


def analyze_technology_intelligence(
    db: Session,
    query_or_id: str,
) -> TechnologyAnalysisResponse:
    """
    Performs full multi-year, multi-source, data-driven, explainable Technology Intelligence analysis.
    Integrates OpenAlex, Crossref, OpenAIRE, PubMed, PatentsView, EPO OPS, NIH RePORTER, CORDIS,
    and Module 3/4/5 databases with strict deduplication and provenance preservation.
    """
    # 1. Resolve Target Technology & Search Candidates
    technology_record: Optional[Technology] = None
    target_query = query_or_id.strip()

    # Try UUID lookup
    try:
        tech_uuid = UUID(target_query)
        technology_record = db.query(Technology).filter(Technology.id == tech_uuid).first()
        if technology_record:
            target_query = technology_record.technology_name
    except ValueError:
        pass

    if not technology_record:
        technology_record = (
            db.query(Technology)
            .filter(Technology.technology_name.ilike(target_query))
            .first()
        )

    concept_terms = get_query_concept_terms(target_query)
    corpus_stats = get_corpus_statistics(db)

    # 2. Multi-Source Evidence Ingestion via Source Registry
    source_results = source_registry.fetch_all_evidence(
        query=target_query,
        concept_terms=concept_terms,
        db=db,
    )

    research_dedup = source_results["research"]
    patents_dedup = source_results["patents"]
    funding_dedup = source_results["funding"]

    matched_papers: List[RawEvidenceRecord] = research_dedup.unique_records
    matched_patents: List[RawEvidenceRecord] = patents_dedup.unique_records
    matched_funding: List[RawEvidenceRecord] = funding_dedup.unique_records

    # 3. Construct Multi-Year Evidence Timeline
    yearly_dict: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
        "papers": [],
        "patents": [],
        "funding": [],
        "orgs": set(),
        "applications": set(),
    })

    # Group papers by publication year
    for p in matched_papers:
        if p.year:
            y = int(p.year)
            yearly_dict[y]["papers"].append(p)
            if p.organization:
                yearly_dict[y]["orgs"].add(p.organization.strip())
            if p.domain_or_classification:
                yearly_dict[y]["applications"].add(normalize_text(p.domain_or_classification))

    # Group patents by filing/publication year
    for pt in matched_patents:
        if pt.year:
            y = int(pt.year)
            yearly_dict[y]["patents"].append(pt)
            if pt.organization:
                yearly_dict[y]["orgs"].add(pt.organization.strip())
            if pt.domain_or_classification:
                for c in pt.domain_or_classification.split(","):
                    if c.strip():
                        yearly_dict[y]["applications"].add(normalize_text(c))

    # Group funding grants by year
    for f in matched_funding:
        if f.year:
            y = int(f.year)
            yearly_dict[y]["funding"].append(f)
            if f.organization:
                yearly_dict[y]["orgs"].add(f.organization.strip())
            if f.domain_or_classification:
                yearly_dict[y]["applications"].add(normalize_text(f.domain_or_classification))

    # Compile all active years
    active_years = sorted([y for y in yearly_dict.keys() if 1990 <= y <= 2030])

    # Build continuous yearly evidence series
    yearly_evidence: List[YearlyEvidenceItem] = []
    prev_research = 0
    prev_patent = 0

    for idx, yr in enumerate(active_years):
        papers_in_yr = len(yearly_dict[yr]["papers"])
        patents_in_yr = len(yearly_dict[yr]["patents"])
        orgs_in_yr = len(yearly_dict[yr]["orgs"])
        apps_in_yr = len(yearly_dict[yr]["applications"])
        tot_act = papers_in_yr + patents_in_yr

        # YoY Research Growth
        yoy_rg: Optional[float] = None
        yoy_notes = []
        if idx > 0:
            if prev_research > 0:
                yoy_rg = round(((papers_in_yr - prev_research) / prev_research) * 100.0, 1)
            elif prev_research == 0 and papers_in_yr > 0:
                yoy_notes.append(f"Research emerged ({papers_in_yr} papers)")
            elif prev_research == 0 and papers_in_yr == 0:
                yoy_notes.append("No research activity")

        # YoY Patent Growth
        yoy_pg: Optional[float] = None
        if idx > 0:
            if prev_patent > 0:
                yoy_pg = round(((patents_in_yr - prev_patent) / prev_patent) * 100.0, 1)
            elif prev_patent == 0 and patents_in_yr > 0:
                yoy_notes.append(f"Patent filings emerged ({patents_in_yr} patents)")
            elif prev_patent == 0 and patents_in_yr == 0:
                yoy_notes.append("No patent activity")

        prev_research = papers_in_yr
        prev_patent = patents_in_yr

        yearly_evidence.append(
            YearlyEvidenceItem(
                year=yr,
                research_count=papers_in_yr,
                patent_count=patents_in_yr,
                organization_count=orgs_in_yr,
                application_count=apps_in_yr,
                total_activity=tot_act,
                yoy_research_growth=yoy_rg,
                yoy_patent_growth=yoy_pg,
                yoy_growth_notes="; ".join(yoy_notes) if yoy_notes else None,
            )
        )

    # 4. Extract Global Distinct Entities
    all_distinct_orgs: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "patent_count": 0, "research_count": 0, "funding_count": 0, "first_year": 9999, "last_year": 0
    })

    for pt in matched_patents:
        if pt.organization and pt.organization.strip():
            org_name = pt.organization.strip()
            all_distinct_orgs[org_name]["patent_count"] += 1
            if pt.year:
                all_distinct_orgs[org_name]["first_year"] = min(all_distinct_orgs[org_name]["first_year"], pt.year)
                all_distinct_orgs[org_name]["last_year"] = max(all_distinct_orgs[org_name]["last_year"], pt.year)

    for p in matched_papers:
        if p.organization and p.organization.strip():
            org_name = p.organization.strip()
            all_distinct_orgs[org_name]["research_count"] += 1
            if p.year:
                all_distinct_orgs[org_name]["first_year"] = min(all_distinct_orgs[org_name]["first_year"], p.year)
                all_distinct_orgs[org_name]["last_year"] = max(all_distinct_orgs[org_name]["last_year"], p.year)

    for f in matched_funding:
        if f.organization and f.organization.strip():
            org_name = f.organization.strip()
            all_distinct_orgs[org_name]["funding_count"] += 1
            if f.year:
                all_distinct_orgs[org_name]["first_year"] = min(all_distinct_orgs[org_name]["first_year"], f.year)
                all_distinct_orgs[org_name]["last_year"] = max(all_distinct_orgs[org_name]["last_year"], f.year)

    all_distinct_applications: Set[str] = set()
    for yr in active_years:
        all_distinct_applications.update(yearly_dict[yr]["applications"])

    # 5. Multi-Year Metric Calculations & Indicator Normalization
    num_years = len(active_years)
    total_papers_count = len(matched_papers)
    total_patents_count = len(matched_patents)
    total_funding_count = len(matched_funding)
    total_orgs_count = len(all_distinct_orgs)
    total_apps_count = len(all_distinct_applications)

    # Check for insufficient evidence early
    is_insufficient_evidence = (total_papers_count + total_patents_count) < 2 or num_years < 2

    # Research Growth Indicator (Weight = 25%)
    rg_series = [(y, len(yearly_dict[y]["papers"])) for y in active_years]
    rg_slope = calculate_linear_slope(rg_series) if num_years >= 2 else 0.0
    mean_papers = (total_papers_count / num_years) if num_years > 0 else 0.0
    norm_rg_slope = rg_slope / (mean_papers + 1e-4) if mean_papers > 0 else 0.0

    recent_rg_yoys = [item.yoy_research_growth for item in yearly_evidence if item.yoy_research_growth is not None]
    avg_recent_rg = (sum(recent_rg_yoys) / len(recent_rg_yoys)) if recent_rg_yoys else 0.0

    if num_years < 2 or total_papers_count == 0:
        rg_score = 0.0
        rg_level = "Insufficient Data"
        rg_trend = "Insufficient Data"
        rg_interp = "Insufficient historical research records across connected sources to compute multi-year growth trend."
    else:
        base_rg = 50.0 + (norm_rg_slope * 35.0) + (min(max(avg_recent_rg, -50.0), 100.0) * 0.25)
        rg_score = round(min(100.0, max(0.0, base_rg)), 1)
        if norm_rg_slope > 0.10 or avg_recent_rg > 15.0:
            rg_level = "High" if rg_score >= 70.0 else "Medium"
            rg_trend = "Increasing"
            rg_interp = f"Observed research publications show positive multi-year expansion across connected sources (slope: +{rg_slope:.2f}/yr, avg YoY: {avg_recent_rg:+.1f}%)."
        elif norm_rg_slope < -0.10 or avg_recent_rg < -10.0:
            rg_level = "Low"
            rg_trend = "Declining"
            rg_interp = f"Observed research publications show a contraction over the analysed period (slope: {rg_slope:.2f}/yr)."
        else:
            rg_level = "Medium"
            rg_trend = "Stable"
            rg_interp = f"Research publication activity has maintained steady volume across active years."

    # Patent Growth Indicator (Weight = 25%)
    pg_series = [(y, len(yearly_dict[y]["patents"])) for y in active_years]
    pg_slope = calculate_linear_slope(pg_series) if num_years >= 2 else 0.0
    mean_patents = (total_patents_count / num_years) if num_years > 0 else 0.0
    norm_pg_slope = pg_slope / (mean_patents + 1e-4) if mean_patents > 0 else 0.0

    recent_pg_yoys = [item.yoy_patent_growth for item in yearly_evidence if item.yoy_patent_growth is not None]
    avg_recent_pg = (sum(recent_pg_yoys) / len(recent_pg_yoys)) if recent_pg_yoys else 0.0

    if num_years < 2 or total_patents_count == 0:
        pg_score = 0.0
        pg_level = "Insufficient Data"
        pg_trend = "Insufficient Data"
        pg_interp = "Insufficient historical patent filings across connected patent sources to establish multi-year patent momentum."
    else:
        base_pg = 50.0 + (norm_pg_slope * 35.0) + (min(max(avg_recent_pg, -50.0), 100.0) * 0.25)
        pg_score = round(min(100.0, max(0.0, base_pg)), 1)
        if norm_pg_slope > 0.10 or avg_recent_pg > 15.0:
            pg_level = "High" if pg_score >= 70.0 else "Medium"
            pg_trend = "Increasing"
            pg_interp = f"Patent filings demonstrate growing technological IP protection (slope: +{pg_slope:.2f}/yr, avg YoY: {avg_recent_pg:+.1f}%)."
        elif norm_pg_slope < -0.10 or avg_recent_pg < -10.0:
            pg_level = "Low"
            pg_trend = "Declining"
            pg_interp = f"Patent filings show declining momentum across recent filing intervals."
        else:
            pg_level = "Medium"
            pg_trend = "Stable"
            pg_interp = f"Patent filing activity shows stable continuation across the observed timeline."

    # Research Activity Indicator (Weight = 15%)
    if total_papers_count == 0:
        ra_score = 0.0
        ra_level = "Low"
        ra_trend = "Insufficient Data"
        ra_interp = "No empirical research papers recorded across connected sources for this query."
    else:
        volume_factor = math.log(1.0 + total_papers_count) / math.log(1.0 + max(corpus_stats["max_papers"], 50.0))
        persistence_factor = min(1.0, num_years / 5.0)
        ra_score = round(min(100.0, (volume_factor * 75.0) + (persistence_factor * 25.0)), 1)
        ra_level = "High" if ra_score >= 65.0 else ("Medium" if ra_score >= 35.0 else "Low")
        ra_trend = rg_trend if rg_trend != "Insufficient Data" else "Stable"
        ra_interp = f"Empirical research volume includes {total_papers_count} unique verified papers spanning {num_years} active years."

    # Patent Activity Indicator (Weight = 15%)
    if total_patents_count == 0:
        pa_score = 0.0
        pa_level = "Low"
        pa_trend = "Insufficient Data"
        pa_interp = "No empirical patent filings recorded across connected patent sources."
    else:
        volume_factor = math.log(1.0 + total_patents_count) / math.log(1.0 + max(corpus_stats["max_patents"], 40.0))
        persistence_factor = min(1.0, num_years / 5.0)
        pa_score = round(min(100.0, (volume_factor * 75.0) + (persistence_factor * 25.0)), 1)
        pa_level = "High" if pa_score >= 65.0 else ("Medium" if pa_score >= 35.0 else "Low")
        pa_trend = pg_trend if pg_trend != "Insufficient Data" else "Stable"
        pa_interp = f"Verified intellectual property volume includes {total_patents_count} unique patent records."

    # Organization Participation Indicator (Weight = 10%)
    org_series = [(y, len(yearly_dict[y]["orgs"])) for y in active_years]
    org_slope = calculate_linear_slope(org_series) if num_years >= 2 else 0.0

    if total_orgs_count == 0:
        org_score = 0.0
        org_level = "Low"
        org_trend = "Insufficient Data"
        org_interp = "No verified organizational affiliations or assignees identified in evidence records."
    else:
        org_norm = math.log(1.0 + total_orgs_count) / math.log(1.0 + max(corpus_stats["max_orgs"], 15.0))
        org_score = round(min(100.0, org_norm * 90.0 + (10.0 if org_slope > 0 else 0.0)), 1)
        if org_slope > 0.10:
            org_level = "Increasing"
            org_trend = "Increasing"
            org_interp = f"{total_orgs_count} participating organizations identified with expanding yearly participation."
        elif org_slope < -0.10:
            org_level = "Declining"
            org_trend = "Declining"
            org_interp = f"{total_orgs_count} organizations identified, with contracting recent activity."
        else:
            org_level = "Stable"
            org_trend = "Stable"
            org_interp = f"{total_orgs_count} unique organizations actively publishing, filing patents, or receiving funding."

    # Technology / Application Diversity Indicator (Weight = 10%)
    app_series = [(y, len(yearly_dict[y]["applications"])) for y in active_years]
    app_slope = calculate_linear_slope(app_series) if num_years >= 2 else 0.0

    if total_apps_count == 0:
        app_score = 0.0
        app_level = "Limited Evidence"
        app_trend = "Limited Evidence"
        app_interp = "No distinct application domains identified in available abstracts and classifications."
    else:
        app_norm = math.log(1.0 + total_apps_count) / math.log(1.0 + max(corpus_stats["max_domains"], 15.0))
        app_score = round(min(100.0, app_norm * 100.0), 1)
        if app_slope > 0.10:
            app_level = "Increasing"
            app_trend = "Increasing"
            app_interp = f"{total_apps_count} distinct application and scientific subdomains identified with expanding breadth."
        elif app_slope < -0.10:
            app_level = "Declining"
            app_trend = "Declining"
            app_interp = f"{total_apps_count} domains identified with narrowing focus over time."
        else:
            app_level = "Stable"
            app_trend = "Stable"
            app_interp = f"{total_apps_count} application areas identified across research and patents."

    # 6. Build Indicator Map with Exact Weights (25%, 25%, 15%, 15%, 10%, 10%)
    indicators: Dict[str, IndicatorMetric] = {
        "research_growth": IndicatorMetric(
            name="Research Growth",
            weight=0.25,
            weight_percentage="25%",
            raw_value=round(rg_slope, 2),
            raw_unit="papers/year",
            normalized_score=rg_score,
            weighted_score=round(rg_score * 0.25, 2),
            level=rg_level,
            trend_direction=rg_trend,
            interpretation=rg_interp,
        ),
        "patent_growth": IndicatorMetric(
            name="Patent Growth",
            weight=0.25,
            weight_percentage="25%",
            raw_value=round(pg_slope, 2),
            raw_unit="patents/year",
            normalized_score=pg_score,
            weighted_score=round(pg_score * 0.25, 2),
            level=pg_level,
            trend_direction=pg_trend,
            interpretation=pg_interp,
        ),
        "research_activity": IndicatorMetric(
            name="Research Activity",
            weight=0.15,
            weight_percentage="15%",
            raw_value=float(total_papers_count),
            raw_unit="papers",
            normalized_score=ra_score,
            weighted_score=round(ra_score * 0.15, 2),
            level=ra_level,
            trend_direction=ra_trend,
            interpretation=ra_interp,
        ),
        "patent_activity": IndicatorMetric(
            name="Patent Activity",
            weight=0.15,
            weight_percentage="15%",
            raw_value=float(total_patents_count),
            raw_unit="patents",
            normalized_score=pa_score,
            weighted_score=round(pa_score * 0.15, 2),
            level=pa_level,
            trend_direction=pa_trend,
            interpretation=pa_interp,
        ),
        "organization_participation": IndicatorMetric(
            name="Organization Participation",
            weight=0.10,
            weight_percentage="10%",
            raw_value=float(total_orgs_count),
            raw_unit="organizations",
            normalized_score=org_score,
            weighted_score=round(org_score * 0.10, 2),
            level=org_level,
            trend_direction=org_trend,
            interpretation=org_interp,
        ),
        "application_diversity": IndicatorMetric(
            name="Technology/Application Diversity",
            weight=0.10,
            weight_percentage="10%",
            raw_value=float(total_apps_count),
            raw_unit="domains",
            normalized_score=app_score,
            weighted_score=round(app_score * 0.10, 2),
            level=app_level,
            trend_direction=app_trend,
            interpretation=app_interp,
        ),
    }

    # 7. Total Weighted Maturity Score
    w_rg = indicators["research_growth"].weighted_score
    w_pg = indicators["patent_growth"].weighted_score
    w_ra = indicators["research_activity"].weighted_score
    w_pa = indicators["patent_activity"].weighted_score
    w_org = indicators["organization_participation"].weighted_score
    w_app = indicators["application_diversity"].weighted_score
    total_weighted_sum = round(w_rg + w_pg + w_ra + w_pa + w_org + w_app, 2)

    weighted_score = WeightedScoreBreakdown(
        research_growth=w_rg,
        patent_growth=w_pg,
        research_activity=w_ra,
        patent_activity=w_pa,
        organization_participation=w_org,
        application_diversity=w_app,
        total=total_weighted_sum,
    )

    # 8. Independent Adoption Analysis (Decoupled from maturity weights)
    commercial_orgs = [
        org for org in all_distinct_orgs.keys()
        if not any(edu in org.lower() for edu in ["univ", "college", "institute of technology", "school", "faculty", "academy"])
    ]
    commercial_funding_count = len([
        f for f in matched_funding
        if any(w in (f.title or "").lower() for w in ["commercial", "sbir", "sttr", "industry", "transition"])
    ])

    if total_patents_count == 0 and len(commercial_orgs) == 0:
        adoption_level = "Insufficient Evidence"
        adoption_trend = "Insufficient Evidence"
        adoption_summary = "No verifiable corporate deployment or commercial patent assignees identified across sources."
        adoption_notes = "Adoption cannot be evaluated without commercial assignee or deployment evidence."
    elif len(commercial_orgs) >= 4 and total_patents_count >= 15:
        adoption_level = "High"
        adoption_trend = "Increasing"
        adoption_summary = f"Strong commercial footprint with {len(commercial_orgs)} industrial entities actively filing IP or participating in translational programs."
        adoption_notes = "Evidence indicates multi-enterprise commercial investment and operational deployment."
    elif len(commercial_orgs) >= 1 or total_patents_count >= 2:
        adoption_level = "Moderate" if len(commercial_orgs) >= 2 else "Low"
        adoption_trend = "Nascent" if len(commercial_orgs) <= 1 else "Increasing"
        adoption_summary = f"Early commercial participation from {len(commercial_orgs)} industry entities (e.g. {', '.join(list(commercial_orgs)[:3])})."
        adoption_notes = "Commercial adoption is nascent compared to academic research exploration."
    else:
        adoption_level = "Low"
        adoption_trend = "Nascent"
        adoption_summary = "Limited commercial adoption evidence in connected multi-source records."
        adoption_notes = "Evidence shows preliminary research activity without broad industry adoption."

    adoption = AdoptionAnalysis(
        level=adoption_level,
        trend=adoption_trend,
        status_summary=adoption_summary,
        active_commercial_organizations=commercial_orgs[:10],
        identified_applications=sorted(list(all_distinct_applications))[:10],
        commercial_funding_count=commercial_funding_count,
        evidence_notes=adoption_notes,
    )

    # 9. Data-Driven Stage Classification & Explainability
    supporting_signals: List[str] = []
    limiting_signals: List[str] = []
    conflicting_signals: List[str] = []

    if is_insufficient_evidence:
        classification = "Insufficient Evidence"
        confidence = "Insufficient"
        reason = (
            f"Connected multi-source repositories contain fewer than 2 distinct historical records or active years "
            f"for query '{target_query}' ({total_papers_count} unique papers, {total_patents_count} unique patents). "
            f"A reliable maturity stage cannot be determined without sufficient empirical evidence."
        )
        limiting_signals.append("Fewer than 2 active observation years across all data sources")
        limiting_signals.append("Insufficient publication and patent records")
    elif rg_trend == "Declining" and (pg_trend == "Declining" or total_patents_count == 0) and num_years >= 3:
        classification = "Declining"
        confidence = "Moderate" if num_years >= 3 else "Limited"
        reason = (
            f"Available multi-source evidence indicates a persistent multi-year contraction in research and patent activity "
            f"across {num_years} active years. Research growth slope is negative ({rg_slope:.2f}/yr) and "
            f"organizational participation is shrinking."
        )
        supporting_signals.append(f"Negative research trajectory ({rg_slope:.2f} papers/yr)")
        supporting_signals.append("Contracting publication volume across multiple consecutive periods")
    elif (
        num_years >= 3
        and total_papers_count >= 8
        and total_patents_count >= 5
        and total_orgs_count >= 3
        and total_apps_count >= 3
        and (rg_trend in ["Stable", "Increasing"] or rg_score >= 50.0)
        and (pg_trend in ["Stable", "Increasing"] or pg_score >= 50.0)
    ):
        classification = "Mature"
        confidence = "High" if (num_years >= 4 and total_papers_count >= 15) else "Moderate"
        reason = (
            f"The technology demonstrates characteristics of a Mature domain: substantial historical persistence "
            f"spanning {num_years} years ({active_years[0]}-{active_years[-1]}), significant sustained volume "
            f"({total_papers_count} unique papers, {total_patents_count} unique patents), {total_orgs_count} participating organizations, "
            f"and broad application diversity ({total_apps_count} domains)."
        )
        supporting_signals.append(f"Multi-year foundation across {num_years} years ({active_years[0]}-{active_years[-1]})")
        supporting_signals.append(f"High cumulative volume ({total_papers_count} papers, {total_patents_count} patents)")
        supporting_signals.append(f"Broad organizational base ({total_orgs_count} organizations)")
        if adoption.level == "Low":
            limiting_signals.append("Commercial market adoption evidence remains comparatively lower than technical maturity")
    elif (
        num_years >= 2
        and (total_papers_count >= 4 or total_patents_count >= 3)
        and (rg_trend == "Increasing" or pg_trend == "Increasing" or total_weighted_sum >= 40.0)
    ):
        classification = "Developing"
        confidence = "Moderate" if num_years >= 3 else "Limited"
        reason = (
            f"Research and patent signals show sustained expansion across {num_years} years, with "
            f"{total_papers_count} publications and {total_patents_count} patent filings. "
            f"Organizational participation ({total_orgs_count} orgs) and application diversity "
            f"({total_apps_count} areas) are expanding."
        )
        supporting_signals.append(f"Sustained research expansion ({total_papers_count} papers across {num_years} years)")
        if total_patents_count > 0:
            supporting_signals.append(f"Active IP filings ({total_patents_count} patents)")
        if total_orgs_count >= 2:
            supporting_signals.append(f"Growing institutional base ({total_orgs_count} organizations)")

        if total_patents_count == 0 and total_papers_count >= 5:
            conflicting_signals.append(
                "Research publication volume is substantial, but commercial patent filings are currently absent. "
                "The technology is actively progressing in academic/scientific discovery with nascent commercial IP translation."
            )
        elif total_papers_count == 0 and total_patents_count >= 3:
            conflicting_signals.append(
                "Patent filings show industry IP activity, but academic publication volume in connected records is limited."
            )
        if adoption.level in ["Low", "Insufficient Evidence"]:
            limiting_signals.append("Available market adoption evidence remains low/nascent")
    else:
        classification = "Emerging"
        confidence = "Limited" if num_years <= 2 else "Moderate"
        reason = (
            f"The technology exhibits characteristics of an Emerging domain: recent or exploratory activity "
            f"({total_papers_count} papers, {total_patents_count} patents across {num_years} active years), "
            f"growing initial research interest, and early-stage organizational footprint ({total_orgs_count} organizations)."
        )
        supporting_signals.append(f"Early-stage exploratory research ({total_papers_count} papers)")
        if total_patents_count > 0:
            supporting_signals.append(f"Initial patent filings ({total_patents_count} patents)")
        limiting_signals.append("Limited historical time span and early organizational participation")
        if adoption.level in ["Low", "Insufficient Evidence"]:
            limiting_signals.append("Adoption is in exploratory/nascent stage")

    stage = StageClassification(
        classification=classification,
        confidence=confidence,
        reason=reason,
        supporting_signals=supporting_signals,
        limiting_signals=limiting_signals,
        conflicting_signals=conflicting_signals,
    )

    # 10. Coverage & Multi-Source Provenance Summary
    span_str = f"{active_years[0]}-{active_years[-1]}" if active_years else "No historical span"
    if total_papers_count >= 5 and total_patents_count >= 3 and num_years >= 3:
        cov_status = "Strong"
        cov_exp = f"Comprehensive multi-year coverage across research papers, patent filings, organizations, and funding ({span_str})."
    elif (total_papers_count + total_patents_count) >= 3 and num_years >= 2:
        cov_status = "Partial"
        cov_exp = f"Moderate empirical evidence available across {num_years} observation years."
    elif (total_papers_count + total_patents_count) >= 1:
        cov_status = "Limited"
        cov_exp = "Sparse empirical evidence with limited historical observation points."
    else:
        cov_status = "Insufficient"
        cov_exp = "No matching records found in connected research, patent, or funding databases."

    # Combine all source counts
    all_source_counts: Dict[str, int] = {}
    for src, cnt in research_dedup.source_counts.items():
        all_source_counts[src] = all_source_counts.get(src, 0) + cnt
    for src, cnt in patents_dedup.source_counts.items():
        all_source_counts[src] = all_source_counts.get(src, 0) + cnt
    for src, cnt in funding_dedup.source_counts.items():
        all_source_counts[src] = all_source_counts.get(src, 0) + cnt

    source_status_metrics = [
        SourceBreakdownMetric(
            source_name=s["source_name"],
            source_type=s["source_type"],
            status=s["status"],
            records_count=all_source_counts.get(s["source_name"], 0),
            requires_credentials=s["requires_credentials"],
            credentials_configured=s["credentials_configured"],
            error_message=s.get("error_message"),
        )
        for s in source_results.get("source_status", [])
    ]

    total_duplicates = (
        research_dedup.duplicates_removed
        + patents_dedup.duplicates_removed
        + funding_dedup.duplicates_removed
    )

    # Distinguish Indian Patent evidence vs Global Patent evidence
    indian_patents_list = [
        pt for pt in matched_patents
        if (pt.country and pt.country.upper() == "IN")
        or (pt.source and ("india" in pt.source.lower() or "inpass" in pt.source.lower()))
        or (pt.patent_number and pt.patent_number.upper().startswith("IN"))
    ]
    global_patents_list = [pt for pt in matched_patents if pt not in indian_patents_list]
    indian_patent_count = len(indian_patents_list)
    global_patent_count = len(global_patents_list)

    # Extract distinct patent families
    patent_families_set = set()
    for pt in matched_patents:
        if pt.family_id:
            patent_families_set.add(pt.family_id)
        elif pt.patent_number:
            # Group by base publication / application prefix
            patent_families_set.add(re.sub(r"[A-Z0-9]$", "", pt.patent_number))
        else:
            patent_families_set.add(pt.id)
    unique_patent_families = len(patent_families_set) if matched_patents else 0

    coverage = EvidenceCoverage(
        status=cov_status,
        historical_span=span_str,
        total_active_years=num_years,
        total_papers=total_papers_count,
        total_patents=total_patents_count,
        total_organizations=total_orgs_count,
        total_applications=total_apps_count,
        total_funding=total_funding_count,
        unique_research_count=research_dedup.unique_count,
        unique_patent_count=patents_dedup.unique_count,
        unique_funding_count=funding_dedup.unique_count,
        indian_patent_count=indian_patent_count,
        global_patent_count=global_patent_count,
        unique_patent_families=unique_patent_families,
        duplicates_removed=total_duplicates,
        source_coverage=all_source_counts,
        source_statuses=source_status_metrics,
        explanation=cov_exp,
    )

    # 11. Format Evidence Records (Provenance Items)
    evidence_papers = [
        EvidencePaperItem(
            id=p.id,
            source=p.source,
            source_record_id=p.source_record_id,
            title=p.title,
            publication_year=p.year,
            citation_count=p.citation_count or 0,
            authors=p.authors_or_inventors,
            organization=p.organization,
            doi=p.doi,
            url=p.url,
            research_domain=p.domain_or_classification,
            matching_method=p.matching_method.value if hasattr(p.matching_method, "value") else str(p.matching_method),
        ).model_dump()
        for p in matched_papers[:35]
    ]

    evidence_patents = [
        EvidencePatentItem(
            id=pt.id,
            source=pt.source,
            source_record_id=pt.source_record_id,
            publication_number=pt.patent_number,
            patent_number=pt.patent_number,
            title=pt.title,
            filing_year=pt.year,
            filing_date=pt.exact_date,
            assignee=pt.organization,
            organization=pt.organization,
            classification=pt.domain_or_classification,
            technology_domain=pt.domain_or_classification,
            country=pt.country or ("IN" if "india" in (pt.source or "").lower() or (pt.patent_number or "").upper().startswith("IN") else "GLOBAL"),
            family_id=pt.family_id,
            application_number=pt.application_number,
            url=pt.url,
            citation_count=pt.citation_count or 0,
            relevance_score=pt.relevance_score,
            matching_method=pt.matching_method.value if hasattr(pt.matching_method, "value") else str(pt.matching_method),
        ).model_dump()
        for pt in matched_patents[:35]
    ]

    evidence_funding = [
        EvidenceFundingItem(
            id=f.id,
            source=f.source,
            source_record_id=f.source_record_id,
            title=f.title,
            agency=f.organization,
            organization=f.organization,
            funding_category=f.domain_or_classification,
            open_year=f.year,
            total_funding=f.funding_amount,
            url=f.url,
            matching_method=f.matching_method.value if hasattr(f.matching_method, "value") else str(f.matching_method),
        ).model_dump()
        for f in matched_funding[:25]
    ]

    org_list = [
        OrganizationBreakdownItem(
            name=k,
            patent_count=v["patent_count"],
            research_count=v["research_count"],
            funding_count=v["funding_count"],
            first_seen_year=v["first_year"] if v["first_year"] != 9999 else None,
            last_seen_year=v["last_year"] if v["last_year"] != 0 else None,
        ).model_dump()
        for k, v in sorted(all_distinct_orgs.items(), key=lambda x: (x[1]["patent_count"] + x[1]["research_count"]), reverse=True)
    ]

    # Domain summary objects
    research_summary = {
        "total": total_papers_count,
        "yearly_activity": [{"year": y.year, "count": y.research_count, "growth": y.yoy_research_growth} for y in yearly_evidence],
        "growth_slope": round(rg_slope, 2),
        "trend": rg_trend,
        "total_citations": sum(p.citation_count or 0 for p in matched_papers),
    }

    patents_summary = {
        "total": total_patents_count,
        "yearly_activity": [{"year": y.year, "count": y.patent_count, "growth": y.yoy_patent_growth} for y in yearly_evidence],
        "growth_slope": round(pg_slope, 2),
        "trend": pg_trend,
        "total_citations": sum(pt.citation_count or 0 for pt in matched_patents),
    }

    funding_summary = {
        "total": total_funding_count,
        "yearly_activity": [{"year": y.year, "count": len(yearly_dict[y.year]["funding"])} for y in yearly_evidence],
        "total_amount": sum(f.funding_amount or 0.0 for f in matched_funding),
    }

    organizations_summary = {
        "total": total_orgs_count,
        "yearly_activity": [{"year": y.year, "count": y.organization_count} for y in yearly_evidence],
        "trend": org_trend,
        "top_organizations": [o["name"] for o in org_list[:5]],
    }

    applications_summary = {
        "total": total_apps_count,
        "areas": sorted(list(all_distinct_applications)),
        "trend": app_trend,
    }

    return TechnologyAnalysisResponse(
        technology=target_query,
        normalized_query=" ".join(concept_terms),
        technology_id=str(technology_record.id) if technology_record else None,
        description=technology_record.description if technology_record else None,
        technology_domain=technology_record.technology_domain if technology_record else None,
        yearly_evidence=yearly_evidence,
        research=research_summary,
        patents=patents_summary,
        funding=funding_summary,
        organizations=organizations_summary,
        applications=applications_summary,
        adoption=adoption,
        indicators=indicators,
        weighted_score=weighted_score,
        stage=stage,
        coverage=coverage,
        evidence_records={
            "papers": evidence_papers,
            "patents": evidence_patents,
            "funding": evidence_funding,
            "organizations": org_list,
        },
    )

