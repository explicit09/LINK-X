-- Course Sharing Storage Policies
-- This approach allows creators to manage files and share them with course members

-- First, let's create a helper function to check if a user has access to a course
-- This assumes you have enrollments table that tracks which users are in which courses
CREATE OR REPLACE FUNCTION storage.user_has_course_access(user_id uuid, file_path text)
RETURNS boolean AS $$
DECLARE
  course_id_from_path uuid;
  has_access boolean;
BEGIN
  -- Extract course_id from path (format: courses/{course_id}/...)
  course_id_from_path := (string_to_array(file_path, '/'))[2]::uuid;
  
  -- Check if user is either the course creator OR enrolled in the course
  SELECT EXISTS (
    -- User is the course creator/instructor
    SELECT 1 FROM courses 
    WHERE id = course_id_from_path 
    AND (instructor_id = user_id OR creator_id = user_id)
    
    UNION
    
    -- User is enrolled in the course
    SELECT 1 FROM enrollments 
    WHERE course_id = course_id_from_path 
    AND user_id = user_id::text
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "course-files: insert (auth only)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: select (owner)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: update (owner)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: delete (owner)" ON storage.objects;

-- New policies for course-based sharing

------------------------------------------------------------
-- INSERT: Only course creators/instructors can upload
------------------------------------------------------------
CREATE POLICY "course-files: insert (course creators)"
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
-- SELECT: Course members can view files
------------------------------------------------------------
CREATE POLICY "course-files: select (course members)"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-files'
  AND storage.user_has_course_access(auth.uid(), name)
);

------------------------------------------------------------
-- UPDATE: Only course creators/instructors can update
------------------------------------------------------------
CREATE POLICY "course-files: update (course creators)"
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
-- DELETE: Only course creators/instructors can delete
------------------------------------------------------------
CREATE POLICY "course-files: delete (course creators)"
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

-- Alternative: Simpler approach using metadata
-- If you want to avoid path parsing, you can store course_id in metadata

------------------------------------------------------------
-- Option 2: Using metadata approach (cleaner but requires updating upload code)
------------------------------------------------------------

-- First create a simple access check function
CREATE OR REPLACE FUNCTION storage.check_course_access(course_id uuid, user_id uuid, write_access boolean DEFAULT false)
RETURNS boolean AS $$
BEGIN
  IF write_access THEN
    -- Write access: only course creators/instructors
    RETURN EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id 
      AND (instructor_id = user_id OR creator_id = user_id)
    );
  ELSE
    -- Read access: course members
    RETURN EXISTS (
      -- Course creator/instructor
      SELECT 1 FROM courses 
      WHERE id = course_id 
      AND (instructor_id = user_id OR creator_id = user_id)
      
      UNION
      
      -- Enrolled student
      SELECT 1 FROM enrollments 
      WHERE course_id = course_id 
      AND user_id = user_id::text
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies using metadata (requires storing course_id in metadata during upload)
/*
-- Uncomment these if you want to use the metadata approach instead

DROP POLICY IF EXISTS "course-files: insert (course creators)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: select (course members)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: update (course creators)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: delete (course creators)" ON storage.objects;

CREATE POLICY "course-files: insert (course creators meta)"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-files'
  AND storage.check_course_access((metadata->>'course_id')::uuid, auth.uid(), true)
);

CREATE POLICY "course-files: select (course members meta)"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-files'
  AND storage.check_course_access((metadata->>'course_id')::uuid, auth.uid(), false)
);

CREATE POLICY "course-files: update (course creators meta)"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND storage.check_course_access((metadata->>'course_id')::uuid, auth.uid(), true)
);

CREATE POLICY "course-files: delete (course creators meta)"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND storage.check_course_access((metadata->>'course_id')::uuid, auth.uid(), true)
);
*/