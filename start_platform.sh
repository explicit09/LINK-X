#!/bin/bash
# Start LEARN-X Platform (includes workers automatically)

set -e

echo "🚀 Starting LEARN-X Platform..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if .env file exists
if [ ! -f "docker-image/.env" ]; then
    echo "❌ docker-image/.env file not found!"
    echo "Please ensure you have configured your environment variables."
    exit 1
fi

echo "✅ Pre-flight checks passed"
echo ""

# Build if needed and start all services
echo "🚀 Starting all services (including 3 embedding workers)..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to initialize..."
sleep 10

# Show status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Platform started successfully!"
echo ""
echo "📍 Access points:"
echo "   - Backend API: http://localhost:8000"
echo "   - Health Check: http://localhost:8000/api/v2/health"
echo ""
echo "🤖 Workers:"
echo "   - 3 PGMQ embedding workers started automatically"
echo "   - Processing embeddings with budget protection"
echo "   - View logs: docker-compose logs -f pgmq-worker"
echo ""
echo "📋 Commands:"
echo "   - Stop all: docker-compose down"
echo "   - View logs: docker-compose logs -f [service]"
echo "   - Scale workers: docker-compose up -d --scale pgmq-worker=5"