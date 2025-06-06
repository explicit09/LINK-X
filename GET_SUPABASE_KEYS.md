# How to Get Your Supabase Keys

## 1. Go to your Supabase Dashboard
Visit: https://app.supabase.com/project/torsffahnivnzcnjnxgc

## 2. Navigate to Settings → API

You'll find these keys:

### Project URL
```
https://torsffahnivnzcnjnxgc.supabase.co  ✓ (You have this)
```

### Anon/Public Key
- **What it looks like**: A long string starting with `eyJ...`
- **Length**: About 200-300 characters
- **Example format**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODkyNjI4MjMsImV4cCI6MjAwNDgzODgyM30.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### Service Role Key (Secret!)
- **What it looks like**: Similar to anon key but different content
- **Length**: About 200-300 characters
- **⚠️ NEVER expose this in frontend code!**

### JWT Secret
- Found in Settings → API → JWT Settings
- Used for backend token verification

## 3. Navigate to Settings → Database

### Database Password
- You set this when creating the project
- If forgotten, you can reset it

### Connection Strings
- **Direct connection**: For backend/migrations
- **Connection pooler**: For production use

## Quick Check Commands

Once you have the correct keys, test them:

```bash
# Test Supabase connection (run in project root)
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://torsffahnivnzcnjnxgc.supabase.co',
  'YOUR_ANON_KEY_HERE'
);
console.log('Supabase client created successfully!');
"
```

## Your Corrected Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://torsffahnivnzcnjnxgc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Get from dashboard

# Backend (.env)
SUPABASE_URL=https://torsffahnivnzcnjnxgc.supabase.co
SUPABASE_ANON_KEY=eyJ...  # Same as frontend
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Different key - keep secret!
SUPABASE_JWT_SECRET=...  # From JWT settings
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres
```

## Security Reminder

- ✅ `NEXT_PUBLIC_*` variables are visible in browser - only use for anon key
- ❌ Never put service role key in frontend
- ❌ Never commit .env files to git
- ✅ Use .env.example files for templates