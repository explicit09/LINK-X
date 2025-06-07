-- Supabase Automatic Embeddings using pg_net and pgmq
-- Based on official Supabase approach: https://supabase.com/docs/guides/ai/examples/openai

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgmq CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_net CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_cron CASCADE;

-- Step 2: Create embedding queue
SELECT pgmq.create('embedding_jobs');

-- Step 3: Create function to queue embeddings
CREATE OR REPLACE FUNCTION queue_file_chunk_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue the embedding job
  PERFORM pgmq.send(
    'embedding_jobs',
    jsonb_build_object(
      'chunk_id', NEW.id,
      'content', NEW.content,
      'model', 'text-embedding-3-small'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger for new chunks
DROP TRIGGER IF EXISTS auto_embed_file_chunks ON file_chunks;
CREATE TRIGGER auto_embed_file_chunks
  AFTER INSERT OR UPDATE OF content ON file_chunks
  FOR EACH ROW
  WHEN (NEW.content IS NOT NULL AND NEW.content != '')
  EXECUTE FUNCTION queue_file_chunk_embeddings();

-- Step 5: Create function to process embeddings using pg_net
CREATE OR REPLACE FUNCTION process_embedding_jobs(job_count INT DEFAULT 10)
RETURNS VOID AS $$
DECLARE
  job RECORD;
  openai_key TEXT;
  response_id BIGINT;
BEGIN
  -- Get OpenAI API key from vault
  SELECT decrypted_secret INTO openai_key
  FROM vault.decrypted_secrets
  WHERE name = 'OPENAI_API_KEY';

  IF openai_key IS NULL THEN
    RAISE EXCEPTION 'OpenAI API key not found in vault';
  END IF;

  -- Process jobs from queue
  FOR job IN 
    SELECT * FROM pgmq.read('embedding_jobs', job_count, 1)
  LOOP
    -- Make HTTP request to OpenAI
    SELECT net.http_post(
      'https://api.openai.com/v1/embeddings',
      jsonb_build_object(
        'input', job.message->>'content',
        'model', job.message->>'model'
      ),
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || openai_key,
        'Content-Type', 'application/json'
      )
    ) INTO response_id;

    -- Archive the job
    PERFORM pgmq.archive('embedding_jobs', job.msg_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to handle embedding responses
CREATE OR REPLACE FUNCTION handle_embedding_response()
RETURNS TRIGGER AS $$
DECLARE
  chunk_id UUID;
  embedding vector(1536);
BEGIN
  -- Extract chunk_id from the request (stored in headers or content)
  -- Extract embedding from response
  IF NEW.status_code = 200 THEN
    -- Parse the embedding from the response
    embedding := (NEW.content::jsonb->'data'->0->>'embedding')::vector(1536);
    
    -- Update the chunk with the embedding
    UPDATE file_chunks
    SET 
      embedding = embedding,
      embedding_generated_at = NOW()
    WHERE id = chunk_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create cron job to process embeddings
SELECT cron.schedule(
  'process-embeddings',
  '* * * * *', -- Every minute
  $$SELECT process_embedding_jobs(25);$$
);

-- Step 8: Create view to monitor embedding progress
CREATE OR REPLACE VIEW embedding_progress AS
SELECT 
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as completed,
  COUNT(*) FILTER (WHERE embedding IS NULL) as pending,
  COUNT(*) as total
FROM file_chunks;

-- Step 9: Function to retry failed embeddings
CREATE OR REPLACE FUNCTION retry_failed_embeddings()
RETURNS VOID AS $$
BEGIN
  -- Re-queue chunks without embeddings
  INSERT INTO pgmq.send('embedding_jobs', jsonb_build_object(
    'chunk_id', id,
    'content', content,
    'model', 'text-embedding-3-small'
  ))
  SELECT id, content
  FROM file_chunks
  WHERE embedding IS NULL
  AND content IS NOT NULL
  AND content != ''
  AND (embedding_generated_at IS NULL OR embedding_generated_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_embedding_jobs IS 'Process embedding jobs from queue using OpenAI API via pg_net';
COMMENT ON VIEW embedding_progress IS 'Monitor the progress of embedding generation';