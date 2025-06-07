#!/bin/bash
# LEARN-X Production Deployment Script v2
# Handles deployment with Neon PostgreSQL

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 LEARN-X Production Deployment v2${NC}"
echo "======================================"

# Configuration - Load from environment
PROD_DATABASE_URL="${PROD_DATABASE_URL:-}"
DEV_DATABASE_URL="${DEV_DATABASE_URL:-}"

# Ensure database URLs are set
if [ -z "$PROD_DATABASE_URL" ]; then
    echo -e "${RED}❌ PROD_DATABASE_URL environment variable not set${NC}"
    echo "Please set PROD_DATABASE_URL before running this script"
    exit 1
fi

# Safety check
echo -e "${YELLOW}⚠️  PRODUCTION DEPLOYMENT WARNING${NC}"
echo "This will deploy to the PRODUCTION environment."
echo "Database: Neon PostgreSQL (Production)"
echo -e "\nAre you sure you want to continue? (type 'deploy-production' to confirm): \c"
read -r confirmation

if [ "$confirmation" != "deploy-production" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Step 1: Pre-deployment checks
echo -e "\n${YELLOW}1. Running pre-deployment checks...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

# Check if required files exist
required_files=(
    ".env.production"
    "docker-compose.yml"
    "Dockerfile"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing required file: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# Step 2: Backup production database
echo -e "\n${YELLOW}2. Backing up production database...${NC}"
./scripts/automated-backup.sh backup prod
echo -e "${GREEN}✅ Production backup completed${NC}"

# Step 3: Run tests
echo -e "\n${YELLOW}3. Running test suite...${NC}"
if ./run_tests.sh; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed. Deployment aborted.${NC}"
    exit 1
fi

# Step 4: Build production images
echo -e "\n${YELLOW}4. Building production Docker images...${NC}"

# Build backend
docker build \
    -f Dockerfile \
    -t learnx-backend:latest \
    -t learnx-backend:$(date +%Y%m%d-%H%M%S) \
    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    --build-arg VCS_REF=$(git rev-parse --short HEAD) \
    .

# Build frontend
docker build \
    -t learnx-frontend:latest \
    -t learnx-frontend:$(date +%Y%m%d-%H%M%S) \
    --build-arg NODE_ENV=production \
    ./frontend

echo -e "${GREEN}✅ Docker images built successfully${NC}"

# Step 5: Run database migrations
echo -e "\n${YELLOW}5. Running database migrations...${NC}"
cd docker-image/src
python scripts/execute_migrations.py --env prod
cd ../..
echo -e "${GREEN}✅ Migrations completed${NC}"

# Step 6: Update production environment
echo -e "\n${YELLOW}6. Updating production environment...${NC}"

# Stop current production
docker-compose --profile prod down

# Start new production
docker-compose --profile prod up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 30

# Step 7: Health checks
echo -e "\n${YELLOW}7. Running health checks...${NC}"

# Check backend health
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    docker-compose --profile prod logs backend
    exit 1
fi

# Check frontend health
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    docker-compose --profile prod logs frontend
    exit 1
fi

# Step 8: Deploy monitoring stack
echo -e "\n${YELLOW}8. Deploying monitoring stack...${NC}"
docker-compose -f docker-compose.monitoring.yml up -d
echo -e "${GREEN}✅ Monitoring stack deployed${NC}"

# Step 9: Clear CDN cache
echo -e "\n${YELLOW}9. Clearing CDN cache...${NC}"
if [ -n "$CLOUDFLARE_API_TOKEN" ] && [ -n "$CLOUDFLARE_ZONE_ID" ]; then
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}'
    echo -e "\n${GREEN}✅ CDN cache cleared${NC}"
else
    echo -e "${YELLOW}⚠️  Cloudflare credentials not found, skipping CDN cache clear${NC}"
fi

# Step 10: Post-deployment verification
echo -e "\n${YELLOW}10. Running post-deployment verification...${NC}"

# Test authentication endpoint
if curl -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -s | grep -q "error"; then
    echo -e "${GREEN}✅ Auth endpoint responding correctly${NC}"
else
    echo -e "${RED}❌ Auth endpoint not responding as expected${NC}"
fi

# Check database connectivity
docker-compose --profile prod exec -T backend python -c "
from core.database import db_manager
if db_manager.health_check():
    print('✅ Database connection successful')
else:
    print('❌ Database connection failed')
    exit(1)
"

# Step 11: Update deployment info
echo -e "\n${YELLOW}11. Updating deployment info...${NC}"
cat > deployment-info.json << EOF
{
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "version": "$(git describe --tags --always)",
  "commit": "$(git rev-parse HEAD)",
  "deployed_by": "$USER",
  "environment": "production",
  "database": "neon-postgresql-prod"
}
EOF

# Step 12: Notify deployment
echo -e "\n${BLUE}📊 Deployment Summary${NC}"
echo "======================="
echo -e "Status: ${GREEN}SUCCESS${NC}"
echo "Version: $(git describe --tags --always)"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Time: $(date)"
echo ""
echo -e "${YELLOW}📌 Next Steps:${NC}"
echo "1. Monitor logs: docker-compose --profile prod logs -f"
echo "2. Check metrics: http://localhost:3001 (Grafana)"
echo "3. View alerts: http://localhost:9093 (Alertmanager)"
echo "4. API docs: http://localhost:8000/api/docs"
echo ""
echo -e "${GREEN}✅ Production deployment completed successfully!${NC}"

# Optional: Send notification (Slack, email, etc.)
if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-type: application/json' \
        --data "{
            \"text\": \"✅ LEARN-X Production Deployment Successful\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Version\", \"value\": \"$(git describe --tags --always)\", \"short\": true},
                    {\"title\": \"Deployed By\", \"value\": \"$USER\", \"short\": true},
                    {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": false}
                ]
            }]
        }"
fi