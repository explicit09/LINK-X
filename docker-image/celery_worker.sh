#!/bin/bash
# Start Celery worker

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Configuration
WORKER_NAME="${CELERY_WORKER_NAME:-worker1}"
CONCURRENCY="${CELERY_CONCURRENCY:-4}"
LOGLEVEL="${CELERY_LOGLEVEL:-info}"
QUEUES="${CELERY_QUEUES:-critical,high,default,low,embeddings}"

echo "Starting Celery worker: $WORKER_NAME"
echo "Concurrency: $CONCURRENCY"
echo "Queues: $QUEUES"

# Start worker
celery -A src.celery_app worker \
    --hostname="${WORKER_NAME}@%h" \
    --concurrency="$CONCURRENCY" \
    --loglevel="$LOGLEVEL" \
    --queues="$QUEUES" \
    --pool=prefork \
    --max-tasks-per-child=100 \
    --time-limit=3600 \
    --soft-time-limit=3000 \
    --without-gossip \
    --without-mingle \
    --without-heartbeat