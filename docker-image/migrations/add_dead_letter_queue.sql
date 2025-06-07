-- Migration: Add Dead Letter Queue for poison messages
-- Prevents malformed/large chunks from starving the main queue

-- Dead Letter Queue table for poison messages
CREATE TABLE IF NOT EXISTS embedding_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_chunk_id UUID REFERENCES file_chunks(id) ON DELETE CASCADE,
    original_job_id UUID, -- May be null if detected before job creation
    poison_type TEXT NOT NULL,
    poison_reason TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    content_sample TEXT, -- First 1000 chars for debugging
    content_length INT,
    estimated_tokens INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    resolution TEXT, -- 'fixed', 'discarded', 'split', 'manual_override'
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Index for efficient querying
CREATE INDEX idx_dlq_poison_type ON embedding_dead_letter_queue(poison_type, created_at);
CREATE INDEX idx_dlq_unreviewed ON embedding_dead_letter_queue(reviewed_at) WHERE reviewed_at IS NULL;

-- Table for storing split chunks from poison messages
CREATE TABLE IF NOT EXISTS embedding_chunk_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_chunk_id UUID NOT NULL REFERENCES file_chunks(id) ON DELETE CASCADE,
    dlq_id UUID NOT NULL REFERENCES embedding_dead_letter_queue(id) ON DELETE CASCADE,
    split_index INT NOT NULL, -- Order of the split
    content TEXT NOT NULL,
    estimated_tokens INT,
    embedding_job_id UUID, -- Job created for this split
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dlq_id, split_index)
);

