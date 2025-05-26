#!/bin/bash

echo "🚀 Starting optimized backend..."

# Use the optimized docker-compose file
docker-compose -f docker-compose.optimized.yml up --build -d

# Show logs
echo "📋 Showing logs (press Ctrl+C to stop viewing logs)..."
docker-compose -f docker-compose.optimized.yml logs -f backend