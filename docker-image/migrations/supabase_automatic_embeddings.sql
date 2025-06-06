-- Supabase Automatic Embeddings Setup
-- This script enables automatic embedding generation for file chunks

-- Phase 2: Enable Automatic Embeddings

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA extensions;

-- 2. Create embedding jobs queue
SELECT pgmq.create('embedding_jobs');

-- 3. Create utility schema if not exists
CREATE SCHEMA IF NOT EXISTS util;

-- 4. Function to get Supabase project URL (for Edge Function calls)
CREATE OR REPLACE FUNCTION util.project_url()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  project_url TEXT;
BEGIN
  -- Get project URL from vault or environment
  SELECT decrypted_secret INTO project_url 
  FROM vault.decrypted_secrets 
  WHERE name = 'project_url';
  
  IF project_url IS NULL THEN
    -- Fallback to environment variable or hardcoded value
    project_url := current_setting('app.project_url', true);
  END IF;
  
  RETURN project_url;
END;
$$;

-- 5. Generic function to invoke Edge Functions
CREATE OR REPLACE FUNCTION util.invoke_edge_function(
  function_name TEXT,
  payload JSONB,
  timeout_milliseconds INT DEFAULT 5 * 60 * 1000  -- 5 minutes default
) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get project URL
  project_url := util.project_url();
  
  -- Get service role key from vault
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';
  
  -- Make HTTP request to Edge Function
  PERFORM net.http_post(
    url => project_url || '/functions/v1/' || function_name,
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body => payload,
    timeout_milliseconds => timeout_milliseconds
  );
END;
$$;

-- 6. Trigger function to queue embedding generation for file_chunks
CREATE OR REPLACE FUNCTION queue_file_chunk_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if content changed or new row
  IF (TG_OP = 'INSERT') OR 
     (TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content) THEN
    
    -- Queue embedding job
    PERFORM pgmq.send('embedding_jobs', jsonb_build_object(
      'table', 'file_chunks',
      'id', NEW.id,
      'content', NEW.content,
      'metadata', jsonb_build_object(
        'file_id', NEW.file_id,
        'chunk_index', NEW.chunk_index
      )
    ));
    
    -- Log for debugging
    RAISE NOTICE 'Queued embedding job for file_chunk %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger on file_chunks table
DROP TRIGGER IF EXISTS auto_embed_file_chunks ON file_chunks;
CREATE TRIGGER auto_embed_file_chunks
  AFTER INSERT OR UPDATE ON file_chunks
  FOR EACH ROW
  EXECUTE FUNCTION queue_file_chunk_embeddings();

-- 8. Function to process embedding jobs (called by pg_cron)
CREATE OR REPLACE FUNCTION util.process_embedding_jobs(
  batch_size INT DEFAULT 10,
  visibility_timeout INT DEFAULT 30
) RETURNS INT AS $$
DECLARE
  processed_count INT := 0;
  job RECORD;
BEGIN
  -- Read batch of jobs from queue
  FOR job IN 
    SELECT * FROM pgmq.read('embedding_jobs', visibility_timeout, batch_size)
  LOOP
    -- Call Edge Function to generate embedding
    PERFORM util.invoke_edge_function(
      'generate-embeddings',
      job.message
    );
    
    -- Delete job from queue (mark as processed)
    PERFORM pgmq.delete('embedding_jobs', job.msg_id);
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Schedule cron job to process embeddings every minute
SELECT cron.schedule(
  'process-embeddings',
  '* * * * *',  -- Every minute
  $$SELECT util.process_embedding_jobs(batch_size => 10);$$
);

-- 10. Helper function to manually trigger embedding for a specific chunk
CREATE OR REPLACE FUNCTION util.generate_embedding_for_chunk(chunk_id UUID)
RETURNS VOID AS $$
DECLARE
  chunk RECORD;
BEGIN
  -- Get chunk data
  SELECT * INTO chunk FROM file_chunks WHERE id = chunk_id;
  
  IF chunk IS NULL THEN
    RAISE EXCEPTION 'Chunk not found: %', chunk_id;
  END IF;
  
  -- Queue embedding job
  PERFORM pgmq.send('embedding_jobs', jsonb_build_object(
    'table', 'file_chunks',
    'id', chunk.id,
    'content', chunk.content,
    'metadata', jsonb_build_object(
      'file_id', chunk.file_id,
      'chunk_index', chunk.chunk_index
    )
  ));
END;
$$ LANGUAGE plpgsql;

-- 11. Function to check embedding job status
CREATE OR REPLACE FUNCTION util.get_embedding_queue_status()
RETURNS TABLE (
  queue_length BIGINT,
  oldest_job_age INTERVAL,
  newest_job_age INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as queue_length,
    MAX(NOW() - enqueued_at) as oldest_job_age,
    MIN(NOW() - enqueued_at) as newest_job_age
  FROM pgmq.q_embedding_jobs;
END;
$$ LANGUAGE plpgsql;

-- 12. Function to retry failed embeddings
CREATE OR REPLACE FUNCTION util.retry_failed_embeddings()
RETURNS INT AS $$
DECLARE
  retry_count INT := 0;
  chunk RECORD;
BEGIN
  -- Find chunks without embeddings
  FOR chunk IN 
    SELECT * FROM file_chunks 
    WHERE embedding IS NULL 
    AND content IS NOT NULL
    LIMIT 100
  LOOP
    -- Re-queue for embedding generation
    PERFORM pgmq.send('embedding_jobs', jsonb_build_object(
      'table', 'file_chunks',
      'id', chunk.id,
      'content', chunk.content,
      'metadata', jsonb_build_object(
        'file_id', chunk.file_id,
        'chunk_index', chunk.chunk_index
      )
    ));
    
    retry_count := retry_count + 1;
  END LOOP;
  
  RETURN retry_count;
END;
$$ LANGUAGE plpgsql;

-- 13. View to monitor embedding progress
CREATE OR REPLACE VIEW embedding_progress AS
SELECT 
  f.id as file_id,
  f.filename,
  f.processing_status,
  COUNT(fc.id) as total_chunks,
  COUNT(fc.embedding) as chunks_with_embeddings,
  CASE 
    WHEN COUNT(fc.id) = 0 THEN 0
    ELSE ROUND((COUNT(fc.embedding)::NUMERIC / COUNT(fc.id)::NUMERIC) * 100, 2)
  END as embedding_progress_percent
FROM files f
LEFT JOIN file_chunks fc ON f.id = fc.file_id
GROUP BY f.id, f.filename, f.processing_status;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA util TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO service_role;