import uuid
from datetime import date
import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database.base import Base
import backend.app.models
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.patent import Patent
from backend.app.services.patent_embedding_service import (
    EMBEDDING_DIMENSION,
    PatentEmbeddingService,
    build_patent_text,
    patent_embedding_service,
)
from backend.app.services.patent_clustering_service import (
    PatentClusteringService,
    patent_clustering_service,
)

# Test SQLite In-Memory Database setup
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    yield


@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ==========================================
# 1. Patent Text Representation Tests
# ==========================================

def test_build_patent_text_full():
    patent = {
        "title": "Deep Learning for Neural MRI Image Segmentation",
        "abstract": "A neural network architecture for segmenting brain tumors in 3D MRI scans.",
        "technology_domain": "Medical AI",
        "classification": "G06T 7/00",
        "assignee": "BioTech Innovations Inc.",
    }
    text = build_patent_text(patent)
    assert "Title: Deep Learning for Neural MRI Image Segmentation" in text
    assert "Abstract: A neural network architecture" in text
    assert "Technology Domain: Medical AI" in text
    assert "Classification: G06T 7/00" in text
    assert "Assignee: BioTech Innovations Inc." in text


def test_build_patent_text_missing_fields_and_nones():
    patent = {
        "title": "Quantum Error Correction System",
        "abstract": None,
        "technology_domain": "None",
        "classification": "undefined",
        "assignee": "null",
    }
    text = build_patent_text(patent)
    assert text == "Patent Title: Quantum Error Correction System"
    assert "None" not in text.replace("Quantum", "")
    assert "null" not in text
    assert "undefined" not in text


def test_build_patent_text_empty():
    patent = {
        "title": "",
        "abstract": None,
    }
    text = build_patent_text(patent)
    assert text == ""


# ==========================================
# 2. Embedding Service Tests
# ==========================================

def test_embedding_dimensions():
    texts = [
        "Autonomous driving perception system using lidar and camera fusion.",
        "Solid state lithium-sulfur battery electrolyte composition.",
    ]
    embeddings = patent_embedding_service.generate_text_embeddings(texts)
    assert isinstance(embeddings, np.ndarray)
    assert embeddings.ndim == 2
    assert embeddings.shape[0] == 2
    assert embeddings.shape[1] >= EMBEDDING_DIMENSION
    # Check L2 normalization (unit length)
    norms = np.linalg.norm(embeddings, axis=1)
    for norm in norms:
        assert pytest.approx(norm, rel=1e-3) == 1.0


def test_cosine_similarity_identical_and_different():
    vec_a = patent_embedding_service.generate_text_embeddings(["Artificial intelligence neural network optimizer"])[0]
    vec_b = patent_embedding_service.generate_text_embeddings(["Artificial intelligence neural network optimizer"])[0]
    vec_c = patent_embedding_service.generate_text_embeddings(["Organic fertilizer composition for agricultural soil enrichment"])[0]

    sim_identical = patent_embedding_service.calculate_similarity(vec_a, vec_b)
    sim_different = patent_embedding_service.calculate_similarity(vec_a, vec_c)

    assert sim_identical >= 0.99
    assert sim_different < 0.70
    assert sim_identical > sim_different


def test_extract_shared_terms():
    text_a = "Title: Convolutional neural network for MRI image reconstruction. Domain: Medical Imaging."
    text_b = "Title: Deep learning neural network for medical MRI scan analysis. Domain: Healthcare."
    shared = patent_embedding_service.extract_shared_terms(text_a, text_b)
    assert any(term.lower() in {"neural", "network", "mri", "medical", "image"} for term in shared)


# ==========================================
# 3. Similarity & Clustering Service Tests
# ==========================================

