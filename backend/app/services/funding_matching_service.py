import re
import math
import logging
from typing import Sequence
from uuid import UUID
from collections import Counter
from sqlalchemy.orm import Session, joinedload
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from backend.app.models.user import User
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.schemas.funding_opportunity import (
    FundingMatchBreakdown,
    FundingRecommendationItem,
    FundingRecommendationsResponse,
    FundingOpportunityResponse,
    ProfileSummaryContext,
)

logger = logging.getLogger(__name__)

# Stopwords for text normalization
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than",
    "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this",
    "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't",
    "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's",
    "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom",
    "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll",
    "you're", "you've", "your", "yours", "yourself", "yourselves"
}

# Domain ontology mapping: broad concepts and synonyms to improve semantic recall
CONCEPT_SYNONYMS = {
    "healthtech": ["health technology", "digital health", "healthcare", "medical technology", "biomedical", "diagnostics", "telemedicine", "ehealth"],
    "health": ["healthcare", "healthtech", "digital health", "medical", "clinical", "biomedical", "medicine"],
    "sustainable": ["sustainability", "renewable", "clean", "green", "environmental", "climate", "eco", "circular economy", "energy efficiency"],
    "sustainability": ["sustainable", "green", "clean energy", "environmental", "renewable"],
    "ai": ["artificial intelligence", "machine learning", "deep learning", "neural networks", "computer vision", "nlp", "llm", "generative ai"],
    "artificial intelligence": ["ai", "machine learning", "deep learning", "neural networks", "generative ai"],
    "biotechnology": ["biotech", "bio-engineering", "genomics", "bioinformatics", "biomedical", "crispr", "molecular biology"],
    "biotech": ["biotechnology", "genomics", "biomedical", "bio-engineering", "diagnostics"],
    "energy": ["renewable energy", "solar", "wind", "hydrogen", "battery", "grid", "storage", "bio-energy", "biofuel", "clean tech"],
    "quantum": ["quantum computing", "quantum communication", "quantum sensing", "qubits", "quantum cryptography"],
    "cybersecurity": ["cyber security", "network security", "cryptography", "information security", "cyber defense", "cloud security"],
    "agriculture": ["agritech", "precision agriculture", "crop genetics", "farming", "sustainable agriculture", "horticulture"],
    "agritech": ["agriculture", "smart farming", "crop science", "food technology"],
    "semiconductor": ["vlsi", "microelectronics", "chip design", "hardware", "integrated circuits", "c2s"],
}


def clean_and_tokenize(text: str | None) -> list[str]:
    """Tokenize and clean string into list of non-stopword lowercase terms."""
    if not text:
        return []
    cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
    tokens = [t.strip() for t in re.split(r"[\s,;]+", cleaned) if len(t.strip()) > 2]
    return [t for t in tokens if t not in STOP_WORDS]


def extract_concept_expansions(text: str) -> list[str]:
    """Expands query terms with related synonyms and domain concepts."""
    tokens = clean_and_tokenize(text)
    expanded = set(tokens)
    for t in tokens:
        if t in CONCEPT_SYNONYMS:
            expanded.update(CONCEPT_SYNONYMS[t])
    return list(expanded)


def extract_researcher_profile_data(user: User, db: Session) -> dict:
    """
    Extract structured research profile data from Module 2 models.
    Safely retrieves User attributes, ResearchProfile, and related collections.
    """
    profile = (
        db.query(ResearchProfile)
        .options(
            joinedload(ResearchProfile.research_areas),
            joinedload(ResearchProfile.keywords),
            joinedload(ResearchProfile.technology_areas),
            joinedload(ResearchProfile.publications),
            joinedload(ResearchProfile.patents),
        )
        .filter(ResearchProfile.user_id == user.id)
        .first()
    )

    domain = (profile.research_domain if profile and profile.research_domain else user.research_domain) or ""
    interests = (profile.research_interests if profile and profile.research_interests else "") or ""
    areas = [ra.name for ra in profile.research_areas] if profile and profile.research_areas else []
    keywords = [kw.name for kw in profile.keywords] if profile and profile.keywords else []
    tech_areas = [ta.name for ta in profile.technology_areas] if profile and profile.technology_areas else []
    publications = [p.title for p in profile.publications] if profile and profile.publications else []
    patents = [p.title for p in profile.patents] if profile and profile.patents else []

    has_profile = bool(profile or domain or areas or keywords)

    return {
        "user_id": user.id,
        "user_name": user.name or "",
        "organization": user.organization or "",
        "country": user.country or "",
        "department": user.department or "",
        "role": user.role or "",
        "research_domain": domain,
        "research_interests": interests,
        "research_areas": areas,
        "keywords": keywords,
        "technology_areas": tech_areas,
        "publications": publications,
        "patents": patents,
        "has_profile": has_profile,
    }


