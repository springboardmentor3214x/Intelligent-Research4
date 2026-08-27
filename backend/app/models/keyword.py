import uuid

from sqlalchemy import String, Table, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base


profile_keywords = Table(
    "profile_keywords",
    Base.metadata,
    Column(
        "research_profile_id",
        UUID(as_uuid=True),
        ForeignKey("research_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "keyword_id",
        UUID(as_uuid=True),
        ForeignKey("keywords.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Keyword(Base):
    __tablename__ = "keywords"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    research_profiles = relationship(
        "ResearchProfile",
        secondary=profile_keywords,
        back_populates="keywords"
    )