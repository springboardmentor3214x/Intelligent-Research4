import math
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.technology import Technology
from backend.app.models.technology_activity import TechnologyActivity
from backend.app.schemas.technology import (
    TechnologyAnalysisResponse,
    TechnologyResponse,
    TechnologyActivityResponse,
    TechnologyActivitySummaryResponse,
    TechnologySummaryItem,
    TechnologyActivityItem,
    TechnologyLandscapeResponse,
    TechnologyLandscapeNode,
    TechnologyLandscapeCluster,
)
from backend.app.services.technology_service import sync_technologies
from backend.app.services.technology_analysis_service import analyze_technology_intelligence


TECHNOLOGY_DISTINCT_COLORS = {
    "Medical Imaging AI": "#10b981",       # Emerald
    "Artificial Intelligence": "#0ea5e9", # Electric Sky Blue
    "Generative AI": "#ec4899",           # Hot Pink
    "Deep Learning": "#8b5cf6",           # Electric Purple
    "Machine Learning": "#3b82f6",        # Royal Blue
    "Computer Vision": "#06b6d4",         # Neon Cyan
    "Natural Language Processing": "#a855f7", # Vivid Violet
    "Robotics": "#f97316",                # Bright Orange
    "Biotechnology": "#14b8a6",           # Teal Green
    "Quantum Computing": "#6366f1",       # Indigo
    "Clean Energy": "#84cc16",            # Bright Lime
    "Edge AI": "#eab308",                 # Golden Amber
    "Cybersecurity": "#f43f5e",           # Ruby Red
    "Autonomous Vehicles": "#d946ef",     # Fuchsia
}


def get_distinct_tech_color(tech_name: str, index: int) -> str:
    if tech_name in TECHNOLOGY_DISTINCT_COLORS:
        return TECHNOLOGY_DISTINCT_COLORS[tech_name]
    palette = [
        "#0ea5e9", "#ec4899", "#10b981", "#f97316", "#8b5cf6",
        "#06b6d4", "#a855f7", "#14b8a6", "#f43f5e", "#84cc16",
        "#eab308", "#6366f1", "#d946ef", "#3b82f6"
    ]
    return palette[index % len(palette)]


CLUSTER_DEFINITIONS = [
    {
        "cluster_id": "cluster_1",
        "cluster_name": "Cluster 1 — AI Core & Foundation Models",
        "color": "#38bdf8",
        "keywords": ["artificial intelligence", "machine learning", "deep learning", "generative ai", "natural language processing"],
    },
    {
        "cluster_id": "cluster_2",
        "cluster_name": "Cluster 2 — Life Sciences & Health AI",
        "color": "#10b981",
        "keywords": ["medical imaging ai", "biotechnology", "genomics", "health"],
    },
    {
        "cluster_id": "cluster_3",
        "cluster_name": "Cluster 3 — Physical Autonomy & Edge Computing",
        "color": "#f59e0b",
        "keywords": ["robotics", "edge ai", "computer vision", "sensors"],
    },
    {
        "cluster_id": "cluster_4",
        "cluster_name": "Cluster 4 — Quantum & Advanced Infrastructure",
        "color": "#a855f7",
        "keywords": ["quantum computing", "clean energy", "cybersecurity", "crypto", "solar"],
    },
]


router = APIRouter(
    prefix="/technologies",
    tags=["Technology Intelligence"],
)


@router.get("/sources/status")
def get_sources_status():
    """
    Return operational status, credential configurations, and capabilities for all
    multi-source technology intelligence data adapters.
    """
    from backend.app.services.sources.source_registry import source_registry
    reports = source_registry.get_status_reports()
    return [r.model_dump() for r in reports]


@router.post("/sync")
def sync_technology_data(
    db: Session = Depends(get_db),
):
    """
    Build and update Technology Intelligence from Research Papers, Patents, and Funding.
    """
    technologies = sync_technologies(db)
    return {
        "message": "Technology data synchronized successfully",
        "technologies_found": len(technologies),
    }