def build_researcher_representation(
    profile_data: dict,
    topic_query: str | None = None,
    focus_terms: list[str] | None = None,
) -> str:
    """
    Construct a dense, semantically-rich query representation combining:
      - Explicit user topic search query (with high weight if provided)
      - Active selected focus chips
      - Module 2 researcher profile (domain, areas, keywords, tech areas, interests, affiliation)
    """
    parts = []

    # 1. Primary User-Entered Topic
    if topic_query and topic_query.strip():
        q_clean = topic_query.strip()
        expansions = extract_concept_expansions(q_clean)
        parts.append(f"TARGET TOPIC SEARCH: {q_clean}. {q_clean}. Focus Area: {', '.join(expansions[:6])}.")

    # 2. Active Focus Chips
    if focus_terms:
        parts.append(f"Active Selected Focus: {', '.join(focus_terms)}.")

    # 3. Researcher Profile Context
    if profile_data.get("research_domain"):
        parts.append(f"Domain: {profile_data['research_domain']}.")
    if profile_data.get("research_areas"):
        parts.append(f"Research Areas: {', '.join(profile_data['research_areas'])}.")
    if profile_data.get("keywords"):
        parts.append(f"Keywords: {', '.join(profile_data['keywords'])}.")
    if profile_data.get("technology_areas"):
        parts.append(f"Technology Areas: {', '.join(profile_data['technology_areas'])}.")
    if profile_data.get("research_interests"):
        parts.append(f"Interests: {profile_data['research_interests']}.")
    if profile_data.get("publications"):
        sample_pubs = profile_data["publications"][:5]
        parts.append(f"Recent Works: {'; '.join(sample_pubs)}.")
    if profile_data.get("organization"):
        parts.append(f"Affiliation: {profile_data['organization']}.")

    return " ".join(parts).strip()


def build_funding_representation(opportunity: FundingOpportunity) -> str:
    """
    Construct a rich, normalized text representation of a funding opportunity.
    Combines title, agency, description, funding_category, research_area, and eligibility.
    """
    parts = []
    if opportunity.title:
        parts.append(f"Title: {opportunity.title}.")
    if opportunity.agency:
        parts.append(f"Agency: {opportunity.agency}.")
    if opportunity.research_area:
        parts.append(f"Research Area: {opportunity.research_area}.")
    if opportunity.funding_category:
        parts.append(f"Category: {opportunity.funding_category}.")
    if opportunity.funding_type:
        parts.append(f"Type: {opportunity.funding_type}.")
    if opportunity.description:
        parts.append(f"Description: {opportunity.description}.")
    if opportunity.eligibility:
        parts.append(f"Eligibility: {opportunity.eligibility}.")

    return " ".join(parts).strip()


def compute_semantic_similarities(
    query_text: str,
    funding_texts: list[str],
) -> np.ndarray:
    """
    Computes cosine similarity between researcher query representation
    and a list of funding opportunity texts using TF-IDF N-gram semantic vectorization.
    Safe against empty strings and division by zero.
    """
    if not query_text.strip() or not funding_texts:
        return np.zeros(len(funding_texts))

    corpus = [query_text] + [ft if ft.strip() else "general scientific research funding" for ft in funding_texts]

    try:
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            max_features=10000,
            sublinear_tf=True,
        )
        tfidf_matrix = vectorizer.fit_transform(corpus)
        query_vec = tfidf_matrix[0:1]
        funding_vecs = tfidf_matrix[1:]
        sims = cosine_similarity(query_vec, funding_vecs)[0]
        return np.nan_to_num(sims, nan=0.0, posinf=1.0, neginf=0.0)
    except Exception as e:
        logger.warning(f"Error computing semantic similarity with TFIDF: {e}")
        return np.zeros(len(funding_texts))


