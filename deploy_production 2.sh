#!/bin/bash
# Production deployment script for LINK-X

set -e  # Exit on error

echo "🚀 Starting LINK-X Production Deployment"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f "./docker-image/.env" ]; then
    echo -e "${RED}Error: .env file not found in docker-image directory${NC}"
    echo "Please create docker-image/.env with required environment variables"
    exit 1
fi

# Function to check if a service is healthy
check_health() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $service to be healthy...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f docker-compose.production.yml ps | grep -q "$service.*healthy"; then
            echo -e "${GREEN}✓ $service is healthy${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}✗ $service failed to become healthy${NC}"
    return 1
}

# Step 1: Build production image
echo -e "${YELLOW}Building production Docker image...${NC}"
cd docker-image
docker build -f docker/Dockerfile.prod -t linkx:prod . || {
    echo -e "${RED}Failed to build Docker image${NC}"
    exit 1
}
cd ..

# Step 2: Set production environment
export DOCKER_ENV=prod
export FLASK_ENV=production
export PORT=8000
export USE_S3_STORAGE=true
export CELERY_CONCURRENCY=4

# Step 3: Stop existing services
echo -e "${YELLOW}Stopping existing services...${NC}"
docker-compose --profile prod down

# Step 4: Start all production services
echo -e "${YELLOW}Starting production services...${NC}"
docker-compose --profile prod --profile monitoring up -d

# Step 5: Wait for services to be healthy
check_health "redis"
check_health "backend"

# Step 6: Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose run --rm backend bash -c "cd /app/src/db && alembic upgrade head"

# Step 7: Show service status
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "${YELLOW}Service Status:${NC}"
docker-compose --profile prod --profile monitoring ps

# Step 8: Show logs location
echo -e "\n${YELLOW}View logs:${NC}"
echo "All services: docker-compose logs -f"
echo "Backend only: docker-compose logs -f backend"
echo "Workers only: docker-compose logs -f celery-worker"

# Step 10: Show URLs
echo -e "\n${GREEN}=== Access URLs ===${NC}"
echo "API: http://localhost:8000"
echo "Health: http://localhost:8000/api/health"
echo "Flower: http://localhost:5555"

# Step 11: Performance monitoring
echo -e "\n${YELLOW}To monitor performance:${NC}"
echo "docker exec -it backend python scripts/monitor_performance.py"

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"