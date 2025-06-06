# Next Steps to Complete Migration

## ✅ What's Done
1. **Supabase project created** - torsffahnivnzcnjnxgc
2. **Frontend configured** - Environment variables set
3. **Connection tested** - Successfully connected
4. **Auth architecture built** - All code ready
5. **Frontend packages installed** - @supabase/supabase-js

## 📋 What You Need to Do

### 1. Enable Database Extensions (2 min)
Go to: https://app.supabase.com/project/torsffahnivnzcnjnxgc/sql/new

Run this SQL:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 2. Create Database Schema (5 min)
In the same SQL editor, copy and run the entire contents of:
`/Users/tadies/Documents/GitHub/LINK-X/migration/supabase/clean_schema_migration.sql`

### 3. Get Backend Keys
From dashboard get:
- **Service Role Key** (Settings → API)
- **JWT Secret** (Settings → API → JWT Settings)
- **Database Password** (you set this)

### 4. Quick Backend Setup
Create `docker-image/.env`:
```bash
SUPABASE_URL=https://torsffahnivnzcnjnxgc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjI2NTEsImV4cCI6MjA2NDY5ODY1MX0.iNmJjrq4rcgj-W8yp-nQ_mbF-NIlR89loPT9bqTVUPI
SUPABASE_SERVICE_ROLE_KEY=<GET_FROM_DASHBOARD>
SUPABASE_JWT_SECRET=<GET_FROM_DASHBOARD>
SUPABASE_DB_URL=postgresql://postgres:<YOUR_PASSWORD>@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres
```

### 5. Update Backend Code
In `docker-image/src/app.py`:
```python
# Comment out:
# from core.firebase_config import initialize_firebase

# Add:
from core.supabase_config import get_supabase_config

# Replace database.py import:
from core.database_supabase import db, db_manager, init_db
```

### 6. Test Basic Auth
Create a test user in Supabase dashboard:
1. Go to Authentication → Users
2. Click "Add user"
3. Create test@example.com

Then test login from frontend!

## 🎯 Total Time: ~30 minutes

Once you have the Service Role Key and JWT Secret, the entire migration can be done in 30 minutes!

## File Locations Reference
- **Frontend auth**: `/frontend/lib/auth/`, `/frontend/contexts/auth/`
- **Backend auth**: `/docker-image/src/core/auth/`, `/docker-image/src/services/auth/`
- **Migration files**: `/migration/supabase/`

You're 90% done - just need those keys and to run the SQL!