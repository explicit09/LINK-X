-- Migration: Capped Restart Processing for Kill Switch
-- Prevents kill switch re-enable from causing system overload

-- Table to track kill switch events and restart processing
CREATE TABLE IF NOT EXISTS kill_switch_events (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL CHECK (event_type IN ('disabled', 'enabled', 'restart_batch_processed')),
    enabled_state BOOLEAN NOT NULL,
    pending_jobs_at_event BIGINT DEFAULT 0,
    jobs_processed_since_enable BIGINT DEFAULT 0,
    batch_size_used INT DEFAULT 0,
    triggered_by TEXT,
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Index for efficient querying
CREATE INDEX idx_kill_switch_events_type_time ON kill_switch_events(event_type, event_timestamp DESC);

-- Function to safely re-enable embeddings with capped processing
CREATE OR REPLACE FUNCTION enable_embeddings_with_capped_restart(
    p_enabled_by TEXT,
    p_initial_batch_size INT DEFAULT 1000,
    p_max_batch_size INT DEFAULT 5000
) RETURNS JSONB AS $$
DECLARE
    v_pending_jobs BIGINT;
    v_was_disabled BOOLEAN;
    v_batch_size INT;
    v_event_id BIGINT;
BEGIN
    -- Check current state
    SELECT get_config('EMBEDDINGS_ENABLED') = 'false' INTO v_was_disabled;
    
    IF NOT v_was_disabled THEN
        RETURN jsonb_build_object(
            'status', 'already_enabled',
            'message', 'Embeddings are already enabled'
        );
    END IF;
    
    -- Count pending jobs
    SELECT COUNT(*) INTO v_pending_jobs
    FROM embedding_jobs
    WHERE status = 'pending';
    
    -- Determine appropriate batch size based on backlog
    v_batch_size := CASE 
        WHEN v_pending_jobs <= 1000 THEN p_initial_batch_size
        WHEN v_pending_jobs <= 10000 THEN p_initial_batch_size * 2
        WHEN v_pending_jobs <= 50000 THEN p_max_batch_size
        ELSE p_max_batch_size -- Cap at max even for huge backlogs
    END;
    
    -- Enable embeddings
    UPDATE system_config 
    SET value = 'true', updated_at = NOW(), updated_by = p_enabled_by
    WHERE key = 'EMBEDDINGS_ENABLED';
    
    -- Set restart batch size configuration
    UPDATE system_config 
    SET value = v_batch_size::TEXT, updated_at = NOW()
    WHERE key = 'RESTART_BATCH_SIZE';
    
    INSERT INTO system_config (key, value, description) VALUES
        ('RESTART_BATCH_SIZE', v_batch_size::TEXT, 'Batch size for processing backlog after kill switch')
    ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW();
    
    -- Set restart mode flag
    INSERT INTO system_config (key, value, description) VALUES
        ('RESTART_MODE_ACTIVE', 'true', 'Flag indicating capped restart processing is active')
    ON CONFLICT (key) DO UPDATE SET
        value = 'true',
        updated_at = NOW();
    
    -- Log the event
    INSERT INTO kill_switch_events (
        event_type,
        enabled_state,
        pending_jobs_at_event,
        batch_size_used,
        triggered_by,
        metadata
    ) VALUES (
        'enabled',
        true,
        v_pending_jobs,
        v_batch_size,
        p_enabled_by,
        jsonb_build_object(
            'restart_mode', true,
            'backlog_size', v_pending_jobs,
            'calculated_batch_size', v_batch_size
        )
    ) RETURNING id INTO v_event_id;
    
    RETURN jsonb_build_object(
        'status', 'enabled_with_capped_restart',
        'pending_jobs', v_pending_jobs,
        'batch_size', v_batch_size,
        'event_id', v_event_id,
        'message', format('Enabled with capped restart: %s jobs queued, batch size %s', 
                         v_pending_jobs, v_batch_size)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to disable embeddings safely
CREATE OR REPLACE FUNCTION disable_embeddings_safely(
    p_disabled_by TEXT,
    p_reason TEXT DEFAULT 'Manual disable'
) RETURNS JSONB AS $$
DECLARE
    v_pending_jobs BIGINT;
    v_processing_jobs BIGINT;
    v_was_enabled BOOLEAN;
BEGIN
    -- Check current state
    SELECT get_config('EMBEDDINGS_ENABLED') = 'true' INTO v_was_enabled;
    
    IF NOT v_was_enabled THEN
        RETURN jsonb_build_object(
            'status', 'already_disabled',
            'message', 'Embeddings are already disabled'
        );
    END IF;
    
    -- Count current jobs
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'processing')
    INTO v_pending_jobs, v_processing_jobs
    FROM embedding_jobs;
    
    -- Disable embeddings
    UPDATE system_config 
    SET value = 'false', updated_at = NOW(), updated_by = p_disabled_by
    WHERE key = 'EMBEDDINGS_ENABLED';
    
    -- Clear restart mode
    UPDATE system_config 
    SET value = 'false'
    WHERE key = 'RESTART_MODE_ACTIVE';
    
    -- Log the event
    INSERT INTO kill_switch_events (
        event_type,
        enabled_state,
        pending_jobs_at_event,
        triggered_by,
        metadata
    ) VALUES (
        'disabled',
        false,
        v_pending_jobs,
        p_disabled_by,
        jsonb_build_object(
            'reason', p_reason,
            'processing_jobs_at_disable', v_processing_jobs
        )
    );
    
    RETURN jsonb_build_object(
        'status', 'disabled',
        'pending_jobs', v_pending_jobs,
        'processing_jobs', v_processing_jobs,
        'message', format('Disabled: %s pending, %s processing jobs', 
                         v_pending_jobs, v_processing_jobs)
    );
END;
$$ LANGUAGE plpgsql;

-- Updated claim function with restart mode support
CREATE OR REPLACE FUNCTION claim_embedding_jobs_with_restart_cap(
    p_worker_id TEXT,
    p_batch_size INT DEFAULT 100
) RETURNS TABLE(job_id UUID, chunk_id UUID) AS $$
DECLARE
    v_restart_mode BOOLEAN;
    v_restart_batch_size INT;
    v_effective_batch_size INT;
    v_jobs_processed_this_session BIGINT;
BEGIN
    -- Check if we're in restart mode
    SELECT get_config('RESTART_MODE_ACTIVE') = 'true' INTO v_restart_mode;
    
    IF v_restart_mode THEN
        -- Get restart batch size
        SELECT get_config('RESTART_BATCH_SIZE')::INT INTO v_restart_batch_size;
        v_restart_batch_size := COALESCE(v_restart_batch_size, 1000);
        
        -- Count jobs processed since last enable event
        SELECT COALESCE(SUM(jobs_processed_since_enable), 0) INTO v_jobs_processed_this_session
        FROM kill_switch_events
        WHERE event_type = 'restart_batch_processed'
        AND event_timestamp > (
            SELECT MAX(event_timestamp) 
            FROM kill_switch_events 
            WHERE event_type = 'enabled'
        );
        
        -- Use smaller batch size in restart mode
        v_effective_batch_size := LEAST(p_batch_size, v_restart_batch_size);
        
        -- Check if we've processed enough for this restart session
        IF v_jobs_processed_this_session >= v_restart_batch_size * 5 THEN
            -- Processed 5 full batches, exit restart mode
            UPDATE system_config 
            SET value = 'false'
            WHERE key = 'RESTART_MODE_ACTIVE';
            
            v_restart_mode := false;
            v_effective_batch_size := p_batch_size;
        END IF;
    ELSE
        v_effective_batch_size := p_batch_size;
    END IF;
    
    -- Claim jobs with effective batch size
    RETURN QUERY
    WITH claimed AS (
        SELECT ej.id, ej.chunk_id
        FROM embedding_jobs ej
        WHERE ej.status = 'pending'
        AND ej.attempt_count < ej.max_attempts
        ORDER BY ej.priority DESC, ej.created_at
        LIMIT v_effective_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE embedding_jobs ej
    SET 
        status = 'processing',
        started_at = NOW(),
        attempt_count = attempt_count + 1,
        metadata = metadata || jsonb_build_object(
            'worker_id', p_worker_id,
            'restart_mode', v_restart_mode,
            'batch_size_used', v_effective_batch_size
        )
    FROM claimed
    WHERE ej.id = claimed.id
    RETURNING ej.id, ej.chunk_id;
    
    -- Log restart batch processing if in restart mode
    IF v_restart_mode THEN
        INSERT INTO kill_switch_events (
            event_type,
            enabled_state,
            jobs_processed_since_enable,
            batch_size_used,
            triggered_by,
            metadata
        ) VALUES (
            'restart_batch_processed',
            true,
            v_effective_batch_size,
            v_effective_batch_size,
            p_worker_id,
            jsonb_build_object(
                'total_processed_this_session', v_jobs_processed_this_session + v_effective_batch_size,
                'restart_batch_limit', v_restart_batch_size
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check kill switch restart status
CREATE OR REPLACE FUNCTION get_kill_switch_status() RETURNS JSONB AS $$
DECLARE
    v_enabled BOOLEAN;
    v_restart_mode BOOLEAN;
    v_pending_jobs BIGINT;
    v_restart_batch_size INT;
    v_jobs_processed_since_enable BIGINT;
    v_last_event RECORD;
BEGIN
    -- Get current state
    SELECT get_config('EMBEDDINGS_ENABLED') = 'true' INTO v_enabled;
    SELECT get_config('RESTART_MODE_ACTIVE') = 'true' INTO v_restart_mode;
    SELECT get_config('RESTART_BATCH_SIZE')::INT INTO v_restart_batch_size;
    
    -- Count pending jobs
    SELECT COUNT(*) INTO v_pending_jobs
    FROM embedding_jobs
    WHERE status = 'pending';
    
    -- Get jobs processed since last enable
    SELECT COALESCE(SUM(jobs_processed_since_enable), 0) INTO v_jobs_processed_since_enable
    FROM kill_switch_events
    WHERE event_type = 'restart_batch_processed'
    AND event_timestamp > (
        SELECT COALESCE(MAX(event_timestamp), '1970-01-01'::timestamptz)
        FROM kill_switch_events 
        WHERE event_type = 'enabled'
    );
    
    -- Get last event
    SELECT * INTO v_last_event
    FROM kill_switch_events
    ORDER BY event_timestamp DESC
    LIMIT 1;
    
    RETURN jsonb_build_object(
        'enabled', v_enabled,
        'restart_mode_active', v_restart_mode,
        'pending_jobs', v_pending_jobs,
        'restart_batch_size', v_restart_batch_size,
        'jobs_processed_since_enable', v_jobs_processed_since_enable,
        'last_event', jsonb_build_object(
            'type', v_last_event.event_type,
            'timestamp', v_last_event.event_timestamp,
            'triggered_by', v_last_event.triggered_by
        ),
        'restart_progress_percent', 
            CASE 
                WHEN v_restart_mode AND v_restart_batch_size > 0 THEN
                    ROUND((v_jobs_processed_since_enable::NUMERIC / (v_restart_batch_size * 5)) * 100, 1)
                ELSE 0
            END
    );
END;
$$ LANGUAGE plpgsql;

-- View for monitoring kill switch and restart events
CREATE OR REPLACE VIEW kill_switch_monitoring AS
WITH event_summary AS (
    SELECT 
        event_type,
        COUNT(*) as event_count,
        MAX(event_timestamp) as last_occurrence,
        AVG(pending_jobs_at_event) as avg_pending_jobs,
        SUM(jobs_processed_since_enable) as total_jobs_processed
    FROM kill_switch_events
    WHERE event_timestamp > NOW() - INTERVAL '7 days'
    GROUP BY event_type
),
current_status AS (
    SELECT get_kill_switch_status() as status
)
SELECT 
    es.event_type,
    es.event_count,
    es.last_occurrence,
    es.avg_pending_jobs,
    es.total_jobs_processed,
    cs.status
FROM event_summary es
CROSS JOIN current_status cs
UNION ALL
SELECT 
    'current_status' as event_type,
    0 as event_count,
    NOW() as last_occurrence,
    (cs.status->>'pending_jobs')::BIGINT as avg_pending_jobs,
    (cs.status->>'jobs_processed_since_enable')::BIGINT as total_jobs_processed,
    cs.status
FROM current_status cs;

-- Add kill switch monitoring to alerts
CREATE OR REPLACE FUNCTION check_kill_switch_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
DECLARE
    v_status JSONB;
BEGIN
    v_status := get_kill_switch_status();
    
    -- Alert if restart mode is taking too long
    RETURN QUERY
    SELECT 
        'RESTART_MODE_STUCK'::TEXT,
        'WARNING'::TEXT,
        'Restart mode has been active for over 1 hour',
        v_status
    WHERE (v_status->>'restart_mode_active')::boolean = true
    AND EXISTS (
        SELECT 1 FROM kill_switch_events
        WHERE event_type = 'enabled'
        AND event_timestamp < NOW() - INTERVAL '1 hour'
        AND event_timestamp > NOW() - INTERVAL '2 hours'
    );
    
    -- Alert if pending jobs are growing despite being enabled
    RETURN QUERY
    SELECT 
        'PENDING_JOBS_GROWING'::TEXT,
        'WARNING'::TEXT,
        format('Pending jobs count is %s despite embeddings being enabled', 
               v_status->>'pending_jobs'),
        v_status
    WHERE (v_status->>'enabled')::boolean = true
    AND (v_status->>'pending_jobs')::bigint > 5000
    AND NOT (v_status->>'restart_mode_active')::boolean;
END;
$$ LANGUAGE plpgsql;

-- Add kill switch status to system health
DROP VIEW IF EXISTS embedding_system_health;
CREATE OR REPLACE VIEW embedding_system_health AS
WITH worker_status AS (
    SELECT 
        COUNT(*) as total_workers,
        COUNT(*) FILTER (WHERE status = 'healthy' AND last_heartbeat > NOW() - INTERVAL '2 minutes') as healthy_workers
    FROM worker_health
),
job_stats AS (
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'error') as error_jobs
    FROM embedding_jobs
),
kill_switch_status AS (
    SELECT get_kill_switch_status() as ks_status
)
SELECT 
    (kss.ks_status->>'enabled')::boolean as embeddings_enabled,
    (kss.ks_status->>'restart_mode_active')::boolean as restart_mode_active,
    ws.healthy_workers,
    js.pending_jobs,
    js.completed_jobs,
    js.error_jobs,
    kss.ks_status as kill_switch_details,
    CASE 
        WHEN NOT (kss.ks_status->>'enabled')::boolean THEN 'DISABLED'
        WHEN ws.healthy_workers = 0 THEN 'CRITICAL'
        WHEN js.pending_jobs > 10000 AND NOT (kss.ks_status->>'restart_mode_active')::boolean THEN 'WARNING'
        WHEN (kss.ks_status->>'restart_mode_active')::boolean THEN 'RESTART_MODE'
        ELSE 'HEALTHY'
    END as system_status
FROM worker_status ws, job_stats js, kill_switch_status kss;

-- Initialize restart batch size config if not exists
INSERT INTO system_config (key, value, description) VALUES
    ('RESTART_BATCH_SIZE', '1000', 'Batch size for processing jobs after kill switch re-enable'),
    ('RESTART_MODE_ACTIVE', 'false', 'Flag indicating capped restart processing is active')
ON CONFLICT (key) DO NOTHING;

-- Comments
COMMENT ON TABLE kill_switch_events IS 'Tracks kill switch events and restart processing progress';
COMMENT ON FUNCTION enable_embeddings_with_capped_restart IS 'Safely re-enables embeddings with capped batch processing to prevent overload';
COMMENT ON FUNCTION claim_embedding_jobs_with_restart_cap IS 'Claims jobs with restart mode batch size limits';