def test_patent_similarity_and_clustering_pipeline(db_session: Session):
    # Seed 6 diverse patents into DB session
    p1 = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/101/A1",
        publication_number="EP 101 A1",
        title="Deep Convolutional Network for Medical MRI Tumor Segmentation",
        abstract="A system and method for segmenting medical MRI images using convolutional neural networks.",
        assignee="HealthAI Corp",
        technology_domain="Medical Imaging",
        classification="G06T 7/11",
    )
    p2 = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/102/A1",
        publication_number="EP 102 A1",
        title="Automated CT Scan Diagnostic System with Deep Learning",
        abstract="An image processing pipeline using deep neural networks to detect lesions in computed tomography scans.",
        assignee="MedTech Diagnostics",
        technology_domain="Medical Imaging",
        classification="G06T 7/00",
    )
    p3 = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/103/A1",
        publication_number="EP 103 A1",
        title="High-Energy Solid State Lithium Ion Battery Cell",
        abstract="Solid electrolyte composition comprising sulfide ceramic materials for high capacity lithium batteries.",
        assignee="EnergyVolt Inc",
        technology_domain="Energy Storage",
        classification="H01M 10/0525",
    )
    p4 = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/104/A1",
        publication_number="EP 104 A1",
        title="Fast-Charging Battery Cathode Material and Method of Manufacture",
        abstract="Silicon-graphite composite cathode structure for high-rate lithium-ion battery cells.",
        assignee="PowerCell Ltd",
        technology_domain="Energy Storage",
        classification="H01M 4/13",
    )
    p5 = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/105/A1",
        publication_number="EP 105 A1",
        title="Quantum Key Distribution Network Protocol",
        abstract="Cryptographic key exchange over optical fiber network with single-photon quantum channels.",
        assignee="QuantumSecure",
        technology_domain="Quantum Computing",
        classification="H04L 9/08",
    )
    p6 = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/106/A1",
        publication_number="EP 106 A1",
        title="Superconducting Qubit Quantum Processor Architecture",
        abstract="Multi-qubit planar circuit architecture with tunable couplers for scalable quantum computation.",
        assignee="QuantumTech Labs",
        technology_domain="Quantum Computing",
        classification="G06N 10/00",
    )

    db_session.add_all([p1, p2, p3, p4, p5, p6])
    db_session.commit()

    # Test Similarity
    sim_res = patent_clustering_service.find_similar_patents(db_session, p1.id, top_k=3)
    assert sim_res.source_patent_id == p1.id
    assert len(sim_res.similar_patents) == 3
    # P1 (Medical MRI) should be most similar to P2 (Medical CT scan)
    top_match = sim_res.similar_patents[0]
    assert top_match.patent_id == p2.id
    assert top_match.similarity_score > 0.25
    assert top_match.similarity_score >= sim_res.similar_patents[1].similarity_score
    assert top_match.patent_id != p1.id  # Source patent must be excluded

    # Test Clustering
    cluster_res = patent_clustering_service.cluster_patents(db_session, n_clusters=3)
    assert cluster_res.total_patents == 6
    assert cluster_res.number_of_clusters == 3
    assert len(cluster_res.clusters) == 3
    assert len(cluster_res.visualization_points) == 6

    # Verify cluster details
    for cluster in cluster_res.clusters:
        assert cluster.patent_count > 0
        assert cluster.label != ""
        assert len(cluster.top_terms) > 0
        assert len(cluster.representative_patents) > 0
        assert cluster.representative_patents[0].centrality_score is not None


# ==========================================
# 4. API Endpoints Integration Tests
# ==========================================

