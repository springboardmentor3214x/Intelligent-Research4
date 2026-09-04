"""create technology areas table

Revision ID: 3e9a100a4b65
Revises: 7eed7cb42678
Create Date: 2026-08-31 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3e9a100a4b65"
down_revision: Union[str, Sequence[str], None] = "7eed7cb42678"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "technology_areas",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_technology_areas_user_name"),
    )
    op.create_index(op.f("ix_technology_areas_user_id"), "technology_areas", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_technology_areas_user_id"), table_name="technology_areas")
    op.drop_table("technology_areas")
