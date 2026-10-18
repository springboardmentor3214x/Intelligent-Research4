"""merge migration heads

Revision ID: 77c3e42036da
Revises: 759f79f4a065, e4a8b72d1f05
Create Date: 2026-09-29 21:09:44.789934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '77c3e42036da'
down_revision: Union[str, Sequence[str], None] = ('759f79f4a065', 'e4a8b72d1f05')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