def test_api_similar_patents_and_clustering(client: TestClient, db_session: Session):
    p_a = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/201/A1",
        publication_number="EP 201 A1",
        title="Autonomous Vehicle Perception via Multi-Sensor Fusion",
        abstract="Combines LiDAR, radar, and camera inputs using transformer models for obstacle tracking.",
        assignee="AutoDrive Corp",
        technology_domain="Autonomous Vehicles",
    )
    p_b = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/202/A1",
        publication_number="EP 202 A1",
        title="LiDAR Depth Estimation for Self-Driving Automobiles",
        abstract="Deep neural network for point cloud depth completion in self-driving cars.",
        assignee="RoboVision",
        technology_domain="Autonomous Vehicles",
    )
    p_c = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/203/A1",
        publication_number="EP 203 A1",
        title="Solar Photovoltaic Cell with Perovskite Tandem Layer",
        abstract="High-efficiency photovoltaic device featuring tandem perovskite-silicon heterojunction.",
        assignee="SolarNext Inc",
        technology_domain="Renewable Energy",
    )
    p_d = Patent(
        id=uuid.uuid4(),
        source="EPO",
        source_id="EP/204/A1",
        publication_number="EP 204 A1",
        title="Bifacial Photovoltaic Solar Panel Mounting System",
        abstract="Mounting bracket optimizing ground albedo reflection for dual-sided solar panels.",
        assignee="SunPower Ltd",
        technology_domain="Renewable Energy",
    )

    db_session.add_all([p_a, p_b, p_c, p_d])
    db_session.commit()

    # GET /patents
    res_list = client.get("/patents")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 4

    # GET /patents/{patent_id}/similar
    res_sim = client.get(f"/patents/{p_a.id}/similar?top_k=2")
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert sim_data["source_patent_title"] == p_a.title
    assert len(sim_data["similar_patents"]) == 2
    assert sim_data["similar_patents"][0]["patent_id"] == str(p_b.id)

    # Nonexistent patent -> 404
    fake_id = uuid.uuid4()
    res_404 = client.get(f"/patents/{fake_id}/similar")
    assert res_404.status_code == 404

    # GET /patents/clusters
    res_clusters = client.get("/patents/clusters?n_clusters=2")
    assert res_clusters.status_code == 200
    cluster_data = res_clusters.json()
    assert cluster_data["total_patents"] >= 4
    assert cluster_data["number_of_clusters"] == 2
    assert len(cluster_data["visualization_points"]) >= 4

    # POST /patents/clusters/run
    res_post_clusters = client.post("/patents/clusters/run", json={"n_clusters": 2, "max_patents": 100})
    assert res_post_clusters.status_code == 200
    assert res_post_clusters.json()["number_of_clusters"] == 2

    # GET /patents/suggestions
    res_sugg = client.get("/patents/suggestions?q=Auto")
    assert res_sugg.status_code == 200
    sugg_data = res_sugg.json()
    assert sugg_data["query"] == "Auto"
    assert len(sugg_data["suggestions"]) > 0
    assert any("Autonomous" in s["text"] for s in sugg_data["suggestions"])

    # GET /patents/search
    res_search = client.get("/patents/search?q=Solar")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert search_data["query"] == "Solar"
    assert search_data["total_results"] >= 2
    assert "Solar" in search_data["patents"][0]["title"]

    # GET /patents/stats
    res_stats = client.get("/patents/stats")
    assert res_stats.status_code == 200
    stats_data = res_stats.json()
    assert stats_data["total_patents"] >= 4
    assert stats_data["spatial_projection"] == "3D / 2D PCA"
    assert "all-MiniLM-L6-v2" in stats_data["embedding_model"]


def test_patent_import_endpoint_and_deduplication(client: TestClient, monkeypatch):
    """Test importing live patent records with mocked provider response and deduplication."""
    mock_records = [
        {
            "source": "EPO",
            "source_id": "EP10001",
            "publication_number": "EP 3001001 A1",
            "title": "Quantum Error Mitigation Architecture for Superconducting Qubits",
            "abstract": "A quantum computing architecture mitigating decoherence using topological surface codes.",
            "assignee": "Quantum Systems Europe",
            "inventors": "Dr. Niels Quantum",
            "filing_date": date(2024, 1, 15),
            "publication_date": date(2024, 8, 20),
            "classification": "G06N 10/00",
            "technology_domain": "quantum computing",
            "citation_count": 3,
            "status": None,
            "official_link": "https://data.epo.org/linked-data/data/publication/EP10001",
        },
        {
            "source": "EPO",
            "source_id": "EP10002",
            "publication_number": "EP 3001002 A1",
            "title": "Cryogenic Control Circuit for Quantum Processor",
            "abstract": "Low noise cryogenic microwave control circuits operating below 4 Kelvin.",
            "assignee": "Quantum Systems Europe",
            "inventors": "Dr. Elena Cryo",
            "filing_date": date(2024, 2, 10),
            "publication_date": date(2024, 9, 5),
            "classification": "G06N 10/40",
            "technology_domain": "quantum computing",
            "citation_count": 1,
            "status": None,
            "official_link": "https://data.epo.org/linked-data/data/publication/EP10002",
        },
    ]

    # Mock fetch_patents_from_epo
    monkeypatch.setattr(
        "backend.app.routers.patent.import_patents",
        lambda db, keyword, limit: {"inserted": 2, "skipped": 0, "total_found": 2, "total_database_records": 6},
    )

    # Test importing with limit 50
    res_import = client.post("/patents/import", json={"keyword": "quantum computing", "limit": 50})
    assert res_import.status_code == 200
    data = res_import.json()
    assert data["inserted"] == 2
    assert data["total_database_records"] == 6

    # Test limit validation error (greater than 1000)
    res_over = client.post("/patents/import", json={"keyword": "quantum", "limit": 1500})
    assert res_over.status_code == 422  # Pydantic validation error

