-- Migration: Add API usage logs table for version monitoring
-- Date: 2025-05-29

-- Create API usage logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    version VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    hour VARCHAR(13) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_version ON api_usage_logs(version);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_version ON api_usage_logs(user_id, version);
CREATE INDEX IF NOT EXISTS idx_api_usage_hour_version ON api_usage_logs(hour, version);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_logs(endpoint);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_api_usage_version_timestamp ON api_usage_logs(version, timestamp DESC);

-- Add comments
COMMENT ON TABLE api_usage_logs IS 'Tracks API version usage for deprecation monitoring';
COMMENT ON COLUMN api_usage_logs.version IS 'API version used (v1, v2, etc)';
COMMENT ON COLUMN api_usage_logs.endpoint IS 'API endpoint called';
COMMENT ON COLUMN api_usage_logs.method IS 'HTTP method used';
COMMENT ON COLUMN api_usage_logs.hour IS 'Hour bucket for aggregation (YYYY-MM-DD-HH)';

-- Create a view for easy monitoring
CREATE OR REPLACE VIEW api_version_stats AS
WITH hourly_stats AS (
    SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        version,
        COUNT(*) as request_count,
        COUNT(DISTINCT user_id) as unique_users
    FROM api_usage_logs
    WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', timestamp), version
),
daily_stats AS (
    SELECT 
        version,
        COUNT(*) as total_requests,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT endpoint) as unique_endpoints
    FROM api_usage_logs
    WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY version
)
SELECT 
    d.version,
    d.total_requests,
    d.unique_users,
    d.unique_endpoints,
    ROUND(d.total_requests::NUMERIC / NULLIF(SUM(d.total_requests) OVER (), 0) * 100, 2) as percentage_of_traffic
FROM daily_stats d
ORDER BY d.total_requests DESC;

-- Create a function to clean up old logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM api_usage_logs
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a materialized view for migration dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS api_migration_status AS
WITH user_versions AS (
    SELECT 
        user_id,
        ARRAY_AGG(DISTINCT version ORDER BY version) as versions_used,
        MAX(CASE WHEN version = 'v1' THEN timestamp END) as last_v1_usage,
        MAX(CASE WHEN version = 'v2' THEN timestamp END) as last_v2_usage,
        COUNT(CASE WHEN version = 'v1' THEN 1 END) as v1_request_count,
        COUNT(CASE WHEN version = 'v2' THEN 1 END) as v2_request_count
    FROM api_usage_logs
    WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    GROUP BY user_id
)
SELECT 
    u.id as user_id,
    u.email,
    uv.versions_used,
    uv.last_v1_usage,
    uv.last_v2_usage,
    uv.v1_request_count,
    uv.v2_request_count,
    CASE 
        WHEN 'v2' = ANY(uv.versions_used) AND 'v1' != ANY(uv.versions_used) THEN 'migrated'
        WHEN 'v2' = ANY(uv.versions_used) AND 'v1' = ANY(uv.versions_used) THEN 'partial'
        WHEN 'v1' = ANY(uv.versions_used) AND 'v2' != ANY(uv.versions_used) THEN 'not_migrated'
        ELSE 'unknown'
    END as migration_status
FROM users u
LEFT JOIN user_versions uv ON u.id = uv.user_id
WHERE uv.user_id IS NOT NULL;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_api_migration_status_user ON api_migration_status(user_id);
CREATE INDEX idx_api_migration_status_status ON api_migration_status(migration_status);

-- Schedule periodic refresh of materialized view (to be set up in your scheduler)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY api_migration_status;