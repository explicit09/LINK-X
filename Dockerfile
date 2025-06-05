# Production Dockerfile for Railway
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install requirements
COPY docker-image/src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

# Copy application code
COPY docker-image/src/ ./src/
COPY docker-image/scripts/ ./scripts/

# Create necessary directories
RUN mkdir -p logs data/uploads data/cache

# Set Python path
ENV PYTHONPATH=/app/src:$PYTHONPATH
ENV PYTHONUNBUFFERED=1

# Railway provides PORT env variable
ENV PORT=8000
EXPOSE ${PORT}

# Start command using Railway's PORT
CMD gunicorn --bind 0.0.0.0:${PORT} --workers 2 --threads 2 --timeout 120 --chdir src app:app