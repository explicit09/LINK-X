#!/bin/bash
# Start Flower monitoring dashboard

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

PORT="${FLOWER_PORT:-5555}"
BASIC_AUTH="${FLOWER_BASIC_AUTH:-admin:password}"

echo "Starting Flower monitoring on port $PORT"

# Start Flower
celery -A src.celery_app flower \
    --port="$PORT" \
    --persistent=true \
    --db="/tmp/flower.db" \
    --max_tasks=10000