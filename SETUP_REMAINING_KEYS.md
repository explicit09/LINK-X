# Get Remaining Supabase Keys

You still need to get these from your Supabase dashboard:

## 1. Service Role Key (REQUIRED)
- Go to: https://app.supabase.com/project/torsffahnivnzcnjnxgc/settings/api
- Look for "service_role" key (NOT the anon key)
- It's also a long string starting with `eyJ...`
- ⚠️ Keep this SECRET - never expose in frontend!

## 2. JWT Secret (REQUIRED) 
- Same page, scroll down to "JWT Settings"
- Copy the "JWT Secret"
- Looks like a random string

## 3. Database Password (REQUIRED)
- Go to: https://app.supabase.com/project/torsffahnivnzcnjnxgc/settings/database
- This is the password you set when creating the project
- If forgotten, you can reset it

## Example Backend .env Format:
```bash
# Supabase Configuration
SUPABASE_URL=https://torsffahnivnzcnjnxgc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjI2NTEsImV4cCI6MjA2NDY5ODY1MX0.iNmJjrq4rcgj-W8yp-nQ_mbF-NIlR89loPT9bqTVUPI
SUPABASE_SERVICE_ROLE_KEY=<GET THIS FROM DASHBOARD>
SUPABASE_JWT_SECRET=<GET THIS FROM DASHBOARD>
SUPABASE_DB_URL=postgresql://postgres:<YOUR_PASSWORD>@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres
SUPABASE_DB_POOLER_URL=postgresql://postgres.torsffahnivnzcnjnxgc:<YOUR_PASSWORD>@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

## While You Get Those Keys, I'll:
1. Set up the database schema
2. Create test connection scripts
3. Prepare the migration

Please get:
1. Service Role Key
2. JWT Secret  
3. Database Password

Then we can continue!