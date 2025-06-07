FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker code
COPY pgmq_embedding_worker.py .

# Set environment variables
ENV PYTHONPATH=/app
ENV WORKER_ID=docker-worker

# Run the worker
CMD ["python", "pgmq_embedding_worker.py"]