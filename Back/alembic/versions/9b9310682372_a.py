"""a

Revision ID: 9b9310682372
Revises: d7f246368884
Create Date: 2025-07-11 14:39:58.151404

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b9310682372'
down_revision: Union[str, None] = 'd7f246368884'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
