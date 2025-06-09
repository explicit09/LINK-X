# Fix File Processing Issue

The files are uploading successfully but not being processed (no embeddings/chunking) because of Row Level Security (RLS) policies blocking the `processing_queue` table.

## The Problem

1. Files upload successfully to Supabase Storage ✅
2. File records are created in the `files` table ✅ 
3. Frontend calls `/api/v2/files/{file_id}/process` endpoint ✅
4. Backend tries to insert into `processing_queue` table ❌
5. RLS policy blocks the insert with error: "new row violates row-level security policy for table processing_queue"

## The Solution

Apply the RLS fix to your Supabase database:

### Step 1: Open Supabase SQL Editor
Go to your Supabase dashboard and open the SQL Editor

### Step 2: Run the Processing Queue Fix
Copy and run the contents of: `docker-image/migrations/fix_processing_queue_rls.sql`

This will:
- Add a policy allowing authenticated users to INSERT into processing_queue
- Allow users to create processing jobs for files they have access to
- Fix the RLS policies that are blocking file processing

### Step 3: Verify Workers are Running
The PGMQ workers are already running and healthy:
- 3 PGMQ workers are processing embeddings
- They're waiting for jobs in the processing_queue

### Step 4: Test File Processing
After applying the fix:
1. Upload a new file (PDF or text)
2. Check if it gets processed:
   ```sql
   -- Check processing queue
   SELECT pq.*, f.name as file_name 
   FROM processing_queue pq
   JOIN files f ON f.id = pq.file_id
   ORDER BY pq.created_at DESC
   LIMIT 10;
   
   -- Check if chunks were created
   SELECT COUNT(*) as chunk_count, file_id 
   FROM file_chunks 
   GROUP BY file_id 
   ORDER BY MAX(created_at) DESC 
   LIMIT 5;
   ```

## Alternative: Disable RLS Temporarily
If you need a quick fix while testing:
```sql
-- Temporarily disable RLS on processing_queue
ALTER TABLE processing_queue DISABLE ROW LEVEL SECURITY;
```

But this is not recommended for production - apply the proper RLS policies instead.

## How the Processing Pipeline Works

1. **File Upload** → Supabase Storage
2. **Database Record** → Insert into `files` table
3. **Queue Processing** → Insert into `processing_queue` table
4. **PGMQ Workers** → Pick up jobs from queue
5. **Processing Steps**:
   - Extract text from PDF/documents
   - Split into chunks
   - Generate embeddings using OpenAI
   - Store in `file_chunks` table with vectors
6. **Ready for RAG** → Files can now be searched and used for AI responses

The fix ensures step 3 works properly by allowing the authenticated user to insert processing jobs.