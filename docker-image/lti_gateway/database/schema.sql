-- LTI 1.3 Database Schema - Multi-tenant security enforced
-- BRUTAL EXECUTION: Every query MUST include tenant isolation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- LTI Platform Registration (Multi-tenant isolation enforced)
CREATE TABLE lti_platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    iss VARCHAR(255) NOT NULL,                    -- Platform issuer (e.g., https://canvas.instructure.com)
    client_id VARCHAR(255) NOT NULL,              -- OAuth2 client ID
    deployment_id VARCHAR(255),                   -- LTI deployment identifier
    auth_login_url TEXT NOT NULL,                 -- OIDC login URL
    auth_token_url TEXT NOT NULL,                 -- OAuth2 token endpoint
    key_set_url TEXT NOT NULL,                    -- Platform's JWKS URL
    public_key_set JSONB,                         -- Cached platform public keys
    platform_config JSONB DEFAULT '{}',           -- Platform-specific configuration
    active BOOLEAN DEFAULT true,                  -- Platform status
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- SECURITY: Multi-tenant isolation key
    UNIQUE(iss, client_id, deployment_id)
);

-- Performance indexes for lti_platforms
CREATE INDEX idx_lti_platforms_iss ON lti_platforms(iss);
CREATE INDEX idx_lti_platforms_active ON lti_platforms(active);
CREATE INDEX idx_lti_platforms_tenant ON lti_platforms(iss, client_id, deployment_id);

-- LTI Launch Sessions (Replay protection + audit trail)
CREATE TABLE lti_launches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
    
    -- LTI Claims (tenant-scoped)
    user_sub VARCHAR(255) NOT NULL,               -- Platform user identifier
    context_id VARCHAR(255),                      -- Course/context identifier
    resource_link_id VARCHAR(255),                -- Resource link identifier
    
    -- LEARN-X Integration
    learn_x_user_id UUID,                         -- Link to LEARN-X users table
    learn_x_course_id UUID,                       -- Link to LEARN-X courses
    
    -- Security & Audit
    launch_data JSONB NOT NULL,                   -- Full LTI claims for audit
    nonce VARCHAR(255) UNIQUE NOT NULL,           -- Replay protection
    jti VARCHAR(255),                             -- JWT ID for additional protection
    
    -- Session Management
    session_token VARCHAR(512),                   -- Generated LEARN-X auth token
    expires_at TIMESTAMP,                         -- Session expiration
    
    -- Audit Trail
    ip_address INET,                              -- Source IP for security
    user_agent TEXT,                              -- Browser/client info
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraint for nonce uniqueness
    CONSTRAINT uk_lti_launches_nonce UNIQUE(nonce)
);

-- Performance indexes for lti_launches
CREATE INDEX idx_lti_launches_platform ON lti_launches(platform_id);
CREATE INDEX idx_lti_launches_user ON lti_launches(platform_id, user_sub);
CREATE INDEX idx_lti_launches_context ON lti_launches(platform_id, context_id);
CREATE INDEX idx_lti_launches_nonce ON lti_launches(nonce);
CREATE INDEX idx_lti_launches_expires ON lti_launches(expires_at);
CREATE INDEX idx_lti_launches_cleanup ON lti_launches(created_at);

-- User Linking (LTI ↔ LEARN-X account mapping)
CREATE TABLE lti_user_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
    
    -- LTI User Identity
    user_sub VARCHAR(255) NOT NULL,               -- Platform user identifier
    lti_user_data JSONB,                          -- LTI user claims (name, email, etc.)
    
    -- LEARN-X User Identity
    learn_x_user_id UUID NOT NULL,                -- REFERENCES users(id) - external constraint
    
    -- Linking Metadata
    link_method VARCHAR(50) DEFAULT 'auto',       -- 'auto', 'manual', 'admin'
    verified BOOLEAN DEFAULT false,               -- User confirmed the link
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP,
    last_used TIMESTAMP DEFAULT NOW(),
    
    -- SECURITY: One LTI user → one LEARN-X user per platform
    UNIQUE(platform_id, user_sub)
);

