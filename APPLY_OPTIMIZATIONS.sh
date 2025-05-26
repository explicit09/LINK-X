#!/bin/bash

echo "=== LINK-X Performance Optimization Script ==="
echo ""

# Check if backend is running
echo "1. Checking if backend is running..."
if docker ps | grep -q dev7; then
    echo "✓ Backend is running"
    
    # Apply database indexes
    echo ""
    echo "2. Applying database performance indexes..."
    docker exec -it $(docker ps -q -f ancestor=dev7) python /app/run_migrations.py
    echo "✓ Database indexes applied"
else
    echo "✗ Backend is not running. Please start it with: ./run_backend.sh"
    exit 1
fi

# Check if frontend is running
echo ""
echo "3. Checking frontend..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "✓ Frontend is running on port 3002"
else
    echo "✗ Frontend is not running"
    echo "  Start it with: cd coralx-frontend && npm run dev"
fi

# S3 CORS configuration (if using S3)
echo ""
echo "4. S3 CORS Configuration"
echo "If you're using S3 storage, run this command inside the backend container:"
echo "  docker exec -it $(docker ps -q -f ancestor=dev7) python /app/update_s3_cors.py"

echo ""
echo "=== Optimization Complete ==="
echo ""
echo "Next steps:"
echo "1. Clear your browser cache (Cmd+Shift+R or Ctrl+Shift+R)"
echo "2. Restart the frontend if you see CORS errors"
echo "3. The courses page should now load much faster!"