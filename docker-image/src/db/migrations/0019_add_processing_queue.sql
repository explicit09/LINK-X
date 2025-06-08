-- Add processing queue table for AI file processing
CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    processing_type VARCHAR(50) NOT NULL DEFAULT 'full',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Add indexes for efficient queue processing
CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_priority ON processing_queue(priority, created_at);
CREATE INDEX idx_processing_queue_file_id ON processing_queue(file_id);

-- Add RLS policies
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own processing jobs
CREATE POLICY "Users can view their own processing jobs" ON processing_queue
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM files f
            WHERE f.id = processing_queue.file_id
            AND EXISTS (
                SELECT 1 FROM modules m
                JOIN courses c ON c.id = m.course_id
                WHERE m.id = f.module_id
                AND (c.creator_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM enrollments e
                    WHERE e.course_id = c.id
                    AND e.user_id = auth.uid()
                ))
            )
        )
    );

-- Allow system to manage processing queue
CREATE POLICY "System can manage processing queue" ON processing_queue
    FOR ALL
    USING (true)
    WITH CHECK (true);