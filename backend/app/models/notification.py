import uuid
from datetime import datetime

<<<<<<< HEAD
from sqlalchemy import String, Text, DateTime, Boolean, ForeignKey, Index
=======
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
>>>>>>> origin/feature/module10-11-notifications-reports
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
<<<<<<< HEAD
        default=uuid.uuid4
=======
        default=uuid.uuid4,
>>>>>>> origin/feature/module10-11-notifications-reports
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
<<<<<<< HEAD
        index=True
    )

    notification_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True
=======
        index=True,
    )

    notification_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
>>>>>>> origin/feature/module10-11-notifications-reports
    )

    title: Mapped[str] = mapped_column(
        String(255),
<<<<<<< HEAD
        nullable=False
=======
        nullable=False,
>>>>>>> origin/feature/module10-11-notifications-reports
    )

    message: Mapped[str] = mapped_column(
        Text,
<<<<<<< HEAD
        nullable=False
    )

    related_module: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    related_record_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
=======
        nullable=False,
    )

    related_module: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    related_record_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
>>>>>>> origin/feature/module10-11-notifications-reports
    )

    priority: Mapped[str] = mapped_column(
        String(20),
<<<<<<< HEAD
        default="NORMAL",
        nullable=False
=======
        nullable=False,
        default="NORMAL",
>>>>>>> origin/feature/module10-11-notifications-reports
    )

    is_read: Mapped[bool] = mapped_column(