@router.get("", response_model=List[TechnologyResponse])
def get_technologies(
    db: Session = Depends(get_db),
):
    """
    Return all technology intelligence records ordered by emerging score.
    """
    technologies = (
        db.query(Technology)
        .order_by(Technology.emerging_score.desc().nullslast())
        .all()
    )
    return technologies


@router.get("/emerging", response_model=List[TechnologyResponse])
def get_emerging_technologies(
    db: Session = Depends(get_db),
):
    """
    Return technologies in Emerging or Developing stages.
    """
    technologies = (
        db.query(Technology)
        .filter(
            Technology.emerging_status.in_(
                ["Emerging", "Growing", "Developing"]
            )
        )
        .order_by(Technology.emerging_score.desc().nullslast())
        .all()
    )
    return technologies


@router.get("/search", response_model=List[TechnologyResponse])
def search_technologies(
    keyword: str = Query(
        ...,
        min_length=2,
        description="Technology name or domain",
    ),
    db: Session = Depends(get_db),
):
    """
    Search technologies by name or domain.
    """
    search_pattern = f"%{keyword}%"
    technologies = (
        db.query(Technology)
        .filter(
            (Technology.technology_name.ilike(search_pattern))
            | (Technology.technology_domain.ilike(search_pattern))
        )
        .order_by(Technology.emerging_score.desc().nullslast())
        .all()
    )
    return technologies


@router.get("/activity/summary", response_model=TechnologyActivitySummaryResponse)
def get_activity_summary(
    db: Session = Depends(get_db),
):
    """
    Return multi-year activity matrix for all tracked technologies.
    """
    technologies = (
        db.query(Technology)
        .order_by(Technology.technology_name.asc())
        .all()
    )

    result = []
    for technology in technologies:
        activity = (
            db.query(TechnologyActivity)
            .filter(TechnologyActivity.technology_id == technology.id)
            .order_by(TechnologyActivity.year.asc())
            .all()
        )
        activity_items = [
            TechnologyActivityItem(
                year=act.year,
                research_paper_count=act.research_paper_count,
                patent_count=act.patent_count,
                citation_count=act.citation_count,
                organization_count=act.organization_count,
                application_diversity=act.application_diversity,
            )
            for act in activity
        ]
        result.append(
            TechnologySummaryItem(
                technology_id=technology.id,
                technology_name=technology.technology_name,
                activity=activity_items,
            )
        )
    return TechnologyActivitySummaryResponse(technologies=result, technology_count=len(result))


