import logging
import re
from typing import Any
import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.preprocessing import normalize

logger = logging.getLogger(__name__)

DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
FALLBACK_EMBEDDING_MODEL = "hashing-semantic-vectorizer"
EMBEDDING_DIMENSION = 384


def build_patent_text(patent: Any) -> str:
    """
    Build a clean, normalized semantic text representation from patent fields.
    Gracefully omits empty or invalid fields ('None', 'null', 'undefined').
    """
    parts = []

    def _clean_val(val: Any) -> str | None:
        if val is None:
            return None
        s = str(val).strip()
        if not s or s.lower() in {"none", "null", "undefined", "n/a"}:
            return None
        return re.sub(r"\s+", " ", s)

    title = _clean_val(getattr(patent, "title", None) if hasattr(patent, "title") else patent.get("title") if isinstance(patent, dict) else None)
    if title:
        parts.append(f"Title: {title}")

    abstract = _clean_val(getattr(patent, "abstract", None) if hasattr(patent, "abstract") else patent.get("abstract") if isinstance(patent, dict) else None)
    if abstract:
        parts.append(f"Abstract: {abstract}")

    tech_domain = _clean_val(getattr(patent, "technology_domain", None) if hasattr(patent, "technology_domain") else patent.get("technology_domain") if isinstance(patent, dict) else None)
    if tech_domain:
        parts.append(f"Technology Domain: {tech_domain}")

    classification = _clean_val(getattr(patent, "classification", None) if hasattr(patent, "classification") else patent.get("classification") if isinstance(patent, dict) else None)
    if classification:
        parts.append(f"Classification: {classification}")

    assignee = _clean_val(getattr(patent, "assignee", None) if hasattr(patent, "assignee") else patent.get("assignee") if isinstance(patent, dict) else None)
    if assignee:
        parts.append(f"Assignee: {assignee}")

    return ". ".join(parts).strip()


class PatentEmbeddingService:
    """
    Singleton service for generating normalized semantic embeddings for patent documents.
    Uses SentenceTransformer if available, with consistent high-dimensional vectorizer fallback.
    """

    _instance = None
    _model = None
    _model_name = DEFAULT_EMBEDDING_MODEL
    _cache: dict[str, np.ndarray] = {}
    _hasher = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self):
        """Attempts to load sentence-transformers model; sets up consistent fallback."""
        self._hasher = HashingVectorizer(
            n_features=16384,
            stop_words="english",
            ngram_range=(1, 2),
            alternate_sign=False,
            norm=None,
        )

        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(DEFAULT_EMBEDDING_MODEL)
            self._model_name = DEFAULT_EMBEDDING_MODEL
            logger.info("Successfully loaded SentenceTransformer: %s", DEFAULT_EMBEDDING_MODEL)
        except Exception as exc:
            logger.warning("SentenceTransformer not active (%s). Using high-dimensional normalized vectorizer.", exc)
            self._model = None
            self._model_name = FALLBACK_EMBEDDING_MODEL

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def embedding_dimension(self) -> int:
        return EMBEDDING_DIMENSION

    def generate_patent_embedding(self, patent: Any) -> np.ndarray:
        """Generate a 1D normalized float32 embedding vector for a single patent."""
        text = build_patent_text(patent)
        if not text:
            raise ValueError("Patent has no meaningful textual content to embed.")

        cache_key = str(hash(text))
        if cache_key in self._cache:
            return self._cache[cache_key]

        embeddings = self.generate_text_embeddings([text])
        embedding = embeddings[0]
        self._cache[cache_key] = embedding
        return embedding

    def generate_patent_embeddings(self, patents: list[Any]) -> np.ndarray:
        """
        Generate a 2D (N, D) normalized float32 embedding matrix for a list of patents
        using batching.
        """
        if not patents:
            return np.empty((0, EMBEDDING_DIMENSION), dtype=np.float32)

        texts = [build_patent_text(p) for p in patents]
        return self.generate_text_embeddings(texts)

    def generate_text_embeddings(self, texts: list[str]) -> np.ndarray:
        """
        Batch generate L2-normalized float32 vectors for a list of texts.
        """
        if not texts:
            return np.empty((0, EMBEDDING_DIMENSION), dtype=np.float32)

        cleaned_texts = [t if t.strip() else "Patent Document" for t in texts]

        # Lazy check if sentence_transformers is newly available
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(DEFAULT_EMBEDDING_MODEL)
                self._model_name = DEFAULT_EMBEDDING_MODEL
            except Exception:
                pass

        if self._model is not None:
            try:
                raw_embeddings = self._model.encode(
                    cleaned_texts,
                    batch_size=32,
                    show_progress_bar=False,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                )
                return raw_embeddings.astype(np.float32)
            except Exception as exc:
                logger.error("SentenceTransformer encoding failed: %s. Using hashing vectorizer.", exc)

        # High-dimensional HashingVectorizer with L2 normalization across same feature space
        hash_mat = self._hasher.transform(cleaned_texts).toarray().astype(np.float32)
        normed = normalize(hash_mat, norm="l2", axis=1).astype(np.float32)
        return normed

    @staticmethod
    def calculate_similarity(vector_a: np.ndarray, vector_b: np.ndarray) -> float:
        """
        Calculate cosine similarity between two unit-normalized vectors.
        Returns a float between 0.0 and 1.0.
        """
        if vector_a.ndim > 1:
            vector_a = vector_a.flatten()
        if vector_b.ndim > 1:
            vector_b = vector_b.flatten()

        dot = float(np.dot(vector_a, vector_b))
        return max(0.0, min(1.0, dot))

    @staticmethod
    def extract_shared_terms(text_a: str, text_b: str, max_terms: int = 4) -> list[str]:
        """
        Extract key shared terms between two patent descriptions for explainability.
        """
        if not text_a or not text_b:
            return []

        stopwords = {
            "the", "and", "for", "with", "from", "that", "this", "title", "abstract",
            "patent", "system", "method", "comprising", "wherein", "including",
            "technology", "domain", "classification", "assignee", "apparatus", "device"
        }

        def get_words(text: str) -> set[str]:
            tokens = re.findall(r"\b[a-zA-Z]{3,25}\b", text.lower())
            return {t for t in tokens if t not in stopwords}

        words_a = get_words(text_a)
        words_b = get_words(text_b)
        shared = words_a.intersection(words_b)

        sorted_terms = sorted(shared, key=lambda w: (-len(w), w))
        return [w.capitalize() for w in sorted_terms[:max_terms]]


patent_embedding_service = PatentEmbeddingService()
