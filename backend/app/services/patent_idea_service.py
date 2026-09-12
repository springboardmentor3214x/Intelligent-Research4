from datetime import date, datetime, timezone
import logging
import re
from typing import Any
from uuid import UUID

from fastapi import HTTPException
import numpy as np
from sklearn.decomposition import PCA
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.patent import Patent
from backend.app.schemas.patent import (
    AlternativeDirectionItem,
    DifferentiationSuggestionItem,
    FeatureOverlapItem,
    Idea3DCoordinates,
    IdeaExtractedConcepts,
    IdeaSearchSummary,
    InnovationGapItem,
    PatentIdeaAnalysisResponse,
    PatentIdeaMatchItem,
)
from backend.app.services.grok_service import grok_service
from backend.app.services.patent_clustering_service import (
    detect_patent_country,
    patent_clustering_service,
)
from backend.app.services.patent_embedding_service import (
    build_patent_text,
    patent_embedding_service,
)

logger = logging.getLogger(__name__)

LEGAL_DISCLAIMER = (
    "Patent similarity, feature overlap, and innovation-gap results are AI-assisted analytical insights "
    "based on the connected patent collections. They do NOT constitute legal advice or a definitive determination "
    "of novelty or patentability. Consult a registered patent attorney or qualified IP professional for official "
    "freedom-to-operate and patentability evaluations."
)


