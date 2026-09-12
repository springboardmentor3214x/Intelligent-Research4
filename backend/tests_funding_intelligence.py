import os
import unittest
import uuid
from datetime import date, timedelta

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-funding-intelligence-12345"
os.environ["AI_PROVIDER"] = "heuristic"

from fastapi.testclient import TestClient

from backend.app.auth.security import hash_password
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.patent import Patent
from backend.app.models.research_paper import ResearchPaper
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
            description="Funding for research projects developing foundation models, machine learning, and medical imaging for biomedical diagnosis and health informatics.",
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
            source="BIRAC",
            source_id=f"OPP-1002-{uid}",
            opportunity_number=f"BIRAC-2026-SOLAR-{uid}",
            title="Advanced Photovoltaic and CleanTech Energy Systems",
            agency="Department of Energy & BIRAC",
            description="Research grants focused on next-generation solar cells, grid integration, and CleanTech energy storage systems.",
            funding_type="Research & Innovation Grant",
            funding_amount=1200000.0,
            open_date=date.today() - timedelta(days=10),
            close_date=date.today() + timedelta(days=120),
            eligibility="Small business entities, startups, and universities.",
            funding_category="Energy",
            research_area="Renewable Energy",
            country="India",
            status="posted",
            official_link=f"https://birac.nic.in/desc.php?id={uid}",
        )

        self.db.add(self.opp1)
        self.db.add(self.opp2)

        # Seed test research paper
        self.paper1 = ResearchPaper(
            source="arXiv",
            source_id=f"arxiv-2601.{uid}",
            title="Deep Learning Frameworks for 3D Brain MRI Tumor Segmentation",
            abstract="We present an automated convolutional neural network architecture for segmenting brain tumors from multi-modal MRI scans with 3D volumetric rendering.",
            authors="Dr. Sarah Jenkins, Dr. Alan Turing",
            publication_date=date(2025, 6, 15),
            publication_year=2025,
            journal_or_conference="IEEE Transactions on Medical Imaging",
            research_domain="Medical AI",
            keywords="MRI, brain tumor, segmentation, deep learning",
        )
        self.db.add(self.paper1)

        # Seed test patent
        self.patent1 = Patent(
            source="USPTO",
            source_id=f"US-PAT-{uid}",
            publication_number=f"US112233{uid}B2",
            title="Method and System for Automated 3D Volumetric Tumor Detection in Medical Scans",
            abstract="An artificial intelligence system that processes magnetic resonance imaging datasets to localize and visualize neoplasm boundaries in 3D.",
            assignee="NeuroTech Diagnostics Inc",
            inventors="Dr. Evelyn Wright",
            publication_date=date(2024, 11, 20),
            classification="G16H50/20",
            technology_domain="Medical Diagnostics & AI",
        )
        self.db.add(self.patent1)
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
        data = res.json()
        self.assertIn("recommendations", data)
        recs = data["recommendations"]
        self.assertGreaterEqual(len(recs), 1)

        top_match = recs[0]
        self.assertEqual(top_match["id"], str(self.opp1.id))
        self.assertGreater(top_match["relevance_score"], 0.0)
        self.assertIn("matched_concepts", top_match)
        self.assertIn("eligibility_assessment", top_match)
        self.assertEqual(top_match["eligibility_assessment"]["status"], "Potentially Eligible")

    def test_04_fix_422_query_parameter_combinations(self):
        """Regression tests for 422 error on query parameter variants."""
        # 1. Exact failing request with min_score=15 and URL encoded spaces
        res1 = client.get(
            "/funding/recommendations/me?limit=30&min_score=15&topic=Sustainable%20Health%20Care",
            headers=self.headers,
        )
        self.assertEqual(res1.status_code, 200)
        self.assertIn("recommendations", res1.json())

        # 2. Request with min_score=15
        res2 = client.get(
            "/funding/recommendations/me?limit=30&min_score=15",
            headers=self.headers,
        )
        self.assertEqual(res2.status_code, 200)

        # 3. Request with min_score=30 and topic=Healthcare
        res3 = client.get(
            "/funding/recommendations/me?limit=30&min_score=30&topic=Healthcare",
            headers=self.headers,
        )
        self.assertEqual(res3.status_code, 200)

    def test_05_startup_idea_funding_analyzer(self):
        """Test Startup Idea Funding Intelligence Analyzer endpoint."""
        idea_payload = {
            "idea": "My startup uses AI and MRI images to automatically detect brain tumors and provides 3D visualization for doctors."
        }
        res = client.post("/funding/analyze-idea", json=idea_payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Check extracted metadata
        self.assertIn("domain", data)
        self.assertIn("research_areas", data)
        self.assertIn("technologies", data)
        self.assertIn("keywords", data)

        # Check funding suitability score
        suitability = data["funding_suitability"]
        self.assertIn("suitability_score", suitability)
        self.assertGreaterEqual(suitability["suitability_score"], 10.0)
        self.assertLessEqual(suitability["suitability_score"], 100.0)
        self.assertIn("factors", suitability)
        self.assertIn("disclaimer", suitability)

        # Check research landscape overlap with real seeded paper
        res_landscape = data["research_landscape"]
        self.assertIn("overlap_level", res_landscape)
        self.assertGreaterEqual(len(res_landscape["top_matches"]), 1)
        self.assertTrue(any("MRI" in p["title"] or "Brain" in p["title"] for p in res_landscape["top_matches"]))

        # Check patent landscape overlap with real seeded patent
        pat_landscape = data["patent_landscape"]
        self.assertIn("overlap_level", pat_landscape)
        self.assertGreaterEqual(len(pat_landscape["top_matches"]), 1)

        # Check matched funding opportunities
        self.assertGreaterEqual(len(data["matching_funding"]), 1)

        # Check explainable risks and next steps
        self.assertGreaterEqual(len(data["potential_risks"]), 1)
        self.assertGreaterEqual(len(data["recommended_next_steps"]), 1)

    def test_06_semantic_search_endpoint(self):
        search_payload = {
            "query": "Medical imaging diagnostics and AI models",
            "limit": 10,
            "min_score": 10,
        }
        res = client.post("/funding/search", json=search_payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("opportunities", data)
        self.assertGreaterEqual(len(data["opportunities"]), 1)

    def test_07_save_and_unsave_funding(self):
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
        saved_items = res_saved_list.json()["saved_opportunities"]
        self.assertEqual(len(saved_items), 1)
        self.assertEqual(saved_items[0]["funding_opportunity"]["id"], str(self.opp1.id))

        # 3. Unsave opportunity
        res_del = client.delete(f"/funding/save/{self.opp1.id}", headers=self.headers)
        self.assertEqual(res_del.status_code, 200)

        # 4. Confirm empty
        res_saved_list2 = client.get("/funding/saved", headers=self.headers)
        self.assertEqual(len(res_saved_list2.json()["saved_opportunities"]), 0)


if __name__ == "__main__":
    unittest.main()
