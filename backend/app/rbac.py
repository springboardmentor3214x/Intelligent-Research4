from fastapi import HTTPException, Depends, status
from app.models.user import UserRole, User
# Pointing directly to your project's auth dependency path
from app.auth.dependencies import get_current_user  

# Define your project matrix permissions
PERMISSIONS = {
    "discover_funding": [
        UserRole.ADMINISTRATOR, 
        UserRole.RESEARCHER, 
        UserRole.STARTUP_FOUNDER, 
        UserRole.INNOVATION_MANAGER
    ],
    "submit_patent": [
        UserRole.ADMINISTRATOR, 
        UserRole.RESEARCHER, 
        UserRole.STARTUP_FOUNDER
    ],
    "manage_platform": [
        UserRole.ADMINISTRATOR
    ],
    "evaluate_innovation": [
        UserRole.ADMINISTRATOR, 
        UserRole.INNOVATION_MANAGER
    ],
}

class RoleChecker:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(self, current_user: User = Depends(get_current_user)):
        # 1. System sanity validation
        if self.required_permission not in PERMISSIONS:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="System configuration error: Permission key invalid."
            )
        
        # 2. Match role against allowed permission values
        if current_user.role not in PERMISSIONS[self.required_permission]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You do not have permissions for this action."
            )
            
        return current_user
