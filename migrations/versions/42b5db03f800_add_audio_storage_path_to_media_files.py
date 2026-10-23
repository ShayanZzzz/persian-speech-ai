"""add audio storage path to media files

Revision ID: 42b5db03f800
Revises: a23874ca3097
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "42b5db03f800"
down_revision: Union[str, Sequence[str], None] = "a23874ca3097"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "media_files",
        sa.Column("storage_path", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("media_files", "storage_path")