@router.get("/landscape", response_model=TechnologyLandscapeResponse)
def get_technology_landscape(
    db: Session = Depends(get_db),
):
    """
    Return all real technology nodes with their 3D normalized coordinates (X: Research, Y: Patents, Z: Organizations),
    derived maturity stages, cluster memberships, and semantic relatedness.
    """
    technologies = (
        db.query(Technology)
        .order_by(Technology.technology_name.asc())
        .all()
    )

    if not technologies:
        return TechnologyLandscapeResponse(
            total_technologies=0,
            nodes=[],
            clusters=[],
            all_domains=[],
            all_stages=[],
        )

    # Collect raw metrics for each technology
    raw_nodes = []
    all_domains = set()
    all_stages = set()

    for tech in technologies:
        analysis = analyze_technology_intelligence(db, tech.technology_name)
        res_total = analysis.research.get("total", 0)
        pat_total = analysis.patents.get("total", 0)
        org_total = analysis.organizations.get("total", 0)
        citations = analysis.research.get("citations", 0) + analysis.patents.get("citations", 0)
        stage_cls = analysis.stage.classification
        trend_str = analysis.research.get("trend") or "Stable"
        score_val = analysis.weighted_score.total
        ev_count = (
            analysis.coverage.total_papers
            + analysis.coverage.total_patents
            + len(analysis.evidence_records.get("funding", []))
        )
        comm_orgs = analysis.adoption.active_commercial_organizations
        adopt_level = analysis.adoption.level
        domain_name = tech.technology_domain or "General Advanced Technology"

        all_domains.add(domain_name.split(",")[0].strip())
        all_stages.add(stage_cls)

        # Determine cluster
        tech_lower = tech.technology_name.lower()
        assigned_cluster = CLUSTER_DEFINITIONS[0]
        for cdef in CLUSTER_DEFINITIONS:
            if any(kw in tech_lower for kw in cdef["keywords"]):
                assigned_cluster = cdef
                break

        raw_nodes.append({
            "id": str(tech.id),
            "technology": tech.technology_name,
            "domain": domain_name,
            "research_activity": res_total,
            "patent_activity": pat_total,
            "organization_participation": org_total,
            "citation_count": citations,
            "maturity_stage": stage_cls,
            "trend": trend_str,
            "emerging_score": score_val,
            "evidence_count": ev_count,
            "cluster_id": assigned_cluster["cluster_id"],
            "cluster_name": assigned_cluster["cluster_name"],
            "cluster_color": assigned_cluster["color"],
            "active_commercial_organizations": comm_orgs,
            "adoption_level": adopt_level,
        })

    # Calculate min and max bounds for full-spread normalization
    min_research = min([n["research_activity"] for n in raw_nodes] + [0])
    max_research = max([n["research_activity"] for n in raw_nodes] + [1])

    min_patents = min([n["patent_activity"] for n in raw_nodes] + [0])
    max_patents = max([n["patent_activity"] for n in raw_nodes] + [1])

    min_orgs = min([n["organization_participation"] for n in raw_nodes] + [0])
    max_orgs = max([n["organization_participation"] for n in raw_nodes] + [1])

    # Power/Logarithmic transformation to prevent single outliers from squishing other nodes
    def log_scale(val, min_v, max_v, out_min, out_max):
        log_val = math.log1p(max(0, val - min_v))
        log_max = math.log1p(max(1, max_v - min_v))
        ratio = log_val / log_max if log_max > 0 else 0.5
        return out_min + ratio * (out_max - out_min)

    # Initial normalization across comfortable 3D space [-8.5, +8.5] for X/Z and [1.5, 7.5] for Y
    initial_positions = []
    num_nodes = len(raw_nodes)
    for i, n in enumerate(raw_nodes):
        # Base log-scaled position from empirical data
        bx = log_scale(n["research_activity"], min_research, max_research, -7.8, 7.8)
        by = log_scale(n["patent_activity"], min_patents, max_patents, 1.6, 7.4)
        bz = log_scale(n["organization_participation"], min_orgs, max_orgs, -7.8, 7.8)

        # Gentle angular dispersion around center based on technology index
        tech_angle = (i / max(1, num_nodes)) * (2.0 * math.pi)
        bx += math.cos(tech_angle) * 1.8
        bz += math.sin(tech_angle) * 1.8

        initial_positions.append({"x": bx, "y": by, "z": bz})

    # 3D Spring Relaxation / Collision Avoidance with hard bounding clamp
    min_distance = 4.8
    for _ in range(45):
        for i in range(len(initial_positions)):
            for j in range(i + 1, len(initial_positions)):
                p1 = initial_positions[i]
                p2 = initial_positions[j]
                dx = p2["x"] - p1["x"]
                dy = (p2["y"] - p1["y"]) * 1.4
                dz = p2["z"] - p1["z"]
                dist = math.sqrt(dx * dx + dy * dy + dz * dz)
                if dist < min_distance:
                    overlap = (min_distance - dist) * 0.5
                    if dist > 1e-4:
                        nx = dx / dist
                        ny = dy / dist
                        nz = dz / dist
                    else:
                        nx, ny, nz = 1.0, 0.5, 0.0
                    p1["x"] = max(-8.8, min(8.8, p1["x"] - nx * overlap))
                    p1["y"] = max(1.4, min(7.8, p1["y"] - ny * overlap * 0.3))
                    p1["z"] = max(-8.8, min(8.8, p1["z"] - nz * overlap))

                    p2["x"] = max(-8.8, min(8.8, p2["x"] + nx * overlap))
                    p2["y"] = max(1.4, min(7.8, p2["y"] + ny * overlap * 0.3))
                    p2["z"] = max(-8.8, min(8.8, p2["z"] + nz * overlap))

    # Build cluster groupings
    cluster_map = {c["cluster_id"]: [] for c in CLUSTER_DEFINITIONS}

    landscape_nodes = []
    for i, n in enumerate(raw_nodes):
        pos = initial_positions[i]
        norm_x = round(pos["x"], 2)
        norm_y = round(pos["y"], 2)
        norm_z = round(pos["z"], 2)
        tech_color = get_distinct_tech_color(n["technology"], i)

        cluster_map[n["cluster_id"]].append(n["technology"])

        landscape_nodes.append(
            TechnologyLandscapeNode(
                id=n["id"],
                technology=n["technology"],
                domain=n["domain"],
                research_activity=n["research_activity"],
                patent_activity=n["patent_activity"],
                organization_participation=n["organization_participation"],
                citation_count=n["citation_count"],
                maturity_stage=n["maturity_stage"],
                trend=n["trend"],
                emerging_score=n["emerging_score"],
                evidence_count=n["evidence_count"],
                cluster_id=n["cluster_id"],
                cluster_name=n["cluster_name"],
                cluster_color=tech_color,
                normalized_coordinates={
                    "x": norm_x,
                    "y": norm_y,
                    "z": norm_z,
                },
                related_technologies=[],
                active_commercial_organizations=n["active_commercial_organizations"],
                adoption_level=n["adoption_level"],
            )
        )

    # Populate related technologies from shared cluster and domain
    for node in landscape_nodes:
        cluster_peers = [t for t in cluster_map.get(node.cluster_id, []) if t != node.technology]
        node.related_technologies = cluster_peers[:4]

    # Build response cluster list
    clusters = []
    for cdef in CLUSTER_DEFINITIONS:
        techs_in_c = cluster_map.get(cdef["cluster_id"], [])
        if techs_in_c:
            clusters.append(
                TechnologyLandscapeCluster(
                    cluster_id=cdef["cluster_id"],
                    cluster_name=cdef["cluster_name"],
                    color=cdef["color"],
                    technology_count=len(techs_in_c),
                    technologies=techs_in_c,
                )
            )

    return TechnologyLandscapeResponse(
        total_technologies=len(landscape_nodes),
        max_bounds={
            "research_max": max_research,
            "patent_max": max_patents,
            "org_max": max_orgs,
        },
        nodes=landscape_nodes,
        clusters=clusters,
        all_domains=sorted(list(all_domains)),
        all_stages=sorted(list(all_stages)),
    )



