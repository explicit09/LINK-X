#!/bin/bash
set -e

# Celery-specific entrypoint script
echo "Starting Celery worker..."

# Export necessary environment variables
export PYTHONPATH=/app:$PYTHONPATH
export C_FORCE_ROOT=1  # Allow running as root in Docker

# Change to app directory
cd /app

# Check which Celery command to run
CELERY_COMMAND=${1:-worker}

case "$CELERY_COMMAND" in
  worker)
    echo "Starting Celery worker..."
    exec celery -A src.celery_app worker \
      --loglevel=${CELERY_LOG_LEVEL:-info} \
      --concurrency=${CELERY_CONCURRENCY:-2} \
      --max-tasks-per-child=${CELERY_MAX_TASKS:-100} \
      --time-limit=${CELERY_TIME_LIMIT:-3600} \
      --soft-time-limit=${CELERY_SOFT_TIME_LIMIT:-3000}
    ;;
  beat)
    echo "Starting Celery beat scheduler..."
    exec celery -A src.celery_app beat \
      --loglevel=${CELERY_LOG_LEVEL:-info}
    ;;
  flower)
    echo "Starting Celery Flower monitoring..."
    exec celery -A src.celery_app flower \
      --port=${FLOWER_PORT:-5555} \
      --basic-auth=${FLOWER_AUTH:-admin:admin}
    ;;
  *)
    echo "Unknown command: $CELERY_COMMAND"
    exit 1
    ;;
esac