-- Supabase Storage Setup for LEARN-X
-- This script sets up storage buckets and RLS policies for file management

-- Create the course-files bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-files', 
    'course-files', 
    false,  -- private bucket
    104857600,  -- 100MB limit per file
    ARRAY['application/pdf', 'text/plain', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4',
          'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Helper function to extract course_id from storage path
-- Path format: courses/{course_id}/modules/{module_id}/{filename}
CREATE OR REPLACE FUNCTION storage.get_course_id_from_path(object_path text)
RETURNS uuid AS $$
BEGIN
    -- Extract course_id from path like 'courses/uuid/modules/...'
    RETURN (string_to_array(object_path, '/'))[2]::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to extract module_id from storage path
CREATE OR REPLACE FUNCTION storage.get_module_id_from_path(object_path text)
RETURNS uuid AS $$
BEGIN
    -- Extract module_id from path like 'courses/.../modules/uuid/...'
    RETURN (string_to_array(object_path, '/'))[4]::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RLS Policies for course-files bucket

-- 1. Instructors can upload files to their courses
CREATE POLICY "Instructors can upload to their courses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'course-files' 
    AND auth.uid() IN (
        SELECT instructor_id::uuid 
        FROM courses 
        WHERE id = storage.get_course_id_from_path(name)
    )
);

-- 2. Students can upload files if allowed by course settings
CREATE POLICY "Students can upload to allowed courses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'course-files' 
    AND EXISTS (
        SELECT 1 
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = auth.uid()::text
        AND c.id = storage.get_course_id_from_path(name)
        AND c.allow_student_uploads = true  -- Add this column to courses table if needed
    )
);

-- 3. Users can view files in courses they're enrolled in or teaching
CREATE POLICY "Users can view course files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'course-files' 
    AND (
        -- User is the instructor
        auth.uid() IN (
            SELECT instructor_id::uuid 
            FROM courses 
            WHERE id = storage.get_course_id_from_path(name)
        )
        OR
        -- User is enrolled in the course
        EXISTS (
            SELECT 1 
            FROM enrollments 
            WHERE user_id = auth.uid()::text
            AND course_id = storage.get_course_id_from_path(name)
        )
    )
);

-- 4. Instructors can update/delete files in their courses
CREATE POLICY "Instructors can update their course files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'course-files' 
    AND auth.uid() IN (
        SELECT instructor_id::uuid 
        FROM courses 
        WHERE id = storage.get_course_id_from_path(name)
    )
);

CREATE POLICY "Instructors can delete their course files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'course-files' 
    AND auth.uid() IN (
        SELECT instructor_id::uuid 
        FROM courses 
        WHERE id = storage.get_course_id_from_path(name)
    )
);

-- 5. Service role bypass (for backend operations)
CREATE POLICY "Service role has full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'course-files')
WITH CHECK (bucket_id = 'course-files');

-- Add column to courses table if it doesn't exist
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS allow_student_uploads BOOLEAN DEFAULT false;

-- Update files table to support Supabase Storage
ALTER TABLE files
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'course-files',
ADD COLUMN IF NOT EXISTS storage_metadata JSONB;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_files_storage_path ON files(storage_path);