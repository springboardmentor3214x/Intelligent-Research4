"""Add profile_patents and saved_funding tables

Revision ID: e4a8b72d1f05
Revises: 9c8524081965
Create Date: 2026-09-11 18:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'e4a8b72d1f05'
down_revision: Union[str, Sequence[str], None] = '9c8524081965'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Create profile_patents table
    if 'profile_patents' not in existing_tables:
        op.create_table(
            'profile_patents',
            sa.Column('id', UUID(as_uuid=True), nullable=False),
            sa.Column('research_profile_id', UUID(as_uuid=True), nullable=False),
            sa.Column('patent_title', sa.Text(), nullable=False),
            sa.Column('patent_number', sa.String(length=100), nullable=True),
            sa.Column('inventor', sa.Text(), nullable=False),
            sa.Column('filing_date', sa.Date(), nullable=True),
            sa.Column('publication_date', sa.Date(), nullable=True),
            sa.Column('patent_status', sa.String(length=100), nullable=True),
            sa.Column('patent_domain', sa.String(length=150), nullable=True),
            sa.Column('patent_link', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['research_profile_id'], ['research_profiles.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_profile_patents_research_profile_id'), 'profile_patents', ['research_profile_id'], unique=False)

    # 2. Create saved_funding table
    if 'saved_funding' not in existing_tables:
        op.create_table(
            'saved_funding',
            sa.Column('id', UUID(as_uuid=True), nullable=False),
            sa.Column('user_id', UUID(as_uuid=True), nullable=False),
            sa.Column('funding_opportunity_id', UUID(as_uuid=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['funding_opportunity_id'], ['funding_opportunities.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'funding_opportunity_id', name='uq_user_funding_opportunity'),
        )
        op.create_index(op.f('ix_saved_funding_funding_opportunity_id'), 'saved_funding', ['funding_opportunity_id'], unique=False)
        op.create_index(op.f('ix_saved_funding_user_id'), 'saved_funding', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_saved_funding_user_id'), table_name='saved_funding')
    op.drop_index(op.f('ix_saved_funding_funding_opportunity_id'), table_name='saved_funding')
    op.drop_table('saved_funding')
    op.drop_index(op.f('ix_profile_patents_research_profile_id'), table_name='profile_patents')
    op.drop_table('profile_patents')
