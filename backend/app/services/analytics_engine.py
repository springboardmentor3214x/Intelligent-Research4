from typing import List, Dict
from backend.app.schemas import intelligence as schemas

class AnalyticsEngine:
    @staticmethod
    def calculate_growth_rate(timeline: List[dict]) -> float:
        """Computes basic percentage change metric across chronological timeline parameters."""
        if len(timeline) < 2:
            return 0.0
        sorted_timeline = sorted(timeline, key=lambda x: x["year"])
        first_val = sorted_timeline[0]["count"]
        last_val = sorted_timeline[-1]["count"]
        
        if first_val == 0:
            return float(last_val * 100)
        return float(round(((last_val - first_val) / first_val) * 100, 2))

    @staticmethod
    def identify_semantic_gaps(limitations_list: List[str]) -> List[dict]:
        """
        Parses text limitations across multiple records.
        Groups them to highlight research openings dynamically.
        """
        # Rule-based processing logic for text evaluation
        gap_matrix = [
            {
                "id": 1,
                "gap_title": "Scalability limitations in real-world clinical deployment",
                "frequency_count": sum(1 for text in limitations_list if any(w in text.lower() for w in ["scale", "clinical", "real-world"])),
                "impact_level": "High",
                "suggested_pathway": "Focus on high-throughput compression models and distributed clinical trials."
            },
            {
                "id": 2,
                "gap_title": "Lack of interpretability and white-box explainability criteria",
                "frequency_count": sum(1 for text in limitations_list if any(w in text.lower() for w in ["explain", "interpret", "black-box"])),
                "impact_level": "High",
                "suggested_pathway": "Develop layer-wise relevance propagation architectures explicitly for transparency."
            }
        ]
        
        # Filter out gaps that haven't been detected in any paper text samples
        return [gap for gap in gap_matrix if gap["frequency_count"] > 0]
