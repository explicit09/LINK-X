-- Fix files table to handle Supabase storage uploads

-- 1. Make storage_path nullable if it exists and is NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND column_name = 'storage_path' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE files ALTER COLUMN storage_path DROP NOT NULL;
    END IF;
END $$;

-- 2. Add storage_path column if it doesn't exist
ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 3. Ensure all the columns we need exist
ALTER TABLE files ADD COLUMN IF NOT EXISTS s3_key VARCHAR(512);
ALTER TABLE files ADD COLUMN IF NOT EXISTS s3_bucket VARCHAR(255);
ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'supabase';

-- 4. Make s3_key and s3_bucket nullable for flexibility
ALTER TABLE files ALTER COLUMN s3_key DROP NOT NULL;
ALTER TABLE files ALTER COLUMN s3_bucket DROP NOT NULL;

-- 5. Add default values for storage fields
ALTER TABLE files ALTER COLUMN storage_type SET DEFAULT 'supabase';

-- 6. Update any existing null storage_path values
UPDATE files SET storage_path = s3_key WHERE storage_path IS NULL AND s3_key IS NOT NULL;

-- 7. Create index on storage_path for performance
CREATE INDEX IF NOT EXISTS idx_files_storage_path ON files(storage_path);

-- 8. Show the current structure of the files table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'files'
ORDER BY ordinal_position;