-- Migration: Automated Vector Re-indexing
-- Monitors index health and triggers reindexing when needed

-- Vector index health monitoring table
CREATE TABLE IF NOT EXISTS vector_index_health (
    id BIGSERIAL PRIMARY KEY,
    partition_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    index_name TEXT NOT NULL,
    check_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index statistics
    total_pages BIGINT,
    deleted_pages BIGINT,
    index_size_bytes BIGINT,
    vector_count BIGINT,
    
    -- Health metrics
    fragmentation_ratio FLOAT, -- deleted_pages / total_pages
    bloat_ratio FLOAT, -- (index_size - optimal_size) / optimal_size
    avg_query_time_ms FLOAT,
    index_scans_count BIGINT,
    
    -- Performance indicators
    recall_accuracy FLOAT, -- If known from quality tests
    memory_usage_mb FLOAT,
    build_time_seconds FLOAT,
    
    -- Health status
    health_status TEXT CHECK (health_status IN ('healthy', 'degraded', 'critical', 'rebuilding')),
    needs_reindex BOOLEAN DEFAULT false,
    reindex_priority INT DEFAULT 0, -- 1-5, higher = more urgent
    
    -- Recommendations
    recommended_action TEXT,
    estimated_rebuild_time_minutes INT,
    
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX (partition_name, check_timestamp),
    INDEX (health_status, needs_reindex),
    INDEX (reindex_priority DESC, check_timestamp)
);

