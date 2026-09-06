import json
import os
import unittest
import uuid
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-paper-analysis-testing-12345"

from fastapi.testclient import TestClient

from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.research_paper import ResearchPaper
from backend.app.models.research_paper_analysis import ResearchPaperAnalysis
from backend.app.services.paper_analysis_service import (
    AIMalformedResponseError,
    AIProviderConfigurationError,
    AIProviderUnavailableError,
    AIRateLimitError,
    AITimeoutError,
    InsufficientContentError,
    prepare_paper_context,
)
from backend.tests_common import TestingSessionLocal, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestResearchPaperAnalysisModule(unittest.TestCase):

    def setUp(self):
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()

    def _create_and_login_user(self, email_prefix="researcher"):
        email = f"{email_prefix}_{uuid.uuid4().hex[:6]}@example.com"
        password = "SecurePassword123!"
        reg_payload = {
            "name": f"Dr. {email_prefix.title()}",
            "email": email,
            "password": password,
            "role": "researcher",
            "organization": "Stanford University",
            "department": "Computer Science",
            "designation": "Professor",
            "country": "USA",
            "phone_number": "+1234567890",
        }
        res_reg = client.post("/auth/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 201)

        res_login = client.post(
            "/auth/login",
            data={"username": email, "password": password},
        )
        self.assertEqual(res_login.status_code, 200)
        token = res_login.json()["access_token"]
        return token, res_reg.json()

    def _create_sample_paper(
        self,
        title="Attention Is All You Need",
        abstract="The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, a model architecture eschewing recurrence and relying entirely on an attention mechanism.",
        authors="Ashish Vaswani, Noam Shazeer, Niki Parmar",
        doi="https://doi.org/10.1145/3292500.3330964",
    ) -> ResearchPaper:
        paper = ResearchPaper(
            source="OpenAlex",
            source_id=f"W{uuid.uuid4().hex[:8]}",
            title=title,
            abstract=abstract,
            authors=authors,
            publication_year=2017,
            journal_or_conference="NeurIPS",
            research_domain="Computer Science",
            keywords="Transformer, Attention Mechanism, NLP",
            doi=doi,
            citation_count=95000,
            publication_link=f"https://example.org/papers/{uuid.uuid4().hex[:8]}",
        )
        self.db.add(paper)
        self.db.commit()
        self.db.refresh(paper)
        return paper

    def test_01_unauthenticated_request_rejected(self):
        """Unauthenticated user cannot analyze a paper (returns 401)."""
        paper = self._create_sample_paper()
        res = client.post(f"/research-papers/{paper.id}/analyze")
        self.assertEqual(res.status_code, 401)

        res_get = client.get(f"/research-papers/{paper.id}/analysis")
        self.assertEqual(res_get.status_code, 401)

    def test_02_paper_not_found_returns_404(self):
        """Non-existing paper returns 404 for analysis endpoints."""
        token, _ = self._create_and_login_user("notfound")
        headers = {"Authorization": f"Bearer {token}"}
        fake_id = uuid.uuid4()

        res = client.post(f"/research-papers/{fake_id}/analyze", headers=headers)
        self.assertEqual(res.status_code, 404)
        self.assertIn("not found", res.json()["detail"].lower())

        res_get = client.get(f"/research-papers/{fake_id}/analysis", headers=headers)
        self.assertEqual(res_get.status_code, 404)

    def test_03_insufficient_content_returns_422(self):
        """Paper with empty or trivial abstract returns 422 with a clear error message."""
        token, _ = self._create_and_login_user("insufficient")
        headers = {"Authorization": f"Bearer {token}"}

        # Paper with None abstract
        paper_no_abstract = self._create_sample_paper(
            title="Empty Abstract Paper",
            abstract=None,
        )

        res = client.post(
            f"/research-papers/{paper_no_abstract.id}/analyze",
            headers=headers,
        )
        self.assertEqual(res.status_code, 422)
        self.assertIn("sufficient abstract", res.json()["detail"])

        # Paper with tiny abstract (< 30 chars)
        paper_tiny_abstract = self._create_sample_paper(
            title="Short Abstract Paper",
            abstract="Too short",
        )
        res_tiny = client.post(
            f"/research-papers/{paper_tiny_abstract.id}/analyze",
            headers=headers,
        )
        self.assertEqual(res_tiny.status_code, 422)

    @patch("backend.app.services.paper_analysis_service.get_ai_client")
    def test_04_successful_ai_analysis_generation_and_schema_validation(self, mock_get_client):
        """Valid paper produces structured AI analysis separating source facts from AI analysis."""
        token, _ = self._create_and_login_user("success")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper()

        mock_choice = MagicMock()
        mock_choice.message = MagicMock(
            content=json.dumps({
                "summary": "The paper introduces the Transformer architecture based purely on attention mechanisms.",
                "research_problem": "Overcoming sequential computation bottlenecks in recurrent neural networks for sequence modeling.",
                "methodology": "Multi-head self-attention mechanisms and positional encodings without recurrent or convolutional layers.",
                "key_findings": [
                    "Achieves superior BLEU score on WMT 2014 English-to-German translation.",
                    "Significantly reduces training time compared to recurrent models.",
                ],
                "limitations": [
                    "Quadratic memory complexity with respect to sequence length.",
                ],
                "future_directions": [
                    "Extending attention models to other modalities such as vision and audio.",
                ],
            })
        )
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])
        mock_get_client.return_value = mock_client

        res = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertEqual(data["paper_id"], str(paper.id))

        # Check source paper section
        self.assertEqual(data["source"]["title"], paper.title)
        self.assertEqual(data["source"]["authors"], paper.authors)
        self.assertEqual(data["source"]["doi"], paper.doi)
        self.assertEqual(data["source"]["publication_year"], 2017)

        # Check AI analysis section
        ai_data = data["ai_analysis"]
        self.assertIn("Transformer", ai_data["summary"])
        self.assertIn("recurrent", ai_data["research_problem"])
        self.assertIn("self-attention", ai_data["methodology"])
        self.assertEqual(len(ai_data["key_findings"]), 2)
        self.assertEqual(len(ai_data["limitations"]), 1)
        self.assertEqual(len(ai_data["future_directions"]), 1)

        # Check metadata
        meta = data["analysis_metadata"]
        self.assertTrue(meta["generated_by_ai"])
        self.assertFalse(meta["is_cached"])
        self.assertEqual(meta["content_scope"], "abstract_and_metadata")

    @patch("backend.app.services.paper_analysis_service.get_ai_client")
    def test_05_caching_behavior_reuses_persisted_analysis(self, mock_get_client):
        """Second analysis request reuses persisted analysis without calling AI provider."""
        token, _ = self._create_and_login_user("cache")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper()

        mock_choice = MagicMock()
        mock_choice.message = MagicMock(
            content=json.dumps({
                "summary": "Summary for caching test.",
                "research_problem": "Problem for caching test.",
                "methodology": "Method for caching test.",
                "key_findings": ["Finding A"],
                "limitations": ["Limitation A"],
                "future_directions": ["Direction A"],
            })
        )
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])
        mock_get_client.return_value = mock_client

        # First call -> Generates and persists
        res1 = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
        self.assertEqual(res1.status_code, 200)
        self.assertFalse(res1.json()["analysis_metadata"]["is_cached"])
        self.assertEqual(mock_client.chat.completions.create.call_count, 1)

        # Second call without force_refresh -> Cached
        res2 = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.json()["analysis_metadata"]["is_cached"])
        self.assertEqual(mock_client.chat.completions.create.call_count, 1)

        # GET /analysis endpoint also returns cached result
        res_get = client.get(f"/research-papers/{paper.id}/analysis", headers=headers)
        self.assertEqual(res_get.status_code, 200)
        self.assertTrue(res_get.json()["analysis_metadata"]["is_cached"])
        self.assertEqual(res_get.json()["ai_analysis"]["summary"], "Summary for caching test.")

    @patch("backend.app.services.paper_analysis_service.get_ai_client")
    def test_06_force_refresh_regenerates_analysis(self, mock_get_client):
        """Force refresh invokes AI provider again and updates cached analysis."""
        token, _ = self._create_and_login_user("refresh")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper()

        mock_choice1 = MagicMock()
        mock_choice1.message = MagicMock(
            content=json.dumps({
                "summary": "Initial summary.",
                "research_problem": "Initial problem.",
                "methodology": "Initial method.",
                "key_findings": ["F1"],
                "limitations": ["L1"],
                "future_directions": ["D1"],
            })
        )
        mock_choice2 = MagicMock()
        mock_choice2.message = MagicMock(
            content=json.dumps({
                "summary": "Regenerated summary.",
                "research_problem": "Regenerated problem.",
                "methodology": "Regenerated method.",
                "key_findings": ["F2"],
                "limitations": ["L2"],
                "future_directions": ["D2"],
            })
        )
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = [
            MagicMock(choices=[mock_choice1]),
            MagicMock(choices=[mock_choice2]),
        ]
        mock_get_client.return_value = mock_client

        # Initial call
        res1 = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["ai_analysis"]["summary"], "Initial summary.")

        # Force refresh call
        res2 = client.post(
            f"/research-papers/{paper.id}/analyze",
            json={"force_refresh": True},
            headers=headers,
        )
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["ai_analysis"]["summary"], "Regenerated summary.")
        self.assertFalse(res2.json()["analysis_metadata"]["is_cached"])
        self.assertEqual(mock_client.chat.completions.create.call_count, 2)

    def test_07_get_analysis_returns_404_when_not_analyzed(self):
        """GET /analysis returns 404 when no analysis has been generated yet and auto_generate is false."""
        token, _ = self._create_and_login_user("notanalyzed")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper()

        res = client.get(f"/research-papers/{paper.id}/analysis", headers=headers)
        self.assertEqual(res.status_code, 404)
        self.assertIn("No analysis found", res.json()["detail"])

    @patch("backend.app.services.paper_analysis_service.get_ai_client")
    def test_08_ai_provider_failure_returns_503(self, mock_get_client):
        """AI provider failure is caught and mapped to HTTP 503."""
        token, _ = self._create_and_login_user("provfail")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper()

        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("Service connection reset")
        mock_get_client.return_value = mock_client

        res = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
        self.assertEqual(res.status_code, 503)

    @patch("backend.app.services.paper_analysis_service.get_ai_client")
    def test_09_malformed_ai_json_returns_502(self, mock_get_client):
        """Malformed JSON from AI is caught and returns 502 Bad Gateway."""
        token, _ = self._create_and_login_user("badjson")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper()

        mock_choice = MagicMock()
        mock_choice.message = MagicMock(content="This is plain text not valid JSON { broken")
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])
        mock_get_client.return_value = mock_client

        res = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
        self.assertEqual(res.status_code, 502)

    def test_10_missing_api_key_returns_503(self):
        """When GROQ_API_KEY is not set in environment, endpoint returns 503 cleanly."""
        token, _ = self._create_and_login_user("nokey")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper()

        with patch.dict(os.environ, {}, clear=False):
            if "GROQ_API_KEY" in os.environ:
                del os.environ["GROQ_API_KEY"]
            if "AI_API_KEY" in os.environ:
                del os.environ["AI_API_KEY"]

            res = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
            self.assertEqual(res.status_code, 503)
            self.assertIn("GROQ_API_KEY", res.json()["detail"])

    def test_11_cascade_delete_paper_deletes_analysis(self):
        """Deleting a paper cascades and removes its analysis record."""
        token, _ = self._create_and_login_user("cascade")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper()

        # Create analysis directly
        analysis = ResearchPaperAnalysis(
            paper_id=paper.id,
            summary="Test summary",
            research_problem="Test problem",
            methodology="Test method",
            key_findings=["F1"],
            limitations=["L1"],
            future_directions=["D1"],
            content_scope="abstract_and_metadata",
            model_used="llama-3.3-70b-versatile",
        )
        self.db.add(analysis)
        self.db.commit()

        analysis_id = analysis.id

        # Delete paper
        res_del = client.delete(f"/research-papers/{paper.id}", headers=headers)
        self.assertEqual(res_del.status_code, 204)

        # Verify analysis is deleted
        found = self.db.query(ResearchPaperAnalysis).filter(ResearchPaperAnalysis.id == analysis_id).first()
        self.assertIsNone(found)

    def test_12_prepare_paper_context_formatting(self):
        """Validates prepare_paper_context includes all required fields and handles missing fields."""
        paper = self._create_sample_paper(
            title="Deep Residual Learning",
            abstract="Deeper neural networks are more difficult to train. We present a residual learning framework.",
            authors="Kaiming He, Xiangyu Zhang",
        )
        context, scope = prepare_paper_context(paper)
        self.assertEqual(scope, "abstract_and_metadata")
        self.assertIn("TITLE: Deep Residual Learning", context)
        self.assertIn("AUTHORS: Kaiming He, Xiangyu Zhang", context)
        self.assertIn("ABSTRACT / AVAILABLE CONTENT:", context)
        self.assertIn("residual learning framework", context)

    def test_13_search_by_title_keyword_and_authors(self):
        """Test search query matching across title, authors, and keywords."""
        token, _ = self._create_and_login_user("searchtester")
        headers = {"Authorization": f"Bearer {token}"}

        p1 = self._create_sample_paper(
            title="Generative Adversarial Nets",
            abstract="We propose a new framework for estimating generative models via an adversarial process.",
            authors="Ian Goodfellow, Jean Pouget-Abadie",
        )

        # Search by partial title
        res = client.get("/research-papers?search=Adversarial", headers=headers)
        self.assertEqual(res.status_code, 200)
        papers = res.json()["papers"]
        self.assertTrue(any(p["id"] == str(p1.id) for p in papers))

        # Search by author
        res_auth = client.get("/research-papers?search=Goodfellow", headers=headers)
        self.assertEqual(res_auth.status_code, 200)
        self.assertTrue(any(p["id"] == str(p1.id) for p in res_auth.json()["papers"]))

    def test_14_search_by_year_2024(self):
        """Test year filter accurately filters papers by publication year 2024."""
        token, _ = self._create_and_login_user("yeartester")
        headers = {"Authorization": f"Bearer {token}"}

        p_2024 = ResearchPaper(
            source="OpenAlex",
            source_id=f"W{uuid.uuid4().hex[:8]}",
            title="Next-Gen LLM Architectures 2024",
            abstract="A comprehensive survey on large language model developments in 2024.",
            authors="Jane Doe, John Smith",
            publication_year=2024,
            research_domain="Computer Science",
            citation_count=12,
        )
        p_2021 = ResearchPaper(
            source="OpenAlex",
            source_id=f"W{uuid.uuid4().hex[:8]}",
            title="Older Study on Transformers 2021",
            abstract="An earlier study on transformer architectures from 2021.",
            authors="Alice Brown",
            publication_year=2021,
            research_domain="Computer Science",
            citation_count=50,
        )
        self.db.add_all([p_2024, p_2021])
        self.db.commit()

        res = client.get("/research-papers?year=2024", headers=headers)
        self.assertEqual(res.status_code, 200)
        papers = res.json()["papers"]
        self.assertTrue(all(p["publication_year"] == 2024 for p in papers))
        self.assertTrue(any(p["id"] == str(p_2024.id) for p in papers))
        self.assertFalse(any(p["id"] == str(p_2021.id) for p in papers))

    def test_15_search_multi_word_query(self):
        """Test multi-word search query matches across fields."""
        token, _ = self._create_and_login_user("multiword")
        headers = {"Authorization": f"Bearer {token}"}

        p = self._create_sample_paper(
            title="Reinforcement Learning for Robotic Control",
            abstract="Deep reinforcement learning algorithms applied to continuous locomotion.",
            authors="Pieter Abbeel, Sergey Levine",
        )

        res = client.get("/research-papers?search=robotic%20control", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(paper["id"] == str(p.id) for paper in res.json()["papers"]))

    def test_16_combined_search_year_and_domain_filters(self):
        """Test combined search, year, and research_domain filters together."""
        token, _ = self._create_and_login_user("combined")
        headers = {"Authorization": f"Bearer {token}"}

        p_target = ResearchPaper(
            source="OpenAlex",
            source_id=f"W{uuid.uuid4().hex[:8]}",
            title="Quantum Error Correction in Topological Systems",
            abstract="Novel topological codes for fault-tolerant quantum computation.",
            authors="John Preskill",
            publication_year=2024,
            research_domain="Quantum Physics",
            citation_count=45,
        )
        p_other = ResearchPaper(
            source="OpenAlex",
            source_id=f"W{uuid.uuid4().hex[:8]}",
            title="Classical Error Correction in Wireless Networks",
            abstract="Error correction codes for LTE networks.",
            authors="Bob Miller",
            publication_year=2024,
            research_domain="Telecommunications",
            citation_count=10,
        )
        self.db.add_all([p_target, p_other])
        self.db.commit()

        res = client.get(
            "/research-papers?search=Quantum&year=2024&research_domain=Quantum%20Physics",
            headers=headers,
        )
        self.assertEqual(res.status_code, 200)
        papers = res.json()["papers"]
        self.assertEqual(len(papers), 1)
        self.assertEqual(papers[0]["id"], str(p_target.id))

    @patch("backend.app.routers.research_paper.fetch_openalex_works")
    def test_17_openalex_import_endpoint(self, mock_fetch):
        """Test POST /research-papers/import fetches and persists new papers."""
        token, _ = self._create_and_login_user("importer")
        headers = {"Authorization": f"Bearer {token}"}

        unique_source_id = f"W_imp_{uuid.uuid4().hex[:6]}"
        mock_fetch.return_value = [
            {
                "source": "OpenAlex",
                "source_id": unique_source_id,
                "title": "Imported Test Paper",
                "abstract": "This is a test paper imported from OpenAlex.",
                "authors": "Dr. Test",
                "publication_year": 2024,
                "publication_date": None,
                "journal_or_conference": "Nature AI",
                "keywords": "Test, AI",
                "research_domain": "Computer Science",
                "doi": "https://doi.org/10.1234/test",
                "citation_count": 5,
                "publication_link": "https://doi.org/10.1234/test",
            }
        ]

        res = client.post(
            "/research-papers/import",
            json={"search": "quantum AI", "per_page": 5},
            headers=headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["source"], "OpenAlex")
        self.assertEqual(data["inserted"], 1)

    def test_18_semantic_scholar_429_handling(self):
        """Test that Semantic Scholar 429 returns empty list gracefully without raising exception."""
        from backend.app.services.research_paper_service import fetch_semantic_scholar_papers
        with patch("backend.app.services.research_paper_service.httpx.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 429
            mock_get.return_value = mock_resp

            result = fetch_semantic_scholar_papers("search term")
            self.assertEqual(result, [])

    def test_19_crossref_404_handling(self):
        """Test that Crossref 404 returns None gracefully without raising exception."""
        from backend.app.services.research_paper_service import fetch_crossref_metadata
        with patch("backend.app.services.research_paper_service.httpx.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 404
            mock_get.return_value = mock_resp

            result = fetch_crossref_metadata("10.9999/nonexistent.doi")
            self.assertIsNone(result)

