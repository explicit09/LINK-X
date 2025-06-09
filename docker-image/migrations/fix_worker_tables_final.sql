-- Final fix for worker tables and columns
-- This migration addresses all remaining issues with the PGMQ worker initialization

-- Fix secrets_vault table for OpenAI API keys check
DO $$
BEGIN
    -- Create secrets_vault table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'secrets_vault') THEN
        CREATE TABLE secrets_vault (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            secret_name VARCHAR(255) NOT NULL,
            secret_value TEXT NOT NULL,
            secret_type VARCHAR(50) DEFAULT 'api_key',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Enable RLS
        ALTER TABLE secrets_vault ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for service role
        CREATE POLICY "Service role has full access to secrets_vault" ON secrets_vault
            FOR ALL TO service_role USING (true) WITH CHECK (true);
            
        -- Grant permissions
        GRANT ALL ON secrets_vault TO service_role;
    END IF;
END
$$;

-- Fix worker_health table with proper unique constraint on worker_id
DO $$
BEGIN
    -- Drop and recreate the worker_health table with proper constraints
    DROP TABLE IF EXISTS worker_health;
    
    CREATE TABLE worker_health (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_id VARCHAR(255) NOT NULL UNIQUE,
        worker_type VARCHAR(50) NOT NULL DEFAULT 'pgmq',
        status VARCHAR(50) DEFAULT 'running',
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
    );
    
    -- Enable RLS
    ALTER TABLE worker_health ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for service role
    CREATE POLICY "Service role has full access to worker_health" ON worker_health
        FOR ALL TO service_role USING (true) WITH CHECK (true);
        
    -- Grant permissions
    GRANT ALL ON worker_health TO service_role;
END
$$;

-- Fix budget_limits table for budget checks
DO $$
BEGIN
    -- Create budget_limits table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'budget_limits') THEN
        CREATE TABLE budget_limits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            scope_type VARCHAR(50) NOT NULL DEFAULT 'global',
            scope_id UUID,
            limit_type VARCHAR(50) NOT NULL DEFAULT 'daily',
            cost_category VARCHAR(50) NOT NULL,
            limit_cents INTEGER NOT NULL DEFAULT 3000,
            alert_threshold_percent INTEGER DEFAULT 80,
            hard_stop_enabled BOOLEAN DEFAULT true,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Enable RLS
        ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for service role
        CREATE POLICY "Service role has full access to budget_limits" ON budget_limits
            FOR ALL TO service_role USING (true) WITH CHECK (true);
            
        -- Grant permissions
        GRANT ALL ON budget_limits TO service_role;
        
        -- Insert default budget limit for OpenAI embeddings
        INSERT INTO budget_limits (
            scope_type, scope_id, limit_type, 
            cost_category, limit_cents, alert_threshold_percent, 
            hard_stop_enabled, description
        ) VALUES 
        ('global', NULL, 'daily', 'openai_embeddings', 3000, 80, true, 
         'Daily embedding budget limit - $30');
    END IF;
END
$$;

-- Fix embedding_jobs table if needed
DO $$
BEGIN
    -- Create embedding_jobs table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'embedding_jobs') THEN
        CREATE TABLE embedding_jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            file_id UUID NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP WITH TIME ZONE,
            error_message TEXT
        );
        
        -- Enable RLS
        ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for service role
        CREATE POLICY "Service role has full access to embedding_jobs" ON embedding_jobs
            FOR ALL TO service_role USING (true) WITH CHECK (true);
            
        -- Grant permissions
        GRANT ALL ON embedding_jobs TO service_role;
    END IF;
END
$$;

-- Fix file_chunks table if needed
DO $$
BEGIN
    -- Create file_chunks table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'file_chunks') THEN
        CREATE TABLE file_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            file_id UUID NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding VECTOR(1536),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Enable RLS
        ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for service role
        CREATE POLICY "Service role has full access to file_chunks" ON file_chunks
            FOR ALL TO service_role USING (true) WITH CHECK (true);
            
        -- Grant permissions
        GRANT ALL ON file_chunks TO service_role;
    END IF;
END
$$;

-- Fix system_config table if needed
DO $$
BEGIN
    -- Create system_config table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_config') THEN
        CREATE TABLE system_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key VARCHAR(255) NOT NULL UNIQUE,
            value TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Enable RLS
        ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for service role
        CREATE POLICY "Service role has full access to system_config" ON system_config
            FOR ALL TO service_role USING (true) WITH CHECK (true);
            
        -- Grant permissions
        GRANT ALL ON system_config TO service_role;
        
        -- Insert default configuration
        INSERT INTO system_config (key, value, description)
        VALUES ('EMBEDDINGS_ENABLED', 'true', 'Enable embedding processing')
        ON CONFLICT (key) DO NOTHING;
    END IF;
END
$$;

-- Verify all tables exist and have the correct columns
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN (
        'worker_health',
        'budget_limits',
        'secrets_vault',
        'embedding_jobs',
        'file_chunks',
        'system_config',
        'rate_limit_usage',
        'embedding_dead_letter_queue'
    );
    
    IF table_count = 8 THEN
        RAISE NOTICE 'All 8 required tables exist';
    ELSE
        RAISE EXCEPTION 'Missing tables. Found % of 8 required tables', table_count;
    END IF;
END
$$;
