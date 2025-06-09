#!/bin/bash
# Railway Multi-Service Deployment Helper Script
# This script helps you deploy all LINK-X services to Railway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚂 LINK-X Railway Multi-Service Deployment${NC}"
echo "=========================================="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found!${NC}"
    echo "Please install it first: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI is ready${NC}"
echo ""

# Service order matters - Redis first, then backend, then workers
SERVICES=(
    "redis:Redis Database"
    "backend:Web Server (API)"
    "pgmq-worker:Embedding Worker"
    "celery-worker:Background Task Worker"
    "celery-beat:Task Scheduler"
    "supabase-bridge:File Processing Bridge"
)

echo -e "${YELLOW}📋 Services to deploy:${NC}"
for service in "${SERVICES[@]}"; do
    IFS=':' read -r name desc <<< "$service"
    echo "   - $name: $desc"
done
echo ""

echo -e "${BLUE}🏗️  Setting up Railway project...${NC}"
echo ""

# Create project if not in one
if ! railway status &> /dev/null; then
    echo "Creating new Railway project..."
    railway init
fi

PROJECT_ID=$(railway status --json | jq -r '.projectId')
echo -e "${GREEN}✅ Using project: $PROJECT_ID${NC}"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT MANUAL STEPS:${NC}"
echo ""
echo "1. ${BLUE}Add Redis Service:${NC}"
echo "   - Go to Railway dashboard"
echo "   - Click '+ New' → 'Database' → 'Add Redis'"
echo "   - This provides REDIS_URL automatically"
echo ""
echo "2. ${BLUE}Set Shared Environment Variables:${NC}"
echo "   - Go to project Settings → Variables"
echo "   - Add all variables from .env.railway.example"
echo "   - These will be shared across all services"
echo ""
echo "3. ${BLUE}Create Services for Each Component:${NC}"
echo ""

# Generate deployment instructions for each service
for service in "${SERVICES[@]}"; do
    IFS=':' read -r name desc <<< "$service"
    
    if [ "$name" == "redis" ]; then
        continue # Skip Redis as it's added via dashboard
    fi
    
    echo -e "${GREEN}📦 Service: $name${NC}"
    echo "   a. Click '+ New' → 'GitHub Repo'"
    echo "   b. Select your LINK-X repository"
    echo "   c. Go to Settings → General"
    echo "   d. Change service name to: learnx-$name"
    echo "   e. Go to Settings → Deploy"
    
    # Read the specific config
    if [ -f "$name.json" ]; then
        START_CMD=$(jq -r '.deploy.startCommand' "$name.json" 2>/dev/null || echo "See $name.json")
        REPLICAS=$(jq -r '.deploy.numReplicas' "$name.json" 2>/dev/null || echo "1")
        
        echo "   f. Set Start Command to:"
        echo -e "${YELLOW}      $START_CMD${NC}"
        echo "   g. Set Replicas to: $REPLICAS"
        
        # Check for service-specific env vars
        if [ "$(jq -r '.envVars | length' "$name.json" 2>/dev/null)" -gt 0 ]; then
            echo "   h. Add service-specific variables:"
            jq -r '.envVars | to_entries[] | "      - \(.key)=\(.value)"' "$name.json" 2>/dev/null
        fi
    fi
    echo ""
done

echo -e "${BLUE}🔗 Service Dependencies:${NC}"
echo "   - All workers depend on Backend being healthy"
echo "   - Celery services depend on Redis"
echo "   - Deploy in the order listed above"
echo ""

echo -e "${YELLOW}📝 Post-Deployment Checklist:${NC}"
echo "   [ ] All services show as 'Active' in Railway"
echo "   [ ] Backend health check passes: https://your-backend.railway.app/api/v2/health"
echo "   [ ] Check worker logs for successful startup"
echo "   [ ] Test file upload to verify workers are processing"
echo ""

echo -e "${GREEN}🚀 Quick Commands:${NC}"
echo "   View all services:     railway list"
echo "   View service logs:     railway logs"
echo "   Open Railway dashboard: railway open"
echo ""

echo -e "${BLUE}💡 Tips:${NC}"
echo "   - Use Railway's log viewer to monitor each service"
echo "   - Set up alerting for service failures"
echo "   - Scale pgmq-worker to 3-5 replicas for better throughput"
echo "   - Monitor Redis memory usage"
echo ""

# Create a summary file
cat > deployment-summary.txt << EOF
LINK-X Railway Deployment Summary
=================================
Project ID: $PROJECT_ID
Date: $(date)

Services Deployed:
- Redis (via Railway dashboard)
- Backend (learnx-backend)
- PGMQ Worker (learnx-pgmq-worker) - 3 replicas
- Celery Worker (learnx-celery-worker) - 2 replicas
- Celery Beat (learnx-celery-beat) - 1 replica
- Supabase Bridge (learnx-supabase-bridge) - 1 replica

Environment Variables Required:
- See .env.railway.example

Start Commands:
$(for service in "${SERVICES[@]}"; do
    IFS=':' read -r name desc <<< "$service"
    if [ "$name" != "redis" ] && [ -f "$name.json" ]; then
        echo "- $name: $(jq -r '.deploy.startCommand' "$name.json" 2>/dev/null)"
    fi
done)
EOF

echo -e "${GREEN}✅ Deployment guide generated!${NC}"
echo "   Summary saved to: deployment-summary.txt"