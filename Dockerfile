# Optimized multi-stage Dockerfile for LINK-X backend
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /build

# Copy requirements
COPY docker-image/src/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage
FROM python:3.11-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r linkx && useradd -r -g linkx linkx

# Set working directory
WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY --chown=linkx:linkx docker-image/src/ ./src/
COPY --chown=linkx:linkx docker-image/docker/ ./docker/

# Make scripts executable
RUN chmod +x /app/docker/*.sh

# Ensure Python can find the packages
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app/src:$PYTHONPATH

# Switch to non-root user
USER linkx

# Expose port
EXPOSE 8000

# Default command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "300", "--chdir", "/app/src", "app:create_app()"]