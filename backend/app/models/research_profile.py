import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base


class ResearchProfile(Base):
    __tablename__ = "research_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    research_domain: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    research_interests: Mapped[str | None] = mapped_column(
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

    user = relationship(
        "User",
        backref="research_profile",
        uselist=False
    )

    research_areas = relationship(
        "ResearchArea",
        secondary="profile_research_areas",
        back_populates="research_profiles"
    )

    keywords = relationship(
        "Keyword",
        secondary="profile_keywords",
        back_populates="research_profiles"
    )

    technology_areas = relationship(
        "TechnologyArea",
        secondary="profile_technology_areas",
        back_populates="research_profiles"
    )

    publications = relationship(
        "Publication",
        back_populates="research_profile",
        cascade="all, delete-orphan"
    )

    patents = relationship(
        "ProfilePatent",
        back_populates="research_profile",
        cascade="all, delete-orphan"
    )