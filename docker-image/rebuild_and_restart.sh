#!/bin/bash
set -e

# Navigate to the project root if needed
cd "$(dirname "$0")"

# Stop and remove existing containers
echo "Stopping and removing existing containers..."
docker-compose down || true

# Rebuild the Docker image
echo "Building the Docker image..."
docker-compose build

# Start the containers
echo "Starting the application..."
docker-compose up -d

echo "Application is being restarted. Use 'docker-compose logs -f' to follow the logs."
