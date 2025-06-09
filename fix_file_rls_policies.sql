-- Check and fix RLS policies for file access

-- First, check if RLS is enabled on files table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'files';

-- Check existing policies on files table
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression,
    rol.rolname as role_name
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
LEFT JOIN pg_roles rol ON pol.polroles @> ARRAY[rol.oid]
WHERE cls.relname = 'files'
ORDER BY pol.polname;

-- Enable RLS on files table if not already enabled
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Students can view files they uploaded" ON files;
DROP POLICY IF EXISTS "Students can view files in enrolled courses" ON files;
DROP POLICY IF EXISTS "Course creators can view all course files" ON files;
DROP POLICY IF EXISTS "Students can upload files to courses" ON files;
DROP POLICY IF EXISTS "Students can delete their own files" ON files;

-- Create comprehensive policies for file access

-- 1. Students can view files they uploaded
CREATE POLICY "Students can view files they uploaded"
ON files FOR SELECT
TO authenticated
USING (
    uploaded_by = auth.uid() OR 
    created_by = auth.uid()
);

-- 2. Students can view all files in courses they're enrolled in
CREATE POLICY "Students can view files in enrolled courses"
ON files FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM modules m
        JOIN enrollments e ON e.course_id = m.course_id
        WHERE m.id = files.module_id
        AND e.user_id = auth.uid()
    )
);

-- 3. Course creators can view all files in their courses
CREATE POLICY "Course creators can view all course files"
ON files FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM modules m
        JOIN courses c ON c.id = m.course_id
        WHERE m.id = files.module_id
        AND c.creator_id = auth.uid()
    )
);

-- 4. Students can upload files to courses they're enrolled in
CREATE POLICY "Students can upload files to courses"
ON files FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM modules m
        JOIN enrollments e ON e.course_id = m.course_id
        WHERE m.id = module_id
        AND e.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
);

-- 5. Students can update their own files
CREATE POLICY "Students can update their own files"
ON files FOR UPDATE
TO authenticated
USING (
    uploaded_by = auth.uid() OR 
    created_by = auth.uid()
);

-- 6. Students can delete their own files
CREATE POLICY "Students can delete their own files"
ON files FOR DELETE
TO authenticated
USING (
    uploaded_by = auth.uid() OR 
    created_by = auth.uid()
);

-- Grant necessary permissions
GRANT ALL ON files TO authenticated;
GRANT USAGE ON SEQUENCE files_id_seq TO authenticated;

-- Also check and fix storage bucket policies
-- This ensures students can access files in Supabase Storage

-- First, check if course-files bucket exists
SELECT * FROM storage.buckets WHERE id = 'course-files';

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-files', 'course-files', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-files bucket
-- Drop existing policies
DROP POLICY IF EXISTS "Students can view files they uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Students can view files in enrolled courses" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload course files" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their files" ON storage.objects;

-- Create storage policies
-- 1. Students can view any file in course-files bucket (simplified for now)
CREATE POLICY "Students can view course files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-files');

-- 2. Students can upload files
CREATE POLICY "Students can upload course files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'course-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Students can update their own files
CREATE POLICY "Students can update their course files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'course-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Students can delete their own files
CREATE POLICY "Students can delete their course files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'course-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verify the policies were created
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('files', 'objects')
ORDER BY tablename, policyname;