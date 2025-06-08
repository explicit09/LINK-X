-- Fix for infinite recursion in courses RLS policy
-- This adds a specific INSERT policy for courses that doesn't create circular dependencies

-- First, let's check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'courses';

-- Add a specific INSERT policy for courses
-- This allows authenticated users to create courses without checking enrollments
CREATE POLICY "Users can create courses" ON courses
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND creator_id = auth.uid()
    );

-- If you want to restrict course creation to specific roles, use this instead:
-- CREATE POLICY "Instructors can create courses" ON courses
--     FOR INSERT 
--     WITH CHECK (
--         auth.uid() IS NOT NULL 
--         AND creator_id = auth.uid()
--         AND EXISTS (
--             SELECT 1 FROM profiles 
--             WHERE profiles.id = auth.uid() 
--             AND profiles.role IN ('instructor', 'admin')
--         )
--     );

-- Verify the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'courses'
ORDER BY cmd;