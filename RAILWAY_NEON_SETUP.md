# Railway Setup with Existing Neon Database

## You Already Have:
- **Neon PostgreSQL Database** (Don't create a new one!)
- **Firebase Auth** (Already configured)
- **AWS S3** (For file storage)

## What Railway Will Host:
- **Flask Backend API** (Your Python app)
- **Redis** (For caching - this is the only new service)

## Step-by-Step Setup

### Step 1: Deploy Flask App to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your LINK-X repository
4. Let it deploy (it will fail first time - that's ok)

### Step 2: Add Redis on Railway (The ONLY database service you need)

1. In your Railway project, click "New" → "Database" → "Redis"
2. This gives you Redis for caching and Celery

### Step 3: Configure Environment Variables

Click on your Flask service → "Variables" → Add these:

```env
# YOUR EXISTING NEON DATABASE (Don't create new one!)
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST.neon.tech/neondb?sslmode=require

# Redis from Railway
REDIS_URL=${{Redis.REDIS_URL}}

# Flask
FLASK_ENV=production
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret

# Firebase (Your existing)
FIREBASE_PROJECT_ID=your-existing-project
FIREBASE_PRIVATE_KEY_ID=your-existing-key
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=your-existing-email
FIREBASE_CLIENT_ID=your-existing-id

# OpenAI
OPENAI_API_KEY=your-openai-key

# AWS S3 (Your existing)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

# CORS (Update with your Vercel URL)
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

### Step 4: Fix the Deployment

Since you already have a database, the app just needs to connect to it:

1. The app should now start successfully
2. Check logs for any errors
3. Your endpoints should work at: `https://your-app.up.railway.app`

## Common Issues & Fixes

### "Can't connect to database"
- Make sure DATABASE_URL has `?sslmode=require` at the end
- Check if Neon database is active (not suspended)

### "Module not found"
- Railway is using the wrong Dockerfile
- Set root directory to `/` in Railway settings

### "Health check failed"
- App is starting but not responding to health checks
- Check if PORT environment variable is being used

## What You DON'T Need from Railway:

❌ PostgreSQL (You have Neon)  
❌ MySQL  
❌ MongoDB  
✅ Redis (This is the only database service you need from Railway)

## Final Architecture:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Railway       │     │    Neon         │
│   (Frontend)    │────▶│   (Flask API)   │────▶│   (PostgreSQL)  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │                        
                                 │              ┌─────────────────┐
                                 └─────────────▶│   Railway       │
                                                │   (Redis Cache) │
                                                └─────────────────┘
```

## Environment Variables Summary:

From Neon (use existing):
- DATABASE_URL

From Firebase (use existing):
- All FIREBASE_* variables

From AWS (use existing):
- All AWS_* variables

From Railway (new):
- REDIS_URL (automatically provided when you add Redis)

Your own secrets:
- SECRET_KEY
- JWT_SECRET_KEY
- OPENAI_API_KEY