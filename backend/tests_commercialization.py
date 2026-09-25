import pytest
from fastapi.testclient import TestClient

from backend.app.database.connection import SessionLocal
from backend.app.main import app
from backend.app.services.commercialization_service import commercialization_service

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===========================================================================
# 1. Valid Technology Analysis & Endpoints
# ===========================================================================

def test_valid_commercialization_analysis(db_session):
    """Test full commercialization analysis on valid technology."""
    tech = "Medical Imaging AI"
    res = commercialization_service.perform_full_commercialization_analysis(db_session, tech)
    
    assert res.technology == tech
    assert res.status == "success"
    assert len(res.applications) > 0
    assert len(res.products) > 0
    assert len(res.startups) > 0
    assert len(res.licensing_opportunities) > 0
    assert len(res.industry_partnerships) > 0
    assert len(res.readiness_dimensions) > 0
    assert res.gap_analysis is not None
    assert len(res.gap_analysis.available_evidence) > 0
    assert len(res.patent_product_mappings) > 0
    assert res.evidence is not None


def test_api_analyze_endpoint():
    """Test GET /commercialization/analyze/{technology} endpoint."""
    response = client.get("/commercialization/analyze/Medical%20Imaging%20AI")
    assert response.status_code == 200
    data = response.json()
    assert data["technology"] == "Medical Imaging AI"
    assert "applications" in data
    assert "products" in data
    assert "startups" in data
    assert "licensing_opportunities" in data
    assert "industry_partnerships" in data
    assert "readiness_dimensions" in data
    assert "gap_analysis" in data
    assert "patent_product_mappings" in data
    assert "evidence" in data


# ===========================================================================
# 2. Member 1: Application Identification
# ===========================================================================

def test_application_identification(db_session):
    """Test Member 1 application recommendations output format and fields."""
    tech = "Quantum Computing"
    res = commercialization_service.analyze_commercial_applications(db_session, tech)
    
    assert res.technology == tech
    assert res.status == "success"
    assert res.total_applications >= 1
    
    app = res.applications[0]
    assert app.application_name
    assert app.relevance in ["High", "Medium", "Low"]
    assert app.why_relevant
    assert app.potential_industry
    assert app.potential_users
    assert app.potential_use_case
    assert len(app.supporting_evidence) > 0
    assert app.suggested_next_step


def test_api_applications_endpoint():
    """Test GET /commercialization/applications/{technology} endpoint."""
    response = client.get("/commercialization/applications/Quantum%20Computing")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["applications"]) > 0


# ===========================================================================
# 3. Member 2: Product Recommendations
# ===========================================================================

def test_product_recommendations(db_session):
    """Test Member 2 productization recommendation fields."""
    tech = "Edge AI"
    res = commercialization_service.generate_productization_recommendations(db_session, tech)
    
    assert res.status == "success"
    assert len(res.products) >= 1
    
    prod = res.products[0]
    assert prod.product_name
    assert prod.problem
    assert prod.proposed_solution
    assert prod.target_users
    assert prod.target_industry
    assert prod.main_use_case
    assert prod.core_technology
    assert len(prod.required_technical_components) > 0
    assert prod.possible_delivery_model
    assert prod.why_identified
    assert len(prod.supporting_evidence) > 0
    assert len(prod.development_requirements) > 0
    assert len(prod.suggested_next_steps) > 0


def test_api_products_endpoint():
    """Test GET /commercialization/products/{technology} endpoint."""
    response = client.get("/commercialization/products/Edge%20AI")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["products"]) > 0


# ===========================================================================
# 4. Member 2: Startup Recommendations
# ===========================================================================

def test_startup_recommendations(db_session):
    """Test Member 2 startup creation recommendations fields."""
    tech = "Medical Imaging AI"
    res = commercialization_service.generate_startup_recommendations(db_session, tech)
    
    assert res.status == "success"
    assert len(res.startups) >= 1
    
    s = res.startups[0]
    assert s.startup_concept
    assert s.problem
    assert s.proposed_solution
    assert s.target_customers
    assert s.target_industry
    assert s.technology_used
    assert s.why_identified
    assert s.competitive_context
    assert s.possible_business_model
    assert s.suggested_first_step
    assert s.opportunity_signal == "Potential Startup Opportunity"


def test_api_startups_endpoint():
    """Test GET /commercialization/startups/{technology} endpoint."""
    response = client.get("/commercialization/startups/Medical%20Imaging%20AI")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["startups"]) > 0


# ===========================================================================
# 5. Dynamic Technology Input & Arbitrary Queries
# ===========================================================================

def test_dynamic_technology_input(db_session):
    """Test dynamic technologies (Robotics, Clean Energy, Generative AI)."""
    technologies = ["Robotics", "Generative AI", "Cybersecurity", "Industrial Computer Vision"]
    for tech in technologies:
        res = commercialization_service.perform_full_commercialization_analysis(db_session, tech)
        assert res.technology == tech
        # Must either provide evidence-grounded recommendation or insufficient evidence signal
        assert res.status in ["success", "insufficient_evidence"]
        if res.status == "success":
            assert len(res.applications) > 0


# ===========================================================================
# 6. Empty Input & Unknown Technology Handling
# ===========================================================================

def test_empty_technology_input(db_session):
    """Test empty/whitespace technology input."""
    res = commercialization_service.perform_full_commercialization_analysis(db_session, "   ")
    assert res.status == "insufficient_evidence"
    assert len(res.applications) == 0
    assert len(res.products) == 0
    assert len(res.startups) == 0


def test_unknown_technology_insufficient_evidence(db_session):
    """Test completely unknown/fictional technology with zero repository evidence."""
    res = commercialization_service.perform_full_commercialization_analysis(
        db_session, "NonexistentHyperdriveWarpField999"
    )
    assert res.status == "insufficient_evidence"
    assert res.evidence_coverage == "Insufficient"
    assert "Insufficient connected evidence" in (res.message or "")


# ===========================================================================
# 7. Partial Evidence & Missing Source Robustness
# ===========================================================================

def test_evidence_bundle_integrity(db_session):
    """Test that gather_connected_evidence returns properly structured evidence from Modules 3-7."""
    evidence = commercialization_service.gather_connected_evidence(db_session, "Quantum Computing")
    assert isinstance(evidence.research_papers, list)
    assert isinstance(evidence.patents, list)
    assert isinstance(evidence.funding_opportunities, list)
    assert evidence.technology_evidence is not None
    assert evidence.innovation_score_summary is not None