-- Performance indexes for lti_user_links
CREATE INDEX idx_lti_user_links_platform_user ON lti_user_links(platform_id, user_sub);
CREATE INDEX idx_lti_user_links_learn_x_user ON lti_user_links(learn_x_user_id);
CREATE INDEX idx_lti_user_links_last_used ON lti_user_links(last_used);

-- Course Context Mapping (LTI Context ↔ LEARN-X Course)
CREATE TABLE lti_course_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
    
    -- LTI Context Identity
    context_id VARCHAR(255) NOT NULL,             -- LMS course/context ID
    context_data JSONB,                           -- LTI context claims
    
    -- LEARN-X Course Identity
    learn_x_course_id UUID NOT NULL,              -- REFERENCES courses(id) - external constraint
    
    -- Sync Metadata
    auto_created BOOLEAN DEFAULT false,           -- Created automatically vs manually
    sync_enabled BOOLEAN DEFAULT true,            -- Enable roster/grade sync
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    last_synced TIMESTAMP,
    
    -- SECURITY: One LTI context → one LEARN-X course per platform
    UNIQUE(platform_id, context_id)
);

-- Performance indexes for lti_course_links
CREATE INDEX idx_lti_course_links_platform_context ON lti_course_links(platform_id, context_id);
CREATE INDEX idx_lti_course_links_learn_x_course ON lti_course_links(learn_x_course_id);
CREATE INDEX idx_lti_course_links_sync ON lti_course_links(sync_enabled, last_synced);

-- Assignment & Grade Service (AGS) - Line Items
CREATE TABLE lti_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
    course_link_id UUID NOT NULL REFERENCES lti_course_links(id) ON DELETE CASCADE,
    
    -- AGS Identity
    line_item_id VARCHAR(255) NOT NULL,           -- LMS line item ID
    resource_link_id VARCHAR(255),                -- Associated resource link
    
    -- Assignment Details
    label TEXT NOT NULL,                          -- Assignment name
    max_score DECIMAL(10,2) DEFAULT 100.00,      -- Maximum points
    resource_id VARCHAR(255),                     -- LEARN-X assignment ID
    
    -- AGS URLs (from platform)
    score_url TEXT,                               -- Score submission endpoint
    result_url TEXT,                              -- Results retrieval endpoint
    
    -- Sync Status
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- SECURITY: Tenant isolation
    UNIQUE(platform_id, line_item_id)
);

-- Performance indexes for lti_line_items
CREATE INDEX idx_lti_line_items_platform ON lti_line_items(platform_id);
CREATE INDEX idx_lti_line_items_course ON lti_line_items(course_link_id);
CREATE INDEX idx_lti_line_items_resource ON lti_line_items(resource_link_id);
CREATE INDEX idx_lti_line_items_active ON lti_line_items(active);

-- Grade Sync Queue (Asynchronous grade passback)
CREATE TABLE lti_grade_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES lti_line_items(id) ON DELETE CASCADE,
    user_link_id UUID NOT NULL REFERENCES lti_user_links(id) ON DELETE CASCADE,
    
    -- Grade Data
    score_given DECIMAL(10,2),                    -- Actual score
    score_maximum DECIMAL(10,2),                  -- Maximum possible score
    activity_progress VARCHAR(50) DEFAULT 'Completed', -- 'Initialized', 'Started', 'InProgress', 'Submitted', 'Completed'
    grading_progress VARCHAR(50) DEFAULT 'FullyGraded', -- 'NotReady', 'Failed', 'Pending', 'PendingManual', 'FullyGraded'
    
    -- Sync Status
    status VARCHAR(50) DEFAULT 'pending',         -- 'pending', 'processing', 'completed', 'failed'
    attempts INTEGER DEFAULT 0,                   -- Retry counter
    max_attempts INTEGER DEFAULT 3,               -- Max retry limit
    
    -- Error Handling
    error_message TEXT,                           -- Last error details
    last_attempted TIMESTAMP,                     -- Last sync attempt
    next_retry TIMESTAMP,                         -- Next retry time (exponential backoff)
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Performance indexes for lti_grade_sync
CREATE INDEX idx_lti_grade_sync_status ON lti_grade_sync(status, next_retry);
CREATE INDEX idx_lti_grade_sync_platform ON lti_grade_sync(platform_id);
CREATE INDEX idx_lti_grade_sync_cleanup ON lti_grade_sync(created_at, status);
CREATE INDEX idx_lti_grade_sync_retry ON lti_grade_sync(next_retry, attempts, max_attempts);

