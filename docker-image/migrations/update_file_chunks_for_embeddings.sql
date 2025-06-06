-- Update file_chunks table for automatic embeddings

-- Add embedding timestamp column
ALTER TABLE file_chunks
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP;

-- Add index for chunks without embeddings (for retry queries)
CREATE INDEX IF NOT EXISTS idx_file_chunks_missing_embeddings 
ON file_chunks(id) 
WHERE embedding IS NULL AND content IS NOT NULL;

-- Add index for embedding generation timestamp
CREATE INDEX IF NOT EXISTS idx_file_chunks_embedding_generated_at 
ON file_chunks(embedding_generated_at);

-- Update files table processing status enum to include embedding states
DO $$ 
BEGIN
    -- Check if the type needs updating
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'embedding_generation' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'processing_status_enum'
        )
    ) THEN
        -- Add new status values
        ALTER TYPE processing_status_enum ADD VALUE IF NOT EXISTS 'embedding_generation';
        ALTER TYPE processing_status_enum ADD VALUE IF NOT EXISTS 'embedding_complete';
    END IF;
END $$;