-- Migration: Implement transactional outbox pattern for embeddings
-- Ensures atomicity between chunk insertion and job creation

-- Add versioning and status to file_chunks
ALTER TABLE file_chunks 
ADD COLUMN IF NOT EXISTS embedding_version TEXT,
ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending' 
    CHECK (embedding_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS embedding_error TEXT,
ADD COLUMN IF NOT EXISTS embedding_attempt_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_embedding_attempt TIMESTAMPTZ;

-- Add constraint for embedding consistency
ALTER TABLE file_chunks
ADD CONSTRAINT one_embedding_per_chunk CHECK (
    (embedding IS NULL AND embedding_version IS NULL AND embedding_generated_at IS NULL)
    OR (embedding IS NOT NULL AND embedding_version IS NOT NULL AND embedding_generated_at IS NOT NULL)
);

-- Create embedding_jobs table for transactional outbox
CREATE TABLE IF NOT EXISTS embedding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES file_chunks(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'error', 'cancelled')),
    priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    attempt_count INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    batch_id UUID, -- For grouping jobs into batches
    metadata JSONB DEFAULT '{}',
    UNIQUE(chunk_id) -- One job per chunk
);

-- Index for efficient job polling
CREATE INDEX idx_embedding_jobs_status_priority ON embedding_jobs(status, priority DESC, created_at);
CREATE INDEX idx_embedding_jobs_batch ON embedding_jobs(batch_id) WHERE batch_id IS NOT NULL;

-- Create pgmq queue for embedding jobs (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pgmq.meta WHERE queue_name = 'embeddings') THEN
        PERFORM pgmq.create('embeddings');
    END IF;
END $$;

-- Function to atomically create chunk and queue job
CREATE OR REPLACE FUNCTION create_chunk_with_embedding_job(
    p_file_id UUID,
    p_chunk_index INT,
    p_content TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_priority INT DEFAULT 5
) RETURNS UUID AS $$
DECLARE
    v_chunk_id UUID;
    v_job_id UUID;
BEGIN
    -- Insert chunk
    INSERT INTO file_chunks (
        file_id, 
        chunk_index, 
        content, 
        chunk_metadata,
        embedding_status
    ) VALUES (
        p_file_id,
        p_chunk_index,
        p_content,
        p_metadata,
        'pending'
    ) RETURNING id INTO v_chunk_id;
    
    -- Create job in same transaction
    INSERT INTO embedding_jobs (
        chunk_id,
        priority,
        metadata
    ) VALUES (
        v_chunk_id,
        p_priority,
        jsonb_build_object(
            'file_id', p_file_id,
            'chunk_index', p_chunk_index,
            'content_length', length(p_content)
        )
    ) RETURNING id INTO v_job_id;
    
    -- Enqueue to pgmq
    PERFORM pgmq.send(
        'embeddings',
        jsonb_build_object(
            'job_id', v_job_id,
            'chunk_id', v_chunk_id,
            'priority', p_priority,
            'action', 'generate_embedding'
        )
    );
    
    RETURN v_chunk_id;
END;
$$ LANGUAGE plpgsql;

-- Function to claim jobs for processing (with row locking)
CREATE OR REPLACE FUNCTION claim_embedding_jobs(
    p_worker_id TEXT,
    p_batch_size INT DEFAULT 100
) RETURNS TABLE(job_id UUID, chunk_id UUID) AS $$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        SELECT ej.id, ej.chunk_id
        FROM embedding_jobs ej
        WHERE ej.status = 'pending'
        AND ej.attempt_count < ej.max_attempts
        ORDER BY ej.priority DESC, ej.created_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE embedding_jobs ej
    SET 
        status = 'processing',
        started_at = NOW(),
        attempt_count = attempt_count + 1,
        metadata = metadata || jsonb_build_object('worker_id', p_worker_id)
    FROM claimed
    WHERE ej.id = claimed.id
    RETURNING ej.id, ej.chunk_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete embedding job
CREATE OR REPLACE FUNCTION complete_embedding_job(
    p_job_id UUID,
    p_embedding vector(1536),
    p_version TEXT
) RETURNS VOID AS $$
DECLARE
    v_chunk_id UUID;
BEGIN
    -- Get chunk_id from job
    SELECT chunk_id INTO v_chunk_id
    FROM embedding_jobs
    WHERE id = p_job_id;
    
    -- Update chunk with embedding (atomic with constraint)
    UPDATE file_chunks
    SET 
        embedding = p_embedding,
        embedding_version = p_version,
        embedding_generated_at = NOW(),
        embedding_status = 'completed'
    WHERE id = v_chunk_id
    AND embedding IS NULL; -- Idempotency
    
    -- Mark job as completed
    UPDATE embedding_jobs
    SET 
        status = 'completed',
        completed_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle job errors
CREATE OR REPLACE FUNCTION fail_embedding_job(
    p_job_id UUID,
    p_error_message TEXT
) RETURNS VOID AS $$
DECLARE
    v_chunk_id UUID;
    v_attempt_count INT;
    v_max_attempts INT;
BEGIN
    -- Get job details
    SELECT chunk_id, attempt_count, max_attempts 
    INTO v_chunk_id, v_attempt_count, v_max_attempts
    FROM embedding_jobs
    WHERE id = p_job_id;
    
    -- Update job status
    UPDATE embedding_jobs
    SET 
        status = CASE 
            WHEN attempt_count >= max_attempts THEN 'error'
            ELSE 'pending' -- Will be retried
        END,
        error_message = p_error_message,
        completed_at = CASE 
            WHEN attempt_count >= max_attempts THEN NOW()
            ELSE NULL
        END
    WHERE id = p_job_id;
    
    -- Update chunk status
    UPDATE file_chunks
    SET 
        embedding_status = CASE 
            WHEN v_attempt_count >= v_max_attempts THEN 'error'
            ELSE 'pending'
        END,
        embedding_error = p_error_message,
        last_embedding_attempt = NOW()
    WHERE id = v_chunk_id;
END;
$$ LANGUAGE plpgsql;

-- Monitoring view
CREATE OR REPLACE VIEW embedding_job_stats AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds,
    MAX(created_at) as latest_created,
    MIN(created_at) as oldest_pending
FROM embedding_jobs
GROUP BY status;

-- Add comment
COMMENT ON TABLE embedding_jobs IS 'Transactional outbox for embedding generation - ensures atomicity between chunk creation and job queueing';