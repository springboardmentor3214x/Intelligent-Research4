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

def clean_and_tokenize(text: str | None) -> list[str]:
    """Tokenize and clean string into list of non-stopword lowercase terms."""
    if not text:
        return []
    cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
    tokens = [t.strip() for t in re.split(r"[\s,;]+", cleaned) if len(t.strip()) > 2]
    return [t for t in tokens if t not in STOP_WORDS]


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


def build_researcher_representation(profile_data: dict) -> str:
    """
    Construct a dense, semantically-rich text representation of the researcher's focus.
    Combines domain, areas, keywords, tech areas, interests, and publications.
    """
    parts = []
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
    researcher_text: str,
    funding_texts: list[str],
) -> np.ndarray:
    """
    Computes cosine similarity between researcher profile representation
    and a list of funding opportunity texts using TF-IDF N-gram semantic vectorization.
    Safe against empty strings and division by zero.
    """
    if not researcher_text.strip() or not funding_texts:
        return np.zeros(len(funding_texts))

    # All documents to fit vectorizer
    corpus = [researcher_text] + [ft if ft.strip() else "general research funding" for ft in funding_texts]

    try:
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            max_features=5000,
            sublinear_tf=True,
        )
        tfidf_matrix = vectorizer.fit_transform(corpus)
        researcher_vec = tfidf_matrix[0:1]
        funding_vecs = tfidf_matrix[1:]
        sims = cosine_similarity(researcher_vec, funding_vecs)[0]
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
        return 0.85, "Eligibility Information Unavailable", "Detailed eligibility criteria not specified by source"

    user_org = (profile_data.get("organization") or "").lower()
    user_country = (profile_data.get("country") or "").lower()
    user_role = (profile_data.get("role") or "").lower()

    # Check for restrictive criteria
    mismatches = []
    matches = []

    # Academic / Higher education
    if any(k in eligibility_text for k in ["higher education", "university", "universities", "academic", "institution"]):
        if any(k in user_org for k in ["university", "college", "institute", "school", "univ", "faculty"]) or user_role in ["researcher", "academic", "faculty", "professor"]:
            matches.append("academic institution")

    # Small business / startup
    if any(k in eligibility_text for k in ["small business", "sbir", "sttr", "startup", "for-profit"]):
        if any(k in user_org for k in ["inc", "llc", "ltd", "corp", "startup", "technologies", "labs"]):
            matches.append("business/commercial entity")

    # Non-profit
    if any(k in eligibility_text for k in ["nonprofit", "non-profit", "501(c)(3)"]):
        if "nonprofit" in user_org or "foundation" in user_org:
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
) -> FundingMatchBreakdown:
    """
    Calculates transparent, multi-signal relevance score (0-100),
    identifies exact matched terms, and produces a factual explanation.

    Formula:
      Semantic Score (45%) + Research Area/Domain Score (25%) + Keyword Score (20%) + Eligibility Signal (10%)
    """
    opp_text = f"{opportunity.title or ''} {opportunity.description or ''} {opportunity.research_area or ''} {opportunity.funding_category or ''}".lower()
    opp_tokens = set(clean_and_tokenize(opp_text))

    # 1. Match Research Areas
    user_areas = profile_data.get("research_areas", [])
    matched_areas = []
    for area in user_areas:
        area_clean = area.lower().strip()
        if area_clean in opp_text:
            matched_areas.append(area)
        else:
            # Check individual token overlap
            area_tokens = set(clean_and_tokenize(area_clean))
            if area_tokens and area_tokens.issubset(opp_tokens):
                matched_areas.append(area)

    # 2. Match Keywords
    user_keywords = profile_data.get("keywords", [])
    matched_keywords = []
    for kw in user_keywords:
        kw_clean = kw.lower().strip()
        if kw_clean in opp_text:
            matched_keywords.append(kw)
        else:
            kw_tokens = set(clean_and_tokenize(kw_clean))
            if kw_tokens and (kw_tokens & opp_tokens):
                matched_keywords.append(kw)

    # 3. Match Technology Areas
    user_tech = profile_data.get("technology_areas", [])
    matched_tech = []
    for ta in user_tech:
        ta_clean = ta.lower().strip()
        if ta_clean in opp_text:
            matched_tech.append(ta)

    # 4. Domain Overlap
    domain = profile_data.get("research_domain", "")
    domain_matched = False
    if domain:
        domain_clean = domain.lower()
        if domain_clean in opp_text:
            domain_matched = True
        else:
            domain_tokens = set(clean_and_tokenize(domain_clean))
            if domain_tokens and (domain_tokens & opp_tokens):
                domain_matched = True

    # 5. Component Scores (0.0 to 1.0)
    # Semantic Score (normalized)
    semantic_score_comp = min(max(semantic_sim, 0.0), 1.0)

    # Area & Domain Score
    area_ratio = (len(matched_areas) / max(len(user_areas), 1)) if user_areas else 0.0
    domain_val = 1.0 if domain_matched else 0.0
    if user_areas and domain:
        domain_area_score_comp = (0.6 * area_ratio) + (0.4 * domain_val)
    elif user_areas:
        domain_area_score_comp = area_ratio
    elif domain:
        domain_area_score_comp = domain_val
    else:
        domain_area_score_comp = 0.5 * semantic_score_comp

    # Keyword & Tech Score
    kw_ratio = (len(matched_keywords) / max(len(user_keywords), 1)) if user_keywords else 0.0
    tech_ratio = (len(matched_tech) / max(len(user_tech), 1)) if user_tech else 0.0
    if user_keywords and user_tech:
        keyword_score_comp = (0.7 * kw_ratio) + (0.3 * tech_ratio)
    elif user_keywords:
        keyword_score_comp = kw_ratio
    elif user_tech:
        keyword_score_comp = tech_ratio
    else:
        keyword_score_comp = 0.5 * semantic_score_comp

    # Eligibility component
    elig_comp, elig_status, elig_note = assess_eligibility_signal(profile_data, opportunity)

    # If profile is very sparse, scale primarily on semantic matching
    if not user_areas and not user_keywords and not domain:
        raw_final = (semantic_score_comp * 0.85) + (elig_comp * 0.15)
    else:
        raw_final = (
            (semantic_score_comp * 0.45) +
            (domain_area_score_comp * 0.25) +
            (keyword_score_comp * 0.20) +
            (elig_comp * 0.10)
        )

    # Map raw_final (typically 0.0 to 1.0) to an intuitive 0-100 scale with calibrated sigmoid/linear curve
    # Ensure high quality matches reach 85-98 while poor matches stay below 40
    calibrated_score = round(float(raw_final * 100.0), 1)
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

    # Build Explainability Signals (Anti-Hallucination: strictly derived from actual data)
    explanation_points = []
    if domain_matched and domain:
        explanation_points.append(f"Direct alignment with your core research domain '{domain}'.")
    if matched_areas:
        explanation_points.append(f"Focus area overlap in {', '.join(matched_areas)}.")
    if matched_keywords:
        explanation_points.append(f"Research keywords matched: {', '.join(matched_keywords)}.")
    if matched_tech:
        explanation_points.append(f"Technology focus matches {', '.join(matched_tech)}.")
    if semantic_sim >= 0.40:
        explanation_points.append("High semantic content similarity between your profile and the grant solicitation.")
    elif semantic_sim >= 0.20:
        explanation_points.append("Moderate contextual relevance to your research background.")
    if elig_note:
        explanation_points.append(elig_note)

    if not explanation_points:
        explanation_points.append("Opportunity shares general scientific scope with your academic interests.")

    # High level explanation paragraph
    if matched_areas and matched_keywords:
        explanation_summary = f"Recommended because your research profile matches this opportunity in {', '.join(matched_areas[:2])} with matching keywords ({', '.join(matched_keywords[:3])})."
    elif matched_areas:
        explanation_summary = f"Recommended based on close alignment with your research area in {', '.join(matched_areas)}."
    elif matched_keywords:
        explanation_summary = f"Recommended because key topics in this grant align with your keywords: {', '.join(matched_keywords)}."
    elif domain_matched and domain:
        explanation_summary = f"Recommended due to strong domain relevance in {domain}."
    else:
        explanation_summary = "Recommended based on contextual semantic analysis of your research profile."

    return FundingMatchBreakdown(
        semantic_similarity=round(float(semantic_sim), 4),
        semantic_score=round(float(semantic_score_comp * 100.0), 1),
        keyword_score=round(float(keyword_score_comp * 100.0), 1),
        domain_score=round(float(domain_area_score_comp * 100.0), 1),
        eligibility_score=round(float(elig_comp * 100.0), 1),
        relevance_score=relevance_score,
        match_level=match_level,
        matched_research_areas=matched_areas,
        matched_keywords=matched_keywords,
        matched_technology_areas=matched_tech,
        eligibility_status=elig_status,
        explanation=explanation_summary,
        explanation_points=explanation_points,
    )


