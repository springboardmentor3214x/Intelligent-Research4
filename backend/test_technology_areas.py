import os
import unittest
import uuid

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-technology-areas"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.auth.security import create_access_token
from backend.app.database.base import Base
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.user import User


engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestTechnologyAreas(unittest.TestCase):
    def setUp(self):
        self.user_id = uuid.uuid4()
        db = TestingSessionLocal()
        db.add(User(id=self.user_id, name="Technology Tester", email=f"technology-{self.user_id}@example.com", password_hash="unused", role="researcher"))
        db.commit()
        db.close()
        token = create_access_token({"sub": str(self.user_id), "email": f"technology-{self.user_id}@example.com", "role": "researcher"})
        self.headers = {"Authorization": f"Bearer {token}"}

    def test_create_list_and_delete_technology_area(self):
        created = client.post("/technology-areas", headers=self.headers, json={"name": "  Machine   Learning "})
        self.assertEqual(created.status_code, 201)
        area = created.json()
        self.assertEqual(area["name"], "Machine Learning")

        listed = client.get("/technology-areas", headers=self.headers)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual([item["id"] for item in listed.json()], [area["id"]])

        deleted = client.delete(f"/technology-areas/{area['id']}", headers=self.headers)
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(client.get("/technology-areas", headers=self.headers).json(), [])

    def test_duplicate_technology_area_is_rejected(self):
        self.assertEqual(client.post("/technology-areas", headers=self.headers, json={"name": "Python"}).status_code, 201)
        duplicate = client.post("/technology-areas", headers=self.headers, json={"name": "Python"})
        self.assertEqual(duplicate.status_code, 409)

    def test_technology_areas_require_a_researcher(self):
        self.assertEqual(client.get("/technology-areas").status_code, 401)


if __name__ == "__main__":
    unittest.main()
