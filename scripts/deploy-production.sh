#!/bin/bash
set -e

echo "🚀 Deploying to production environment..."

# Ensure we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Production deployments must be from main branch"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | xargs)
else
    echo "❌ Error: .env.production file not found"
    exit 1
fi

# Set deployment variables
export TAG=${TAG:-latest}
export GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-link-x1}

# Backup database
echo "💾 Creating database backup..."
./scripts/backup-database.sh

# Pull latest images
echo "📦 Pulling latest images..."
docker-compose -f docker-compose.production.yml pull

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.production.yml run --rm backend python run_migrations.py

# Deploy with zero downtime
echo "🚀 Starting rolling deployment..."
docker-compose -f docker-compose.production.yml up -d --no-deps --scale backend=2 backend

# Wait for new containers to be healthy
echo "⏳ Waiting for new containers to be healthy..."
sleep 30

# Check health
echo "🏥 Checking service health..."
curl -f http://localhost:8000/health/detailed || exit 1

# Deploy other services
echo "🚀 Updating other services..."
docker-compose -f docker-compose.production.yml up -d

# Cleanup old containers
echo "🧹 Cleaning up old containers..."
docker system prune -f

echo "✅ Production deployment complete!"
echo "📊 Monitor at: https://your-domain.com:5555 (Flower)"
echo "🌐 API available at: https://your-domain.com"
echo "📈 Check metrics at: https://your-monitoring-service.com"