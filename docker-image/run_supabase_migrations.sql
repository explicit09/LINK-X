-- Step-by-step migration execution for Supabase
-- Copy and paste each section into Supabase SQL Editor one at a time

-- STEP 1: Remove old trigger that causes transaction locking
-- File: migrations/remove_embedding_trigger.sql
\i migrations/remove_embedding_trigger.sql

-- STEP 2: Create transactional outbox pattern
-- File: migrations/embedding_jobs_transactional.sql  
\i migrations/embedding_jobs_transactional.sql

-- STEP 3: Add dead letter queue for poison messages
-- File: migrations/add_dead_letter_queue.sql
\i migrations/add_dead_letter_queue.sql

-- STEP 4: Add rate limiting infrastructure
-- File: migrations/rate_limiting_infrastructure.sql
\i migrations/rate_limiting_infrastructure.sql

-- STEP 5: Optimize vector indexes with partitioning
-- File: migrations/vector_index_optimization.sql
\i migrations/vector_index_optimization.sql

-- STEP 6: Add schema validation infrastructure
-- File: migrations/schema_validation_infrastructure.sql
\i migrations/schema_validation_infrastructure.sql

-- STEP 7: Add capped restart processing for kill switch
-- File: migrations/capped_restart_processing.sql
\i migrations/capped_restart_processing.sql

-- STEP 8: Initialize system configuration
INSERT INTO system_config (key, value, description) VALUES
    ('EMBEDDINGS_ENABLED', 'true', 'Global kill switch for embedding processing'),
    ('OPENAI_API_KEYS', '[]', 'JSON array of OpenAI API keys with rate limits'),
    ('MAX_BATCH_SIZE', '100', 'Maximum batch size for embedding requests'),
    ('RESTART_BATCH_SIZE', '1000', 'Batch size for processing after kill switch'),
    ('RESTART_MODE_ACTIVE', 'false', 'Flag for capped restart processing')
ON CONFLICT (key) DO NOTHING;

-- STEP 9: Create initial worker health monitoring
INSERT INTO worker_health (worker_id, status, last_heartbeat) VALUES
    ('pgmq-worker-1', 'healthy', NOW())
ON CONFLICT (worker_id) DO UPDATE SET
    status = EXCLUDED.status,
    last_heartbeat = EXCLUDED.last_heartbeat;

-- STEP 10: Verify setup
SELECT 'Migration completed successfully' as status;
SELECT * FROM embedding_system_health;