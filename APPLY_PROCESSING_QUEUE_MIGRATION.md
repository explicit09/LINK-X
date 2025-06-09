# Apply Processing Queue Migration

To enable file processing, you need to create the processing_queue table in Supabase.

## Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to SQL Editor

2. **Run the Migration**
   - Copy and paste the contents of `docker-image/migrations/processing_queue_supabase.sql`
   - Click "Run"

3. **Verify Table Creation**
   - Go to Table Editor
   - You should see a new `processing_queue` table
   - Check that RLS policies are enabled

4. **Restart Backend** (if running)
   ```bash
   cd docker-image
   docker-compose restart backend
   ```

## What This Enables:

- Files uploaded will be queued for processing
- Text extraction from PDFs
- Semantic chunking for better AI understanding
- Embedding generation for search and Q&A
- Processing status tracking in the UI

## Testing:

1. Upload a new file
2. Check if it appears in the processing_queue table
3. Wait a moment and check if file_chunks are created
4. The file status should change from "Processing" to "Processed"