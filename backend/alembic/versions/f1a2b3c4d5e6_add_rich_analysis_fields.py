"""add rich analysis fields to research paper analyses

Revision ID: f1a2b3c4d5e6
Revises: e7f1b2a3c4d5
Create Date: 2026-09-06 20:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e7f1b2a3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add rich analysis fields."""
    op.add_column('research_paper_analyses', sa.Column('paper_type', sa.String(length=100), nullable=True))
    op.add_column('research_paper_analyses', sa.Column('source_coverage', sa.String(length=50), server_default='medium', nullable=False))
    op.add_column('research_paper_analyses', sa.Column('analysis_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema to remove rich analysis fields."""
    op.drop_column('research_paper_analyses', 'analysis_data')
    op.drop_column('research_paper_analyses', 'source_coverage')
    op.drop_column('research_paper_analyses', 'paper_type')
