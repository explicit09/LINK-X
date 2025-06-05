# Railway Environment Variables

Copy these to Railway Dashboard > Variables:

```bash
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=generate-a-secure-key-here

# Database (Use Railway's PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (Use Railway's Redis)  
REDIS_URL=${{Redis.REDIS_URL}}

# JWT Configuration
JWT_SECRET_KEY=generate-another-secure-key
JWT_ACCESS_TOKEN_EXPIRES=3600

# AWS S3 (Optional for initial deploy)
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# AWS_REGION=us-east-1
# S3_BUCKET_NAME=your-bucket

# OpenAI
OPENAI_API_KEY=your-openai-key

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id

# CORS
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000

# Application Settings
RATE_LIMIT_ENABLED=true
CIRCUIT_BREAKER_ENABLED=true

# Port (Railway provides this)
PORT=${{PORT}}
```

## Quick Start Commands

1. Add PostgreSQL and Redis services in Railway
2. Copy environment variables above
3. Deploy will automatically use Dockerfile.railway
4. Check logs for any missing variables

## Minimal Deploy (Without S3/OpenAI)

For testing deployment without all services:

```bash
FLASK_ENV=production
SECRET_KEY=test-secret-key
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET_KEY=test-jwt-key
CORS_ORIGINS=*
```