#!/bin/bash

echo "Cleaning up old containers..."
docker ps -aq --filter ancestor=dev7 | xargs -r docker rm -f

echo "Building backend with no cache..."
cd docker-image
docker build --no-cache -t dev7 -f Dockerfile .

echo "Running backend directly with Flask app..."
cd src
pwd
docker run -d -p 8080:8080 \
  -e FIREBASE_KEY_PATH=/app/firebaseKey.json \
  -v $(pwd):/app/src \
  -w /app \
  --entrypoint="" \
  dev7 python src/app.py

echo "Backend started. Checking logs..."
sleep 3
docker ps --filter ancestor=dev7 --format "table {{.ID}}\t{{.Status}}" 
echo ""
echo "To view logs: docker logs -f <container-id>" 