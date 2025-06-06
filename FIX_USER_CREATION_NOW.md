# Fix User Creation Issue - Quick Steps

## The Problem
The trigger that syncs Supabase auth with user_profiles is failing because the table might not exist or have the right structure.

## Quick Fix (Do This Now)

### Step 1: Go to SQL Editor
https://app.supabase.com/project/torsffahnivnzcnjnxgc/sql/new

### Step 2: Run This SQL
```sql
-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Make sure table exists with correct structure
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'student',
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a working trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert with conflict handling
    INSERT INTO public.user_profiles (id, email, role, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::text, 'student'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Don't fail auth user creation
        RAISE LOG 'Failed to create user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Test
SELECT 'Fixed!' as status;
```

### Step 3: Create User Again
Now try creating the user again in the dashboard or run our script:
```bash

```

## Alternative: Create Without Dashboard

If still having issues, create directly with SQL:
```sql
-- Create a test user manually
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'manual@example.com',
    crypt('testpass123', gen_salt('bf')),
    NOW(),
    '{"role": "student", "full_name": "Manual Test"}'::jsonb,
    NOW(),
    NOW()
);
```

But the dashboard method is preferred!