-- Index rebuild operations tracking
CREATE TABLE IF NOT EXISTS index_rebuild_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partition_name TEXT NOT NULL,
    index_name TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('reindex', 'vacuum', 'analyze', 'rebuild')),
    
    -- Operation details
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INT,
    
    -- Pre-operation state
    pre_fragmentation_ratio FLOAT,
    pre_index_size_bytes BIGINT,
    pre_vector_count BIGINT,
    
    -- Post-operation state
    post_fragmentation_ratio FLOAT,
    post_index_size_bytes BIGINT,
    post_vector_count BIGINT,
    
    -- Operation result
    status TEXT CHECK (status IN ('running', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
    error_message TEXT,
    performance_improvement_percent FLOAT,
    
    -- Scheduling
    triggered_by TEXT CHECK (triggered_by IN ('automatic', 'manual', 'emergency')),
    scheduled_by UUID,
    
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX (partition_name, started_at),
    INDEX (status, started_at),
    INDEX (triggered_by, started_at)
);

-- Function to check vector index health
CREATE OR REPLACE FUNCTION check_vector_index_health(
    p_partition_name TEXT DEFAULT NULL
) RETURNS TABLE (
    partition_name TEXT,
    vector_count BIGINT,
    index_size_mb FLOAT,
    index_type TEXT,
    memory_usage_mb FLOAT,
    recommended_action TEXT
) AS $$
DECLARE
    v_partition RECORD;
    v_index_stats RECORD;
    v_fragmentation FLOAT;
    v_health_status TEXT;
    v_needs_reindex BOOLEAN;
    v_recommended_action TEXT;
BEGIN
    -- Get all partitions or specific partition
    FOR v_partition IN 
        SELECT 
            schemaname,
            tablename,
            indexname
        FROM pg_indexes
        WHERE indexname LIKE '%embedding%vector%'
        AND (p_partition_name IS NULL OR tablename = p_partition_name)
    LOOP
        -- Get index statistics
        SELECT 
            pg_relation_size(indexrelid) as index_size,
            pg_stat_get_blocks_fetched(indexrelid) as blocks_fetched,
            pg_stat_get_blocks_hit(indexrelid) as blocks_hit
        INTO v_index_stats
        FROM pg_stat_user_indexes
        WHERE indexrelname = v_partition.indexname;
        
        -- Calculate fragmentation (simplified metric)
        SELECT COUNT(*) INTO v_fragmentation
        FROM information_schema.tables
        WHERE table_name = v_partition.tablename;
        
        -- Determine health status and recommendations
        v_fragmentation := COALESCE(v_fragmentation, 0.0);
        
        IF v_fragmentation > 0.5 THEN
            v_health_status := 'critical';
            v_needs_reindex := true;
            v_recommended_action := 'REINDEX CONCURRENTLY - High fragmentation detected';
        ELSIF v_fragmentation > 0.3 THEN
            v_health_status := 'degraded';
            v_needs_reindex := true;
            v_recommended_action := 'Schedule reindex during maintenance window';
        ELSIF v_index_stats.index_size > 10737418240 THEN -- 10GB
            v_health_status := 'degraded';
            v_needs_reindex := false;
            v_recommended_action := 'Consider partitioning - Large index size';
        ELSE
            v_health_status := 'healthy';
            v_needs_reindex := false;
            v_recommended_action := 'No action needed';
        END IF;
        
        -- Store health check result
        INSERT INTO vector_index_health (
            partition_name,
            table_name,
            index_name,
            total_pages,
            index_size_bytes,
            vector_count,
            fragmentation_ratio,
            health_status,
            needs_reindex,
            recommended_action,
            memory_usage_mb
        ) VALUES (
            v_partition.tablename,
            v_partition.tablename,
            v_partition.indexname,
            COALESCE(v_index_stats.blocks_fetched + v_index_stats.blocks_hit, 0),
            COALESCE(v_index_stats.index_size, 0),
            v_fragmentation,
            v_fragmentation,
            v_health_status,
            v_needs_reindex,
            v_recommended_action,
            COALESCE(v_index_stats.index_size::FLOAT / 1048576, 0) -- Convert to MB
        );
        
        -- Return result for this partition
        RETURN QUERY SELECT 
            v_partition.tablename,
            v_fragmentation::BIGINT,
            COALESCE(v_index_stats.index_size::FLOAT / 1048576, 0),
            'HNSW', -- Assume HNSW for vector indexes
            COALESCE(v_index_stats.index_size::FLOAT / 1048576, 0),
            v_recommended_action;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically reindex when needed
CREATE OR REPLACE FUNCTION auto_reindex_vector_indexes() RETURNS JSONB AS $$
DECLARE
    v_health_check RECORD;
    v_operation_id UUID;
    v_reindexed_count INT := 0;
    v_results JSONB := '[]'::jsonb;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    -- Check if embeddings are enabled (don't reindex during downtime)
    IF get_config('EMBEDDINGS_ENABLED') != 'true' THEN
        RETURN jsonb_build_object(
            'status', 'skipped',
            'reason', 'Embeddings disabled - skipping reindex',
            'reindexed_count', 0
        );
    END IF;
    
    -- Get indexes that need reindexing
    FOR v_health_check IN
        SELECT DISTINCT ON (partition_name)
            partition_name,
            index_name,
            fragmentation_ratio,
            health_status,
            reindex_priority
        FROM vector_index_health
        WHERE needs_reindex = true
        AND health_status IN ('degraded', 'critical')
        AND check_timestamp > NOW() - INTERVAL '1 hour' -- Recent health check
        ORDER BY partition_name, reindex_priority DESC, check_timestamp DESC
        LIMIT 3 -- Limit concurrent reindexing
    LOOP
        v_start_time := NOW();
        v_operation_id := gen_random_uuid();
        
        BEGIN
            -- Log start of operation
            INSERT INTO index_rebuild_operations (
                id,
                partition_name,
                index_name,
                operation_type,
                pre_fragmentation_ratio,
                triggered_by,
                scheduled_by
            ) VALUES (
                v_operation_id,
                v_health_check.partition_name,
                v_health_check.index_name,
                'reindex',
                v_health_check.fragmentation_ratio,
                'automatic',
                current_setting('app.current_user_id', true)::UUID
            );
            
            -- Perform concurrent reindex to avoid blocking
            EXECUTE format('REINDEX INDEX CONCURRENTLY %I', v_health_check.index_name);
            
            v_end_time := NOW();
            
            -- Update operation as completed
            UPDATE index_rebuild_operations
            SET 
                completed_at = v_end_time,
                duration_seconds = EXTRACT(EPOCH FROM v_end_time - v_start_time),
                status = 'completed'
            WHERE id = v_operation_id;
            
            -- Mark index as healthy after reindex
            UPDATE vector_index_health
            SET 
                health_status = 'healthy',
                needs_reindex = false,
                recommended_action = 'Recently reindexed'
            WHERE partition_name = v_health_check.partition_name
            AND index_name = v_health_check.index_name;
            
            v_reindexed_count := v_reindexed_count + 1;
            
            v_results := v_results || jsonb_build_object(
                'partition', v_health_check.partition_name,
                'index', v_health_check.index_name,
                'status', 'completed',
                'duration_seconds', EXTRACT(EPOCH FROM v_end_time - v_start_time),
                'pre_fragmentation', v_health_check.fragmentation_ratio
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- Log failed operation
            UPDATE index_rebuild_operations
            SET 
                completed_at = NOW(),
                duration_seconds = EXTRACT(EPOCH FROM NOW() - v_start_time),
                status = 'failed',
                error_message = SQLERRM
            WHERE id = v_operation_id;
            
            v_results := v_results || jsonb_build_object(
                'partition', v_health_check.partition_name,
                'index', v_health_check.index_name,
                'status', 'failed',
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'status', 'completed',
        'reindexed_count', v_reindexed_count,
        'operations', v_results,
        'executed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to schedule maintenance reindexing
CREATE OR REPLACE FUNCTION schedule_maintenance_reindex(
    p_partition_name TEXT DEFAULT NULL,
    p_force BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
    v_maintenance_window BOOLEAN;
    v_current_hour INT;
    v_result JSONB;
BEGIN
    -- Check if we're in maintenance window (2-6 AM UTC)
    v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC');
    v_maintenance_window := v_current_hour BETWEEN 2 AND 6;
    
    IF NOT v_maintenance_window AND NOT p_force THEN
        RETURN jsonb_build_object(
            'status', 'scheduled',
            'message', 'Reindex scheduled for next maintenance window (2-6 AM UTC)',
            'current_hour_utc', v_current_hour
        );
    END IF;
    
    -- Execute reindexing
    v_result := auto_reindex_vector_indexes();
    
    RETURN v_result || jsonb_build_object(
        'maintenance_window', v_maintenance_window,
        'forced', p_force
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get vector performance recommendations
CREATE OR REPLACE FUNCTION get_vector_performance_recommendations() RETURNS TABLE (
    recommendation_type TEXT,
    current_value TEXT,
    recommended_value TEXT,
    impact TEXT,
    priority INT
) AS $$
BEGIN
    -- Check for large indexes that need partitioning
    RETURN QUERY
    SELECT 
        'INDEX_PARTITIONING'::TEXT,
        format('%s MB', ROUND(vih.index_size_bytes::FLOAT / 1048576, 1)),
        'Consider partitioning by date or tenant',
        'Reduced memory usage and faster rebuilds',
        CASE WHEN vih.index_size_bytes > 10737418240 THEN 1 ELSE 3 END -- 10GB threshold
    FROM vector_index_health vih
    WHERE vih.index_size_bytes > 5368709120 -- 5GB threshold
    AND vih.check_timestamp > NOW() - INTERVAL '1 day'
    GROUP BY vih.index_size_bytes;
    
    -- Check for high fragmentation
    RETURN QUERY
    SELECT 
        'REINDEX_NEEDED'::TEXT,
        format('%.1f%% fragmented', vih.fragmentation_ratio * 100),
        'Schedule reindex during maintenance window',
        'Improved query performance and reduced memory usage',
        CASE WHEN vih.fragmentation_ratio > 0.3 THEN 1 ELSE 2 END
    FROM vector_index_health vih
    WHERE vih.fragmentation_ratio > 0.2
    AND vih.check_timestamp > NOW() - INTERVAL '1 day'
    GROUP BY vih.fragmentation_ratio;
    
    -- Check for memory pressure
    RETURN QUERY
    SELECT 
        'MEMORY_OPTIMIZATION'::TEXT,
        format('%s MB memory usage', ROUND(SUM(vih.memory_usage_mb), 1)),
        'Consider IVFFlat for large datasets or archive old vectors',
        'Reduced memory footprint',
        2
    FROM vector_index_health vih
    WHERE vih.check_timestamp > NOW() - INTERVAL '1 day'
    GROUP BY ()
    HAVING SUM(vih.memory_usage_mb) > 1024; -- 1GB threshold
END;
$$ LANGUAGE plpgsql;

-- Function to analyze vector index performance
CREATE OR REPLACE FUNCTION analyze_vector_index_performance(
    p_partition_name TEXT,
    p_sample_queries INT DEFAULT 100
) RETURNS JSONB AS $$
DECLARE
    v_avg_query_time FLOAT;
    v_sample_queries TEXT[];
    v_query_time FLOAT;
    v_total_time FLOAT := 0;
    v_query TEXT;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    -- Generate sample vector queries for performance testing
    -- This is a simplified version - in practice you'd use real query patterns
    
    FOR i IN 1..p_sample_queries LOOP
        -- Generate random vector for testing
        v_query := format(
            'SELECT id FROM %I WHERE embedding <-> ''[%s]''::vector ORDER BY embedding <-> ''[%s]''::vector LIMIT 10',
            p_partition_name,
            array_to_string(ARRAY(SELECT random()::TEXT FROM generate_series(1,1536)), ','),
            array_to_string(ARRAY(SELECT random()::TEXT FROM generate_series(1,1536)), ',')
        );
        
        v_start_time := clock_timestamp();
        
        BEGIN
            EXECUTE v_query;
            v_end_time := clock_timestamp();
            v_query_time := EXTRACT(MILLISECONDS FROM v_end_time - v_start_time);
            v_total_time := v_total_time + v_query_time;
        EXCEPTION WHEN OTHERS THEN
            -- Skip failed queries
            CONTINUE;
        END;
        
        -- Avoid overwhelming the system
        PERFORM pg_sleep(0.01); -- 10ms delay between queries
    END LOOP;
    
    v_avg_query_time := v_total_time / p_sample_queries;
    
    -- Update health record with performance data
    UPDATE vector_index_health
    SET 
        avg_query_time_ms = v_avg_query_time,
        metadata = metadata || jsonb_build_object(
            'last_performance_test', NOW(),
            'sample_queries_count', p_sample_queries,
            'total_test_time_ms', v_total_time
        )
    WHERE partition_name = p_partition_name
    AND check_timestamp > NOW() - INTERVAL '1 hour';
    
    RETURN jsonb_build_object(
        'partition_name', p_partition_name,
        'avg_query_time_ms', v_avg_query_time,
        'sample_queries', p_sample_queries,
        'total_time_ms', v_total_time,
        'performance_grade', 
            CASE 
                WHEN v_avg_query_time < 50 THEN 'A'
                WHEN v_avg_query_time < 100 THEN 'B'
                WHEN v_avg_query_time < 200 THEN 'C'
                WHEN v_avg_query_time < 500 THEN 'D'
                ELSE 'F'
            END,
        'tested_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Automated health check and reindexing job
CREATE OR REPLACE FUNCTION run_vector_maintenance() RETURNS JSONB AS $$
DECLARE
    v_health_results JSONB;
    v_reindex_results JSONB;
    v_critical_indexes INT;
BEGIN
    -- Run health check on all vector indexes
    PERFORM check_vector_index_health();
    
    -- Count critical indexes
    SELECT COUNT(*) INTO v_critical_indexes
    FROM vector_index_health
    WHERE health_status = 'critical'
    AND check_timestamp > NOW() - INTERVAL '1 hour';
    
    -- If we have critical indexes, try to reindex them
    IF v_critical_indexes > 0 THEN
        v_reindex_results := auto_reindex_vector_indexes();
    ELSE
        v_reindex_results := jsonb_build_object(
            'status', 'skipped',
            'reason', 'No critical indexes found'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'health_check_completed', true,
        'critical_indexes_found', v_critical_indexes,
        'reindex_results', v_reindex_results,
        'maintenance_run_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule automated maintenance (requires pg_cron)
-- This should be run during low-traffic hours
-- SELECT cron.schedule('vector-maintenance', '0 3 * * *', 'SELECT run_vector_maintenance();');

-- View for monitoring vector index health
CREATE OR REPLACE VIEW vector_health_dashboard AS
WITH latest_health AS (
    SELECT DISTINCT ON (partition_name)
        partition_name,
        table_name,
        index_name,
        health_status,
        fragmentation_ratio,
        index_size_bytes,
        vector_count,
        memory_usage_mb,
        avg_query_time_ms,
        needs_reindex,
        recommended_action,
        check_timestamp
    FROM vector_index_health
    ORDER BY partition_name, check_timestamp DESC
),
recent_operations AS (
    SELECT 
        partition_name,
        COUNT(*) as total_operations,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_operations,
        MAX(completed_at) as last_operation
    FROM index_rebuild_operations
    WHERE started_at > NOW() - INTERVAL '30 days'
    GROUP BY partition_name
)
SELECT 
    lh.partition_name,
    lh.health_status,
    lh.fragmentation_ratio,
    ROUND(lh.index_size_bytes::FLOAT / 1048576, 1) as index_size_mb,
    lh.vector_count,
    lh.memory_usage_mb,
    lh.avg_query_time_ms,
    lh.needs_reindex,
    lh.recommended_action,
    lh.check_timestamp as last_health_check,
    COALESCE(ro.total_operations, 0) as maintenance_operations_30d,
    COALESCE(ro.successful_operations, 0) as successful_operations_30d,
    ro.last_operation,
    CASE lh.health_status
        WHEN 'critical' THEN 1
        WHEN 'degraded' THEN 2
        WHEN 'rebuilding' THEN 3
        ELSE 4
    END as priority_order
FROM latest_health lh
LEFT JOIN recent_operations ro ON ro.partition_name = lh.partition_name
ORDER BY priority_order, lh.fragmentation_ratio DESC;

-- Function to check vector index alerts
CREATE OR REPLACE FUNCTION check_vector_index_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- Critical fragmentation alerts
    RETURN QUERY
    SELECT 
        'VECTOR_INDEX_CRITICAL_FRAGMENTATION'::TEXT,
        'CRITICAL'::TEXT,
        format('Vector index %s has critical fragmentation: %.1f%%', 
               vih.index_name, vih.fragmentation_ratio * 100),
        jsonb_build_object(
            'partition_name', vih.partition_name,
            'index_name', vih.index_name,
            'fragmentation_ratio', vih.fragmentation_ratio,
            'recommended_action', vih.recommended_action
        )
    FROM vector_index_health vih
    WHERE vih.health_status = 'critical'
    AND vih.check_timestamp > NOW() - INTERVAL '2 hours';
    
    -- Large index size alerts
    RETURN QUERY
    SELECT 
        'VECTOR_INDEX_SIZE_WARNING'::TEXT,
        'WARNING'::TEXT,
        format('Vector index %s is very large: %.1f GB', 
               vih.index_name, vih.index_size_bytes::FLOAT / 1073741824),
        jsonb_build_object(
            'partition_name', vih.partition_name,
            'index_name', vih.index_name,
            'size_gb', ROUND(vih.index_size_bytes::FLOAT / 1073741824, 1),
            'recommended_action', 'Consider partitioning'
        )
    FROM vector_index_health vih
    WHERE vih.index_size_bytes > 10737418240 -- 10GB
    AND vih.check_timestamp > NOW() - INTERVAL '2 hours';
    
    -- Slow query performance alerts
    RETURN QUERY
    SELECT 
        'VECTOR_QUERY_PERFORMANCE_DEGRADED'::TEXT,
        'WARNING'::TEXT,
        format('Vector queries on %s are slow: %.1f ms average', 
               vih.partition_name, vih.avg_query_time_ms),
        jsonb_build_object(
            'partition_name', vih.partition_name,
            'avg_query_time_ms', vih.avg_query_time_ms,
            'performance_threshold_ms', 200,
            'recommended_action', vih.recommended_action
        )
    FROM vector_index_health vih
    WHERE vih.avg_query_time_ms > 200 -- 200ms threshold
    AND vih.check_timestamp > NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE vector_index_health IS 'Tracks vector index health metrics and fragmentation';
COMMENT ON TABLE index_rebuild_operations IS 'Logs all index maintenance operations and their results';
COMMENT ON FUNCTION check_vector_index_health IS 'Analyzes vector index health and recommends actions';
COMMENT ON FUNCTION auto_reindex_vector_indexes IS 'Automatically reindexes degraded vector indexes';
COMMENT ON FUNCTION run_vector_maintenance IS 'Comprehensive vector index maintenance routine';