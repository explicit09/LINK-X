-- Create processing queue table in Supabase for AI file processing
-- This table tracks files that need to be processed for text extraction, chunking, and embeddings

CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    processing_type VARCHAR(50) NOT NULL DEFAULT 'full',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_priority ON processing_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_processing_queue_file_id ON processing_queue(file_id);

-- Enable RLS
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for backend processing)
CREATE POLICY "Service role has full access to processing queue" ON processing_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to view their own processing jobs
CREATE POLICY "Users can view their own processing jobs" ON processing_queue
    FOR SELECT
    TO authenticated
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

-- Create function to automatically process files after upload
CREATE OR REPLACE FUNCTION queue_file_for_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if file has storage_path (uploaded successfully)
    IF NEW.storage_path IS NOT NULL THEN
        INSERT INTO processing_queue (
            file_id,
            status,
            priority,
            processing_type,
            metadata
        ) VALUES (
            NEW.id,
            'pending',
            CASE 
                WHEN NEW.file_size > 10485760 THEN 'normal' -- Files > 10MB get normal priority
                ELSE 'high' -- Smaller files get high priority
            END,
            'full',
            jsonb_build_object(
                'file_type', NEW.file_type,
                'file_size', NEW.file_size,
                'upload_time', NEW.created_at
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically queue files (disabled by default)
-- This can be enabled if you want automatic processing without explicit API calls
-- CREATE TRIGGER auto_queue_file_processing
-- AFTER INSERT ON files
-- FOR EACH ROW
-- EXECUTE FUNCTION queue_file_for_processing();

-- Function to get next job from queue (for workers)
CREATE OR REPLACE FUNCTION get_next_processing_job(worker_id TEXT DEFAULT NULL)
RETURNS TABLE (
    queue_id UUID,
    file_id UUID,
    priority VARCHAR(20),
    processing_type VARCHAR(50),
    metadata JSONB
) AS $$
DECLARE
    job_record RECORD;
BEGIN
    -- Lock and get the highest priority pending job
    SELECT pq.* INTO job_record
    FROM processing_queue pq
    WHERE pq.status = 'pending'
    AND pq.attempts < pq.max_attempts
    ORDER BY 
        CASE pq.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
        END,
        pq.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1;
    
    -- If we found a job, update its status
    IF job_record.id IS NOT NULL THEN
        UPDATE processing_queue
        SET status = 'processing',
            started_at = CURRENT_TIMESTAMP,
            attempts = attempts + 1,
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                      jsonb_build_object('worker_id', worker_id, 'attempt', attempts + 1)
        WHERE id = job_record.id;
        
        RETURN QUERY
        SELECT job_record.id, job_record.file_id, job_record.priority, 
               job_record.processing_type, job_record.metadata;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_processing_job(
    p_queue_id UUID,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_result_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE processing_queue
    SET status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
        completed_at = CURRENT_TIMESTAMP,
        error_message = p_error_message,
        metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_result_metadata, '{}'::jsonb)
    WHERE id = p_queue_id
    AND status = 'processing';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions to authenticated users
GRANT SELECT ON processing_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_processing_job TO service_role;
GRANT EXECUTE ON FUNCTION complete_processing_job TO service_role;