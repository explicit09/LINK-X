# Optimized Production Dockerfile for LINK-X
# Supabase Storage + Automatic Embeddings + Clean Dependencies
FROM python:3.11-slim

# Build arguments
ARG BUILD_ENV=production
ARG WORKERS=4
ARG THREADS=2

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r linkx && useradd -r -g linkx -d /app -s /bin/bash linkx

WORKDIR /app

# Copy and install Python requirements
COPY docker-image/src/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip cache purge

# Copy application code
COPY --chown=linkx:linkx docker-image/src/ ./src/
COPY --chown=linkx:linkx docker-image/scripts/ ./scripts/
COPY --chown=linkx:linkx docker-image/docker/ ./docker/

# Create necessary directories and set permissions
RUN mkdir -p logs \
    && chown -R linkx:linkx /app \
    && find /app -type f -exec chmod 644 {} \; \
    && find /app -type d -exec chmod 755 {} \; \
    && find /app/scripts -name "*.py" -exec chmod 755 {} \; \
    && find /app/docker -name "*.sh" -exec chmod 755 {} \;

# Switch to non-root user
USER linkx

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/src \
    PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/v2/health || exit 1

EXPOSE ${PORT}

# Production command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "--chdir", "src", "wsgi:app"]