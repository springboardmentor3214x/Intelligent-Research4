import pytest
from backend.app.database.connection import SessionLocal
from backend.app.services.sources.base_source import RawEvidenceRecord, SourceType, MatchingMethod
from backend.app.services.sources.deduplication import deduplicate_evidence_records
from backend.app.services.sources.source_registry import source_registry
from backend.app.services.technology_analysis_service import analyze_technology_intelligence


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_source_registry_initialization():
    status_reports = source_registry.get_status_reports()
    assert len(status_reports) >= 8
    source_names = [s.source_name for s in status_reports]
    assert "OpenAlex" in source_names
    assert "Crossref" in source_names
    assert "OpenAIRE" in source_names
    assert "PubMed" in source_names
    assert "PatentsView" in source_names
    assert "EPO OPS" in source_names
    assert "NIH RePORTER" in source_names
    assert "CORDIS" in source_names


def test_deduplication_exact_doi_and_title():
    r1 = RawEvidenceRecord(
        id="rec_1",
        source="OpenAlex",
        source_record_id="W123",
        source_type=SourceType.RESEARCH,
        title="Deep Learning in Medical Imaging for Cancer Detection",
        doi="10.1016/j.media.2023.1001",
        year=2023,
    )
    r2 = RawEvidenceRecord(
        id="rec_2",
        source="Crossref",
        source_record_id="CR456",
        source_type=SourceType.RESEARCH,
        title="Deep Learning in Medical Imaging for Cancer Detection",
        doi="10.1016/j.media.2023.1001",
        year=2023,
    )
    r3 = RawEvidenceRecord(
        id="rec_3",
        source="PubMed",
        source_record_id="PMID999",
        source_type=SourceType.RESEARCH,
        title="Novel MRI Segmentation Technique",
        doi="10.1016/j.media.2023.9999",
        year=2024,
    )

    dedup = deduplicate_evidence_records([r1, r2, r3])
    assert dedup.total_raw_count == 3
    assert dedup.unique_count == 2
    assert dedup.duplicates_removed == 1
    assert dedup.source_counts["OpenAlex"] == 1
    assert dedup.source_counts["Crossref"] == 1
    assert dedup.source_counts["PubMed"] == 1


def test_deduplication_patents():
    p1 = RawEvidenceRecord(
        id="pat_1",
        source="PatentsView",
        source_record_id="11223344",
        source_type=SourceType.PATENT,
        title="Medical image processing apparatus using neural networks",
        patent_number="US11223344",
        year=2022,
    )
    p2 = RawEvidenceRecord(
        id="pat_2",
        source="EPO OPS",
        source_record_id="EP11223344",
        source_type=SourceType.PATENT,
        title="Medical image processing apparatus using neural networks",
        patent_number="US11223344",
        year=2022,
    )

    dedup = deduplicate_evidence_records([p1, p2])
    assert dedup.total_raw_count == 2
    assert dedup.unique_count == 1
    assert dedup.duplicates_removed == 1


def test_multi_source_analysis_medical_imaging_ai(db):
    analysis = analyze_technology_intelligence(db, "Medical Imaging AI")
    assert analysis.technology == "Medical Imaging AI"
    assert len(analysis.yearly_evidence) >= 2
    assert analysis.coverage.unique_research_count >= 1
    assert analysis.coverage.unique_patent_count >= 1

    # Verify 6 indicators and exact weights
    indicators = analysis.indicators
    assert round(indicators["research_growth"].weight, 2) == 0.25
    assert round(indicators["patent_growth"].weight, 2) == 0.25
    assert round(indicators["research_activity"].weight, 2) == 0.15
    assert round(indicators["patent_activity"].weight, 2) == 0.15
    assert round(indicators["organization_participation"].weight, 2) == 0.10
    assert round(indicators["application_diversity"].weight, 2) == 0.10

    total_weight = sum(i.weight for i in indicators.values())
    assert round(total_weight, 2) == 1.0

    # Verify Adoption is independent
    assert analysis.adoption.level in ["High", "Moderate", "Low", "Insufficient Evidence"]
    assert "adoption" not in indicators


def test_multi_source_analysis_quantum_computing(db):
    analysis = analyze_technology_intelligence(db, "Quantum Computing")
    assert analysis.technology == "Quantum Computing"
    assert analysis.stage.classification in ["Emerging", "Developing", "Mature", "Declining"]
    assert analysis.weighted_score.total >= 0.0


def test_multi_source_analysis_clean_energy(db):
    analysis = analyze_technology_intelligence(db, "Clean Energy")
    assert analysis.technology == "Clean Energy"
    assert analysis.stage.classification in ["Emerging", "Developing", "Mature", "Declining"]


def test_multi_source_analysis_cybersecurity(db):
    analysis = analyze_technology_intelligence(db, "Cybersecurity")
    assert analysis.technology == "Cybersecurity"
    assert analysis.stage.classification in ["Emerging", "Developing", "Mature", "Declining"]
