#!/bin/bash
set -e

echo "🚀 Deploying to staging environment..."

# Load environment variables
if [ -f .env.staging ]; then
    export $(cat .env.staging | xargs)
fi

# Set deployment variables
export TAG=${GITHUB_SHA:-develop}
export GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-link-x1}

# Pull latest images
echo "📦 Pulling latest images..."
docker-compose -f docker-compose.staging.yml pull

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.staging.yml run --rm backend python run_migrations.py

# Deploy services
echo "🚀 Starting services..."
docker-compose -f docker-compose.staging.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo "🏥 Checking service health..."
curl -f http://localhost:8000/health || exit 1

echo "✅ Staging deployment complete!"
echo "📊 Monitor at: http://localhost:5555 (Flower)"
echo "🌐 API available at: http://localhost:8000"