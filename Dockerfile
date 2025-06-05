# Multi-stage Dockerfile for faster Railway builds
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /build

# Copy requirements
COPY docker-image/src/requirements.txt .

# Install Python dependencies with caching
RUN pip install --user --no-cache-dir -r requirements.txt && \
    pip install --user --no-cache-dir gunicorn

# Runtime stage
FROM python:3.11-slim

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Set working directory
WORKDIR /app

# Copy application code
COPY docker-image/src/ ./src/
COPY docker-image/scripts/ ./scripts/

# Create necessary directories
RUN mkdir -p logs data/uploads data/cache

# Make sure Python finds the packages
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app/src:$PYTHONPATH
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v2/health || exit 1

# Start command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "2", "--timeout", "120", "--chdir", "src", "app:app"]