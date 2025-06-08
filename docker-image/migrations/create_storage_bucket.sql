-- Create the course-files storage bucket in Supabase
-- Run this in the Supabase SQL editor

-- Enable the storage schema if not already enabled
CREATE SCHEMA IF NOT EXISTS storage;

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-files',
  'course-files',
  true, -- Public bucket so files can be accessed via URL
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course materials" ON storage.objects;

-- Create storage policies for the course-files bucket
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload course materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-files' AND
  auth.uid() IS NOT NULL
);

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files' AND
  auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'course-files' AND
  auth.uid() = owner
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files' AND
  auth.uid() = owner
);

-- Allow anyone to view course materials (since it's a public bucket)
CREATE POLICY "Anyone can view course materials"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-files');

-- Verify the bucket was created
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'course-files';