# Railway Services Configuration

This directory contains individual service configurations for deploying LINK-X to Railway with all workers running as separate services.

## Services Overview

1. **backend.json** - Main web server (API)
2. **pgmq-worker.json** - PostgreSQL message queue worker for embeddings
3. **celery-worker.json** - Background task processor
4. **celery-beat.json** - Scheduled task runner
5. **supabase-bridge.json** - File processing bridge

## Deployment Instructions

### Quick Start

1. Run the deployment helper script:
   ```bash
   ./deploy-all.sh
   ```

2. Follow the manual steps in the output to create each service in Railway

### Manual Deployment

For each service:

1. In Railway dashboard, click "+ New" → "GitHub Repo"
2. Select your LINK-X repository
3. Configure the service using the corresponding JSON file
4. Set the start command from the JSON configuration
5. Add service-specific environment variables

### Service Dependencies

```
Redis (add via Railway dashboard)
  ↓
Backend (must be healthy first)
  ↓
Workers (can deploy in parallel):
  - PGMQ Worker (3 replicas recommended)
  - Celery Worker (2 replicas)
  - Celery Beat (1 replica only!)
  - Supabase Bridge (1 replica)
```

### Environment Variables

All services share the same environment variables. Set these at the project level in Railway:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `REDIS_URL` (automatically set by Railway when you add Redis)

### Monitoring

Each service has health checks configured. Monitor them via:

- Railway dashboard logs
- Backend health endpoint: `https://your-backend.railway.app/api/v2/health`
- Individual service logs in Railway

### Scaling

- **pgmq-worker**: Scale to 3-5 replicas for heavy loads
- **celery-worker**: Scale to 2-3 replicas as needed
- **celery-beat**: Keep at 1 replica (important!)
- **backend**: Scale based on API traffic

### Troubleshooting

1. **Service won't start**: Check logs in Railway dashboard
2. **Health checks failing**: Verify DATABASE_URL and REDIS_URL
3. **Workers not processing**: Ensure backend is healthy first
4. **Duplicate tasks**: Ensure only 1 celery-beat instance