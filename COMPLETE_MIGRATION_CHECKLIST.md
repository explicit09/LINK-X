# Complete Supabase Migration Checklist

## ✅ Already Done
- [x] Created Supabase project
- [x] Configured frontend environment (.env.local)
- [x] Installed frontend packages (@supabase/supabase-js)
- [x] Created backend environment file (.env.supabase)
- [x] Installed backend package (supabase)
- [x] All auth code implemented and ready

## 📋 Quick Setup (15 minutes)

### 1. Create Database Schema (2 min)
Go to: https://app.supabase.com/project/torsffahnivnzcnjnxgc/sql/new

Copy and paste the contents of:
`/Users/tadies/Documents/GitHub/LINK-X/migration/supabase/quick_setup.sql`

Click "Run" - this creates basic tables to get started.

### 2. Apply Backend Environment (1 min)
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
cp .env .env.firebase_backup
cp .env.supabase .env
```

### 3. Create Test User (1 min)
In Supabase Dashboard:
1. Go to: https://app.supabase.com/project/torsffahnivnzcnjnxgc/auth/users
2. Click "Add user" → "Create new user"
3. Email: `test@example.com`
4. Password: `testpass123`
5. Add user metadata: `{"role": "student", "full_name": "Test User"}`

### 4. Test Backend Connection (1 min)
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
python test_supabase_backend.py
```
Should show "✅ Database query successful"

### 5. Update Backend Code (5 min)

Edit `docker-image/src/app.py`:

**Step 1:** Comment out Firebase
```python
# from core.firebase_config import initialize_firebase
```

**Step 2:** Update database import
```python
# from core.database import db, db_manager
from core.database_supabase import db, db_manager
```

**Step 3:** Replace Firebase init with Supabase test
```python
# Remove this:
# try:
#     initialize_firebase()
#     logger.info("Firebase initialized successfully")
# except Exception as e:
#     logger.error(f"Failed to initialize Firebase: {e}")

# Add this:
from core.supabase_config import test_supabase_connection
if test_supabase_connection():
    logger.info("Supabase initialized successfully")
else:
    logger.error("Failed to initialize Supabase")
```

### 6. Start Backend (2 min)
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
python src/app.py
```

### 7. Test Frontend Login (3 min)
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/frontend
npm run dev
```

Visit: http://localhost:3000/login
Login with: test@example.com / testpass123

## 🎯 That's It!

You now have:
- ✅ Supabase authentication working
- ✅ Database connected
- ✅ Clean auth architecture
- ✅ No more Firebase!

## Next Steps (Optional)

### Complete Schema Migration
When ready, run the full schema from:
`/Users/tadies/Documents/GitHub/LINK-X/migration/supabase/clean_schema_migration.sql`

### Remove Firebase Code
1. Delete `docker-image/src/core/firebase_config.py`
2. Remove Firebase imports from components
3. Delete Firebase environment variables

### Update API Endpoints
Use the new decorators:
```python
@require_auth  # Automatic token validation
@require_role('instructor')  # Role-based access
```

## Troubleshooting

### "Module not found" error
→ Make sure you're using the correct Python environment

### "Relation does not exist"
→ Run the SQL schema in Supabase

### Can't login
→ Check user was created in Supabase with correct metadata

### CORS errors
→ Backend should be running on http://localhost:8080

## Success Indicators
- Backend shows "Supabase initialized successfully"
- Frontend login redirects to dashboard
- No Firebase errors in console
- API calls include Supabase tokens

You're done! 🎉