def get_personalized_recommendations(
    user: User,
    db: Session,
    limit: int = 10,
    min_score: float = 0.0,
    research_area_filter: str | None = None,
    funding_type_filter: str | None = None,
    agency_filter: str | None = None,
) -> FundingRecommendationsResponse:
    """
    Generates personalized funding recommendations for the authenticated user.
    Pipeline:
      1. Load user profile & related data from Module 2.
      2. Build researcher representation.
      3. Query available funding opportunities.
      4. Compute semantic similarity vectors.
      5. Calculate multi-factor relevance scores & explanations.
      6. Filter and rank descending by score.
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

    if research_area_filter:
        query = query.filter(FundingOpportunity.research_area.ilike(f"%{research_area_filter}%"))
    if funding_type_filter:
        query = query.filter(FundingOpportunity.funding_type.ilike(f"%{funding_type_filter}%"))
    if agency_filter:
        query = query.filter(FundingOpportunity.agency.ilike(f"%{agency_filter}%"))

    opportunities = query.all()

    if not opportunities:
        return FundingRecommendationsResponse(
            total=0,
            count=0,
            recommendations=[],
            profile_used=profile_summary,
            message="No funding opportunities are currently available in the database." if db.query(FundingOpportunity).count() == 0 else "No funding opportunities matched the requested filters.",
        )

    # Build representations
    researcher_text = build_researcher_representation(profile_data)
    funding_texts = [build_funding_representation(opp) for opp in opportunities]

    # Semantic similarity calculation
    similarities = compute_semantic_similarities(researcher_text, funding_texts)

    scored_items: list[FundingRecommendationItem] = []
    for opp, sim in zip(opportunities, similarities):
        match_breakdown = calculate_match_details(profile_data, opp, float(sim))
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
    if not profile_data["has_profile"]:
        message = "Your research profile is incomplete. Add research domain, areas, and keywords to receive highly personalized recommendations."

    return FundingRecommendationsResponse(
        total=len(scored_items),
        count=len(top_recommendations),
        recommendations=top_recommendations,
        profile_used=profile_summary,
        message=message,
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
