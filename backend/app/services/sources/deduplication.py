import re
from typing import Dict, List, Set, Tuple
from collections import defaultdict

from backend.app.services.sources.base_source import RawEvidenceRecord, SourceType


def normalize_title(title: str) -> str:
    """Normalize title for fuzzy matching (lowercase, strip punctuation and whitespace)."""
    if not title:
        return ""
    cleaned = re.sub(r"[^\w\s]", "", title.lower())
    return " ".join(cleaned.split())


def normalize_doi(doi: str) -> str:
    """Normalize DOI string."""
    if not doi:
        return ""
    doi = doi.lower().strip()
    doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi)
    return doi.strip()


def normalize_patent_id(patent_number: str) -> str:
    """Normalize patent or publication number."""
    if not patent_number:
        return ""
    cleaned = re.sub(r"[\s\-\/\.]", "", patent_number.upper().strip())
    return cleaned


class DeduplicationResult:
    def __init__(
        self,
        unique_records: List[RawEvidenceRecord],
        source_counts: Dict[str, int],
        total_raw_count: int,
        unique_count: int,
        duplicates_removed: int,
        provenance_map: Dict[str, List[str]],  # unique_id -> list of contributing sources
    ):
        self.unique_records = unique_records
        self.source_counts = source_counts
        self.total_raw_count = total_raw_count
        self.unique_count = unique_count
        self.duplicates_removed = duplicates_removed
        self.provenance_map = provenance_map


def deduplicate_evidence_records(records: List[RawEvidenceRecord]) -> DeduplicationResult:
    """
    Deduplicates research papers, patents, and funding opportunities across multiple sources
    while maintaining complete source coverage breakdowns and provenance.
    """
    source_counts: Dict[str, int] = defaultdict(int)
    for r in records:
        source_counts[r.source] += 1

    seen_keys: Dict[str, RawEvidenceRecord] = {}
    provenance_map: Dict[str, List[str]] = defaultdict(list)

    for r in records:
        # Determine deduplication keys based on record type
        dedup_keys: List[str] = []

        if r.source_type == SourceType.RESEARCH:
            if r.doi:
                norm_doi = normalize_doi(r.doi)
                if norm_doi:
                    dedup_keys.append(f"doi:{norm_doi}")
            if r.pmid:
                dedup_keys.append(f"pmid:{r.pmid.strip()}")
            if r.source == "OpenAlex" and r.source_record_id:
                dedup_keys.append(f"openalex:{r.source_record_id.strip()}")

            # Fallback title key
            norm_t = normalize_title(r.title)
            if norm_t and len(norm_t) > 10:
                y_str = str(r.year) if r.year else "noyear"
                dedup_keys.append(f"title:{norm_t}:{y_str}")

        elif r.source_type == SourceType.PATENT:
            if r.patent_number:
                norm_p = normalize_patent_id(r.patent_number)
                if norm_p:
                    dedup_keys.append(f"pat:{norm_p}")
            norm_t = normalize_title(r.title)
            if norm_t and len(norm_t) > 10:
                y_str = str(r.year) if r.year else "noyear"
                dedup_keys.append(f"pattitle:{norm_t}:{y_str}")

        elif r.source_type == SourceType.FUNDING:
            if r.source_record_id:
                dedup_keys.append(f"grant:{r.source.lower()}:{r.source_record_id.strip()}")
            norm_t = normalize_title(r.title)
            if norm_t and len(norm_t) > 10:
                dedup_keys.append(f"granttitle:{norm_t}")

        # If no specialized keys, use fallback source compound ID
        if not dedup_keys:
            dedup_keys.append(f"raw:{r.source}:{r.source_record_id}")

        # Check if any key already seen
        matched_existing_key = None
        for k in dedup_keys:
            if k in seen_keys:
                matched_existing_key = k
                break

        if matched_existing_key:
            existing_record = seen_keys[matched_existing_key]
            rec_id = existing_record.id
            if r.source not in provenance_map[rec_id]:
                provenance_map[rec_id].append(r.source)

            # Enrich existing record with missing metadata
            if not existing_record.doi and r.doi:
                existing_record.doi = r.doi
            if not existing_record.description and r.description:
                existing_record.description = r.description
            if not existing_record.organization and r.organization:
                existing_record.organization = r.organization
            if not existing_record.authors_or_inventors and r.authors_or_inventors:
                existing_record.authors_or_inventors = r.authors_or_inventors
            if not existing_record.year and r.year:
                existing_record.year = r.year
            if not existing_record.url and r.url:
                existing_record.url = r.url
            if r.citation_count > existing_record.citation_count:
                existing_record.citation_count = r.citation_count
        else:
            rec_id = r.id
            provenance_map[rec_id].append(r.source)
            for k in dedup_keys:
                seen_keys[k] = r

    unique_records = list({r.id: r for r in seen_keys.values()}.values())
    total_raw = len(records)
    unique_count = len(unique_records)
    duplicates_removed = total_raw - unique_count

    return DeduplicationResult(
        unique_records=unique_records,
        source_counts=dict(source_counts),
        total_raw_count=total_raw,
        unique_count=unique_count,
        duplicates_removed=duplicates_removed,
        provenance_map=dict(provenance_map),
    )
