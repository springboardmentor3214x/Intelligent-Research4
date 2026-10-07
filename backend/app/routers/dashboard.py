from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import require_roles, get_current_user
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.services.dashboard_service import (
    get_innovation_manager_dashboard,
    get_admin_dashboard_metrics,
    get_admin_users,
    get_admin_recommendations_monitoring,
    get_researcher_dashboard_intelligence,
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard & Analytics (Module 9)"],
)


@router.get("/researcher")
def researcher_dashboard(
    domain: str | None = Query(default=None),
    year_from: int | None = Query(default=None),
    year_to: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Module 9: Researcher Intelligence Command Center Data Aggregator.
    Returns complete real database analytics for research trends, patents, funding, innovation, and AI signals.
    """
    return get_researcher_dashboard_intelligence(
        db=db,
        current_user=current_user,
        domain=domain,
        year_from=year_from,
        year_to=year_to,
    )


@router.get("/innovation-manager")
def innovation_manager_dashboard(
    current_user: User = Depends(require_roles("innovation_manager", "administrator")),
    db: Session = Depends(get_db),
):
    """
    Module 9: Innovation Manager Dashboard.
    Restricted to innovation_manager and administrator roles.
    """
    return get_innovation_manager_dashboard(db)


@router.get("/admin/metrics")
def admin_dashboard_metrics(
    current_user: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """
    Module 9: Admin Dashboard Key Metrics, Role Analytics & System Health.
    Strictly protected by backend RBAC for Administrator only.
    """
    return get_admin_dashboard_metrics(db)


@router.get("/admin/users")
def admin_users_list(
    search: str | None = Query(default=None),
    role: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """
    Module 9: Admin User Management list with search, filter, and pagination.
    Strictly protected by backend RBAC for Administrator only.
    """
    return get_admin_users(
        db=db,
        search=search,
        role=role,
        limit=limit,
        offset=offset,
    )


@router.get("/admin/recommendations")
def admin_recommendations_monitoring(
    current_user: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """
    Module 9: Admin Recommendation Activity Monitoring.
    Strictly protected by backend RBAC for Administrator only.
    """
    return get_admin_recommendations_monitoring(db)