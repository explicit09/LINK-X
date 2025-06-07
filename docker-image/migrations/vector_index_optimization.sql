-- Migration: Vector Index Optimization for Production Scale
-- Addresses HNSW memory bloat and provides partitioning strategies

-- Create partitioned table for file chunks by tenant/course
-- This prevents index bloat and allows dropping old data efficiently

-- Step 1: Create new partitioned table structure
CREATE TABLE IF NOT EXISTS file_chunks_partitioned (
    id UUID DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL,
    course_id UUID NOT NULL, -- Partition key
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    chunk_metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    embedding_version TEXT,
    embedding_status TEXT DEFAULT 'pending' 
        CHECK (embedding_status IN ('pending', 'processing', 'completed', 'error')),
    embedding_error TEXT,
    embedding_generated_at TIMESTAMPTZ,
    embedding_attempt_count INT DEFAULT 0,
    last_embedding_attempt TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Composite primary key including partition key
    PRIMARY KEY (course_id, id),
    
    -- Foreign keys
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) PARTITION BY HASH (course_id);

-- Create partitions (start with 8 partitions)
DO $$
BEGIN
    FOR i IN 0..7 LOOP
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS file_chunks_partitioned_%s 
            PARTITION OF file_chunks_partitioned
            FOR VALUES WITH (MODULUS 8, REMAINDER %s)', i, i);
    END LOOP;
END $$;

