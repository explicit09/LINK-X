-- Migration: Budget Protection with Hard Stops
-- Prevents cost runaway from malicious users or system bugs

-- Budget tracking table
CREATE TABLE IF NOT EXISTS budget_tracking (
    id BIGSERIAL PRIMARY KEY,
    tracking_date DATE DEFAULT CURRENT_DATE,
    cost_category TEXT NOT NULL CHECK (cost_category IN ('openai_embeddings', 'openai_chat', 'storage', 'compute')),
    tenant_id UUID,
    course_id UUID,
    cost_cents BIGINT NOT NULL DEFAULT 0, -- store costs in cents to avoid floating point issues
    api_calls_count BIGINT DEFAULT 0,
    tokens_used BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate daily entries
    UNIQUE (tracking_date, cost_category, tenant_id, course_id),
    
    -- Indexes for efficient queries
    INDEX (tracking_date, cost_category),
    INDEX (tenant_id, tracking_date),
    INDEX (course_id, tracking_date)
);

-- Budget limits configuration
CREATE TABLE IF NOT EXISTS budget_limits (
    id BIGSERIAL PRIMARY KEY,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'tenant', 'course')),
    scope_id UUID, -- NULL for global, tenant_id for tenant, course_id for course
    limit_type TEXT NOT NULL CHECK (limit_type IN ('daily', 'weekly', 'monthly')),
    cost_category TEXT NOT NULL CHECK (cost_category IN ('openai_embeddings', 'openai_chat', 'storage', 'compute', 'total')),
    limit_cents BIGINT NOT NULL,
    alert_threshold_percent INT DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 1 AND 100),
    hard_stop_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    -- Unique constraint
    UNIQUE (scope_type, scope_id, limit_type, cost_category),
    
    -- Indexes
    INDEX (scope_type, scope_id),
    INDEX (limit_type, cost_category)
);

