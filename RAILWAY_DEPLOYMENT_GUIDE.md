# Railway Deployment Guide for LINK-X1 Backend

This guide covers deploying the LINK-X1 backend to Railway with optimized settings for memory efficiency and reliability.

## 🚀 Quick Start

### 1. Prerequisites

- Railway account with CLI installed
- Supabase project set up
- OpenAI API key
- Your frontend domain for CORS

### 2. Deploy to Railway

1. **Clone and navigate to project:**
   ```bash
   git clone <your-repo>
   cd LINK-X1
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Create new project:**
   ```bash
   railway create
   ```

4. **Deploy:**
   ```bash
   railway deploy
   ```

## ⚙️ Environment Configuration

### Required Environment Variables

Set these in Railway Dashboard > Variables:

```env
# Core Configuration
FLASK_ENV=production
SECRET_KEY=your-32-character-secret-key-here
JWT_SECRET_KEY=your-32-character-jwt-secret-key

# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://postgres.your-project:password@pooler.supabase.com:5432/postgres

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# CORS Security
CORS_ORIGINS=https://your-domain.vercel.app,https://your-custom-domain.com
```

### Optional Services

Add Redis service in Railway for caching:
```env
REDIS_URL=${Redis.REDIS_URL}
CELERY_BROKER_URL=${Redis.REDIS_URL}
CELERY_RESULT_BACKEND=${Redis.REDIS_URL}
```

## 🔧 Railway-Specific Optimizations

### Memory Management

The deployment is optimized for Railway's memory constraints:

- **Workers**: 2 Gunicorn workers (auto-adjusts based on available memory)
- **Connection Pool**: Small database connection pool (3 + 7 overflow)
- **Timeouts**: Reduced to 120 seconds
- **Memory Monitoring**: Built-in memory usage tracking

### Health Checks

Railway uses `/api/v2/health` for health checks:

- **Basic**: Returns 200 if application is responsive
- **Detailed**: `/health/detailed` for comprehensive component status
- **Readiness**: `/ready` for dependency checks
- **Liveness**: `/live` for process health

### Startup Process

The deployment uses a custom startup script that:

1. ✅ Validates all required environment variables
2. 🧠 Detects available memory and adjusts workers
3. 🗄️ Tests database connectivity
4. 📊 Starts background memory monitoring
5. 🚀 Launches optimized Gunicorn server

## 🛠️ Troubleshooting

### Common Issues

#### 1. Worker Killed (SIGKILL)
```log
Worker (pid:3520) was sent SIGKILL! Perhaps out of memory?
```

**Solution**: Memory limit exceeded
- Check Railway plan limits
- Workers auto-adjust based on available memory
- Monitor `/health/detailed` for memory usage

#### 2. Database Connection Issues
```log
UserRepository initialized successfully with session factory: <class 'NoneType'>
```

**Solution**: Database URL or credentials incorrect
- Verify `DATABASE_URL` in Railway variables
- Check Supabase connection pooler URL
- Use `/ready` endpoint to test connectivity

#### 3. Environment Variables Missing
```log
Missing required environment variables: SECRET_KEY
```

**Solution**: Set all required variables in Railway Dashboard
- Use the provided `.env.railway.example` as template
- Ensure minimum 32-character keys for secrets

### Monitoring & Debugging

#### Health Check Endpoints

```bash
# Basic health
curl https://your-app.railway.app/health

# Detailed with memory info
curl https://your-app.railway.app/health/detailed

# Database readiness
curl https://your-app.railway.app/ready
```

#### Memory Monitoring

The app includes built-in memory monitoring:
- Logs memory usage every 60 seconds
- Warns when usage exceeds 400MB
- Available in health check endpoint

#### Logs

View logs in Railway dashboard or CLI:
```bash
railway logs
```

## 📊 Performance Optimization

### Database Connection Pooling

Railway-optimized settings:
```env
DB_POOL_SIZE=3           # Small pool for Railway
DB_MAX_OVERFLOW=7        # Limited overflow
DB_POOL_TIMEOUT=30       # Quick timeout
DB_POOL_RECYCLE=1800     # 30-minute recycle
```

### Gunicorn Configuration

Memory-optimized Gunicorn:
```env
GUNICORN_WORKERS=2                    # Auto-adjusts
GUNICORN_WORKER_CLASS=sync           # Synchronous workers
GUNICORN_TIMEOUT=120                 # 2-minute timeout
GUNICORN_MAX_REQUESTS=1000           # Worker recycling
GUNICORN_MAX_REQUESTS_JITTER=100     # Request jitter
```

### Python Memory Settings

Applied automatically:
```env
PYTHONMALLOC=malloc      # Use system malloc
MALLOC_ARENA_MAX=2       # Limit memory arenas
```

## 🔐 Security Considerations

### Environment Variables

- Use Railway's encrypted variable storage
- Never commit secrets to git
- Rotate keys regularly

### CORS Configuration

- Set specific origins, not wildcards
- Include both your domains
- Test with `/cors-test` endpoint

### Database Security

- Use Supabase connection pooler
- Enable SSL (automatically configured)
- Use service role key for backend operations

## 📈 Scaling

### Horizontal Scaling

Railway supports multiple replicas:
```json
{
  "deploy": {
    "numReplicas": 2
  }
}
```

### Vertical Scaling

Upgrade Railway plan for more memory:
- Hobby: 512MB RAM
- Pro: 8GB RAM (recommended)

### Database Scaling

- Use Supabase Pro for better connection limits
- Consider read replicas for heavy read workloads

## 🆘 Support

### Logs and Monitoring

1. **Railway Logs**: Real-time application logs
2. **Health Endpoints**: Component status monitoring
3. **Supabase Dashboard**: Database performance metrics

### Getting Help

- Railway Support: [help.railway.app](https://help.railway.app)
- Supabase Support: [supabase.com/support](https://supabase.com/support)
- Application Issues: Check logs and health endpoints first

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Supabase Documentation](https://supabase.com/docs)
- [Flask Production Guide](https://flask.palletsprojects.com/en/2.3.x/deploying/)
- [Gunicorn Configuration](https://docs.gunicorn.org/en/stable/configure.html) 