def assess_eligibility_signal(profile_data: dict, opportunity: FundingOpportunity) -> tuple[float, str, str | None]:
    """
    Evaluates applicant eligibility compatibility in a non-hallucinatory manner.
    Returns:
        (eligibility_score: 0.0 - 1.0, eligibility_status_string, optional_note)
    """
    eligibility_text = (opportunity.eligibility or "").lower()
    if not eligibility_text:
        return 0.85, "Insufficient Information", "Detailed eligibility criteria not specified by sponsor."

    user_org = (profile_data.get("organization") or "").lower()
    user_country = (profile_data.get("country") or "").lower()
    user_role = (profile_data.get("role") or "").lower()

    matches = []
    # Academic / Higher education
    if any(k in eligibility_text for k in ["higher education", "university", "universities", "academic", "institution", "faculty"]):
        if any(k in user_org for k in ["university", "college", "institute", "school", "univ", "faculty", "iit", "aiims"]) or user_role in ["researcher", "academic", "faculty", "professor"]:
            matches.append("academic institution")

    # Small business / startup
    if any(k in eligibility_text for k in ["small business", "sbir", "sttr", "startup", "for-profit", "msme"]):
        if any(k in user_org for k in ["inc", "llc", "ltd", "corp", "startup", "technologies", "labs"]):
            matches.append("business/startup entity")

    # Non-profit
    if any(k in eligibility_text for k in ["nonprofit", "non-profit", "501(c)(3)", "society"]):
        if "nonprofit" in user_org or "foundation" in user_org or "society" in user_org:
            matches.append("non-profit organization")

    # Geographic criteria
    opp_country = (opportunity.country or "").lower()
    if opp_country and user_country and opp_country != "global":
        if user_country in opp_country or opp_country in user_country:
            matches.append("geographic region")

    if matches:
        return 1.0, "Potentially Eligible", f"Your affiliation aligns with {', '.join(matches)} requirements."

    return 0.80, "Potentially Eligible", "Requires manual verification against sponsor eligibility guidelines."


