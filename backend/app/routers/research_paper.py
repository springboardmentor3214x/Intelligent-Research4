from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.user import User
from backend.app.schemas.research_paper import (
    PaperAnalyzeRequest,
    ResearchPaperAnalysisResponse,
    ResearchPaperCreate,
    ResearchPaperImportRequest,
    ResearchPaperResponse,
    ResearchPaperSearchResponse,
)

from backend.app.services.paper_analysis_service import (
    AIMalformedResponseError,
    AIProviderConfigurationError,
    AIProviderUnavailableError,
    AIRateLimitError,
    AITimeoutError,
    InsufficientContentError,
    PaperAnalysisError,
    analyze_paper_service,
    build_analysis_response,
    get_cached_analysis,
)
from backend.app.services.research_paper_service import (
    deduplicate_and_merge_papers,
    extract_clean_publisher_name,
    fetch_crossref_papers,
    fetch_openalex_works,
    fetch_semantic_scholar_papers,
    save_research_papers,
)


router = APIRouter(
    prefix="/research-papers",
    tags=["Research Papers"],
)


@router.post(
    "",
    response_model=ResearchPaperResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a research paper"
)
def create_research_paper(
    paper_in: ResearchPaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaper:
    """
    Create a normalized research paper record.

    Authentication is required because research-paper
    data is part of the Research Intelligence platform.
    """

    existing_paper = (
        db.query(ResearchPaper)
        .filter(
            ResearchPaper.source == paper_in.source,
            ResearchPaper.source_id == paper_in.source_id,
        )
        .first()
    )

    if existing_paper:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Research paper already exists for this source and source ID",
        )

    db_paper = ResearchPaper(**paper_in.model_dump())

    db.add(db_paper)
    db.commit()
    db.refresh(db_paper)

    return db_paper

