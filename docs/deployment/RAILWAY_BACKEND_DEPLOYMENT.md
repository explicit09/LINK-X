# Railway Backend Deployment Guide for LEARN-X

## Overview

This guide covers deploying the LEARN-X Flask backend, PostgreSQL database, Redis cache, and Celery workers to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI** (optional): Install with `npm i -g @railway/cli`
3. **GitHub Repository**: Ensure your code is pushed to GitHub
4. **Environment Variables**: Have all API keys and secrets ready

## Architecture on Railway

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Flask API     │────▶│   PostgreSQL    │     │     Redis       │
│   (Web Service) │     │   (Database)    │     │    (Cache)      │
│                 │     │                 │     │                 │
└────────┬────────┘     └─────────────────┘     └────────▲────────┘
         │                                                 │
         │              ┌─────────────────┐                │
         └─────────────▶│  Celery Worker  │────────────────┘
                        │  (Background)    │
                        └─────────────────┘
```

## Deployment Steps

### Step 1: Create Railway Project

1. **Via Railway Dashboard**
   - Go to [railway.app/new](https://railway.app/new)
   - Click "Deploy from GitHub repo"
   - Select your `LINK-X1` repository
   - Railway will auto-detect the Dockerfile

2. **Via CLI**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Create new project
   railway init
   ```

### Step 2: Add PostgreSQL Database

1. **In Railway Dashboard**
   - Click "New Service"
   - Select "Database" → "PostgreSQL"
   - Railway automatically provides connection URL

2. **Note the Database URL**
   - Format: `postgresql://user:password@host:port/database`
   - This will be your `DATABASE_URL` environment variable

### Step 3: Add Redis Cache

1. **In Railway Dashboard**
   - Click "New Service"
   - Select "Database" → "Redis"
   - Railway provides Redis connection URL

2. **Note the Redis URL**
   - Format: `redis://default:password@host:port`
   - This will be your `REDIS_URL` environment variable

### Step 4: Configure Environment Variables

Add these environment variables in Railway dashboard for your Flask service:

```env
# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name
USE_S3_STORAGE=true

# Firebase Admin SDK
FIREBASE_ADMIN_CREDENTIALS={"type":"service_account",...}

# CORS Configuration
CORS_ORIGINS=https://your-frontend.vercel.app,https://your-custom-domain.com

# Feature Flags
ENABLE_REDIS_CACHE=true
ENABLE_RATE_LIMITING=true
ENABLE_SENTRY=true

# Sentry (Optional)
SENTRY_DSN=your-sentry-dsn

# Email Configuration (Optional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### Step 5: Deploy Flask Backend

1. **Automatic Deployment**
   - Railway will automatically deploy when you push to GitHub
   - Monitor deployment in Railway dashboard

2. **Manual Deployment via CLI**
   ```bash
   # From project root
   railway up
   ```

3. **Check Deployment Status**
   ```bash
   railway status
   railway logs
   ```

### Step 6: Set Up Celery Worker

1. **Create New Service in Railway**
   - Click "New Service" → "Empty Service"
   - Name it "celery-worker"

2. **Configure Celery Service**
   ```env
   # Same environment variables as Flask service
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   
   # Celery specific
   CELERY_BROKER_URL=${{Redis.REDIS_URL}}
   CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
   ```

3. **Set Start Command**
   ```bash
   cd docker-image && celery -A src.celery_app worker --loglevel=info
   ```

### Step 7: Set Up Celery Beat (Optional)

For scheduled tasks:

1. **Create Another Service**
   - Name it "celery-beat"
   - Same environment variables as worker

2. **Set Start Command**
   ```bash
   cd docker-image && celery -A src.celery_app beat --loglevel=info
   ```

## Database Migrations

### Initial Setup

1. **Connect to Railway PostgreSQL**
   ```bash
   railway run psql $DATABASE_URL
   ```

2. **Run Migrations**
   ```bash
   # Via Railway CLI
   railway run --service=flask-api python docker-image/src/scripts/execute_migrations.py
   
   # Or create a one-time job in Railway dashboard
   ```

3. **Verify Tables**
   ```sql
   \dt
   SELECT * FROM pg_tables WHERE schemaname = 'public';
   ```

### Ongoing Migrations

Add this to your deployment workflow:

```yaml
# In railway.json
{
  "deploy": {
    "preDeploy": "cd docker-image && python src/scripts/execute_migrations.py"
  }
}
```

## Monitoring & Logging

### 1. Railway Metrics
- CPU and Memory usage visible in dashboard
- Response time tracking
- Error rate monitoring

### 2. Application Logs
```bash
# View logs via CLI
railway logs --service=flask-api

