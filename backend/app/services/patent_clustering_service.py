from datetime import datetime, timezone
import logging
from typing import Any
from uuid import UUID

from fastapi import HTTPException
import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.patent import Patent
from backend.app.schemas.patent import (
    ClusterItem,
    ClusterPatentPoint,
    ClusterRepresentativePatent,
    PatentClusterResponse,
    SimilarPatentItem,
    SimilarPatentsResponse,
)
from backend.app.services.patent_embedding_service import (
    build_patent_text,
    patent_embedding_service,
)

logger = logging.getLogger(__name__)


class PatentClusteringService:
    """
    Service handling semantic similarity calculations, AI/ML-based patent clustering,
    automatic cluster labeling, quality scoring, and 2D visualization projections.
    """

    def find_similar_patents(
        self,
        db: Session,
        source_patent_id: UUID,
        top_k: int = 5,
    ) -> SimilarPatentsResponse:
        """
        Find patents semantically similar to the specified source patent.
        Calculates real cosine similarity from sentence embeddings.
        """
        # 1. Fetch source patent
        source_patent = db.get(Patent, source_patent_id)
        if not source_patent:
            raise HTTPException(
                status_code=404,
                detail=f"Patent with ID {source_patent_id} not found",
            )

        source_text = build_patent_text(source_patent)
        if not source_text:
            raise HTTPException(
                status_code=422,
                detail="Source patent has insufficient text content for similarity calculation",
            )

        # 2. Fetch candidate patents (excluding the source patent)
        candidates_stmt = (
            select(Patent)
            .where(Patent.id != source_patent_id)
            .limit(500)
        )
        candidates = list(db.scalars(candidates_stmt).all())

        if not candidates:
            return SimilarPatentsResponse(
                source_patent_id=source_patent.id,
                source_patent_title=source_patent.title,
                total_compared=0,
                similar_patents=[],
            )

        # 3. Generate embeddings
        source_vec = patent_embedding_service.generate_patent_embedding(source_patent)
        candidate_embeddings = patent_embedding_service.generate_patent_embeddings(candidates)

        # 4. Compute cosine similarity for all candidates
        # Both vectors are L2-normalized, so dot product is exact cosine similarity
        similarities = np.dot(candidate_embeddings, source_vec)

        # 5. Rank candidate patents descending
        ranked_indices = np.argsort(similarities)[::-1]

        # 6. Build top_k similar patent items
        top_indices = ranked_indices[:top_k]
        similar_items: list[SimilarPatentItem] = []

        for idx in top_indices:
            cand = candidates[idx]
            score = float(similarities[idx])
            # Normalize between 0 and 1
            clamped_score = max(0.0, min(1.0, score))
            cand_text = build_patent_text(cand)
            shared_terms = patent_embedding_service.extract_shared_terms(source_text, cand_text)

            similar_items.append(
                SimilarPatentItem(
                    patent_id=cand.id,
                    publication_number=cand.publication_number,
                    title=cand.title,
                    assignee=cand.assignee,
                    technology_domain=cand.technology_domain,
                    similarity_score=round(clamped_score, 4),
                    similarity_percentage=round(clamped_score * 100.0, 1),
                    shared_terms=shared_terms,
                    official_link=cand.official_link,
                )
            )

        return SimilarPatentsResponse(
            source_patent_id=source_patent.id,
            source_patent_title=source_patent.title,
            total_compared=len(candidates),
            similar_patents=similar_items,
        )

    def cluster_patents(
        self,
        db: Session,
        n_clusters: int | None = None,
        max_patents: int = 500,
    ) -> PatentClusterResponse:
        """
        Execute AI/ML clustering on real patent records using sentence embeddings,
        TF-IDF automatic label generation, silhouette quality metric, and PCA 2D coordinates.
        """
        # 1. Fetch patents
        stmt = select(Patent).limit(max_patents)
        patents = list(db.scalars(stmt).all())
        total_patents = len(patents)

        if total_patents < 2:
            raise HTTPException(
                status_code=400,
                detail=f"At least 2 patent records are required for clustering. Currently available: {total_patents}.",
            )

        # 2. Determine optimal k (number of clusters)
        if n_clusters is not None:
            if n_clusters < 2:
                raise HTTPException(status_code=400, detail="Number of clusters must be at least 2.")
            if n_clusters > total_patents:
                k = total_patents
            else:
                k = n_clusters
        else:
            # Dynamic heuristic based on dataset size
            if total_patents <= 3:
                k = 2
            elif total_patents <= 10:
                k = 3
            elif total_patents <= 25:
                k = 4
            elif total_patents <= 60:
                k = 6
            else:
                k = 8

        k = min(k, total_patents)

        # 3. Generate embeddings
        embeddings = patent_embedding_service.generate_patent_embeddings(patents)

        # 4. Run KMeans clustering
        kmeans = KMeans(
            n_clusters=k,
            random_state=42,
            n_init=10,
        )
        labels = kmeans.fit_predict(embeddings)
        centroids = kmeans.cluster_centers_

        # 5. Compute Silhouette Score if k < total_patents and unique clusters > 1
        unique_labels = set(labels)
        silhouette: float | None = None
        if len(unique_labels) > 1 and total_patents > k:
            try:
                raw_sil = silhouette_score(embeddings, labels, metric="cosine")
                silhouette = round(float(raw_sil), 3)
            except Exception as exc:
                logger.warning("Could not calculate silhouette score: %s", exc)

        # 6. Compute 2D PCA projection for interactive scatter visualization
        pca = PCA(n_components=2, random_state=42)
        coords_2d = pca.fit_transform(embeddings)

        # Normalize 2D coordinates to [5, 95] range for smooth SVG rendering
        min_x, max_x = float(coords_2d[:, 0].min()), float(coords_2d[:, 0].max())
        min_y, max_y = float(coords_2d[:, 1].min()), float(coords_2d[:, 1].max())

        span_x = (max_x - min_x) if max_x != min_x else 1.0
        span_y = (max_y - min_y) if max_y != min_y else 1.0

        viz_points: list[ClusterPatentPoint] = []
        for i, patent in enumerate(patents):
            norm_x = round(5.0 + 90.0 * ((coords_2d[i, 0] - min_x) / span_x), 2)
            norm_y = round(5.0 + 90.0 * ((coords_2d[i, 1] - min_y) / span_y), 2)
            viz_points.append(
                ClusterPatentPoint(
                    patent_id=patent.id,
                    publication_number=patent.publication_number,
                    title=patent.title,
                    assignee=patent.assignee,
                    technology_domain=patent.technology_domain,
                    cluster_id=int(labels[i]),
                    x=norm_x,
                    y=norm_y,
                )
            )

        # 7. Extract cluster metadata, labels, and representative patents
        clusters_list: list[ClusterItem] = []

        for c_id in range(k):
            cluster_indices = [idx for idx, lbl in enumerate(labels) if lbl == c_id]
            cluster_count = len(cluster_indices)

            if cluster_count == 0:
                continue

            cluster_patents = [patents[idx] for idx in cluster_indices]
            cluster_embeddings = embeddings[cluster_indices]
            centroid = centroids[c_id]

            # Generate top terms via TF-IDF on cluster texts
            cluster_texts = [build_patent_text(p) for p in cluster_patents]
            top_terms, synthesized_label = self._generate_cluster_label_and_terms(
                cluster_texts,
                cluster_patents,
                c_id,
            )

            # Representative patents: sort by proximity/similarity to cluster centroid
            centroid_norm = centroid / (np.linalg.norm(centroid) + 1e-9)
            centralities = np.dot(cluster_embeddings, centroid_norm)
            sorted_rep_indices = np.argsort(centralities)[::-1]

            rep_patents: list[ClusterRepresentativePatent] = []
            for rep_idx in sorted_rep_indices[:3]:
                cand = cluster_patents[rep_idx]
                rep_patents.append(
                    ClusterRepresentativePatent(
                        patent_id=cand.id,
                        publication_number=cand.publication_number,
                        title=cand.title,
                        assignee=cand.assignee,
                        technology_domain=cand.technology_domain,
                        centrality_score=round(float(centralities[rep_idx]), 3),
                    )
                )

            percentage = round((cluster_count / total_patents) * 100.0, 1)

            clusters_list.append(
                ClusterItem(
                    cluster_id=c_id,
                    label=synthesized_label,
                    patent_count=cluster_count,
                    percentage=percentage,
                    top_terms=top_terms,
                    representative_patents=rep_patents,
                )
            )

        # Sort clusters by size descending
        clusters_list.sort(key=lambda c: c.patent_count, reverse=True)

        return PatentClusterResponse(
            total_patents=total_patents,
            number_of_clusters=len(clusters_list),
            silhouette_score=silhouette,
            embedding_model=patent_embedding_service.model_name,
            clustering_algorithm="KMeans with TF-IDF Term Extraction",
            generated_at=datetime.now(timezone.utc),
            clusters=clusters_list,
            visualization_points=viz_points,
        )

    def _generate_cluster_label_and_terms(
        self,
        cluster_texts: list[str],
        cluster_patents: list[Patent],
        cluster_id: int,
    ) -> tuple[list[str], str]:
        """
        Extract descriptive terms using TF-IDF n-grams and generate a human-interpretable label.
        """
        top_terms: list[str] = []
        try:
            vectorizer = TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 2),
                max_features=25,
                min_df=1,
            )
            tfidf_mat = vectorizer.fit_transform(cluster_texts)
            feature_names = vectorizer.get_feature_names_out()
            scores = np.asarray(tfidf_mat.sum(axis=0)).flatten()

            sorted_term_indices = np.argsort(scores)[::-1]
            extracted = [
                feature_names[i].title()
                for i in sorted_term_indices
                if len(feature_names[i]) > 3
            ]
            # De-duplicate terms while maintaining order
            seen = set()
            for t in extracted:
                if t.lower() not in seen:
                    seen.add(t.lower())
                    top_terms.append(t)
                if len(top_terms) >= 5:
                    break
        except Exception as exc:
            logger.debug("TF-IDF extraction fallback for cluster %d: %s", cluster_id, exc)

        # Collect technology domains present in cluster
        domains = [p.technology_domain for p in cluster_patents if p.technology_domain]

        if top_terms:
            # Construct a natural label e.g., "Medical Imaging & Diagnostic Systems"
            if len(top_terms) >= 2:
                synthesized_label = f"{top_terms[0]} & {top_terms[1]}"
            else:
                synthesized_label = top_terms[0]
        elif domains:
            synthesized_label = domains[0].title()
        else:
            synthesized_label = f"Technology Cluster {cluster_id + 1}"

        return top_terms, synthesized_label


patent_clustering_service = PatentClusteringService()
