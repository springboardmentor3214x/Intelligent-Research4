from typing import List

def get_dashboard_data():
    return {
        "summary": {
            "emerging_technologies": 12,
            "innovation_opportunities": 8,
            "active_competitors": 24,
            "funding_projects": 15
        },

        "adoption_trend": [
            {"year":2021,"count":15},
            {"year":2022,"count":28},
            {"year":2023,"count":45},
            {"year":2024,"count":67},
            {"year":2025,"count":92}
        ],

        "technology_stage_distribution":[
            {"stage":"Emerging","value":4},
            {"stage":"Developing","value":5},
            {"stage":"Mature","value":2},
            {"stage":"Declining","value":1}
        ],

        "commercial_viability":[
            {"technology":"Quantum AI","score":90},
            {"technology":"Edge AI","score":82},
            {"technology":"Green Hydrogen AI","score":76},
            {"technology":"Generative AI","score":95}
        ]
    }


def get_innovation_opportunities():

    opportunities = [
        {
            "technology":"Quantum AI",
            "domain":"Healthcare",
            "opportunity":"AI-driven Drug Discovery",
            "reason":"High research growth with low adoption.",
            "funding":"High",
            "commercial":"High"
        },

        {
            "technology":"Edge AI",
            "domain":"IoT",
            "opportunity":"Smart Manufacturing",
            "reason":"Growing patent activity and industrial adoption.",
            "funding":"Medium",
            "commercial":"High"
        },

        {
            "technology":"Green Hydrogen AI",
            "domain":"Energy",
            "opportunity":"Energy Optimization",
            "reason":"Government funding increasing rapidly.",
            "funding":"High",
            "commercial":"Medium"
        }
    ]

def commercial_viability(score, adoption):

    if score > 85 and adoption == "High":
        return "High Commercial Potential"

    elif score > 70:
        return "Medium Commercial Potential"

    else:
        return "Early Stage Commercial Potential"

    return opportunities