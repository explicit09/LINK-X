# Database Migrations

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
