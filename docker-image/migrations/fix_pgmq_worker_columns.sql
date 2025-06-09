-- Fix missing columns for PGMQ workers
-- This migration ensures the columns exist and are properly accessible

-- Fix api_keys table
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        -- Check if the column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'secret_type') THEN
            -- Add the column if it doesn't exist
            ALTER TABLE api_keys ADD COLUMN secret_type VARCHAR(50) DEFAULT 'api_key';
        END IF;
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            key_value TEXT NOT NULL,
            secret_type VARCHAR(50) DEFAULT 'api_key',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Enable RLS
        ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for service role
        CREATE POLICY "Service role has full access to api_keys" ON api_keys
            FOR ALL TO service_role USING (true) WITH CHECK (true);
            
        -- Grant permissions
        GRANT ALL ON api_keys TO service_role;
    END IF;
END
$$;

-- Fix worker_health table
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'worker_health') THEN
        -- Drop and recreate the table to ensure it has all required columns
        DROP TABLE IF EXISTS worker_health;
    END IF;
    
    -- Create the table with all required columns
    CREATE TABLE worker_health (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_id VARCHAR(255) NOT NULL,
        worker_type VARCHAR(50) NOT NULL,
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

-- Fix budget_tracking table
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'budget_tracking') THEN
        -- Drop and recreate the table to ensure it has all required columns
        DROP TABLE IF EXISTS budget_tracking;
    END IF;
    
    -- Create the table with all required columns
    CREATE TABLE budget_tracking (
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
    
    -- Enable RLS
    ALTER TABLE budget_tracking ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for service role
    CREATE POLICY "Service role has full access to budget_tracking" ON budget_tracking
        FOR ALL TO service_role USING (true) WITH CHECK (true);
        
    -- Grant permissions
    GRANT ALL ON budget_tracking TO service_role;
    
    -- Insert a default global budget limit
    INSERT INTO budget_tracking (scope_type, budget_limit)
    VALUES ('global', 100.00)
    ON CONFLICT DO NOTHING;
END
$$;

-- Verify columns exist by querying them
DO $$
BEGIN
    PERFORM secret_type FROM api_keys LIMIT 1;
    PERFORM started_at FROM worker_health LIMIT 1;
    PERFORM scope_type FROM budget_tracking LIMIT 1;
    RAISE NOTICE 'All required columns exist and are accessible';
EXCEPTION
    WHEN undefined_column THEN
        RAISE EXCEPTION 'Column verification failed: %', SQLERRM;
END
$$;
