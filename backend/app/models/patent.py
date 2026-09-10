import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base


class Patent(Base):
    __tablename__ = "patents"

    __table_args__ = (
        UniqueConstraint(
            "source",
            "source_id",
            name="uq_patents_source_source_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    source_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    publication_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    abstract: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    assignee: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        index=True,
    )

    inventors: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    filing_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        index=True,
    )

    publication_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        index=True,
    )

    classification: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    technology_domain: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    citation_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    status: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    official_link: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )