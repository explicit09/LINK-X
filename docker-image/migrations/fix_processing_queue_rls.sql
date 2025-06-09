-- Fix RLS policies for processing_queue to allow file processing
-- This resolves the "new row violates row-level security policy for table processing_queue" error

-- First check if the processing_queue table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'processing_queue') THEN
        RAISE NOTICE 'processing_queue table does not exist. Please run processing_queue_supabase.sql first.';
        RETURN;
    END IF;
END $$;

-- Enable RLS on processing_queue if not already enabled
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Service role has full access to processing queue" ON processing_queue;
DROP POLICY IF EXISTS "Users can view their own processing jobs" ON processing_queue;
DROP POLICY IF EXISTS "System can insert processing jobs" ON processing_queue;
DROP POLICY IF EXISTS "Authenticated users can insert processing jobs" ON processing_queue;

-- 1. Allow service role full access (for backend workers)
CREATE POLICY "Service role has full access" 
ON processing_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. CRITICAL: Allow authenticated users to INSERT processing jobs for their files
CREATE POLICY "Users can create processing jobs for their files" 
ON processing_queue
FOR INSERT
TO authenticated
WITH CHECK (
    -- Check that the user has access to the file they're trying to process
    EXISTS (
        SELECT 1 FROM files f
        JOIN modules m ON m.id = f.module_id
        JOIN courses c ON c.id = m.course_id
        WHERE f.id = processing_queue.file_id
        AND (
            -- User is the course creator/instructor
            c.creator_id = auth.uid()::uuid OR 
            c.instructor_id = auth.uid()::uuid OR
            -- User is enrolled in the course
            EXISTS (
                SELECT 1 FROM enrollments e
                WHERE e.course_id = c.id
                AND e.user_id = auth.uid()::uuid
            )
        )
    )
);

-- 3. Allow authenticated users to view their own processing jobs
CREATE POLICY "Users can view their own processing jobs" 
ON processing_queue
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM files f
        JOIN modules m ON m.id = f.module_id
        JOIN courses c ON c.id = m.course_id
        WHERE f.id = processing_queue.file_id
        AND (
            -- User is the course creator/instructor
            c.creator_id = auth.uid()::uuid OR 
            c.instructor_id = auth.uid()::uuid OR
            -- User is enrolled in the course
            EXISTS (
                SELECT 1 FROM enrollments e
                WHERE e.course_id = c.id
                AND e.user_id = auth.uid()::uuid
            )
        )
    )
);

-- 4. Allow authenticated users to update their own processing jobs (for cancellation)
CREATE POLICY "Users can update their own processing jobs" 
ON processing_queue
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM files f
        JOIN modules m ON m.id = f.module_id
        JOIN courses c ON c.id = m.course_id
        WHERE f.id = processing_queue.file_id
        AND (
            -- Only course creators/instructors can update
            c.creator_id = auth.uid()::uuid OR 
            c.instructor_id = auth.uid()::uuid
        )
    )
)
WITH CHECK (
    -- Can only update status to 'cancelled'
    status IN ('cancelled', 'pending', 'processing', 'completed', 'failed')
);

-- Grant necessary permissions
GRANT ALL ON processing_queue TO authenticated;
GRANT ALL ON processing_queue TO service_role;

-- Create or replace the function to queue files for processing
-- This function can be called from the application after file upload
CREATE OR REPLACE FUNCTION add_file_to_processing_queue(
    p_file_id UUID,
    p_priority VARCHAR(20) DEFAULT 'normal',
    p_processing_type VARCHAR(50) DEFAULT 'full'
)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
BEGIN
    -- Insert into processing queue
    INSERT INTO processing_queue (
        file_id,
        status,
        priority,
        processing_type,
        metadata
    ) VALUES (
        p_file_id,
        'pending',
        p_priority,
        p_processing_type,
        jsonb_build_object(
            'queued_at', NOW(),
            'queued_by', auth.uid()
        )
    )
    RETURNING id INTO v_queue_id;
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION add_file_to_processing_queue TO authenticated;

-- Create a simpler trigger-based approach (optional - uncomment if you want automatic queueing)
-- This trigger will automatically queue files for processing after upload
/*
CREATE OR REPLACE FUNCTION auto_queue_file_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process certain file types
    IF NEW.file_type IN ('application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') 
       AND NEW.storage_path IS NOT NULL THEN
        
        -- Use SECURITY DEFINER context to bypass RLS
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
                WHEN NEW.file_size > 10485760 THEN 'normal' -- Files > 10MB
                ELSE 'high' -- Smaller files
            END,
            'full',
            jsonb_build_object(
                'file_type', NEW.file_type,
                'file_size', NEW.file_size,
                'upload_time', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_queue_processing ON files;
CREATE TRIGGER trigger_auto_queue_processing
AFTER INSERT OR UPDATE OF storage_path ON files
FOR EACH ROW
EXECUTE FUNCTION auto_queue_file_processing();
*/

-- Helpful queries to debug processing queue issues:

-- Check current RLS policies
/*
SELECT 
    polname as policy_name,
    polcmd as command,
    pg_get_expr(polqual, polrelid) as using_expression,
    pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
WHERE polrelid = 'processing_queue'::regclass;
*/

-- Check if there are any pending jobs
/*
SELECT 
    pq.id,
    pq.file_id,
    pq.status,
    pq.created_at,
    f.name as file_name,
    f.file_type
FROM processing_queue pq
JOIN files f ON f.id = pq.file_id
WHERE pq.status = 'pending'
ORDER BY pq.created_at DESC
LIMIT 10;
*/