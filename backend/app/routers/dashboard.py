from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import require_roles
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.services.dashboard_service import (
    get_innovation_manager_dashboard,
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard & Analytics (Module 9)"],
)


@router.get("/innovation-manager")
def innovation_manager_dashboard(
    current_user: User = Depends(require_roles("innovation_manager")),
    db: Session = Depends(get_db),
):
    """
    Module 9: Innovation Manager Dashboard.

    Access is restricted at the backend to users with the
    innovation_manager role.
    """
    return get_innovation_manager_dashboard(db)