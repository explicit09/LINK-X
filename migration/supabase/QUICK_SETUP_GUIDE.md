# Quick Supabase Setup Guide

## ✅ Completed
1. Supabase project created
2. Frontend environment configured
3. Connection tested successfully

## 📋 Next Steps

### 1. Enable Extensions (2 minutes)
Go to your Supabase SQL Editor:
https://app.supabase.com/project/torsffahnivnzcnjnxgc/sql/new

Run this SQL:
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 2. Run Schema Migration (5 minutes)
In the same SQL Editor, run the contents of:
`migration/supabase/clean_schema_migration.sql`

This will create all tables with proper structure.

### 3. Get Backend Keys
From your Supabase dashboard, get:
1. **Service Role Key**: Settings → API → service_role
2. **JWT Secret**: Settings → API → JWT Settings
3. **Database Password**: Settings → Database

### 4. Create Backend .env
```bash
# In docker-image/.env
SUPABASE_URL=https://torsffahnivnzcnjnxgc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjI2NTEsImV4cCI6MjA2NDY5ODY1MX0.iNmJjrq4rcgj-W8yp-nQ_mbF-NIlR89loPT9bqTVUPI
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
SUPABASE_JWT_SECRET=<YOUR_JWT_SECRET>
SUPABASE_DB_URL=postgresql://postgres:<PASSWORD>@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres

# Keep existing configs
OPENAI_API_KEY=<existing>
REDIS_URL=<existing>
# Remove all FIREBASE_* and POSTGRES_URL
```

### 5. Install Frontend Dependencies
```bash
cd frontend
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 6. Update Backend Imports
In `docker-image/src/app.py`:
- Comment out Firebase imports
- Add Supabase imports
- Update database config

### 7. Test Everything
```bash
# Frontend
cd frontend && npm run dev

# Backend
cd docker-image && python src/app.py
```

## 🚀 Ready to Code!

Once you have the Service Role Key and JWT Secret, the migration is just:
1. Updating import statements
2. Removing Firebase code
3. Testing auth flows

The hard part (architecture) is already done!