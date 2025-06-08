-- Add Supabase Storage columns to files table for direct uploads

-- Add storage-related columns
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS storage_url TEXT,
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- Create index for course_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_files_course_id ON files(course_id);

-- Create index for uploaded_by if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- Update RLS policies to include uploaded_by
CREATE POLICY IF NOT EXISTS "Users can view files they uploaded" 
ON files FOR SELECT 
USING (
  auth.uid() = uploaded_by OR
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE m.id = files.module_id
    AND (c.instructor_id = auth.uid() OR c.creator_id = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN modules m ON m.course_id = e.course_id
    WHERE m.id = files.module_id
    AND e.user_id = auth.uid()
  )
);

-- Ensure the course-files bucket exists with proper policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-files',
  'course-files',
  true, -- Public bucket so files can be accessed via URL
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Storage policies for course-files bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload course materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-files' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY IF NOT EXISTS "Users can update their own uploads"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Anyone can view course materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-files');