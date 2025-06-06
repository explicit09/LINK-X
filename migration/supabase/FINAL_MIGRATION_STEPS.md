# Final Migration Steps

## 1. Create Database Schema (5 minutes)

Go to your Supabase SQL Editor:
https://app.supabase.com/project/torsffahnivnzcnjnxgc/sql/new

### Step 1: Enable Extensions
Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Step 2: Create Schema
Then run the entire contents of:
`/Users/tadies/Documents/GitHub/LINK-X/migration/supabase/clean_schema_migration.sql`

## 2. Test Database Connection

```bash
# Test connection with your credentials
cd /Users/tadies/Documents/GitHub/LINK-X/migration/supabase
node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:learnx@2321@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres'
});
client.connect()
  .then(() => {
    console.log('✅ Database connection successful!');
    return client.end();
  })
  .catch(err => console.error('❌ Connection failed:', err.message));
"
```

## 3. Update Backend Configuration

### Copy new environment file:
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
cp .env .env.backup  # Backup current config
cp .env.supabase .env  # Use new config
```

### Update the .env with your existing values:
- Copy your OPENAI_API_KEY from .env.backup
- Copy your REDIS_URL if different
- Copy any AWS credentials if using S3

## 4. Install Backend Dependencies

```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
pip install supabase
```

## 5. Quick Backend Test

Create `test_supabase_backend.py`:
```python
from core.supabase_config import test_supabase_connection

if test_supabase_connection():
    print("✅ Backend Supabase connection working!")
else:
    print("❌ Connection failed - check your .env")
```

## 6. Update app.py

In `docker-image/src/app.py`, make these changes:

```python
# Comment out Firebase:
# from core.firebase_config import initialize_firebase

# Add Supabase:
from core.supabase_config import test_supabase_connection

# In create_app(), replace Firebase init:
# initialize_firebase()  # Remove this
if not test_supabase_connection():
    logger.warning("Supabase connection failed")

# Update database import:
# from core.database import db, db_manager
from core.database_supabase import db, db_manager, init_db
```

## 7. Create Your First User

In Supabase Dashboard:
1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Email: test@example.com
4. Password: testpass123
5. Click "Create user"

## 8. Test Everything!

### Frontend:
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/frontend
npm run dev
```
Visit http://localhost:3000/login and try logging in!

### Backend:
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
python src/app.py
```

## 🎉 Migration Complete!

Your app now uses:
- Supabase for authentication
- Supabase PostgreSQL for database
- Clean, reusable auth architecture
- No more Firebase!

## Troubleshooting

### "relation does not exist" error
→ Make sure you ran the schema SQL in Supabase

### "password authentication failed"
→ Check your database password doesn't have special characters that need escaping

### "Invalid API key"
→ Make sure you copied the service role key correctly

### Frontend can't connect
→ Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local