"""a

Revision ID: 74debe95020c
Revises: 9b9310682372
Create Date: 2025-07-11 14:40:03.019404

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '74debe95020c'
down_revision: Union[str, None] = '9b9310682372'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
