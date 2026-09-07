"""
Comprehensive Test Suite for Indian Funding Sources Ingestion, Deduplication,
Multi-Domain Semantic AI Matching, and User-Isolated Saved Grants.
"""

import uuid
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.base import Base
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.user import User
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.research_area import ResearchArea
from backend.app.models.keyword import Keyword
from backend.app.models.funding_opportunity import FundingOpportunity
from backend.app.models.saved_funding import SavedFunding
from backend.app.auth.security import create_access_token, hash_password
from backend.app.services.funding.sources.birac import BIRACAdapter
from backend.app.services.funding.sources.anrf import ANRFAdapter
from backend.app.services.funding.sources.dst import DSTAdapter
from backend.app.services.funding.sources.icmr import ICMRAdapter
from backend.app.services.funding.sources.meity import MeitYAdapter
from backend.app.services.funding.sources.drdo import DRDOAdapter
from backend.app.services.funding.sources.icar import ICARAdapter
from backend.app.services.funding.sources.isti import ISTIAdapter
from backend.app.services.funding.source_registry import sync_funding_sources
from backend.tests_common import TestingSessionLocal, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="function")
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.query(SavedFunding).delete()
        session.query(FundingOpportunity).delete()
        session.query(ResearchProfile).delete()
        session.query(ResearchArea).delete()
        session.query(Keyword).delete()
        session.query(User).delete()
        session.commit()
        session.close()


def create_user(db, email="user@test.com", domain="Healthcare", name="Dr. Test"):
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password("SecretPass123!"),
        name=name,
        role="researcher",
        organization="AIIMS New Delhi",
        country="India",
        department="Radiology",
        research_domain=domain,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


from backend.app.models.research_area import ResearchArea, profile_research_areas
from backend.app.models.keyword import Keyword, profile_keywords


def attach_profile(db, user, domain, areas, keywords):
    profile = ResearchProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        research_domain=domain,
        research_interests=f"Advanced research in {domain}",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    for a in areas:
        ra = db.query(ResearchArea).filter(ResearchArea.name == a).first()
        if not ra:
            ra = ResearchArea(id=uuid.uuid4(), name=a)
            db.add(ra)
            db.commit()
            db.refresh(ra)
        db.execute(profile_research_areas.insert().values(research_profile_id=profile.id, research_area_id=ra.id))

    for k in keywords:
        kw = db.query(Keyword).filter(Keyword.name == k).first()
        if not kw:
            kw = Keyword(id=uuid.uuid4(), name=k)
            db.add(kw)
            db.commit()
            db.refresh(kw)
        db.execute(profile_keywords.insert().values(research_profile_id=profile.id, keyword_id=kw.id))

    db.commit()
    return profile


# ==============================================================================
# TEST SUITE
# ==============================================================================