def calculate_match_details(
    profile_data: dict,
    opportunity: FundingOpportunity,
    semantic_sim: float,
    topic_query: str | None = None,
    focus_terms: list[str] | None = None,
) -> FundingMatchBreakdown:
    """
    Calculates transparent, multi-level relevance score (0-100),
    identifies exact matched terms, and produces a factual explanation.

    Multi-level Strategy:
      Level 1: Exact Topic Match (direct phrase match in title/description/area)
      Level 2: Keyword & Concept Matching (extracted terms and domain expansions)
      Level 3: Semantic Cosine Similarity (TF-IDF vector alignment)
      Level 4: Profile & Focus alignment (Module 2 researcher signals)
      Level 5: Eligibility compatibility
    """
    opp_title = (opportunity.title or "").lower()
    opp_desc = (opportunity.description or "").lower()
    opp_area = (opportunity.research_area or "").lower()
    opp_cat = (opportunity.funding_category or "").lower()
    opp_full = f"{opp_title} {opp_desc} {opp_area} {opp_cat}".lower()
    opp_tokens = set(clean_and_tokenize(opp_full))

    matched_concepts = []
    matched_areas = []
    matched_keywords = []
    matched_tech = []
    matched_focus = []
    exact_topic_matched = False
    topic_keyword_matches = []

    # 1. Level 1: Topic Exact and Keyword Match
    if topic_query and topic_query.strip():
        q_raw = topic_query.strip().lower()
        if q_raw in opp_full:
            exact_topic_matched = True
            matched_concepts.append(topic_query.strip())

        q_tokens = clean_and_tokenize(q_raw)
        for qt in q_tokens:
            if qt in opp_tokens:
                topic_keyword_matches.append(qt)
                matched_concepts.append(qt)

        # Synonym/Domain concept overlap
        expansions = extract_concept_expansions(q_raw)
        for exp in expansions:
            if exp not in q_tokens and (exp in opp_full or exp in opp_tokens):
                matched_concepts.append(exp)

    # 2. Focus Terms match
    if focus_terms:
        for ft in focus_terms:
            ft_clean = ft.lower().strip()
            if ft_clean in opp_full:
                matched_focus.append(ft)
                matched_concepts.append(ft)
            else:
                ft_tokens = set(clean_and_tokenize(ft_clean))
                if ft_tokens and (ft_tokens & opp_tokens):
                    matched_focus.append(ft)
                    matched_concepts.append(ft)

    # 3. Match Research Areas from Profile
    user_areas = profile_data.get("research_areas", [])
    for area in user_areas:
        area_clean = area.lower().strip()
        if area_clean in opp_full:
            matched_areas.append(area)
        else:
            area_tokens = set(clean_and_tokenize(area_clean))
            if area_tokens and area_tokens.issubset(opp_tokens):
                matched_areas.append(area)

    # 4. Match Keywords from Profile
    user_keywords = profile_data.get("keywords", [])
    for kw in user_keywords:
        kw_clean = kw.lower().strip()
        if kw_clean in opp_full:
            matched_keywords.append(kw)
        else:
            kw_tokens = set(clean_and_tokenize(kw_clean))
            if kw_tokens and (kw_tokens & opp_tokens):
                matched_keywords.append(kw)

    # 5. Match Technology Areas from Profile
    user_tech = profile_data.get("technology_areas", [])
    for ta in user_tech:
        ta_clean = ta.lower().strip()
        if ta_clean in opp_full:
            matched_tech.append(ta)

    # 6. Domain Overlap
    domain = profile_data.get("research_domain", "")
    domain_matched = False
    if domain:
        domain_clean = domain.lower()
        if domain_clean in opp_full:
            domain_matched = True
        else:
            domain_tokens = set(clean_and_tokenize(domain_clean))
            if domain_tokens and (domain_tokens & opp_tokens):
                domain_matched = True

    # Component Scores
    semantic_comp = min(max(semantic_sim, 0.0), 1.0)

    # Keyword & Concept Score
    if topic_query and topic_query.strip():
        q_tokens = clean_and_tokenize(topic_query)
        q_overlap_ratio = (len(topic_keyword_matches) / max(len(q_tokens), 1)) if q_tokens else 0.0
        kw_comp = (0.6 * q_overlap_ratio) + (0.4 * semantic_comp)
    else:
        kw_ratio = (len(matched_keywords) / max(len(user_keywords), 1)) if user_keywords else 0.0
        tech_ratio = (len(matched_tech) / max(len(user_tech), 1)) if user_tech else 0.0
        kw_comp = (0.7 * kw_ratio + 0.3 * tech_ratio) if (user_keywords or user_tech) else semantic_comp

    # Domain / Area Score
    area_ratio = (len(matched_areas) / max(len(user_areas), 1)) if user_areas else 0.0
    domain_val = 1.0 if domain_matched else 0.0
    domain_area_comp = (0.6 * area_ratio + 0.4 * domain_val) if (user_areas or domain) else semantic_comp

    # Eligibility signal
    elig_comp, elig_status, elig_note = assess_eligibility_signal(profile_data, opportunity)

    # Calculate Base Relevance Score
    if topic_query and topic_query.strip():
        # Search-Driven Weighting (Semantic 50%, Keyword/Concepts 30%, Area/Domain 12%, Eligibility 8%)
        base_score = (
            (semantic_comp * 0.50) +
            (kw_comp * 0.30) +
            (domain_area_comp * 0.12) +
            (elig_comp * 0.08)
        )
        if exact_topic_matched:
            base_score = min(base_score + 0.20, 1.0)
    else:
        # Profile-Driven Weighting
        if not user_areas and not user_keywords and not domain:
            base_score = (semantic_comp * 0.85) + (elig_comp * 0.15)
        else:
            base_score = (
                (semantic_comp * 0.45) +
                (domain_area_comp * 0.25) +
                (kw_comp * 0.20) +
                (elig_comp * 0.10)
            )

    # Dynamic Focus Chips Boost
    if focus_terms and matched_focus:
        focus_boost = 0.10 * (len(matched_focus) / len(focus_terms))
        base_score = min(base_score + focus_boost, 1.0)

    # If top profile signals match strongly (domain + keywords), ensure high-confidence scaling
    if domain_matched and (matched_areas or matched_keywords):
        base_score = min(base_score + 0.05, 1.0)

    calibrated_score = round(float(base_score * 100.0), 1)
    relevance_score = min(max(calibrated_score, 0.0), 99.5)

    # Match Level Determination
    if relevance_score >= 80.0:
        match_level = "Excellent Match"
    elif relevance_score >= 65.0:
        match_level = "Strong Match"
    elif relevance_score >= 50.0:
        match_level = "Good Match"
    elif relevance_score >= 35.0:
        match_level = "Moderate Match"
    else:
        match_level = "Low Match"

    # Match Type Classification
    if exact_topic_matched:
        match_type = "Exact Topic Match"
    elif topic_query and topic_keyword_matches:
        match_type = "Keyword & Concept Match"
    elif topic_query:
        match_type = "Semantic / Related Match"
    elif matched_focus:
        match_type = "Research Focus Match"
    elif matched_areas or matched_keywords:
        match_type = "Profile & Area Match"
    else:
        match_type = "Contextual Semantic Match"

    # Deduplicate matched concepts
    unique_concepts = list(dict.fromkeys(matched_concepts))

    # Explanation Generation
    explanation_points = []
    if exact_topic_matched:
        explanation_points.append(f"Direct mention of your search topic '{topic_query.strip()}' in grant solicitation.")
    elif topic_query and topic_keyword_matches:
        explanation_points.append(f"Matches search concepts: {', '.join(topic_keyword_matches)}.")
    elif topic_query and semantic_comp >= 0.15:
        explanation_points.append(f"Conceptually related to '{topic_query.strip()}' based on domain semantic similarity.")

    if matched_focus:
        explanation_points.append(f"Active research focus alignment: {', '.join(matched_focus)}.")
    if domain_matched and domain:
        explanation_points.append(f"Domain alignment with '{domain}'.")
    if matched_areas:
        explanation_points.append(f"Research area overlap in {', '.join(matched_areas)}.")
    if matched_keywords:
        explanation_points.append(f"Keyword match: {', '.join(matched_keywords)}.")
    if elig_note:
        explanation_points.append(elig_note)

    if not explanation_points:
        explanation_points.append("Related to your broader scientific research background.")

    # High-level summary sentence
    if exact_topic_matched:
        explanation_summary = f"Directly matches your topic '{topic_query.strip()}' with strong sponsor alignment."
    elif topic_query and unique_concepts:
        explanation_summary = f"Matches {', '.join(unique_concepts[:3])} concepts related to '{topic_query.strip()}'."
    elif topic_query:
        explanation_summary = f"Semantically related to '{topic_query.strip()}' in scientific and technical scope."
    elif matched_focus:
        explanation_summary = f"Prioritized for your active research focus in '{', '.join(matched_focus)}'."
    elif matched_areas and matched_keywords:
        explanation_summary = f"Recommended because your profile matches this grant in {', '.join(matched_areas[:2])} ({', '.join(matched_keywords[:2])})."
    else:
        explanation_summary = "Recommended based on contextual semantic analysis of your research profile."

    return FundingMatchBreakdown(
        semantic_similarity=round(float(semantic_sim), 4),
        semantic_score=round(float(semantic_comp * 100.0), 1),
        keyword_score=round(float(kw_comp * 100.0), 1),
        domain_score=round(float(domain_area_comp * 100.0), 1),
        eligibility_score=round(float(elig_comp * 100.0), 1),
        relevance_score=relevance_score,
        match_level=match_level,
        match_type=match_type,
        matched_research_areas=matched_areas,
        matched_keywords=matched_keywords,
        matched_technology_areas=matched_tech,
        matched_concepts=unique_concepts[:6],
        eligibility_status=elig_status,
        explanation=explanation_summary,
        explanation_points=explanation_points,
    )


