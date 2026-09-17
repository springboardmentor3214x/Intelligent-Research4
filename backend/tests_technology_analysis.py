import uuid
from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database.base import Base
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.technology import Technology
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.patent import Patent
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.services.technology_analysis_service import TechnologyAnalysisService
from backend.app.services.technology_service import sync_technologies


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_technology_analysis_empty_and_not_found(db_session, client):
    non_existent_id = uuid.uuid4()
    
    # Direct service check
    analysis = TechnologyAnalysisService.get_full_analysis(db_session, non_existent_id)
    assert analysis is None
    
    # API 404 check
    res = client.get(f"/technologies/{non_existent_id}/analysis")
    assert res.status_code == 404
    assert res.json()["detail"] == "Technology not found"


def test_technology_maturity_and_readiness_insufficient_data(db_session, client):
    tech = Technology(
        id=uuid.uuid4(),
        technology_name="Quantum Photonics",
        description="Exploratory optics",
        technology_domain="Quantum Computing",
    )
    db_session.add(tech)
    db_session.commit()

    maturity = TechnologyAnalysisService.calculate_maturity(db_session, tech.id)
    assert maturity is not None
    assert maturity.maturity_stage == "INSUFFICIENT_DATA"
    assert maturity.coverage_level == "Insufficient"
    assert "Insufficient records" in maturity.explanation

    readiness = TechnologyAnalysisService.calculate_readiness(db_session, tech.id)
    assert readiness is not None
    assert readiness.readiness_score is None
    assert readiness.score_label == "Insufficient Evidence"


