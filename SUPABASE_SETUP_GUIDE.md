# Supabase Project Setup Guide

## Step 1: Create Supabase Account and Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login
3. Click "New Project"
4. Fill in:
   - Project name: `learn-x-production` (or similar)
   - Database Password: (generate a strong one and save it)
   - Region: Choose closest to your users
   - Pricing Plan: Start with Free, upgrade to Pro when needed

## Step 2: Save Your Credentials

After project creation, go to Settings → API and save these:

```bash
# Create a new .env.supabase file
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# From Settings → Database
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_DB_POOLER_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

## Step 3: Enable Required Extensions

Go to SQL Editor in Supabase dashboard and run:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search

-- Verify extensions
SELECT extname, extversion FROM pg_extension;
```

## Step 4: Configure Auth Settings

1. Go to Authentication → Providers
2. Enable Email/Password auth
3. Configure:
   - Enable email confirmations: Your choice (disabled for testing)
   - Minimum password length: 8
   - Enable password strength meter: Yes

4. For OAuth (optional):
   - Enable Google provider
   - Add your OAuth credentials
   - Configure redirect URLs

## Step 5: Set Up Storage (Optional)

If replacing S3:
1. Go to Storage
2. Create buckets:
   ```sql
   -- Via SQL Editor
   INSERT INTO storage.buckets (id, name, public)
   VALUES 
     ('course-materials', 'course-materials', false),
     ('user-uploads', 'user-uploads', false),
     ('avatars', 'avatars', true);
   ```

## Step 6: Configure Security

1. Go to Authentication → Policies
2. Enable RLS on tables (we'll do this during migration)
3. Set up allowed redirect URLs:
   ```
   http://localhost:3000/**
   https://your-domain.com/**
   ```

## Step 7: Database Connection Settings

For production optimization:
1. Go to Settings → Database
2. Note the connection pooler URL (for serverless)
3. Connection limits:
   - Free tier: 60 concurrent connections
   - Pro tier: 200 concurrent connections

## Step 8: Environment Setup

Create complete environment configuration:

```bash
# Backend (.env)
# Supabase
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-key]
SUPABASE_DB_URL=[direct-connection]
SUPABASE_DB_POOLER_URL=[pooler-connection]
SUPABASE_JWT_SECRET=[jwt-secret-from-settings]

# Remove these old vars
# POSTGRES_URL=
# FIREBASE_PROJECT_ID=
# FIREBASE_PRIVATE_KEY=
# etc...

# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

## Step 9: Verify Setup

Test connection with this script:

```javascript
// test-supabase.js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('_test')
      .select('*')
      .limit(1)
    
    if (error && error.code !== '42P01') { // Table doesn't exist is OK
      throw error
    }
    
    console.log('✅ Supabase connection successful!')
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  }
}

testConnection()
```

## Step 10: Migration Readiness Checklist

- [ ] Supabase project created
- [ ] All credentials saved securely
- [ ] Extensions enabled (especially pgvector)
- [ ] Auth providers configured
- [ ] Environment files updated
- [ ] Connection test successful
- [ ] Team members have access (if applicable)

## Next Steps

With Supabase set up, we can now:
1. Migrate the database schema
2. Implement the new auth system
3. Update the application code

## Useful Supabase Dashboard Links

- **SQL Editor**: Write and execute SQL
- **Table Editor**: Visual database management
- **Authentication**: User management
- **Database**: Connection strings and settings
- **API Docs**: Auto-generated API documentation
- **Logs**: Real-time logs for debugging