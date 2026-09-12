import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base


class FundingOpportunity(Base):
    __tablename__ = "funding_opportunities"

    __table_args__ = (
        UniqueConstraint(
            "source",
            "source_id",
            name="uq_funding_opportunities_source_source_id",
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

    opportunity_number: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    agency: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    funding_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    funding_amount: Mapped[float | None] = mapped_column(
        Numeric(15, 2),
        nullable=True,
    )

    open_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        index=True,
    )

    close_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        index=True,
    )

    eligibility: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    funding_category: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    research_area: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    country: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    status: Mapped[str | None] = mapped_column(
        String(50),
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