#!/bin/bash
set -e

# Install dependencies
pip install -r src/requirements-migration.txt

# Run migrations only if SKIP_MIGRATIONS is not set
if [ "$SKIP_MIGRATIONS" != "true" ]; then
    echo "Running migrations..."
    cd src
    python run_migrations.py
    cd ..
else
    echo "Skipping migrations (SKIP_MIGRATIONS=true)"
fi

# Start the application
exec "$@"
