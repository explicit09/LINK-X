#!/bin/bash
set -e

# Install dependencies
pip install -r src/requirements-migration.txt

# Run migrations
cd src
python run_migrations.py

# Start the application
exec "$@"
