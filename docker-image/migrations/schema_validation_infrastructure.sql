-- Migration: Schema Validation Infrastructure
-- Prevents outbox drift where schema changes break function payloads

-- Table to store schema hashes for monitoring
CREATE TABLE IF NOT EXISTS schema_validation_hashes (
    table_name TEXT PRIMARY KEY,
    schema_hash TEXT NOT NULL,
    schema_definition JSONB,
    column_count INT,
    last_migration_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store validation results
CREATE TABLE IF NOT EXISTS schema_validation_results (
    id BIGSERIAL PRIMARY KEY,
    function_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    is_valid BOOLEAN NOT NULL,
    schema_hash_at_validation TEXT,
    function_hash_at_validation TEXT,
    issues JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for efficient querying
    INDEX (function_name, validated_at DESC),
    INDEX (is_valid, validated_at DESC)
);

-- Function to calculate and store current schema hash
CREATE OR REPLACE FUNCTION update_schema_hash(p_table_name TEXT) RETURNS TEXT AS $$
DECLARE
    v_schema_hash TEXT;
    v_column_count INT;
    v_schema_def JSONB;
BEGIN
    -- Get column information
    SELECT 
        md5(string_agg(
            format('%s:%s:%s:%s', 
                column_name, 
                data_type, 
                is_nullable, 
                COALESCE(column_default, 'null')
            ), 
            '|' ORDER BY ordinal_position
        )),
        COUNT(*),
        jsonb_agg(
            jsonb_build_object(
                'name', column_name,
                'type', data_type,
                'nullable', is_nullable::boolean,
                'default', column_default
            ) ORDER BY ordinal_position
        )
    INTO v_schema_hash, v_column_count, v_schema_def
    FROM information_schema.columns
    WHERE table_name = p_table_name
    AND table_schema = 'public';
    
    -- Store/update the hash
    INSERT INTO schema_validation_hashes (
        table_name,
        schema_hash,
        schema_definition,
        column_count,
        last_migration_at
    ) VALUES (
        p_table_name,
        v_schema_hash,
        v_schema_def,
        v_column_count,
        NOW()
    ) ON CONFLICT (table_name) DO UPDATE SET
        schema_hash = EXCLUDED.schema_hash,
        schema_definition = EXCLUDED.schema_definition,
        column_count = EXCLUDED.column_count,
        last_migration_at = EXCLUDED.last_migration_at,
        updated_at = NOW();
    
    RETURN v_schema_hash;
END;
$$ LANGUAGE plpgsql;

-- Function to validate outbox function against table schema
CREATE OR REPLACE FUNCTION validate_outbox_function(
    p_function_name TEXT,
    p_table_name TEXT
) RETURNS JSONB AS $$
DECLARE
    v_function_def TEXT;
    v_table_schema JSONB;
    v_issues JSONB := '[]'::jsonb;
    v_warnings JSONB := '[]'::jsonb;
    v_function_hash TEXT;
    v_table_hash TEXT;
    v_result JSONB;
BEGIN
    -- Get function definition
    SELECT pg_get_functiondef(oid) INTO v_function_def
    FROM pg_proc 
    WHERE proname = p_function_name;
    
    IF v_function_def IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', format('Function %s not found', p_function_name)
        );
    END IF;
    
    -- Get table schema
    SELECT schema_definition INTO v_table_schema
    FROM schema_validation_hashes
    WHERE table_name = p_table_name;
    
    IF v_table_schema IS NULL THEN
        -- Generate schema hash if not exists
        v_table_hash := update_schema_hash(p_table_name);
        
        SELECT schema_definition INTO v_table_schema
        FROM schema_validation_hashes
        WHERE table_name = p_table_name;
    END IF;
    
    -- Calculate function hash
    v_function_hash := substring(md5(v_function_def), 1, 16);
    v_table_hash := (SELECT schema_hash FROM schema_validation_hashes WHERE table_name = p_table_name);
    
    -- Basic validation: check if function mentions expected columns
    -- For file_chunks table, ensure function uses core fields
    IF p_table_name = 'file_chunks' OR p_table_name = 'file_chunks_partitioned' THEN
        IF v_function_def !~* 'file_id.*uuid' THEN
            v_issues := v_issues || '"Missing file_id parameter"'::jsonb;
        END IF;
        
        IF v_function_def !~* 'content.*text' THEN
            v_issues := v_issues || '"Missing content parameter"'::jsonb;
        END IF;
        
        IF v_function_def !~* 'chunk_index.*int' THEN
            v_issues := v_issues || '"Missing chunk_index parameter"'::jsonb;
        END IF;
    END IF;
    
    -- Check for common anti-patterns
    IF v_function_def ~* 'INSERT.*VALUES.*\$[0-9]+.*\$[0-9]+.*\$[0-9]+' THEN
        -- Function uses positional parameters - fragile to schema changes
        v_warnings := v_warnings || '"Uses positional parameters - consider named parameters"'::jsonb;
    END IF;
    
    -- Build result
    v_result := jsonb_build_object(
        'valid', jsonb_array_length(v_issues) = 0,
        'function_name', p_function_name,
        'table_name', p_table_name,
        'function_hash', v_function_hash,
        'table_hash', v_table_hash,
        'issues', v_issues,
        'warnings', v_warnings,
        'validated_at', NOW()
    );
    
    -- Store validation result
    INSERT INTO schema_validation_results (
        function_name,
        table_name,
        is_valid,
        schema_hash_at_validation,
        function_hash_at_validation,
        issues,
        warnings,
        recommendations
    ) VALUES (
        p_function_name,
        p_table_name,
        jsonb_array_length(v_issues) = 0,
        v_table_hash,
        v_function_hash,
        v_issues,
        v_warnings,
        CASE 
            WHEN jsonb_array_length(v_issues) > 0 THEN '["Update function signature to match table schema", "Run migration tests"]'::jsonb
            ELSE '["Schema validation passed"]'::jsonb
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to validate all critical outbox functions
CREATE OR REPLACE FUNCTION validate_all_outbox_functions() RETURNS JSONB AS $$
DECLARE
    v_results JSONB := '[]'::jsonb;
    v_result JSONB;
    v_overall_valid BOOLEAN := true;
BEGIN
    -- Validate create_chunk_with_embedding_job
    v_result := validate_outbox_function('create_chunk_with_embedding_job', 'file_chunks');
    v_results := v_results || jsonb_build_array(v_result);
    v_overall_valid := v_overall_valid AND (v_result->>'valid')::boolean;
    
    -- Validate create_chunk_with_poison_detection  
    v_result := validate_outbox_function('create_chunk_with_poison_detection', 'file_chunks');
    v_results := v_results || jsonb_build_array(v_result);
    v_overall_valid := v_overall_valid AND (v_result->>'valid')::boolean;
    
    -- Validate send_to_dlq
    v_result := validate_outbox_function('send_to_dlq', 'embedding_dead_letter_queue');
    v_results := v_results || jsonb_build_array(v_result);
    v_overall_valid := v_overall_valid AND (v_result->>'valid')::boolean;
    
    RETURN jsonb_build_object(
        'overall_valid', v_overall_valid,
        'validations', v_results,
        'validated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to detect schema drift
CREATE OR REPLACE FUNCTION check_schema_drift() RETURNS TABLE (
    table_name TEXT,
    stored_hash TEXT,
    current_hash TEXT,
    has_drifted BOOLEAN,
    column_count_changed BOOLEAN,
    last_validated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH current_schemas AS (
        SELECT 
            t.table_name,
            md5(string_agg(
                format('%s:%s:%s:%s', 
                    column_name, 
                    data_type, 
                    is_nullable, 
                    COALESCE(column_default, 'null')
                ), 
                '|' ORDER BY ordinal_position
            )) as current_hash,
            COUNT(*) as current_column_count
        FROM information_schema.tables t
        JOIN information_schema.columns c ON c.table_name = t.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name IN ('file_chunks', 'file_chunks_partitioned', 'embedding_jobs', 'embedding_dead_letter_queue')
        GROUP BY t.table_name
    )
    SELECT 
        cs.table_name,
        COALESCE(svh.schema_hash, 'not_stored'),
        cs.current_hash,
        COALESCE(svh.schema_hash != cs.current_hash, true),
        COALESCE(svh.column_count != cs.current_column_count, true),
        svh.updated_at
    FROM current_schemas cs
    LEFT JOIN schema_validation_hashes svh ON svh.table_name = cs.table_name;
END;
$$ LANGUAGE plpgsql;

-- Automated schema validation trigger
CREATE OR REPLACE FUNCTION trigger_schema_validation() RETURNS TRIGGER AS $$
BEGIN
    -- Update schema hash when table structure changes
    PERFORM update_schema_hash(TG_TABLE_NAME);
    
    -- Trigger validation of related outbox functions
    IF TG_TABLE_NAME = 'file_chunks' THEN
        PERFORM validate_outbox_function('create_chunk_with_embedding_job', 'file_chunks');
        PERFORM validate_outbox_function('create_chunk_with_poison_detection', 'file_chunks');
    ELSIF TG_TABLE_NAME = 'embedding_dead_letter_queue' THEN
        PERFORM validate_outbox_function('send_to_dlq', 'embedding_dead_letter_queue');
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for schema change detection (PostgreSQL 13+)
-- Note: This trigger fires on DDL events
DO $$
BEGIN
    -- Only create if not exists and PostgreSQL supports event triggers
    IF NOT EXISTS (
        SELECT 1 FROM pg_event_trigger WHERE evtname = 'schema_validation_trigger'
    ) AND current_setting('server_version_num')::int >= 130000 THEN
        CREATE EVENT TRIGGER schema_validation_trigger
        ON ddl_command_end
        WHEN tag IN ('ALTER TABLE', 'CREATE TABLE', 'DROP TABLE')
        EXECUTE FUNCTION trigger_schema_validation();
    END IF;
EXCEPTION WHEN insufficient_privilege THEN
    -- Event triggers require superuser, skip if not available
    RAISE NOTICE 'Skipping event trigger creation - insufficient privileges';
END $$;

-- Initialize schema hashes for existing tables
SELECT update_schema_hash('file_chunks');
SELECT update_schema_hash('embedding_jobs');
SELECT update_schema_hash('embedding_dead_letter_queue');

-- Run initial validation
SELECT validate_all_outbox_functions();

-- Add schema validation alerts to monitoring
CREATE OR REPLACE FUNCTION check_schema_validation_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check for validation failures
    RETURN QUERY
    SELECT 
        'SCHEMA_VALIDATION_FAILURE'::TEXT,
        'CRITICAL'::TEXT,
        format('Schema validation failed for function %s on table %s', 
               function_name, table_name),
        jsonb_build_object(
            'function_name', function_name,
            'table_name', table_name,
            'issues', issues,
            'validated_at', validated_at
        )
    FROM schema_validation_results
    WHERE NOT is_valid
    AND validated_at > NOW() - INTERVAL '24 hours';
    
    -- Check for schema drift
    RETURN QUERY
    WITH drift_check AS (
        SELECT * FROM check_schema_drift()
    )
    SELECT 
        'SCHEMA_DRIFT_DETECTED'::TEXT,
        'WARNING'::TEXT,
        format('Schema drift detected for table %s', drift_check.table_name),
        jsonb_build_object(
            'table_name', drift_check.table_name,
            'stored_hash', drift_check.stored_hash,
            'current_hash', drift_check.current_hash,
            'has_drifted', drift_check.has_drifted
        )
    FROM drift_check
    WHERE drift_check.has_drifted;
END;
$$ LANGUAGE plpgsql;

-- View for monitoring schema validation status
CREATE OR REPLACE VIEW schema_validation_status AS
WITH latest_validations AS (
    SELECT DISTINCT ON (function_name, table_name)
        function_name,
        table_name,
        is_valid,
        issues,
        warnings,
        validated_at
    FROM schema_validation_results
    ORDER BY function_name, table_name, validated_at DESC
),
drift_status AS (
    SELECT * FROM check_schema_drift()
)
SELECT 
    lv.function_name,
    lv.table_name,
    lv.is_valid as validation_passed,
    ds.has_drifted as schema_drifted,
    lv.issues,
    lv.warnings,
    lv.validated_at as last_validation,
    ds.last_validated as last_drift_check,
    CASE 
        WHEN NOT lv.is_valid THEN 'CRITICAL'
        WHEN ds.has_drifted THEN 'WARNING' 
        ELSE 'HEALTHY'
    END as status
FROM latest_validations lv
LEFT JOIN drift_status ds ON ds.table_name = lv.table_name;

-- Add to system health monitoring
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
schema_health AS (
    SELECT 
        COUNT(*) as total_functions,
        COUNT(*) FILTER (WHERE NOT validation_passed) as failed_validations,
        COUNT(*) FILTER (WHERE schema_drifted) as drifted_schemas
    FROM schema_validation_status
)
SELECT 
    get_config('EMBEDDINGS_ENABLED') = 'true' as embeddings_enabled,
    ws.healthy_workers,
    js.pending_jobs,
    js.completed_jobs,
    js.error_jobs,
    sh.total_functions,
    sh.failed_validations,
    sh.drifted_schemas,
    CASE 
        WHEN get_config('EMBEDDINGS_ENABLED') != 'true' THEN 'DISABLED'
        WHEN ws.healthy_workers = 0 THEN 'CRITICAL'
        WHEN sh.failed_validations > 0 THEN 'CRITICAL'
        WHEN sh.drifted_schemas > 0 THEN 'WARNING'
        WHEN js.pending_jobs > 1000 THEN 'WARNING'
        ELSE 'HEALTHY'
    END as system_status
FROM worker_status ws, job_stats js, schema_health sh;

-- Comments
COMMENT ON TABLE schema_validation_hashes IS 'Stores schema hashes to detect drift between table schemas and outbox functions';
COMMENT ON TABLE schema_validation_results IS 'Stores results of schema validation checks';
COMMENT ON FUNCTION validate_outbox_function IS 'Validates that outbox function signature matches target table schema';