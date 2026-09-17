"""add department to users table

Revision ID: c8f3a9b12e01
Revises: 15136814ff82
Create Date: 2026-09-04 20:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f3a9b12e01'
down_revision: Union[str, Sequence[str], None] = '15136814ff82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('department', sa.String(length=150), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'department')