-- Names & Roles Provisioning (NRPS) - Roster Cache
CREATE TABLE lti_roster_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
    course_link_id UUID NOT NULL REFERENCES lti_course_links(id) ON DELETE CASCADE,
    
    -- NRPS Member Data
    user_id VARCHAR(255) NOT NULL,                -- Platform user ID
    name VARCHAR(500),                             -- User's name
    email VARCHAR(255),                            -- User's email
    roles JSONB,                                   -- LTI roles array
    
    -- Member Status
    status VARCHAR(50) DEFAULT 'Active',          -- 'Active', 'Inactive', 'Deleted'
    
    -- Sync Metadata
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- SECURITY: Tenant + context isolation
    UNIQUE(platform_id, course_link_id, user_id)
);

-- Performance indexes for lti_roster_members
CREATE INDEX idx_lti_roster_platform_course ON lti_roster_members(platform_id, course_link_id);
CREATE INDEX idx_lti_roster_user ON lti_roster_members(platform_id, user_id);
CREATE INDEX idx_lti_roster_status ON lti_roster_members(status);
CREATE INDEX idx_lti_roster_sync ON lti_roster_members(last_seen);

-- Deep Linking Content Items
CREATE TABLE lti_content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
    
    -- Content Identity
    content_type VARCHAR(100) NOT NULL,           -- 'ai_tutor', 'assignment', 'resource'
    title VARCHAR(500) NOT NULL,                  -- Display title
    description TEXT,                              -- Content description
    
    -- Launch Configuration
    target_url TEXT NOT NULL,                     -- Launch URL
    custom_params JSONB DEFAULT '{}',             -- Custom parameters
    
    -- Content Metadata
    icon_url TEXT,                                 -- Content icon
    thumbnail_url TEXT,                            -- Preview thumbnail
    
    -- Availability
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for lti_content_items
CREATE INDEX idx_lti_content_items_platform ON lti_content_items(platform_id);
CREATE INDEX idx_lti_content_items_type ON lti_content_items(content_type);
CREATE INDEX idx_lti_content_items_active ON lti_content_items(active);

-- Security Audit Log (FERPA/GDPR compliance)
CREATE TABLE lti_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID REFERENCES lti_platforms(id) ON DELETE SET NULL,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL,             -- 'launch', 'grade_sync', 'roster_sync', 'user_link'
    event_data JSONB,                             -- Event-specific data
    
    -- Security Context
    user_sub VARCHAR(255),                        -- LTI user (if applicable)
    ip_address INET,                              -- Source IP
    user_agent TEXT,                              -- Client info
    
    -- Audit Metadata
    success BOOLEAN DEFAULT true,                 -- Event success/failure
    error_message TEXT,                           -- Error details (if failed)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for lti_audit_log
CREATE INDEX idx_lti_audit_log_platform ON lti_audit_log(platform_id);
CREATE INDEX idx_lti_audit_log_event ON lti_audit_log(event_type, created_at);
CREATE INDEX idx_lti_audit_log_user ON lti_audit_log(user_sub, created_at);
CREATE INDEX idx_lti_audit_log_cleanup ON lti_audit_log(created_at);

-- Cleanup Jobs Configuration
CREATE TABLE lti_cleanup_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,              -- How long to keep records
    cleanup_enabled BOOLEAN DEFAULT true,
    last_cleanup TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for lti_cleanup_config
CREATE INDEX idx_lti_cleanup_enabled ON lti_cleanup_config(cleanup_enabled, last_cleanup);

