-- Fix the embedding generation process by creating a proper mapping system

-- Step 1: Create a table to track embedding requests
CREATE TABLE IF NOT EXISTS embedding_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES file_chunks(id) ON DELETE CASCADE,
    request_id BIGINT, -- pg_net request ID
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Create an improved embedding processing function
CREATE OR REPLACE FUNCTION process_embedding_jobs_v2(job_count INT DEFAULT 10)
RETURNS VOID AS $$
DECLARE
    job RECORD;
    openai_key TEXT;
    response_id BIGINT;
    request_uuid UUID;
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
        -- Create tracking record
        INSERT INTO embedding_requests (chunk_id)
        VALUES ((job.message->>'chunk_id')::UUID)
        RETURNING id INTO request_uuid;

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

        -- Update tracking with request ID
        UPDATE embedding_requests
        SET request_id = response_id
        WHERE id = request_uuid;

        -- Archive the job
        PERFORM pgmq.archive('embedding_jobs', job.msg_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create a function to process responses
CREATE OR REPLACE FUNCTION process_embedding_responses()
RETURNS VOID AS $$
DECLARE
    resp RECORD;
    embedding_vector vector(1536);
    chunk_uuid UUID;
BEGIN
    -- Process all pending responses
    FOR resp IN 
        SELECT 
            er.id as request_id,
            er.chunk_id,
            hr.id as response_id,
            hr.status_code,
            hr.content,
            hr.error_msg
        FROM embedding_requests er
        JOIN net._http_response hr ON hr.id = er.request_id
        WHERE er.status = 'pending'
        AND hr.created > NOW() - INTERVAL '1 hour'
    LOOP
        IF resp.status_code = 200 AND resp.content IS NOT NULL THEN
            BEGIN
                -- Extract embedding from response
                embedding_vector := (resp.content::jsonb->'data'->0->>'embedding')::vector(1536);
                
                -- Update the chunk with the embedding
                UPDATE file_chunks
                SET 
                    embedding = embedding_vector,
                    embedding_generated_at = NOW()
                WHERE id = resp.chunk_id;
                
                -- Mark request as completed
                UPDATE embedding_requests
                SET 
                    status = 'completed',
                    completed_at = NOW()
                WHERE id = resp.request_id;
            EXCEPTION WHEN OTHERS THEN
                -- Mark request as failed
                UPDATE embedding_requests
                SET 
                    status = 'failed',
                    error_message = SQLERRM,
                    completed_at = NOW()
                WHERE id = resp.request_id;
            END;
        ELSE
            -- Mark request as failed
            UPDATE embedding_requests
            SET 
                status = 'failed',
                error_message = COALESCE(resp.error_msg, 'HTTP ' || resp.status_code),
                completed_at = NOW()
            WHERE id = resp.request_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update the cron job to use the new function and process responses
SELECT cron.unschedule('process-embeddings');

SELECT cron.schedule(
    'process-embeddings-v2',
    '* * * * *', -- Every minute
    $$
    BEGIN;
    SELECT process_embedding_jobs_v2(25);
    SELECT process_embedding_responses();
    COMMIT;
    $$
);

-- Step 5: Create a function to generate embeddings for existing chunks without them
CREATE OR REPLACE FUNCTION generate_missing_embeddings()
RETURNS VOID AS $$
DECLARE
    chunk RECORD;
BEGIN
    -- Queue all chunks without embeddings
    FOR chunk IN 
        SELECT id, content
        FROM file_chunks
        WHERE embedding IS NULL
        AND content IS NOT NULL
        AND content != ''
        AND NOT EXISTS (
            SELECT 1 FROM embedding_requests 
            WHERE chunk_id = file_chunks.id 
            AND status IN ('pending', 'completed')
        )
        LIMIT 100 -- Process in batches
    LOOP
        PERFORM pgmq.send(
            'embedding_jobs',
            jsonb_build_object(
                'chunk_id', chunk.id,
                'content', chunk.content,
                'model', 'text-embedding-3-small'
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Process the existing embeddings that were generated but not linked
CREATE OR REPLACE FUNCTION link_existing_embeddings()
RETURNS VOID AS $$
DECLARE
    resp RECORD;
    chunk_content TEXT;
    chunk_id UUID;
    embedding_vector vector(1536);
BEGIN
    -- For each unprocessed response, try to match it back to a chunk
    FOR resp IN 
        SELECT 
            hr.id,
            hr.content,
            hr.created
        FROM net._http_response hr
        WHERE hr.status_code = 200
        AND hr.content IS NOT NULL
        AND hr.content LIKE '%embedding%'
        AND NOT EXISTS (
            SELECT 1 FROM embedding_requests 
            WHERE request_id = hr.id
        )
        ORDER BY hr.created
    LOOP
        BEGIN
            -- Extract the embedding
            embedding_vector := (resp.content::jsonb->'data'->0->>'embedding')::vector(1536);
            
            -- Try to find a chunk without embedding from around the same time
            SELECT id INTO chunk_id
            FROM file_chunks
            WHERE embedding IS NULL
            AND created_at BETWEEN resp.created - INTERVAL '5 minutes' AND resp.created + INTERVAL '5 minutes'
            LIMIT 1;
            
            IF chunk_id IS NOT NULL THEN
                -- Update the chunk
                UPDATE file_chunks
                SET 
                    embedding = embedding_vector,
                    embedding_generated_at = resp.created
                WHERE id = chunk_id;
                
                -- Create a tracking record for bookkeeping
                INSERT INTO embedding_requests (chunk_id, request_id, status, completed_at)
                VALUES (chunk_id, resp.id, 'completed', resp.created);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Skip this response if there's an error
            CONTINUE;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Enhanced monitoring view
CREATE OR REPLACE VIEW embedding_progress_detailed AS
SELECT 
    (SELECT COUNT(*) FROM file_chunks WHERE embedding IS NOT NULL) as completed,
    (SELECT COUNT(*) FROM file_chunks WHERE embedding IS NULL) as pending,
    (SELECT COUNT(*) FROM file_chunks) as total,
    (SELECT COUNT(*) FROM embedding_requests WHERE status = 'pending') as in_progress,
    (SELECT COUNT(*) FROM embedding_requests WHERE status = 'failed') as failed,
    (SELECT COUNT(*) FROM pgmq.q_embedding_jobs) as queued
;

-- Run the migration to link existing embeddings
SELECT link_existing_embeddings();

-- Queue any missing embeddings
SELECT generate_missing_embeddings();

COMMENT ON FUNCTION process_embedding_jobs_v2 IS 'Improved embedding processor that tracks request-chunk mapping';
COMMENT ON TABLE embedding_requests IS 'Tracks the relationship between pg_net requests and file chunks';
COMMENT ON FUNCTION process_embedding_responses IS 'Processes pg_net responses and updates chunks with embeddings';