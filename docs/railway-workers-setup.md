# Railway Workers Deployment Guide

This guide explains how to deploy your LINK-X workers to Railway alongside your main API service.

## 🏗️ Worker Architecture

Your LINK-X system has three types of workers:

1. **Embedding Worker** (`Dockerfile.workers.embedding`)
   - Processes embeddings using Supabase PGMQ
   - Memory efficient, async processing
   - Handles OpenAI API calls with rate limiting

2. **Celery Worker** (`Dockerfile.workers.celery`)
   - File processing, indexing
   - General background tasks
   - Uses Redis as message broker

3. **Celery Beat** (`Dockerfile.workers.beat`)
   - Periodic task scheduler
   - Database maintenance, cleanup
   - Only deploy ONE instance

## 🚀 Deployment Steps

### 1. Create Worker Services in Railway

For each worker, create a **new service** in your Railway project:

1. Go to your Railway project dashboard
2. Click "New Service"
3. Choose "GitHub Repo" 
4. Select your repository
5. Configure each service with its specific railway config

### 2. Configure Each Service

#### Embedding Worker Service:
- **Name**: `linkx-embedding-worker`
- **Railway Config**: `railway.embedding-worker.json`
- **Dockerfile**: `Dockerfile.workers.embedding`

#### Celery Worker Service:
- **Name**: `linkx-celery-worker`  
- **Railway Config**: `railway.celery-worker.json`
- **Dockerfile**: `Dockerfile.workers.celery`

#### Celery Beat Service:
- **Name**: `linkx-celery-beat`
- **Railway Config**: `railway.celery-beat.json`
- **Dockerfile**: `Dockerfile.workers.beat`

### 3. Environment Variables

Copy environment variables from `.env.workers.example` to each service:

#### Required for ALL Workers:
```bash
DATABASE_URL=your-supabase-postgres-url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
LOG_LEVEL=INFO
PYTHONUNBUFFERED=1
```

#### Embedding Worker Only:
```bash
WORKER_ID=railway-embedding-worker
EMBEDDING_BATCH_SIZE=50
POLL_INTERVAL=2.0
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDINGS_ENABLED=true
```

#### Celery Workers Only:
```bash
REDIS_URL=your-redis-url
CELERY_WORKER_CONCURRENCY=2
CELERY_MAX_TASKS_PER_CHILD=1000
FILE_PROCESSING_ENABLED=true
MAINTENANCE_TASKS_ENABLED=true
```

### 4. Resource Allocation

Recommended Railway resource allocation:

| Service | Memory | CPU | Replicas |
|---------|--------|-----|----------|
| Embedding Worker | 512MB | 0.5 | 1-2 |
| Celery Worker | 512MB | 0.5 | 1-3 |
| Celery Beat | 256MB | 0.25 | 1 |

## 🔧 Configuration Details

### Railway Config Files

Each worker has its own Railway configuration:

- `railway.embedding-worker.json` → Embedding Worker
- `railway.celery-worker.json` → Celery Worker  
- `railway.celery-beat.json` → Celery Beat

### Worker-Specific Settings

#### Embedding Worker Features:
- ✅ Async processing with asyncio
- ✅ Supabase PGMQ integration
- ✅ OpenAI API rate limiting
- ✅ Poison message detection
- ✅ Memory optimization

#### Celery Worker Features:
- ✅ File processing & indexing
- ✅ S3 operations
- ✅ Database maintenance
- ✅ Queue-based task distribution
- ✅ Auto-retry with backoff

#### Celery Beat Features:
- ✅ Periodic task scheduling
- ✅ Database cleanup
- ✅ Health monitoring
- ✅ Maintenance automation

## 📊 Monitoring

### Health Checks

Each worker has built-in health checks:

- **Embedding Worker**: Database connectivity test
- **Celery Worker**: Celery ping command
- **Celery Beat**: Process status check

### Logs

Monitor worker logs in Railway dashboard:

```bash
# Embedding Worker
[INFO] Processing 50 embedding jobs
[INFO] Generated 50 embeddings in 2.3s

# Celery Worker  
[INFO] Task tasks.index_file[abc-123] succeeded
[INFO] Processed file: document.pdf

# Celery Beat
[INFO] Scheduler: Sending due task cleanup-old-files
```

## 🔄 Scaling

### Horizontal Scaling

You can scale workers based on workload:

```bash
# Scale embedding workers for high embedding volume
Embedding Workers: 2-3 replicas

# Scale celery workers for file processing
Celery Workers: 2-5 replicas  

# Beat scheduler: ALWAYS 1 replica only
Celery Beat: 1 replica (DO NOT SCALE)
```

### Performance Tuning

Adjust these environment variables for optimization:

```bash
# Embedding Worker
EMBEDDING_BATCH_SIZE=100  # Increase for higher throughput
POLL_INTERVAL=1.0         # Decrease for faster polling

# Celery Worker
CELERY_WORKER_CONCURRENCY=4     # Increase for more parallel tasks
CELERY_MAX_TASKS_PER_CHILD=500  # Decrease to prevent memory leaks
```

## ⚠️ Important Notes

1. **Celery Beat**: Only deploy ONE instance to avoid duplicate scheduled tasks
2. **Redis**: Make sure Redis service is running before starting Celery workers
3. **Environment Variables**: Use the same database credentials across all services
4. **Scaling**: Monitor memory usage when scaling up workers
5. **Dependencies**: Workers depend on the main API service for some shared resources

## 🐛 Troubleshooting

### Common Issues

#### Embedding Worker Not Processing:
- Check `EMBEDDINGS_ENABLED=true`
- Verify OpenAI API key
- Check database connectivity

#### Celery Worker Connection Issues:
- Verify Redis URL
- Check Redis service status
- Ensure network connectivity

#### Beat Tasks Not Running:
- Check only one Beat instance is running
- Verify Redis connectivity
- Check task scheduling in logs

### Debug Commands

Use Railway CLI to debug:

```bash
# Check worker logs
railway logs --service linkx-embedding-worker

# SSH into worker (if needed)
railway shell --service linkx-celery-worker

# Check environment variables
railway variables --service linkx-celery-beat
```

## 🎯 Next Steps

1. Deploy workers in this order:
   - Redis (if not already deployed)
   - Celery Beat
   - Celery Worker(s)
   - Embedding Worker(s)

2. Monitor logs for successful startup
3. Test functionality by uploading files
4. Scale workers based on usage patterns

Your workers are now ready to handle background processing for LINK-X! 