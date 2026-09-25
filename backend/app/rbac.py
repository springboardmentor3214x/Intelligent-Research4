from fastapi import HTTPException, Depends, status
from typing import Dict, List
from backend.app.models.user import User
from backend.app.auth.dependencies import get_current_user

# Define system permissions matrix across roles
PERMISSIONS: Dict[str, List[str]] = {
    "discover_funding": [
        "administrator",
        "researcher",
        "startup_founder",
        "innovation_manager",
        "innovator",
        "investor",
        "reviewer",
    ],
    "submit_patent": [
        "administrator",
        "researcher",
        "startup_founder",
        "innovator",
    ],
    "manage_platform": [
        "administrator",
    ],
    "evaluate_innovation": [
        "administrator",
        "innovation_manager",
        "reviewer",
    ],
}


class RoleChecker:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        # 1. System sanity validation
        if self.required_permission not in PERMISSIONS:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="System configuration error: Permission key invalid.",
            )

        user_role = (current_user.role or "").strip().lower()

        # 2. Match role against allowed permission values
        if user_role not in PERMISSIONS[self.required_permission]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You do not have permissions for this action.",
            )

        return current_user
