#!/bin/bash
set -e

echo "🔧 Testing Backend and Celery Startup"
echo "======================================"

echo "📋 Step 1: Clean up any existing containers"
docker-compose down 2>/dev/null || true

echo "📋 Step 2: Start Redis first"
docker-compose --profile dev up -d redis
echo "⏳ Waiting for Redis to be healthy..."
timeout 30 bash -c 'until docker-compose ps redis | grep -q healthy; do sleep 2; done' || {
    echo "❌ Redis failed to start"
    exit 1
}
echo "✅ Redis is healthy"

echo "📋 Step 3: Start Backend"
docker-compose --profile dev up -d backend
echo "⏳ Waiting for backend to start..."
sleep 10

echo "📋 Step 4: Check Backend Status"
backend_status=$(docker-compose ps backend --format "table {{.Status}}")
echo "Backend Status: $backend_status"

if docker logs link-x-backend-1 2>&1 | grep -q "flask_socketio"; then
    echo "❌ Backend still has import errors"
    echo "📝 Recent backend logs:"
    docker logs link-x-backend-1 --tail 10
else
    echo "✅ Backend appears to be starting without import errors"
fi

echo "📋 Step 5: Start Celery Worker"
docker-compose --profile dev up -d celery-worker
echo "⏳ Waiting for Celery to start..."
sleep 10

echo "📋 Step 6: Check Celery Status"
celery_status=$(docker-compose ps celery-worker --format "table {{.Status}}")
echo "Celery Status: $celery_status"

if docker logs link-x-celery-worker-1 2>&1 | grep -q "flask_socketio"; then
    echo "❌ Celery still has import errors"
    echo "📝 Recent celery logs:"
    docker logs link-x-celery-worker-1 --tail 10
else
    echo "✅ Celery appears to be starting without import errors"
fi

echo "📋 Step 7: Overall Status Check"
echo "Container Status Summary:"
docker-compose ps

echo "📋 Step 8: Test Backend API"
if curl -f http://localhost:8080/health >/dev/null 2>&1; then
    echo "✅ Backend health endpoint is responding"
else
    echo "⚠️  Backend health endpoint not responding yet (may still be starting)"
fi

echo ""
echo "🎯 Summary:"
echo "- Redis: $(docker-compose ps redis --format "{{.Status}}")"
echo "- Backend: $(docker-compose ps backend --format "{{.Status}}")"  
echo "- Celery: $(docker-compose ps celery-worker --format "{{.Status}}")"

echo ""
echo "📝 To monitor logs:"
echo "  Backend: docker logs -f link-x-backend-1"
echo "  Celery:  docker logs -f link-x-celery-worker-1"
echo "  Redis:   docker logs -f link-x-redis-1"

echo ""
echo "🔧 To stop all services:"
echo "  docker-compose down"