@router.get("/analysis", response_model=TechnologyAnalysisResponse)
def get_custom_technology_analysis(
    query: str = Query(..., min_length=2, description="Technology name or concept query"),
    db: Session = Depends(get_db),
):
    """
    Perform on-demand, data-driven Technology Intelligence analysis for any custom query.
    Evaluates multi-year trajectory, 6 core maturity indicators, independent adoption,
    explainability, and evidence provenance.
    """
    analysis = analyze_technology_intelligence(db, query)
    return analysis


@router.get("/{technology_id}/analysis", response_model=TechnologyAnalysisResponse)
def get_technology_analysis_by_id(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return comprehensive analysis for an existing technology ID.
    """
    technology = db.query(Technology).filter(Technology.id == technology_id).first()
    if not technology:
        raise HTTPException(status_code=404, detail="Technology not found")

    analysis = analyze_technology_intelligence(db, str(technology_id))
    return analysis


@router.get("/{technology_id}/maturity")
def get_technology_maturity(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return explainable maturity indicator breakdown for a technology.
    """
    analysis = analyze_technology_intelligence(db, str(technology_id))
    return {
        "technology": analysis.technology,
        "stage": analysis.stage,
        "weighted_score": analysis.weighted_score,
        "indicators": analysis.indicators,
        "coverage": analysis.coverage,
    }


@router.get("/{technology_id}/trends")
def get_technology_trends(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return multi-year trajectory and trend metrics for a technology.
    """
    analysis = analyze_technology_intelligence(db, str(technology_id))
    return {
        "technology": analysis.technology,
        "yearly_evidence": analysis.yearly_evidence,
        "research_trend": analysis.research.get("trend"),
        "patent_trend": analysis.patents.get("trend"),
        "organization_trend": analysis.organizations.get("trend"),
        "application_trend": analysis.applications.get("trend"),
    }


@router.get("/{technology_id}/readiness")
def get_technology_readiness(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return readiness factors and weighted score breakdown.
    """
    analysis = analyze_technology_intelligence(db, str(technology_id))
    return {
        "technology": analysis.technology,
        "readiness_score": analysis.weighted_score.total,
        "indicators": analysis.indicators,
        "stage": analysis.stage,
    }


@router.get("/{technology_id}/adoption")
def get_technology_adoption(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return independent market adoption analysis for a technology.
    """
    analysis = analyze_technology_intelligence(db, str(technology_id))
    yearly_metrics = [
        {
            "year": y.year,
            "total_activity": y.total_activity,
            "publications": y.research_count,
            "patents": y.patent_count,
            "organizations": y.organization_count,
            "growth_rate": y.yoy_research_growth,
            "intensity_level": "Peak" if y.total_activity >= 8 else ("High" if y.total_activity >= 4 else ("Moderate" if y.total_activity >= 1 else "Low")),
        }
        for y in analysis.yearly_evidence
    ]
    return {
        "technology_id": str(technology_id),
        "technology": analysis.technology,
        "technology_name": analysis.technology,
        "adoption": analysis.adoption,
        "level": analysis.adoption.level,
        "trend": analysis.adoption.trend,
        "status_summary": analysis.adoption.status_summary,
        "evidence_notes": analysis.adoption.evidence_notes,
        "active_commercial_organizations": analysis.adoption.active_commercial_organizations,
        "yearly_metrics": yearly_metrics,
        "evidence": {
            "research_papers": analysis.coverage.total_papers,
            "patents": analysis.coverage.total_patents,
            "organizations": analysis.coverage.total_organizations,
            "applications": analysis.coverage.total_applications,
            "historical_span_years": analysis.coverage.total_active_years,
        }
    }


@router.get("/{technology_id}/activity", response_model=TechnologyActivityResponse)
def get_technology_activity(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return year-wise technology activity data.
    """
    technology = (
        db.query(Technology)
        .filter(Technology.id == technology_id)
        .first()
    )
    if not technology:
        raise HTTPException(
            status_code=404,
            detail="Technology not found",
        )

    activity = (
        db.query(TechnologyActivity)
        .filter(TechnologyActivity.technology_id == technology_id)
        .order_by(TechnologyActivity.year.asc())
        .all()
    )

    activity_items = [
        TechnologyActivityItem(
            year=act.year,
            research_paper_count=act.research_paper_count,
            patent_count=act.patent_count,
            citation_count=act.citation_count,
            organization_count=act.organization_count,
            application_diversity=act.application_diversity,
        )
        for act in activity
    ]

    return TechnologyActivityResponse(
        technology_id=technology.id,
        technology_name=technology.technology_name,
        activity=activity_items,
    )


@router.get("/{technology_id}", response_model=TechnologyResponse)
def get_technology(
    technology_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return details of a specific technology.
    """
    technology = (
        db.query(Technology)
        .filter(Technology.id == technology_id)
        .first()
    )
    if not technology:
        raise HTTPException(
            status_code=404,
            detail="Technology not found",
        )
    return technology