import os
import unittest
import uuid
from datetime import date, timedelta

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-funding-intelligence-12345"

from fastapi.testclient import TestClient

from backend.app.auth.security import hash_password
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.user import User
from backend.tests_common import TestingSessionLocal, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestFundingIntelligence(unittest.TestCase):
    def setUp(self):
        self.db = TestingSessionLocal()
        uid = uuid.uuid4().hex[:6]
        # Seed test funding opportunities
        self.opp1 = FundingOpportunity(
            source="Grants.gov",
            source_id=f"OPP-1001-{uid}",
            opportunity_number=f"NSF-2026-AI-MED-{uid}",
            title="Artificial Intelligence in Healthcare and Clinical Diagnostics",
            agency="National Science Foundation",
            description="Funding for research projects developing foundation models and machine learning for biomedical diagnosis and health informatics.",
            funding_type="Grant",
            funding_amount=500000.0,
            open_date=date.today() - timedelta(days=30),
            close_date=date.today() + timedelta(days=60),
            eligibility="Higher education institutions, universities, and non-profit research organizations.",
            funding_category="Science and Technology",
            research_area="Artificial Intelligence",
            country="United States",
            status="posted",
            official_link=f"https://www.grants.gov/search-results-detail/OPP-1001-{uid}",
        )

        self.opp2 = FundingOpportunity(
            source="Grants.gov",
            source_id=f"OPP-1002-{uid}",
            opportunity_number=f"DOE-2026-SOLAR-{uid}",
            title="Advanced Photovoltaic and Perovskite Solar Systems",
            agency="Department of Energy",
            description="Research grants focused on next-generation solar cells, grid integration, and CleanTech energy storage systems.",
            funding_type="Cooperative Agreement",
            funding_amount=1200000.0,
            open_date=date.today() - timedelta(days=10),
            close_date=date.today() + timedelta(days=120),
            eligibility="Small business entities, universities, and state energy laboratories.",
            funding_category="Energy",
            research_area="Renewable Energy",
            country="United States",
            status="posted",
            official_link=f"https://www.grants.gov/search-results-detail/OPP-1002-{uid}",
        )

        self.db.add(self.opp1)
        self.db.add(self.opp2)
        self.db.commit()

        # Seed researcher user and profile
        self.user_email = f"healthtech_prof_{uuid.uuid4().hex[:6]}@example.com"
        self.password = "SecurePassword123!"
        self.user = User(
            name="Dr. HealthTech Lead",
            email=self.user_email,
            password_hash=hash_password(self.password),
            role="researcher",
            organization="Johns Hopkins Medicine",
            research_domain="Digital Health & AI Diagnostics",
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.profile = ResearchProfile(
            user_id=self.user.id,
            research_domain="Digital Health & AI Diagnostics",
            research_interests="Medical technology, clinical informatics, healthcare AI",
        )
        self.db.add(self.profile)
        self.db.commit()

        res_login = client.post(
            "/auth/login",
            data={"username": self.user_email, "password": self.password},
        )
        self.token = res_login.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        self.db.close()

    def test_01_list_and_filter_funding(self):
        res = client.get("/funding?search=Healthcare")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["total"], 1)
        self.assertTrue(any("Healthcare" in o["title"] for o in data["opportunities"]))

    def test_02_get_single_funding_details(self):
        res = client.get(f"/funding/{self.opp1.id}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["opportunity_number"], self.opp1.opportunity_number)
        self.assertEqual(data["agency"], "National Science Foundation")

    def test_03_ai_funding_recommendations_semantic_matching(self):
        # HealthTech researcher should match NSF AI in Healthcare higher than Solar
        res = client.get("/funding/recommendations/me", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        recs = res.json()
        self.assertGreaterEqual(len(recs), 1)
        
        top_match = recs[0]
        self.assertEqual(top_match["id"], str(self.opp1.id))
        self.assertGreater(top_match["relevance_score"], 0.0)
        self.assertIn("matched_concepts", top_match)
        self.assertIn("eligibility_assessment", top_match)
        self.assertEqual(top_match["eligibility_assessment"]["status"], "Potentially Eligible")

    def test_04_single_opportunity_matching(self):
        res = client.post(
            "/funding/match",
            json={"funding_opportunity_id": str(self.opp1.id)},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], str(self.opp1.id))
        self.assertIn("relevance_score", data)
        self.assertIn("eligibility_assessment", data)

    def test_05_save_and_unsave_funding(self):
        # 1. Save opportunity
        res_save = client.post(
            "/funding/save",
            json={"funding_opportunity_id": str(self.opp1.id)},
            headers=self.headers,
        )
        self.assertEqual(res_save.status_code, 200)
        self.assertIn("saved_id", res_save.json())

        # 2. Get saved opportunities
        res_saved_list = client.get("/funding/saved", headers=self.headers)
        self.assertEqual(res_saved_list.status_code, 200)
        saved_items = res_saved_list.json()
        self.assertEqual(len(saved_items), 1)
        self.assertEqual(saved_items[0]["opportunity"]["id"], str(self.opp1.id))

        # 3. Unsave opportunity
        res_del = client.delete(f"/funding/save/{self.opp1.id}", headers=self.headers)
        self.assertEqual(res_del.status_code, 200)

        # 4. Confirm empty
        res_saved_list2 = client.get("/funding/saved", headers=self.headers)
        self.assertEqual(len(res_saved_list2.json()), 0)


if __name__ == "__main__":
    unittest.main()
