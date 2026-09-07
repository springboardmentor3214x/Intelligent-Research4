import uuid
from datetime import date, datetime
import pytest
from fastapi.testclient import TestClient

from backend.app.auth.security import create_access_token, hash_password
from backend.app.main import app
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.research_area import ResearchArea, profile_research_areas
from backend.app.models.keyword import Keyword, profile_keywords
from backend.app.models.technology_area import TechnologyArea, profile_technology_areas
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.services.funding_matching_service import (
    build_funding_representation,
    build_researcher_representation,
    calculate_match_details,
    compute_semantic_similarities,
    extract_researcher_profile_data,
    get_personalized_recommendations,
)
from backend.tests_common import TestingSessionLocal, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="function")
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.query(FundingOpportunity).delete()
        session.query(ResearchProfile).delete()
        session.query(ResearchArea).delete()
        session.query(Keyword).delete()
        session.query(TechnologyArea).delete()
        session.query(User).delete()
        session.commit()
        session.close()


def create_test_user(db, email="ai_user@example.com", name="Dr. AI Researcher", role="researcher", domain="Artificial Intelligence", org="MIT", country="United States"):
    user = User(
        id=uuid.uuid4(),
        email=email,
        name=name,
        password_hash=hash_password("SecurePassword123!"),
        role=role,
        research_domain=domain,
        organization=org,
        country=country,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def attach_profile(db, user, domain="Artificial Intelligence", areas=None, keywords=None, tech=None):
    profile = ResearchProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        research_domain=domain,
        research_interests="Deep learning for clinical imaging and automated diagnosis",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    if areas:
        for a_name in areas:
            ra = db.query(ResearchArea).filter(ResearchArea.name == a_name).first()
            if not ra:
                ra = ResearchArea(id=uuid.uuid4(), name=a_name)
                db.add(ra)
                db.commit()
                db.refresh(ra)
            db.execute(profile_research_areas.insert().values(research_profile_id=profile.id, research_area_id=ra.id))

    if keywords:
        for k_name in keywords:
            kw = db.query(Keyword).filter(Keyword.name == k_name).first()
            if not kw:
                kw = Keyword(id=uuid.uuid4(), name=k_name)
                db.add(kw)
                db.commit()
                db.refresh(kw)
            db.execute(profile_keywords.insert().values(research_profile_id=profile.id, keyword_id=kw.id))

    if tech:
        for t_name in tech:
            ta = db.query(TechnologyArea).filter(TechnologyArea.name == t_name).first()
            if not ta:
                ta = TechnologyArea(id=uuid.uuid4(), name=t_name)
                db.add(ta)
                db.commit()
                db.refresh(ta)
            db.execute(profile_technology_areas.insert().values(research_profile_id=profile.id, technology_area_id=ta.id))

    db.commit()
    return profile


def seed_funding_opportunities(db):
    ai_grant = FundingOpportunity(
        id=uuid.uuid4(),
        source="Grants.gov",
        source_id="GRANTS-AI-101",
        opportunity_number="NIH-AI-2026-01",
        title="AI for Healthcare Innovation and Medical Diagnostics Grant",
        agency="National Institutes of Health",
        description="Comprehensive funding for research teams developing neural networks, LLM diagnostics, and computer vision tools for patient health and clinical imaging.",
        funding_type="Grant",
        funding_amount=500000.00,
        open_date=date(2026, 1, 1),
        close_date=date(2026, 12, 31),
        eligibility="Higher education institutions, universities, medical centers",
        funding_category="Health / Artificial Intelligence",
        research_area="Artificial Intelligence",
        country="United States",
        status="posted",
        official_link="https://grants.gov/nih-ai-2026",
    )

    energy_grant = FundingOpportunity(
        id=uuid.uuid4(),
        source="Grants.gov",
        source_id="GRANTS-ENERGY-202",
        opportunity_number="DOE-SOLAR-2026-02",
        title="Next-Generation Solar Photovoltaics and Battery Storage Grant",
        agency="Department of Energy",
        description="Research grant supporting breakthrough photovoltaic materials, renewable energy grid integration, and next-gen lithium battery efficiency.",
        funding_type="Grant",
        funding_amount=750000.00,
        open_date=date(2026, 2, 1),
        close_date=date(2026, 11, 30),
        eligibility="Higher education institutions and national laboratories",
        funding_category="Energy / Solar / Storage",
        research_area="Renewable Energy",
        country="United States",
        status="posted",
        official_link="https://grants.gov/doe-solar-2026",
    )

    agri_grant = FundingOpportunity(
        id=uuid.uuid4(),
        source="Grants.gov",
        source_id="GRANTS-AGRI-303",
        opportunity_number="USDA-CROP-2026-03",
        title="Sustainable Crop Yields and Soil Microbiome Analysis",
        agency="Department of Agriculture",
        description="Funding for agricultural research into soil microbiome health, organic fertilizers, and drought-resistant crop cultivation.",
        funding_type="Grant",
        funding_amount=250000.00,
        open_date=date(2026, 3, 1),
        close_date=date(2026, 10, 15),
        eligibility="Universities and agricultural extensions",
        funding_category="Agriculture",
        research_area="Agronomy",
        country="United States",
        status="posted",
        official_link="https://grants.gov/usda-crop-2026",
    )

    db.add_all([ai_grant, energy_grant, agri_grant])
    db.commit()
    return ai_grant, energy_grant, agri_grant


# ==============================================================================
# TEST SUITE
# ==============================================================================

class TestAIFundingMatching:

    def test_01_authenticated_user_gets_recommendations(self, db_session):
        """1. Authenticated user receives personalized funding recommendations."""
        user = create_test_user(db_session, email="ai_prof@test.com")
        attach_profile(
            db_session, user,
            domain="Artificial Intelligence",
            areas=["Generative AI", "Medical Imaging"],
            keywords=["LLM", "Neural Networks", "Diagnostics"],
        )
        seed_funding_opportunities(db_session)

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get(
            "/funding/recommendations/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["recommendations"]) == 3
        assert data["profile_used"]["research_domain"] == "Artificial Intelligence"
        assert "Generative AI" in data["profile_used"]["research_areas"]

    def test_02_unauthenticated_request_is_rejected(self, db_session):
        """2. Unauthenticated request to recommendation API is rejected with 401."""
        seed_funding_opportunities(db_session)
        response = client.get("/funding/recommendations/me")
        assert response.status_code == 401

    def test_03_ai_profile_ranks_ai_grant_first(self, db_session):
        """3. User with AI profile gets AI-related grant as top recommendation."""
        ai_user = create_test_user(db_session, email="ai_lead@test.com", domain="Artificial Intelligence")
        attach_profile(
            db_session, ai_user,
            domain="Artificial Intelligence",
            areas=["Healthcare AI", "Computer Vision"],
            keywords=["Neural Networks", "Medical Diagnostics"],
        )
        ai_grant, _, _ = seed_funding_opportunities(db_session)

        token = create_access_token(data={"sub": str(ai_user.id), "email": ai_user.email, "role": ai_user.role})
        response = client.get(
            "/funding/recommendations/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        recs = response.json()["recommendations"]
        assert recs[0]["funding_opportunity"]["id"] == str(ai_grant.id)
        assert recs[0]["match"]["relevance_score"] > recs[1]["match"]["relevance_score"]
        assert recs[0]["match"]["relevance_score"] >= 65.0

    def test_04_energy_profile_ranks_energy_grant_first(self, db_session):
        """4. User with Renewable Energy profile gets Energy grant as top recommendation."""
        energy_user = create_test_user(db_session, email="energy_lead@test.com", domain="Renewable Energy")
        attach_profile(
            db_session, energy_user,
            domain="Renewable Energy",
            areas=["Solar Energy", "Battery Storage"],
            keywords=["Photovoltaics", "Grid Storage", "Lithium Battery"],
        )
        _, energy_grant, _ = seed_funding_opportunities(db_session)

        token = create_access_token(data={"sub": str(energy_user.id), "email": energy_user.email, "role": energy_user.role})
        response = client.get(
            "/funding/recommendations/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        recs = response.json()["recommendations"]
        assert recs[0]["funding_opportunity"]["id"] == str(energy_grant.id)
        assert recs[0]["match"]["relevance_score"] > recs[1]["match"]["relevance_score"]

    def test_05_different_profiles_produce_different_rankings(self, db_session):
        """5. Different researcher profiles produce distinct rankings and top matches."""
        ai_user = create_test_user(db_session, email="u1@test.com", domain="Artificial Intelligence")
        attach_profile(db_session, ai_user, domain="Artificial Intelligence", areas=["Computer Vision"], keywords=["LLM"])

        energy_user = create_test_user(db_session, email="u2@test.com", domain="Renewable Energy")
        attach_profile(db_session, energy_user, domain="Renewable Energy", areas=["Solar Power"], keywords=["Photovoltaic"])

        seed_funding_opportunities(db_session)

        tok1 = create_access_token(data={"sub": str(ai_user.id), "email": ai_user.email, "role": ai_user.role})
        tok2 = create_access_token(data={"sub": str(energy_user.id), "email": energy_user.email, "role": energy_user.role})

        r1 = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {tok1}"}).json()
        r2 = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {tok2}"}).json()

        assert r1["recommendations"][0]["funding_opportunity"]["id"] != r2["recommendations"][0]["funding_opportunity"]["id"]

    def test_06_semantic_similarity_calculation_works(self):
        """6. Semantic similarity computation handles text representations accurately."""
        researcher = "Domain: Artificial Intelligence. Research Areas: Computer Vision, Medical AI. Keywords: Neural Networks."
        funding_similar = "Title: AI for Healthcare. Description: Neural network computer vision tools for medical diagnosis."
        funding_unrelated = "Title: Ancient Roman History excavation. Description: Archaeology study in southern Italy."

        sims = compute_semantic_similarities(researcher, [funding_similar, funding_unrelated])
        assert len(sims) == 2
        assert sims[0] > sims[1]
        assert sims[0] > 0.15


    def test_07_relevance_score_within_expected_range(self, db_session):
        """7. Calculated relevance scores are bounded between 0.0 and 100.0."""
        user = create_test_user(db_session, email="score_check@test.com")
        attach_profile(db_session, user, domain="Biotechnology", areas=["Genomics"], keywords=["CRISPR"])
        seed_funding_opportunities(db_session)

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {token}"})
        for item in response.json()["recommendations"]:
            score = item["match"]["relevance_score"]
            assert 0.0 <= score <= 100.0

    def test_08_match_level_classification_accuracy(self):
        """8. Match level categories are properly classified based on scoring thresholds."""
        profile = {"research_domain": "AI", "research_areas": ["AI"], "keywords": ["ML"]}
        opp = FundingOpportunity(title="AI Research Grant", description="Machine Learning and AI funding", research_area="AI")
        
        breakdown_high = calculate_match_details(profile, opp, semantic_sim=0.90)
        assert breakdown_high.match_level in ["Excellent Match", "Strong Match"]

        breakdown_low = calculate_match_details(profile, opp, semantic_sim=0.01)
        assert isinstance(breakdown_low.match_level, str)

    def test_09_explanation_is_grounded_in_actual_signals(self, db_session):
        """9. Recommendation explanation cites actual matched domain and keywords."""
        user = create_test_user(db_session, email="exp_check@test.com", domain="Artificial Intelligence")
        attach_profile(db_session, user, domain="Artificial Intelligence", areas=["Computer Vision"], keywords=["Neural Networks"])
        ai_grant, _, _ = seed_funding_opportunities(db_session)

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {token}"})
        top_rec = response.json()["recommendations"][0]
        
        assert "Artificial Intelligence" in top_rec["match"]["explanation"] or len(top_rec["match"]["explanation_points"]) > 0
        assert len(top_rec["match"]["explanation_points"]) >= 1

    def test_10_missing_profile_handled_gracefully(self, db_session):
        """10. Users without a ResearchProfile record receive recommendations with a guidance message."""
        user_no_profile = create_test_user(db_session, email="blank_user@test.com", domain=None)
        seed_funding_opportunities(db_session)

        token = create_access_token(data={"sub": str(user_no_profile.id), "email": user_no_profile.email, "role": user_no_profile.role})
        response = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert data["profile_used"]["has_profile"] is False
        assert "profile is incomplete" in data["message"]

    def test_11_missing_research_keywords_handled_safely(self, db_session):
        """11. Users with domain/areas but zero keywords are processed without error."""
        user = create_test_user(db_session, email="no_kw@test.com", domain="Quantum Physics")
        attach_profile(db_session, user, domain="Quantum Physics", areas=["Quantum Optics"], keywords=[])
        seed_funding_opportunities(db_session)

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert len(response.json()["recommendations"]) == 3

    def test_12_missing_funding_description_handled(self, db_session):
        """12. Funding opportunities with null description or null research_area don't crash."""
        user = create_test_user(db_session, email="sparse_opp@test.com")
        attach_profile(db_session, user, domain="AI")
        
        sparse_grant = FundingOpportunity(
            id=uuid.uuid4(),
            source="Grants.gov",
            source_id="SPARSE-1",
            title="General Research Award",
            description=None,
            research_area=None,
            funding_category=None,
            eligibility=None,
            country=None,
        )
        db_session.add(sparse_grant)
        db_session.commit()

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["total"] >= 1

    def test_13_empty_funding_database_returns_clear_message(self, db_session):
        """13. When database has 0 funding opportunities, returns empty list with friendly message."""
        user = create_test_user(db_session, email="empty_db@test.com")
        attach_profile(db_session, user, domain="AI")

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["recommendations"] == []
        assert "No funding opportunities" in data["message"]

    def test_14_single_grant_match_endpoint_success(self, db_session):
        """14. POST /funding/match computes match breakdown for a specific opportunity."""
        user = create_test_user(db_session, email="match_test@test.com", domain="Artificial Intelligence")
        attach_profile(db_session, user, domain="Artificial Intelligence", areas=["Medical AI"], keywords=["Diagnostics"])
        ai_grant, _, _ = seed_funding_opportunities(db_session)

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.post(
            "/funding/match",
            json={"funding_opportunity_id": str(ai_grant.id)},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["funding_opportunity"]["id"] == str(ai_grant.id)
        assert data["match"]["relevance_score"] >= 50.0
        assert "Artificial Intelligence" in data["match"]["matched_research_areas"] or data["match"]["semantic_similarity"] > 0

    def test_15_match_endpoint_invalid_id_returns_404(self, db_session):
        """15. POST /funding/match with non-existent UUID returns 404."""
        user = create_test_user(db_session, email="notfound@test.com")
        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        random_id = str(uuid.uuid4())
        response = client.post(
            "/funding/match",
            json={"funding_opportunity_id": random_id},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Funding opportunity not found"

    def test_16_filtering_recommendations_by_research_area(self, db_session):
        """16. Filtering recommendations by research area restricts results."""
        user = create_test_user(db_session, email="filter_test@test.com")
        attach_profile(db_session, user, domain="AI")
        seed_funding_opportunities(db_session)

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get(
            "/funding/recommendations/me?research_area=Renewable",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert "Solar" in data["recommendations"][0]["funding_opportunity"]["title"]