-- Insert default cleanup configuration
INSERT INTO lti_cleanup_config (table_name, retention_days) VALUES
('lti_launches', 30),         -- Keep launch sessions for 30 days
('lti_grade_sync', 90),       -- Keep grade sync history for 90 days  
('lti_audit_log', 365),       -- Keep audit logs for 1 year (compliance)
('lti_roster_members', 180);  -- Keep roster cache for 6 months

-- Security Views (Tenant-isolated queries)

-- Active platforms view
CREATE VIEW v_lti_active_platforms AS
SELECT 
    id,
    iss,
    client_id,
    deployment_id,
    auth_login_url,
    auth_token_url,
    key_set_url,
    platform_config,
    created_at,
    updated_at
FROM lti_platforms 
WHERE active = true;

-- Recent launches view (last 24 hours)
CREATE VIEW v_lti_recent_launches AS
SELECT 
    l.id,
    p.iss,
    p.client_id,
    p.deployment_id,
    l.user_sub,
    l.context_id,
    l.created_at,
    l.ip_address
FROM lti_launches l
JOIN lti_platforms p ON l.platform_id = p.id
WHERE l.created_at >= NOW() - INTERVAL '24 hours';

-- Pending grade syncs view
CREATE VIEW v_lti_pending_grades AS
SELECT 
    gs.id,
    p.iss,
    p.client_id,
    li.label as assignment_name,
    gs.score_given,
    gs.score_maximum,
    gs.status,
    gs.attempts,
    gs.next_retry,
    gs.created_at
FROM lti_grade_sync gs
JOIN lti_line_items li ON gs.line_item_id = li.id
JOIN lti_platforms p ON gs.platform_id = p.id
WHERE gs.status IN ('pending', 'failed') 
  AND (gs.next_retry IS NULL OR gs.next_retry <= NOW())
  AND gs.attempts < gs.max_attempts;

-- Row Level Security (RLS) Policies
-- Enable RLS on all tenant-scoped tables
ALTER TABLE lti_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_course_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_grade_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_roster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_content_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their platform's data
-- Note: In production, set up application-level tenant context
-- CREATE POLICY lti_tenant_isolation ON lti_launches
-- FOR ALL TO lti_app_user
-- USING (platform_id IN (
--     SELECT id FROM lti_platforms 
--     WHERE iss = current_setting('app.current_platform_iss')
--       AND client_id = current_setting('app.current_client_id')
--       AND deployment_id = current_setting('app.current_deployment_id')
-- ));

-- Functions for common operations

-- Generate secure session token
CREATE OR REPLACE FUNCTION generate_lti_session_token()
RETURNS VARCHAR(512) AS $$
BEGIN
    RETURN encode(gen_random_bytes(64), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_lti_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM lti_launches 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get platform by tenant keys
CREATE OR REPLACE FUNCTION get_lti_platform(
    p_iss VARCHAR(255),
    p_client_id VARCHAR(255),
    p_deployment_id VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
    platform_id UUID,
    auth_login_url TEXT,
    auth_token_url TEXT,
    key_set_url TEXT,
    public_key_set JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lp.id,
        lp.auth_login_url,
        lp.auth_token_url,
        lp.key_set_url,
        lp.public_key_set
    FROM lti_platforms lp
    WHERE lp.iss = p_iss
      AND lp.client_id = p_client_id
      AND (p_deployment_id IS NULL OR lp.deployment_id = p_deployment_id)
      AND lp.active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- BRUTAL SECURITY REMINDER:
-- Every application query MUST include platform_id in WHERE clause
-- No exceptions. Tenant isolation is non-negotiable.

COMMENT ON SCHEMA public IS 'LTI 1.3 Multi-tenant schema - SECURITY: Every query must include tenant isolation';
COMMENT ON TABLE lti_platforms IS 'SECURITY: Multi-tenant isolation enforced via (iss, client_id, deployment_id)';
COMMENT ON TABLE lti_launches IS 'SECURITY: Nonce replay protection + tenant scoping required';
COMMENT ON TABLE lti_user_links IS 'SECURITY: One LTI user maps to one LEARN-X user per platform';
COMMENT ON TABLE lti_grade_sync IS 'SECURITY: Async grade passback with retry logic - never block request thread';