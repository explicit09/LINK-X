-- Simple Course Storage Policies for LEARN-X
-- Requirements:
-- 1. Students can create courses and upload to their own courses
-- 2. Professors can create courses and upload to their own courses
-- 3. Everyone can view files in courses they're enrolled in
-- 4. Only course creators can edit/delete files in their courses

-- Drop existing policies
DROP POLICY IF EXISTS "course-files: insert (auth only)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: select (owner)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: update (owner)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: delete (owner)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: insert (course creators)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: select (course members)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: update (course creators)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: delete (course creators)" ON storage.objects;

-- Create simple policies

------------------------------------------------------------
-- INSERT: Authenticated users can upload to courses they created
------------------------------------------------------------
CREATE POLICY "Upload to own courses"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM courses 
    WHERE id = (string_to_array(name, '/'))[2]::uuid
    AND (instructor_id = auth.uid() OR creator_id = auth.uid())
  )
);

------------------------------------------------------------
-- SELECT: View files in enrolled courses
------------------------------------------------------------
CREATE POLICY "View course files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-files'
  AND (
    -- User created the course
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = (string_to_array(name, '/'))[2]::uuid
      AND (instructor_id = auth.uid() OR creator_id = auth.uid())
    )
    OR
    -- User is enrolled in the course
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE course_id = (string_to_array(name, '/'))[2]::uuid
      AND user_id = auth.uid()::text
    )
  )
);

------------------------------------------------------------
-- UPDATE: Only course creators can update
------------------------------------------------------------
CREATE POLICY "Update own course files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM courses 
    WHERE id = (string_to_array(name, '/'))[2]::uuid
    AND (instructor_id = auth.uid() OR creator_id = auth.uid())
  )
);

------------------------------------------------------------
-- DELETE: Only course creators can delete
------------------------------------------------------------
CREATE POLICY "Delete own course files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM courses 
    WHERE id = (string_to_array(name, '/'))[2]::uuid
    AND (instructor_id = auth.uid() OR creator_id = auth.uid())
  )
);

-- Verify the policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;