@router.post(
    "/import",
    status_code=status.HTTP_200_OK,
    summary="Import research papers from OpenAlex"
)
def import_research_papers(
    import_request: ResearchPaperImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Fetch research papers from OpenAlex, normalize them,
    and save new papers to PostgreSQL.
    """

    fetch_res = fetch_openalex_works(
        search=import_request.search,
        per_page=import_request.per_page,
    )
    if isinstance(fetch_res, tuple):
        papers, total_found = fetch_res
    else:
        papers, total_found = fetch_res, len(fetch_res)

    inserted, skipped = save_research_papers(
        db=db,
        papers=papers,
    )

    return {
        "source": "OpenAlex",
        "search": import_request.search,
        "fetched": len(papers),
        "total_available": total_found,
        "inserted": inserted,
        "skipped": skipped,
    }

@router.get(
    "",
    response_model=ResearchPaperSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search and discover research papers across PostgreSQL and scholarly APIs"
)
def list_research_papers(
    search: str | None = Query(
        default=None,
        description="Search title, abstract, authors, or keywords"
    ),
    year: int | None = Query(
        default=None,
        description="Filter by publication year"
    ),
    research_domain: str | None = Query(
        default=None,
        description="Filter by research domain"
    ),
    source: str | None = Query(
        default=None,
        description="Filter by source provider (e.g. OpenAlex, Crossref, Semantic Scholar, Local)"
    ),
    page: int = Query(
        default=1,
        ge=1,
        description="Page number (1-indexed)"
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Number of records per page"
    ),
    skip: int | None = Query(
        default=None,
        ge=0,
        description="Optional legacy offset parameter"
    ),
    limit: int | None = Query(
        default=None,
        ge=1,
        le=100,
        description="Optional legacy limit parameter"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaperSearchResponse:
    # Normalize pagination parameters (support both page/page_size and legacy skip/limit)
    effective_page_size = limit if limit is not None else page_size
    effective_skip = skip if skip is not None else (page - 1) * effective_page_size
    effective_page = (effective_skip // effective_page_size) + 1

    clean_search = search.strip() if (search and search.strip()) else None

    # 1. Query Local PostgreSQL Database
    local_query = db.query(ResearchPaper)
    if clean_search:
        words = [w for w in clean_search.split() if w]
        if len(words) > 1:
            word_conditions = []
            for word in words:
                pat = f"%{word}%"
                word_conditions.append(
                    ResearchPaper.title.ilike(pat)
                    | ResearchPaper.abstract.ilike(pat)
                    | ResearchPaper.authors.ilike(pat)
                    | ResearchPaper.keywords.ilike(pat)
                )
            local_query = local_query.filter(*word_conditions)
        else:
            pat = f"%{clean_search}%"
            local_query = local_query.filter(
                ResearchPaper.title.ilike(pat)
                | ResearchPaper.abstract.ilike(pat)
                | ResearchPaper.authors.ilike(pat)
                | ResearchPaper.keywords.ilike(pat)
            )

    if year is not None and 1800 <= year <= 2100:
        local_query = local_query.filter(ResearchPaper.publication_year == year)

    if research_domain and research_domain.strip():
        local_query = local_query.filter(
            ResearchPaper.research_domain.ilike(f"%{research_domain.strip()}%")
        )

    if source and source.strip():
        s_clean = source.strip().lower()
        if s_clean in ["local", "stored"]:
            pass  # Already querying local
        else:
            local_query = local_query.filter(ResearchPaper.source.ilike(f"%{s_clean}%"))

    # If NO search query is entered, serve directly from local PostgreSQL collection with DB pagination
    if not clean_search:
        total_local = local_query.count()
        db_papers = (
            local_query
            .order_by(ResearchPaper.publication_date.desc().nullslast())
            .offset(effective_skip)
            .limit(effective_page_size)
            .all()
        )
        total_pages = max(1, (total_local + effective_page_size - 1) // effective_page_size) if total_local > 0 else 1

        normalized_db_items = []
        for p in db_papers:
            pub_name = extract_clean_publisher_name(None, p.journal_or_conference)
            is_oa = bool(p.publication_link and ("arxiv.org" in p.publication_link or "openalex" in p.publication_link))
            normalized_db_items.append(ResearchPaperResponse(
                id=p.id,
                source=p.source,
                source_id=p.source_id,
                title=p.title,
                abstract=p.abstract,
                authors=p.authors,
                publication_date=p.publication_date,
                publication_year=p.publication_year,
                journal_or_conference=p.journal_or_conference,
                keywords=p.keywords,
                research_domain=p.research_domain,
                doi=p.doi,
                citation_count=p.citation_count or 0,
                publication_link=p.publication_link,
                created_at=p.created_at,
                updated_at=p.updated_at,
                publisher=pub_name,
                source_provider=p.source,
                pdf_url=p.publication_link if is_oa else None,
                open_access=is_oa,
                is_stored=True,
            ))

        return ResearchPaperSearchResponse(
            total=total_local,
            skip=effective_skip,
            limit=effective_page_size,
            page=effective_page,
            page_size=effective_page_size,
            total_pages=total_pages,
            query=clean_search,
            sources={"local": total_local},
            papers=normalized_db_items,
        )

    # 2. When active search query is provided, execute Multi-Provider Discovery
    local_matches = local_query.limit(50).all()
    local_dicts = []
    for p in local_matches:
        pub_name = extract_clean_publisher_name(None, p.journal_or_conference)
        local_dicts.append({
            "id": p.id,
            "source": p.source,
            "source_provider": p.source,
            "publisher": pub_name,
            "source_id": p.source_id,
            "title": p.title,
            "abstract": p.abstract,
            "authors": p.authors,
            "publication_date": p.publication_date,
            "publication_year": p.publication_year,
            "journal_or_conference": p.journal_or_conference,
            "keywords": p.keywords,
            "research_domain": p.research_domain,
            "doi": p.doi,
            "citation_count": p.citation_count or 0,
            "publication_link": p.publication_link,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "pdf_url": p.publication_link if (p.publication_link and "arxiv.org" in p.publication_link) else None,
            "open_access": bool(p.publication_link and "arxiv.org" in p.publication_link),
            "is_stored": True,
        })

    # Fetch from OpenAlex (with requested page to enable broad exploration)
    openalex_papers = []
    openalex_total = 0
    if not source or "openalex" in source.lower() or source.lower() == "all":
        oa_res = fetch_openalex_works(
            search=clean_search,
            per_page=max(effective_page_size, 25),
            page=effective_page,
            year=year if (year and 1800 <= year <= 2100) else None,
        )
        if isinstance(oa_res, tuple):
            openalex_papers, openalex_total = oa_res
        else:
            openalex_papers, openalex_total = oa_res, len(oa_res)

    # Fetch from Semantic Scholar
    semantic_scholar_papers = []
    if not source or "semantic" in source.lower() or source.lower() == "all":
        semantic_scholar_papers = fetch_semantic_scholar_papers(
            search=clean_search,
            per_page=15,
            year=year if (year and 1800 <= year <= 2100) else None,
        )

    # Fetch from Crossref for enrichment & discovery
    crossref_papers = []
    if not source or "crossref" in source.lower() or source.lower() == "all":
        crossref_papers = fetch_crossref_papers(
            search=clean_search,
            per_page=10,
            year=year if (year and 1800 <= year <= 2100) else None,
        )

    # Deduplicate & Merge all providers (PostgreSQL prioritized for is_stored & DB ID)
    merged_papers = deduplicate_and_merge_papers([
        local_dicts,
        openalex_papers,
        semantic_scholar_papers,
        crossref_papers,
    ])

    # Filter by specific source if user clicked a source tag
    if source and source.strip() and source.strip().lower() not in ["all", ""]:
        req_src = source.strip().lower()
        if req_src in ["local", "stored"]:
            merged_papers = [p for p in merged_papers if p.get("is_stored")]
        else:
            merged_papers = [
                p for p in merged_papers
                if req_src in (p.get("source_provider") or "").lower()
                or req_src in (p.get("source") or "").lower()
            ]

    # Apply domain filter in memory for external discovery results if specified
    if research_domain and research_domain.strip():
        dom_filter = research_domain.strip().lower()
        filtered = []
        for p in merged_papers:
            p_dom = (p.get("research_domain") or "").lower()
            p_kw = (p.get("keywords") or "").lower()
            p_title = (p.get("title") or "").lower()
            if dom_filter in p_dom or dom_filter in p_kw or dom_filter in p_title:
                filtered.append(p)
        merged_papers = filtered

    # Sort results by relevance (citation count + abstract presence + storage status)
    def paper_ranking_score(p: dict) -> float:
        score = float(p.get("citation_count") or 0) * 0.1
        if p.get("abstract"):
            score += 50.0
        if p.get("is_stored"):
            score += 20.0
        if p.get("open_access"):
            score += 15.0
        if p.get("publication_year"):
            score += min(p["publication_year"] - 2000, 30.0)
        return score

    merged_papers.sort(key=paper_ranking_score, reverse=True)

    # Calculate realistic total count for combined discovery
    effective_total = max(
        len(merged_papers),
        openalex_total if openalex_total > 0 else len(merged_papers)
    )
    total_pages = max(1, (effective_total + effective_page_size - 1) // effective_page_size)

    # Paginate current page results
    page_items = merged_papers[:effective_page_size]

    response_items = []
    for it in page_items:
        response_items.append(ResearchPaperResponse(
            id=it.get("id"),
            source=it.get("source") or "OpenAlex",
            source_provider=it.get("source_provider") or it.get("source") or "OpenAlex",
            publisher=it.get("publisher"),
            source_id=str(it.get("source_id") or "ext"),
            title=it.get("title") or "Untitled",
            abstract=it.get("abstract"),
            authors=it.get("authors"),
            publication_date=it.get("publication_date"),
            publication_year=it.get("publication_year"),
            journal_or_conference=it.get("journal_or_conference"),
            keywords=it.get("keywords"),
            research_domain=it.get("research_domain"),
            doi=it.get("doi"),
            citation_count=it.get("citation_count") or 0,
            publication_link=it.get("publication_link"),
            created_at=it.get("created_at"),
            updated_at=it.get("updated_at"),
            pdf_url=it.get("pdf_url"),
            open_access=it.get("open_access", False),
            is_stored=it.get("is_stored", False),
        ))

    return ResearchPaperSearchResponse(
        total=effective_total,
        skip=effective_skip,
        limit=effective_page_size,
        page=effective_page,
        page_size=effective_page_size,
        total_pages=total_pages,
        query=clean_search,
        sources={
            "local": len(local_matches),
            "openalex": len(openalex_papers),
            "semantic_scholar": len(semantic_scholar_papers),
            "crossref": len(crossref_papers),
        },
        papers=response_items,
    )


@router.get(
    "/{paper_id}",
    response_model=ResearchPaperResponse,
    status_code=status.HTTP_200_OK,
    summary="Get research paper by ID"
)
def get_research_paper(
    paper_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaper:

    paper = (
        db.query(ResearchPaper)
        .filter(ResearchPaper.id == paper_id)
        .first()
    )

    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research paper not found",
        )

    return paper

@router.delete(
    "/{paper_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a research paper"
)
def delete_research_paper(
    paper_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:

    paper = (
        db.query(ResearchPaper)
        .filter(ResearchPaper.id == paper_id)
        .first()
    )

    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research paper not found",
        )

    db.delete(paper)
    db.commit()


@router.post(
    "/{paper_id}/analyze",
    response_model=ResearchPaperAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate or retrieve AI analysis for a research paper",
)
def analyze_paper_endpoint(
    paper_id: UUID,
    payload: PaperAnalyzeRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaperAnalysisResponse:
    """
    Generate structured AI analysis for a stored research paper across 6 dimensions:
    - Summary
    - Main Research Problem
    - Methodology / Approach
    - Important Findings
    - Limitations
    - Future Research Directions

    Authenticates user, validates paper existence and content sufficiency,
    and returns cached results unless force_refresh is requested.
    """
    paper = (
        db.query(ResearchPaper)
        .filter(ResearchPaper.id == paper_id)
        .first()
    )

    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research paper not found",
        )

    force_refresh = payload.force_refresh if payload else False

    try:
        return analyze_paper_service(
            db=db,
            paper=paper,
            force_refresh=force_refresh,
        )
    except InsufficientContentError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except AIRateLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        )
    except AITimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
        )
    except AIMalformedResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    except (AIProviderConfigurationError, AIProviderUnavailableError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except PaperAnalysisError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


@router.get(
    "/{paper_id}/analysis",
    response_model=ResearchPaperAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Get existing AI analysis for a research paper",
)
def get_paper_analysis_endpoint(
    paper_id: UUID,
    auto_generate: bool = Query(
        default=False,
        description="If true and no analysis exists, generate one automatically",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResearchPaperAnalysisResponse:
    """
    Fetch existing persisted AI analysis for a research paper.
    If no analysis has been generated yet, returns 404 unless auto_generate=true.
    """
    paper = (
        db.query(ResearchPaper)
        .filter(ResearchPaper.id == paper_id)
        .first()
    )

    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research paper not found",
        )

    cached = get_cached_analysis(db, paper_id)
    if cached:
        return build_analysis_response(paper, cached, is_cached=True)

    if auto_generate:
        try:
            return analyze_paper_service(
                db=db,
                paper=paper,
                force_refresh=False,
            )
        except InsufficientContentError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            )
        except AIRateLimitError as exc:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=str(exc),
            )
        except AITimeoutError as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=str(exc),
            )
        except AIMalformedResponseError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            )
        except (AIProviderConfigurationError, AIProviderUnavailableError) as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            )
        except PaperAnalysisError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(exc),
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No analysis found for this paper. Please run the analysis first.",
    )