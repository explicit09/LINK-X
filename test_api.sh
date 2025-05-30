#\!/bin/bash

API_URL="http://localhost:8080"

echo "=== Testing Docker Stack and API Endpoints ==="
echo ""

# 1. Health Check Endpoints
echo "1. Testing Health Endpoints:"
echo "   - Basic health check:"
curl -s $API_URL/health | jq '.'
echo ""

echo "   - Detailed health check:"
curl -s $API_URL/health/detailed | jq '.'
echo ""

echo "   - Readiness check:"
curl -s $API_URL/ready | jq '.'
echo ""

echo "   - Liveness check:"
curl -s $API_URL/live | jq '.'
echo ""

# 2. CORS Test
echo "2. Testing CORS:"
curl -s -X OPTIONS $API_URL/cors-test \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -I | grep -E "(Access-Control|HTTP)"
echo ""

# 3. Auth Endpoints (should fail without auth)
echo "3. Testing Auth Endpoints:"
echo "   - Get current user (should require auth):"
curl -s $API_URL/api/v1/auth/me | jq '.'
echo ""

echo "   - Login with invalid token:"
curl -s -X POST $API_URL/api/v1/auth/sessionLogin \
  -H "Content-Type: application/json" \
  -d '{"idToken": "invalid-token"}' | jq '.'
echo ""

# 4. API Routes
echo "4. Testing API Routes (should require auth):"
echo "   - List courses:"
curl -s $API_URL/api/v1/courses | jq '.'
echo ""

echo "   - List todos:"
curl -s $API_URL/api/v1/todo-items | jq '.'
echo ""

# 5. Service Connectivity
echo "5. Testing Service Connectivity:"
echo "   - Redis connection:"
docker-compose exec -T redis redis-cli ping
echo ""

echo "   - Database tables count:"
docker-compose exec -T backend python -c "
from core.database import db
from app import create_app
app = create_app()
with app.app_context():
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f'Total tables: {len(tables)}')
" 2>/dev/null | grep "Total tables"
echo ""

# 6. Check for missing env vars
echo "6. Checking Environment Variables:"
docker-compose exec -T backend python -c "
import os
required_vars = ['DATABASE_URL', 'REDIS_URL', 'SECRET_KEY', 'JWT_SECRET_KEY']
missing = [var for var in required_vars if not os.getenv(var)]
if missing:
    print(f'Missing env vars: {missing}')
else:
    print('All required env vars are set')
" 2>/dev/null
echo ""

echo "=== Test Complete ==="
