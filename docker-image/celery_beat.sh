#!/bin/bash
# Start Celery beat scheduler

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

LOGLEVEL="${CELERY_LOGLEVEL:-info}"

echo "Starting Celery beat scheduler"

# Start beat
celery -A src.celery_app beat \
    --loglevel="$LOGLEVEL" \
    --pidfile="/tmp/celerybeat.pid" \
    --schedule="/tmp/celerybeat-schedule"