from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PatentBase(BaseModel):
    source: str
    source_id: str
    publication_number: str
    title: str
    abstract: str | None = None
    assignee: str | None = None
    inventors: str | None = None
    filing_date: date | None = None
    publication_date: date | None = None
    classification: str | None = None
    technology_domain: str | None = None
    citation_count: int = 0
    status: str | None = None
    official_link: str | None = None


class PatentCreate(PatentBase):
    pass


class PatentResponse(PatentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatentImportRequest(BaseModel):
    keyword: str
    limit: int = 5


class SimilarPatentItem(BaseModel):
    patent_id: UUID
    publication_number: str
    title: str
    assignee: str | None = None
    technology_domain: str | None = None
    similarity_score: float
    similarity_percentage: float
    shared_terms: list[str] = []
    official_link: str | None = None


class SimilarPatentsResponse(BaseModel):
    source_patent_id: UUID
    source_patent_title: str
    total_compared: int
    similar_patents: list[SimilarPatentItem]


class ClusterRepresentativePatent(BaseModel):
    patent_id: UUID
    publication_number: str
    title: str
    assignee: str | None = None
    technology_domain: str | None = None
    centrality_score: float


class ClusterPatentPoint(BaseModel):
    patent_id: UUID
    publication_number: str
    title: str
    assignee: str | None = None
    technology_domain: str | None = None
    cluster_id: int
    x: float
    y: float


class ClusterItem(BaseModel):
    cluster_id: int
    label: str
    patent_count: int
    percentage: float
    top_terms: list[str] = []
    representative_patents: list[ClusterRepresentativePatent] = []


class PatentClusterResponse(BaseModel):
    total_patents: int
    number_of_clusters: int
    silhouette_score: float | None = None
    embedding_model: str
    clustering_algorithm: str
    generated_at: datetime
    clusters: list[ClusterItem]
    visualization_points: list[ClusterPatentPoint] = []


class ClusteringRunRequest(BaseModel):
    n_clusters: int | None = Field(default=None, ge=2, le=20)
    max_patents: int = Field(default=500, ge=4, le=2000)