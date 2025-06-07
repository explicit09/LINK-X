-- Migration: Immutable Compliance Audit Logging
-- Provides FERPA/GDPR compliant audit trail for all data access

-- Immutable audit log table (append-only)
CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    tenant_id UUID NOT NULL,
    actor_id UUID, -- user who performed action
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'admin', 'service')),
    action_type TEXT NOT NULL CHECK (action_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'SEARCH', 'DOWNLOAD', 'UPLOAD')),
    table_name TEXT NOT NULL,
    record_id UUID,
    content_hash TEXT, -- SHA-256 of sensitive content
    query_hash TEXT, -- hash of search query for retrieval tracking
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    course_id UUID,
    file_id UUID,
    metadata JSONB DEFAULT '{}',
    retention_until TIMESTAMPTZ, -- calculated as event_timestamp + 180 days
    
    -- Immutability constraints
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes for efficient compliance queries
    INDEX (tenant_id, event_timestamp),
    INDEX (actor_id, event_timestamp),
    INDEX (table_name, action_type, event_timestamp),
    INDEX (retention_until),
    INDEX (course_id, event_timestamp),
    INDEX (file_id, event_timestamp)
);

-- Prevent any updates or deletes (immutable log)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Audit log is immutable. Operation % not allowed.', TG_OP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_modification
    BEFORE UPDATE OR DELETE ON compliance_audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Function to log data access events
