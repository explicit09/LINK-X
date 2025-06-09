# Railway Deployment Guide for LINK-X

## Prerequisites

1. Railway account (https://railway.app)
2. Railway CLI installed (optional but recommended)
3. GitHub repository connected to Railway
4. Supabase project setup
5. OpenAI API key

## Deployment Steps

### 1. Create a New Railway Project

1. Go to Railway Dashboard
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your LINK-X repository
5. Choose the branch: `cursor/create-modular-supabase-authentication-system-7efe`

### 2. Add Redis Service

1. In your Railway project, click "New"
2. Select "Database" → "Redis"
3. Railway will automatically provide the `REDIS_URL`

### 3. Configure Environment Variables

Copy all variables from `.env.railway.example` to Railway:

1. Go to your service settings
2. Click on "Variables"
3. Add the following required variables:

```bash
# Required Variables
FLASK_ENV=production
SECRET_KEY=<generate-secure-key>
JWT_SECRET_KEY=<generate-secure-key>

# Supabase (from your Supabase dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_JWT_SECRET=<your-jwt-secret>
DATABASE_URL=<your-supabase-db-url>

# OpenAI
OPENAI_API_KEY=<your-openai-api-key>

# Storage
USE_SUPABASE_STORAGE=true
SUPABASE_STORAGE_BUCKET=course-files

# CORS (update with your frontend URL)
CORS_ORIGINS=https://your-frontend.vercel.app
```

### 4. Deploy Settings

Railway will automatically detect the Dockerfile and use these settings:

- **Start Command**: Automatically detected from Dockerfile
- **Health Check Path**: `/api/v2/health`
- **Port**: Railway provides this automatically

### 5. Deploy

1. Railway will automatically deploy when you:
   - Push to the connected branch
   - Update environment variables
   - Manually trigger a redeploy

2. Monitor the deployment in the Railway dashboard

### 6. Verify Deployment

Once deployed, Railway will provide a URL like: `https://your-app.railway.app`

Test the deployment:

```bash
# Check health endpoint
curl https://your-app.railway.app/api/v2/health

# Should return:
# {"status":"healthy","services":{...}}
```

## Multiple Services Setup (REQUIRED FOR FULL FUNCTIONALITY)

**Important**: The basic deployment only runs the web server. To have full functionality (file processing, embeddings, etc.), you MUST deploy the workers as separate services.

### Required Services:

1. **Backend (Web Server)** - Already configured in basic setup
2. **Embedding Worker** - Processes PDF embeddings
3. **Celery Worker** - Background tasks
4. **Celery Beat** - Scheduled tasks
5. **Supabase Bridge** - File processing queue

### Setting Up Workers in Railway:

1. In your Railway project, click "+ New" → "Empty Service" for each worker

2. For each service:
   - Connect to the same GitHub repo
   - Use the same environment variables
   - Override only the start command

### Service Configurations:

**1. Backend Service (Main):**
```bash
# Start Command (default from Dockerfile):
gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 300 --chdir /app/src app:create_app()
```

**2. Embedding Worker Service:**
```bash
# Service Name: pgmq-worker
# Start Command:
python /app/src/startup/embedding_worker_init.py

# Additional ENV vars:
WORKER_ID=pgmq-worker-1
BATCH_SIZE=100
MAX_RETRIES=3
```

**3. Celery Worker Service:**
```bash
# Service Name: celery-worker
# Start Command:
/app/docker/celery-entrypoint.sh worker

# Uses Redis URL from shared Redis service
```

**4. Celery Beat Service:**
```bash
# Service Name: celery-beat
# Start Command:
/app/docker/celery-entrypoint.sh beat

# Only need one instance
```

**5. Supabase Bridge Service:**
```bash
# Service Name: supabase-bridge
# Start Command:
python -m services.supabase_bridge

# Additional ENV vars:
WORKER_ID=supabase-bridge-1
BRIDGE_POLL_INTERVAL=10
BRIDGE_MAX_JOBS=3
```

### Shared Environment Variables:

All services should share these environment variables (use Railway's shared variables feature):

1. Click on your project settings
2. Go to "Shared Variables"
3. Add all variables from `.env.railway.example`

### Service Dependencies:

Ensure services start in order:
1. Redis (if using Railway Redis)
2. Backend
3. Workers (can start simultaneously)

### Scaling Workers:

For production loads, you can scale workers:

```bash
# In Railway dashboard for pgmq-worker service:
# Set Replicas to 3-5 for better throughput
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Railway build logs
   - Ensure all required files are committed
   - Verify Dockerfile syntax

2. **Health Check Failures**
   - Increase start period in railway.json
   - Check application logs
   - Verify DATABASE_URL is correct

3. **Environment Variable Issues**
   - Double-check all required variables are set
   - Use Railway's reference variables for Redis
   - Ensure no quotes around values in Railway

### Logs

View logs in Railway dashboard or use CLI:

```bash
railway logs
```

## Production Considerations

1. **Scaling**
   - Increase replicas in Railway dashboard
   - Adjust worker counts via environment variables

2. **Monitoring**
   - Set up Sentry for error tracking
   - Use Railway's built-in metrics
   - Consider adding custom health checks

3. **Security**
   - Use strong SECRET_KEY and JWT_SECRET_KEY
   - Restrict CORS_ORIGINS to your domains
   - Enable HTTPS (Railway provides this automatically)

4. **Performance**
   - Adjust GUNICORN_WORKERS based on Railway plan
   - Monitor memory usage
   - Use Redis for caching

## Cost Optimization

1. Use sleep schedules for non-production environments
2. Monitor resource usage in Railway dashboard
3. Optimize worker counts based on actual load
4. Consider using Railway's usage-based pricing

## Next Steps

1. Set up custom domain (optional)
2. Configure monitoring and alerts
3. Set up CI/CD with GitHub Actions
4. Configure backup strategies for Redis