-- Function to safely create chunk with poison detection
CREATE OR REPLACE FUNCTION create_chunk_with_poison_detection(
    p_file_id UUID,
    p_chunk_index INT,
    p_content TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_priority INT DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
    v_chunk_id UUID;
    v_job_id UUID;
    v_content_length INT;
    v_estimated_tokens INT;
    v_result JSONB;
BEGIN
    v_content_length := length(p_content);
    v_estimated_tokens := v_content_length / 4; -- Rough estimate
    
    -- Basic poison detection (detailed detection handled by worker)
    IF v_content_length > 50000 THEN
        -- Content too large - send to DLQ
        INSERT INTO embedding_dead_letter_queue (
            poison_type,
            poison_reason,
            suggested_action,
            content_sample,
            content_length,
            estimated_tokens,
            metadata
        ) VALUES (
            'too_large',
            format('Content length %s exceeds 50000 chars', v_content_length),
            'split',
            left(p_content, 1000),
            v_content_length,
            v_estimated_tokens,
            jsonb_build_object(
                'file_id', p_file_id,
                'chunk_index', p_chunk_index,
                'original_metadata', p_metadata
            )
        );
        
        RETURN jsonb_build_object(
            'status', 'poison_detected',
            'reason', 'content_too_large',
            'sent_to_dlq', true
        );
    END IF;
    
    -- Estimated token check
    IF v_estimated_tokens > 32000 THEN
        INSERT INTO embedding_dead_letter_queue (
            poison_type,
            poison_reason,
            suggested_action,
            content_sample,
            content_length,
            estimated_tokens,
            metadata
        ) VALUES (
            'too_many_tokens',
            format('Estimated %s tokens exceeds 32000 limit', v_estimated_tokens),
            'split',
            left(p_content, 1000),
            v_content_length,
            v_estimated_tokens,
            jsonb_build_object(
                'file_id', p_file_id,
                'chunk_index', p_chunk_index,
                'original_metadata', p_metadata
            )
        );
        
        RETURN jsonb_build_object(
            'status', 'poison_detected',
            'reason', 'too_many_tokens',
            'sent_to_dlq', true
        );
    END IF;
    
    -- Content appears safe, create normally
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
            'content_length', v_content_length,
            'estimated_tokens', v_estimated_tokens
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
    
    RETURN jsonb_build_object(
        'status', 'success',
        'chunk_id', v_chunk_id,
        'job_id', v_job_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to send poison message to DLQ
CREATE OR REPLACE FUNCTION send_to_dlq(
    p_chunk_id UUID,
    p_job_id UUID,
    p_poison_type TEXT,
    p_reason TEXT,
    p_suggested_action TEXT,
    p_content_sample TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_dlq_id UUID;
    v_chunk_content TEXT;
    v_content_length INT;
BEGIN
    -- Get chunk content if not provided
    IF p_content_sample IS NULL THEN
        SELECT content INTO v_chunk_content
        FROM file_chunks
        WHERE id = p_chunk_id;
        
        p_content_sample := left(v_chunk_content, 1000);
        v_content_length := length(v_chunk_content);
    END IF;
    
    -- Insert into DLQ
    INSERT INTO embedding_dead_letter_queue (
        original_chunk_id,
        original_job_id,
        poison_type,
        poison_reason,
        suggested_action,
        content_sample,
        content_length,
        estimated_tokens
    ) VALUES (
        p_chunk_id,
        p_job_id,
        p_poison_type,
        p_reason,
        p_suggested_action,
        p_content_sample,
        v_content_length,
        v_content_length / 4 -- Rough token estimate
    ) RETURNING id INTO v_dlq_id;
    
    -- Mark original job as failed with poison reason
    UPDATE embedding_jobs
    SET 
        status = 'error',
        error_message = format('Poison message: %s - %s', p_poison_type, p_reason),
        completed_at = NOW()
    WHERE id = p_job_id;
    
    -- Mark chunk as error
    UPDATE file_chunks
    SET 
        embedding_status = 'error',
        embedding_error = format('Poison message: %s', p_poison_type)
    WHERE id = p_chunk_id;
    
    RETURN v_dlq_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process DLQ item (split large content)
CREATE OR REPLACE FUNCTION process_dlq_split(
    p_dlq_id UUID,
    p_split_contents TEXT[]
) RETURNS INT AS $$
DECLARE
    v_dlq_record RECORD;
    v_split_content TEXT;
    v_split_index INT := 0;
    v_chunk_id UUID;
    v_job_id UUID;
    v_jobs_created INT := 0;
BEGIN
    -- Get DLQ record
    SELECT * INTO v_dlq_record
    FROM embedding_dead_letter_queue
    WHERE id = p_dlq_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'DLQ record not found: %', p_dlq_id;
    END IF;
    
    -- Create chunks for each split
    FOREACH v_split_content IN ARRAY p_split_contents
    LOOP
        v_split_index := v_split_index + 1;
        
        -- Create new chunk for split content
        INSERT INTO file_chunks (
            file_id,
            chunk_index,
            content,
            chunk_metadata,
            embedding_status
        ) VALUES (
            (v_dlq_record.metadata->>'file_id')::UUID,
            (v_dlq_record.metadata->>'chunk_index')::INT + v_split_index - 1,
            v_split_content,
            jsonb_build_object(
                'split_from_dlq', p_dlq_id,
                'split_index', v_split_index,
                'original_metadata', v_dlq_record.metadata->'original_metadata'
            ),
            'pending'
        ) RETURNING id INTO v_chunk_id;
        
        -- Create embedding job
        INSERT INTO embedding_jobs (
            chunk_id,
            priority,
            metadata
        ) VALUES (
            v_chunk_id,
            5, -- Default priority
            jsonb_build_object(
                'split_from_dlq', p_dlq_id,
                'split_index', v_split_index
            )
        ) RETURNING id INTO v_job_id;
        
        -- Store split record
        INSERT INTO embedding_chunk_splits (
            original_chunk_id,
            dlq_id,
            split_index,
            content,
            estimated_tokens,
            embedding_job_id
        ) VALUES (
            v_dlq_record.original_chunk_id,
            p_dlq_id,
            v_split_index,
            v_split_content,
            length(v_split_content) / 4,
            v_job_id
        );
        
        -- Enqueue job
        PERFORM pgmq.send(
            'embeddings',
            jsonb_build_object(
                'job_id', v_job_id,
                'chunk_id', v_chunk_id,
                'priority', 5,
                'action', 'generate_embedding'
            )
        );
        
        v_jobs_created := v_jobs_created + 1;
    END LOOP;
    
    -- Mark DLQ item as resolved
    UPDATE embedding_dead_letter_queue
    SET 
        resolution = 'split',
        resolution_notes = format('Split into %s chunks', v_jobs_created),
        reviewed_at = NOW()
    WHERE id = p_dlq_id;
    
    RETURN v_jobs_created;
END;
$$ LANGUAGE plpgsql;

-- Monitoring view for DLQ
CREATE OR REPLACE VIEW dlq_summary AS
SELECT 
    poison_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE reviewed_at IS NULL) as unreviewed,
    AVG(content_length) as avg_content_length,
    MAX(content_length) as max_content_length,
    MIN(created_at) as oldest_unreviewed
FROM embedding_dead_letter_queue
GROUP BY poison_type;

-- Alert function for DLQ issues
CREATE OR REPLACE FUNCTION check_dlq_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check for high DLQ accumulation
    RETURN QUERY
    SELECT 
        'DLQ_ACCUMULATION'::TEXT,
        'WARNING'::TEXT,
        format('Dead letter queue has %s unreviewed items', COUNT(*)),
        jsonb_build_object('unreviewed_count', COUNT(*))
    FROM embedding_dead_letter_queue
    WHERE reviewed_at IS NULL
    HAVING COUNT(*) > 100;
    
    -- Check for old unreviewed items
    RETURN QUERY
    SELECT 
        'DLQ_STALE_ITEMS'::TEXT,
        'WARNING'::TEXT,
        format('DLQ has items older than 24 hours: %s', COUNT(*)),
        jsonb_build_object('stale_count', COUNT(*))
    FROM embedding_dead_letter_queue
    WHERE reviewed_at IS NULL
    AND created_at < NOW() - INTERVAL '24 hours'
    HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql;

-- Add DLQ stats to system health view
DROP VIEW IF EXISTS embedding_system_health;
CREATE OR REPLACE VIEW embedding_system_health AS
WITH worker_status AS (
    SELECT 
        COUNT(*) as total_workers,
        COUNT(*) FILTER (WHERE status = 'healthy' AND last_heartbeat > NOW() - INTERVAL '2 minutes') as healthy_workers,
        COUNT(*) FILTER (WHERE last_heartbeat < NOW() - INTERVAL '2 minutes') as stale_workers
    FROM worker_health
),
job_stats AS (
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'error') as error_jobs,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) FILTER (WHERE status = 'completed') as avg_completion_time,
        MAX(created_at) FILTER (WHERE status = 'pending') as oldest_pending_job
    FROM embedding_jobs
),
dlq_stats AS (
    SELECT 
        COUNT(*) as total_dlq_items,
        COUNT(*) FILTER (WHERE reviewed_at IS NULL) as unreviewed_dlq_items
    FROM embedding_dead_letter_queue
),
recent_metrics AS (
    SELECT 
        AVG(value) as avg_throughput,
        MAX(value) as peak_throughput
    FROM worker_metrics
    WHERE metric_type = 'throughput'
    AND created_at > NOW() - INTERVAL '1 hour'
)
SELECT 
    get_config('EMBEDDINGS_ENABLED') = 'true' as embeddings_enabled,
    ws.healthy_workers,
    ws.total_workers,
    js.pending_jobs,
    js.processing_jobs,
    js.completed_jobs,
    js.error_jobs,
    js.avg_completion_time,
    EXTRACT(EPOCH FROM (NOW() - js.oldest_pending_job)) as oldest_pending_seconds,
    rm.avg_throughput,
    rm.peak_throughput,
    ds.total_dlq_items,
    ds.unreviewed_dlq_items,
    CASE 
        WHEN get_config('EMBEDDINGS_ENABLED') != 'true' THEN 'DISABLED'
        WHEN ws.healthy_workers = 0 THEN 'CRITICAL'
        WHEN js.pending_jobs > 1000 THEN 'WARNING'
        WHEN js.error_jobs > js.completed_jobs * 0.05 THEN 'WARNING'
        WHEN ds.unreviewed_dlq_items > 50 THEN 'WARNING'
        ELSE 'HEALTHY'
    END as system_status
FROM worker_status ws, job_stats js, dlq_stats ds, recent_metrics rm;

-- Add comment
COMMENT ON TABLE embedding_dead_letter_queue IS 'Dead letter queue for poison messages that could break embedding generation';