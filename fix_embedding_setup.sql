-- Fix for "no schema has been selected to create in" error

-- First, set the search path
SET search_path TO public, extensions;

-- Enable required extensions in the extensions schema
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgmq SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Create the util schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS util;

-- Create embedding queue (pgmq creates its own schema)
SELECT pgmq.create('embedding_jobs');

-- Create the process_embedding_jobs function in util schema
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
    PERFORM net.http_post(
      url => current_setting('app.supabase_url', true) || '/functions/v1/generate-embeddings',
      headers => jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body => job.message
    );
    
    -- Delete job from queue (mark as processed)
    PERFORM pgmq.delete('embedding_jobs', job.msg_id);
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA util TO postgres;
GRANT EXECUTE ON FUNCTION util.process_embedding_jobs TO postgres;

-- Schedule the cron job
SELECT cron.schedule(
  'process-embeddings',
  '* * * * *',  -- Every minute
  $$SELECT util.process_embedding_jobs(batch_size => 10);$$
);

-- Verify everything was created
SELECT 'Extensions:' as info;
SELECT extname, extnamespace::regnamespace FROM pg_extension WHERE extname IN ('pg_cron', 'pgmq', 'pg_net', 'vector');

SELECT 'Queue:' as info;
SELECT * FROM pgmq.list_queues();

SELECT 'Cron Jobs:' as info;
SELECT * FROM cron.job;