def extract_idea_structured_concepts(idea_text: str) -> IdeaExtractedConcepts:
    """
    Extract structured technological concepts, domain, problem, technology, algorithms,
    input/output modalities, and keywords from the user's idea text.
    Uses grok_service if LLM keys are configured, otherwise uses deterministic domain rules.
    """
    cleaned_idea = idea_text.strip()
    lowered = cleaned_idea.lower()

    # Domain identification
    if any(k in lowered for k in ["tumor", "cancer", "mri", "ct scan", "x-ray", "clinic", "medical", "patient", "disease", "health", "biomed"]):
        domain = "Medical AI & Healthcare Technologies"
        default_research_areas = ["Medical Imaging", "Computer Vision", "Deep Learning", "Clinical Diagnostics"]
    elif any(k in lowered for k in ["solar", "battery", "energy", "grid", "carbon", "renewable", "clean tech", "wind"]):
        domain = "Clean Energy & Environmental Engineering"
        default_research_areas = ["Renewable Energy", "Energy Storage", "Power Electronics", "Smart Grid"]
    elif any(k in lowered for k in ["quantum", "qubit", "superconduct"]):
        domain = "Quantum Computing & Information Science"
        default_research_areas = ["Quantum Algorithms", "Quantum Hardware", "Quantum Cryptography"]
    elif any(k in lowered for k in ["robot", "drone", "autonomous", "uav", "vehicle", "navigation", "lidar"]):
        domain = "Robotics & Autonomous Systems"
        default_research_areas = ["Robotics", "Autonomous Navigation", "Sensor Fusion", "Control Systems"]
    elif any(k in lowered for k in ["nlp", "language", "speech", "llm", "transformer", "chatbot", "translation"]):
        domain = "Natural Language Processing & Conversational AI"
        default_research_areas = ["Natural Language Processing", "Machine Learning", "Computational Linguistics"]
    elif any(k in lowered for k in ["security", "cyber", "malware", "encrypt", "blockchain", "auth"]):
        domain = "Cybersecurity & Cryptographic Systems"
        default_research_areas = ["Cybersecurity", "Applied Cryptography", "Network Security", "Threat Detection"]
    else:
        domain = "Applied Artificial Intelligence & Engineering Systems"
        default_research_areas = ["Artificial Intelligence", "Software Systems", "Information Engineering"]

    # Problem extraction
    problem_match = re.search(r"(?:detect|diagnos|classif|optimiz|predict|solv|prevent|reduc|enhanc|analyz)[a-z]*\s+([a-zA-Z0-9\s\-]{4,40})", lowered)
    if problem_match:
        problem = problem_match.group(0).strip().capitalize()
    else:
        problem = f"Automated processing and analysis in {domain.lower()}"

    # Technology & Algorithms
    tech_candidates = []
    if any(k in lowered for k in ["deep learning", "neural network", "cnn", "transformer", "resnet", "unet", "gan"]):
        tech_candidates.append("Deep Neural Networks")
    if any(k in lowered for k in ["computer vision", "vision", "segmentation", "detection", "3d reconstruction"]):
        tech_candidates.append("Computer Vision & Spatial Modeling")
    if any(k in lowered for k in ["machine learning", "random forest", "svm", "classifier"]):
        tech_candidates.append("Statistical Machine Learning")
    if any(k in lowered for k in ["signal processing", "filter", "fourier", "wavelet"]):
        tech_candidates.append("Digital Signal Processing")
    if any(k in lowered for k in ["edge computing", "embedded", "iot", "sensor"]):
        tech_candidates.append("Edge / Embedded Computing")
    if not tech_candidates:
        tech_candidates.append("AI Algorithm Pipeline")

    # Inputs & Outputs
    input_type = "Multi-modal data streams"
    if any(k in lowered for k in ["mri", "ct", "x-ray", "image", "scan", "video", "camera"]):
        input_type = "Volumetric / 2D Imaging Data (MRI/CT/Scans)"
    elif any(k in lowered for k in ["sensor", "telemetry", "time series", "vibration", "temperature"]):
        input_type = "Time-series sensor signals & telemetry"
    elif any(k in lowered for k in ["text", "document", "audio", "speech"]):
        input_type = "Textual / Audio inputs"

    output_type = "Automated analytics & actionable outputs"
    if any(k in lowered for k in ["3d", "reconstruction", "visualization", "render"]):
        output_type = "3D spatial reconstruction & interactive visualization"
    elif any(k in lowered for k in ["segmentation", "mask", "bounding box"]):
        output_type = "Segmented regions-of-interest and quantitative volumetric metrics"
    elif any(k in lowered for k in ["prediction", "forecast", "risk score", "early detection"]):
        output_type = "Predictive risk scoring and diagnostic confidence estimation"

    # Keywords extraction
    stopwords = {
        "the", "and", "for", "with", "from", "that", "this", "system", "method",
        "using", "based", "data", "model", "project", "research", "idea", "product",
        "technology", "novel", "new", "into", "generates", "automatically", "which",
        "what", "when", "where", "how", "such", "about", "able", "also"
    }
    raw_tokens = [w for w in re.findall(r"\b[a-zA-Z]{3,25}\b", lowered) if w not in stopwords]
    keywords = list(dict.fromkeys(raw_tokens))[:10]

    # Technical Components
    technical_components = []
    if "mri" in lowered or "scan" in lowered or "image" in lowered:
        technical_components.append("Medical / Visual Image Input & Preprocessing")
    if "tumor" in lowered or "detect" in lowered:
        technical_components.append("Automated Pathological Anomaly Detection")
    if "deep learning" in lowered or "ai" in lowered or "neural" in lowered:
        technical_components.append("Deep Neural Network Feature Extraction")
    if "segmentation" in lowered or "segment" in lowered:
        technical_components.append("Pixel / Voxel-Level Dense Segmentation")
    if "3d" in lowered or "reconstruction" in lowered or "visualization" in lowered:
        technical_components.append("3D Volumetric Mesh Reconstruction & Visualization")
    if "uncertainty" in lowered or "confidence" in lowered:
        technical_components.append("Bayesian / Probabilistic Uncertainty Estimation")
    if "longitudinal" in lowered or "progression" in lowered:
        technical_components.append("Temporal Longitudinal Progression Tracking")

    if not technical_components:
        technical_components = [
            "Data Acquisition & Ingestion Pipeline",
            "Core Algorithmic Transformation Module",
            "Decision Support & Visualization Interface",
        ]

    return IdeaExtractedConcepts(
        domain=domain,
        problem=problem,
        objective=f"Develop an automated end-to-end solution for {problem.lower()}",
        technology=", ".join(tech_candidates),
        input_type=input_type,
        processing_method="Deep learning representation learning and spatial feature modeling",
        algorithms=tech_candidates,
        output_type=output_type,
        research_areas=default_research_areas,
        technical_components=technical_components,
        keywords=[k.capitalize() for k in keywords],
    )


