import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database.connection import get_db
from backend.app.models.notification import Notification, NotificationPreference
from backend.app.models.user import User
from backend.app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
)
from backend.app.services.notification_service import get_user_preferences

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications (Module 10)"],
)


@router.get(
    "",
    response_model=NotificationListResponse,
)
def get_notifications(
    unread_only: bool = Query(
        default=False,
        description="Return only unread notifications.",
    ),
    category: str | None = Query(
        default=None,
        description="Filter by notification category/type",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )

    if unread_only:
        query = query.filter(Notification.is_read.is_(False))

    if category and category.upper() != "ALL":
        cat_upper = category.upper()
        if cat_upper in ("RESEARCH", "RESEARCH_TREND"):
            query = query.filter(Notification.notification_type.in_(["RESEARCH", "RESEARCH_TREND"]))
        else:
            query = query.filter(Notification.notification_type == cat_upper)

    total = query.count()

    notifications = (
        query
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    unread_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .count()
    )

    return NotificationListResponse(
        items=notifications,
        total=total,
        unread_count=unread_count,
    )


@router.get(
    "/unread",
    response_model=NotificationListResponse,
)
def get_unread_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .order_by(Notification.created_at.desc())
    )

    total = query.count()

    notifications = (
        query
        .offset(offset)
        .limit(limit)
        .all()
    )

    return NotificationListResponse(
        items=notifications,
        total=total,