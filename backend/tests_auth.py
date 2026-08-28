import os
import unittest
import uuid
from datetime import timedelta

# Set dummy DATABASE_URL and JWT_SECRET_KEY before importing backend modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-auth-testing-12345"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from backend.app.database.base import Base
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.user import User

# In-memory SQLite engine for tests
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


class TestAuthModule(unittest.TestCase):
    def test_01_password_hashing_and_verification(self):
        raw_password = "SecurePassword123!"
        hashed = hash_password(raw_password)
        self.assertNotEqual(hashed, raw_password)
        self.assertTrue(verify_password(raw_password, hashed))
        self.assertFalse(verify_password("WrongPassword!", hashed))

    def test_02_jwt_token_generation_and_decoding(self):
        user_id = str(uuid.uuid4())
        data = {"sub": user_id, "email": "test@research.org", "role": "researcher"}
        token = create_access_token(data=data, expires_delta=timedelta(minutes=15))
        self.assertIsInstance(token, str)

        decoded = decode_access_token(token)
        self.assertEqual(decoded["sub"], user_id)
        self.assertEqual(decoded["email"], "test@research.org")
        self.assertEqual(decoded["role"], "researcher")
        self.assertIn("exp", decoded)
        self.assertIn("iat", decoded)

    def test_03_jwt_expired_token(self):
        user_id = str(uuid.uuid4())
        data = {"sub": user_id, "email": "expired@research.org"}
        token = create_access_token(data=data, expires_delta=timedelta(minutes=-10))
        with self.assertRaises(Exception):
            decode_access_token(token)

    def test_04_successful_user_registration_and_hash_storage(self):
        email = f"user_{uuid.uuid4().hex[:6]}@example.com"
        payload = {
            "name": "Dr. Alan Turing",
            "email": email,
            "password": "SuperSecretPassword123!",
            "role": "researcher",
            "phone_number": "+1234567890",
            "organization": "Institute for Advanced Study",
            "designation": "Principal Investigator",
            "country": "United Kingdom",
            "research_domain": "Computer Science & Cryptography",
        }

        response = client.post("/auth/register", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["email"], email.lower())
        self.assertEqual(data["name"], "Dr. Alan Turing")
        self.assertEqual(data["role"], "researcher")
        self.assertIn("id", data)
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)

        # Verify password hash in database
        db = TestingSessionLocal()
        user_in_db = db.query(User).filter(User.email == email.lower()).first()
        self.assertIsNotNone(user_in_db)
        self.assertNotEqual(user_in_db.password_hash, "SuperSecretPassword123!")
        self.assertTrue(verify_password("SuperSecretPassword123!", user_in_db.password_hash))
        db.close()

    def test_05_duplicate_email_registration_rejected(self):
        email = f"duplicate_{uuid.uuid4().hex[:6]}@example.com"
        payload = {
            "name": "Duplicate Tester",
            "email": email,
            "password": "Password123!",
            "role": "researcher",
            "phone_number": "+1234567890",
            "organization": "Test University",
            "designation": "Researcher",
            "country": "USA",
            "research_domain": "Computer Science",
        }

        res1 = client.post("/auth/register", json=payload)
        self.assertEqual(res1.status_code, 201)

        res2 = client.post("/auth/register", json=payload)
        self.assertEqual(res2.status_code, 400)
        self.assertIn("already registered", res2.json()["detail"].lower())

    def test_06_user_login_success_and_jwt_generation(self):
        email = f"login_success_{uuid.uuid4().hex[:6]}@example.com"
        password = "MyStrongPassword2026!"
        register_payload = {
            "name": "Login Tester",
            "email": email,
            "password": password,
            "role": "innovator",
            "phone_number": "+1234567890",
            "organization": "Test Labs",
            "designation": "Innovator",
            "country": "USA",
            "research_domain": "Technology",
        }
        res_reg = client.post("/auth/register", json=register_payload)
        self.assertEqual(res_reg.status_code, 201)

        res_login = client.post(
            "/auth/login",
            data={
                "username": email,
                "password": password,
            },
        )
        self.assertEqual(res_login.status_code, 200)
        login_data = res_login.json()
        self.assertIn("access_token", login_data)
        self.assertEqual(login_data["token_type"], "bearer")

        token = login_data["access_token"]
        decoded = decode_access_token(token)
        self.assertEqual(decoded["email"], email.lower())
        self.assertEqual(decoded["role"], "innovator")

    def test_07_login_incorrect_password(self):
        email = f"login_fail_{uuid.uuid4().hex[:6]}@example.com"
        register_payload = {
            "name": "Wrong Pass Tester",
            "email": email,
            "password": "CorrectPassword123!",
            "role": "researcher",
            "phone_number": "+1234567890",
            "organization": "Test University",
            "designation": "Researcher",
            "country": "USA",
            "research_domain": "Computer Science",
        }
        client.post("/auth/register", json=register_payload)

        res_login = client.post(
            "/auth/login",
            data={
                "username": email,
                "password": "WrongPassword123!",
            },
        )
        self.assertEqual(res_login.status_code, 401)
        self.assertIn("invalid", res_login.json()["detail"].lower())

    def test_08_login_non_existent_email(self):
        res_login = client.post(
            "/auth/login",
            data={
                "username": "doesnotexist@example.com",
                "password": "anypassword",
            },
        )
        self.assertEqual(res_login.status_code, 401)
        self.assertIn("invalid", res_login.json()["detail"].lower())

    def test_09_get_current_user_with_valid_token(self):
        email = f"me_test_{uuid.uuid4().hex[:6]}@example.com"
        password = "ProfilePassword123!"
        register_payload = {
            "name": "Profile User",
            "email": email,
            "password": password,
            "role": "researcher",
            "organization": "MIT",
            "country": "USA",
            "phone_number": "+1234567890",
            "designation": "Researcher",
            "research_domain": "Computer Science",
        }
        res_reg = client.post("/auth/register", json=register_payload)
        self.assertEqual(res_reg.status_code, 201)

        res_login = client.post(
            "/auth/login",
            data={
                "username": email,
                "password": password,
            },
        )
        token = res_login.json()["access_token"]

        res_me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_me.status_code, 200)
        user_info = res_me.json()
        self.assertEqual(user_info["email"], email.lower())
        self.assertEqual(user_info["organization"], "MIT")
        self.assertNotIn("password", user_info)

    def test_10_get_current_user_with_missing_and_invalid_token(self):
        # Missing header
        res_missing = client.get("/auth/me")
        self.assertEqual(res_missing.status_code, 401)

        # Invalid token string
        res_invalid = client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
        self.assertEqual(res_invalid.status_code, 401)

        # Expired token
        expired_token = create_access_token(data={"sub": str(uuid.uuid4())}, expires_delta=timedelta(minutes=-5))
        res_expired = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(res_expired.status_code, 401)


if __name__ == "__main__":
    unittest.main()
