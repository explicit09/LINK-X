-- Migration: Secrets Rotation Infrastructure
-- Provides automated key rotation and secure credential management

-- Secrets vault table (encrypted storage)
CREATE TABLE IF NOT EXISTS secrets_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_name TEXT NOT NULL UNIQUE,
    secret_type TEXT NOT NULL CHECK (secret_type IN ('api_key', 'database_password', 'jwt_secret', 'encryption_key')),
    encrypted_value TEXT NOT NULL, -- Encrypted with master key
    key_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    rotation_scheduled_at TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    rotation_interval_days INT DEFAULT 90,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX (secret_name, is_active),
    INDEX (secret_type, is_active),
    INDEX (expires_at),
    INDEX (rotation_scheduled_at)
);

-- Key rotation history
CREATE TABLE IF NOT EXISTS key_rotation_history (
    id BIGSERIAL PRIMARY KEY,
    secret_name TEXT NOT NULL,
    old_key_version INT,
    new_key_version INT,
    rotation_type TEXT NOT NULL CHECK (rotation_type IN ('scheduled', 'emergency', 'manual')),
    rotation_reason TEXT,
    rotated_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_by UUID,
    old_key_hash TEXT, -- Hash of old key for audit
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX (secret_name, rotated_at),
    INDEX (rotation_type, rotated_at),
    INDEX (rotated_by)
);

-- API key usage tracking (for rotation planning)
CREATE TABLE IF NOT EXISTS api_key_usage (
    id BIGSERIAL PRIMARY KEY,
    secret_name TEXT NOT NULL,
    key_version INT NOT NULL,
    usage_timestamp TIMESTAMPTZ DEFAULT NOW(),
    service_name TEXT,
    request_count BIGINT DEFAULT 1,
    success_count BIGINT DEFAULT 0,
    error_count BIGINT DEFAULT 0,
    rate_limit_hits BIGINT DEFAULT 0,
    last_error_message TEXT,
    usage_context JSONB DEFAULT '{}',
    
    -- Unique constraint for efficient updates
    UNIQUE (secret_name, key_version, service_name, DATE_TRUNC('hour', usage_timestamp)),
    
    -- Indexes
    INDEX (secret_name, usage_timestamp),
    INDEX (service_name, usage_timestamp)
);

