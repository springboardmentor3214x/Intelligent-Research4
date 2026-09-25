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
    LandscapeInsights,
    PatentClusterResponse,
    SimilarPatentItem,
    SimilarPatentsResponse,
)
from backend.app.services.patent_embedding_service import (
    build_patent_text,
    patent_embedding_service,
)

logger = logging.getLogger(__name__)


def detect_patent_country(patent: Patent) -> str:
    """Classify patent jurisdiction from publication number, source, and assignee metadata."""
    pub = (patent.publication_number or "").upper().strip()
    assignee = (patent.assignee or "").lower()

    if pub.startswith("IN") or "india" in assignee or "council of scientific and industrial research" in assignee:
        return "India"
    if pub.startswith("EP") or (patent.source or "").upper() == "EPO":
        return "European Patent Office (EPO)"
    if pub.startswith("US"):
        return "United States"
    if pub.startswith("WO"):
        return "WIPO (PCT)"
    if pub.startswith("GB"):
        return "United Kingdom"
    if pub.startswith("DE"):
        return "Germany"
    if pub.startswith("JP"):
        return "Japan"
    if pub.startswith("CN"):
        return "China"
    return "Global / International"


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
                    abstract=cand.abstract,
                    assignee=cand.assignee,
                    technology_domain=cand.technology_domain,
                    classification=cand.classification,
                    country=detect_patent_country(cand),
                    filing_date=cand.filing_date,
                    publication_date=cand.publication_date,
                    citation_count=cand.citation_count,
                    source=cand.source or "EPO",
                    similarity_score=round(clamped_score, 4),
                    similarity_percentage=round(clamped_score * 100.0, 1),
                    shared_terms=shared_terms,
                    official_link=cand.official_link,
                )
            )

        return SimilarPatentsResponse(
            source_patent_id=source_patent.id,
            source_patent_title=source_patent.title,
            source_patent_publication_number=source_patent.publication_number,
            source_patent_abstract=source_patent.abstract,
            source_patent_assignee=source_patent.assignee,
            source_patent_domain=source_patent.technology_domain,
            source_patent_country=detect_patent_country(source_patent),
            source_patent_filing_date=source_patent.filing_date,
            source_patent_classification=source_patent.classification,
            source_patent_official_link=source_patent.official_link,
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

        # 3. Generate high-dimensional semantic embeddings from real patent records
        embeddings = patent_embedding_service.generate_patent_embeddings(patents)

        # 4. Optimal K selection & clustering execution
        if n_clusters is not None:
            if n_clusters < 2:
                raise HTTPException(status_code=400, detail="Number of clusters must be at least 2.")
            k = min(n_clusters, total_patents)
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=20).fit(embeddings)
            labels = kmeans.labels_
            centroids = kmeans.cluster_centers_
            best_k = k
        else:
            # Evaluate multiple candidate K values (2 to min(6, total_patents - 1)) to maximize meaningful silhouette
            max_cand_k = min(6, total_patents - 1)
            best_k = 2
            best_score = -1.0
            best_kmeans = None

            for cand_k in range(2, max_cand_k + 1):
                km = KMeans(n_clusters=cand_k, random_state=42, n_init=15).fit(embeddings)
                unique_c = set(km.labels_)
                if len(unique_c) > 1:
                    score = float(silhouette_score(embeddings, km.labels_, metric="cosine"))
                    # Prefer higher score, with slight tie-breaker for more granular grouping if score is comparable
                    if score > best_score + 0.015:
                        best_score = score
                        best_k = cand_k
                        best_kmeans = km

            if best_kmeans is None:
                best_k = min(4, total_patents)
                best_kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=15).fit(embeddings)

            kmeans = best_kmeans
            labels = kmeans.labels_
            centroids = kmeans.cluster_centers_
            k = best_k

        # 5. Compute true high-dimensional Silhouette Score
        unique_labels = set(labels)
        silhouette: float | None = None
        if len(unique_labels) > 1 and total_patents > k:
            try:
                raw_sil = silhouette_score(embeddings, labels, metric="cosine")
                silhouette = round(float(raw_sil), 3)
            except Exception as exc:
                logger.warning("Could not calculate silhouette score: %s", exc)

        # 6. Compute 2D and 3D PCA projections for interactive 2D & 3D visualizations
        n_pca_components = min(3, total_patents, embeddings.shape[1])
        pca = PCA(n_components=n_pca_components, random_state=42)
        coords_projected = pca.fit_transform(embeddings)

        # 2D coordinates (PC1, PC2) normalized to [5, 95] range for smooth SVG rendering
        min_x, max_x = float(coords_projected[:, 0].min()), float(coords_projected[:, 0].max())
        min_y, max_y = float(coords_projected[:, 1].min()), float(coords_projected[:, 1].max())

        span_x = (max_x - min_x) if max_x != min_x else 1.0
        span_y = (max_y - min_y) if max_y != min_y else 1.0

        # 3D coordinates (PC1, PC2, PC3)
        if n_pca_components >= 3:
            coords_3d = coords_projected[:, :3]
            min_z, max_z = float(coords_3d[:, 2].min()), float(coords_3d[:, 2].max())
            span_z = (max_z - min_z) if max_z != min_z else 1.0
        else:
            coords_3d = np.zeros((total_patents, 3))
            coords_3d[:, :n_pca_components] = coords_projected
            min_z, max_z, span_z = 0.0, 1.0, 1.0

        variance_explained = [round(float(v) * 100.0, 2) for v in pca.explained_variance_ratio_]

        viz_points: list[ClusterPatentPoint] = []
        for i, patent in enumerate(patents):
            norm_x = round(5.0 + 90.0 * ((coords_projected[i, 0] - min_x) / span_x), 2)
            norm_y = round(5.0 + 90.0 * ((coords_projected[i, 1] - min_y) / span_y), 2)

            # 3D centered coordinates (-50 to +50 range for WebGL / Three.js scene)
            x_3d = round(((coords_projected[i, 0] - min_x) / span_x - 0.5) * 100.0, 2)
            y_3d = round(((coords_projected[i, 1] - min_y) / span_y - 0.5) * 100.0, 2)
            z_3d = round(((coords_3d[i, 2] - min_z) / span_z - 0.5) * 100.0, 2)

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
                    x_3d=x_3d,
                    y_3d=y_3d,
                    z_3d=z_3d,
                    country=detect_patent_country(patent),
                    filing_date=patent.filing_date,
                    publication_date=patent.publication_date,
                )
            )

        # 7. Extract cluster metadata, labels, representative patents, and intra-cluster similarity
        clusters_list: list[ClusterItem] = []
        cluster_centroids_normed: dict[int, np.ndarray] = {}

        for c_id in range(k):
            cluster_indices = [idx for idx, lbl in enumerate(labels) if lbl == c_id]
            cluster_count = len(cluster_indices)

            if cluster_count == 0:
                continue

            cluster_patents = [patents[idx] for idx in cluster_indices]
            cluster_embeddings = embeddings[cluster_indices]
            centroid = centroids[c_id]
            centroid_norm = centroid / (np.linalg.norm(centroid) + 1e-9)
            cluster_centroids_normed[c_id] = centroid_norm

            # Compute intra-cluster pairwise cosine similarity
            if cluster_count > 1:
                pairwise_sims = np.dot(cluster_embeddings, cluster_embeddings.T)
                # Take upper triangle mean excluding diagonal
                triu_indices = np.triu_indices(cluster_count, k=1)
                avg_intra_sim = float(np.mean(pairwise_sims[triu_indices]))
            else:
                avg_intra_sim = 1.0

            # Generate top terms via TF-IDF on cluster texts
            cluster_texts = [build_patent_text(p) for p in cluster_patents]
            top_terms, synthesized_label = self._generate_cluster_label_and_terms(
                cluster_texts,
                cluster_patents,
                c_id,
            )

            # Representative patents: sort by proximity/similarity to cluster centroid
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
                    avg_intra_similarity=round(max(0.0, min(1.0, avg_intra_sim)), 3),
                )
            )

        # 8. Compute inter-cluster distances and closest cluster pairs
        for item in clusters_list:
            c_norm = cluster_centroids_normed.get(item.cluster_id)
            if c_norm is not None:
                best_sim = -1.0
                closest_lbl = None
                for other in clusters_list:
                    if other.cluster_id != item.cluster_id:
                        other_norm = cluster_centroids_normed.get(other.cluster_id)
                        if other_norm is not None:
                            inter_sim = float(np.dot(c_norm, other_norm))
                            if inter_sim > best_sim:
                                best_sim = inter_sim
                                closest_lbl = other.label
                item.closest_cluster_label = closest_lbl
                item.closest_cluster_distance = round(1.0 - max(0.0, min(1.0, best_sim)), 3) if best_sim >= 0 else None

        # Sort clusters by size descending
        clusters_list.sort(key=lambda c: c.patent_count, reverse=True)

        # 9. Synthesize real LandscapeInsights
        largest_cluster = clusters_list[0] if clusters_list else None
        most_cohesive = max(clusters_list, key=lambda c: c.avg_intra_similarity) if clusters_list else None
        
        # Overall portfolio pairwise cosine similarity
        all_pairwise = np.dot(embeddings, embeddings.T)
        triu_all = np.triu_indices(total_patents, k=1)
        avg_portfolio_sim = round(float(np.mean(all_pairwise[triu_all])), 3) if total_patents > 1 else 1.0

        unique_assignees = len({p.assignee for p in patents if p.assignee})
        all_domains = list(dict.fromkeys([p.technology_domain.title() for p in patents if p.technology_domain]))

        insights = LandscapeInsights(
            largest_cluster_label=largest_cluster.label if largest_cluster else "N/A",
            largest_cluster_count=largest_cluster.patent_count if largest_cluster else 0,
            most_cohesive_cluster_label=most_cohesive.label if most_cohesive else "N/A",
            most_cohesive_cluster_similarity=most_cohesive.avg_intra_similarity if most_cohesive else 0.0,
            average_portfolio_similarity=avg_portfolio_sim,
            closest_cluster_pair=[clusters_list[0].label, clusters_list[0].closest_cluster_label] if clusters_list and clusters_list[0].closest_cluster_label else [],
            total_unique_assignees=unique_assignees,
            emerging_technology_areas=all_domains[:5],
        )

        return PatentClusterResponse(
            total_patents=total_patents,
            number_of_clusters=len(clusters_list),
            optimal_k_selected=k,
            silhouette_score=silhouette,
            embedding_model=patent_embedding_service.model_name,
            clustering_algorithm="KMeans with TF-IDF Term Extraction & Dynamic K Optimization",
            generated_at=datetime.now(timezone.utc),
            clusters=clusters_list,
            visualization_points=viz_points,
            insights=insights,
            pca_variance_explained=variance_explained,
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
