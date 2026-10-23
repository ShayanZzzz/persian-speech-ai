"""baseline existing database schema

Revision ID: 4cb29a635d3b
Revises:
Create Date: 2026-10-23 04:18:09.631565
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "4cb29a635d3b"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["owner_user_id"], ["users.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_organizations_owner_user_id",
        "organizations",
        ["owner_user_id"],
        unique=False,
    )

    op.create_table(
        "organization_api_keys",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("key_prefix", sa.String(24), nullable=False),
        sa.Column("key_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint(
            "key_hash", name="organization_api_keys_key_hash_key"
        ),
    )
    op.create_index(
        "ix_organization_api_keys_organization_id",
        "organization_api_keys",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_organization_api_keys_key_prefix",
        "organization_api_keys",
        ["key_prefix"],
        unique=False,
    )

    op.create_table(
        "guest_usage",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("files_used", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_guest_usage_token_hash",
        "guest_usage",
        ["token_hash"],
        unique=True,
    )

    op.create_table(
        "media_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("media_type", sa.String(20), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("detected_language", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_media_files_public_id", "media_files", ["public_id"], unique=True
    )
    op.create_index(
        "ix_media_files_user_id", "media_files", ["user_id"], unique=False
    )

    # media_file_id is added by the next migration.
    op.create_table(
        "transcription_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("language", sa.String(20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("mode", sa.String(50), nullable=True),
        sa.Column("segments", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="SET NULL"
        ),
    )
    op.create_index(
        "ix_transcription_history_user_id",
        "transcription_history",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_transcription_history_organization_id",
        "transcription_history",
        ["organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_transcription_history_organization_id",
        table_name="transcription_history",
    )
    op.drop_index(
        "ix_transcription_history_user_id",
        table_name="transcription_history",
    )
    op.drop_table("transcription_history")

    op.drop_index("ix_media_files_user_id", table_name="media_files")
    op.drop_index("ix_media_files_public_id", table_name="media_files")
    op.drop_table("media_files")

    op.drop_index("ix_guest_usage_token_hash", table_name="guest_usage")
    op.drop_table("guest_usage")

    op.drop_index(
        "ix_organization_api_keys_key_prefix",
        table_name="organization_api_keys",
    )
    op.drop_index(
        "ix_organization_api_keys_organization_id",
        table_name="organization_api_keys",
    )
    op.drop_table("organization_api_keys")

    op.drop_index(
        "ix_organizations_owner_user_id", table_name="organizations"
    )
    op.drop_table("organizations")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
