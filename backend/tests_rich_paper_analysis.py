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
from backend.app.services.paper_extractor_service import (
    ExtractedPaperContent,
    clean_extracted_text,
    detect_sections,
    find_open_access_pdf_url,
)
from backend.tests_common import TestingSessionLocal, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

MOCK_RICH_JSON = {
    "paper_overview": {
        "title": "Attention Is All You Need",
        "authors": "Ashish Vaswani, Noam Shazeer, Niki Parmar",
        "publication_year": 2017,
        "venue": "NeurIPS",
        "doi": "10.48550/arXiv.1706.03762",
        "research_area": "Computer Science",
        "keywords": ["Transformers", "Attention", "NLP", "Sequence Transduction"],
        "citation_count": 95000,
        "open_access_status": "Open Access",
        "source": "OpenAlex",
        "paper_type": "Research Article",
        "paper_type_rationale": "Proposes a novel neural network architecture evaluated on machine translation benchmarks."
    },
    "executive_summary": {
        "summary_text": "The paper introduces the Transformer, a sequence transduction model based entirely on self-attention mechanisms without recurrent or convolutional layers.",
        "core_premise": "Replacing recurrent units with multi-head attention achieves state-of-the-art translation quality with greater parallelization.",
        "significance": "Revolutionized modern natural language processing and deep learning architectures.",
        "key_takeaways": ["Eliminates recurrence for parallel training", "Establishes multi-head self-attention"]
    },
    "research_problem": {
        "problem_statement": "Recurrent neural networks compute sequentially, which prohibits parallelization within training examples.",
        "existing_gap": "Inability of sequential models to efficiently scale to long sequences during training.",
        "motivation": "Enabling fast parallel training while modeling dependencies regardless of distance.",
        "objectives": ["Design an attention-only architecture", "Evaluate on WMT 2014 translation"],
        "research_questions": []
    },
    "background": {
        "overview": "Sequential computation in RNNs (LSTM, GRU) imposes an inherent sequential bottleneck.",
        "domain_context": "Machine translation and sequence modeling.",
        "key_concepts": [{"concept": "Self-Attention", "explanation": "Associating different positions of a single sequence to compute a representation."}]
    },
    "existing_approaches": [
        {
            "name": "Recurrent Neural Networks (LSTM/GRU)",
            "purpose": "Sequential transduction",
            "strengths": "Strong sequential memory",
            "weaknesses": "Inherent O(N) sequential training bottleneck",
            "relationship_to_paper": "Replaced by the Transformer"
        }
    ],
    "methodology": {
        "overview": "Encoder-decoder architecture utilizing stacked multi-head self-attention and point-wise feed-forward layers.",
        "workflow_stages": [
            {"step_number": 1, "stage_name": "Input Embedding & Positional Encoding", "description": "Adds sine/cosine positional information to tokens."},
            {"step_number": 2, "stage_name": "Encoder Stacks", "description": "Processes input with 6 layers of multi-head self-attention and FFN."},
            {"step_number": 3, "stage_name": "Decoder Stacks & Linear Output", "description": "Masked self-attention and cross-attention generating output probabilities."}
        ],
        "techniques_used": ["Multi-Head Attention", "Scaled Dot-Product Attention", "Positional Encoding", "Layer Normalization"],
        "algorithm_or_formulation": "Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V"
    },
    "architecture": {
        "has_architecture": True,
        "description": "6-layer stacked encoder and 6-layer stacked decoder with 8 attention heads.",
        "components": [{"name": "Multi-Head Attention", "role": "Allows model to jointly attend to information from different representation subspaces."}],
        "data_flow": "Inputs -> Positional Embedding -> Encoder Stacks -> Decoder Stacks -> Softmax Probabilities",
        "textual_pipeline": ["Input Tokens", "Positional Encoding", "Multi-Head Attention", "Feed Forward", "Softmax"]
    },
    "dataset_analysis": {
        "is_applicable": True,
        "non_applicable_reason": None,
        "datasets": [
            {
                "name": "WMT 2014 English-to-German",
                "source": "WMT Benchmark",
                "purpose": "Machine translation benchmark",
                "samples_count": "4.5 million sentence pairs",
                "classes_or_features": "BPE tokenized sentences",
                "data_characteristics": "Bilingual text pairs",
                "train_val_test_split": "newstest2014 test set",
                "preprocessing_and_augmentation": "Byte-pair encoding with shared 37k vocabulary",
                "data_quality_and_limitations": "Standard curated WMT benchmark"
            }
        ],
        "dataset_summary": "Trained on standard WMT 2014 English-German and English-French translation datasets."
    },
    "experimental_setup": {
        "is_applicable": True,
        "non_applicable_reason": None,
        "hardware_and_environment": "8 NVIDIA P100 GPUs",
        "software_and_frameworks": "TensorFlow / Tensor2Tensor",
        "hyperparameters_and_training": "Adam optimizer with beta1=0.9, beta2=0.98, warmup_steps=4000",
        "baseline_models": ["ByteNet", "ConvS2S", "GNMT"],
        "experimental_scenarios": "Base model and Big model scaling"
    },
    "evaluation_metrics": [
        {
            "name": "BLEU Score",
            "reported_value": "28.4 (EN-DE), 41.8 (EN-FR)",
            "what_it_measures": "Bilingual evaluation understudy for translation quality",
            "why_relevant": "Primary benchmark standard for machine translation"
        }
    ],
    "results": {
        "is_applicable": True,
        "non_applicable_reason": None,
        "structured_results_table": [
            {
                "metric": "BLEU (EN-to-DE)",
                "proposed_method_value": "28.4",
                "baseline_value": "26.0 (ConvS2S)",
                "improvement_or_difference": "+2.4 BLEU",
                "is_source_reported": True
            }
        ],
        "reported_results_narrative": ["Transformer (big) achieved 28.4 BLEU on English-to-German, outperforming existing best ensembles."],
        "ai_interpretation_of_results": ["Attention parallelization drastically reduced training time to 3.5 days on 8 GPUs."]
    },
    "findings": {
        "what_worked": ["Self-attention alone is sufficient for sequence modeling", "Multi-head attention yields richer contextual representations"],
        "key_observations": ["Self-attention layers have shorter maximum path lengths between tokens compared to recurrent layers"],
        "unexpected_or_notable_results": ["Model generalized effectively to English constituency parsing with minimal task-specific tuning"]
    },
    "contributions": [
        {"category": "Architectural", "description": "Introduced the pure self-attention Transformer architecture."},
        {"category": "Methodological", "description": "Demonstrated that recurrence and convolutions can be entirely eliminated in sequence transduction."}
    ],
    "novelty": {
        "novelty_summary": "The apparent novelty is the complete elimination of recurrence and convolutions in favor of multi-head self-attention.",
        "novelty_categories": ["New Architecture", "New Attention Formulation"],
        "apparent_novelty_details": "Prior models used attention only to connect recurrent encoder-decoders."
    },
    "comparison_with_existing": [
        {
            "baseline_method": "Recurrent / LSTM Models",
            "comparison_summary": "Transformers allow full O(1) sequential operation count during training compared to O(N) in RNNs.",
            "advantages_of_proposed": "Massive training speedup and superior BLEU scores.",
            "tradeoffs_or_disadvantages": "Quadratic complexity O(N^2) with sequence length."
        }
    ],
    "limitations": {
        "author_stated_limitations": ["Quadratic computational complexity with respect to sequence length."],
        "ai_identified_limitations": ["Requires large training datasets to generalize effectively without inductive biases of CNNs."]
    },
    "future_research": {
        "author_suggested_future_work": ["Applying attention-based models to other modalities including audio, image, and video."],
        "ai_suggested_directions": ["Investigating linear-time approximation methods for attention on extremely long contexts."]
    },
    "practical_applications": [
        {
            "domain_or_use_case": "Machine Translation & Large Language Models",
            "practical_impact": "Foundation for modern conversational AI, translation engines, and code assistants.",
            "is_source_supported": True
        }
    ],
    "key_terms": [
        {"term": "Multi-Head Attention", "definition_in_context": "Mechanism that linearly projects queries, keys, and values h times to attend to information from different subspaces."},
        {"term": "Positional Encoding", "definition_in_context": "Sine/cosine functions injected into embeddings to supply token order."}
    ],
    "paper_strengths": [
        {"strength_type": "Architectural", "description": "Highly parallelizable and scalable training pipeline."},
        {"strength_type": "Experimental", "description": "Established new state-of-the-art results on competitive WMT benchmarks."}
    ],
    "research_gaps": [
        {"gap_type": "Computational Complexity", "description": "O(N^2) memory footprint for very long documents."}
    ],
    "researcher_takeaway": {
        "core_idea": "Eliminate recurrent connections and compute sequence representations entirely via multi-head attention.",
        "most_useful_contribution": "The scalable Transformer encoder-decoder architecture.",
        "most_important_limitation": "Quadratic memory scaling with sequence length.",
        "follow_up_opportunity": "Exploring efficient attention mechanisms and multimodal transformers.",
        "why_researchers_should_care": "The Transformer is the universal backbone of modern generative AI and deep learning."
    }
}


