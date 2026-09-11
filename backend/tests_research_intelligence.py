import os
import unittest
import uuid
from datetime import date

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-research-intelligence-12345"

from fastapi.testclient import TestClient

from backend.app.auth.security import hash_password
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.user import User
from backend.tests_common import TestingSessionLocal, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestResearchIntelligence(unittest.TestCase):
    def setUp(self):
        self.db = TestingSessionLocal()
        uid = uuid.uuid4().hex[:6]
        # Seed test papers
        self.paper1 = ResearchPaper(
            source="OpenAlex",
            source_id=f"W123456-{uid}",
            title="Deep Learning Approaches for Bio-Medical Diagnostics",
            abstract="In this work we propose a deep learning framework for clinical diagnostics. Results demonstrate high diagnostic accuracy on MRI benchmarks. Limitations include computational latency.",
            authors="Dr. Alice Smith, Prof. Bob Jones",
            publication_date=date(2025, 3, 15),
            publication_year=2025,
            journal_or_conference="Nature Machine Intelligence",
            keywords="Deep Learning, Biomedical, MRI, Diagnostics",
            research_domain="Artificial Intelligence",
            citation_count=42,
            doi=f"https://doi.org/10.1038/s42256-025-{uid}",
            publication_link=f"https://openalex.org/W123456-{uid}",
        )
        self.paper2 = ResearchPaper(
            source="OpenAlex",
            source_id=f"W789012-{uid}",
            title="Solar Cell Efficiency and Perovskite Materials",
            abstract="We present novel perovskite photovoltaic architectures. Empirical evaluations show 28% efficiency gains. Future work involves environmental degradation testing.",
            authors="Dr. Clara Green",
            publication_date=date(2024, 6, 20),
            publication_year=2024,
            journal_or_conference="Advanced Energy Materials",
            keywords="Perovskite, Photovoltaics, Solar Energy",
            research_domain="Renewable Energy",
            citation_count=18,
            doi=f"https://doi.org/10.1002/aenm.2024-{uid}",
            publication_link=f"https://openalex.org/W789012-{uid}",
        )
        self.db.add(self.paper1)
        self.db.add(self.paper2)
        self.db.commit()

        # Seed researcher user and profile
        self.user_email = f"ai_researcher_{uuid.uuid4().hex[:6]}@example.com"
        self.password = "SecurePassword123!"
        self.user = User(
            name="Dr. AI Specialist",
            email=self.user_email,
            password_hash=hash_password(self.password),
            role="researcher",
            organization="Stanford AI Lab",
            research_domain="Artificial Intelligence & Medical Imaging",
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.profile = ResearchProfile(
            user_id=self.user.id,
            research_domain="Artificial Intelligence & Medical Imaging",
            research_interests="Neural networks, MRI diagnosis, biomedical machine learning",
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

    def test_01_search_and_filter_papers(self):
        # Search by keyword
        res = client.get("/research-papers?search=Bio-Medical", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["total"], 1)
        self.assertTrue(any("Bio-Medical" in p["title"] for p in data["papers"]))

        # Filter by year
        res_year = client.get("/research-papers?year=2025", headers=self.headers)
        self.assertEqual(res_year.status_code, 200)
        self.assertTrue(all(p["publication_year"] == 2025 for p in res_year.json()["papers"]))

    def test_02_get_paper_details(self):
        res = client.get(f"/research-papers/{self.paper1.id}", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["title"], self.paper1.title)
        self.assertEqual(data["source"], "OpenAlex")

    def test_03_structured_ai_paper_analysis(self):
        res = client.get(f"/research-papers/{self.paper1.id}/analysis", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("source_information", data)
        self.assertIn("ai_generated_analysis", data)
        
        ai_analysis = data["ai_generated_analysis"]
        self.assertIn("summary", ai_analysis)
        self.assertIn("research_problem", ai_analysis)
        self.assertIn("objectives", ai_analysis)
        self.assertIn("methodology", ai_analysis)
        self.assertIn("important_findings", ai_analysis)
        self.assertIn("limitations", ai_analysis)
        self.assertIn("future_directions", ai_analysis)

    def test_04_personalized_recommendations_for_user(self):
        res = client.get("/research-papers/recommendations/me", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        recs = res.json()
        self.assertGreaterEqual(len(recs), 1)
        # Top recommendation should be the AI/Biomedical paper for an AI researcher
        top_rec = recs[0]
        self.assertEqual(top_rec["id"], str(self.paper1.id))
        self.assertGreater(top_rec["relevance_score"], 0.0)
        self.assertIn("matched_concepts", top_rec)

    def test_05_research_trends_calculation(self):
        res = client.get("/research-papers/trends", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_papers", data)
        self.assertIn("year_wise_distribution", data)
        self.assertIn("top_topics", data)
        self.assertIn("growth_trends", data)

    def test_06_research_insights_and_gaps(self):
        res = client.get("/research-papers/insights-gaps", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("common_themes", data)
        self.assertIn("repeated_challenges", data)
        self.assertIn("unaddressed_gaps", data)
        self.assertIn("recommended_future_directions", data)


if __name__ == "__main__":
    unittest.main()
