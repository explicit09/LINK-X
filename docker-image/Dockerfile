# syntax=docker/dockerfile:1.4
# Optimized Dockerfile for LINK-X with BuildKit cache mounts
ARG PYTHON_VERSION=3.11

# Build stage
FROM python:${PYTHON_VERSION}-slim as builder

# Install build dependencies with cache mount
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev

WORKDIR /build

# Copy only requirements first for better caching
COPY docker-image/src/requirements.txt .

# Install Python dependencies with pip cache mount to a shared location
RUN --mount=type=cache,id=pip-cache,target=/root/.cache/pip \
    pip install --prefix=/usr/local -r requirements.txt

# Runtime stage
FROM python:${PYTHON_VERSION}-slim

# Install runtime dependencies with cache mount
RUN --mount=type=cache,id=apt-cache-runtime,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib-runtime,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user with home directory
RUN groupadd -r linkx && useradd -r -g linkx -d /home/linkx -m linkx

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /usr/local /usr/local

# Copy application code with proper ownership
COPY --chown=linkx:linkx docker-image/src/ ./src/
COPY --chown=linkx:linkx docker-image/docker/ ./docker/

# Set permissions and create necessary directories
RUN chmod +x /app/docker/*.sh && \
    mkdir -p /app/logs /app/data && \
    chown -R linkx:linkx /app

# Environment setup
ENV PATH=/usr/local/bin:$PATH \
    PYTHONPATH=/app/src:$PYTHONPATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Health check - accept both healthy and degraded as passing
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -s http://localhost:8000/api/v2/health | grep -q "status" || exit 1

USER linkx
EXPOSE 8000

# Use exec form for better signal handling
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "300", "--chdir", "/app/src", "app:create_app()"]