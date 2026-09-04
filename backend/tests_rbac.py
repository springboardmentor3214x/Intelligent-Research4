import os
import unittest
import uuid

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-rbac-testing-12345"

from fastapi.testclient import TestClient

from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.user import User
from backend.tests_common import TestingSessionLocal, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestRBACModule(unittest.TestCase):
    def _create_user_with_role(self, role: str) -> str:
        email = f"user_{role}_{uuid.uuid4().hex[:6]}@example.com"
        password = "SecurePassword123!"

        db = TestingSessionLocal()
        from backend.app.auth.security import hash_password
        user = User(
            name=f"Test {role}",
            email=email.lower(),
            password_hash=hash_password(password),
            role=role,
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

    def test_01_discover_funding_allowed_roles(self):
        # Allowed: researcher, startup_founder, innovation_manager, administrator, etc.
        for role in ["researcher", "startup_founder", "innovation_manager", "administrator"]:
            token = self._create_user_with_role(role)
            res = client.get("/api/v1/platform/funding/search", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(res.status_code, 200, f"Role {role} failed discover_funding")
            self.assertEqual(res.json()["status"], "success")

    def test_02_submit_patent_rbac_permissions(self):
        # Allowed: researcher, startup_founder, administrator
        # Denied: innovation_manager
        res_token = self._create_user_with_role("researcher")
        res = client.post("/api/v1/platform/patents/submit", headers={"Authorization": f"Bearer {res_token}"})
        self.assertEqual(res.status_code, 200)

        mgr_token = self._create_user_with_role("innovation_manager")
        mgr_res = client.post("/api/v1/platform/patents/submit", headers={"Authorization": f"Bearer {mgr_token}"})
        self.assertEqual(mgr_res.status_code, 403)
        self.assertIn("Access Denied", mgr_res.json()["detail"])

    def test_03_admin_settings_manage_platform(self):
        admin_token = self._create_user_with_role("administrator")
        res_admin = client.get("/api/v1/platform/admin/settings", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res_admin.status_code, 200)

        user_token = self._create_user_with_role("researcher")
        res_user = client.get("/api/v1/platform/admin/settings", headers={"Authorization": f"Bearer {user_token}"})
        self.assertEqual(res_user.status_code, 403)

    def test_04_unauthenticated_request_rejected(self):
        res = client.get("/api/v1/platform/funding/search")
        self.assertEqual(res.status_code, 401)


if __name__ == "__main__":
    unittest.main()
