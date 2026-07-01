"""add asset_models table and asset_model_id on assets

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "asset_models",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("manufacturer", sa.Text(), nullable=True),
        sa.Column("model_number", sa.Text(), nullable=True),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("asset_categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("eol_years", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_asset_models_name", "asset_models", ["name"])
    op.create_index("ix_asset_models_manufacturer", "asset_models", ["manufacturer"])

    op.add_column(
        "assets",
        sa.Column(
            "asset_model_id",
            sa.Integer(),
            sa.ForeignKey("asset_models.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("assets", "asset_model_id")
    op.drop_table("asset_models")
