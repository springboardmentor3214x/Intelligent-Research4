import os
import unittest
import uuid

# Set test environment before importing backend modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-profile-testing-12345"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database.base import Base
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.research_profile import ResearchProfile
from backend.app.models.user import User

# In-memory SQLite engine for tests with table creation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


class TestProfileModule(unittest.TestCase):
    def _create_and_login_user(self, email_prefix="user", organization="MIT", country="USA", designation="Researcher"):
        email = f"{email_prefix}_{uuid.uuid4().hex[:6]}@example.com"
        password = "SecurePassword123!"
        reg_payload = {
            "name": f"Dr. {email_prefix.title()}",
            "email": email,
            "password": password,
            "role": "researcher",
            "organization": organization,
            "designation": designation,
            "country": country,
            "phone_number": "+1234567890",
        }
        res_reg = client.post("/auth/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 201)

        res_login = client.post(
            "/auth/login",
            data={"username": email, "password": password},
        )
        self.assertEqual(res_login.status_code, 200)
        token = res_login.json()["access_token"]
        return token, res_reg.json()

    def test_01_authenticated_user_can_create_profile(self):
        token, user_data = self._create_and_login_user("prof_create")
        headers = {"Authorization": f"Bearer {token}"}

        profile_payload = {
            "research_domain": "Artificial Intelligence & Quantum Computing",
            "research_interests": "Neural networks, quantum algorithms, optimization",
            "organization": "Stanford University",
            "designation": "Associate Professor",
            "country": "United States",
            "phone_number": "+15550001111",
        }

        res = client.post("/profile", json=profile_payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        self.assertEqual(data["user_id"], user_data["id"])
        self.assertEqual(data["research_domain"], "Artificial Intelligence & Quantum Computing")
        self.assertEqual(data["research_interests"], "Neural networks, quantum algorithms, optimization")
        self.assertEqual(data["organization"], "Stanford University")
        self.assertEqual(data["designation"], "Associate Professor")
        self.assertEqual(data["country"], "United States")
        self.assertEqual(data["phone_number"], "+15550001111")
        self.assertEqual(data["name"], user_data["name"])
        self.assertEqual(data["email"], user_data["email"])
        self.assertEqual(data["role"], user_data["role"])
        self.assertIn("id", data)
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)

    def test_02_duplicate_profile_creation_returns_409(self):
        token, _ = self._create_and_login_user("prof_dup")
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "research_domain": "Bioinformatics",
            "research_interests": "Genomics",
        }
        res1 = client.post("/profile", json=payload, headers=headers)
        self.assertEqual(res1.status_code, 201)

        res2 = client.post("/profile", json=payload, headers=headers)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("already exists", res2.json()["detail"].lower())

    def test_03_authenticated_user_can_retrieve_profile(self):
        token, user_data = self._create_and_login_user("prof_get", organization="Oxford", designation="Postdoc")
        headers = {"Authorization": f"Bearer {token}"}

        # Create profile
        payload = {
            "research_domain": "Robotics",
            "research_interests": "Kinematics, Path Planning",
        }
        client.post("/profile", json=payload, headers=headers)

        # GET /profile
        res = client.get("/profile", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["research_domain"], "Robotics")
        self.assertEqual(data["research_interests"], "Kinematics, Path Planning")
        self.assertEqual(data["organization"], "Oxford")
        self.assertEqual(data["designation"], "Postdoc")
        self.assertEqual(data["user_id"], user_data["id"])

    def test_04_get_returns_404_when_profile_does_not_exist(self):
        token, _ = self._create_and_login_user("prof_not_found")
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/profile", headers=headers)
        self.assertEqual(res.status_code, 404)
        self.assertIn("not found", res.json()["detail"].lower())

    def test_05_authenticated_user_can_update_research_domain(self):
        token, _ = self._create_and_login_user("prof_up_domain")
        headers = {"Authorization": f"Bearer {token}"}

        client.post("/profile", json={"research_domain": "Initial Domain"}, headers=headers)

        res = client.put("/profile", json={"research_domain": "Updated Domain"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["research_domain"], "Updated Domain")

    def test_06_authenticated_user_can_update_research_interests(self):
        token, _ = self._create_and_login_user("prof_up_interests")
        headers = {"Authorization": f"Bearer {token}"}

        client.post("/profile", json={"research_domain": "Domain A", "research_interests": "Interests A"}, headers=headers)

        res = client.put("/profile", json={"research_interests": "Interests B"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["research_interests"], "Interests B")
        self.assertEqual(res.json()["research_domain"], "Domain A")

    def test_07_authenticated_user_can_update_organization(self):
        token, _ = self._create_and_login_user("prof_up_org", organization="Old Org")
        headers = {"Authorization": f"Bearer {token}"}

        client.post("/profile", json={"research_domain": "Domain A"}, headers=headers)

        res = client.put("/profile", json={"organization": "New Org Inc"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["organization"], "New Org Inc")

    def test_08_authenticated_user_can_update_designation(self):
        token, _ = self._create_and_login_user("prof_up_desig", designation="Junior Researcher")
        headers = {"Authorization": f"Bearer {token}"}

        client.post("/profile", json={"research_domain": "Domain A"}, headers=headers)

        res = client.put("/profile", json={"designation": "Lead Scientist"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["designation"], "Lead Scientist")

    def test_09_authenticated_user_can_update_country(self):
        token, _ = self._create_and_login_user("prof_up_country", country="Canada")
        headers = {"Authorization": f"Bearer {token}"}

        client.post("/profile", json={"research_domain": "Domain A"}, headers=headers)

        res = client.put("/profile", json={"country": "Germany"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["country"], "Germany")

    def test_10_authenticated_user_can_update_phone_number(self):
        token, _ = self._create_and_login_user("prof_up_phone")
        headers = {"Authorization": f"Bearer {token}"}

        client.post("/profile", json={"research_domain": "Domain A"}, headers=headers)

        res = client.put("/profile", json={"phone_number": "+447911123456"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["phone_number"], "+447911123456")

    def test_11_partial_update_does_not_overwrite_unspecified_fields(self):
        token, _ = self._create_and_login_user(
            "prof_partial",
            organization="Original Org",
            country="France",
            designation="Professor",
        )
        headers = {"Authorization": f"Bearer {token}"}

        client.post(
            "/profile",
            json={
                "research_domain": "Cybersecurity",
                "research_interests": "Cryptography, Network Security",
                "phone_number": "+33123456789",
            },
            headers=headers,
        )

        # Update only research_interests
        res = client.put("/profile", json={"research_interests": "Zero-Knowledge Proofs"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["research_interests"], "Zero-Knowledge Proofs")
        self.assertEqual(data["research_domain"], "Cybersecurity")
        self.assertEqual(data["organization"], "Original Org")
        self.assertEqual(data["country"], "France")
        self.assertEqual(data["designation"], "Professor")
        self.assertEqual(data["phone_number"], "+33123456789")

    def test_12_unauthenticated_requests_are_rejected(self):
        res_post = client.post("/profile", json={"research_domain": "Test"})
        self.assertEqual(res_post.status_code, 401)

        res_get = client.get("/profile")
        self.assertEqual(res_get.status_code, 401)

        res_put = client.put("/profile", json={"research_domain": "Test"})
        self.assertEqual(res_put.status_code, 401)

    def test_13_user_a_cannot_access_user_b_profile(self):
        token_a, _ = self._create_and_login_user("user_a")
        token_b, _ = self._create_and_login_user("user_b")

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User A creates profile
        client.post("/profile", json={"research_domain": "User A Domain"}, headers=headers_a)

        # User B queries profile (should be 404 for User B, not User A's profile)
        res_b = client.get("/profile", headers=headers_b)
        self.assertEqual(res_b.status_code, 404)

        # User B creates own profile
        client.post("/profile", json={"research_domain": "User B Domain"}, headers=headers_b)
        res_b2 = client.get("/profile", headers=headers_b)
        self.assertEqual(res_b2.status_code, 200)
        self.assertEqual(res_b2.json()["research_domain"], "User B Domain")

        # Verify User A still gets User A's profile
        res_a = client.get("/profile", headers=headers_a)
        self.assertEqual(res_a.status_code, 200)
        self.assertEqual(res_a.json()["research_domain"], "User A Domain")

    def test_14_user_a_cannot_update_user_b_profile(self):
        token_a, _ = self._create_and_login_user("user_a_up")
        token_b, _ = self._create_and_login_user("user_b_up")

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        client.post("/profile", json={"research_domain": "User A Domain"}, headers=headers_a)
        client.post("/profile", json={"research_domain": "User B Domain"}, headers=headers_b)

        # User A updates profile
        client.put("/profile", json={"research_domain": "User A Updated"}, headers=headers_a)

        # Ensure User B's profile was not affected
        res_b = client.get("/profile", headers=headers_b)
        self.assertEqual(res_b.status_code, 200)
        self.assertEqual(res_b.json()["research_domain"], "User B Domain")

    def test_15_invalid_research_domain_validation_returns_422(self):
        token, _ = self._create_and_login_user("prof_invalid")
        headers = {"Authorization": f"Bearer {token}"}

        # Empty research_domain
        res_empty = client.post("/profile", json={"research_domain": ""}, headers=headers)
        self.assertEqual(res_empty.status_code, 422)

        # Missing required research_domain
        res_missing = client.post("/profile", json={"research_interests": "Only interests"}, headers=headers)
        self.assertEqual(res_missing.status_code, 422)

        # Empty string on PUT update
        client.post("/profile", json={"research_domain": "Valid Domain"}, headers=headers)
        res_put_invalid = client.put("/profile", json={"research_domain": ""}, headers=headers)
        self.assertEqual(res_put_invalid.status_code, 422)

    def test_16_put_returns_404_when_profile_does_not_exist(self):
        token, _ = self._create_and_login_user("prof_put_404")
        headers = {"Authorization": f"Bearer {token}"}

        res = client.put("/profile", json={"research_domain": "New Domain"}, headers=headers)
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    unittest.main()
