import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base


class ProfilePatent(Base):
    __tablename__ = "profile_patents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    research_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("research_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    patent_title: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    patent_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    inventor: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    filing_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    publication_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    patent_status: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    patent_domain: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    patent_link: Mapped[str | None] = mapped_column(
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

    research_profile = relationship(
        "ResearchProfile",
        back_populates="patents",
    )
