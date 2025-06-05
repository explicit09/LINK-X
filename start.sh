#!/bin/bash
# Railway start script
echo "Starting on PORT: $PORT"
exec gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 1 --timeout 120 app_minimal:app