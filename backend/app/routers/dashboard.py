from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import require_roles, get_current_user
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.services.dashboard_service import (
    get_innovation_manager_dashboard,
    get_startup_founder_dashboard,
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
    technology: str | None = Query(default=None),
    year_from: int | None = Query(default=None),
    year_to: int | None = Query(default=None),
    funding_type: str | None = Query(default=None),
    patent_tech: str | None = Query(default=None),
    organization: str | None = Query(default=None),
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
        technology=technology,
        year_from=year_from,
        year_to=year_to,
        funding_type=funding_type,
        patent_tech=patent_tech,
        organization=organization,
    )


@router.get("/startup")
def startup_founder_dashboard(
    domain: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Module 9: Startup Founder Dashboard.
    Returns targeted commercialization intelligence, products, venture grants, and IP signals.
    """
    return get_startup_founder_dashboard(
        db=db,
        current_user=current_user,
        domain=domain,
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


@router.post("/admin/broadcast")
def admin_broadcast_announcement(
    payload: dict,
    current_user: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """
    Module 9/10: Admin Announcement Broadcast Dispatcher.
    Delivers persistent notifications to all targeted users based on audience selection.
    """
    title = payload.get("title", "").strip()
    message = payload.get("message", "").strip()
    audience = payload.get("audience", "all").strip().lower()
    priority = payload.get("priority", "HIGH").strip().upper()

    if not title or not message:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Title and message are required for broadcast.")

    query = db.query(User)
    if audience != "all":
        query = query.filter(User.role.ilike(audience))

    recipients = query.all()
    count = 0
    from backend.app.services.notification_service import create_platform_notification
    for target_user in recipients:
        create_platform_notification(
            db=db,
            user=target_user,
            title=title,
            message=message,
            related_record_id=f"broadcast-{current_user.id}",
            priority=priority if priority in ("LOW", "NORMAL", "HIGH", "URGENT") else "HIGH",
        )
        count += 1

    db.commit()
    return {
        "status": "success",
        "message": f"Broadcast '{title}' successfully delivered to {count} recipient(s).",
        "recipients_count": count,
        "audience": audience,
    }