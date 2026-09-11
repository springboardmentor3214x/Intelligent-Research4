import os
import unittest
import uuid

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-research-details-12345"

from fastapi.testclient import TestClient

from backend.app.auth.security import hash_password
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.user import User
from backend.tests_common import TestingSessionLocal, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestResearchDetails(unittest.TestCase):
    def _create_and_login_user(self, prefix="rd"):
        email = f"{prefix}_{uuid.uuid4().hex[:6]}@example.com"
        password = "SecurePassword123!"

        db = TestingSessionLocal()
        user = User(
            name=f"Dr. {prefix.title()}",
            email=email.lower(),
            password_hash=hash_password(password),
            role="researcher",
            organization="Oxford University",
            country="UK",
            designation="Professor",
            research_domain="Renewable Energy",
        )
        db.add(user)
        db.commit()
        db.close()

        res_login = client.post(
            "/auth/login",
            data={"username": email, "password": password},
        )
        self.assertEqual(res_login.status_code, 200)
        return res_login.json()["access_token"]

    def test_01_research_areas_crud(self):
        token = self._create_and_login_user("areas")
        headers = {"Authorization": f"Bearer {token}"}

        # Add Area
        add_res = client.post(
            "/profile/areas",
            json={"name": "Solar Cell Efficiency", "description": "Photovoltaic optimization"},
            headers=headers,
        )
        self.assertEqual(add_res.status_code, 201)
        area_id = add_res.json()["id"]

        # List Areas
        list_res = client.get("/profile/areas", headers=headers)
        self.assertEqual(list_res.status_code, 200)
        names = [a["name"] for a in list_res.json()]
        self.assertIn("Solar Cell Efficiency", names)

        # Remove Area
        del_res = client.delete(f"/profile/areas/{area_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # List again to confirm removed
        list_res2 = client.get("/profile/areas", headers=headers)
        self.assertEqual(len(list_res2.json()), 0)

    def test_02_keywords_crud(self):
        token = self._create_and_login_user("keywords")
        headers = {"Authorization": f"Bearer {token}"}

        # Add Keyword
        add_res = client.post(
            "/profile/keywords",
            json={"name": "Perovskite"},
            headers=headers,
        )
        self.assertEqual(add_res.status_code, 201)
        kw_id = add_res.json()["id"]

        # List Keywords
        list_res = client.get("/profile/keywords", headers=headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.json()[0]["name"], "Perovskite")

        # Delete Keyword
        del_res = client.delete(f"/profile/keywords/{kw_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

    def test_03_technology_areas_crud(self):
        token = self._create_and_login_user("tech")
        headers = {"Authorization": f"Bearer {token}"}

        # Add Tech Area
        add_res = client.post(
            "/profile/technology-areas",
            json={"name": "CleanTech"},
            headers=headers,
        )
        self.assertEqual(add_res.status_code, 201)
        tech_id = add_res.json()["id"]

        # List Tech Areas
        list_res = client.get("/profile/technology-areas", headers=headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.json()[0]["name"], "CleanTech")

        # Delete Tech Area
        del_res = client.delete(f"/profile/technology-areas/{tech_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

    def test_04_publications_crud(self):
        token = self._create_and_login_user("pubs")
        headers = {"Authorization": f"Bearer {token}"}

        # Create publication
        pub_payload = {
            "title": "High efficiency perovskite solar cells",
            "authors": "Dr. Pubs, Prof. Colleague",
            "publication_date": "2026-05-15",
            "journal_or_conference": "Nature Energy",
            "doi": "10.1038/nature12345",
            "publication_link": "https://nature.com/articles/12345",
        }
        res_post = client.post("/profile/publications", json=pub_payload, headers=headers)
        self.assertEqual(res_post.status_code, 201)
        pub_id = res_post.json()["id"]

        # List publications
        res_list = client.get("/profile/publications", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()), 1)
        self.assertEqual(res_list.json()[0]["title"], "High efficiency perovskite solar cells")

        # Update publication
        res_put = client.put(
            f"/profile/publications/{pub_id}",
            json={"title": "Updated Solar Title"},
            headers=headers,
        )
        self.assertEqual(res_put.status_code, 200)
        self.assertEqual(res_put.json()["title"], "Updated Solar Title")

        # Delete publication
        res_del = client.delete(f"/profile/publications/{pub_id}", headers=headers)
        self.assertEqual(res_del.status_code, 200)

    def test_05_patents_crud(self):
        token = self._create_and_login_user("pats")
        headers = {"Authorization": f"Bearer {token}"}

        # Create patent
        pat_payload = {
            "patent_title": "Novel Photovoltaic Cell Architecture",
            "inventor": "Dr. Pats",
            "patent_number": "US-2026-987654",
            "filing_date": "2026-01-10",
            "patent_status": "Pending",
        }
        res_post = client.post("/profile/patents", json=pat_payload, headers=headers)
        self.assertEqual(res_post.status_code, 201)
        pat_id = res_post.json()["id"]

        # List patents
        res_list = client.get("/profile/patents", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()), 1)
        self.assertEqual(res_list.json()[0]["patent_title"], "Novel Photovoltaic Cell Architecture")

        # Update patent
        res_put = client.put(
            f"/profile/patents/{pat_id}",
            json={"patent_status": "Granted"},
            headers=headers,
        )
        self.assertEqual(res_put.status_code, 200)
        self.assertEqual(res_put.json()["patent_status"], "Granted")

        # Delete patent
        res_del = client.delete(f"/profile/patents/{pat_id}", headers=headers)
        self.assertEqual(res_del.status_code, 200)


if __name__ == "__main__":
    unittest.main()
