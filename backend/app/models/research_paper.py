import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base


class ResearchPaper(Base):
    __tablename__ = "research_papers"

    __table_args__ = (
        UniqueConstraint(
            "source",
            "source_id",
            name="uq_research_papers_source_source_id"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )

    source_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    title: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    abstract: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    authors: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    publication_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    publication_year: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        index=True
    )

    journal_or_conference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    keywords: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    research_domain: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
        index=True
    )

    doi: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )

    citation_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
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