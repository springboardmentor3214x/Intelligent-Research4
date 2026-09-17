import json
import logging
import os
import re
from typing import Any
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

XAI_API_KEY = os.getenv("XAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
AI_PROVIDER = os.getenv("AI_PROVIDER", "auto").lower()


class GrokService:
    """
    AI Service Abstraction supporting xAI Grok API, Groq, and Heuristic Fallback.
    Used for concept extraction, semantic explanation, risk assessment, and synthesis.
    DOES NOT invent or fabricate funding opportunities or research data.
    """

    def __init__(self):
        self.xai_api_key = os.getenv("XAI_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.xai_base_url = "https://api.x.ai/v1"
        self.groq_base_url = "https://api.groq.com/openai/v1"

    def get_provider_name(self) -> str:
        if self.xai_api_key and (AI_PROVIDER in {"grok", "xai"} or (AI_PROVIDER == "auto" and not self.groq_api_key)):
            return "xAI Grok"
        if self.groq_api_key and (AI_PROVIDER in {"groq"} or (AI_PROVIDER == "auto" and not self.xai_api_key)):
            return "Groq AI"
        return "Heuristic NLP Engine"

    def extract_idea_metadata(self, idea_text: str) -> dict[str, Any]:
        """
        Extract domain, research areas, technologies, keywords, application areas,
        and potential funding categories from the user's startup or research idea.
        """
        provider = self.get_provider_name()
        if provider in {"xAI Grok", "Groq AI"} and AI_PROVIDER != "heuristic":
            try:
                extracted = self._call_llm_for_metadata(idea_text, provider)
                if extracted:
                    return extracted
            except Exception as exc:
                logger.warning("LLM extraction failed (%s), falling back to heuristic engine.", exc)

        return self._heuristic_idea_extraction(idea_text)

    def _call_llm_for_metadata(self, idea_text: str, provider: str) -> dict[str, Any] | None:
        """Call Grok or Groq endpoint with strict JSON response schema."""
        is_grok = provider == "xAI Grok"
        api_key = self.xai_api_key if is_grok else self.groq_api_key
        if not api_key:
            return None

        base_url = self.xai_base_url if is_grok else self.groq_base_url
        model = "grok-beta" if is_grok else (os.getenv("GROQ_MODEL") or "llama-3.3-70b-versatile")

        prompt = (
            "Analyze the following startup/research idea and extract structured concepts in JSON format.\n"
            "Return ONLY valid JSON with keys:\n"
            "- idea_summary: string (concise 1-2 sentence overview)\n"
            "- domain: string (primary industry/scientific domain, e.g., 'Artificial Intelligence', 'Biotechnology', 'Healthcare & Life Sciences', 'Renewable Energy', 'Quantum Computing')\n"
            "- research_areas: list of 3-5 strings (specific research subfields)\n"
            "- technologies: list of 3-6 strings (underlying technologies, methods, algorithms, materials)\n"
            "- keywords: list of 4-8 strings (important technical keywords)\n"
            "- application_areas: list of 2-4 strings (commercial/clinical use cases)\n"
            "- potential_funding_categories: list of 2-4 strings (e.g., 'HealthTech Grant', 'DeepTech Seed Grant', 'Commercialization Grant')\n\n"
            f"Idea Description:\n\"\"\"{idea_text}\"\"\""
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a scientific research and grant intelligence assistant. Output valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"} if not is_grok else None,
        }

        try:
            with httpx.Client(timeout=3.0) as client:
                resp = client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    clean_content = re.sub(r"^```json\s*", "", content.strip())
                    clean_content = re.sub(r"\s*```$", "", clean_content)
                    parsed = json.loads(clean_content)
                    return {
                        "idea_summary": parsed.get("idea_summary", idea_text[:200]),
                        "domain": parsed.get("domain", "Technology Innovation"),
                        "research_areas": list(parsed.get("research_areas", [])),
                        "technologies": list(parsed.get("technologies", [])),
                        "keywords": list(parsed.get("keywords", [])),
                        "application_areas": list(parsed.get("application_areas", [])),
                        "potential_funding_categories": list(parsed.get("potential_funding_categories", [])),
                    }
        except Exception:
            return None
        return None

    def _heuristic_idea_extraction(self, idea_text: str) -> dict[str, Any]:
        """Deterministic NLP-based concept and entity extraction."""
        text_lower = idea_text.lower()

        # Domain recognition
        domain = "Interdisciplinary Technology"
        domain_patterns = [
            ("Healthcare & Life Sciences", ["health", "mri", "tumor", "medical", "cancer", "biomedical", "disease", "clinical", "diagnostic", "patient", "imaging", "pharma"]),
            ("Artificial Intelligence & Machine Learning", ["ai", "machine learning", "deep learning", "neural network", "computer vision", "nlp", "llm", "transformer", "reinforcement learning"]),
            ("Biotechnology & Bioinformatics", ["biotech", "dna", "rna", "genomics", "protein", "crispr", "microbiology", "cellular", "pathogen", "vaccine"]),
            ("Renewable Energy & CleanTech", ["solar", "energy", "photovoltaic", "hydrogen", "battery", "storage", "clean energy", "green", "carbon", "wind", "biomass"]),
            ("Robotics & Autonomous Systems", ["robot", "autonomous", "drone", "sensor", "lidar", "actuator", "control system"]),
            ("Quantum Information & Computing", ["quantum", "qubit", "superconducting", "entanglement", "quantum key"]),
            ("Agriculture & Food Technology", ["agri", "crop", "fertilizer", "soil", "farming", "irrigation", "sustainable agriculture"]),
            ("Cybersecurity & Networking", ["security", "cyber", "cryptography", "encryption", "firewall", "blockchain", "privacy"]),
        ]
        for dom_name, keywords in domain_patterns:
            if any(kw in text_lower for kw in keywords):
                domain = dom_name
                break

        # Extract technology candidates
        tech_vocab = [
            "3D Visualization", "Computer Vision", "Convolutional Neural Networks", "Magnetic Resonance Imaging (MRI)",
            "Automated Segmentation", "Deep Learning", "Generative AI", "Predictive Analytics", "Cloud Computing",
            "Internet of Things (IoT)", "Natural Language Processing", "Edge Computing", "Bioinformatics Pipelines",
            "CRISPR-Cas9", "Next-Gen Sequencing", "Photovoltaic Inverters", "Green Hydrogen Catalysis",
            "Microcontroller Systems", "Reinforcement Learning", "Graph Neural Networks", "Solid-State Batteries"
        ]
        technologies = []
        for tech in tech_vocab:
            t_words = [w.lower() for w in tech.split() if len(w) > 2]
            if any(w in text_lower for w in t_words):
                technologies.append(tech)

        if not technologies:
            raw_words = re.findall(r"\b[a-zA-Z]{4,20}\b", idea_text)
            technologies = [f"{raw_words[i]} {raw_words[i+1]}".title() for i in range(min(3, len(raw_words)-1))]

        # Extract research areas
        research_areas = []
        if "health" in text_lower or "medical" in text_lower or "mri" in text_lower or "tumor" in text_lower:
            research_areas.extend(["Medical Image Computing", "Computer Assisted Diagnostics", "Clinical Health Informatics"])
        if "ai" in text_lower or "learning" in text_lower or "vision" in text_lower:
            research_areas.extend(["Applied Machine Learning", "Computer Vision & Pattern Recognition"])
        if "energy" in text_lower or "solar" in text_lower or "battery" in text_lower:
            research_areas.extend(["Clean Energy Technologies", "Energy Storage Materials"])
        if not research_areas:
            research_areas = ["Applied Computer Science", "Engineering & Systems Innovation"]

        # Extract keywords
        stop_words = {"this", "that", "with", "from", "using", "uses", "provides", "system", "startup", "idea", "project", "doctors", "patient", "detect"}
        words = re.findall(r"\b[a-zA-Z]{3,20}\b", idea_text)
        filtered_words = [w.capitalize() for w in words if w.lower() not in stop_words and len(w) > 3]
        unique_kws = list(dict.fromkeys(filtered_words))[:6]

        # Applications
        applications = []
        if "detect" in text_lower or "diagnos" in text_lower:
            applications.append("Early Disease Detection & Screening")
        if "doctor" in text_lower or "hospital" in text_lower or "clinic" in text_lower:
            applications.append("Clinical Decision Support for Radiologists & Physicians")
        if "3d" in text_lower or "visual" in text_lower:
            applications.append("Surgical Planning & Interactive 3D Anatomy Mapping")
        if not applications:
            applications.append("Industrial & Commercial Automation")

        categories = ["Research & Innovation Grant", "Seed & Translational Grant", "Mission Innovation Call"]
        summary = f"Innovation initiative focused on {', '.join(technologies[:2]) or domain} aimed at {applications[0].lower() if applications else 'advancing commercial applications'}."

        return {
            "idea_summary": summary,
            "domain": domain,
            "research_areas": research_areas[:4],
            "technologies": technologies[:5],
            "keywords": unique_kws,
            "application_areas": applications[:3],
            "potential_funding_categories": categories,
        }

    def generate_synthesis_and_risks(
        self,
        idea_text: str,
        research_overlap_score: float,
        patent_overlap_score: float,
        top_funding_count: int,
    ) -> dict[str, list[str]]:
        """
        Generate potential issues/risks, improvement suggestions, and recommended next steps.
        Clearly attributes them as AI guidance assessments.
        """
        potential_risks = []
        improvement_suggestions = []
        next_steps = []

        # Research & Patent prior art risks
        if patent_overlap_score >= 0.70:
            potential_risks.append("High patent prior art overlap identified: closely matching commercial patents already exist in this domain.")
            improvement_suggestions.append("Conduct a comprehensive Freedom-to-Operate (FTO) patent analysis to distinguish your technical novelties.")
        elif patent_overlap_score >= 0.40:
            potential_risks.append("Moderate patent landscape activity: existing patents protect related methods or system architectures.")

        if research_overlap_score >= 0.75:
            potential_risks.append("Substantial academic literature exists: reviewers may scrutinize the distinct methodological advance over current published benchmarks.")
            improvement_suggestions.append("Highlight specific empirical advances, proprietary datasets, or real-world clinical validation in your proposal.")

        if top_funding_count == 0:
            potential_risks.append("Limited active funding calls found matching exact keywords; broad translational calls may be required.")
            next_steps.append("Expand proposal keywords to align with broader agency focus areas (e.g., BIRAC BIG, MeitY TIDE, DST Seed).")
        else:
            next_steps.append(f"Target the top {min(3, top_funding_count)} matched funding opportunities before upcoming agency deadlines.")

        potential_risks.append("Eligibility constraints: early-stage ventures often require formal incubation, registered entity status (DPIIT/SBIR), or academic co-investigators.")
        improvement_suggestions.append("Secure formal letters of support or MOUs with clinical partners or prospective end-users to demonstrate commercial pull.")
        next_steps.append("Prepare a structured technical milestone timeline with clear quantifiable deliverables (TRL 3 to TRL 6).")
        next_steps.append("File a provisional patent application or copyright for software architectures before public grant disclosures.")

        return {
            "potential_risks": potential_risks,
            "improvement_suggestions": improvement_suggestions,
            "recommended_next_steps": next_steps,
        }


grok_service = GrokService()
