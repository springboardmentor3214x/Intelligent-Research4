import os
import unittest
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-providers-12345"

from backend.app.services.providers.base import (
    BaseResearchProvider,
    NormalizedPaper,
    ProviderResult,
    ProviderStatus,
)
from backend.app.services.providers.openalex import OpenAlexProvider
from backend.app.services.providers.crossref import CrossrefProvider
from backend.app.services.providers.semantic_scholar import SemanticScholarProvider
from backend.app.services.providers.core import CoreProvider
from backend.app.services.providers.arxiv import ArxivProvider
from backend.app.services.providers.europe_pmc import EuropePMCProvider
from backend.app.services.providers.pubmed import PubMedProvider
from backend.app.services.providers.doaj import DOAJProvider
from backend.app.services.providers.openaire import OpenAIREProvider
from backend.app.services.providers.zenodo import ZenodoProvider
from backend.app.services.providers.biorxiv import BioRxivProvider
from backend.app.services.providers.medrxiv import MedRxivProvider
from backend.app.services.providers.base_provider import BaseProvider
from backend.app.services.research_paper_service import (
    deduplicate_papers,
    check_paper_relevance,
    generate_concept_expansions,
    aggregate_multi_source_search,
)


class TestResearchProviders(unittest.TestCase):

    def test_01_concept_expansions(self):
        expansions = generate_concept_expansions("Crowd Detection and Prediction System")
        self.assertGreaterEqual(len(expansions), 1)
        self.assertTrue(any("crowd" in e.lower() for e in expansions))

        unet_expansions = generate_concept_expansions("3D U-Net Medical Segmentation")
        self.assertTrue(any("u-net" in e.lower() or "unet" in e.lower() for e in unet_expansions))

    def test_02_paper_relevance(self):
        p1 = NormalizedPaper(
            source="OpenAlex",
            source_id="1",
            title="Crowd density estimation and anomaly detection using deep neural networks",
            abstract="We present a crowd counting model.",
        )
        self.assertTrue(check_paper_relevance(p1, "Crowd Detection"))

        p2 = NormalizedPaper(
            source="OpenAlex",
            source_id="2",
            title="Ancient Roman Agricultural Architecture",
            abstract="Study of soil and irrigation in 200 BC.",
        )
        self.assertFalse(check_paper_relevance(p2, "Crowd Detection and Prediction System"))

    def test_03_deduplication_and_provenance(self):
        p_openalex = {
            "source": "OpenAlex",
            "source_id": "W100",
            "title": "Deep Residual Learning for Image Recognition",
            "doi": "https://doi.org/10.1109/cvpr.2016.90",
            "publication_year": 2016,
            "abstract": "Shorter abstract",
            "citation_count": 100000,
        }
        p_crossref = {
            "source": "Crossref",
            "source_id": "10.1109/cvpr.2016.90",
            "title": "Deep Residual Learning for Image Recognition",
            "doi": "https://doi.org/10.1109/cvpr.2016.90",
            "publication_year": 2016,
            "abstract": "Deep residual networks are easier to optimize and can gain accuracy from considerably increased depth.",
            "citation_count": 105000,
        }
        p_core = {
            "source": "CORE",
            "source_id": "core_999",
            "title": "Deep Residual Learning for Image Recognition",
            "doi": "https://doi.org/10.1109/cvpr.2016.90",
            "publication_year": 2016,
            "open_access_url": "https://core.ac.uk/download/pdf/123.pdf",
            "citation_count": 90000,
        }

        merged = deduplicate_papers([p_openalex, p_crossref, p_core])
        self.assertEqual(len(merged), 1)
        res = merged[0]
        self.assertIn("OpenAlex", res["provenance_sources"])
        self.assertIn("Crossref", res["provenance_sources"])
        self.assertIn("CORE", res["provenance_sources"])
        self.assertEqual(res["citation_count"], 105000)
        self.assertTrue(res["is_open_access"])
        self.assertEqual(res["open_access_url"], "https://core.ac.uk/download/pdf/123.pdf")

    @patch("httpx.Client.get")
    def test_04_openalex_provider_mock(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "meta": {"count": 1},
            "results": [{
                "id": "https://openalex.org/W12345",
                "title": "Deep Learning Diagnostics",
                "publication_year": 2024,
                "publication_date": "2024-05-10",
                "cited_by_count": 15,
                "doi": "https://doi.org/10.1016/j.ai.2024.01",
                "abstract_inverted_index": {"Deep": [0], "learning": [1], "diagnostics": [2]},
            }],
        }
        mock_get.return_value = mock_resp

        provider = OpenAlexProvider()
        res = provider.search(query="Deep Learning", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertEqual(res.results[0].title, "Deep Learning Diagnostics")

    @patch("httpx.Client.get")
    def test_05_crossref_provider_mock(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "message": {
                "total-results": 1,
                "items": [{
                    "DOI": "10.1007/s11517-023-02941-8",
                    "title": ["Brain Tumor Segmentation via 3D U-Net"],
                    "author": [{"given": "John", "family": "Doe"}],
                    "issued": {"date-parts": [[2023, 11, 15]]},
                    "container-title": ["Medical & Biological Engineering & Computing"],
                    "is-referenced-by-count": 22,
                }]
            }
        }
        mock_get.return_value = mock_resp

        provider = CrossrefProvider()
        res = provider.search(query="3D U-Net", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertEqual(res.results[0].title, "Brain Tumor Segmentation via 3D U-Net")

    @patch("httpx.Client.get")
    def test_06_semantic_scholar_provider_rate_limit(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        mock_get.return_value = mock_resp

        provider = SemanticScholarProvider()
        res = provider.search(query="Crowd Analysis", target_count=5)
        self.assertEqual(res.status, ProviderStatus.RATE_LIMITED)
        self.assertEqual(len(res.results), 0)

    def test_07_core_provider_missing_key(self):
        with patch.dict(os.environ, {"CORE_API_KEY": ""}):
            provider = CoreProvider()
            res = provider.search(query="Quantum Computing", target_count=5)
            self.assertEqual(res.status, ProviderStatus.NOT_CONFIGURED)
            self.assertEqual(len(res.results), 0)

    @patch("httpx.Client.get")
    def test_08_arxiv_provider_atom_parsing(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = """<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
          <opensearch:totalResults>1</opensearch:totalResults>
          <entry>
            <id>http://arxiv.org/abs/2301.12345v1</id>
            <published>2023-01-25T18:00:00Z</published>
            <title>Advances in Generative Artificial Intelligence</title>
            <summary>Comprehensive study of modern generative foundation models.</summary>
            <author><name>Alice Smith</name></author>
            <arxiv:primary_category term="cs.AI"/>
          </entry>
        </feed>"""
        mock_get.return_value = mock_resp

        provider = ArxivProvider()
        res = provider.search(query="Generative AI", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertEqual(res.results[0].source_id, "2301.12345v1")
        self.assertTrue(res.results[0].is_open_access)

    @patch("httpx.Client.get")
    def test_09_europe_pmc_provider_mock(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "hitCount": 1,
            "resultList": {
                "result": [{
                    "id": "35812345",
                    "title": "Machine Learning in Biomedical Imaging",
                    "authorString": "Lee K, Patel R",
                    "pubYear": "2024",
                    "journalTitle": "Bioinformatics Advances",
                    "doi": "10.1093/bioadv/vbae001",
                    "isOpenAccess": "Y",
                }]
            }
        }
        mock_get.return_value = mock_resp

        provider = EuropePMCProvider()
        res = provider.search(query="Biomedical Imaging", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertTrue(res.results[0].is_open_access)

    @patch("httpx.Client.get")
    def test_10_pubmed_provider_mock(self, mock_get):
        esearch_resp = MagicMock()
        esearch_resp.status_code = 200
        esearch_resp.json.return_value = {
            "esearchresult": {
                "count": "1",
                "idlist": ["98765432"],
            }
        }

        efetch_resp = MagicMock()
        efetch_resp.status_code = 200
        efetch_resp.text = """<?xml version="1.0"?>
        <PubmedArticleSet>
          <PubmedArticle>
            <MedlineCitation>
              <PMID>98765432</PMID>
              <Article>
                <Journal><Title>Journal of Neuro-oncology</Title></Journal>
                <ArticleTitle>MRI Segmentation of Glioblastoma Tumors</ArticleTitle>
                <Abstract><AbstractText>Clinical outcomes.</AbstractText></Abstract>
                <AuthorList><Author><LastName>Zhang</LastName><ForeName>Wei</ForeName></Author></AuthorList>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
        </PubmedArticleSet>"""

        mock_get.side_effect = [esearch_resp, efetch_resp]

        provider = PubMedProvider()
        res = provider.search(query="Glioblastoma Segmentation", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertEqual(res.results[0].source_id, "98765432")

    @patch("httpx.Client.get")
    def test_11_doaj_provider_mock(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "total": 1,
            "results": [{
                "id": "doaj_art_111",
                "bibjson": {
                    "title": "Open Access Neural Network Architectures",
                    "year": "2024",
                    "author": [{"name": "Dr. Sarah Connor"}],
                    "journal": {"title": "Open Computer Science"},
                    "identifier": [{"type": "doi", "id": "10.1515/comp-2024-0001"}],
                    "link": [{"type": "fulltext", "url": "https://example.org/oa.pdf"}],
                }
            }]
        }
        mock_get.return_value = mock_resp

        provider = DOAJProvider()
        res = provider.search(query="Neural Networks", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertTrue(res.results[0].is_open_access)

    @patch("httpx.Client.get")
    def test_12_openaire_provider_mock(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "response": {
                "header": {"total": {"$": "1"}},
                "results": {
                    "result": [{
                        "header": {"dri:objIdentifier": {"$": "openaire____12345"}},
                        "metadata": {
                            "oaf:entity": {
                                "oaf:result": {
                                    "title": {"$": "European Open Science Cloud Framework"},
                                    "creator": [{"$": "Dr. Jean Dupont"}],
                                    "dateofacceptance": {"$": "2024-03-01"},
                                    "pid": [{"@classid": "doi", "$": "10.5281/zenodo.12345"}],
                                    "bestaccessright": {"@classid": "open"},
                                    "resulttype": {"@classid": "publication"},
                                }
                            }
                        }
                    }]
                }
            }
        }
        mock_get.return_value = mock_resp

        provider = OpenAIREProvider()
        res = provider.search(query="Open Science Cloud", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertEqual(res.results[0].title, "European Open Science Cloud Framework")
        self.assertEqual(res.results[0].source, "OpenAIRE")
        self.assertTrue(res.results[0].is_open_access)

    @patch("httpx.Client.get")
    def test_13_zenodo_provider_mock(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "hits": {
                "total": 1,
                "hits": [{
                    "id": 999888,
                    "metadata": {
                        "title": "Medical Imaging Benchmark Dataset",
                        "description": "Cleaned open benchmark dataset for tumor segmentation.",
                        "creators": [{"name": "Smith, John"}],
                        "publication_date": "2024-02-15",
                        "doi": "10.5281/zenodo.999888",
                        "resource_type": {"type": "dataset"},
                        "access_right": "open",
                    },
                    "links": {"html": "https://zenodo.org/records/999888"},
                }]
            }
        }
        mock_get.return_value = mock_resp

        provider = ZenodoProvider()
        res = provider.search(query="Benchmark Dataset", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertEqual(res.results[0].title, "Medical Imaging Benchmark Dataset")
        self.assertEqual(res.results[0].document_type, "dataset")
        self.assertEqual(res.results[0].source, "Zenodo")

    @patch("httpx.Client.get")
    def test_14_biorxiv_provider_mock(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "messages": [{"total": 1}],
            "collection": [{
                "doi": "10.1101/2024.01.01.573829",
                "title": "Deep Learning for Single-Cell RNA Sequencing Analysis",
                "authors": "Alice Wang, Bob Ross",
                "date": "2024-01-05",
                "category": "bioinformatics",
                "version": "1",
                "abstract": "We develop a neural architecture for RNA sequence modeling.",
            }]
        }
        mock_get.return_value = mock_resp

        provider = BioRxivProvider()
        res = provider.search(query="Single-Cell RNA", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertEqual(res.results[0].source, "bioRxiv")
        self.assertTrue(res.results[0].is_preprint)
        self.assertEqual(res.results[0].document_type, "preprint")

    @patch("httpx.Client.get")
    def test_15_medrxiv_provider_mock(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "messages": [{"total": 1}],
            "collection": [{
                "doi": "10.1101/2024.02.01.24302111",
                "title": "Clinical Diagnostic Trial of AI in Radiology",
                "authors": "Dr. Sarah Connor",
                "date": "2024-02-10",
                "category": "radiology",
                "version": "1",
                "abstract": "Evaluation across 500 patient scans.",
            }]
        }
        mock_get.return_value = mock_resp

        provider = MedRxivProvider()
        res = provider.search(query="AI Radiology", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertEqual(res.results[0].source, "medRxiv")
        self.assertTrue(res.results[0].is_preprint)
        self.assertEqual(res.results[0].document_type, "preprint")

    @patch("httpx.Client.get")
    def test_16_base_provider_mock(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "response": {
                "numFound": 1,
                "docs": [{
                    "dcid": "base-rec-101",
                    "dctitle": ["Distributed Systems in Academic Cloud"],
                    "dccreator": ["Klaus Mueller"],
                    "dcyear": "2023",
                    "dccollection": ["Uni Bielefeld E-Prints"],
                    "dclink": ["https://pub.uni-bielefeld.de/record/101"],
                    "dcoa": 1,
                    "dcdescription": ["Analysis of institutional computing infrastructure."],
                }]
            }
        }
        mock_get.return_value = mock_resp

        provider = BaseProvider()
        res = provider.search(query="Distributed Systems", target_count=5)
        self.assertEqual(res.status, ProviderStatus.AVAILABLE)
        self.assertEqual(len(res.results), 1)
        self.assertEqual(res.results[0].source, "BASE")
        self.assertTrue(res.results[0].is_open_access)


if __name__ == "__main__":
    unittest.main()
