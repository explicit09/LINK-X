"""Initial migration from existing schema

Revision ID: 001_initial
Revises: 
Create Date: 2025-05-28T15:56:46.513115

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This migration assumes the database already has the schema
    # from the SQL migrations. We'll just mark it as complete.
    # Future migrations will use Alembic's autogenerate feature.
    
    # Create alembic_version table if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS alembic_version (
            version_num VARCHAR(32) NOT NULL,
            CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
        );
    """)
    
    # Note: The actual schema is already created by SQL migrations
    # This is just a placeholder to establish the baseline
    pass


def downgrade() -> None:
    # We don't support downgrading the initial schema
    pass
