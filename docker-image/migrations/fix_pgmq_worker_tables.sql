-- Fix missing tables and columns for PGMQ workers
-- This migration creates the required tables and columns that the PGMQ workers are looking for

-- Create rate_limit_usage table
CREATE TABLE IF NOT EXISTS rate_limit_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create embedding_dead_letter_queue table
CREATE TABLE IF NOT EXISTS embedding_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_attempt TIMESTAMP WITH TIME ZONE
);

-- Create budget_tracking table
CREATE TABLE IF NOT EXISTS budget_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type VARCHAR(50) NOT NULL DEFAULT 'global',
    scope_id UUID,
    budget_limit DECIMAL(12,2),
    current_usage DECIMAL(12,2) DEFAULT 0,
    reset_period VARCHAR(50) DEFAULT 'monthly',
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Check if worker_health table exists, if not create it
CREATE TABLE IF NOT EXISTS worker_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id VARCHAR(255) NOT NULL,
    worker_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'running',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add secret_type column to api_keys table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'secret_type') THEN
            ALTER TABLE api_keys ADD COLUMN secret_type VARCHAR(50) DEFAULT 'api_key';
        END IF;
    ELSE
        -- Create api_keys table if it doesn't exist
        CREATE TABLE api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            key_value TEXT NOT NULL,
            secret_type VARCHAR(50) DEFAULT 'api_key',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END
$$;

-- Insert a default global budget limit
INSERT INTO budget_tracking (scope_type, budget_limit)
VALUES ('global', 100.00)
ON CONFLICT DO NOTHING;

-- Enable RLS on the new tables
ALTER TABLE rate_limit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_health ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role has full access to rate_limit_usage" ON rate_limit_usage
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to embedding_dead_letter_queue" ON embedding_dead_letter_queue
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to budget_tracking" ON budget_tracking
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to worker_health" ON worker_health
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant permissions to service role
GRANT ALL ON rate_limit_usage TO service_role;
GRANT ALL ON embedding_dead_letter_queue TO service_role;
GRANT ALL ON budget_tracking TO service_role;
GRANT ALL ON worker_health TO service_role;