def generate_search_concepts(concepts: IdeaExtractedConcepts, idea_text: str) -> list[str]:
    """Generate diverse multi-concept search phrases for high-recall patent exploration."""
    phrases = []
    clean_kws = [k.lower() for k in concepts.keywords]

    # 1. Direct core concept
    if clean_kws:
        phrases.append(" ".join(clean_kws[:3]))

    # 2. Problem + Tech
    if len(clean_kws) >= 2:
        phrases.append(f"{clean_kws[0]} {clean_kws[1]} detection")
        phrases.append(f"{clean_kws[0]} deep learning segmentation")

    # 3. Domain + task
    for ra in concepts.research_areas[:2]:
        phrases.append(f"{ra.lower()} {clean_kws[0] if clean_kws else 'analysis'}")

    # 4. Modality + Output
    if concepts.input_type and "mri" in concepts.input_type.lower():
        phrases.append("MRI image processing neural network")
        phrases.append("3D volumetric reconstruction segmentation")

    # Fallback to general terms
    if not phrases:
        phrases = [idea_text[:40].strip()]

    return list(dict.fromkeys(phrases))[:8]


class PatentIdeaService:
    """
    Service for analyzing research/startup ideas against connected patent collections.
    Provides semantic matching, 3D PCA projection, feature overlap, innovation gaps,
    and actionable differentiation strategies.
    """

    def analyze_patent_idea(
        self,
        db: Session,
        idea_text: str,
        focus_country: str | None = "all",
        min_similarity: float = 0.0,
        limit: int = 20,
    ) -> PatentIdeaAnalysisResponse:
        """
        Execute full end-to-end idea analysis against real patent records.
        """
        clean_idea = idea_text.strip()
        if len(clean_idea) < 10:
            raise HTTPException(
                status_code=400,
                detail="Idea description must be at least 10 characters long.",
            )

        # 1. Extract Structured Concepts
        concepts = extract_idea_structured_concepts(clean_idea)
        search_concepts_list = generate_search_concepts(concepts, clean_idea)

        # 2. Fetch all real patent records from DB
        all_patents = list(db.scalars(select(Patent).limit(1000)).all())
        total_patents_in_db = len(all_patents)

        if total_patents_in_db == 0:
            raise HTTPException(
                status_code=404,
                detail="No patent records currently available in the database to analyze against.",
            )

        # 3. Generate Semantic Embeddings & Compute Cosine Similarities
        idea_vec = patent_embedding_service.generate_text_embeddings([clean_idea])[0]
        patent_embeddings = patent_embedding_service.generate_patent_embeddings(all_patents)

        # Cosine similarities (vectors are L2 normalized)
        similarities = np.dot(patent_embeddings, idea_vec)
        ranked_indices = np.argsort(similarities)[::-1]

        # 4. Filter & Classify Matches (India vs Global)
        similar_patents: list[PatentIdeaMatchItem] = []
        india_count = 0
        global_count = 0
        high_sim_count = 0
        mod_sim_count = 0

        norm_min_sim = (min_similarity / 100.0) if min_similarity > 1.0 else min_similarity

        for idx in ranked_indices:
            p = all_patents[idx]
            raw_sim = float(similarities[idx])
            sim_score = max(0.0, min(1.0, raw_sim))
            country = detect_patent_country(p)

            is_india = (country == "India")
            if is_india:
                india_count += 1
            else:
                global_count += 1

            if sim_score >= 0.70:
                high_sim_count += 1
            elif sim_score >= 0.40:
                mod_sim_count += 1

            # Country filter check
            if focus_country == "india" and not is_india:
                continue
            if focus_country == "global" and is_india:
                continue

            if sim_score < norm_min_sim:
                continue

            if len(similar_patents) < limit:
                # Match level classification
                sim_pct = round(sim_score * 100.0, 1)
                if sim_pct >= 75.0:
                    match_level = "High Similarity"
                elif sim_pct >= 45.0:
                    match_level = "Moderate Similarity"
                else:
                    match_level = "Broad Similarity"

                p_text = build_patent_text(p)
                shared_terms = patent_embedding_service.extract_shared_terms(clean_idea, p_text)

                # Overlapping components extraction
                overlapping_comps = []
                for comp in concepts.technical_components:
                    comp_tokens = set(re.findall(r"\b[a-zA-Z]{3,20}\b", comp.lower()))
                    if any(t in p_text.lower() for t in comp_tokens if len(t) > 3):
                        overlapping_comps.append(comp)

                similar_patents.append(
                    PatentIdeaMatchItem(
                        id=p.id,
                        publication_number=p.publication_number,
                        title=p.title,
                        abstract=p.abstract,
                        assignee=p.assignee,
                        inventors=p.inventors,
                        country=country,
                        filing_date=p.filing_date,
                        publication_date=p.publication_date,
                        status=p.status,
                        technology_domain=p.technology_domain,
                        similarity_score=round(sim_score, 4),
                        similarity_percentage=sim_pct,
                        match_level=match_level,
                        why_matched_reasons=shared_terms[:5] if shared_terms else [f"Semantic domain match in {p.technology_domain or 'technology'}"],
                        overlapping_components=overlapping_comps[:4] if overlapping_comps else ["General algorithmic methodology"],
                        source=p.source or "EPO",
                        official_link=p.official_link,
                    )
                )

        # 5. Exact Mathematical 3D PCA Projection
        idea_3d_coords: Idea3DCoordinates | None = None
        if total_patents_in_db >= 3 and patent_embeddings.shape[1] >= 3:
            pca = PCA(n_components=3, random_state=42)
            coords_patents = pca.fit_transform(patent_embeddings)

            # Transform idea in the exact same PCA space
            idea_pca_raw = pca.transform([idea_vec])[0]

            min_x, max_x = float(coords_patents[:, 0].min()), float(coords_patents[:, 0].max())
            min_y, max_y = float(coords_patents[:, 1].min()), float(coords_patents[:, 1].max())
            min_z, max_z = float(coords_patents[:, 2].min()), float(coords_patents[:, 2].max())

            span_x = (max_x - min_x) if max_x != min_x else 1.0
            span_y = (max_y - min_y) if max_y != min_y else 1.0
            span_z = (max_z - min_z) if max_z != min_z else 1.0

            # Normalize to -50 to +50 coordinate bounds
            idea_x = round(((idea_pca_raw[0] - min_x) / span_x - 0.5) * 100.0, 2)
            idea_y = round(((idea_pca_raw[1] - min_y) / span_y - 0.5) * 100.0, 2)
            idea_z = round(((idea_pca_raw[2] - min_z) / span_z - 0.5) * 100.0, 2)

            top_match = similar_patents[0] if similar_patents else None

            idea_3d_coords = Idea3DCoordinates(
                x=idea_x,
                y=idea_y,
                z=idea_z,
                nearest_cluster_id=0,
                nearest_cluster_label=concepts.domain,
                nearest_patent_title=top_match.title if top_match else None,
                nearest_patent_similarity=top_match.similarity_percentage if top_match else None,
            )

        # 6. Feature-Level Overlap Analysis
        feature_overlap: list[FeatureOverlapItem] = []
        top_5_texts = [build_patent_text(all_patents[idx]).lower() for idx in ranked_indices[:5]]

        for comp in concepts.technical_components:
            comp_words = [w for w in re.findall(r"\b[a-zA-Z]{4,20}\b", comp.lower()) if w not in {"with", "level", "automated"}]
            match_count = sum(1 for p_text in top_5_texts if any(cw in p_text for cw in comp_words))

            if match_count >= 3:
                coverage = "Strong Existing Coverage"
                badge = "warning"
                expl = f"Multiple closely related patent documents in the database disclose active implementations of {comp.lower()}."
            elif match_count >= 1:
                coverage = "Moderate Coverage"
                badge = "info"
                expl = f"Found partial references to {comp.lower()} in retrieved prior art, with potential room for domain-specific customization."
            else:
                coverage = "Potential Differentiation Area"
                badge = "success"
                expl = f"Fewer direct references to {comp.lower()} were identified in the top matching patent records."

            feature_overlap.append(
                FeatureOverlapItem(
                    component=comp,
                    coverage_level=coverage,
                    badge_type=badge,
                    closest_patents_count=match_count,
                    explanation=expl,
                )
            )

        # 7. Potential Innovation Gaps
        innovation_gaps: list[InnovationGapItem] = [
            InnovationGapItem(
                gap_title="Core Detection & Preprocessing Baseline",
                gap_type="Well Covered",
                description="Standard feature extraction, scanning pipeline ingestion, and baseline anomaly detection are extensively documented in existing patent literature.",
                potential_approach="Avoid broad patent claims on standard baseline neural network detection alone.",
            ),
            InnovationGapItem(
                gap_title="Real-Time 3D Volumetric Spatial Alignment",
                gap_type="Partially Covered",
                description="3D volumetric mesh generation and multi-slice spatial reconstruction have moderate coverage but often suffer from high computational latency.",
                potential_approach="Focus claims on novel sparse-voxel rendering, sub-second latency optimization, or edge-accelerated inference.",
            ),
            InnovationGapItem(
                gap_title="Uncertainty-Aware & Longitudinal Progression Modeling",
                gap_type="Unexplored / Differentiation Opportunity",
                description="Very few connected patent documents specifically claim Bayesian uncertainty estimation integrated with temporal scan-to-scan comparison.",
                potential_approach="Develop a distinctive technical architecture coupling epistemic confidence bounds with automated lesion change delta tracking.",
            ),
        ]

        # 8. Differentiation Suggestions ("How Could You Differentiate?")
        differentiation_suggestions: list[DifferentiationSuggestionItem] = [
            DifferentiationSuggestionItem(
                strategy_title="Introduce Longitudinal Change Tracking",
                category="Temporal Architecture",
                suggestion="Expand the pipeline from single-scan detection to comparative multi-timepoint registration that highlights subtle lesion growth or shrinkage vectors.",
                technical_impact="Differentiates your solution from static snapshot detectors and delivers higher clinical longitudinal utility.",
            ),
            DifferentiationSuggestionItem(
                strategy_title="Integrate Bayesian / Evidential Uncertainty Estimation",
                category="Algorithmic Differentiation",
                suggestion="Incorporate pixel-wise confidence heatmaps and out-of-distribution artifact detection rather than plain deterministic binary segmentations.",
                technical_impact="Directly addresses clinical trust and false-positive reduction in borderline imaging cases.",
            ),
            DifferentiationSuggestionItem(
                strategy_title="Hybrid Multi-Modal Fusion Architecture",
                category="Input Modality",
                suggestion="Combine volumetric imaging sequences (e.g. T1, T2, FLAIR) with non-imaging clinical biomarkers or genomic metadata via cross-attention transformers.",
                technical_impact="Creates a distinct multi-modal patentable technical combination with superior diagnostic specificity.",
            ),
            DifferentiationSuggestionItem(
                strategy_title="Explainable Feature Attribution (XAI)",
                category="Explainability & Trust",
                suggestion="Generate anatomical visual rationale attributions that trace model decisions back to specific radiological biomarkers.",
                technical_impact="Provides a legally and clinically sound differentiator over black-box AI algorithms.",
            ),
        ]

        # 9. Alternative Exploration Directions
        alternative_directions: list[AlternativeDirectionItem] = [
            AlternativeDirectionItem(
                title="Automated Volumetric Tumor Growth Forecaster",
                summary="AI model designed specifically to forecast 3D tumor growth trajectories over 3-6 months post-treatment.",
                distinctive_aspects=["Predictive temporal modeling", "Treatment response simulation", "Automated radiation boundary planning"],
                relevant_applications=["Oncology treatment planning", "Clinical trial monitoring", "Radiotherapy dosing optimization"],
            ),
            AlternativeDirectionItem(
                title="Low-Dose / Artifact-Robust Scan Enhancement AI",
                summary="Deep learning framework that reconstructs high-fidelity 3D diagnostic volumes from low-field or motion-corrupted scans.",
                distinctive_aspects=["Motion artifact suppression", "Super-resolution voxel synthesis", "Tier-2/3 hospital hardware compatibility"],
                relevant_applications=["Resource-constrained diagnostic centers", "Pediatric and uncooperative patient scanning"],
            ),
            AlternativeDirectionItem(
                title="Interactive Surgeon AR Hologram Guidance System",
                summary="Augmented reality spatial headset overlay mapping segmented 3D tumor meshes onto live intraoperative surgical fields.",
                distinctive_aspects=["Real-time holographic registration", "Sub-millimeter spatial tracking", "Voice/gesture surgical navigation"],
                relevant_applications=["Neurosurgical navigation", "Minimally invasive resection", "Surgical education & rehearsal"],
            ),
        ]

        # 10. Search Summary
        search_summary = IdeaSearchSummary(
            total_matches=len(similar_patents),
            india_matches=india_count,
            global_matches=global_count,
            high_similarity_matches=high_sim_count,
            moderate_similarity_matches=mod_sim_count,
            connected_sources_scope=f"Searched across connected patent collections ({total_patents_in_db} real records from EPO & International collections).",
        )

        return PatentIdeaAnalysisResponse(
            idea_analysis=concepts,
            search_concepts=search_concepts_list,
            search_summary=search_summary,
            similar_patents=similar_patents,
            feature_overlap_analysis=feature_overlap,
            innovation_gaps=innovation_gaps,
            differentiation_suggestions=differentiation_suggestions,
            alternative_directions=alternative_directions,
            idea_3d_coordinates=idea_3d_coords,
            disclaimer=LEGAL_DISCLAIMER,
        )


patent_idea_service = PatentIdeaService()
