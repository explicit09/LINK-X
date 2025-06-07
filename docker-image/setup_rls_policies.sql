-- Row Level Security policies for embedding tables
-- Ensures multi-tenancy and data isolation

-- Enable RLS on all embedding tables
ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_usage ENABLE ROW LEVEL SECURITY;

-- RLS policy for embedding_jobs (based on file ownership)
CREATE POLICY "Users can access their own embedding jobs" ON embedding_jobs
    FOR ALL USING (
        chunk_id IN (
            SELECT fc.id 
            FROM file_chunks fc
            JOIN files f ON f.id = fc.file_id
            JOIN courses c ON c.id = f.course_id
            WHERE auth.uid() = c.instructor_id OR auth.uid() IN (
                SELECT user_id FROM course_enrollments WHERE course_id = c.id
            )
        )
    );

-- RLS policy for dead letter queue (admin only)
CREATE POLICY "Only admins can access DLQ" ON embedding_dead_letter_queue
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- RLS policy for worker health (admin and service accounts)
CREATE POLICY "Admins and services can access worker health" ON worker_health
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'service') OR 
        auth.jwt() ->> 'sub' = worker_id
    );

-- RLS policy for rate limiting (service accounts only)
CREATE POLICY "Service accounts can access rate limiting" ON rate_limit_usage
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'service')
    );

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON embedding_system_health TO authenticated;
GRANT SELECT ON schema_validation_status TO authenticated;

-- Grant admin permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;