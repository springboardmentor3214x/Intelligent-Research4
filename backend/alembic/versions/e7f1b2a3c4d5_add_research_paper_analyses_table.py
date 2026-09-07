"""add research paper analyses table

Revision ID: e7f1b2a3c4d5
Revises: aa01dc431e9c
Create Date: 2026-09-06 19:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e7f1b2a3c4d5'
down_revision: Union[str, Sequence[str], None] = 'aa01dc431e9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'research_paper_analyses',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('paper_id', sa.UUID(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('research_problem', sa.Text(), nullable=False),
        sa.Column('methodology', sa.Text(), nullable=False),
        sa.Column('key_findings', sa.JSON(), nullable=False),
        sa.Column('limitations', sa.JSON(), nullable=False),
        sa.Column('future_directions', sa.JSON(), nullable=False),
        sa.Column('content_scope', sa.String(length=50), nullable=False),
        sa.Column('model_used', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['paper_id'], ['research_papers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('paper_id', name='uq_research_paper_analyses_paper_id')
    )
    op.create_index(
        op.f('ix_research_paper_analyses_paper_id'),
        'research_paper_analyses',
        ['paper_id'],
        unique=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_research_paper_analyses_paper_id'),
        table_name='research_paper_analyses'
    )
    op.drop_table('research_paper_analyses')
