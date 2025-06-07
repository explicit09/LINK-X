#!/bin/bash
# Start LEARN-X Platform with Embedding Workers

set -e

echo "🚀 Starting LEARN-X Platform with Production Workers..."
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

# Check for OpenAI API key
if ! grep -q "OPENAI_API_KEY" docker-image/.env || grep -q "OPENAI_API_KEY=$" docker-image/.env || grep -q "OPENAI_API_KEY=\"\"" docker-image/.env; then
    echo "⚠️  Warning: OPENAI_API_KEY not found or empty in docker-image/.env"
    echo "Workers will use database-stored API keys if available."
fi

echo "✅ Pre-flight checks passed"
echo ""

# Build the Docker image if needed
echo "📦 Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting services with workers..."
echo ""

# Start all services including workers
# Using profiles: dev (includes backend), workers (includes pgmq-worker)
docker-compose --profile dev --profile workers up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🔍 Checking worker health..."
docker-compose logs pgmq-worker --tail 20

echo ""
echo "✅ Platform started successfully!"
echo ""
echo "📍 Access points:"
echo "   - Backend API: http://localhost:8000"
echo "   - Redis: localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "   - View logs: docker-compose logs -f [service]"
echo "   - Stop all: docker-compose down"
echo "   - Worker logs: docker-compose logs -f pgmq-worker"
echo "   - Backend logs: docker-compose logs -f backend"
echo ""
echo "💡 Workers are configured to:"
echo "   - Process embedding jobs automatically"
echo "   - Respect budget limits ($30/day for embeddings)"
echo "   - Use adaptive rate limiting"
echo "   - Handle failures with retry logic"