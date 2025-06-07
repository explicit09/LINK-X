-- Cleanup Custom Embedding System
-- This removes all the custom embedding infrastructure now that we use Supabase native AI

-- Step 1: Remove old triggers first
DROP TRIGGER IF EXISTS auto_embed_file_chunks ON file_chunks;

-- Step 2: Remove old functions
DROP FUNCTION IF EXISTS queue_file_chunk_embeddings();
DROP FUNCTION IF EXISTS util.process_embedding_jobs(INT, INT);
DROP FUNCTION IF EXISTS util.invoke_edge_function(TEXT, JSONB, INT);
DROP FUNCTION IF EXISTS util.project_url();
DROP FUNCTION IF EXISTS util.generate_embedding_for_chunk(UUID);
DROP FUNCTION IF EXISTS util.get_embedding_queue_status();
DROP FUNCTION IF EXISTS util.retry_failed_embeddings();

-- Step 3: Remove cron jobs
SELECT cron.unschedule('process-embeddings') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-embeddings'
);

-- Step 4: Remove message queue
SELECT pgmq.drop_queue('embedding_jobs') WHERE EXISTS (
  SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'embedding_jobs'
);

-- Step 5: Remove old views that might conflict
DROP VIEW IF EXISTS embedding_progress;

-- Step 6: Clean up util schema if it's empty
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    -- Count functions in util schema
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'util';
    
    -- If no functions remain, drop the schema
    IF func_count = 0 THEN
        DROP SCHEMA IF EXISTS util CASCADE;
        RAISE NOTICE 'Removed empty util schema';
    ELSE
        RAISE NOTICE 'util schema still has % functions, keeping it', func_count;
    END IF;
END $$;

-- Step 7: Remove custom extensions if they're not needed elsewhere
-- Note: Only remove if not used by other parts of the system
DO $$
BEGIN
    -- Check if pgmq is used elsewhere before removing
    IF NOT EXISTS (
        SELECT 1 FROM pgmq.list_queues() 
        WHERE queue_name != 'embedding_jobs'
    ) THEN
        DROP EXTENSION IF EXISTS pgmq CASCADE;
        RAISE NOTICE 'Removed pgmq extension';
    END IF;
    
    -- Keep pg_cron and pg_net as they might be used elsewhere
    -- Keep vector extension as it's still needed for pgvector embeddings
    
END $$;

-- Step 8: Clean up any remaining embedding job data
-- This is safe since we're switching to native embeddings
DELETE FROM pgmq.q_embedding_jobs WHERE TRUE;

-- Step 9: Add comment about the cleanup
COMMENT ON TABLE file_chunks IS 'File chunks with native Supabase AI embeddings (cleaned up from custom system)';

-- Completion message
DO $$
BEGIN
  RAISE NOTICE 'Custom embedding system cleanup complete!';
  RAISE NOTICE 'Old Edge Function, queue system, and cron jobs have been removed';
  RAISE NOTICE 'Now using Supabase native AI for embeddings';
END $$;