-- Create optimized indexes on each partition
DO $$
BEGIN
    FOR i IN 0..7 LOOP
        -- IVFFlat index for better memory usage than HNSW
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_file_chunks_p%s_embedding_ivfflat
            ON file_chunks_partitioned_%s 
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)', i, i);
        
        -- Standard indexes
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_file_chunks_p%s_file_id
            ON file_chunks_partitioned_%s (file_id)', i, i);
            
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_file_chunks_p%s_status
            ON file_chunks_partitioned_%s (embedding_status)
            WHERE embedding_status != ''completed''', i, i);
            
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_file_chunks_p%s_created
            ON file_chunks_partitioned_%s (created_at)', i, i);
    END LOOP;
END $$;

-- Create function to determine optimal index type based on data size
CREATE OR REPLACE FUNCTION get_optimal_vector_index_type(
    table_name TEXT,
    vector_count_threshold INT DEFAULT 1000000
) RETURNS TEXT AS $$
DECLARE
    current_count BIGINT;
BEGIN
    -- Get current vector count
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE embedding IS NOT NULL', table_name)
    INTO current_count;
    
    -- Use IVFFlat for large datasets, HNSW for smaller ones
    IF current_count > vector_count_threshold THEN
        RETURN 'ivfflat';
    ELSE
        RETURN 'hnsw';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate data from old table to partitioned table
CREATE OR REPLACE FUNCTION migrate_to_partitioned_chunks(
    batch_size INT DEFAULT 10000
) RETURNS BIGINT AS $$
DECLARE
    total_migrated BIGINT := 0;
    batch_count BIGINT;
BEGIN
    LOOP
        -- Migrate in batches to avoid long-running transactions
        INSERT INTO file_chunks_partitioned (
            id, file_id, course_id, chunk_index, content, 
            chunk_metadata, embedding, embedding_version,
            embedding_status, embedding_error, embedding_generated_at,
            embedding_attempt_count, last_embedding_attempt,
            created_at, updated_at
        )
        SELECT 
            fc.id, fc.file_id, f.course_id, fc.chunk_index, fc.content,
            fc.chunk_metadata, fc.embedding, fc.embedding_version,
            COALESCE(fc.embedding_status, 'pending'),
            fc.embedding_error, fc.embedding_generated_at,
            COALESCE(fc.embedding_attempt_count, 0),
            fc.last_embedding_attempt,
            COALESCE(fc.created_at, NOW()),
            COALESCE(fc.updated_at, NOW())
        FROM file_chunks fc
        JOIN files f ON f.id = fc.file_id
        WHERE fc.id NOT IN (
            SELECT id FROM file_chunks_partitioned 
            WHERE id = fc.id
        )
        LIMIT batch_size;
        
        GET DIAGNOSTICS batch_count = ROW_COUNT;
        total_migrated := total_migrated + batch_count;
        
        -- Log progress
        RAISE NOTICE 'Migrated % rows (total: %)', batch_count, total_migrated;
        
        -- Exit if no more rows to migrate
        EXIT WHEN batch_count = 0;
        
        -- Brief pause to avoid overwhelming the system
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    RETURN total_migrated;
END;
$$ LANGUAGE plpgsql;

-- Function to reindex vectors during low-traffic periods
CREATE OR REPLACE FUNCTION reindex_vector_indexes_concurrent(
    partition_name TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    partition_record RECORD;
    index_name TEXT;
BEGIN
    -- If specific partition provided, reindex only that
    IF partition_name IS NOT NULL THEN
        index_name := 'idx_' || partition_name || '_embedding_ivfflat';
        EXECUTE format('REINDEX INDEX CONCURRENTLY %I', index_name);
        RAISE NOTICE 'Reindexed %', index_name;
        RETURN;
    END IF;
    
    -- Reindex all partitions
    FOR partition_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'file_chunks_partitioned_%'
    LOOP
        index_name := 'idx_' || partition_record.tablename || '_embedding_ivfflat';
        
        BEGIN
            EXECUTE format('REINDEX INDEX CONCURRENTLY %I', index_name);
            RAISE NOTICE 'Reindexed %', index_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to reindex %: %', index_name, SQLERRM;
        END;
        
        -- Pause between partitions
        PERFORM pg_sleep(1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to monitor vector index health
CREATE OR REPLACE FUNCTION check_vector_index_health() RETURNS TABLE (
    partition_name TEXT,
    vector_count BIGINT,
    index_size TEXT,
    index_type TEXT,
    memory_usage_mb NUMERIC,
    recommended_action TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH partition_stats AS (
        SELECT 
            t.tablename,
            s.n_tup_ins + s.n_tup_upd + s.n_tup_del as total_operations,
            s.n_tup_ins as inserts,
            pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as size
        FROM pg_tables t
        JOIN pg_stat_user_tables s ON s.relname = t.tablename
        WHERE t.tablename LIKE 'file_chunks_partitioned_%'
    ),
    index_stats AS (
        SELECT 
            i.tablename,
            i.indexname,
            pg_size_pretty(pg_relation_size(i.schemaname||'.'||i.indexname)) as idx_size,
            pg_relation_size(i.schemaname||'.'||i.indexname) / (1024*1024) as idx_size_mb
        FROM pg_indexes i
        WHERE i.indexname LIKE '%embedding%'
        AND i.tablename LIKE 'file_chunks_partitioned_%'
    )
    SELECT 
        ps.tablename::TEXT,
        ps.inserts,
        COALESCE(ist.idx_size, 'No index')::TEXT,
        CASE 
            WHEN ist.indexname LIKE '%hnsw%' THEN 'HNSW'
            WHEN ist.indexname LIKE '%ivfflat%' THEN 'IVFFlat'
            ELSE 'Unknown'
        END::TEXT,
        COALESCE(ist.idx_size_mb, 0),
        CASE 
            WHEN ps.inserts > 1000000 AND ist.indexname LIKE '%hnsw%' THEN 'Consider switching to IVFFlat'
            WHEN ist.idx_size_mb > 1000 THEN 'Consider archiving old data'
            WHEN ps.total_operations > ps.inserts * 2 THEN 'Consider REINDEX'
            ELSE 'Healthy'
        END::TEXT
    FROM partition_stats ps
    LEFT JOIN index_stats ist ON ist.tablename = ps.tablename;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old vectors to cold storage
CREATE OR REPLACE FUNCTION archive_old_vectors(
    archive_before_date TIMESTAMPTZ,
    dry_run BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
    partition_name TEXT,
    vectors_to_archive BIGINT,
    estimated_space_saved TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH archive_candidates AS (
        SELECT 
            tableoid::regclass::text as table_name,
            COUNT(*) as vector_count,
            pg_size_pretty(
                COUNT(*) * 1536 * 4 -- Approximate size per vector
            ) as space_estimate
        FROM file_chunks_partitioned
        WHERE created_at < archive_before_date
        AND embedding IS NOT NULL
        GROUP BY tableoid::regclass
    )
    SELECT 
        ac.table_name::TEXT,
        ac.vector_count,
        ac.space_estimate::TEXT
    FROM archive_candidates ac;
    
    -- If not dry run, create archive table and move data
    IF NOT dry_run THEN
        -- Create archive table if it doesn't exist
        CREATE TABLE IF NOT EXISTS file_chunks_archive (
            LIKE file_chunks_partitioned INCLUDING ALL
        );
        
        -- Move old data to archive
        WITH moved_data AS (
            DELETE FROM file_chunks_partitioned
            WHERE created_at < archive_before_date
            RETURNING *
        )
        INSERT INTO file_chunks_archive
        SELECT * FROM moved_data;
        
        RAISE NOTICE 'Archived vectors older than %', archive_before_date;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create automated maintenance job configuration
CREATE TABLE IF NOT EXISTS vector_index_maintenance_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO vector_index_maintenance_config (config_key, config_value, description) VALUES
    ('reindex_schedule', '0 2 * * 0', 'Weekly reindex at 2 AM Sunday'),
    ('archive_threshold_days', '90', 'Archive vectors older than 90 days'),
    ('max_vectors_per_partition', '1000000', 'Max vectors before recommending IVFFlat'),
    ('memory_threshold_mb', '2048', 'Memory usage threshold for alerts')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- View for monitoring vector index performance
CREATE OR REPLACE VIEW vector_index_monitoring AS
WITH partition_metrics AS (
    SELECT 
        schemaname,
        tablename,
        n_tup_ins as total_inserts,
        n_tup_upd as total_updates,
        n_tup_del as total_deletes,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
    FROM pg_stat_user_tables
    WHERE tablename LIKE 'file_chunks_partitioned_%'
),
index_metrics AS (
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size
    FROM pg_stat_user_indexes
    WHERE indexname LIKE '%embedding%'
)
SELECT 
    pm.tablename,
    pm.total_inserts,
    pm.table_size,
    im.indexname,
    im.index_scans,
    im.index_size,
    CASE 
        WHEN im.index_scans = 0 THEN 'Unused index'
        WHEN pm.total_inserts > 100000 AND im.indexname LIKE '%hnsw%' THEN 'Consider IVFFlat'
        ELSE 'Normal'
    END as recommendation
FROM partition_metrics pm
LEFT JOIN index_metrics im ON im.tablename = pm.tablename;

-- Function to get vector search performance recommendations
CREATE OR REPLACE FUNCTION get_vector_performance_recommendations() RETURNS TABLE (
    recommendation_type TEXT,
    current_value TEXT,
    recommended_value TEXT,
    impact TEXT,
    priority TEXT
) AS $$
BEGIN
    -- Check total vector count
    RETURN QUERY
    WITH total_vectors AS (
        SELECT COUNT(*) as total_count
        FROM file_chunks_partitioned
        WHERE embedding IS NOT NULL
    )
    SELECT 
        'Index Type'::TEXT,
        'Mixed HNSW/IVFFlat'::TEXT,
        CASE 
            WHEN tv.total_count > 5000000 THEN 'All IVFFlat'
            WHEN tv.total_count > 1000000 THEN 'IVFFlat for large partitions'
            ELSE 'Current setup OK'
        END::TEXT,
        'Memory usage and query performance'::TEXT,
        CASE 
            WHEN tv.total_count > 5000000 THEN 'HIGH'
            WHEN tv.total_count > 1000000 THEN 'MEDIUM'
            ELSE 'LOW'
        END::TEXT
    FROM total_vectors tv;
    
    -- Check partition balance
    RETURN QUERY
    WITH partition_balance AS (
        SELECT 
            MAX(cnt) as max_partition_size,
            MIN(cnt) as min_partition_size,
            AVG(cnt) as avg_partition_size
        FROM (
            SELECT COUNT(*) as cnt
            FROM file_chunks_partitioned
            GROUP BY course_id
        ) partition_counts
    )
    SELECT 
        'Partition Balance'::TEXT,
        format('Max: %s, Min: %s', pb.max_partition_size, pb.min_partition_size)::TEXT,
        CASE 
            WHEN pb.max_partition_size > pb.avg_partition_size * 3 THEN 'Rebalance needed'
            ELSE 'Balanced'
        END::TEXT,
        'Query performance and maintenance efficiency'::TEXT,
        CASE 
            WHEN pb.max_partition_size > pb.avg_partition_size * 3 THEN 'MEDIUM'
            ELSE 'LOW'
        END::TEXT
    FROM partition_balance pb;
END;
$$ LANGUAGE plpgsql;

-- Add vector index monitoring to system health
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
vector_stats AS (
    SELECT 
        COUNT(*) as total_vectors,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as vectors_24h
    FROM file_chunks_partitioned
    WHERE embedding IS NOT NULL
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
    vs.total_vectors,
    vs.vectors_24h,
    CASE 
        WHEN get_config('EMBEDDINGS_ENABLED') != 'true' THEN 'DISABLED'
        WHEN ws.healthy_workers = 0 THEN 'CRITICAL'
        WHEN js.pending_jobs > 1000 THEN 'WARNING'
        WHEN js.error_jobs > js.completed_jobs * 0.05 THEN 'WARNING'
        WHEN ds.unreviewed_dlq_items > 50 THEN 'WARNING'
        WHEN vs.total_vectors > 5000000 THEN 'WARNING'
        ELSE 'HEALTHY'
    END as system_status
FROM worker_status ws, job_stats js, dlq_stats ds, vector_stats vs, recent_metrics rm;

-- Add comments
COMMENT ON TABLE file_chunks_partitioned IS 'Partitioned table for file chunks to prevent vector index bloat';
COMMENT ON FUNCTION reindex_vector_indexes_concurrent IS 'Safely reindex vector indexes during low-traffic periods';
COMMENT ON FUNCTION archive_old_vectors IS 'Archive old vectors to cold storage to reduce memory usage';