class TestIndianFundingIntelligence:

    def test_01_birac_adapter_normalization(self):
        """1. Verify BIRAC adapter extracts valid normalized opportunities."""
        adapter = BIRACAdapter()
        records = adapter.fetch_opportunities()
        assert len(records) >= 3
        first = records[0]
        assert first["source"] == "BIRAC"
        assert first["country"] == "India"
        assert first["funding_amount"] is not None
        assert "birac" in first["official_link"].lower()

    def test_02_anrf_adapter_normalization(self):
        """2. Verify ANRF adapter extracts national research grants."""
        adapter = ANRFAdapter()
        records = adapter.fetch_opportunities()
        assert len(records) >= 4
        assert any("Advanced Research Grant" in r["title"] for r in records)
        assert any(r["funding_type"] == "Fellowship" for r in records)

    def test_03_dst_and_icmr_adapters_normalization(self):
        """3. Verify DST and ICMR adapters return normalized records."""
        dst_records = DSTAdapter().fetch_opportunities()
        icmr_records = ICMRAdapter().fetch_opportunities()

        assert len(dst_records) >= 3
        assert len(icmr_records) >= 3
        assert any("Quantum" in r["title"] or "NM-ICPS" in r["title"] for r in dst_records)
        assert any("Clinical Imaging" in r["title"] or "Medical AI" in r["title"] for r in icmr_records)

    def test_04_meity_drdo_icar_isti_adapters_normalization(self):
        """4. Verify MeitY, DRDO, ICAR, and ISTI adapters return correct domain grants."""
        meity = MeitYAdapter().fetch_opportunities()
        drdo = DRDOAdapter().fetch_opportunities()
        icar = ICARAdapter().fetch_opportunities()
        isti = ISTIAdapter().fetch_opportunities()

        assert any("Chips to Startup" in r["title"] or "IndiaAI" in r["title"] for r in meity)
        assert any("Autonomous" in r["title"] or "Radar" in r["title"] for r in drdo)
        assert any("Crop" in r["title"] or "Agriculture" in r["title"] for r in icar)
        assert any("FIST" in r["title"] or "WISE" in r["title"] for r in isti)

    def test_05_sync_all_sources_and_idempotent_deduplication(self, db_session):
        """5. Verify POST /funding/sync populates all 8 sources and avoids duplicates on 2nd run."""
        # 1st Sync
        res1 = sync_funding_sources(db_session)
        assert res1["sources_processed"] == 8
        assert res1["records_created"] >= 25
        assert res1["duplicates_skipped"] == 0

        # 2nd Sync (must skip duplicates)
        res2 = sync_funding_sources(db_session)
        assert res2["records_created"] == 0
        assert res2["duplicates_skipped"] >= 25

    def test_06_medical_ai_profile_ranks_icmr_and_birac_highest(self, db_session):
        """6. Medical AI researcher gets high relevance for ICMR & BIRAC diagnostic grants."""
        user = create_user(db_session, email="med_ai@aiims.edu", domain="Healthcare")
        attach_profile(
            db_session, user,
            domain="Healthcare",
            areas=["Medical Image Processing", "MRI Tumor Segmentation", "Clinical Diagnostics"],
            keywords=["Deep Learning", "Convolutional Neural Networks", "Radiology"],
        )
        sync_funding_sources(db_session)

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 20
        top_rec = data["recommendations"][0]
        assert top_rec["funding_opportunity"]["source"] in ["ICMR", "BIRAC"]
        assert top_rec["match"]["relevance_score"] >= 45.0
        assert "Healthcare" in top_rec["match"]["explanation"] or "Medical" in top_rec["match"]["explanation"] or "domain" in top_rec["match"]["explanation"]

    def test_07_semiconductor_ai_profile_ranks_meity_highest(self, db_session):
        """7. VLSI / Electronics researcher gets high relevance for MeitY C2S & IndiaAI."""
        user = create_user(db_session, email="vlsi_prof@iitb.ac.in", domain="Electronics & IT")
        attach_profile(
            db_session, user,
            domain="Electronics & IT",
            areas=["Semiconductors", "VLSI Design", "Chip Architecture"],
            keywords=["ASIC", "RISC-V", "Microelectronics", "Hardware AI"],
        )
        sync_funding_sources(db_session)

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        top_rec = data["recommendations"][0]
        assert top_rec["funding_opportunity"]["source"] == "MeitY"
        assert top_rec["match"]["relevance_score"] >= 45.0

    def test_08_agriculture_profile_ranks_icar_highest(self, db_session):
        """8. Agronomy researcher ranks ICAR Crop Genetics highest, ranks DRDO lowest."""
        user = create_user(db_session, email="agri_lead@iari.res.in", domain="Agriculture")
        attach_profile(
            db_session, user,
            domain="Agriculture",
            areas=["Crop Genetics", "Soil Health", "Agronomy"],
            keywords=["CRISPR", "Plant Breeding", "Precision Agriculture"],
        )
        sync_funding_sources(db_session)

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        response = client.get("/funding/recommendations/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        recs = response.json()["recommendations"]
        top_rec = recs[0]
        assert top_rec["funding_opportunity"]["source"] == "ICAR"
        assert top_rec["match"]["relevance_score"] >= 50.0

        # Verify unrelated defence opportunities receive lower relevance
        drdo_recs = [r for r in recs if r["funding_opportunity"]["source"] == "DRDO"]
        if drdo_recs:
            assert drdo_recs[0]["match"]["relevance_score"] < top_rec["match"]["relevance_score"]

    def test_09_save_and_retrieve_user_bookmarks(self, db_session):
        """9. Authenticated user can save and retrieve personalized bookmarks."""
        user = create_user(db_session, email="saver@test.com")
        sync_funding_sources(db_session)
        opp = db_session.query(FundingOpportunity).first()

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})

        # Save opportunity
        r_save = client.post(
            "/funding/save",
            json={"funding_opportunity_id": str(opp.id)},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r_save.status_code == 200
        assert r_save.json()["saved"] is True

        # Fetch saved list
        r_list = client.get("/funding/saved", headers={"Authorization": f"Bearer {token}"})
        assert r_list.status_code == 200
        assert r_list.json()["total"] == 1
        assert r_list.json()["saved_opportunities"][0]["funding_opportunity_id"] == str(opp.id)

        # Remove bookmark
        r_del = client.delete(f"/funding/save/{opp.id}", headers={"Authorization": f"Bearer {token}"})
        assert r_del.status_code == 200
        assert r_del.json()["saved"] is False

        # Verify empty
        r_list_after = client.get("/funding/saved", headers={"Authorization": f"Bearer {token}"})
        assert r_list_after.json()["total"] == 0

    def test_10_user_isolation_for_saved_grants(self, db_session):
        """10. User A cannot see or delete User B's saved grants."""
        user_a = create_user(db_session, email="usera@test.com")
        user_b = create_user(db_session, email="userb@test.com")
        sync_funding_sources(db_session)
        opp = db_session.query(FundingOpportunity).first()

        token_a = create_access_token(data={"sub": str(user_a.id), "email": user_a.email, "role": user_a.role})
        token_b = create_access_token(data={"sub": str(user_b.id), "email": user_b.email, "role": user_b.role})

        # User A saves
        client.post("/funding/save", json={"funding_opportunity_id": str(opp.id)}, headers={"Authorization": f"Bearer {token_a}"})

        # User B fetches list -> should be 0
        r_b = client.get("/funding/saved", headers={"Authorization": f"Bearer {token_b}"}).json()
        assert r_b["total"] == 0

        # User B attempts to delete User A's bookmark -> 404
        r_del = client.delete(f"/funding/save/{opp.id}", headers={"Authorization": f"Bearer {token_b}"})
        assert r_del.status_code == 404
