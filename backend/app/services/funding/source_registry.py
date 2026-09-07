"""
Source Registry and Orchestrator
Coordinates multi-source synchronization across Indian (ANRF, BIRAC, DST, ICMR, MeitY, DRDO, ICAR, ISTI)
and international (Grants.gov) funding providers with deterministic deduplication.
"""

import logging
import hashlib
from typing import Sequence
from sqlalchemy.orm import Session

from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.services.funding.base import FUNDING_SOURCES, FundingSourceAdapter
from backend.app.services.funding.sources.birac import BIRACAdapter
from backend.app.services.funding.sources.anrf import ANRFAdapter
from backend.app.services.funding.sources.dst import DSTAdapter
from backend.app.services.funding.sources.icmr import ICMRAdapter
from backend.app.services.funding.sources.meity import MeitYAdapter
from backend.app.services.funding.sources.drdo import DRDOAdapter
from backend.app.services.funding.sources.icar import ICARAdapter
from backend.app.services.funding.sources.isti import ISTIAdapter

logger = logging.getLogger(__name__)

# Registry mapping source key to Adapter Class
ADAPTER_MAP: dict[str, type[FundingSourceAdapter]] = {
    "ANRF": ANRFAdapter,
    "BIRAC": BIRACAdapter,
    "DST": DSTAdapter,
    "ICMR": ICMRAdapter,
    "MeitY": MeitYAdapter,
    "DRDO": DRDOAdapter,
    "ICAR": ICARAdapter,
    "ISTI": ISTIAdapter,
}


def get_available_sources() -> list[dict]:
    """Returns summary metadata of all registered funding sources."""
    results = []
    for key, meta in FUNDING_SOURCES.items():
        results.append({
            "key": key,
            "name": meta.get("full_name", key),
            "type": meta.get("type", "official_public_source"),
            "api_available": meta.get("api_available", False),
            "requires_api_key": meta.get("requires_api_key", False),
            "base_url": meta.get("base_url", ""),
            "domains": meta.get("domains", []),
        })
    return results


def deduplicate_and_upsert_opportunities(
    db: Session,
    opportunities_data: list[dict],
) -> tuple[int, int, int]:
    """
    Deterministically saves or updates funding opportunities to prevent duplicate insertions.
    Checks (source, source_id) unique constraint first, then falls back to normalized title+agency.

    Returns:
        (created_count, updated_count, skipped_count)
    """
    created_count = 0
    updated_count = 0
    skipped_count = 0

    for opp_dict in opportunities_data:
        source = opp_dict["source"]
        source_id = opp_dict["source_id"]

        # 1. Primary match on (source, source_id)
        existing = (
            db.query(FundingOpportunity)
            .filter(
                FundingOpportunity.source == source,
                FundingOpportunity.source_id == source_id,
            )
            .first()
        )

        if existing:
            # Check if any significant attribute changed
            changed = False
            if opp_dict.get("title") and existing.title != opp_dict["title"]:
                existing.title = opp_dict["title"]
                changed = True
            if opp_dict.get("description") and existing.description != opp_dict["description"]:
                existing.description = opp_dict["description"]
                changed = True
            if opp_dict.get("close_date") and existing.close_date != opp_dict["close_date"]:
                existing.close_date = opp_dict["close_date"]
                changed = True
            if opp_dict.get("funding_amount") and existing.funding_amount != opp_dict["funding_amount"]:
                existing.funding_amount = opp_dict["funding_amount"]
                changed = True

            if changed:
                updated_count += 1
            else:
                skipped_count += 1
            continue

        # 2. Secondary check for duplicate title under same agency to prevent cross-portal duplicates
        norm_title = opp_dict["title"].lower().strip()
        agency = (opp_dict.get("agency") or "").lower().strip()
        cross_dup = (
            db.query(FundingOpportunity)
            .filter(
                FundingOpportunity.title.ilike(norm_title),
                FundingOpportunity.agency.ilike(f"%{agency}%") if agency else True,
            )
            .first()
        )
        if cross_dup:
            skipped_count += 1
            continue

        # 3. Insert new opportunity
        new_opp = FundingOpportunity(**opp_dict)
        db.add(new_opp)
        created_count += 1

    db.commit()
    return created_count, updated_count, skipped_count


def sync_funding_sources(
    db: Session,
    source_keys: list[str] | None = None,
) -> dict:
    """
    Executes synchronization across all requested or all available Indian & national funding sources.
    Fault-tolerant: one failing source does not halt other sources.

    Returns comprehensive sync metrics dictionary.
    """
    target_keys = source_keys or list(ADAPTER_MAP.keys())
    sources_processed = 0
    total_fetched = 0
    total_created = 0
    total_updated = 0
    total_skipped = 0
    per_source_status: dict[str, dict] = {}
    errors: list[str] = []

    for key in target_keys:
        adapter_cls = ADAPTER_MAP.get(key)
        if not adapter_cls:
            continue

        try:
            adapter = adapter_cls()
            records = adapter.fetch_opportunities()
            fetched = len(records)
            created, updated, skipped = deduplicate_and_upsert_opportunities(db, records)

            sources_processed += 1
            total_fetched += fetched
            total_created += created
            total_updated += updated
            total_skipped += skipped

            per_source_status[key] = {
                "status": "success",
                "fetched": fetched,
                "created": created,
                "updated": updated,
                "skipped": skipped,
            }
        except Exception as e:
            logger.error(f"Sync failed for source '{key}': {e}", exc_info=True)
            err_msg = f"{key} synchronization failed: {str(e)}"
            errors.append(err_msg)
            per_source_status[key] = {
                "status": "failed",
                "error": str(e),
                "fetched": 0,
                "created": 0,
                "updated": 0,
                "skipped": 0,
            }

    return {
        "sources_processed": sources_processed,
        "records_fetched": total_fetched,
        "records_created": total_created,
        "records_updated": total_updated,
        "duplicates_skipped": total_skipped,
        "source_results": per_source_status,
        "errors": errors,
        "message": f"Synchronized {sources_processed} Indian funding sources. Created {total_created} new opportunities, updated {total_updated}, skipped {total_skipped} duplicates.",
    }
