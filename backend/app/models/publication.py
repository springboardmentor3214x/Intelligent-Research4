import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base


class Publication(Base):
    __tablename__ = "publications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    research_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("research_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    title: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    authors: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    publication_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    journal_or_conference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    publication_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    research_domain: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    keywords: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    doi: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    publication_link: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    research_profile = relationship(
        "ResearchProfile",
        back_populates="publications"
    )