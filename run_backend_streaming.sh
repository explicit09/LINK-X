#!/bin/bash
cd docker-image
echo "Starting backend with streaming support..."

# Use gunicorn with gevent workers for proper streaming support
python -m pip install gunicorn gevent

# Run with gevent async workers which support streaming
gunicorn -w 1 -k gevent --bind 0.0.0.0:8080 --timeout 120 src.app:app