-- Function to create/update secret (requires master key)
CREATE OR REPLACE FUNCTION store_secret(
    p_secret_name TEXT,
    p_secret_type TEXT,
    p_secret_value TEXT,
    p_rotation_interval_days INT DEFAULT 90,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_encrypted_value TEXT;
    v_new_version INT;
    v_secret_id UUID;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(key_version), 0) + 1 INTO v_new_version
    FROM secrets_vault
    WHERE secret_name = p_secret_name;
    
    -- Simple encryption (in production, use proper encryption)
    -- This should integrate with your key management system
    v_encrypted_value := encode(digest(p_secret_value, 'sha256'), 'base64');
    
    -- Deactivate old versions
    UPDATE secrets_vault
    SET is_active = false
    WHERE secret_name = p_secret_name;
    
    -- Store new secret
    INSERT INTO secrets_vault (
        secret_name,
        secret_type,
        encrypted_value,
        key_version,
        expires_at,
        rotation_scheduled_at,
        rotation_interval_days,
        metadata
    ) VALUES (
        p_secret_name,
        p_secret_type,
        v_encrypted_value,
        v_new_version,
        COALESCE(p_expires_at, NOW() + INTERVAL '1 day' * p_rotation_interval_days),
        NOW() + INTERVAL '1 day' * p_rotation_interval_days,
        p_rotation_interval_days,
        p_metadata
    ) RETURNING id INTO v_secret_id;
    
    -- Log the creation
    INSERT INTO key_rotation_history (
        secret_name,
        old_key_version,
        new_key_version,
        rotation_type,
        rotation_reason,
        rotated_by,
        metadata
    ) VALUES (
        p_secret_name,
        v_new_version - 1,
        v_new_version,
        'manual',
        'Secret created/updated',
        current_setting('app.current_user_id', true)::UUID,
        jsonb_build_object(
            'secret_type', p_secret_type,
            'rotation_interval_days', p_rotation_interval_days
        )
    );
    
    RETURN jsonb_build_object(
        'secret_id', v_secret_id,
        'secret_name', p_secret_name,
        'key_version', v_new_version,
        'expires_at', COALESCE(p_expires_at, NOW() + INTERVAL '1 day' * p_rotation_interval_days),
        'status', 'success'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retrieve active secret (for applications)
CREATE OR REPLACE FUNCTION get_active_secret(
    p_secret_name TEXT,
    p_service_name TEXT DEFAULT 'unknown'
) RETURNS TEXT AS $$
DECLARE
    v_encrypted_value TEXT;
    v_key_version INT;
    v_decrypted_value TEXT;
BEGIN
    -- Get active secret
    SELECT encrypted_value, key_version INTO v_encrypted_value, v_key_version
    FROM secrets_vault
    WHERE secret_name = p_secret_name
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF v_encrypted_value IS NULL THEN
        RAISE EXCEPTION 'Secret not found or expired: %', p_secret_name;
    END IF;
    
    -- Log usage (for rotation planning)
    INSERT INTO api_key_usage (
        secret_name,
        key_version,
        service_name,
        usage_context
    ) VALUES (
        p_secret_name,
        v_key_version,
        p_service_name,
        jsonb_build_object(
            'access_timestamp', NOW(),
            'requesting_function', 'get_active_secret'
        )
    ) ON CONFLICT (secret_name, key_version, service_name, DATE_TRUNC('hour', usage_timestamp))
    DO UPDATE SET
        request_count = api_key_usage.request_count + 1,
        usage_context = api_key_usage.usage_context || EXCLUDED.usage_context;
    
    -- Simple decryption (replace with proper decryption)
    -- In production, this would decrypt using your master key
    v_decrypted_value := v_encrypted_value; -- Placeholder
    
    RETURN v_decrypted_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate secret
CREATE OR REPLACE FUNCTION rotate_secret(
    p_secret_name TEXT,
    p_new_secret_value TEXT,
    p_rotation_type TEXT DEFAULT 'scheduled',
    p_rotation_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_old_secret RECORD;
    v_new_version INT;
    v_result JSONB;
    v_old_key_hash TEXT;
BEGIN
    -- Get current active secret
    SELECT * INTO v_old_secret
    FROM secrets_vault
    WHERE secret_name = p_secret_name
    AND is_active = true;
    
    IF v_old_secret IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'No active secret found to rotate'
        );
    END IF;
    
    -- Calculate hash of old key for audit
    v_old_key_hash := encode(digest(v_old_secret.encrypted_value, 'sha256'), 'hex');
    
    -- Store new version
    v_result := store_secret(
        p_secret_name,
        v_old_secret.secret_type,
        p_new_secret_value,
        v_old_secret.rotation_interval_days,
        NOW() + INTERVAL '1 day' * v_old_secret.rotation_interval_days,
        v_old_secret.metadata
    );
    
    v_new_version := (v_result->>'key_version')::INT;
    
    -- Update rotation history
    UPDATE key_rotation_history
    SET 
        rotation_type = p_rotation_type,
        rotation_reason = COALESCE(p_rotation_reason, 'Scheduled rotation'),
        old_key_hash = v_old_key_hash,
        metadata = metadata || jsonb_build_object(
            'old_expires_at', v_old_secret.expires_at,
            'new_expires_at', v_result->>'expires_at'
        )
    WHERE secret_name = p_secret_name
    AND new_key_version = v_new_version;
    
    -- Schedule next rotation
    UPDATE secrets_vault
    SET 
        rotation_scheduled_at = NOW() + INTERVAL '1 day' * rotation_interval_days,
        last_rotated_at = NOW()
    WHERE secret_name = p_secret_name
    AND key_version = v_new_version;
    
    RETURN v_result || jsonb_build_object(
        'rotation_type', p_rotation_type,
        'old_version', v_old_secret.key_version,
        'old_key_hash', v_old_key_hash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check secrets requiring rotation
CREATE OR REPLACE FUNCTION check_secrets_for_rotation() RETURNS TABLE (
    secret_name TEXT,
    key_version INT,
    expires_at TIMESTAMPTZ,
    rotation_scheduled_at TIMESTAMPTZ,
    days_until_expiry INT,
    rotation_urgency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sv.secret_name,
        sv.key_version,
        sv.expires_at,
        sv.rotation_scheduled_at,
        EXTRACT(DAY FROM sv.expires_at - NOW())::INT as days_until_expiry,
        CASE 
            WHEN sv.expires_at <= NOW() THEN 'EXPIRED'
            WHEN sv.expires_at <= NOW() + INTERVAL '7 days' THEN 'CRITICAL'
            WHEN sv.rotation_scheduled_at <= NOW() THEN 'DUE'
            WHEN sv.rotation_scheduled_at <= NOW() + INTERVAL '7 days' THEN 'UPCOMING'
            ELSE 'OK'
        END as rotation_urgency
    FROM secrets_vault sv
    WHERE sv.is_active = true
    AND (sv.expires_at <= NOW() + INTERVAL '30 days' 
         OR sv.rotation_scheduled_at <= NOW() + INTERVAL '30 days')
    ORDER BY sv.expires_at;
END;
$$ LANGUAGE plpgsql;

-- Function to track API key usage and errors
CREATE OR REPLACE FUNCTION track_api_key_usage(
    p_secret_name TEXT,
    p_service_name TEXT,
    p_success_count BIGINT DEFAULT 1,
    p_error_count BIGINT DEFAULT 0,
    p_rate_limit_hits BIGINT DEFAULT 0,
    p_error_message TEXT DEFAULT NULL,
    p_context JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO api_key_usage (
        secret_name,
        key_version,
        service_name,
        request_count,
        success_count,
        error_count,
        rate_limit_hits,
        last_error_message,
        usage_context
    ) VALUES (
        p_secret_name,
        (SELECT key_version FROM secrets_vault WHERE secret_name = p_secret_name AND is_active = true),
        p_service_name,
        p_success_count + p_error_count,
        p_success_count,
        p_error_count,
        p_rate_limit_hits,
        p_error_message,
        p_context
    ) ON CONFLICT (secret_name, key_version, service_name, DATE_TRUNC('hour', usage_timestamp))
    DO UPDATE SET
        request_count = api_key_usage.request_count + EXCLUDED.request_count,
        success_count = api_key_usage.success_count + EXCLUDED.success_count,
        error_count = api_key_usage.error_count + EXCLUDED.error_count,
        rate_limit_hits = api_key_usage.rate_limit_hits + EXCLUDED.rate_limit_hits,
        last_error_message = COALESCE(EXCLUDED.last_error_message, api_key_usage.last_error_message),
        usage_context = api_key_usage.usage_context || EXCLUDED.usage_context;
END;
$$ LANGUAGE plpgsql;

-- Emergency key rotation function (for compromised keys)
CREATE OR REPLACE FUNCTION emergency_rotate_secret(
    p_secret_name TEXT,
    p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
    v_new_key TEXT;
    v_result JSONB;
BEGIN
    -- Generate new emergency key (this should integrate with your key generation service)
    v_new_key := 'emergency_' || encode(gen_random_bytes(32), 'base64');
    
    -- Perform emergency rotation
    v_result := rotate_secret(
        p_secret_name,
        v_new_key,
        'emergency',
        'EMERGENCY: ' || p_reason
    );
    
    -- Immediately expire old version
    UPDATE secrets_vault
    SET 
        expires_at = NOW(),
        is_active = false
    WHERE secret_name = p_secret_name
    AND key_version < (v_result->>'key_version')::INT;
    
    RETURN v_result || jsonb_build_object(
        'emergency_rotation', true,
        'reason', p_reason,
        'new_key_prefix', substring(v_new_key, 1, 10) || '...'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for secrets monitoring dashboard
CREATE OR REPLACE VIEW secrets_monitoring_dashboard AS
WITH secret_status AS (
    SELECT 
        sv.secret_name,
        sv.secret_type,
        sv.key_version,
        sv.created_at,
        sv.expires_at,
        sv.rotation_scheduled_at,
        sv.last_rotated_at,
        sv.rotation_interval_days,
        EXTRACT(DAY FROM sv.expires_at - NOW())::INT as days_until_expiry,
        CASE 
            WHEN sv.expires_at <= NOW() THEN 'EXPIRED'
            WHEN sv.expires_at <= NOW() + INTERVAL '7 days' THEN 'CRITICAL'
            WHEN sv.rotation_scheduled_at <= NOW() THEN 'DUE'
            WHEN sv.rotation_scheduled_at <= NOW() + INTERVAL '7 days' THEN 'UPCOMING'
            ELSE 'OK'
        END as status
    FROM secrets_vault sv
    WHERE sv.is_active = true
),
usage_stats AS (
    SELECT 
        aku.secret_name,
        COUNT(*) as usage_records,
        SUM(aku.request_count) as total_requests,
        SUM(aku.success_count) as total_successes,
        SUM(aku.error_count) as total_errors,
        SUM(aku.rate_limit_hits) as total_rate_limits,
        MAX(aku.usage_timestamp) as last_used
    FROM api_key_usage aku
    WHERE aku.usage_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY aku.secret_name
)
SELECT 
    ss.secret_name,
    ss.secret_type,
    ss.key_version,
    ss.status,
    ss.days_until_expiry,
    ss.expires_at,
    ss.rotation_scheduled_at,
    ss.last_rotated_at,
    COALESCE(us.total_requests, 0) as monthly_requests,
    COALESCE(us.total_errors, 0) as monthly_errors,
    COALESCE(us.total_rate_limits, 0) as monthly_rate_limits,
    us.last_used,
    CASE 
        WHEN us.total_requests > 0 THEN ROUND((us.total_successes::FLOAT / us.total_requests * 100), 2)
        ELSE NULL
    END as success_rate_percent
FROM secret_status ss
LEFT JOIN usage_stats us ON us.secret_name = ss.secret_name
ORDER BY 
    CASE ss.status 
        WHEN 'EXPIRED' THEN 1
        WHEN 'CRITICAL' THEN 2
        WHEN 'DUE' THEN 3
        WHEN 'UPCOMING' THEN 4
        ELSE 5
    END,
    ss.expires_at;

-- Function to get rotation alerts
CREATE OR REPLACE FUNCTION check_secrets_rotation_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- Alert on expired secrets
    RETURN QUERY
    SELECT 
        'SECRET_EXPIRED'::TEXT,
        'CRITICAL'::TEXT,
        format('Secret %s has expired', sv.secret_name),
        jsonb_build_object(
            'secret_name', sv.secret_name,
            'secret_type', sv.secret_type,
            'expired_at', sv.expires_at,
            'key_version', sv.key_version
        )
    FROM secrets_vault sv
    WHERE sv.is_active = true
    AND sv.expires_at <= NOW();
    
    -- Alert on secrets expiring soon
    RETURN QUERY
    SELECT 
        'SECRET_EXPIRING_SOON'::TEXT,
        'WARNING'::TEXT,
        format('Secret %s expires in %s days', sv.secret_name, EXTRACT(DAY FROM sv.expires_at - NOW())),
        jsonb_build_object(
            'secret_name', sv.secret_name,
            'secret_type', sv.secret_type,
            'expires_at', sv.expires_at,
            'days_until_expiry', EXTRACT(DAY FROM sv.expires_at - NOW()),
            'key_version', sv.key_version
        )
    FROM secrets_vault sv
    WHERE sv.is_active = true
    AND sv.expires_at > NOW()
    AND sv.expires_at <= NOW() + INTERVAL '7 days';
    
    -- Alert on high error rates
    RETURN QUERY
    SELECT 
        'HIGH_API_KEY_ERROR_RATE'::TEXT,
        'WARNING'::TEXT,
        format('High error rate for secret %s: %.1f%%', 
               aku.secret_name, 
               (aku.error_count::FLOAT / aku.request_count * 100)),
        jsonb_build_object(
            'secret_name', aku.secret_name,
            'error_rate_percent', ROUND(aku.error_count::FLOAT / aku.request_count * 100, 1),
            'total_requests', aku.request_count,
            'total_errors', aku.error_count,
            'period', '24_hours'
        )
    FROM api_key_usage aku
    WHERE aku.usage_timestamp > NOW() - INTERVAL '24 hours'
    AND aku.request_count >= 10  -- Only alert if significant usage
    AND (aku.error_count::FLOAT / aku.request_count) > 0.2  -- 20% error rate
    GROUP BY aku.secret_name, aku.request_count, aku.error_count;
END;
$$ LANGUAGE plpgsql;

-- Initialize system secrets
INSERT INTO secrets_vault (secret_name, secret_type, encrypted_value, rotation_interval_days, metadata) VALUES
    ('openai_primary_key', 'api_key', 'encrypted_placeholder_key_1', 90, '{"provider": "openai", "tier": "primary"}'),
    ('openai_secondary_key', 'api_key', 'encrypted_placeholder_key_2', 90, '{"provider": "openai", "tier": "secondary"}'),
    ('jwt_signing_key', 'jwt_secret', 'encrypted_jwt_secret', 180, '{"algorithm": "RS256"}'),
    ('database_encryption_key', 'encryption_key', 'encrypted_db_key', 365, '{"purpose": "database_field_encryption"}'
ON CONFLICT (secret_name) DO NOTHING;

-- Comments
COMMENT ON TABLE secrets_vault IS 'Encrypted storage for API keys and secrets with rotation tracking';
COMMENT ON TABLE key_rotation_history IS 'Audit trail of all key rotations and changes';
COMMENT ON FUNCTION store_secret IS 'Securely stores a new secret with encryption and versioning';
COMMENT ON FUNCTION get_active_secret IS 'Retrieves current active secret for applications';
COMMENT ON FUNCTION rotate_secret IS 'Rotates a secret to a new version';
COMMENT ON FUNCTION emergency_rotate_secret IS 'Emergency rotation for compromised secrets';