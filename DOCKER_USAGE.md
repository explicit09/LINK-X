# Docker Usage Guide

## 🚀 Quick Start

### Development Mode
```bash
# Start development environment (with hot reload)
docker-compose --profile dev up

# Access at http://localhost:8080
```

### Production Mode
```bash
# Deploy to production
./deploy_production.sh

# Or manually:
DOCKER_ENV=prod FLASK_ENV=production PORT=8000 docker-compose --profile prod up -d

# Access at http://localhost:8000
```

## 📦 Available Profiles

- **`dev`** - Development with hot reload, includes backend + redis
- **`prod`** - Production with all services (backend, workers, beat)
- **`workers`** - Just Celery workers and beat
- **`monitoring`** - Adds Flower for task monitoring

## 🛠️ Common Commands

```bash
# View logs
docker-compose logs -f backend

# Run database migrations
docker-compose run --rm backend bash -c "cd /app/src/db && alembic upgrade head"

# Access shell
docker-compose exec backend bash

# Monitor performance
docker-compose exec backend python scripts/monitor_performance.py

# Stop everything
docker-compose down
```

## 📁 File Structure

- **docker-compose.yml** - Main compose file with all profiles
- **docker-compose.monitoring.yml** - Optional Prometheus/Grafana stack
- **docker-compose.production.yml** - Legacy production config (can be removed)

## 🔧 Environment Variables

Create `docker-image/.env` with:
```env
# Database
POSTGRES_URL=postgresql://user:pass@host/db

# AWS (for S3)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-2
S3_BUCKET_NAME=learn-x

# OpenAI
OPENAI_API_KEY=sk-xxx

# Security
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
```

## 🏗️ Building Images

```bash
# Development image
cd docker-image && docker build -f docker/Dockerfile.dev -t linkx:dev .

# Production image
cd docker-image && docker build -f docker/Dockerfile.prod -t linkx:prod .
```