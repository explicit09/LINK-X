-- Delete and Recreate Storage Policies for course-files bucket

-- Step 1: List existing policies (to see what needs to be deleted)
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- Step 2: Drop ALL existing policies on storage.objects for course-files
-- You may need to adjust these DROP commands based on what policies exist
DROP POLICY IF EXISTS "Instructors can upload to their courses" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload to allowed courses" ON storage.objects;
DROP POLICY IF EXISTS "Users can view course files" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update their course files" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete their course files" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access" ON storage.objects;

-- Also drop the simplified ones if they exist
DROP POLICY IF EXISTS "course-files: insert (auth only)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: select (owner)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: modify (owner)" ON storage.objects;
DROP POLICY IF EXISTS "course-files: delete (owner)" ON storage.objects;

-- Drop any other policies (add more DROP commands if you see other policy names)

-- Step 3: Create the new simplified policies

------------------------------------------------------------
-- INSERT  (auth users only)
------------------------------------------------------------
CREATE POLICY "course-files: insert (auth only)"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-files'
);

------------------------------------------------------------
-- SELECT  (owner)
------------------------------------------------------------
CREATE POLICY "course-files: select (owner)"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-files'
  AND owner = auth.uid()
);

------------------------------------------------------------
-- UPDATE  (owner)
------------------------------------------------------------
CREATE POLICY "course-files: update (owner)"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND owner = auth.uid()
);

------------------------------------------------------------
-- DELETE  (owner)
------------------------------------------------------------
CREATE POLICY "course-files: delete (owner)"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND owner = auth.uid()
);

-- Step 4: Verify the policies were created
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;