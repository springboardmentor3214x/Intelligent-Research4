import unittest
from backend.app.models.patent import Patent
from backend.app.services.patent_idea_service import (
    extract_idea_structured_concepts,
    generate_search_concepts,
)
from backend.app.services.patent_clustering_service import detect_patent_country


class TestPatentIdeaAnalysis(unittest.TestCase):
    def test_extract_idea_structured_concepts_medical(self):
        sample_idea = """
        An AI-powered 3D MRI brain tumor segmentation system using U-Net transformers
        to reconstruct volumetric anomalies and provide uncertainty heatmaps.
        """
        concepts = extract_idea_structured_concepts(sample_idea)
        
        self.assertIn("Medical", concepts.domain)
        self.assertTrue(len(concepts.technical_components) > 0)
        self.assertTrue(len(concepts.keywords) > 0)
        self.assertTrue(any("MRI" in kw or "Brain" in kw or "Segmentation" in kw for kw in concepts.keywords))

    def test_extract_idea_structured_concepts_energy(self):
        sample_idea = """
        Smart solar inverter utilizing reinforcement learning for maximum power point tracking (MPPT)
        and battery grid synchronization.
        """
        concepts = extract_idea_structured_concepts(sample_idea)
        
        self.assertIn("Clean Energy", concepts.domain)
        self.assertTrue(len(concepts.technical_components) > 0)
        self.assertTrue(len(concepts.keywords) > 0)

    def test_generate_search_concepts(self):
        sample_idea = "A novel drone system with LiDAR and computer vision for agricultural crop monitoring and fertilizer spraying."
        concepts = extract_idea_structured_concepts(sample_idea)
        search_terms = generate_search_concepts(concepts, sample_idea)
        
        self.assertTrue(len(search_terms) > 0)
        joined = " ".join(search_terms).lower()
        self.assertTrue("crop" in joined or "vision" in joined or "drone" in joined or "agricultural" in joined)

    def test_detect_patent_country(self):
        p_in = Patent(publication_number="IN202341012345A", assignee="IIT Madras", title="Patent A")
        p_ep = Patent(publication_number="EP3940123A1", assignee="Siemens AG", title="Patent B")
        p_us = Patent(publication_number="US10928374B2", assignee="Apple Inc", title="Patent C")
        p_wo = Patent(publication_number="WO2021123456A1", assignee="Global Bio", title="Patent D")
        p_cn = Patent(publication_number="CN112345678A", assignee="Huawei", title="Patent E")
        p_jp = Patent(publication_number="JP2020123456A", assignee="Sony Corp", title="Patent F")

        self.assertEqual(detect_patent_country(p_in), "India")
        self.assertEqual(detect_patent_country(p_ep), "European Patent Office (EPO)")
        self.assertEqual(detect_patent_country(p_us), "United States")
        self.assertEqual(detect_patent_country(p_wo), "WIPO (PCT)")
        self.assertEqual(detect_patent_country(p_cn), "China")
        self.assertEqual(detect_patent_country(p_jp), "Japan")


if __name__ == "__main__":
    unittest.main()
