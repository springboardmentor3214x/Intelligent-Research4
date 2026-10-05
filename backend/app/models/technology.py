import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base


class Technology(Base):
    __tablename__ = "technologies"

    __table_args__ = (
        UniqueConstraint(
            "technology_name",
            name="uq_technologies_technology_name",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    technology_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    technology_domain: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    research_paper_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    citation_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    patent_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    funding_opportunity_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    research_growth_rate: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    patent_growth_rate: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    funding_growth_rate: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    emerging_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    emerging_status: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )

    source: Mapped[str | None] = mapped_column(
        String(100),
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