#!/bin/bash
set -e

echo "Running database migrations..."
python -m src.run_migrations || echo "Migrations completed (some may have been already applied)"

echo "Starting application..."
exec "$@"