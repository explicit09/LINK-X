-- Migration: Add monitoring and kill switch for embedding system

-- Worker health tracking
CREATE TABLE IF NOT EXISTS worker_health (
    worker_id TEXT PRIMARY KEY,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'healthy' 
        CHECK (status IN ('healthy', 'unhealthy', 'stopped')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Worker metrics
CREATE TABLE IF NOT EXISTS worker_metrics (
    id BIGSERIAL PRIMARY KEY,
    worker_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient metric queries
CREATE INDEX idx_worker_metrics_lookup ON worker_metrics(worker_id, metric_type, created_at DESC);

-- System configuration table for kill switches
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Insert kill switch configuration
INSERT INTO system_config (key, value, description) VALUES
    ('EMBEDDINGS_ENABLED', 'true', 'Master switch for embedding generation'),
    ('EMBEDDING_BATCH_SIZE', '100', 'Number of embeddings to process per batch'),
    ('EMBEDDING_MODEL', 'text-embedding-3-small', 'OpenAI model for embeddings'),
    ('MAX_WORKERS', '3', 'Maximum number of concurrent workers')
ON CONFLICT (key) DO NOTHING;

-- Function to get config value with caching
CREATE OR REPLACE FUNCTION get_config(p_key TEXT) RETURNS TEXT AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value
    FROM system_config
    WHERE key = p_key;
    
    RETURN v_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- Monitoring views
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
    CASE 
        WHEN get_config('EMBEDDINGS_ENABLED') != 'true' THEN 'DISABLED'
        WHEN ws.healthy_workers = 0 THEN 'CRITICAL'
        WHEN js.pending_jobs > 1000 THEN 'WARNING'
        WHEN js.error_jobs > js.completed_jobs * 0.05 THEN 'WARNING'
        ELSE 'HEALTHY'
    END as system_status
FROM worker_status ws, job_stats js, recent_metrics rm;

-- Function to calculate embedding costs
CREATE OR REPLACE FUNCTION calculate_embedding_costs(
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
    total_embeddings BIGINT,
    total_tokens BIGINT,
    estimated_cost NUMERIC,
    avg_embeddings_per_day NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_embeddings,
        SUM(length(fc.content) / 4) as total_tokens, -- Rough token estimate
        SUM(length(fc.content) / 4) * 0.00002 / 1000 as estimated_cost, -- $0.020 per 1M tokens
        COUNT(*) / EXTRACT(DAY FROM (p_end_date - p_start_date)) as avg_embeddings_per_day
    FROM file_chunks fc
    WHERE fc.embedding_generated_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Alerting function for monitoring
CREATE OR REPLACE FUNCTION check_embedding_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check for stale workers
    RETURN QUERY
    SELECT 
        'STALE_WORKER'::TEXT,
        'WARNING'::TEXT,
        format('Worker %s has not reported heartbeat for %s', 
            worker_id, 
            age(NOW(), last_heartbeat)
        ),
        jsonb_build_object('worker_id', worker_id, 'last_seen', last_heartbeat)
    FROM worker_health
    WHERE last_heartbeat < NOW() - INTERVAL '5 minutes';
    
    -- Check for high error rate
    RETURN QUERY
    WITH error_rate AS (
        SELECT 
            COUNT(*) FILTER (WHERE status = 'error') * 100.0 / 
            NULLIF(COUNT(*), 0) as error_percentage
        FROM embedding_jobs
        WHERE created_at > NOW() - INTERVAL '1 hour'
    )
    SELECT 
        'HIGH_ERROR_RATE'::TEXT,
        'CRITICAL'::TEXT,
        format('Error rate is %.1f%% in the last hour', error_percentage),
        jsonb_build_object('error_rate', error_percentage)
    FROM error_rate
    WHERE error_percentage > 5;
    
    -- Check for queue backup
    RETURN QUERY
    WITH queue_stats AS (
        SELECT 
            COUNT(*) as pending_count,
            MAX(created_at) as oldest_job
        FROM embedding_jobs
        WHERE status = 'pending'
    )
    SELECT 
        'QUEUE_BACKUP'::TEXT,
        'WARNING'::TEXT,
        format('Queue has %s pending jobs, oldest from %s', 
            pending_count, 
            oldest_job
        ),
        jsonb_build_object(
            'pending_count', pending_count, 
            'oldest_job_age', age(NOW(), oldest_job)
        )
    FROM queue_stats
    WHERE pending_count > 500
    OR oldest_job < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- Performance optimization: partial index for pending jobs
CREATE INDEX idx_embedding_jobs_pending 
ON embedding_jobs(created_at, priority DESC) 
WHERE status = 'pending';

-- Add comment
COMMENT ON TABLE worker_metrics IS 'Metrics collected from embedding workers for monitoring and optimization';