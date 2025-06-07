#!/bin/bash
# LEARN-X Optimized Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo -e "${GREEN}🚀 LEARN-X Deployment Script${NC}"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f "docker-image/.env" ]; then
    echo -e "${YELLOW}⚠️  Warning: docker-image/.env file not found!${NC}"
    echo "Creating from .env.production template..."
    
    if [ -f ".env.production.template" ]; then
        cp .env.production.template docker-image/.env
        echo -e "${GREEN}✅ Created .env file from template${NC}"
        echo -e "${YELLOW}Please edit docker-image/.env with your actual Supabase values before proceeding.${NC}"
        exit 1
    elif [ -f "docker-image/.env.template" ]; then
        cp docker-image/.env.template docker-image/.env
        echo -e "${GREEN}✅ Created .env file from template${NC}"
        echo -e "${YELLOW}Please edit docker-image/.env with your actual Supabase values before proceeding.${NC}"
        exit 1
    else
        echo -e "${RED}❌ No .env template found!${NC}"
        exit 1
    fi
fi

# Parse command line arguments
ENVIRONMENT=${1:-production}
WORKERS=${2:-3}

echo -e "${GREEN}Configuration:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  Worker Count: $WORKERS"
echo ""

# Export environment variables
export FLASK_ENV=$ENVIRONMENT
export EMBEDDING_WORKERS=$WORKERS

# Build with BuildKit caching
echo -e "${GREEN}📦 Building optimized Docker image with BuildKit...${NC}"
docker-compose build --progress=plain

# Start all services (workers are now included automatically)
echo -e "${GREEN}🚀 Starting all services...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
echo -e "${GREEN}🏥 Checking service health...${NC}"
docker-compose ps

# Verify backend is responding
echo -e "${GREEN}🔍 Verifying backend health...${NC}"
if curl -f -s http://localhost:8000/api/v2/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "Checking logs..."
    docker-compose logs backend --tail 50
    exit 1
fi

# Show worker status
echo -e "${GREEN}🤖 Worker Status:${NC}"
docker-compose logs pgmq-worker --tail 10

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📍 Access points:"
echo "   - Backend API: http://localhost:8000"
echo "   - Health Check: http://localhost:8000/api/v2/health"
echo ""
echo "📊 Monitor services:"
echo "   - All logs: docker-compose logs -f"
echo "   - Backend: docker-compose logs -f backend"
echo "   - Workers: docker-compose logs -f pgmq-worker"
echo ""
echo "🛑 To stop all services:"
echo "   docker-compose down"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   - Workers are processing embeddings automatically"
echo "   - Budget protection is active (configured in database)"
echo "   - All services have health checks configured"