import uuid

from sqlalchemy import String, Table, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base


profile_technology_areas = Table(
    "profile_technology_areas",
    Base.metadata,
    Column(
        "research_profile_id",
        UUID(as_uuid=True),
        ForeignKey("research_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "technology_area_id",
        UUID(as_uuid=True),
        ForeignKey("technology_areas.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class TechnologyArea(Base):
    __tablename__ = "technology_areas"

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

    research_profiles = relationship(
        "ResearchProfile",
        secondary=profile_technology_areas,
        back_populates="technology_areas"
    )