import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base


class TechnologyActivity(Base):
    __tablename__ = "technology_activity"

    __table_args__ = (
        UniqueConstraint(
            "technology_id",
            "year",
            name="uq_technology_activity_technology_year",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    technology_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("technologies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    research_paper_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    patent_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    citation_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    organization_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    application_diversity: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
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