def test_technology_analytics_full_pipeline(db_session, client):
    tech_id = uuid.uuid4()
    tech = Technology(
        id=tech_id,
        technology_name="Artificial Intelligence",
        description="Machine intelligence algorithms",
        technology_domain="Computer Science",
    )
    db_session.add(tech)

    # Add Research Papers across 3 years
    p1 = ResearchPaper(
        id=uuid.uuid4(),
        source="OpenAlex",
        source_id="W101",
        title="Foundations of Artificial Intelligence in Vision",
        abstract="Deep learning and artificial intelligence methods",
        publication_year=2021,
        journal_or_conference="Nature Machine Intelligence",
        citation_count=45,
    )
    p2 = ResearchPaper(
        id=uuid.uuid4(),
        source="OpenAlex",
        source_id="W102",
        title="Modern Artificial Intelligence Applications",
        abstract="Transformers in artificial intelligence architectures",
        publication_year=2022,
        journal_or_conference="IEEE TPAMI",
        citation_count=80,
    )
    p3 = ResearchPaper(
        id=uuid.uuid4(),
        source="OpenAlex",
        source_id="W103",
        title="Advanced Artificial Intelligence Scaling",
        abstract="Large models in artificial intelligence",
        publication_year=2023,
        journal_or_conference="ICLR",
        citation_count=120,
    )
    db_session.add_all([p1, p2, p3])

    # Add Patents with assignees
    pat1 = Patent(
        id=uuid.uuid4(),
        source="USPTO",
        source_id="US1001",
        publication_number="US1001A",
        title="Artificial Intelligence Neural Accelerator",
        abstract="Hardware circuit for artificial intelligence",
        assignee="Alphabet Inc.",
        filing_date=date(2021, 5, 10),
        citation_count=12,
    )
    pat2 = Patent(
        id=uuid.uuid4(),
        source="USPTO",
        source_id="US1002",
        publication_number="US1002A",
        title="Distributed Artificial Intelligence Pipeline",
        abstract="Cloud compute for artificial intelligence",
        assignee="Microsoft Corp.",
        filing_date=date(2022, 7, 14),
        citation_count=18,
    )
    pat3 = Patent(
        id=uuid.uuid4(),
        source="USPTO",
        source_id="US1003",
        publication_number="US1003A",
        title="Generative Artificial Intelligence Coprocessor",
        abstract="Low latency artificial intelligence processing",
        assignee="NVIDIA Corporation",
        filing_date=date(2023, 3, 22),
        citation_count=35,
    )
    db_session.add_all([pat1, pat2, pat3])

    # Add Funding Opportunity
    f1 = FundingOpportunity(
        id=uuid.uuid4(),
        source="Grants.gov",
        source_id="FG-2023-AI",
        title="National Initiative on Artificial Intelligence",
        description="Grant for ethical artificial intelligence systems",
        agency="National Science Foundation",
        open_date=date(2023, 1, 15),
    )
    db_session.add(f1)
    db_session.commit()

    # 1. Test Adoption
    adoption = TechnologyAnalysisService.calculate_adoption(db_session, tech_id)
    assert adoption is not None
    assert adoption.total_publications == 3
    assert adoption.total_patents == 3
    assert adoption.years == [2021, 2022, 2023]
    assert len(adoption.yearly_metrics) == 3
    # Check 2021 -> 2022 growth
    assert adoption.yearly_metrics[0].year == 2021
    assert adoption.yearly_metrics[0].total_activity == 2  # 1 pub + 1 pat
    assert adoption.yearly_metrics[1].year == 2022
    assert adoption.yearly_metrics[1].total_activity == 2
    assert adoption.yearly_metrics[2].year == 2023
    assert adoption.yearly_metrics[2].total_activity == 3  # 1 pub + 1 pat + 1 funding

    # 2. Test Trend Calculation (Deterministic)
    trend = TechnologyAnalysisService.calculate_trends(db_session, tech_id)
    assert trend is not None
    assert trend.trend in ["Growing", "Stable"]
    assert trend.growth_rate is not None
    assert trend.evidence.active_years_analyzed == 3

    # 3. Test Maturity (Deterministic)
    maturity = TechnologyAnalysisService.calculate_maturity(db_session, tech_id)
    assert maturity is not None
    assert maturity.maturity_stage in ["ESTABLISHED", "DEVELOPING", "MATURE"]
    assert maturity.evidence.research_papers == 3
    assert maturity.evidence.patents == 3
    assert maturity.evidence.distinct_assignees_or_orgs >= 3
    assert maturity.evidence.historical_span_years == 3

    # 4. Test Readiness Score & Factors
    readiness = TechnologyAnalysisService.calculate_readiness(db_session, tech_id)
    assert readiness is not None
    assert readiness.readiness_score is not None
    assert 0 <= readiness.readiness_score <= 100
    assert readiness.factors is not None
    assert readiness.factors.research_activity_score > 0
    assert readiness.factors.patent_ip_score > 0
    assert "System-generated analytical readiness estimate" in readiness.disclaimer

    # 5. Test Full Analysis API Endpoint
    res = client.get(f"/technologies/{tech_id}/analysis")
    assert res.status_code == 200
    data = res.json()
    assert data["technology_name"] == "Artificial Intelligence"
    assert data["maturity"]["maturity_stage"] == maturity.maturity_stage
    assert data["readiness"]["readiness_score"] == readiness.readiness_score
    assert len(data["adoption"]["yearly_metrics"]) == 3
    assert data["trend"]["trend"] == trend.trend
    assert data["evidence"]["research_count"] == 3
    assert data["evidence"]["patent_count"] == 3
    assert data["evidence"]["funding_count"] == 1
    assert len(data["organizations"]) >= 3
    assert len(data["key_insights"]) >= 3

    # 6. Test All Trends and Maturities Endpoint
    trends_res = client.get("/technologies/analytics/trends")
    assert trends_res.status_code == 200
    assert len(trends_res.json()) >= 1
    assert trends_res.json()[0]["technology_name"] == "Artificial Intelligence"

    maturities_res = client.get("/technologies/analytics/maturity")
    assert maturities_res.status_code == 200
    assert len(maturities_res.json()) >= 1

    adoptions_res = client.get("/technologies/analytics/adoption")
    assert adoptions_res.status_code == 200
    assert len(adoptions_res.json()) >= 1

    # 7. Test Analyze Endpoint - Direct Match
    direct_analyze_res = client.get("/technologies/analyze?query=Artificial%20Intelligence")
    assert direct_analyze_res.status_code == 200
    direct_data = direct_analyze_res.json()
    assert direct_data["match_type"] == "direct"
    assert direct_data["matched_technology"] == "Artificial Intelligence"
    assert direct_data["coverage"]["status"] in ["STRONG", "PARTIAL"]
    assert direct_data["evidence"]["research_count"] == 3

    # 8. Test Analyze Endpoint - Related Concept Match
    related_analyze_res = client.get("/technologies/analyze?query=Transformers")
    assert related_analyze_res.status_code == 200
    related_data = related_analyze_res.json()
    assert related_data["match_type"] == "related"
    assert "Transformers" in related_data["query"]
    assert related_data["evidence"]["research_count"] >= 1

    # 9. Test Analyze Endpoint - Insufficient / Unknown Query with Explanatory Output
    unknown_analyze_res = client.get("/technologies/analyze?query=UnobtainiumFusion99")
    assert unknown_analyze_res.status_code == 200
    unknown_data = unknown_analyze_res.json()
    assert unknown_data["match_type"] == "insufficient"
    assert unknown_data["coverage"]["status"] == "INSUFFICIENT"
    assert "No relevant research papers" in unknown_data["coverage"]["explanation"]
    assert unknown_data["maturity"]["maturity_stage"] == "INSUFFICIENT_DATA"
    assert unknown_data["readiness"]["readiness_score"] is None