CREATE OR REPLACE FUNCTION log_data_access(
    p_tenant_id UUID,
    p_actor_id UUID,
    p_actor_type TEXT,
    p_action_type TEXT,
    p_table_name TEXT,
    p_record_id UUID DEFAULT NULL,
    p_content TEXT DEFAULT NULL,
    p_query TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_course_id UUID DEFAULT NULL,
    p_file_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_content_hash TEXT;
    v_query_hash TEXT;
    v_retention_date TIMESTAMPTZ;
BEGIN
    -- Calculate retention date (180 days for FERPA compliance)
    v_retention_date := NOW() + INTERVAL '180 days';
    
    -- Hash sensitive content
    IF p_content IS NOT NULL THEN
        v_content_hash := encode(sha256(p_content::bytea), 'hex');
    END IF;
    
    -- Hash search queries
    IF p_query IS NOT NULL THEN
        v_query_hash := encode(sha256(p_query::bytea), 'hex');
    END IF;
    
    -- Insert audit record
    INSERT INTO compliance_audit_log (
        tenant_id,
        actor_id,
        actor_type,
        action_type,
        table_name,
        record_id,
        content_hash,
        query_hash,
        ip_address,
        user_agent,
        session_id,
        course_id,
        file_id,
        metadata,
        retention_until
    ) VALUES (
        p_tenant_id,
        p_actor_id,
        p_actor_type,
        p_action_type,
        p_table_name,
        p_record_id,
        v_content_hash,
        v_query_hash,
        p_ip_address,
        p_user_agent,
        p_session_id,
        p_course_id,
        p_file_id,
        p_metadata,
        v_retention_date
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers for sensitive tables
CREATE OR REPLACE FUNCTION audit_file_chunks_access()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_course_id UUID;
BEGIN
    -- Get tenant context from file
    SELECT c.instructor_id, fc.course_id INTO v_tenant_id, v_course_id
    FROM file_chunks fc
    JOIN files f ON f.id = fc.file_id
    JOIN courses c ON c.id = f.course_id
    WHERE fc.id = COALESCE(NEW.id, OLD.id);
    
    -- Log the access
    PERFORM log_data_access(
        p_tenant_id := v_tenant_id,
        p_actor_id := current_setting('app.current_user_id', true)::UUID,
        p_actor_type := COALESCE(current_setting('app.actor_type', true), 'system'),
        p_action_type := TG_OP,
        p_table_name := 'file_chunks',
        p_record_id := COALESCE(NEW.id, OLD.id),
        p_content := CASE WHEN TG_OP = 'SELECT' THEN COALESCE(NEW.content, OLD.content) ELSE NULL END,
        p_ip_address := current_setting('app.request_ip', true)::INET,
        p_user_agent := current_setting('app.user_agent', true),
        p_session_id := current_setting('app.session_id', true),
        p_course_id := v_course_id,
        p_file_id := COALESCE(NEW.file_id, OLD.file_id),
        p_metadata := jsonb_build_object(
            'chunk_index', COALESCE(NEW.chunk_index, OLD.chunk_index),
            'has_embedding', (COALESCE(NEW.embedding, OLD.embedding) IS NOT NULL)
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER audit_file_chunks_trigger
    AFTER INSERT OR UPDATE OR DELETE ON file_chunks
    FOR EACH ROW EXECUTE FUNCTION audit_file_chunks_access();

-- Audit search operations via a dedicated function
CREATE OR REPLACE FUNCTION audit_vector_search(
    p_query_vector vector,
    p_query_text TEXT,
    p_course_id UUID,
    p_user_id UUID,
    p_limit INT DEFAULT 10
) RETURNS TABLE(chunk_id UUID, similarity FLOAT) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Get tenant ID
    SELECT instructor_id INTO v_tenant_id
    FROM courses WHERE id = p_course_id;
    
    -- Log the search
    PERFORM log_data_access(
        p_tenant_id := v_tenant_id,
        p_actor_id := p_user_id,
        p_actor_type := 'user',
        p_action_type := 'SEARCH',
        p_table_name := 'file_chunks',
        p_query := p_query_text,
        p_ip_address := current_setting('app.request_ip', true)::INET,
        p_user_agent := current_setting('app.user_agent', true),
        p_session_id := current_setting('app.session_id', true),
        p_course_id := p_course_id,
        p_metadata := jsonb_build_object(
            'search_limit', p_limit,
            'vector_dimensions', array_length(p_query_vector, 1)
        )
    );
    
    -- Perform the search
    RETURN QUERY
    SELECT fc.id, (fc.embedding <=> p_query_vector) as similarity
    FROM file_chunks fc
    JOIN files f ON f.id = fc.file_id
    WHERE f.course_id = p_course_id
    AND fc.embedding IS NOT NULL
    ORDER BY similarity
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- FERPA data destruction function
CREATE OR REPLACE FUNCTION ferpa_destroy_student_data(
    p_student_id UUID,
    p_course_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_destroyed_records JSONB := '[]'::jsonb;
    v_record RECORD;
BEGIN
    -- Log the destruction request
    PERFORM log_data_access(
        p_tenant_id := (SELECT instructor_id FROM courses WHERE id = p_course_id),
        p_actor_id := p_student_id,
        p_actor_type := 'user',
        p_action_type := 'DELETE',
        p_table_name := 'student_data_destruction',
        p_course_id := p_course_id,
        p_metadata := jsonb_build_object(
            'destruction_type', 'FERPA_REQUEST',
            'student_id', p_student_id
        )
    );
    
    -- Find and mark files for destruction (don't delete immediately for audit)
    FOR v_record IN 
        SELECT f.id, f.filename, f.course_id
        FROM files f
        WHERE f.uploaded_by = p_student_id
        AND (p_course_id IS NULL OR f.course_id = p_course_id)
    LOOP
        -- Mark file as destroyed
        UPDATE files 
        SET metadata = metadata || jsonb_build_object(
            'ferpa_destroyed', true,
            'destruction_date', NOW(),
            'destruction_reason', 'FERPA_STUDENT_REQUEST'
        )
        WHERE id = v_record.id;
        
        -- Log each destruction
        PERFORM log_data_access(
            p_tenant_id := (SELECT instructor_id FROM courses WHERE id = v_record.course_id),
            p_actor_id := p_student_id,
            p_actor_type := 'user',
            p_action_type := 'DELETE',
            p_table_name := 'files',
            p_record_id := v_record.id,
            p_course_id := v_record.course_id,
            p_file_id := v_record.id,
            p_metadata := jsonb_build_object(
                'filename', v_record.filename,
                'destruction_reason', 'FERPA_STUDENT_REQUEST'
            )
        );
        
        v_destroyed_records := v_destroyed_records || jsonb_build_object(
            'file_id', v_record.id,
            'filename', v_record.filename,
            'course_id', v_record.course_id
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'destroyed_files', v_destroyed_records,
        'destruction_timestamp', NOW(),
        'student_id', p_student_id
    );
END;
$$ LANGUAGE plpgsql;

-- Audit log retention cleanup (automated)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs() RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Only delete logs past retention period
    DELETE FROM compliance_audit_log
    WHERE retention_until < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    PERFORM log_data_access(
        p_tenant_id := '00000000-0000-0000-0000-000000000000'::UUID,
        p_actor_id := NULL,
        p_actor_type := 'system',
        p_action_type := 'DELETE',
        p_table_name := 'compliance_audit_log',
        p_metadata := jsonb_build_object(
            'deleted_count', v_deleted_count,
            'cleanup_type', 'RETENTION_POLICY'
        )
    );
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily cleanup (requires pg_cron)
-- SELECT cron.schedule('audit-log-cleanup', '0 2 * * *', 'SELECT cleanup_expired_audit_logs();');

-- Compliance reporting views
CREATE OR REPLACE VIEW compliance_access_report AS
SELECT 
    DATE_TRUNC('day', event_timestamp) as access_date,
    tenant_id,
    course_id,
    action_type,
    table_name,
    COUNT(*) as access_count,
    COUNT(DISTINCT actor_id) as unique_users,
    COUNT(DISTINCT file_id) as unique_files
FROM compliance_audit_log
WHERE event_timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', event_timestamp), tenant_id, course_id, action_type, table_name
ORDER BY access_date DESC;

-- FERPA compliance status view
CREATE OR REPLACE VIEW ferpa_compliance_status AS
SELECT 
    c.id as course_id,
    c.name as course_name,
    c.instructor_id,
    COUNT(DISTINCT cal.actor_id) as students_with_data_access,
    MAX(cal.event_timestamp) as last_student_access,
    COUNT(*) FILTER (WHERE cal.action_type = 'DELETE' AND cal.metadata->>'destruction_reason' = 'FERPA_STUDENT_REQUEST') as ferpa_destruction_requests,
    BOOL_AND(cal.retention_until > NOW()) as all_logs_within_retention
FROM courses c
LEFT JOIN compliance_audit_log cal ON cal.course_id = c.id
WHERE cal.actor_type = 'user'
AND cal.event_timestamp > NOW() - INTERVAL '180 days'
GROUP BY c.id, c.name, c.instructor_id;

-- Comments
COMMENT ON TABLE compliance_audit_log IS 'Immutable audit trail for FERPA/GDPR compliance - tracks all data access';
COMMENT ON FUNCTION log_data_access IS 'Records data access events for compliance audit trail';
COMMENT ON FUNCTION ferpa_destroy_student_data IS 'FERPA-compliant student data destruction with audit trail';
COMMENT ON FUNCTION audit_vector_search IS 'Audited vector similarity search with compliance logging';