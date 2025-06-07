-- Migration: Production Monitoring with Hard SLO Thresholds
-- Implements comprehensive monitoring with specific alerting thresholds

-- SLO (Service Level Objective) definitions
CREATE TABLE IF NOT EXISTS slo_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    slo_type TEXT NOT NULL CHECK (slo_type IN ('availability', 'latency', 'throughput', 'error_rate', 'capacity')),
    
    -- Threshold definitions
    target_value FLOAT NOT NULL,
    warning_threshold FLOAT NOT NULL,
    critical_threshold FLOAT NOT NULL,
    
    -- Time windows
    measurement_window_minutes INT NOT NULL DEFAULT 5,
    evaluation_period_minutes INT NOT NULL DEFAULT 15,
    
    -- Alert configuration
    alert_enabled BOOLEAN DEFAULT true,
    page_duty BOOLEAN DEFAULT false,
    escalation_minutes INT DEFAULT 15,
    
    -- Metadata
    description TEXT,
    runbook_url TEXT,
    owner_team TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE (service_name, metric_name),
    
    -- Indexes
    INDEX (service_name, alert_enabled),
    INDEX (slo_type, alert_enabled)
);

-- Real-time metrics storage (time-series data)
CREATE TABLE IF NOT EXISTS metrics_timeseries (
    id BIGSERIAL PRIMARY KEY,
    service_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional context
    instance_id TEXT,
    environment TEXT DEFAULT 'production',
    tags JSONB DEFAULT '{}',
    
    -- Partition by time for performance
    -- This table should be partitioned by timestamp in production
    
    -- Indexes
    INDEX (service_name, metric_name, timestamp),
    INDEX (timestamp DESC),
    INDEX USING GIN (tags)
);

-- Alert states and history
CREATE TABLE IF NOT EXISTS alert_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slo_id UUID NOT NULL REFERENCES slo_definitions(id),
    service_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    
    -- Alert state
    status TEXT NOT NULL CHECK (status IN ('firing', 'resolved', 'silenced')),
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Alert details
    current_value FLOAT,
    threshold_value FLOAT,
    message TEXT,
    
    -- Escalation
    escalated BOOLEAN DEFAULT false,
    escalated_at TIMESTAMPTZ,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    
    -- Context
    environment TEXT DEFAULT 'production',
    instance_id TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX (service_name, status),
    INDEX (severity, status, started_at),
    INDEX (escalated, status)
);