def test_medical_imaging_and_edge_ai_concept_expansion(db_session, client):
    """
    Specifically test that 'Medical Imaging AI' and 'Edge AI' find cross-source evidence
    even when exact text strings differ (e.g. 'MRI tumor segmentation' or 'on-device edge computing').
    """
    # 1. Add Medical Imaging paper with different title phrasing
    p_med = ResearchPaper(
        id=uuid.uuid4(),
        source="OpenAlex",
        source_id="W-MED-1",
        title="Deep learning for MRI brain tumor segmentation",
        abstract="A convolutional neural network for automated medical image analysis and tumor boundary detection.",
        keywords="mri, segmentation, radiology, deep learning",
        research_domain="Medical Imaging",
        publication_year=2022,
        journal_or_conference="Medical Image Analysis",
        citation_count=95,
    )
    # 2. Add Medical Imaging patent
    pat_med = Patent(
        id=uuid.uuid4(),
        source="USPTO",
        source_id="US-MED-1",
        publication_number="US998811A",
        title="Method and apparatus for automated medical image analysis and diagnostic assistance",
        abstract="System utilizing machine learning for automated medical image analysis and tumor segmentation in scans.",
        assignee="Siemens Healthineers",
        technology_domain="medical imaging",
        classification="G06T7/00",
        filing_date=date(2023, 4, 12),
        citation_count=15,
    )
    # 3. Add Medical Imaging funding
    fund_med = FundingOpportunity(
        id=uuid.uuid4(),
        source="NIH",
        source_id="NIH-MED-1",
        title="Artificial Intelligence in Clinical Imaging and Diagnostics",
        description="Grant for automated medical image segmentation in healthcare",
        agency="National Institutes of Health",
        research_area="Biomedical Imaging",
        open_date=date(2023, 2, 1),
    )
    db_session.add_all([p_med, pat_med, fund_med])

    # 4. Add Edge AI funding and paper
    p_edge = ResearchPaper(
        id=uuid.uuid4(),
        source="IEEE",
        source_id="IEEE-EDGE-1",
        title="Efficient on-device deep learning for low-power IoT devices",
        abstract="Novel edge computing algorithms for neural inference on embedded hardware.",
        keywords="edge computing, tinyml, on-device ai",
        research_domain="Computer Engineering",
        publication_year=2023,
        journal_or_conference="IEEE Micro",
        citation_count=30,
    )
    fund_edge = FundingOpportunity(
        id=uuid.uuid4(),
        source="DST",
        source_id="DST-EDGE-1",
        title="Mission on Edge AI and Embedded Intelligence",
        description="Call for proposals on distributed edge intelligence systems",
        agency="Department of Science and Technology",
        research_area="Edge Computing",
        open_date=date(2024, 1, 10),
    )
    db_session.add_all([p_edge, fund_edge])
    db_session.commit()

    # Test 'Medical Imaging AI' search
    res_med = client.get("/technologies/analyze?query=Medical%20Imaging%20AI")
    assert res_med.status_code == 200
    data_med = res_med.json()
    assert data_med["evidence"]["research_count"] >= 1
    assert data_med["evidence"]["patent_count"] >= 1
    assert data_med["evidence"]["funding_count"] >= 1
    assert data_med["coverage"]["status"] in ["STRONG", "PARTIAL"]
    assert "research publications" in data_med["coverage"]["explanation"].lower() or "research papers" in data_med["coverage"]["explanation"].lower()
    assert len(data_med["sources"]["research"]) >= 1
    assert data_med["sources"]["research"][0]["title"] == "Deep learning for MRI brain tumor segmentation"

    # Test 'Edge AI' search
    res_edge = client.get("/technologies/analyze?query=Edge%20AI")
    assert res_edge.status_code == 200
    data_edge = res_edge.json()
    assert data_edge["evidence"]["research_count"] >= 1
    assert data_edge["evidence"]["funding_count"] >= 1
    assert data_edge["coverage"]["status"] in ["STRONG", "PARTIAL"]

    # Test specific concept query 'AI for brain tumor MRI segmentation'
    res_tumor = client.get("/technologies/analyze?query=AI%20for%20brain%20tumor%20MRI%20segmentation")
    assert res_tumor.status_code == 200
    data_tumor = res_tumor.json()
    assert data_tumor["evidence"]["research_count"] >= 1
    assert data_tumor["evidence"]["patent_count"] >= 1