def get_personalized_recommendations(
    user: User,
    db: Session,
    limit: int = 20,
    min_score: float = 0.0,
    topic_query: str | None = None,
    research_area_filter: str | None = None,
    funding_type_filter: str | None = None,
    agency_filter: str | None = None,
    focus_terms: list[str] | None = None,
) -> FundingRecommendationsResponse:
    """
    Generates personalized funding recommendations and topic search matching.
    Pipeline:
      1. Load user profile & related data from Module 2.
      2. Construct dense query representation (topic + focus chips + profile).
      3. Retrieve candidate funding opportunities (with non-restrictive hard filters).
      4. Compute TF-IDF semantic similarity vectors.
      5. Calculate multi-level relevance scores (Exact + Keyword + Semantic + Profile).
      6. Rank descending and apply relevance threshold post-scoring.
    """
    profile_data = extract_researcher_profile_data(user, db)
    profile_summary = ProfileSummaryContext(
        user_id=profile_data["user_id"],
        user_name=profile_data["user_name"],
        organization=profile_data["organization"] or None,
        country=profile_data["country"] or None,
        department=profile_data["department"] or None,
        research_domain=profile_data["research_domain"] or None,
        research_areas=profile_data["research_areas"],
        keywords=profile_data["keywords"],
        technology_areas=profile_data["technology_areas"],
        has_profile=profile_data["has_profile"],
    )

    query = db.query(FundingOpportunity)

    # Filtering by research area (if research_area_filter is explicitly provided without topic)
    if research_area_filter and research_area_filter.strip() and not topic_query:
        term = research_area_filter.strip()
        query = query.filter(
            (FundingOpportunity.research_area.ilike(f"%{term}%")) |
            (FundingOpportunity.funding_category.ilike(f"%{term}%")) |
            (FundingOpportunity.title.ilike(f"%{term}%")) |
            (FundingOpportunity.description.ilike(f"%{term}%"))
        )

    # Optional hard filters
    if funding_type_filter and funding_type_filter.strip():
        query = query.filter(FundingOpportunity.funding_type.ilike(f"%{funding_type_filter.strip()}%"))
    if agency_filter and agency_filter.strip():
        query = query.filter(FundingOpportunity.agency.ilike(f"%{agency_filter.strip()}%"))

    opportunities = query.all()

    if not opportunities:
        return FundingRecommendationsResponse(
            total=0,
            count=0,
            recommendations=[],
            profile_used=profile_summary,
            message="No funding opportunities are currently available in the database." if db.query(FundingOpportunity).count() == 0 else "No funding opportunities matched the requested filters.",
            search_query=topic_query,
        )

    # Build dense query representation
    query_text = build_researcher_representation(
        profile_data=profile_data,
        topic_query=topic_query or research_area_filter,
        focus_terms=focus_terms,
    )
    funding_texts = [build_funding_representation(opp) for opp in opportunities]

    # Compute semantic cosine similarity
    similarities = compute_semantic_similarities(query_text, funding_texts)

    scored_items: list[FundingRecommendationItem] = []
    for opp, sim in zip(opportunities, similarities):
        match_breakdown = calculate_match_details(
            profile_data=profile_data,
            opportunity=opp,
            semantic_sim=float(sim),
            topic_query=topic_query or research_area_filter,
            focus_terms=focus_terms,
        )
        if match_breakdown.relevance_score >= min_score:
            opp_resp = FundingOpportunityResponse.model_validate(opp)
            scored_items.append(
                FundingRecommendationItem(
                    funding_opportunity=opp_resp,
                    match=match_breakdown,
                )
            )

    # Rank by relevance score descending
    scored_items.sort(key=lambda item: item.match.relevance_score, reverse=True)
    top_recommendations = scored_items[:limit]

    message = None
    if not scored_items and min_score > 0:
        message = f"No funding opportunities met the {int(min_score)}% relevance threshold. Try lowering the minimum match slider."
    elif not profile_data["has_profile"] and not topic_query:
        message = "Your research profile is incomplete. Add research domain, areas, and keywords to receive highly personalized recommendations."

    return FundingRecommendationsResponse(
        total=len(scored_items),
        count=len(top_recommendations),
        recommendations=top_recommendations,
        profile_used=profile_summary,
        message=message,
        search_query=topic_query or research_area_filter,
    )


