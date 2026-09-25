import math
import pytest
from fastapi.testclient import TestClient

from backend.app.database.connection import SessionLocal
from backend.app.main import app
from backend.app.services.innovation_scoring_service import (
    InnovationScoringService,
    innovation_scoring_service,
    WEIGHT_RESEARCH_NOVELTY,
    WEIGHT_PATENT_STRENGTH,
    WEIGHT_TECH_MATURITY,
    WEIGHT_MARKET_POTENTIAL,
    WEIGHT_FUNDING_RELEVANCE,
)

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_mandatory_factor_weights_sum_to_100():
    weights = [
        WEIGHT_RESEARCH_NOVELTY,
        WEIGHT_PATENT_STRENGTH,
        WEIGHT_TECH_MATURITY,
        WEIGHT_MARKET_POTENTIAL,
        WEIGHT_FUNDING_RELEVANCE,
    ]
    assert weights == [0.30, 0.20, 0.15, 0.20, 0.15]
    assert round(sum(weights), 2) == 1.00


def test_authoritative_score_formula_validation(db_session):
    res = innovation_scoring_service.evaluate_innovation_score(db_session, "Quantum Computing")
    
    factors = res.factors
    assert "research_novelty" in factors
    assert "patent_strength" in factors
    assert "tech_maturity" in factors
    assert "market_potential" in factors
    assert "funding_relevance" in factors

    rn = factors["research_novelty"]
    ps = factors["patent_strength"]
    tm = factors["tech_maturity"]
    mp = factors["market_potential"]
    fr = factors["funding_relevance"]

    # Verify weights
    assert rn.weight == 0.30
    assert ps.weight == 0.20
    assert tm.weight == 0.15
    assert mp.weight == 0.20
    assert fr.weight == 0.15

    # If all available, manual formula check
    if all(f.normalized_score is not None for f in [rn, ps, tm, mp, fr]):
        expected_score = (
            rn.normalized_score * 0.30
            + ps.normalized_score * 0.20
            + tm.normalized_score * 0.15
            + mp.normalized_score * 0.20
            + fr.normalized_score * 0.15
        )
        assert abs(res.overall_score - expected_score) < 0.05, "Overall score must strictly match the formula"


def test_target_technologies_evaluation(db_session):
    test_techs = [
        "Quantum Computing",
        "Synthetic Biology",
        "Space Tech",
        "Brain-Computer Interfaces",
        "Smart Materials",
        "Medical Imaging AI",
        "Clean Energy",
        "Cybersecurity",
        "Generative AI",
        "Edge AI",
    ]

    for tech in test_techs:
        res = innovation_scoring_service.evaluate_innovation_score(db_session, tech)
        assert res.technology == tech
        assert 0.0 <= res.overall_score <= 100.0
        assert res.strongest_factor != ""
        assert res.weakest_factor != ""
        assert len(res.detailed_reasoning) > 0
        assert res.methodology_version == "v1.0"


def test_missing_data_and_true_zero_handling(db_session):
    # Non-existent query to test edge cases
    res = innovation_scoring_service.evaluate_innovation_score(
        db_session, "HyperDimensionalWormholeTeleportation999XYZ"
    )

    assert 0.0 <= res.overall_score <= 100.0
    assert res.factors["research_novelty"].status in ["available", "insufficient_evidence", "true_zero"]
    assert "HyperDimensionalWormholeTeleportation999XYZ" in res.technology


def test_no_contradictory_explanations(db_session):
    res = innovation_scoring_service.evaluate_innovation_score(db_session, "Clean Energy")
    
    for factor in res.factors.values():
        # Score bounds
        if factor.normalized_score is not None:
            assert 0.0 <= factor.normalized_score <= 100.0
            assert factor.weighted_contribution == round(factor.normalized_score * factor.weight, 2)
            assert len(factor.evidence_summary) > 0


def test_api_endpoint_post_assess(db_session):
    response = client.post("/innovation/assess", json={"technology": "Medical Imaging AI"})
    assert response.status_code == 200
    data = response.json()

    assert data["technology"] == "Medical Imaging AI"
    assert "overall_score" in data
    assert "factors" in data
    assert len(data["factors"]) == 5
    assert data["factors"]["research_novelty"]["weight"] == 0.30
    assert data["factors"]["patent_strength"]["weight"] == 0.20
    assert data["factors"]["tech_maturity"]["weight"] == 0.15
    assert data["factors"]["market_potential"]["weight"] == 0.20
    assert data["factors"]["funding_relevance"]["weight"] == 0.15


def test_api_endpoint_get_technology_score(db_session):
    response = client.get("/innovation/technologies/Synthetic%20Biology")
    assert response.status_code == 200
    data = response.json()

    assert data["technology"] == "Synthetic Biology"
    assert data["overall_score"] > 0
    assert "summary_explanation" in data


def test_analyze_idea_endpoint(db_session):
    payload = {
        "idea_text": "AI-powered synthetic biology platform for disease detection and metabolic engineering",
        "target_domain": "Biotechnology"
    }
    response = client.post("/innovation/analyze-idea", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "extracted_domain" in data
    assert "innovation_score" in data
    assert data["innovation_score"]["overall_score"] >= 0.0
    assert "research_similarity_score" in data
    assert "patent_similarity_score" in data
    assert "research_gaps" in data
    assert "potential_differentiation_areas" in data
    assert isinstance(data["research_gaps"], list)


def test_compare_technologies_endpoint(db_session):
    payload = {
        "technologies": ["Quantum Computing", "Generative AI"]
    }
    response = client.post("/innovation/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "comparison_items" in data
    assert len(data["comparison_items"]) == 2
    assert "comparison_notes" in data


def test_grok_brief_endpoint(db_session):
    payload = {
        "technology": "Quantum Computing"
    }
    response = client.post("/innovation/grok-brief", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["technology"] == "Quantum Computing"
    assert "executive_summary" in data
    assert "strongest_signals" in data
    assert "opportunity_signals" in data
    assert "provider" in data


def test_ask_analyst_endpoint(db_session):
    payload = {
        "technology": "Clean Energy",
        "question": "What are the strongest innovation signals and research gaps for this domain?"
    }
    response = client.post("/innovation/ask-analyst", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "answer" in data
    assert len(data["answer"]) > 10
    assert "grounded_evidence_points" in data
    assert "provider" in data