-- Real-time cost tracking function
CREATE OR REPLACE FUNCTION track_api_cost(
    p_cost_category TEXT,
    p_tenant_id UUID,
    p_course_id UUID,
    p_cost_cents BIGINT,
    p_api_calls BIGINT DEFAULT 1,
    p_tokens_used BIGINT DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
    v_current_date DATE := CURRENT_DATE;
    v_budget_status JSONB;
    v_exceeded_limits JSONB := '[]'::jsonb;
BEGIN
    -- Update/insert daily cost tracking
    INSERT INTO budget_tracking (
        tracking_date,
        cost_category,
        tenant_id,
        course_id,
        cost_cents,
        api_calls_count,
        tokens_used
    ) VALUES (
        v_current_date,
        p_cost_category,
        p_tenant_id,
        p_course_id,
        p_cost_cents,
        p_api_calls,
        p_tokens_used
    ) ON CONFLICT (tracking_date, cost_category, tenant_id, course_id) DO UPDATE SET
        cost_cents = budget_tracking.cost_cents + EXCLUDED.cost_cents,
        api_calls_count = budget_tracking.api_calls_count + EXCLUDED.api_calls_count,
        tokens_used = budget_tracking.tokens_used + EXCLUDED.tokens_used,
        updated_at = NOW();
    
    -- Check budget limits and return status
    v_budget_status := check_budget_limits(p_tenant_id, p_course_id);
    
    RETURN v_budget_status;
END;
$$ LANGUAGE plpgsql;

-- Budget limit checking function
CREATE OR REPLACE FUNCTION check_budget_limits(
    p_tenant_id UUID DEFAULT NULL,
    p_course_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_limit RECORD;
    v_current_spend BIGINT;
    v_limit_period_start DATE;
    v_exceeded_limits JSONB := '[]'::jsonb;
    v_warnings JSONB := '[]'::jsonb;
    v_hard_stops JSONB := '[]'::jsonb;
BEGIN
    -- Check all applicable budget limits
    FOR v_limit IN 
        SELECT bl.*, 
               CASE bl.limit_type 
                   WHEN 'daily' THEN CURRENT_DATE
                   WHEN 'weekly' THEN DATE_TRUNC('week', CURRENT_DATE)::DATE
                   WHEN 'monthly' THEN DATE_TRUNC('month', CURRENT_DATE)::DATE
               END as period_start
        FROM budget_limits bl
        WHERE (bl.scope_type = 'global' AND bl.scope_id IS NULL)
           OR (bl.scope_type = 'tenant' AND bl.scope_id = p_tenant_id)
           OR (bl.scope_type = 'course' AND bl.scope_id = p_course_id)
    LOOP
        -- Calculate period start date
        v_limit_period_start := v_limit.period_start;
        
        -- Get current spending for this period
        SELECT COALESCE(SUM(bt.cost_cents), 0) INTO v_current_spend
        FROM budget_tracking bt
        WHERE bt.tracking_date >= v_limit_period_start
        AND (v_limit.cost_category = 'total' OR bt.cost_category = v_limit.cost_category)
        AND (v_limit.scope_type = 'global' 
             OR (v_limit.scope_type = 'tenant' AND bt.tenant_id = p_tenant_id)
             OR (v_limit.scope_type = 'course' AND bt.course_id = p_course_id));
        
        -- Check if limit exceeded
        IF v_current_spend >= v_limit.limit_cents THEN
            IF v_limit.hard_stop_enabled THEN
                v_hard_stops := v_hard_stops || jsonb_build_object(
                    'scope', v_limit.scope_type,
                    'scope_id', v_limit.scope_id,
                    'category', v_limit.cost_category,
                    'limit_cents', v_limit.limit_cents,
                    'current_spend', v_current_spend,
                    'exceeded_by', v_current_spend - v_limit.limit_cents
                );
            END IF;
            
            v_exceeded_limits := v_exceeded_limits || jsonb_build_object(
                'scope', v_limit.scope_type,
                'scope_id', v_limit.scope_id,
                'category', v_limit.cost_category,
                'limit_cents', v_limit.limit_cents,
                'current_spend', v_current_spend,
                'period', v_limit.limit_type,
                'hard_stop', v_limit.hard_stop_enabled
            );
        -- Check if approaching limit (warning threshold)
        ELSIF v_current_spend >= (v_limit.limit_cents * v_limit.alert_threshold_percent / 100) THEN
            v_warnings := v_warnings || jsonb_build_object(
                'scope', v_limit.scope_type,
                'scope_id', v_limit.scope_id,
                'category', v_limit.cost_category,
                'limit_cents', v_limit.limit_cents,
                'current_spend', v_current_spend,
                'threshold_percent', v_limit.alert_threshold_percent,
                'period', v_limit.limit_type
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'budget_ok', jsonb_array_length(v_hard_stops) = 0,
        'hard_stops', v_hard_stops,
        'exceeded_limits', v_exceeded_limits,
        'warnings', v_warnings,
        'checked_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to enforce budget before expensive operations
CREATE OR REPLACE FUNCTION enforce_budget_before_embedding(
    p_tenant_id UUID,
    p_course_id UUID,
    p_estimated_cost_cents BIGINT,
    p_token_count BIGINT DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
    v_budget_check JSONB;
    v_hard_stops JSONB;
BEGIN
    -- Check current budget status
    v_budget_check := check_budget_limits(p_tenant_id, p_course_id);
    v_hard_stops := v_budget_check->'hard_stops';
    
    -- If any hard stops are active, reject the operation
    IF jsonb_array_length(v_hard_stops) > 0 THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'BUDGET_EXCEEDED',
            'message', format('Budget exceeded. Cannot process embedding request. Cost: $%.2f', p_estimated_cost_cents::FLOAT / 100),
            'exceeded_limits', v_hard_stops,
            'estimated_cost_cents', p_estimated_cost_cents
        );
    END IF;
    
    -- Calculate projected spending after this operation
    DECLARE
        v_daily_spend BIGINT;
        v_projected_spend BIGINT;
        v_daily_limit BIGINT;
    BEGIN
        -- Get today's spending
        SELECT COALESCE(SUM(cost_cents), 0) INTO v_daily_spend
        FROM budget_tracking
        WHERE tracking_date = CURRENT_DATE
        AND cost_category = 'openai_embeddings'
        AND (tenant_id = p_tenant_id OR course_id = p_course_id);
        
        v_projected_spend := v_daily_spend + p_estimated_cost_cents;
        
        -- Get daily limit (check global first, then tenant, then course)
        SELECT limit_cents INTO v_daily_limit
        FROM budget_limits
        WHERE limit_type = 'daily' 
        AND cost_category IN ('openai_embeddings', 'total')
        AND ((scope_type = 'course' AND scope_id = p_course_id)
             OR (scope_type = 'tenant' AND scope_id = p_tenant_id)
             OR (scope_type = 'global' AND scope_id IS NULL))
        ORDER BY CASE scope_type 
                   WHEN 'course' THEN 1 
                   WHEN 'tenant' THEN 2 
                   WHEN 'global' THEN 3 
                 END
        LIMIT 1;
        
        -- Check if projected spending would exceed limit
        IF v_daily_limit IS NOT NULL AND v_projected_spend > v_daily_limit THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'PROJECTED_BUDGET_EXCEEDED',
                'message', format('Operation would exceed daily budget. Current: $%.2f, Projected: $%.2f, Limit: $%.2f', 
                                v_daily_spend::FLOAT / 100, v_projected_spend::FLOAT / 100, v_daily_limit::FLOAT / 100),
                'current_spend_cents', v_daily_spend,
                'projected_spend_cents', v_projected_spend,
                'daily_limit_cents', v_daily_limit,
                'estimated_cost_cents', p_estimated_cost_cents
            );
        END IF;
    END;
    
    -- Operation is allowed
    RETURN jsonb_build_object(
        'allowed', true,
        'estimated_cost_cents', p_estimated_cost_cents,
        'token_count', p_token_count,
        'budget_warnings', v_budget_check->'warnings'
    );
END;
$$ LANGUAGE plpgsql;

-- Modified embedding job creation with budget enforcement
CREATE OR REPLACE FUNCTION create_chunk_with_budget_check(
    p_file_id UUID,
    p_chunk_index INT,
    p_content TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_priority INT DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_course_id UUID;
    v_token_count BIGINT;
    v_estimated_cost_cents BIGINT;
    v_budget_check JSONB;
    v_chunk_id UUID;
BEGIN
    -- Get tenant and course context
    SELECT c.instructor_id, f.course_id INTO v_tenant_id, v_course_id
    FROM files f
    JOIN courses c ON c.id = f.course_id
    WHERE f.id = p_file_id;
    
    -- Estimate token count (rough approximation: 1 token ≈ 4 characters)
    v_token_count := CEIL(LENGTH(p_content) / 4.0);
    
    -- Estimate cost (text-embedding-3-small: $0.00002 per 1K tokens)
    v_estimated_cost_cents := CEIL((v_token_count::FLOAT / 1000) * 0.002 * 100); -- Convert to cents
    
    -- Check budget before proceeding
    v_budget_check := enforce_budget_before_embedding(
        v_tenant_id, 
        v_course_id, 
        v_estimated_cost_cents, 
        v_token_count
    );
    
    -- If budget check fails, return error
    IF NOT (v_budget_check->>'allowed')::boolean THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'error_type', 'BUDGET_EXCEEDED',
            'message', v_budget_check->>'message',
            'budget_details', v_budget_check
        );
    END IF;
    
    -- Create the chunk and embedding job (using existing function)
    v_chunk_id := create_chunk_with_embedding_job(
        p_file_id,
        p_chunk_index,
        p_content,
        p_metadata || jsonb_build_object(
            'estimated_cost_cents', v_estimated_cost_cents,
            'estimated_tokens', v_token_count
        ),
        p_priority
    );
    
    -- Track the estimated cost immediately (actual cost tracked when embedding completes)
    PERFORM track_api_cost(
        'openai_embeddings',
        v_tenant_id,
        v_course_id,
        v_estimated_cost_cents,
        1, -- API call count
        v_token_count
    );
    
    RETURN jsonb_build_object(
        'status', 'success',
        'chunk_id', v_chunk_id,
        'estimated_cost_cents', v_estimated_cost_cents,
        'token_count', v_token_count,
        'budget_warnings', v_budget_check->'budget_warnings'
    );
END;
$$ LANGUAGE plpgsql;

-- Daily budget monitoring view
CREATE OR REPLACE VIEW daily_budget_status AS
WITH daily_limits AS (
    SELECT 
        bl.scope_type,
        bl.scope_id,
        bl.cost_category,
        bl.limit_cents,
        bl.alert_threshold_percent,
        bl.hard_stop_enabled
    FROM budget_limits bl
    WHERE bl.limit_type = 'daily'
),
daily_spending AS (
    SELECT 
        bt.tenant_id,
        bt.course_id,
        bt.cost_category,
        SUM(bt.cost_cents) as spent_cents,
        SUM(bt.api_calls_count) as total_api_calls,
        SUM(bt.tokens_used) as total_tokens
    FROM budget_tracking bt
    WHERE bt.tracking_date = CURRENT_DATE
    GROUP BY bt.tenant_id, bt.course_id, bt.cost_category
)
SELECT 
    dl.scope_type,
    dl.scope_id,
    dl.cost_category,
    dl.limit_cents,
    COALESCE(ds.spent_cents, 0) as spent_cents,
    ROUND((COALESCE(ds.spent_cents, 0)::FLOAT / dl.limit_cents * 100), 2) as usage_percent,
    dl.alert_threshold_percent,
    dl.hard_stop_enabled,
    CASE 
        WHEN COALESCE(ds.spent_cents, 0) >= dl.limit_cents AND dl.hard_stop_enabled THEN 'HARD_STOP'
        WHEN COALESCE(ds.spent_cents, 0) >= dl.limit_cents THEN 'EXCEEDED'
        WHEN COALESCE(ds.spent_cents, 0) >= (dl.limit_cents * dl.alert_threshold_percent / 100) THEN 'WARNING'
        ELSE 'OK'
    END as status,
    COALESCE(ds.total_api_calls, 0) as api_calls_today,
    COALESCE(ds.total_tokens, 0) as tokens_today
FROM daily_limits dl
LEFT JOIN daily_spending ds ON (
    (dl.scope_type = 'global' AND dl.scope_id IS NULL) OR
    (dl.scope_type = 'tenant' AND dl.scope_id = ds.tenant_id) OR
    (dl.scope_type = 'course' AND dl.scope_id = ds.course_id)
) AND (dl.cost_category = 'total' OR dl.cost_category = ds.cost_category);

-- Function to get budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'BUDGET_EXCEEDED'::TEXT,
        CASE 
            WHEN dbs.status = 'HARD_STOP' THEN 'CRITICAL'
            WHEN dbs.status = 'EXCEEDED' THEN 'HIGH'
            WHEN dbs.status = 'WARNING' THEN 'WARNING'
            ELSE 'INFO'
        END::TEXT,
        format('%s budget %s: $%.2f / $%.2f (%.1f%%) for %s %s', 
               UPPER(dbs.cost_category), 
               LOWER(dbs.status),
               dbs.spent_cents::FLOAT / 100,
               dbs.limit_cents::FLOAT / 100,
               dbs.usage_percent,
               dbs.scope_type,
               COALESCE(dbs.scope_id::TEXT, 'global')),
        jsonb_build_object(
            'scope_type', dbs.scope_type,
            'scope_id', dbs.scope_id,
            'cost_category', dbs.cost_category,
            'spent_cents', dbs.spent_cents,
            'limit_cents', dbs.limit_cents,
            'usage_percent', dbs.usage_percent,
            'hard_stop_enabled', dbs.hard_stop_enabled,
            'api_calls_today', dbs.api_calls_today,
            'tokens_today', dbs.tokens_today
        )
    FROM daily_budget_status dbs
    WHERE dbs.status IN ('WARNING', 'EXCEEDED', 'HARD_STOP');
END;
$$ LANGUAGE plpgsql;

-- Initialize default budget limits
INSERT INTO budget_limits (scope_type, scope_id, limit_type, cost_category, limit_cents, alert_threshold_percent, hard_stop_enabled) VALUES
    -- Global daily limits
    ('global', NULL, 'daily', 'total', 5000, 80, true), -- $50/day total
    ('global', NULL, 'daily', 'openai_embeddings', 3000, 80, true), -- $30/day for embeddings
    
    -- Global weekly limits  
    ('global', NULL, 'weekly', 'total', 25000, 80, true), -- $250/week total
    
    -- Global monthly limits
    ('global', NULL, 'monthly', 'total', 100000, 80, false) -- $1000/month (warning only)
ON CONFLICT (scope_type, scope_id, limit_type, cost_category) DO NOTHING;

-- Comments
COMMENT ON TABLE budget_tracking IS 'Tracks API costs by category, tenant, and course for budget monitoring';
COMMENT ON TABLE budget_limits IS 'Configurable budget limits with hard stops and alerting thresholds';
COMMENT ON FUNCTION track_api_cost IS 'Records API costs and checks budget limits in real-time';
COMMENT ON FUNCTION enforce_budget_before_embedding IS 'Prevents operations that would exceed budget limits';
COMMENT ON FUNCTION create_chunk_with_budget_check IS 'Creates chunks with upfront budget validation';