def match_single_funding_opportunity(
    user: User,
    opportunity_id: UUID,
    db: Session,
) -> tuple[FundingOpportunity, FundingMatchBreakdown, ProfileSummaryContext]:
    """
    Computes detailed match analysis for a single opportunity and authenticated user.
    """
    opportunity = (
        db.query(FundingOpportunity)
        .filter(FundingOpportunity.id == opportunity_id)
        .first()
    )

    if not opportunity:
        raise ValueError("Funding opportunity not found")

    profile_data = extract_researcher_profile_data(user, db)
    profile_summary = ProfileSummaryContext(
        user_id=profile_data["user_id"],
        user_name=profile_data["user_name"],
        organization=profile_data["organization"] or None,
        country=profile_data["country"] or None,
        department=profile_data["department"] or None,
        research_domain=profile_data["research_domain"] or None,
        research_areas=profile_data["research_areas"],
        keywords=profile_data["keywords"],
        technology_areas=profile_data["technology_areas"],
        has_profile=profile_data["has_profile"],
    )

    researcher_text = build_researcher_representation(profile_data)
    funding_text = build_funding_representation(opportunity)

    sims = compute_semantic_similarities(researcher_text, [funding_text])
    sim = float(sims[0]) if len(sims) > 0 else 0.0

    match_breakdown = calculate_match_details(profile_data, opportunity, sim)
    return opportunity, match_breakdown, profile_summary
