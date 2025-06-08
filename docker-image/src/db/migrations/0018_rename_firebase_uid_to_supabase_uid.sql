-- Migration to rename firebase_uid to supabase_uid in the users table
-- This is part of the complete migration from Firebase to Supabase authentication

-- Step 1: Rename the column in the users table
ALTER TABLE users 
RENAME COLUMN firebase_uid TO supabase_uid;

-- Step 2: Update any indexes that might exist on firebase_uid
-- Check if index exists and drop/recreate with new name
DO $$ 
BEGIN
    -- Drop old index if it exists
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_firebase_uid') THEN
        DROP INDEX idx_users_firebase_uid;
    END IF;
    
    -- Create new index with renamed column
    CREATE INDEX idx_users_supabase_uid ON users(supabase_uid);
EXCEPTION
    WHEN undefined_column THEN
        -- Column might have already been renamed
        NULL;
END $$;

-- Step 3: Add comment to document the change
COMMENT ON COLUMN users.supabase_uid IS 'Supabase authentication user ID (previously firebase_uid)';