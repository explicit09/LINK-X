# Manual File Processing Test

Since you've uploaded files and applied the migration, let's manually trigger processing.

## Step 1: Get a File ID

Go to your Supabase dashboard:
1. Navigate to Table Editor → `files` table
2. Copy the ID of one of your uploaded files (e.g., the "LEARN-X Platform Audit Report.pdf")

## Step 2: Test Processing via API

1. Open your browser's developer console (F12)
2. Run this code (replace FILE_ID with actual ID):

```javascript
// Get auth token
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;

// Replace with your actual file ID
const FILE_ID = 'paste-file-id-here'; 

// Send processing request
const response = await fetch(`http://localhost:8000/api/v2/files/${FILE_ID}/process`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    priority: 'high',
    processing_type: 'full'
  })
});

const result = await response.json();
console.log('Processing result:', result);
```

## Step 3: Check Results

After running the above, check:

1. **Processing Queue** (in Supabase dashboard):
   ```sql
   SELECT * FROM processing_queue ORDER BY created_at DESC;
   ```

2. **File Chunks** (after processing):
   ```sql
   SELECT COUNT(*) FROM file_chunks WHERE file_id = 'your-file-id';
   ```

3. **File Status**:
   ```sql
   SELECT processed, processing_status FROM files WHERE id = 'your-file-id';
   ```

## Expected Results:

- ✅ Processing queue should have a new entry
- ✅ Status should change from 'pending' → 'processing' → 'completed'
- ✅ File chunks should be created (10-50 chunks depending on file size)
- ✅ File should be marked as `processed = true`

## If Processing Fails:

1. Check backend logs: `docker-compose logs backend`
2. Check worker logs: `docker-compose logs celery-worker`
3. Look for errors in processing_queue.error_message

The processing should now work since:
- ✅ The `/process` endpoint exists
- ✅ The processing_queue table exists
- ✅ RLS policies are correct
- ✅ Files are uploaded successfully