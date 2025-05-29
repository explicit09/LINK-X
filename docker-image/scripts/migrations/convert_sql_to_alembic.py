#!/usr/bin/env python3
"""
Convert existing SQL migrations to Alembic format
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Add src to path
src_path = Path(__file__).parent.parent.parent / 'src'
sys.path.insert(0, str(src_path))


def create_initial_migration():
    """Create initial Alembic migration from existing schema"""
    
    migration_content = '''"""Initial migration from existing schema

Revision ID: 001_initial
Revises: 
Create Date: {timestamp}

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
'''.format(timestamp=datetime.now().isoformat())
    
    # Create the migration file
    versions_dir = src_path / 'db' / 'alembic' / 'versions'
    versions_dir.mkdir(exist_ok=True)
    
    migration_file = versions_dir / '001_initial_migration.py'
    with open(migration_file, 'w') as f:
        f.write(migration_content)
        
    print(f"Created initial migration: {migration_file}")
    return migration_file


def create_migration_readme():
    """Create README for migrations"""
    readme_content = '''# Database Migrations

This directory contains Alembic database migrations.

## Usage

Use the alembic_manager.py script to manage migrations:

```bash
# Create a new migration
python scripts/migrations/alembic_manager.py create "Add new feature"

# Upgrade database to latest
python scripts/migrations/alembic_manager.py upgrade

# Downgrade one revision
python scripts/migrations/alembic_manager.py downgrade

# Show migration history
python scripts/migrations/alembic_manager.py history

# Show current revision
python scripts/migrations/alembic_manager.py current
```

## Initial Setup

The initial migration (001_initial) establishes a baseline from the existing SQL migrations.
All future schema changes should use Alembic migrations.

## Migration Naming Convention

Migrations are named with:
- Timestamp prefix (YYYYMMDD_HHMM)
- Revision ID
- Descriptive slug

Example: `20231201_1430-002_add_user_preferences`
'''
    
    readme_file = src_path / 'db' / 'alembic' / 'README.md'
    with open(readme_file, 'w') as f:
        f.write(readme_content)
        
    print(f"Created README: {readme_file}")
    return readme_file


def main():
    """Main entry point"""
    print("Converting SQL migrations to Alembic format...")
    
    # Create initial migration
    migration_file = create_initial_migration()
    
    # Create README
    readme_file = create_migration_readme()
    
    print("\nConversion complete!")
    print("\nNext steps:")
    print("1. Review the initial migration file")
    print("2. Run: python scripts/migrations/alembic_manager.py stamp 001_initial")
    print("   This will mark the current database as being at the initial migration")
    print("3. Future migrations can be created with:")
    print("   python scripts/migrations/alembic_manager.py create 'Description'")


if __name__ == '__main__':
    main()