# Supabase Storage Bucket Setup

## Quick Fix for "Bucket not found" Error

The file upload is failing because the `course-files` storage bucket doesn't exist in your Supabase project. Here's how to fix it:

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Fill in:
   - Bucket name: `course-files`
   - Public bucket: ✅ Enable (check the box)
   - File size limit: `50` (MB)
   - Allowed MIME types: Leave empty to allow all, or add:
     ```
     application/pdf
     image/jpeg
     image/png
     image/gif
     video/mp4
     ```
5. Click **Create bucket**

### Option 2: Via SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy and paste this SQL:

```sql
-- Create the course-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'course-files',
  'course-files',
  true,
  52428800  -- 50MB
);
```

5. Click **Run** or press `Cmd/Ctrl + Enter`

### Option 3: Run the Full Migration

If you want to set up everything including policies:

1. Go to **SQL Editor**
2. Open the file: `/docker-image/migrations/create_storage_bucket.sql`
3. Copy all contents and paste into SQL editor
4. Click **Run**

## Verify Setup

After creating the bucket, you can verify it exists:

1. Go to **Storage** section in Supabase Dashboard
2. You should see `course-files` in the bucket list
3. Try uploading a file again - it should work now!

## Troubleshooting

If you still get errors after creating the bucket:

1. **Check RLS is enabled**: 
   - Go to Storage → course-files → Policies
   - Make sure RLS is enabled
   - Ensure the policies from the SQL script are applied

2. **Check authentication**:
   - Make sure you're logged in when trying to upload
   - Check browser console for auth errors

3. **File size/type issues**:
   - Ensure your file is under 50MB
   - Check if the file type is allowed

## Note
The bucket only needs to be created once per Supabase project. After creation, all file uploads will work automatically.