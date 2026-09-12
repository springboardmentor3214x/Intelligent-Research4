from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.patent import Patent
from backend.app.schemas.patent import (
    ClusteringRunRequest,
    PatentClusterResponse,
    PatentIdeaAnalysisRequest,
    PatentIdeaAnalysisResponse,
    PatentImportRequest,
    PatentResponse,
    PatentSearchItem,
    PatentSearchResponse,
    PatentSuggestionItem,
    PatentSuggestionsResponse,
    SimilarPatentsResponse,
)
from backend.app.services.patent_clustering_service import (
    patent_clustering_service,
)
from backend.app.services.patent_embedding_service import (
    patent_embedding_service,
)
from backend.app.services.patent_idea_service import (
    patent_idea_service,
)
from backend.app.services.patent_service import import_patents


router = APIRouter(
    prefix="/patents",
    tags=["Patents"],
)


@router.get("/suggestions", response_model=PatentSuggestionsResponse)
def get_patent_suggestions(
    q: str = Query(default="", min_length=1),
    limit: int = Query(default=8, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """
    Return controlled-vocabulary autocomplete suggestions derived from real patent records
    across titles, technology domains, assignees, and key classification terms.
    """
    query_str = q.strip().lower()
    if not query_str:
        return PatentSuggestionsResponse(query=q, suggestions=[])

    all_patents = list(db.scalars(select(Patent).limit(200)).all())
    suggestions: list[PatentSuggestionItem] = []
    seen_texts: set[str] = set()

    # 1. Check technology domains
    for p in all_patents:
        if p.technology_domain and query_str in p.technology_domain.lower():
            text = p.technology_domain.strip().title()
            if text.lower() not in seen_texts:
                seen_texts.add(text.lower())
                suggestions.append(PatentSuggestionItem(text=text, category="domain"))
                if len(suggestions) >= limit:
                    break

    # 2. Check assignees
    if len(suggestions) < limit:
        for p in all_patents:
            if p.assignee and query_str in p.assignee.lower():
                text = p.assignee.strip()
                if text.lower() not in seen_texts:
                    seen_texts.add(text.lower())
                    suggestions.append(PatentSuggestionItem(text=text, category="assignee"))
                    if len(suggestions) >= limit:
                        break

    # 3. Check patent titles / key phrases
    if len(suggestions) < limit:
        for p in all_patents:
            if p.title and query_str in p.title.lower():
                # Extract clean title snippet
                text = p.title.strip()
                if len(text) > 48:
                    text = f"{text[:45]}..."
                if text.lower() not in seen_texts:
                    seen_texts.add(text.lower())
                    suggestions.append(PatentSuggestionItem(text=text, category="title"))
                    if len(suggestions) >= limit:
                        break

    return PatentSuggestionsResponse(query=q, suggestions=suggestions)


@router.get("/search", response_model=PatentSearchResponse)
def search_patents(
    q: str = Query(default=""),
    domain: str | None = Query(default=None),
    assignee: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Search patents using a hybrid query pipeline:
    1. Direct multi-field SQL filter (title, abstract, domain, assignee, classification).
    2. Dense semantic sentence embedding cosine similarity ranking.
    """
    query_str = q.strip()
    base_stmt = select(Patent)

    if domain:
        base_stmt = base_stmt.where(Patent.technology_domain.ilike(f"%{domain}%"))
    if assignee:
        base_stmt = base_stmt.where(Patent.assignee.ilike(f"%{assignee}%"))

    candidates = list(db.scalars(base_stmt.limit(200)).all())

    if not candidates:
        return PatentSearchResponse(query=q, total_results=0, patents=[])

    if not query_str:
        # Return most recent patents
        results = [
            PatentSearchItem(
                id=p.id,
                source=p.source,
                source_id=p.source_id,
                publication_number=p.publication_number,
                title=p.title,
                abstract=p.abstract,
                assignee=p.assignee,
                inventors=p.inventors,
                filing_date=p.filing_date,
                publication_date=p.publication_date,
                classification=p.classification,
                technology_domain=p.technology_domain,
                citation_count=p.citation_count,
                status=p.status,
                official_link=p.official_link,
                relevance_score=1.0,
                matched_by="database",
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in candidates[:limit]
        ]
        return PatentSearchResponse(query="", total_results=len(results), patents=results)

    # Hybrid Search:
    # A. Text match score (exact title / keyword / abstract)
    q_lower = query_str.lower()
    text_matched: list[tuple[Patent, float, str]] = []
    semantic_pool: list[Patent] = []

    for p in candidates:
        p_title = (p.title or "").lower()
        p_abstract = (p.abstract or "").lower()
        p_domain = (p.technology_domain or "").lower()
        p_assignee = (p.assignee or "").lower()

        if q_lower in p_title:
            text_matched.append((p, 0.95, "title_match"))
        elif q_lower in p_domain:
            text_matched.append((p, 0.88, "domain_match"))
        elif q_lower in p_abstract:
            text_matched.append((p, 0.80, "abstract_match"))
        elif q_lower in p_assignee:
            text_matched.append((p, 0.75, "assignee_match"))
        else:
            semantic_pool.append(p)

    # B. Dense semantic cosine similarity for query vs semantic pool (or all candidates)
    semantic_results = patent_embedding_service.search_patents_by_query(
        query=query_str,
        patents=candidates,
        top_k=limit,
    )

    combined_dict: dict[UUID, PatentSearchItem] = {}

    # Add text matches first with high score
    for p, score, match_type in text_matched:
        combined_dict[p.id] = PatentSearchItem(
            id=p.id,
            source=p.source,
            source_id=p.source_id,
            publication_number=p.publication_number,
            title=p.title,
            abstract=p.abstract,
            assignee=p.assignee,
            inventors=p.inventors,
            filing_date=p.filing_date,
            publication_date=p.publication_date,
            classification=p.classification,
            technology_domain=p.technology_domain,
            citation_count=p.citation_count,
            status=p.status,
            official_link=p.official_link,
            relevance_score=score,
            matched_by=match_type,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )

    # Complement with semantic similarity ranked matches
    for p, sim_score in semantic_results:
        if p.id not in combined_dict and sim_score >= 0.15:
            combined_dict[p.id] = PatentSearchItem(
                id=p.id,
                source=p.source,
                source_id=p.source_id,
                publication_number=p.publication_number,
                title=p.title,
                abstract=p.abstract,
                assignee=p.assignee,
                inventors=p.inventors,
                filing_date=p.filing_date,
                publication_date=p.publication_date,
                classification=p.classification,
                technology_domain=p.technology_domain,
                citation_count=p.citation_count,
                status=p.status,
                official_link=p.official_link,
                relevance_score=round(sim_score, 4),
                matched_by="semantic_embedding",
                created_at=p.created_at,
                updated_at=p.updated_at,
            )

    sorted_results = sorted(combined_dict.values(), key=lambda item: item.relevance_score, reverse=True)[:limit]

    return PatentSearchResponse(
        query=query_str,
        total_results=len(sorted_results),
        patents=sorted_results,
    )


@router.get("", response_model=list[PatentResponse])
def get_patents(
    keyword: str | None = Query(default=None),
    limit: int = Query(default=20, le=200),
    db: Session = Depends(get_db),
):
    """Retrieve patents with optional keyword filtering."""
    query = select(Patent)

    if keyword:
        query = query.where(
            Patent.title.ilike(f"%{keyword}%")
            | Patent.abstract.ilike(f"%{keyword}%")
            | Patent.technology_domain.ilike(f"%{keyword}%")
            | Patent.assignee.ilike(f"%{keyword}%")
        )

    query = query.order_by(Patent.created_at.desc()).limit(limit)

    return db.scalars(query).all()


@router.get("/clusters", response_model=PatentClusterResponse)
def get_patent_clusters(
    n_clusters: int | None = Query(default=None, ge=2, le=20),
    max_patents: int = Query(default=500, ge=4, le=2000),
    db: Session = Depends(get_db),
):
    """
    Retrieve AI/ML patent clusters, automatic labels, representative patents,
    silhouette quality score, and 2D visualization coordinates.
    """
    return patent_clustering_service.cluster_patents(
        db=db,
        n_clusters=n_clusters,
        max_patents=max_patents,
    )


@router.post("/clusters/run", response_model=PatentClusterResponse)
def run_patent_clustering(
    request: ClusteringRunRequest,
    db: Session = Depends(get_db),
):
    """
    Trigger on-demand patent clustering with user-defined parameters.
    """
    return patent_clustering_service.cluster_patents(
        db=db,
        n_clusters=request.n_clusters,
        max_patents=request.max_patents,
    )


@router.post("/import")
def import_patent_data(
    request: PatentImportRequest,
    db: Session = Depends(get_db),
):
    """Import patents from EPO Linked Data API into PostgreSQL."""
    if request.limit < 1 or request.limit > 50:
        raise HTTPException(
            status_code=400,
            detail="limit must be between 1 and 50",
        )

    return import_patents(
        db,
        request.keyword,
        request.limit,
    )


@router.get("/{patent_id}", response_model=PatentResponse)
def get_patent(
    patent_id: UUID,
    db: Session = Depends(get_db),
):
    """Get single patent details by UUID."""
    patent = db.get(Patent, patent_id)

    if not patent:
        raise HTTPException(
            status_code=404,
            detail="Patent not found",
        )

    return patent


@router.get("/{patent_id}/similar", response_model=SimilarPatentsResponse)
def get_similar_patents(
    patent_id: UUID,
    top_k: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Find semantically similar patents using sentence embedding cosine similarity.
    Returns relevance scores and explainable shared technology terms.
    """
    return patent_clustering_service.find_similar_patents(
        db=db,
        source_patent_id=patent_id,
        top_k=top_k,
    )


@router.post("/analyze-idea", response_model=PatentIdeaAnalysisResponse)
def analyze_patent_idea(
    payload: PatentIdeaAnalysisRequest,
    db: Session = Depends(get_db),
):
    """
    AI Innovation & Patent Idea Analyzer ("Check Your Innovation"):
    1. Extract structured concepts, problem, technology, modalities, and keywords.
    2. Multi-concept query expansion.
    3. Real dense vector semantic matching against connected patent collections.
    4. Exact 3D PCA projection for spatial landscape visualization.
    5. Feature-level overlap analysis against retrieved patents.
    6. Potential innovation gaps and actionable differentiation strategies.
    7. Alternative technical exploration directions.
    8. India vs Global connected collections classification.
    """
    return patent_idea_service.analyze_patent_idea(
        db=db,
        idea_text=payload.idea,
        focus_country=payload.focus_country,
        min_similarity=payload.min_similarity,
        limit=payload.limit,
    )