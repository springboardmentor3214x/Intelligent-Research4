import uuid

from sqlalchemy import String, Text, Table, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base


profile_research_areas = Table(
    "profile_research_areas",
    Base.metadata,
    Column(
        "research_profile_id",
        UUID(as_uuid=True),
        ForeignKey("research_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "research_area_id",
        UUID(as_uuid=True),
        ForeignKey("research_areas.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class ResearchArea(Base):
    __tablename__ = "research_areas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    research_profiles = relationship(
        "ResearchProfile",
        secondary=profile_research_areas,
        back_populates="research_areas"
    )