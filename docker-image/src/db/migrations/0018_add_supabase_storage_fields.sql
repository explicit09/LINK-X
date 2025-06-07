-- Add Supabase storage fields to files table
-- These fields will replace s3_key and s3_bucket for new files

-- Add storage_path column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'files' AND column_name = 'storage_path') THEN
        ALTER TABLE files ADD COLUMN storage_path VARCHAR(512);
    END IF;
END $$;

-- Add storage_bucket column if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'files' AND column_name = 'storage_bucket') THEN
        ALTER TABLE files ADD COLUMN storage_bucket VARCHAR(255);
    END IF;
END $$;

-- Add storage_metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'files' AND column_name = 'storage_metadata') THEN
        ALTER TABLE files ADD COLUMN storage_metadata JSONB;
    END IF;
END $$;

-- Update storage_type for existing S3 files to maintain compatibility
UPDATE files 
SET storage_type = 'supabase' 
WHERE storage_type = 's3' AND storage_path IS NOT NULL;

-- Add index on storage_path for better query performance
CREATE INDEX IF NOT EXISTS idx_files_storage_path ON files(storage_path);

-- Add comment to document the migration
COMMENT ON COLUMN files.storage_path IS 'Supabase storage path - replaces s3_key';
COMMENT ON COLUMN files.storage_bucket IS 'Supabase storage bucket - replaces s3_bucket';
COMMENT ON COLUMN files.storage_metadata IS 'Additional metadata for storage (content-type, etc)';