class TestRichPaperAnalysisModule(unittest.TestCase):
    def setUp(self):
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()

    def _create_and_login_user(self, suffix="test"):
        email = f"user_{suffix}_{uuid.uuid4().hex[:6]}@example.com"
        password = "SecurePassword123!"
        reg_payload = {
            "name": f"Dr. {suffix.title()}",
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
        return token, None

    def _create_sample_paper(self, title="Attention Is All You Need"):
        paper = ResearchPaper(
            source="OpenAlex",
            source_id=f"W{uuid.uuid4().hex[:8]}",
            title=title,
            abstract="The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, a model architecture eschewing recurrence and entirely relying on an attention mechanism.",
            authors="Ashish Vaswani, Noam Shazeer, Niki Parmar",
            publication_year=2017,
            journal_or_conference="NeurIPS",
            research_domain="Computer Science",
            doi="https://doi.org/10.48550/arXiv.1706.03762",
            citation_count=95000,
            publication_link="https://arxiv.org/abs/1706.03762",
        )
        self.db.add(paper)
        self.db.commit()
        self.db.refresh(paper)
        return paper

    def test_01_text_extractor_cleaning_and_sections(self):
        raw_text = "Abstract\nThis is the abstract.\n\nMethodology\nWe use a 6-layer Trans- \nformer encoder.\n\nResults\nBLEU is 28.4."
        cleaned = clean_extracted_text(raw_text)
        self.assertIn("Transformer", cleaned)
        sections = detect_sections(cleaned)
        self.assertIn("Abstract", sections)
        self.assertIn("Methodology", sections)
        self.assertIn("Results", sections)

    def test_02_arxiv_pdf_url_discovery(self):
        url = find_open_access_pdf_url(
            paper_source="OpenAlex",
            source_id="W12345",
            doi="10.48550/arXiv.1706.03762",
            publication_link="https://arxiv.org/abs/1706.03762"
        )
        self.assertEqual(url, "https://arxiv.org/pdf/1706.03762.pdf")

    def test_03_rich_analysis_endpoint_success(self):
        token, _ = self._create_and_login_user("rich1")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper()

        mock_groq_client = MagicMock()
        mock_completion = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps(MOCK_RICH_JSON)
        mock_completion.choices = [mock_choice]
        mock_groq_client.chat.completions.create.return_value = mock_completion

        with patch("backend.app.services.paper_analysis_service.get_ai_client", return_value=mock_groq_client):
            res = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["paper_id"], str(paper.id))
            self.assertIn("rich_analysis", data)
            rich = data["rich_analysis"]
            self.assertEqual(rich["paper_overview"]["paper_type"], "Research Article")
            self.assertIn("Transformer", rich["executive_summary"]["summary_text"])
            self.assertEqual(len(rich["methodology"]["workflow_stages"]), 3)
            self.assertTrue(rich["dataset_analysis"]["is_applicable"])
            self.assertEqual(rich["dataset_analysis"]["datasets"][0]["name"], "WMT 2014 English-to-German")
            self.assertEqual(rich["results"]["structured_results_table"][0]["proposed_method_value"], "28.4")

    def test_04_caching_and_force_refresh(self):
        token, _ = self._create_and_login_user("cache")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper("Survey on Deep Learning")

        mock_groq_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps(MOCK_RICH_JSON)
        mock_groq_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])

        with patch("backend.app.services.paper_analysis_service.get_ai_client", return_value=mock_groq_client):
            # First call generates and stores in PostgreSQL
            res1 = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
            self.assertEqual(res1.status_code, 200)
            self.assertFalse(res1.json()["analysis_metadata"]["is_cached"])

            # Second call retrieves from cache without calling AI client
            mock_groq_client.chat.completions.create.reset_mock()
            res2 = client.get(f"/research-papers/{paper.id}/analysis", headers=headers)
            self.assertEqual(res2.status_code, 200)
            self.assertTrue(res2.json()["analysis_metadata"]["is_cached"])
            mock_groq_client.chat.completions.create.assert_not_called()

            # Forced refresh triggers AI call again
            res3 = client.post(f"/research-papers/{paper.id}/analyze", json={"force_refresh": True}, headers=headers)
            self.assertEqual(res3.status_code, 200)
            self.assertFalse(res3.json()["analysis_metadata"]["is_cached"])
            mock_groq_client.chat.completions.create.assert_called_once()

    def test_05_survey_paper_non_applicable_dataset(self):
        survey_json = dict(MOCK_RICH_JSON)
        survey_json["paper_overview"]["paper_type"] = "Survey / Review"
        survey_json["dataset_analysis"] = {
            "is_applicable": False,
            "non_applicable_reason": "Dataset analysis is not applicable because this paper is a comprehensive literature review without empirical dataset experiments.",
            "datasets": [],
            "dataset_summary": ""
        }

        token, _ = self._create_and_login_user("survey")
        headers = {"Authorization": f"Bearer {token}"}
        paper = self._create_sample_paper("A Survey on In-Context Learning")

        mock_groq_client = MagicMock()
        mock_groq_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content=json.dumps(survey_json)))]
        )

        with patch("backend.app.services.paper_analysis_service.get_ai_client", return_value=mock_groq_client):
            res = client.post(f"/research-papers/{paper.id}/analyze", headers=headers)
            self.assertEqual(res.status_code, 200)
            rich = res.json()["rich_analysis"]
            self.assertEqual(rich["paper_overview"]["paper_type"], "Survey / Review")
            self.assertFalse(rich["dataset_analysis"]["is_applicable"])
            self.assertIn("literature review", rich["dataset_analysis"]["non_applicable_reason"])


if __name__ == "__main__":
    unittest.main()
