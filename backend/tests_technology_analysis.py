import math
import pytest
from datetime import date, datetime
from uuid import uuid4
from fastapi.testclient import TestClient

from backend.app.database.connection import get_db, SessionLocal
from backend.app.database.base import Base
from backend.app.main import app
from backend.app.models.patent import Patent
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.technology import Technology
from backend.app.models.technology_activity import TechnologyActivity
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.services.technology_analysis_service import (
    analyze_technology_intelligence,
    calculate_linear_slope,
    calculate_cagr,
    get_query_concept_terms,
    matches_concept,
)

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_linear_regression_slope_increasing():
    # 100 -> 180 -> 350 -> 700 -> 1400
    series = [(2021, 100.0), (2022, 180.0), (2023, 350.0), (2024, 700.0), (2025, 1400.0)]
    slope = calculate_linear_slope(series)
    assert slope > 0, "Slope should be positive for increasing trajectory"
    assert round(slope, 1) == 312.0


def test_linear_regression_slope_declining():
    series = [(2021, 500.0), (2022, 400.0), (2023, 300.0), (2024, 200.0), (2025, 100.0)]
    slope = calculate_linear_slope(series)
    assert slope < 0, "Slope should be negative for declining trajectory"
    assert round(slope, 1) == -100.0


def test_linear_regression_slope_stable():
    series = [(2021, 100.0), (2022, 102.0), (2023, 99.0), (2024, 101.0), (2025, 100.0)]
    slope = calculate_linear_slope(series)
    assert abs(slope) < 1.0, "Slope should be close to 0 for stable trajectory"


def test_cagr_calculation():
    # 100 to 400 over 2 years = sqrt(4) - 1 = 100%
    cagr = calculate_cagr(100.0, 400.0, 2022, 2024)
    assert cagr is not None
    assert round(cagr, 1) == 100.0

    # Precondition checks: 0 start value should return None (no division by zero)
    assert calculate_cagr(0.0, 100.0, 2022, 2024) is None
    # Less than 2 years span
    assert calculate_cagr(100.0, 200.0, 2023, 2023) is None


def test_concept_expansion_and_safe_matching():
    terms = get_query_concept_terms("Medical Imaging AI")
    assert "medical image" in terms
    assert "radiology" in terms
    assert "mri" in terms

    # Test match
    assert matches_concept("Deep learning for brain tumor segmentation in MRI", terms) is True
    # Test non-match (unrelated)
    assert matches_concept("Solar cell efficiency in perovskite photovoltaic panels", terms) is False


def test_indicators_and_weights_total_100(db_session):
    analysis = analyze_technology_intelligence(db_session, "Medical Imaging AI")

    ind = analysis.indicators
    assert "research_growth" in ind
    assert "patent_growth" in ind
    assert "research_activity" in ind
    assert "patent_activity" in ind
    assert "organization_participation" in ind
    assert "application_diversity" in ind

    # Check exact weights
    assert ind["research_growth"].weight == 0.25
    assert ind["patent_growth"].weight == 0.25
    assert ind["research_activity"].weight == 0.15
    assert ind["patent_activity"].weight == 0.15
    assert ind["organization_participation"].weight == 0.10
    assert ind["application_diversity"].weight == 0.10

    total_weight = sum(i.weight for i in ind.values())
    assert round(total_weight, 2) == 1.0, "Weights must sum exactly to 1.0 (100%)"


def test_adoption_separated_from_maturity_weights(db_session):
    analysis = analyze_technology_intelligence(db_session, "Medical Imaging AI")

    # Adoption is an independent object
    assert hasattr(analysis, "adoption")
    assert analysis.adoption.level in ["High", "Moderate", "Low", "Insufficient Evidence"]
    assert analysis.adoption.trend in ["Increasing", "Stable", "Nascent", "Insufficient Evidence"]

    # Verify adoption is NOT in the 6 weighted indicators
    indicator_names = set(analysis.indicators.keys())
    assert "adoption" not in indicator_names
    assert "adoption_momentum" not in indicator_names


def test_insufficient_evidence_handling(db_session):
    analysis = analyze_technology_intelligence(db_session, "NonExistentFuturisticHyperTechnologyXYZ99")

    assert analysis.stage.classification == "Insufficient Evidence"
    assert analysis.stage.confidence == "Insufficient"
    assert analysis.coverage.status == "Insufficient"
    assert "insufficient" in analysis.stage.reason.lower() or "fewer than" in analysis.stage.reason.lower()


def test_mature_technology_classification(db_session):
    analysis = analyze_technology_intelligence(db_session, "Medical Imaging AI")

    assert analysis.stage.classification in ["Mature", "Developing"]
    assert len(analysis.yearly_evidence) > 2
    assert analysis.coverage.status in ["Strong", "Partial"]
    assert len(analysis.stage.supporting_signals) > 0


def test_multi_year_evidence_timeline_and_zero_handling(db_session):
    analysis = analyze_technology_intelligence(db_session, "Medical Imaging AI")

    timeline = analysis.yearly_evidence
    assert len(timeline) > 0

    for item in timeline:
        assert isinstance(item.year, int)
        assert item.research_count >= 0
        assert item.patent_count >= 0
        assert item.organization_count >= 0
        assert item.application_count >= 0

        # Verify no NaN or infinity in YoY growth
        if item.yoy_research_growth is not None:
            assert not math.isnan(item.yoy_research_growth)
            assert not math.isinf(item.yoy_research_growth)


def test_api_endpoint_analysis(db_session):
    response = client.get("/technologies/analysis?query=Medical%20Imaging%20AI")
    assert response.status_code == 200
    data = response.json()

    assert data["technology"] == "Medical Imaging AI"
    assert "indicators" in data
    assert "weighted_score" in data
    assert "stage" in data
    assert "adoption" in data
    assert "yearly_evidence" in data
    assert "evidence_records" in data


def test_api_endpoint_activity_summary(db_session):
    client.post("/technologies/sync")
    response = client.get("/technologies/activity/summary")
    assert response.status_code == 200
    data = response.json()

    assert "technologies" in data
    assert "technology_count" in data
    assert data["technology_count"] > 0


def test_api_endpoint_landscape(db_session):
    client.post("/technologies/sync")
    response = client.get("/technologies/landscape")
    assert response.status_code == 200
    data = response.json()

    assert "nodes" in data
    assert "clusters" in data
    assert len(data["nodes"]) > 0
    assert len(data["clusters"]) > 0

    first_node = data["nodes"][0]
    assert "normalized_coordinates" in first_node
    coords = first_node["normalized_coordinates"]
    assert "x" in coords
    assert "y" in coords
    assert "z" in coords
    assert "research_activity" in first_node
    assert "patent_activity" in first_node
    assert "organization_participation" in first_node
    assert "maturity_stage" in first_node
    assert "trend" in first_node
    assert "evidence_count" in first_node
    assert "cluster_id" in first_node


