-- Fix RLS policies for courses table to avoid infinite recursion
-- Run this in your Supabase SQL editor

-- First, check current policies on courses table
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'courses';

-- Drop the problematic policy that's causing recursion
DROP POLICY IF EXISTS "Enrolled students view courses" ON courses;

-- Create a simpler policy for viewing courses that doesn't check enrollments
CREATE POLICY "Users can view accessible courses" ON courses
    FOR SELECT USING (
        published = true 
        OR creator_id = auth.uid()
        OR auth.uid() IN (
            SELECT user_id FROM enrollments WHERE course_id = courses.id
        )
    );

-- Add a specific INSERT policy that allows authenticated users to create courses
DROP POLICY IF EXISTS "Users can create courses" ON courses;
CREATE POLICY "Users can create courses" ON courses
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND creator_id = auth.uid()
    );

-- Ensure the "Creators manage own courses" policy exists for UPDATE/DELETE
DROP POLICY IF EXISTS "Creators manage own courses" ON courses;
CREATE POLICY "Creators manage own courses" ON courses
    FOR UPDATE USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own courses" ON courses
    FOR DELETE USING (auth.uid() = creator_id);

-- Verify the policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'courses'
ORDER BY cmd;