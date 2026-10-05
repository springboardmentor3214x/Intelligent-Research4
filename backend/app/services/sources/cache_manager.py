import json
import os
import time
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from backend.app.services.sources.base_source import RawEvidenceRecord


class EvidenceCacheManager:
    """
    In-memory and file-backed caching for external API queries.
    Prevents repetitive API calls, protects rate limits, and enables offline operation.
    """
    def __init__(self, ttl_seconds: int = 86400):  # Default 24-hour cache
        self.ttl_seconds = ttl_seconds
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_dir = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", ".cache_evidence"
        )
        os.makedirs(self._cache_dir, exist_ok=True)

    def _get_cache_key(self, source_name: str, query: str) -> str:
        clean_q = "".join(c if c.isalnum() else "_" for c in query.lower().strip())
        return f"{source_name}_{clean_q}"

    def get(self, source_name: str, query: str) -> Optional[List[RawEvidenceRecord]]:
        key = self._get_cache_key(source_name, query)
        now = time.time()

        # 1. Check memory cache
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            if now - entry["timestamp"] < self.ttl_seconds:
                return [RawEvidenceRecord(**r) for r in entry["records"]]

        # 2. Check disk cache
        file_path = os.path.join(self._cache_dir, f"{key}.json")
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if now - data.get("timestamp", 0) < self.ttl_seconds:
                        records = [RawEvidenceRecord(**r) for r in data.get("records", [])]
                        self._memory_cache[key] = {
                            "timestamp": data["timestamp"],
                            "records": data.get("records", []),
                        }
                        return records
            except Exception:
                pass

        return None

    def set(self, source_name: str, query: str, records: List[RawEvidenceRecord]) -> None:
        key = self._get_cache_key(source_name, query)
        now = time.time()
        serialized = [r.model_dump() for r in records]

        self._memory_cache[key] = {
            "timestamp": now,
            "records": serialized,
        }

        file_path = os.path.join(self._cache_dir, f"{key}.json")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump({"timestamp": now, "query": query, "source": source_name, "records": serialized}, f)
        except Exception:
            pass


cache_manager = EvidenceCacheManager()
