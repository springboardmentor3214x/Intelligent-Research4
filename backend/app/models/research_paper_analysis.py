import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base


class ResearchPaperAnalysis(Base):
    __tablename__ = "research_paper_analyses"

    __table_args__ = (
        UniqueConstraint("paper_id", name="uq_research_paper_analyses_paper_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("research_papers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    research_problem: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    methodology: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    key_findings: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    limitations: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    future_directions: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    content_scope: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="abstract_and_metadata",
    )

    paper_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    source_coverage: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="medium",
    )

    analysis_data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    model_used: Mapped[str | None] = mapped_column(
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

    paper = relationship(
        "ResearchPaper",
        back_populates="analysis",
        lazy="joined",
    )