# Filter logs
railway logs --service=flask-api --filter="ERROR"

# Tail logs
railway logs --service=flask-api --tail
```

### 3. Health Checks
- Endpoint: `/api/v2/health`
- Checks database, Redis, and S3 connectivity
- Railway auto-restarts on health check failure

## Performance Optimization

### 1. Scaling
```bash
# Scale horizontally
railway scale --replicas=3

# Scale vertically (in dashboard)
# Adjust CPU and Memory limits
```

### 2. Caching Strategy
```python
# Enable Redis caching
ENABLE_REDIS_CACHE=true
REDIS_CACHE_TTL=3600  # 1 hour
```

### 3. Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_file_module ON files(module_id);
CREATE INDEX idx_enrollment_user_course ON enrollments(user_id, course_id);
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   railway logs --service=flask-api --stage=build
   
   # Common fixes:
   # - Ensure Dockerfile path is correct
   # - Check requirements.txt for conflicts
   # - Verify Python version compatibility
   ```

2. **Database Connection Issues**
   ```python
   # Add connection pooling
   SQLALCHEMY_POOL_SIZE=10
   SQLALCHEMY_POOL_TIMEOUT=30
   SQLALCHEMY_POOL_RECYCLE=1800
   ```

3. **Memory Issues**
   ```bash
   # Increase memory limit in Railway dashboard
   # Or optimize worker processes:
   GUNICORN_WORKERS=2
   GUNICORN_THREADS=4
   ```

4. **CORS Errors**
   ```python
   # Ensure frontend URL is in CORS_ORIGINS
   CORS_ORIGINS=https://your-app.vercel.app
   ```

## Security Best Practices

1. **Environment Variables**
   - Use Railway's secret management
   - Never commit secrets to GitHub
   - Rotate keys regularly

2. **Network Security**
   - Enable Railway's private networking
   - Use environment-specific URLs
   - Implement rate limiting

3. **Database Security**
   ```sql
   -- Create read-only user for analytics
   CREATE USER analytics_user WITH PASSWORD 'secure_password';
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
   ```

## CI/CD Integration

### GitHub Actions
```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: railwayapp/deploy-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          service: flask-api
```

### Pre-deployment Checks
```yaml
- name: Run Tests
  run: |
    cd docker-image
    pytest tests/

- name: Check Migrations
  run: |
    cd docker-image
    python src/scripts/check_migrations.py
```

## Cost Optimization

1. **Use Sleep Schedule**
   - Configure services to sleep during off-hours
   - Saves costs for development environments

2. **Optimize Resources**
   - Right-size CPU and memory
   - Use horizontal scaling instead of vertical

3. **Database Optimization**
   - Regular VACUUM and ANALYZE
   - Archive old data to S3

## Backup Strategy

### Database Backups
```bash
# Manual backup
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Automated daily backups (add to Celery beat)
@celery.task
def backup_database():
    # Upload to S3
    pass
```

### Redis Persistence
```env
# Enable Redis persistence
REDIS_SAVE="900 1 300 10 60 10000"
REDIS_APPENDONLY=yes
```

## Deployment Checklist

- [ ] GitHub repository connected
- [ ] PostgreSQL database provisioned
- [ ] Redis cache provisioned
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] Health check endpoint verified
- [ ] CORS configured for frontend URL
- [ ] Celery worker deployed
- [ ] SSL certificate active (automatic)
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented
- [ ] Rate limiting enabled
- [ ] Error tracking (Sentry) configured

## Useful Railway Commands

```bash
# View project info
railway status

# Open project in browser
railway open

# Run command in Railway environment
railway run [command]

# Connect to database
railway connect postgres

# View environment variables
railway vars

# Redeploy service
railway up --service=flask-api

# Scale service
railway scale --replicas=3
```

## Support Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)
- [Railway Blog](https://blog.railway.app)