-- Function to record metric
CREATE OR REPLACE FUNCTION record_metric(
    p_service_name TEXT,
    p_metric_name TEXT,
    p_metric_value FLOAT,
    p_instance_id TEXT DEFAULT NULL,
    p_tags JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO metrics_timeseries (
        service_name,
        metric_name,
        metric_value,
        instance_id,
        tags
    ) VALUES (
        p_service_name,
        p_metric_name,
        p_metric_value,
        p_instance_id,
        p_tags
    );
    
    -- Trigger alert evaluation
    PERFORM evaluate_slo_alerts(p_service_name, p_metric_name);
END;
$$ LANGUAGE plpgsql;

-- Function to evaluate SLO alerts
CREATE OR REPLACE FUNCTION evaluate_slo_alerts(
    p_service_name TEXT,
    p_metric_name TEXT
) RETURNS JSONB AS $$
DECLARE
    v_slo RECORD;
    v_current_value FLOAT;
    v_alert_status TEXT;
    v_severity TEXT;
    v_existing_alert UUID;
    v_alert_id UUID;
    v_should_fire BOOLEAN := false;
    v_results JSONB := '[]'::jsonb;
BEGIN
    -- Get SLO definition
    SELECT * INTO v_slo
    FROM slo_definitions
    WHERE service_name = p_service_name
    AND metric_name = p_metric_name
    AND alert_enabled = true;
    
    IF v_slo IS NULL THEN
        RETURN jsonb_build_object('status', 'no_slo_defined');
    END IF;
    
    -- Calculate current metric value over evaluation window
    SELECT 
        CASE v_slo.slo_type
            WHEN 'latency' THEN AVG(metric_value)
            WHEN 'error_rate' THEN AVG(metric_value)
            WHEN 'throughput' THEN AVG(metric_value)
            WHEN 'availability' THEN AVG(metric_value)
            ELSE AVG(metric_value)
        END
    INTO v_current_value
    FROM metrics_timeseries
    WHERE service_name = p_service_name
    AND metric_name = p_metric_name
    AND timestamp > NOW() - INTERVAL '1 minute' * v_slo.evaluation_period_minutes;
    
    IF v_current_value IS NULL THEN
        RETURN jsonb_build_object('status', 'no_data');
    END IF;
    
    -- Determine if alert should fire and severity
    IF v_current_value >= v_slo.critical_threshold THEN
        v_should_fire := true;
        v_severity := 'critical';
    ELSIF v_current_value >= v_slo.warning_threshold THEN
        v_should_fire := true;
        v_severity := 'warning';
    END IF;
    
    -- Check for existing alert
    SELECT id INTO v_existing_alert
    FROM alert_instances
    WHERE slo_id = v_slo.id
    AND status = 'firing'
    ORDER BY started_at DESC
    LIMIT 1;
    
    IF v_should_fire THEN
        IF v_existing_alert IS NULL THEN
            -- Create new alert
            INSERT INTO alert_instances (
                slo_id,
                service_name,
                metric_name,
                status,
                severity,
                current_value,
                threshold_value,
                message,
                metadata
            ) VALUES (
                v_slo.id,
                p_service_name,
                p_metric_name,
                'firing',
                v_severity,
                v_current_value,
                CASE v_severity WHEN 'critical' THEN v_slo.critical_threshold ELSE v_slo.warning_threshold END,
                format('%s.%s is %.2f, exceeding %s threshold of %.2f',
                       p_service_name, p_metric_name, v_current_value,
                       v_severity, 
                       CASE v_severity WHEN 'critical' THEN v_slo.critical_threshold ELSE v_slo.warning_threshold END),
                jsonb_build_object(
                    'evaluation_period_minutes', v_slo.evaluation_period_minutes,
                    'slo_type', v_slo.slo_type,
                    'runbook_url', v_slo.runbook_url
                )
            ) RETURNING id INTO v_alert_id;
            
            v_results := v_results || jsonb_build_object(
                'action', 'alert_created',
                'alert_id', v_alert_id,
                'severity', v_severity,
                'current_value', v_current_value
            );
        ELSE
            -- Update existing alert
            UPDATE alert_instances
            SET 
                current_value = v_current_value,
                last_updated = NOW(),
                severity = v_severity,
                message = format('%s.%s is %.2f, exceeding %s threshold of %.2f',
                                p_service_name, p_metric_name, v_current_value,
                                v_severity,
                                CASE v_severity WHEN 'critical' THEN v_slo.critical_threshold ELSE v_slo.warning_threshold END)
            WHERE id = v_existing_alert;
            
            v_results := v_results || jsonb_build_object(
                'action', 'alert_updated',
                'alert_id', v_existing_alert,
                'severity', v_severity,
                'current_value', v_current_value
            );
        END IF;
        
        -- Check for escalation
        IF v_severity = 'critical' AND v_slo.page_duty THEN
            UPDATE alert_instances
            SET escalated = true, escalated_at = NOW()
            WHERE id = COALESCE(v_alert_id, v_existing_alert)
            AND escalated = false;
        END IF;
        
    ELSE
        -- Resolve existing alert if value is now below threshold
        IF v_existing_alert IS NOT NULL THEN
            UPDATE alert_instances
            SET 
                status = 'resolved',
                resolved_at = NOW(),
                last_updated = NOW()
            WHERE id = v_existing_alert;
            
            v_results := v_results || jsonb_build_object(
                'action', 'alert_resolved',
                'alert_id', v_existing_alert,
                'current_value', v_current_value
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'service_name', p_service_name,
        'metric_name', p_metric_name,
        'current_value', v_current_value,
        'slo_target', v_slo.target_value,
        'alert_actions', v_results,
        'evaluated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get current alert status
CREATE OR REPLACE FUNCTION get_alert_status() RETURNS TABLE (
    alert_id UUID,
    service_name TEXT,
    metric_name TEXT,
    severity TEXT,
    status TEXT,
    current_value FLOAT,
    threshold_value FLOAT,
    duration_minutes INT,
    escalated BOOLEAN,
    message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ai.id,
        ai.service_name,
        ai.metric_name,
        ai.severity,
        ai.status,
        ai.current_value,
        ai.threshold_value,
        EXTRACT(EPOCH FROM NOW() - ai.started_at)::INT / 60,
        ai.escalated,
        ai.message
    FROM alert_instances ai
    WHERE ai.status = 'firing'
    ORDER BY 
        CASE ai.severity WHEN 'critical' THEN 1 ELSE 2 END,
        ai.started_at;
END;
$$ LANGUAGE plpgsql;

-- Function to acknowledge alert
CREATE OR REPLACE FUNCTION acknowledge_alert(
    p_alert_id UUID,
    p_acknowledged_by TEXT
) RETURNS JSONB AS $$
DECLARE
    v_alert RECORD;
BEGIN
    -- Get alert details
    SELECT * INTO v_alert
    FROM alert_instances
    WHERE id = p_alert_id
    AND status = 'firing';
    
    IF v_alert IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Alert not found or not firing'
        );
    END IF;
    
    -- Acknowledge alert
    UPDATE alert_instances
    SET 
        acknowledged = true,
        acknowledged_by = p_acknowledged_by,
        acknowledged_at = NOW(),
        last_updated = NOW()
    WHERE id = p_alert_id;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'alert_id', p_alert_id,
        'acknowledged_by', p_acknowledged_by,
        'acknowledged_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get SLO compliance metrics
CREATE OR REPLACE FUNCTION get_slo_compliance(
    p_service_name TEXT DEFAULT NULL,
    p_hours_back INT DEFAULT 24
) RETURNS TABLE (
    service_name TEXT,
    metric_name TEXT,
    slo_target FLOAT,
    current_value FLOAT,
    compliance_percent FLOAT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH slo_metrics AS (
        SELECT 
            slo.service_name,
            slo.metric_name,
            slo.target_value as slo_target,
            slo.slo_type,
            AVG(mt.metric_value) as avg_value,
            COUNT(*) as measurement_count
        FROM slo_definitions slo
        LEFT JOIN metrics_timeseries mt ON (
            mt.service_name = slo.service_name 
            AND mt.metric_name = slo.metric_name
            AND mt.timestamp > NOW() - INTERVAL '1 hour' * p_hours_back
        )
        WHERE (p_service_name IS NULL OR slo.service_name = p_service_name)
        GROUP BY slo.service_name, slo.metric_name, slo.target_value, slo.slo_type
    )
    SELECT 
        sm.service_name,
        sm.metric_name,
        sm.slo_target,
        COALESCE(sm.avg_value, 0) as current_value,
        CASE 
            WHEN sm.slo_type IN ('error_rate') THEN 
                CASE WHEN sm.avg_value <= sm.slo_target THEN 100.0 
                     ELSE (sm.slo_target / sm.avg_value * 100.0) 
                END
            WHEN sm.slo_type IN ('availability', 'throughput') THEN
                CASE WHEN sm.avg_value >= sm.slo_target THEN 100.0
                     ELSE (sm.avg_value / sm.slo_target * 100.0)
                END
            ELSE 100.0
        END as compliance_percent,
        CASE 
            WHEN sm.measurement_count = 0 THEN 'NO_DATA'
            WHEN sm.avg_value IS NULL THEN 'NO_DATA'
            WHEN (
                (sm.slo_type IN ('error_rate') AND sm.avg_value <= sm.slo_target) OR
                (sm.slo_type IN ('availability', 'throughput') AND sm.avg_value >= sm.slo_target)
            ) THEN 'MEETING_SLO'
            ELSE 'MISSING_SLO'
        END as status
    FROM slo_metrics sm
    ORDER BY compliance_percent ASC;
END;
$$ LANGUAGE plpgsql;

-- Initialize production SLO definitions
INSERT INTO slo_definitions (service_name, metric_name, slo_type, target_value, warning_threshold, critical_threshold, page_duty, description, measurement_window_minutes, evaluation_period_minutes) VALUES

-- Embedding system SLOs
('embedding_system', 'queue_depth', 'capacity', 1000, 10000, 50000, true, 'Embedding job queue depth - page if > 50k pending', 5, 15),
('embedding_system', 'processing_latency_ms', 'latency', 2000, 5000, 10000, false, 'Average embedding processing time', 5, 15),
('embedding_system', 'error_rate_percent', 'error_rate', 1.0, 2.0, 5.0, true, 'Embedding job error rate', 5, 15),
('embedding_system', 'throughput_per_minute', 'throughput', 30, 20, 10, false, 'Embeddings processed per minute', 5, 15),

-- Worker health SLOs  
('worker_health', 'healthy_workers', 'availability', 1, 1, 0, true, 'Number of healthy workers - page if none', 1, 5),
('worker_health', 'heartbeat_age_seconds', 'latency', 30, 60, 300, true, 'Time since last worker heartbeat', 1, 5),

-- API performance SLOs
('api', 'response_time_ms', 'latency', 200, 500, 1000, false, 'API response time 95th percentile', 5, 15),
('api', 'error_rate_percent', 'error_rate', 1.0, 2.0, 5.0, true, 'API error rate', 5, 15),
('api', 'availability_percent', 'availability', 99.9, 99.5, 99.0, true, 'API availability', 5, 15),

-- Budget and cost SLOs
('budget', 'daily_cost_dollars', 'capacity', 50, 40, 50, true, 'Daily OpenAI API cost - page at limit', 60, 60),
('budget', 'hourly_cost_dollars', 'capacity', 5, 4, 5, false, 'Hourly cost tracking', 60, 60),

-- Database SLOs
('database', 'connection_count', 'capacity', 80, 90, 100, false, 'Database connection usage', 5, 15),
('database', 'query_time_ms', 'latency', 100, 500, 1000, false, 'Database query response time', 5, 15),

-- Vector search SLOs
('vector_search', 'recall_at_5', 'availability', 0.8, 0.7, 0.6, false, 'Vector search recall quality', 60, 60),
('vector_search', 'search_latency_ms', 'latency', 200, 500, 1000, false, 'Vector search response time', 5, 15)

ON CONFLICT (service_name, metric_name) DO UPDATE SET
    target_value = EXCLUDED.target_value,
    warning_threshold = EXCLUDED.warning_threshold,
    critical_threshold = EXCLUDED.critical_threshold,
    updated_at = NOW();

-- Production monitoring dashboard view
CREATE OR REPLACE VIEW production_monitoring_dashboard AS
WITH current_metrics AS (
    SELECT DISTINCT ON (service_name, metric_name)
        service_name,
        metric_name,
        metric_value,
        timestamp
    FROM metrics_timeseries
    WHERE timestamp > NOW() - INTERVAL '10 minutes'
    ORDER BY service_name, metric_name, timestamp DESC
),
alert_summary AS (
    SELECT 
        service_name,
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning_alerts,
        COUNT(*) FILTER (WHERE escalated = true) as escalated_alerts,
        COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged_alerts
    FROM alert_instances
    WHERE status = 'firing'
    GROUP BY service_name
)
SELECT 
    slo.service_name,
    slo.metric_name,
    slo.slo_type,
    slo.target_value,
    cm.metric_value as current_value,
    cm.timestamp as last_updated,
    CASE 
        WHEN cm.metric_value IS NULL THEN 'NO_DATA'
        WHEN (slo.slo_type IN ('error_rate') AND cm.metric_value > slo.critical_threshold) THEN 'CRITICAL'
        WHEN (slo.slo_type IN ('error_rate') AND cm.metric_value > slo.warning_threshold) THEN 'WARNING'
        WHEN (slo.slo_type IN ('latency', 'capacity') AND cm.metric_value > slo.critical_threshold) THEN 'CRITICAL'
        WHEN (slo.slo_type IN ('latency', 'capacity') AND cm.metric_value > slo.warning_threshold) THEN 'WARNING'
        WHEN (slo.slo_type IN ('availability', 'throughput') AND cm.metric_value < slo.critical_threshold) THEN 'CRITICAL'
        WHEN (slo.slo_type IN ('availability', 'throughput') AND cm.metric_value < slo.warning_threshold) THEN 'WARNING'
        ELSE 'OK'
    END as status,
    COALESCE(asm.total_alerts, 0) as active_alerts,
    COALESCE(asm.critical_alerts, 0) as critical_alerts,
    COALESCE(asm.unacknowledged_alerts, 0) as unacknowledged_alerts,
    slo.page_duty,
    slo.runbook_url
FROM slo_definitions slo
LEFT JOIN current_metrics cm ON (cm.service_name = slo.service_name AND cm.metric_name = slo.metric_name)
LEFT JOIN alert_summary asm ON asm.service_name = slo.service_name
WHERE slo.alert_enabled = true
ORDER BY 
    CASE status 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'WARNING' THEN 2 
        WHEN 'NO_DATA' THEN 3 
        ELSE 4 
    END,
    slo.service_name,
    slo.metric_name;

-- Function to generate production monitoring alerts
CREATE OR REPLACE FUNCTION check_production_monitoring_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- Return current firing alerts
    RETURN QUERY
    SELECT 
        'SLO_VIOLATION'::TEXT,
        ai.severity,
        ai.message,
        jsonb_build_object(
            'service_name', ai.service_name,
            'metric_name', ai.metric_name,
            'current_value', ai.current_value,
            'threshold_value', ai.threshold_value,
            'started_at', ai.started_at,
            'duration_minutes', EXTRACT(EPOCH FROM NOW() - ai.started_at)::INT / 60,
            'escalated', ai.escalated,
            'acknowledged', ai.acknowledged,
            'alert_id', ai.id
        )
    FROM alert_instances ai
    WHERE ai.status = 'firing'
    ORDER BY 
        CASE ai.severity WHEN 'critical' THEN 1 ELSE 2 END,
        ai.started_at;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old metrics (data retention)
CREATE OR REPLACE FUNCTION cleanup_old_metrics(
    p_retention_days INT DEFAULT 30
) RETURNS INT AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM metrics_timeseries
    WHERE timestamp < NOW() - INTERVAL '1 day' * p_retention_days;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Also cleanup resolved alerts older than retention period
    DELETE FROM alert_instances
    WHERE status = 'resolved'
    AND resolved_at < NOW() - INTERVAL '1 day' * p_retention_days;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule metrics cleanup (requires pg_cron)
-- SELECT cron.schedule('cleanup-metrics', '0 2 * * *', 'SELECT cleanup_old_metrics(30);');

-- Comments
COMMENT ON TABLE slo_definitions IS 'Service Level Objective definitions with alerting thresholds';
COMMENT ON TABLE metrics_timeseries IS 'Time-series metrics data for SLO monitoring';
COMMENT ON TABLE alert_instances IS 'Active and historical alert instances';
COMMENT ON FUNCTION record_metric IS 'Records a metric value and triggers alert evaluation';
COMMENT ON FUNCTION evaluate_slo_alerts IS 'Evaluates current metrics against SLO thresholds';
COMMENT ON VIEW production_monitoring_dashboard IS 'Real-time production monitoring dashboard';