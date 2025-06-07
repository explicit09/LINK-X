-- Verification script to ensure everything is working
-- Run this after all migrations are complete

-- 1. Check extensions are enabled
SELECT 
    'Extensions Check' as check_type,
    array_agg(extname) as enabled_extensions
FROM pg_extension 
WHERE extname IN ('vector', 'pgcrypto', 'uuid-ossp', 'pgmq', 'pg_net', 'pg_cron');

-- 2. Check system configuration
SELECT 
    'System Config' as check_type,
    key,
    CASE 
        WHEN key = 'OPENAI_API_KEYS' THEN 'REDACTED'
        ELSE value 
    END as value
FROM system_config 
WHERE key IN ('EMBEDDINGS_ENABLED', 'MAX_BATCH_SIZE', 'OPENAI_API_KEYS')
ORDER BY key;

-- 3. Check system health
SELECT 
    'System Health' as check_type,
    * 
FROM embedding_system_health;

-- 4. Check schema validation
SELECT 
    'Schema Validation' as check_type,
    function_name,
    table_name,
    validation_passed,
    status
FROM schema_validation_status;

-- 5. Test kill switch functionality
SELECT 
    'Kill Switch Status' as check_type,
    get_kill_switch_status() as status;

-- 6. Check for any alerts
SELECT 
    'System Alerts' as check_type,
    alert_type,
    severity,
    message
FROM (
    SELECT * FROM check_embedding_alerts()
    UNION ALL
    SELECT * FROM check_schema_validation_alerts()
    UNION ALL  
    SELECT * FROM check_kill_switch_alerts()
) alerts;

-- 7. Test outbox function
SELECT 
    'Outbox Function Test' as check_type,
    create_chunk_with_embedding_job(
        gen_random_uuid(),
        1,
        'Test content for verification',
        '{"test": true}'::jsonb,
        5
    ) as result;

-- 8. Check if any jobs were created
SELECT 
    'Job Creation Test' as check_type,
    COUNT(*) as pending_jobs
FROM embedding_jobs 
WHERE status = 'pending' 
AND created_at > NOW() - INTERVAL '1 minute';

-- 9. Performance check - vector operations
EXPLAIN (ANALYZE, BUFFERS) 
SELECT fc.id, fc.content <-> '[0.1,0.2,0.3]'::vector as similarity
FROM file_chunks fc
WHERE fc.embedding IS NOT NULL
ORDER BY similarity
LIMIT 5;